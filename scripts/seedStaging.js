import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';

const ALLOWED_STAGING = 'album-barro-staging';
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'C:\\secrets\\staging-service-account.json';

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`ERROR: No se encontró la clave de servicio en: ${serviceAccountPath}`);
  console.error(`Configura: $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\secrets\\staging-service-account.json"`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
const activeProjectId = serviceAccount.project_id;

// Validación ESTRICTA: Solo staging permitido
if (activeProjectId !== ALLOWED_STAGING) {
  console.error(`ERROR CRÍTICO: Este script solo puede ejecutarse en Staging ('${ALLOWED_STAGING}').`);
  console.error(`El proyecto actual de la clave es: '${activeProjectId}'. Abortando de inmediato.`);
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function seedStaging() {
  console.log(`=======================================================`);
  console.log(` SEED DE STAGING: Creando eventos con adminPin legacy`);
  console.log(` PROYECTO: ${activeProjectId}`);
  console.log(`=======================================================\n`);

  const eventosSeed = [
    {
      code: 'ENSAYO-MARLI',
      data: {
        title: 'Boda de Ensayo Marli',
        date: '2026-12-15',
        theme: 'marli',
        adminPin: '4321', // PIN legacy de 4 dígitos en la raíz
        creadoEn: FieldValue.serverTimestamp()
      }
    },
    {
      code: 'ENSAYO-SHOTS',
      data: {
        title: 'Fiesta de Ensayo Shots',
        date: '2026-12-20',
        theme: 'shots',
        adminPin: '889900', // PIN legacy de 6 dígitos en la raíz
        creadoEn: FieldValue.serverTimestamp()
      }
    }
  ];

  try {
    for (const evt of eventosSeed) {
      console.log(`-> Creando evento legacy: ${evt.code}...`);
      await db.collection('eventos_activos').doc(evt.code).set(evt.data);
      console.log(`   [OK] Guardado con adminPin="${evt.data.adminPin}" en la raíz del documento.`);
    }

    console.log(`\nSEED COMPLETADO: 2 eventos creados en Staging listos para ensayar migratePins.js.`);
  } catch (err) {
    console.error('Error poblando Staging:', err);
    process.exit(1);
  }
}

seedStaging();
