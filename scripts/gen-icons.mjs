// 產生 PWA 佔位圖示（純色圓角背景 + 簡單水滴造型），之後可由使用者替換成正式 Logo。
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makePNG(size, draw) {
  const width = size, height = size;
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = draw(x, y, width, height);
      const off = rowStart + 1 + x * 4;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = a;
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// 泳池藍底 + 白色水滴（游泳/水感造型），maskable 版本留安全邊界。
function drawIcon({ maskable = false } = {}) {
  return (x, y, w, h) => {
    const cx = w / 2, cy = h / 2;
    const bg = [30, 136, 214, 255]; // #1E88D6
    const pad = maskable ? w * 0.16 : 0; // maskable safe zone
    // 圓角矩形背景（非 maskable 時也用滿版方形，交由平台自行裁切）
    if (!maskable) {
      const r = w * 0.22;
      const inRounded =
        (x >= r && x <= w - r) ||
        (y >= r && y <= h - r) ||
        Math.hypot(Math.min(x, w - x) - r, Math.min(y, h - y) - r) <= r;
      if (!inRounded && (x < r || x > w - r) && (y < r || y > h - r)) {
        const cornerX = x < r ? r : w - r;
        const cornerY = y < r ? r : h - r;
        if (Math.hypot(x - cornerX, y - cornerY) > r) return [255, 255, 255, 0];
      }
    }
    // 水滴造型：圓形主體 + 上方尖角
    const dropCx = cx;
    const dropCy = cy + h * 0.06;
    const radius = (w - pad * 2) * 0.28;
    const dx = x - dropCx, dy = y - dropCy;
    const dist = Math.hypot(dx, dy);
    let isDrop = dist <= radius;
    if (!isDrop && dy < 0) {
      const t = -dy / (radius * 1.6);
      if (t >= 0 && t <= 1) {
        const tipWidth = radius * (1 - t) * 0.9;
        if (Math.abs(dx) <= tipWidth) isDrop = true;
      }
    }
    if (isDrop) return [255, 255, 255, 255];
    return bg;
  };
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", makePNG(192, drawIcon({ maskable: false })));
writeFileSync("public/icons/icon-512.png", makePNG(512, drawIcon({ maskable: false })));
writeFileSync("public/icons/maskable-192.png", makePNG(192, drawIcon({ maskable: true })));
writeFileSync("public/icons/maskable-512.png", makePNG(512, drawIcon({ maskable: true })));
writeFileSync("public/icons/apple-touch-icon.png", makePNG(180, drawIcon({ maskable: false })));
console.log("圖示已產生於 public/icons/");
