const https = require('https');
const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'public', 'models');

// Crear directorios
if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir);
}

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

const models = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✓ Descargado: ${path.basename(dest)}`);
          resolve();
        });
      } else {
        fs.unlink(dest, () => {});
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function downloadAllModels() {
  console.log('Descargando modelos de face-api.js...\n');

  for (const model of models) {
    const url = `${baseUrl}/${model}`;
    const dest = path.join(modelsDir, model);

    try {
      await downloadFile(url, dest);
    } catch (error) {
      console.error(`✗ Error descargando ${model}:`, error.message);
    }
  }

  console.log('\n✅ Todos los modelos han sido descargados en public/models/');
  console.log('Ahora puedes ejecutar: npm run dev');
}

downloadAllModels();
