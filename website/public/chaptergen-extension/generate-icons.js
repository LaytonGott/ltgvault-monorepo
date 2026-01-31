// Generate proper PNG icons for Chrome extension
// Run with: node generate-icons.js

const fs = require('fs');
const zlib = require('zlib');

// Gold color: #C9A227 = RGB(201, 162, 39)
const GOLD = { r: 201, g: 162, b: 39 };

// Check if pngjs is available, if not use simple approach
let PNG;
try {
  PNG = require('pngjs').PNG;
} catch (e) {
  console.log('pngjs not installed, using built-in PNG generation...');
  PNG = null;
}

function createIcon(size) {
  const png = new PNG({ width: size, height: size });

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.45;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;

      // Calculate distance from center for rounded square effect
      const dx = Math.abs(x - centerX);
      const dy = Math.abs(y - centerY);
      const cornerRadius = size * 0.2;

      let inside = false;
      if (dx <= radius - cornerRadius && dy <= radius) {
        inside = true;
      } else if (dx <= radius && dy <= radius - cornerRadius) {
        inside = true;
      } else {
        const cornerDist = Math.sqrt(
          Math.pow(dx - (radius - cornerRadius), 2) +
          Math.pow(dy - (radius - cornerRadius), 2)
        );
        if (cornerDist <= cornerRadius) {
          inside = true;
        }
      }

      if (inside) {
        // Gold background
        png.data[idx] = GOLD.r;
        png.data[idx + 1] = GOLD.g;
        png.data[idx + 2] = GOLD.b;
        png.data[idx + 3] = 255;
      } else {
        // Transparent
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
      }
    }
  }

  return png;
}

function createBasicIcons() {
  // Fallback: create simple gold square PNGs using raw PNG format
  const sizes = [16, 48, 128];

  sizes.forEach(size => {
    // Create a minimal valid PNG
    const png = createMinimalPNG(size, GOLD.r, GOLD.g, GOLD.b);
    fs.writeFileSync(`icon${size}.png`, png);
  });

  console.log('Basic icons created: icon16.png, icon48.png, icon128.png');
}

function createMinimalPNG(size, r, g, b) {
  // Create a simple uncompressed PNG

  // Raw image data (each row starts with filter byte 0)
  const rawData = [];
  for (let y = 0; y < size; y++) {
    rawData.push(0); // Filter byte
    for (let x = 0; x < size; x++) {
      rawData.push(r, g, b, 255); // RGBA
    }
  }

  // Compress the raw data
  const compressed = zlib.deflateSync(Buffer.from(rawData));

  // Build PNG file
  const chunks = [];

  // PNG signature
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);  // width
  ihdr.writeUInt32BE(size, 4);  // height
  ihdr.writeUInt8(8, 8);        // bit depth
  ihdr.writeUInt8(6, 9);        // color type (RGBA)
  ihdr.writeUInt8(0, 10);       // compression
  ihdr.writeUInt8(0, 11);       // filter
  ihdr.writeUInt8(0, 12);       // interlace
  chunks.push(createChunk('IHDR', ihdr));

  // IDAT chunk
  chunks.push(createChunk('IDAT', compressed));

  // IEND chunk
  chunks.push(createChunk('IEND', Buffer.alloc(0)));

  return Buffer.concat(chunks);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type);
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(data) {
  let crc = 0xffffffff;
  const table = getCRC32Table();

  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

let crcTable = null;
function getCRC32Table() {
  if (crcTable) return crcTable;

  crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c;
  }
  return crcTable;
}

// Main execution
if (PNG) {
  // Create proper rounded icons with pngjs
  [16, 48, 128].forEach(size => {
    const icon = createIcon(size);
    const buffer = PNG.sync.write(icon);
    fs.writeFileSync(`icon${size}.png`, buffer);
  });
  console.log('Icons created with rounded corners: icon16.png, icon48.png, icon128.png');
} else {
  createBasicIcons();
}
