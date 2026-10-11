import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import readline from 'readline';

const CONFIG = {
  DRY_RUN: process.argv.includes('--dry-run') || !process.argv.includes('--live'),
  DELETE_PINS_FROM_PUBLIC: process.argv.includes('--delete-public-pins'),
  RESTORE_MODE: process.argv.includes('--restore'),
  BACKUP_FILE: './backup_eventos_activos.json'
};

const ALLOWED_STAGING = 'album-barro-staging';
const PROD_PROJECT = 'album-fotos-80c88';

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'C:\\secrets\\staging-service-account.json';

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`ERROR: No se encontró la clave de servicio en: ${serviceAccountPath}`);
  console.error(`Asegúrate de configurar $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\secrets\\staging-service-account.json"`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
const activeProjectId = serviceAccount.project_id;

// Validar lista de permitidos ANTES de inicializar SDK
if (activeProjectId === ALLOWED_STAGING) {
  console.log(`[INFO] Proyecto verificado: Staging (${activeProjectId})`);
} else if (activeProjectId === PROD_PROJECT) {
  const isProdFlag = process.argv.includes('--allow-production');
  if (!isProdFlag) {
    console.error(`ERROR: Abortando. El service account pertenece a PRODUCCIÓN ('${PROD_PROJECT}'). Requiere bandera --allow-production.`);
    process.exit(1);
  }
} else {
  console.error(`ERROR: Project ID no autorizado ('${activeProjectId}'). Solo se permite '${ALLOWED_STAGING}', o '${PROD_PROJECT}' con autorización explícita. Abortando.`);
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function runMigration() {
  console.log(`=======================================================`);
  console.log(` MIGRACIÓN DE PINS A RUTA SECRETA (ADMIN SDK)`);
  console.log(` PROYECTO: ${activeProjectId}`);
  console.log(` MODO: ${CONFIG.DRY_RUN ? 'SIMULACIÓN (DRY-RUN - usa --live para escribir)' : 'EN VIVO (ESCRITURA REAL)'}`);
  console.log(`=======================================================\n`);

  if (activeProjectId === PROD_PROJECT) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(resolve => rl.question(`ATENCIÓN: Estás a punto de migrar PRODUCCIÓN. Escribe '${PROD_PROJECT}' para confirmar: `, resolve));
    rl.close();

    if (answer.trim() !== PROD_PROJECT) {
      console.error(`Confirmación incorrecta ('${answer.trim()}'). Abortando.`);
      process.exit(1);
    }
    console.log(`[PELIGRO] Confirmación de PRODUCCIÓN aceptada. Continuando...\n`);
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
        await secretRef.set({ pin: item.pin, migratedAt: FieldValue.serverTimestamp() });
        console.log(`   [OK] Guardado en ruta secreta.`);

        if (CONFIG.DELETE_PINS_FROM_PUBLIC) {
          const eventRef = db.doc(`eventos_activos/${item.code}`);
          await eventRef.update({ adminPin: FieldValue.delete() });
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
