// Generate proper PNG icons for Chrome extension
// Run with: node generate-icons.js

const fs = require('fs');
const zlib = require('zlib');

// Colors
const GOLD = { r: 201, g: 162, b: 39 };
const DARK = { r: 30, g: 30, b: 30 };
const WHITE = { r: 255, g: 255, b: 255 };

function createMinimalPNG(size, drawPixel) {
  // Raw image data (each row starts with filter byte 0)
  const rawData = [];
  for (let y = 0; y < size; y++) {
    rawData.push(0); // Filter byte
    for (let x = 0; x < size; x++) {
      const color = drawPixel(x, y, size);
      rawData.push(color.r, color.g, color.b, color.a !== undefined ? color.a : 255);
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

// Check if point is inside rounded rectangle
function isInsideRoundedRect(x, y, size, padding, cornerRadius) {
  const left = padding;
  const right = size - padding;
  const top = padding;
  const bottom = size - padding;

  if (x < left || x >= right || y < top || y >= bottom) return false;

  // Check corners
  const corners = [
    { cx: left + cornerRadius, cy: top + cornerRadius },
    { cx: right - cornerRadius, cy: top + cornerRadius },
    { cx: left + cornerRadius, cy: bottom - cornerRadius },
    { cx: right - cornerRadius, cy: bottom - cornerRadius }
  ];

  for (const corner of corners) {
    const dx = x - corner.cx;
    const dy = y - corner.cy;
    const inCornerRegion = (
      (x < left + cornerRadius || x >= right - cornerRadius) &&
      (y < top + cornerRadius || y >= bottom - cornerRadius)
    );
    if (inCornerRegion && Math.sqrt(dx * dx + dy * dy) > cornerRadius) {
      return false;
    }
  }

  return true;
}

// Draw icon with chapter markers design
function drawChapterIcon(x, y, size) {
  const padding = Math.max(1, Math.floor(size * 0.05));
  const cornerRadius = Math.floor(size * 0.15);

  // Check if inside rounded rectangle background
  if (!isInsideRoundedRect(x, y, size, padding, cornerRadius)) {
    return { r: 0, g: 0, b: 0, a: 0 }; // Transparent
  }

  // Content area
  const contentPadding = Math.floor(size * 0.2);
  const contentLeft = contentPadding;
  const contentRight = size - contentPadding;
  const contentTop = contentPadding;
  const contentBottom = size - contentPadding;

  // Play button triangle
  const triangleLeft = contentLeft;
  const triangleRight = contentLeft + (contentRight - contentLeft) * 0.5;
  const triangleCenterY = size / 2;
  const triangleHeight = (contentBottom - contentTop) * 0.8;

  // Check if inside play triangle
  const triTop = triangleCenterY - triangleHeight / 2;
  const triBottom = triangleCenterY + triangleHeight / 2;

  if (x >= triangleLeft && x < triangleRight && y >= triTop && y < triBottom) {
    // Calculate if point is inside triangle
    const relY = (y - triTop) / triangleHeight;
    const triangleWidthAtY = (triangleRight - triangleLeft) * Math.min(relY * 2, (1 - relY) * 2);
    if (x < triangleLeft + triangleWidthAtY) {
      return WHITE;
    }
  }

  // Chapter lines on the right side
  const lineLeft = triangleRight + Math.floor(size * 0.08);
  const lineRight = contentRight;
  const lineHeight = Math.max(2, Math.floor(size * 0.08));
  const lineSpacing = Math.floor(size * 0.18);
  const firstLineY = contentTop + Math.floor(size * 0.1);

  for (let i = 0; i < 4; i++) {
    const lineY = firstLineY + i * lineSpacing;
    if (y >= lineY && y < lineY + lineHeight && x >= lineLeft && x < lineRight) {
      return WHITE;
    }
  }

  // Default: gold background
  return GOLD;
}

// Create icons
[16, 48, 128].forEach(size => {
  const png = createMinimalPNG(size, drawChapterIcon);
  fs.writeFileSync(`icon${size}.png`, png);
  console.log(`Created icon${size}.png`);
});

console.log('Done! Icons created with chapter marker design.');
