/**
 * Génère favicon.png (32x32) et apple-touch-icon.png (180x180)
 * Sans librairie externe — PNG brut avec zlib natif Node.js
 */
const zlib = require('zlib');
const fs   = require('fs');

// ── CRC32 (requis par le format PNG) ─────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c;}
  return t;
})();
function crc32(buf) {
  let c=0xFFFFFFFF;
  for (const b of buf) c=CRC_TABLE[(c^b)&0xFF]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;
}

// ── PNG chunk builder ────────────────────────────────────────────────────
function pngChunk(type, data) {
  const typeB = Buffer.from(type,'ascii');
  const lenB  = Buffer.alloc(4); lenB.writeUInt32BE(data.length);
  const payload = Buffer.concat([typeB, data]);
  const crcB  = Buffer.alloc(4); crcB.writeUInt32BE(crc32(payload));
  return Buffer.concat([lenB, typeB, data, crcB]);
}

// ── PNG builder ──────────────────────────────────────────────────────────
function makePNG(pixels, W, H) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W,0); ihdr.writeUInt32BE(H,4);
  ihdr[8]=8; ihdr[9]=6; // 8-bit RGBA

  // Raw scanlines (filter byte 0 = None before each row)
  const raw = Buffer.alloc(H*(1+W*4));
  for(let y=0;y<H;y++){
    raw[y*(1+W*4)]=0; // filter None
    for(let x=0;x<W;x++){
      const src=(y*W+x)*4, dst=y*(1+W*4)+1+x*4;
      raw[dst]=pixels[src]; raw[dst+1]=pixels[src+1];
      raw[dst+2]=pixels[src+2]; raw[dst+3]=pixels[src+3];
    }
  }

  const idat = zlib.deflateSync(raw,{level:9});
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

// ── Pixel helpers ────────────────────────────────────────────────────────
function makeCanvas(W, H) {
  const buf = Buffer.alloc(W*H*4,0);
  return {
    buf, W, H,
    set(x,y,r,g,b,a=255){
      if(x<0||x>=W||y<0||y>=H) return;
      const i=(y*W+x)*4; buf[i]=r;buf[i+1]=g;buf[i+2]=b;buf[i+3]=a;
    },
    fill(x,y,w,h,r,g,b,a=255){
      for(let dy=0;dy<h;dy++) for(let dx=0;dx<w;dx++) this.set(x+dx,y+dy,r,g,b,a);
    }
  };
}

// ── Design FM (scaled) ───────────────────────────────────────────────────
// All coordinates defined for 32×32, then scaled by factor s
function drawFM(c, s=1) {
  const W=c.W, H=c.H;
  const [br,bg,bb]=[11,16,32]; // background #0b1020
  const [yr,yg,yb]=[246,195,67]; // yellow #f6c343

  // Background
  c.fill(0,0,W,H, br,bg,bb);

  const P=s; // 1 pixel = s pixels in output

  // --- Letter F (x0=5s, y0=10s, stem 2P wide, 12P tall) ---
  const fx=Math.round(5*s), fy=Math.round(10*s);
  c.fill(fx,     fy, 2*P, 12*P, yr,yg,yb); // vertical stem
  c.fill(fx,     fy, 6*P,  2*P, yr,yg,yb); // top bar
  c.fill(fx,     fy+5*P, 5*P, 2*P, yr,yg,yb); // middle bar

  // --- Letter M (x0=16s, y0=10s, 10P wide, 12P tall) ---
  const mx=Math.round(16*s), my=Math.round(10*s);
  c.fill(mx,     my, 2*P, 12*P, yr,yg,yb); // left stem
  c.fill(mx+8*P, my, 2*P, 12*P, yr,yg,yb); // right stem
  // diagonal left: columns 17-18, rows 10-14 (descending V shape)
  for(let i=0;i<3;i++){
    c.fill(mx+2*P+i*P, my+i*P, P, 2*P, yr,yg,yb);
  }
  // diagonal right: columns 22-23, rows 10-14 (ascending)
  for(let i=0;i<3;i++){
    c.fill(mx+6*P-i*P, my+i*P, P, 2*P, yr,yg,yb);
  }
  // center bottom of V
  c.fill(mx+4*P, my+3*P, 2*P, 2*P, yr,yg,yb);

  // --- Rounded corners (transparent) ---
  const r=Math.round(5*s);
  // top-left
  for(let y=0;y<r;y++) for(let x=0;x<r;x++){
    const dx=r-x-1, dy=r-y-1;
    if(dx*dx+dy*dy>r*r) c.set(x,y,0,0,0,0);
  }
  // top-right
  for(let y=0;y<r;y++) for(let x=W-r;x<W;x++){
    const dx=x-(W-r), dy=r-y-1;
    if(dx*dx+dy*dy>r*r) c.set(x,y,0,0,0,0);
  }
  // bottom-left
  for(let y=H-r;y<H;y++) for(let x=0;x<r;x++){
    const dx=r-x-1, dy=y-(H-r);
    if(dx*dx+dy*dy>r*r) c.set(x,y,0,0,0,0);
  }
  // bottom-right
  for(let y=H-r;y<H;y++) for(let x=W-r;x<W;x++){
    const dx=x-(W-r), dy=y-(H-r);
    if(dx*dx+dy*dy>r*r) c.set(x,y,0,0,0,0);
  }
}

// ── Generate 32×32 favicon.png ───────────────────────────────────────────
const c32 = makeCanvas(32,32);
drawFM(c32, 1);
fs.writeFileSync('assets/img/favicon.png', makePNG(c32.buf,32,32));
console.log('favicon.png (32x32) written');

// ── Generate 180×180 apple-touch-icon.png ───────────────────────────────
const SCALE = 180/32;
const c180 = makeCanvas(180,180);
drawFM(c180, SCALE);
fs.writeFileSync('assets/img/apple-touch-icon.png', makePNG(c180.buf,180,180));
console.log('apple-touch-icon.png (180x180) written');

// ── Generate 192×192 icon for manifest ───────────────────────────────────
const c192 = makeCanvas(192,192);
drawFM(c192, 192/32);
fs.writeFileSync('assets/img/icon-192.png', makePNG(c192.buf,192,192));
console.log('icon-192.png (192x192) written');

// ── Generate 48×48 favicon (Google minimum recommended) ──────────────────
const c48 = makeCanvas(48,48);
drawFM(c48, 48/32);
const png48 = makePNG(c48.buf,48,48);
fs.writeFileSync('assets/img/favicon-48.png', png48);
console.log('favicon-48.png (48x48) written');

// ── Generate favicon.ico (ICO wrapping the 48×48 PNG) ────────────────────
function makeICO(pngBuf, size) {
  const header = Buffer.from([0,0, 1,0, 1,0]); // reserved, type=1(ICO), count=1
  const dataOffset = 6 + 16;
  const dir = Buffer.alloc(16);
  dir[0] = size === 256 ? 0 : size; // 0 means 256 in ICO spec
  dir[1] = size === 256 ? 0 : size;
  dir[2] = 0; dir[3] = 0;          // color count, reserved
  dir.writeUInt16LE(1, 4);          // planes
  dir.writeUInt16LE(32, 6);         // bit count
  dir.writeUInt32LE(pngBuf.length, 8);
  dir.writeUInt32LE(dataOffset, 12);
  return Buffer.concat([header, dir, pngBuf]);
}
fs.writeFileSync('favicon.ico', makeICO(png48, 48));
console.log('favicon.ico (48x48 PNG-in-ICO) written at root');
