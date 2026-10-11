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
        creadoEn: serverTimestamp(),
        fechaEvento: '2026-12-31',
        activo: true,
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
      await setDoc(doc(db, 'events', 'BODA2026', 'singles', 'single_1'), {
        name: 'Sofia',
        age: '25',
        profession: 'Doctora',
        side: 'bride',
        funFact: 'Me gusta el café',
        photoUrl: 'data:image/jpeg;base64,sample',
        uid: GUEST_UID,
        likes: 0,
        timestamp: serverTimestamp()
      });
    });
  });

  // --- 1. Lectura y acceso básico ---
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

  // --- 2. PAYLOAD LITERAL: Creación de Evento (app.js) ---
  it('PERMITIDO: Admin crea evento con payload literal exacto de app.js', async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(setDoc(doc(db, 'eventos_activos', 'NUEVO2026'), {
      creadoEn: serverTimestamp(),
      fechaEvento: '2026-11-20',
      activo: true,
      theme: 'marli'
    }));
  });

  // --- 3. PAYLOAD LITERAL: Creación de PIN en secrets (app.js) ---
  it('PERMITIDO: Admin crea secrets/pin con payload literal de app.js', async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(setDoc(doc(db, 'eventos_activos', 'NUEVO2026', 'secrets', 'pin'), {
      pin: 'PIN7890'
    }));
  });

  it('DENEGADO: Invitado intenta crear evento o secrets/pin', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertFails(setDoc(doc(db, 'eventos_activos', 'HACK2026'), {
      creadoEn: serverTimestamp(),
      fechaEvento: '2026-11-20',
      activo: true,
      theme: 'marli'
    }));
    await assertFails(setDoc(doc(db, 'eventos_activos', 'HACK2026', 'secrets', 'pin'), {
      pin: 'HACK123'
    }));
  });

  // --- 4. PAYLOAD LITERAL: Reclamo de anfitrión (app.js) ---
  it('PERMITIDO: Reclamo de anfitrión con payload literal exacto de app.js', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertSucceeds(setDoc(doc(db, 'events', 'BODA2026', 'hosts', GUEST_UID), {
      pin: 'SECRETO123',
      claimedAt: serverTimestamp()
    }));
  });

  it('DENEGADO: Reclamo de anfitrión con campo extra (hasOnly violation)', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertFails(setDoc(doc(db, 'events', 'BODA2026', 'hosts', GUEST_UID), {
      pin: 'SECRETO123',
      claimedAt: serverTimestamp(),
      extra: 'invalido'
    }));
  });

  it('DENEGADO: Reclamo de anfitrión con campo faltante', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertFails(setDoc(doc(db, 'events', 'BODA2026', 'hosts', GUEST_UID), {
      pin: 'SECRETO123'
    }));
  });

  it('DENEGADO: Host reclama con PIN incorrecto', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertFails(setDoc(doc(db, 'events', 'BODA2026', 'hosts', GUEST_UID), {
      pin: 'PINERRONEO',
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

  it('PERMITIDO: Reclamo de anfitrión con PIN legacy de 4 caracteres', async () => {
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

  // --- 5. PAYLOAD LITERAL: Subida de Foto (app.js) ---
  it('PERMITIDO: Crear foto con payload literal exacto de app.js', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertSucceeds(setDoc(doc(db, 'events', 'BODA2026', 'guest_entries', 'entry_valida'), {
      nombre: 'Lucia',
      dedicatoria: 'Vivan los novios!',
      imageUrl: 'data:image/jpeg;base64,abc123',
      uid: GUEST_UID,
      likes: 0,
      timestamp: serverTimestamp()
    }));
  });

  it('DENEGADO: Crear foto con campo extra (hasOnly violation)', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertFails(setDoc(doc(db, 'events', 'BODA2026', 'guest_entries', 'entry_extra'), {
      nombre: 'Lucia',
      dedicatoria: 'Vivan los novios!',
      imageUrl: 'data:image/jpeg;base64,abc123',
      uid: GUEST_UID,
      likes: 0,
      timestamp: serverTimestamp(),
      hackerField: 'test'
    }));
  });

  it('DENEGADO: Crear foto con campo faltante (ej. sin likes)', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertFails(setDoc(doc(db, 'events', 'BODA2026', 'guest_entries', 'entry_sin_likes'), {
      nombre: 'Lucia',
      dedicatoria: 'Vivan los novios!',
      imageUrl: 'data:image/jpeg;base64,abc123',
      uid: GUEST_UID,
      timestamp: serverTimestamp()
    }));
  });

  it('DENEGADO: Crear foto con imagen sobre el límite de tamaño', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    const bigImg = 'data:image/jpeg;base64,' + 'A'.repeat(460000);
    await assertFails(setDoc(doc(db, 'events', 'BODA2026', 'guest_entries', 'entry_big'), {
      nombre: 'Lucia',
      dedicatoria: 'Foto pesada',
      imageUrl: bigImg,
      uid: GUEST_UID,
      likes: 0,
      timestamp: serverTimestamp()
    }));
  });

  // --- 6. PAYLOAD LITERAL: Like de Foto (+1 / -1) (app.js) ---
  it('PERMITIDO: Like de foto +1 y -1 con payload literal de app.js', async () => {
    const db = testEnv.authenticatedContext(OTHER_GUEST_UID).firestore();
    // +1
    await assertSucceeds(updateDoc(doc(db, 'events', 'BODA2026', 'guest_entries', 'entry_1'), {
      likes: 1
    }));
    // -1
    await assertSucceeds(updateDoc(doc(db, 'events', 'BODA2026', 'guest_entries', 'entry_1'), {
      likes: 0
    }));
  });

  it('DENEGADO: Like de foto con campo extra o negativo', async () => {
    const db = testEnv.authenticatedContext(OTHER_GUEST_UID).firestore();
    await assertFails(updateDoc(doc(db, 'events', 'BODA2026', 'guest_entries', 'entry_1'), {
      likes: 1,
      extra: 'mal'
    }));
    await assertFails(updateDoc(doc(db, 'events', 'BODA2026', 'guest_entries', 'entry_1'), {
      likes: -1
    }));
  });

  // --- 7. PAYLOAD LITERAL: Solteros (SinglesScreen.jsx) ---
  it('PERMITIDO: Crear perfil de Soltero con payload literal exacto de SinglesScreen.jsx', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertSucceeds(setDoc(doc(db, 'events', 'BODA2026', 'singles', 'single_valido'), {
      name: 'Hugo',
      age: '28',
      profession: 'Ingeniero',
      side: 'bride',
      funFact: 'Toco la guitarra',
      photoUrl: 'data:image/jpeg;base64,123',
      uid: GUEST_UID,
      likes: 0,
      timestamp: serverTimestamp()
    }));
  });

  it('DENEGADO: Soltero con campo extra o campo faltante', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    // Extra
    await assertFails(setDoc(doc(db, 'events', 'BODA2026', 'singles', 's_extra'), {
      name: 'Hugo',
      age: '28',
      profession: 'Ingeniero',
      side: 'bride',
      funFact: 'Nada',
      photoUrl: 'data:image/jpeg;base64,123',
      uid: GUEST_UID,
      likes: 0,
      timestamp: serverTimestamp(),
      extra: 'invalido'
    }));
    // Faltante (sin side)
    await assertFails(setDoc(doc(db, 'events', 'BODA2026', 'singles', 's_missing'), {
      name: 'Hugo',
      age: '28',
      profession: 'Ingeniero',
      funFact: 'Nada',
      photoUrl: 'data:image/jpeg;base64,123',
      uid: GUEST_UID,
      likes: 0,
      timestamp: serverTimestamp()
    }));
  });

  it('DENEGADO: Soltero con side invalido', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertFails(setDoc(doc(db, 'events', 'BODA2026', 'singles', 's_side'), {
      name: 'Hugo',
      age: '28',
      profession: 'Ingeniero',
      side: 'desconocido',
      funFact: 'Nada',
      photoUrl: 'data:image/jpeg;base64,123',
      uid: GUEST_UID,
      likes: 0,
      timestamp: serverTimestamp()
    }));
  });

  // --- 8. PAYLOAD LITERAL: Like de Soltero (+1 / -1) (SinglesScreen.jsx) ---
  it('PERMITIDO: Like de Soltero +1 y -1 con payload literal de SinglesScreen.jsx', async () => {
    const db = testEnv.authenticatedContext(OTHER_GUEST_UID).firestore();
    await assertSucceeds(updateDoc(doc(db, 'events', 'BODA2026', 'singles', 'single_1'), {
      likes: 1
    }));
    await assertSucceeds(updateDoc(doc(db, 'events', 'BODA2026', 'singles', 'single_1'), {
      likes: 0
    }));
  });

  it('DENEGADO: Like de Soltero con campo extra', async () => {
    const db = testEnv.authenticatedContext(OTHER_GUEST_UID).firestore();
    await assertFails(updateDoc(doc(db, 'events', 'BODA2026', 'singles', 'single_1'), {
      likes: 1,
      otroCampo: 'test'
    }));
  });

  // --- 9. PAYLOAD LITERAL: Itinerario (ItineraryScreen.jsx) ---
  it('PERMITIDO: Crear actividad de itinerario con payload literal exacto de ItineraryScreen.jsx', async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(setDoc(doc(db, 'events', 'BODA2026', 'itinerary', 'itinerary_1'), {
      time: '4:00 PM',
      title: 'Ceremonia Civil',
      desc: 'El momento más esperado',
      type: 'ceremony',
      timestamp: serverTimestamp()
    }));
  });

  it('PERMITIDO: Itinerario con tipos reales (general, food, toast, party, photo)', async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    const types = ['general', 'food', 'toast', 'party', 'photo'];
    for (let i = 0; i < types.length; i++) {
      await assertSucceeds(setDoc(doc(db, 'events', 'BODA2026', 'itinerary', `it_${i}`), {
        time: '6:30 PM',
        title: `Actividad ${i}`,
        desc: 'Descripcion corta',
        type: types[i],
        timestamp: serverTimestamp()
      }));
    }
  });

  it('DENEGADO: Itinerario con campo extra o campo faltante (sin desc)', async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    // Extra
    await assertFails(setDoc(doc(db, 'events', 'BODA2026', 'itinerary', 'it_extra'), {
      time: '4:00 PM',
      title: 'Ceremonia',
      desc: 'Descripcion',
      type: 'ceremony',
      timestamp: serverTimestamp(),
      extra: 'invalido'
    }));
    // Faltante (sin desc)
    await assertFails(setDoc(doc(db, 'events', 'BODA2026', 'itinerary', 'it_sin_desc'), {
      time: '4:00 PM',
      title: 'Ceremonia',
      type: 'ceremony',
      timestamp: serverTimestamp()
    }));
  });

  it('DENEGADO: Itinerario creado por invitado sin rol de anfitrión', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertFails(setDoc(doc(db, 'events', 'BODA2026', 'itinerary', 'it_invitado'), {
      time: '4:00 PM',
      title: 'Ceremonia Civil',
      desc: 'El momento más esperado',
      type: 'ceremony',
      timestamp: serverTimestamp()
    }));
  });

  // --- 10. Borrado de Fotos y Permisos de Host/Admin ---
  it('DENEGADO: Invitado no borra foto ajena', async () => {
    const db = testEnv.authenticatedContext(OTHER_GUEST_UID).firestore();
    await assertFails(deleteDoc(doc(db, 'events', 'BODA2026', 'guest_entries', 'entry_1')));
  });

  it('PERMITIDO: Autor sí borra su propia foto', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertSucceeds(deleteDoc(doc(db, 'events', 'BODA2026', 'guest_entries', 'entry_1')));
  });

  it('PERMITIDO: Host y Admin borran cualquier foto', async () => {
    // Registramos host
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'events', 'BODA2026', 'hosts', 'host_user'), {
        pin: 'SECRETO123',
        claimedAt: serverTimestamp()
      });
    });

    const dbHost = testEnv.authenticatedContext('host_user').firestore();
    await assertSucceeds(deleteDoc(doc(dbHost, 'events', 'BODA2026', 'guest_entries', 'entry_1')));

    const dbAdmin = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(deleteDoc(doc(dbAdmin, 'events', 'BODA2026', 'guest_entries', 'entry_1')));
  });

  it('PERMITIDO: Admin lista, crea y borra eventos', async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(getDocs(collection(db, 'eventos_activos')));
    await assertSucceeds(setDoc(doc(db, 'eventos_activos', 'NUEVO_ADMIN'), {
      creadoEn: serverTimestamp(),
      fechaEvento: '2026-10-10',
      activo: true,
      theme: 'odimar'
    }));
    await assertSucceeds(deleteDoc(doc(db, 'eventos_activos', 'NUEVO_ADMIN')));
  });

  // --- 11. Listado de hosts y Borrado en Cascada ---
  it('DENEGADO: Invitado no puede listar la subcolección hosts', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertFails(getDocs(collection(db, 'events', 'BODA2026', 'hosts')));
  });

  it('DENEGADO: Anfitrión no puede listar la subcolección hosts', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'events', 'BODA2026', 'hosts', 'host_user_2'), {
        pin: 'SECRETO123',
        claimedAt: serverTimestamp()
      });
    });
    const dbHost = testEnv.authenticatedContext('host_user_2').firestore();
    await assertFails(getDocs(collection(dbHost, 'events', 'BODA2026', 'hosts')));
  });

  it('PERMITIDO: Admin sí puede listar la subcolección hosts', async () => {
    const dbAdmin = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(getDocs(collection(dbAdmin, 'events', 'BODA2026', 'hosts')));
  });

  it('PERMITIDO: Cascada completa de borrado de un evento como admin', async () => {
    const eventCode = 'EVENTO_A_BORRAR';

    // 1. Poblamos datos en el evento y todas sus subcolecciones
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'eventos_activos', eventCode), {
        creadoEn: serverTimestamp(),
        fechaEvento: '2026-10-10',
        activo: true,
        theme: 'marli'
      });
      await setDoc(doc(db, 'eventos_activos', eventCode, 'secrets', 'pin'), { pin: 'PIN123456' });
      await setDoc(doc(db, 'events', eventCode, 'guest_entries', 'foto1'), {
        nombre: 'Ana', dedicatoria: 'Hola', imageUrl: 'data:img', uid: GUEST_UID, likes: 0, timestamp: serverTimestamp()
      });
      await setDoc(doc(db, 'events', eventCode, 'singles', 'soltero1'), {
        name: 'Carlos', age: '28', profession: 'Doc', side: 'bride', funFact: 'X', photoUrl: 'data:img', uid: GUEST_UID, likes: 0, timestamp: serverTimestamp()
      });
      await setDoc(doc(db, 'events', eventCode, 'itinerary', 'it1'), {
        time: '1:00 PM', title: 'Comida', desc: 'Banquete', type: 'food', timestamp: serverTimestamp()
      });
      await setDoc(doc(db, 'events', eventCode, 'hosts', GUEST_UID), {
        pin: 'PIN123456', claimedAt: serverTimestamp()
      });
    });

    // 2. Ejecutamos la cascada idéntica a como lo hace app.js autenticado como admin
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    const subcols = ['guest_entries', 'singles', 'itinerary', 'hosts'];
    for (const col of subcols) {
      const snap = await getDocs(collection(db, 'events', eventCode, col));
      for (const d of snap.docs) {
        await assertSucceeds(deleteDoc(d.ref));
      }
    }

    // Borrado de secrets/pin
    await assertSucceeds(deleteDoc(doc(db, 'eventos_activos', eventCode, 'secrets', 'pin')));

    // Borrado del evento principal
    await assertSucceeds(deleteDoc(doc(db, 'eventos_activos', eventCode)));
  });

  it('DENEGADO: Usuario intenta escribir en hosts con el UID de otro', async () => {
    const db = testEnv.authenticatedContext(GUEST_UID).firestore();
    await assertFails(setDoc(doc(db, 'events', 'BODA2026', 'hosts', OTHER_GUEST_UID), {
      pin: 'SECRETO123',
      claimedAt: serverTimestamp()
    }));
  });
});
