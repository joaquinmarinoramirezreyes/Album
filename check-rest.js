const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function check() {
  try {
    const url = 'https://firestore.googleapis.com/v1/projects/album-fotos-80c88/databases/(default)/documents/eventos_activos';
    const data = await get(url);
    if (!data.documents) {
      console.log('No hay eventos activos.');
      return;
    }
    
    let totalPhotos = 0;
    for (const doc of data.documents) {
      const code = doc.name.split('/').pop();
      console.log('Evento:', code);
      const url2 = \https://firestore.googleapis.com/v1/projects/album-fotos-80c88/databases/(default)/documents/events/\/guest_entries\;
      const data2 = await get(url2);
      if (data2.documents) {
        totalPhotos += data2.documents.length;
        console.log(\  - \ fotos.\);
      } else {
        console.log('  - 0 fotos.');
      }
    }
    console.log('Total fotos:', totalPhotos);
  } catch(e) {
    console.error(e);
  }
}
check();
