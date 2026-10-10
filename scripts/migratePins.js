import admin from 'firebase-admin';
import fs from 'fs';
import readline from 'readline';

const CONFIG = {
  DRY_RUN: true,
  DELETE_PINS_FROM_PUBLIC: false,
  RESTORE_MODE: false,
  BACKUP_FILE: './backup_eventos_activos.json' 
};

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'C:\\secrets\\service-account-key.json';

let activeProjectId = 'unknown';

if (!fs.existsSync(serviceAccountPath) && !CONFIG.DRY_RUN) {
  console.warn(`[WARNING] No se encontró ${serviceAccountPath}. La migración fallará en producción.`);
} else if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  activeProjectId = serviceAccount.project_id;
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  admin.initializeApp();
}

const db = admin.firestore();

async function runMigration() {
  console.log(`=======================================================`);
  console.log(` MIGRACIÓN DE PINS A RUTA SECRETA (ADMIN SDK)`);
  console.log(` MODO: ${CONFIG.DRY_RUN ? 'SIMULACIÓN (DRY-RUN)' : 'EN VIVO'}`);
  console.log(`=======================================================\n`);

  if (activeProjectId === 'album-fotos-80c88') {
    const isProdFlag = process.argv.includes('--allow-production');
    if (!isProdFlag) {
      console.error("ERROR: Abortando. El service account pertenece a PRODUCCIÓN. Usa --allow-production explícitamente.");
      process.exit(1);
    }
    
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(resolve => rl.question("ATENCIÓN: Estás a punto de migrar PRODUCCIÓN. Escribe 'album-fotos-80c88' para confirmar: ", resolve));
    rl.close();
    
    if (answer.trim() !== 'album-fotos-80c88') {
      console.error("Confirmación incorrecta. Abortando.");
      process.exit(1);
    }
  } else if (activeProjectId !== 'album-barro-staging' && activeProjectId !== 'unknown') {
    console.warn("WARNING: El proyecto no es de producción ni de staging reconocido: " + activeProjectId);
  }

  if (CONFIG.RESTORE_MODE) {
    await restoreFromBackup();
    return;
  }

  try {
    const eventosSnap = await db.collection("eventos_activos").get();
    const backupData = [];
    const migrationPlan = [];

    eventosSnap.forEach((d) => {
      const data = d.data();
      backupData.push({ id: d.id, ...data });

      if (data.adminPin) {
        migrationPlan.push({ code: d.id, pin: data.adminPin });
      }
    });

    const backupFileName = `./backup_eventos_activos_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(backupFileName, JSON.stringify(backupData, null, 2), "utf8");
    console.log(`[RESPALDO] Guardados ${backupData.length} eventos en: ${backupFileName}\n`);

    if (migrationPlan.length === 0) {
      console.log("No se encontraron eventos con adminPin que requieran migración.");
      return;
    }

    console.log(`Eventos a migrar: ${migrationPlan.length}`);

    for (const item of migrationPlan) {
      console.log(`-> Procesando evento [${item.code}]...`);
      if (CONFIG.DRY_RUN) {
        console.log(`   [SIMULACIÓN] Crear: eventos_activos/${item.code}/secrets/pin con pin="${item.pin}"`);
        if (CONFIG.DELETE_PINS_FROM_PUBLIC) console.log(`   [SIMULACIÓN] Borrar adminPin de eventos_activos/${item.code}`);
      } else {
        const secretRef = db.doc(`eventos_activos/${item.code}/secrets/pin`);
        await secretRef.set({ pin: item.pin, migratedAt: admin.firestore.FieldValue.serverTimestamp() });
        console.log(`   [OK] Guardado en ruta secreta.`);

        if (CONFIG.DELETE_PINS_FROM_PUBLIC) {
          const eventRef = db.doc(`eventos_activos/${item.code}`);
          await eventRef.update({ adminPin: admin.firestore.FieldValue.delete() });
          console.log(`   [OK] Eliminado adminPin del documento público.`);
        }
      }
    }
    console.log(`\nPROCESO TERMINADO ${CONFIG.DRY_RUN ? '(SIN CAMBIOS EN BD)' : '(COMPLETADO)'}`);
  } catch (err) {
    console.error("Error en migración:", err);
  }
}

async function restoreFromBackup() {
  console.log(`[RESTAURACIÓN] Leyendo archivo ${CONFIG.BACKUP_FILE}...`);
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG.BACKUP_FILE, 'utf8'));
    for (const item of data) {
      if (item.adminPin) {
        if (CONFIG.DRY_RUN) {
          console.log(`   [SIMULACIÓN] Restauraría adminPin="${item.adminPin}" en eventos_activos/${item.id}`);
        } else {
          await db.doc(`eventos_activos/${item.id}`).update({ adminPin: item.adminPin });
          console.log(`   [OK] Restaurado adminPin en ${item.id}`);
        }
      }
    }
  } catch (err) {
    console.error("Error restaurando:", err);
  }
}

runMigration();
