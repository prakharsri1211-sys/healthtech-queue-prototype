const sharp = require('sharp');
const fs = require('fs');

async function resize() {
  const img192 = fs.readFileSync('./public/icon-192x192.png');
  await sharp(img192).resize(192, 192).toFile('./public/icon-192x192.png');
  console.log('Resized icon-192x192.png');

  const img512 = fs.readFileSync('./public/icon-512x512.png');
  await sharp(img512).resize(512, 512).toFile('./public/icon-512x512.png');
  console.log('Resized icon-512x512.png');
}

resize().catch(console.error);
