const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const iconsDir = path.join(__dirname, 'src-tauri', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

// Create minimal valid PNG files
function createPng(size) {
  // Minimal PNG: header + IHDR + IDAT + IEND
  const width = size;
  const height = size;
  
  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);   // bit depth
  ihdrData.writeUInt8(6, 9);   // color type (RGBA)
  ihdrData.writeUInt8(0, 10);  // compression
  ihdrData.writeUInt8(0, 11);  // filter
  ihdrData.writeUInt8(0, 12);  // interlace
  
  const ihdrChunk = createChunk('IHDR', ihdrData);
  
  // Create raw pixel data (blue color #0284c7)
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      // Simple mic icon shape
      const cx = width / 2;
      const cy = height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const micWidth = width * 0.2;
      const micHeight = height * 0.35;
      const isMic = (Math.abs(dx) < micWidth && dy > -micHeight && dy < micHeight * 0.4) ||
                    (Math.abs(dx) < micWidth * 1.3 && dy >= micHeight * 0.4 && dy < micHeight * 0.7) ||
                    (Math.abs(dx) < micWidth * 0.3 && dy >= micHeight * 0.7);
      
      if (isMic) {
        rawData.push(255, 255, 255, 255); // White
      } else {
        rawData.push(2, 132, 199, 255); // Blue #0284c7
      }
    }
  }
  
  // Compress with zlib (use simple store for minimal implementation)
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idatChunk = createChunk('IDAT', compressed);
  
  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return crc ^ 0xFFFFFFFF;
}

// Create all required icon sizes
const sizes = [32, 128, 256];
sizes.forEach(size => {
  const png = createPng(size);
  if (size === 32) {
    fs.writeFileSync(path.join(iconsDir, '32x32.png'), png);
  } else if (size === 128) {
    fs.writeFileSync(path.join(iconsDir, '128x128.png'), png);
    fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), createPng(256));
  }
  fs.writeFileSync(path.join(iconsDir, 'icon.png'), createPng(512));
});

console.log('All icons created successfully!');
