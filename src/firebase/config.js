import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyBmVZDxge4Qq4HdkM0xQdPcqh_SKesph2s',
  authDomain:        'album-fotos-80c88.firebaseapp.com',
  projectId:         'album-fotos-80c88',
  storageBucket:     'album-fotos-80c88.firebasestorage.app',
  messagingSenderId: '888877871276',
  appId:             '1:888877871276:web:48978e68be84a69d31ef09'
};

const app = initializeApp(firebaseConfig);

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export { db };
