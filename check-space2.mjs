import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyBmVZDxge4Qq4HdkM0xQdPcqh_SKesph2s',
  authDomain:        'album-fotos-80c88.firebaseapp.com',
  projectId:         'album-fotos-80c88',
  storageBucket:     'album-fotos-80c88.firebasestorage.app',
  messagingSenderId: '888877871276',
  appId:             '1:888877871276:web:48978e68be84a69d31ef09'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkSpace() {
  try {
    let totalEvents = 0;
    let totalPhotos = 0;
    let totalBytes = 0;

    const eventsSnap = await getDocs(collection(db, 'eventos_activos'));
    totalEvents = eventsSnap.size;
    console.log('Eventos activos: ' + totalEvents);

    for (const docSnap of eventsSnap.docs) {
      const code = docSnap.id;
      const entriesSnap = await getDocs(collection(db, 'events', code, 'guest_entries'));
      console.log('  - Evento ' + code + ': ' + entriesSnap.size + ' fotos');
      totalPhotos += entriesSnap.size;
      
      entriesSnap.forEach(entry => {
        const data = entry.data();
        const jsonStr = JSON.stringify(data);
        totalBytes += Buffer.byteLength(jsonStr, 'utf8');
      });
    }

    console.log('-------------------------');
    console.log('Total de fotos: ' + totalPhotos);
    console.log('Peso aproximado de datos: ' + (totalBytes / 1024 / 1024).toFixed(2) + ' MB');
    console.log('Límite gratuito de Firestore: 1024 MB (1 GB)');
    console.log('Porcentaje usado: ' + ((totalBytes / 1024 / 1024) / 1024 * 100).toFixed(4) + '%');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkSpace();
