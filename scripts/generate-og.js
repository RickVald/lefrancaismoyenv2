/**
 * Converts assets/img/og-image.svg → assets/img/og-image.png (1200×630)
 * Runs at Netlify build time via `npm run build`.
 * Uses @resvg/resvg-js (pure Rust, no system deps needed on Netlify).
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const SRC = path.join(__dirname, '..', 'assets', 'img', 'og-image.svg');
const DST = path.join(__dirname, '..', 'assets', 'img', 'og-image.png');

const svg = fs.readFileSync(SRC, 'utf8');

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  font: { loadSystemFonts: false },
});

const pngData = resvg.render();
const pngBuffer = pngData.asPng();
fs.writeFileSync(DST, pngBuffer);

console.log(`OG image written → ${DST} (${Math.round(pngBuffer.length / 1024)} KB)`);
