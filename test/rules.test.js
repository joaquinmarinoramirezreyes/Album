import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import fs from 'fs';
import path from 'path';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';

const PROJECT_ID = 'test-nuestro-album';
const ADMIN_UID = 'admin_uid_123';
const GUEST_UID = 'guest_uid_456';
const OTHER_GUEST_UID = 'guest_uid_789';

describe('Firestore Rules - Seguridad de Álbum de Barro', () => {
  let testEnv;

  before(async () => {
    let rules = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');
    

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: rules,
        host: '127.0.0.1',
        port: 8080
      }
    });
  });

  after(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  beforeEach(async () => {
    if (testEnv) await testEnv.clearFirestore();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'admins', ADMIN_UID), { role: 'admin' });
      await setDoc(doc(db, 'eventos_activos', 'BODA2026'), {
        name: 'Boda Ana y Juan',
        theme: 'marli'
      });
      await setDoc(doc(db, 'eventos_activos', 'BODA2026', 'secrets', 'pin'), {
        pin: 'SECRETO123'
      });
      await setDoc(doc(db, 'events', 'BODA2026', 'guest_entries', 'entry_1'), {
        nombre: 'Carlos',
        dedicatoria: 'Muchas felicidades!',
        imageUrl: 'data:image/jpeg;base64,sample',
        uid: GUEST_UID,
        likes: 0,
        timestamp: serverTimestamp()
      });
    });
  });

  // --- 1. eventos_activos y secrets ---
  it('DENEGADO: Usuario sin sesión intenta leer un evento', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'eventos_activos', 'BODA2026')));
  });

  it('PERMITIDO: Invitado puede leer un evento', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertSucceeds(getDoc(doc(db, 'eventos_activos', 'BODA2026')));
  });

  it('DENEGADO: Invitado no puede leer secretos (secrets/pin)', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertFails(getDoc(doc(db, 'eventos_activos', 'BODA2026', 'secrets', 'pin')));
  });

  it('DENEGADO: Admin con UID incorrecto no puede listar eventos', async () => {
    const db = testEnv.authenticatedContext('fake_admin').firestore();
    await assertFails(getDocs(collection(db, 'eventos_activos')));
  });

  // --- 2. Anfitrión y PIN ---
  it('PERMITIDO: Usuario reclama rol con PIN >= 4 caracteres', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'eventos_activos', 'BODA4DIGIT', 'secrets', 'pin'), { pin: '1234' });
    });
    
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertSucceeds(setDoc(doc(db, 'events', 'BODA4DIGIT', 'hosts', GUEST_UID), {
      pin: '1234',
      claimedAt: serverTimestamp()
    }));
  });

  it('DENEGADO: Host reclama con ruta de secrets inexistente', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertFails(setDoc(doc(db, 'events', 'EVENTO_FANTASMA', 'hosts', GUEST_UID), {
      pin: '1234',
      claimedAt: serverTimestamp()
    }));
  });

  // --- 3. Subida y Límites ---
  it('DENEGADO: Crear con campos extra (hasOnly violation)', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertFails(setDoc(doc(db, 'events', 'BODA2026', 'guest_entries', 'entry_bad'), {
      nombre: 'Lucia',
      dedicatoria: 'Vivan los novios',
      imageUrl: 'data:image/jpeg;base64,abc123',
      uid: GUEST_UID,
      timestamp: serverTimestamp(),
      likes: 0,
      campoMalo: 'hack'
    }));
  });

  it('PERMITIDO: Crear foto válida', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertSucceeds(setDoc(doc(db, 'events', 'BODA2026', 'guest_entries', 'entry_new'), {
      nombre: 'Lucia',
      dedicatoria: 'Vivan los novios',
      imageUrl: 'data:image/jpeg;base64,abc123',
      uid: GUEST_UID,
      likes: 0,
      timestamp: serverTimestamp()
    }));
  });

  // --- 4. Likes ---
  it('DENEGADO: Likes negativos en update', async () => {
    // Primero preparamos una entrada con 0 likes
    const db = testEnv.authenticatedContext(OTHER_GUEST_UID).firestore();
    await assertFails(updateDoc(doc(db, 'events', 'BODA2026', 'guest_entries', 'entry_1'), {
      likes: -1
    }));
  });


  // --- 5. Borrado de fotos ---
  it('DENEGADO: Invitado no borra foto ajena', async () => {
    const db = testEnv.authenticatedContext(OTHER_GUEST_UID).firestore();
    await assertFails(deleteDoc(doc(db, 'events', 'BODA2026', 'guest_entries', 'entry_1')));
  });

  it('PERMITIDO: Autor sí borra su propia foto', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertSucceeds(deleteDoc(doc(db, 'events', 'BODA2026', 'guest_entries', 'entry_1')));
  });

  it('PERMITIDO: Host borra cualquier foto', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'events', 'BODA2026', 'hosts', OTHER_GUEST_UID), { pin: '1234', claimedAt: serverTimestamp() });
    });
    const db = testEnv.authenticatedContext(OTHER_GUEST_UID).firestore();
    await assertSucceeds(deleteDoc(doc(db, 'events', 'BODA2026', 'guest_entries', 'entry_1')));
  });

  it('PERMITIDO: Admin borra cualquier foto', async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(deleteDoc(doc(db, 'events', 'BODA2026', 'guest_entries', 'entry_1')));
  });

  // --- 6. Admin general ---
  it('PERMITIDO: Admin lista, crea y borra eventos', async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(getDocs(collection(db, 'eventos_activos')));
    await assertSucceeds(setDoc(doc(db, 'eventos_activos', 'NUEVO_EVENTO'), { name: 'Test' }));
    await assertSucceeds(deleteDoc(doc(db, 'eventos_activos', 'BODA2026')));
  });

  // --- 7. UID spoofing ---
  it('DENEGADO: Usuario intenta escribir en hosts con el UID de otro', async () => {
    const db = testEnv.authenticatedContext(OTHER_GUEST_UID).firestore();
    await assertFails(setDoc(doc(db, 'events', 'BODA2026', 'hosts', GUEST_UID), { pin: 'SECRETO123', claimedAt: serverTimestamp() }));
  });

  it('DENEGADO: Nadie puede listar hosts', async () => {
    const dbAdmin = testEnv.authenticatedContext(ADMIN_UID).firestore();
    const dbGuest = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertFails(getDocs(collection(dbAdmin, 'events', 'BODA2026', 'hosts')));
    await assertFails(getDocs(collection(dbGuest, 'events', 'BODA2026', 'hosts')));
  });

  it('DENEGADO: Imagen supera el límite', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    const hugeImage = 'data:image/jpeg;base64,' + 'a'.repeat(450000);
    await assertFails(setDoc(doc(db, 'events', 'BODA2026', 'guest_entries', 'entry_huge'), {
      nombre: 'Lucia', dedicatoria: 'Vivan los novios', imageUrl: hugeImage, uid: GUEST_UID, likes: 0, timestamp: serverTimestamp()
    }));
  });

  it('DENEGADO: PIN incorrecto al reclamar host', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertFails(setDoc(doc(db, 'events', 'BODA2026', 'hosts', GUEST_UID), { pin: 'MALPIN', claimedAt: serverTimestamp() }));
  });

  it('DENEGADO: Itinerario por invitado', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertFails(setDoc(doc(db, 'events', 'BODA2026', 'itinerary', 'item1'), {
      time: '12:00', title: 'Comida', type: 'food', timestamp: serverTimestamp()
    }));
  });

  it('PERMITIDO: Itinerario por host o admin', async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(setDoc(doc(db, 'events', 'BODA2026', 'itinerary', 'item1'), {
      time: '12:00', title: 'Comida', type: 'food', timestamp: serverTimestamp()
    }));
  });

  it('PERMITIDO: Update solo likes ±1 permitido', async () => {
    const db = testEnv.authenticatedContext(OTHER_GUEST_UID).firestore();
    await assertSucceeds(updateDoc(doc(db, 'events', 'BODA2026', 'guest_entries', 'entry_1'), {
      likes: 1
    }));
  });

  it('DENEGADO: Update likes con otro campo (hasOnly violation)', async () => {
    const db = testEnv.authenticatedContext(OTHER_GUEST_UID).firestore();
    await assertFails(updateDoc(doc(db, 'events', 'BODA2026', 'guest_entries', 'entry_1'), {
      likes: 1,
      dedicatoria: 'hack'
    }));
  });

  it('PERMITIDO: Crear Soltero valido', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertSucceeds(setDoc(doc(db, 'events', 'BODA2026', 'singles', 's_1'), {
      name: 'Hugo',
      age: '28',
      profession: 'Ingeniero',
      side: 'bride',
      funFact: 'Nada',
      photoUrl: 'data:image/jpeg;base64,123',
      uid: GUEST_UID,
      likes: 0,
      timestamp: serverTimestamp()
    }));
  });

  it('DENEGADO: Crear Soltero con side invalido', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertFails(setDoc(doc(db, 'events', 'BODA2026', 'singles', 's_2'), {
      name: 'Hugo',
      age: '28',
      profession: 'Ingeniero',
      side: 'perro',
      funFact: 'Nada',
      photoUrl: 'data:image/jpeg;base64,123',
      uid: GUEST_UID,
      likes: 0,
      timestamp: serverTimestamp()
    }));
  });
});
