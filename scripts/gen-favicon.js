/**
 * Génère favicon.png (32x32), favicon-48.png (48x48) et icon-192.png (192x192)
 * à partir d'un SVG avec paths (sans dépendance de police).
 * Usage : node scripts/gen-favicon.js
 */
const fs   = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const OUT = path.join(__dirname, '..', 'assets', 'img');

// FM en paths vectoriels purs — pas de <text>, rendu identique partout
function buildFaviconSvg(size) {
  const s = size / 32; // facteur d'échelle
  const sc = (v) => (v * s).toFixed(3);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f6c343"/>
      <stop offset="100%" stop-color="#fde68a"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="32" height="32" rx="6" ry="6" fill="#0b1020"/>

  <!-- F : barre verticale + barre haute + barre milieu -->
  <rect x="4.5" y="7"   width="2.8" height="18" fill="url(#g)"/>
  <rect x="4.5" y="7"   width="9"   height="2.8" fill="url(#g)"/>
  <rect x="4.5" y="14.6" width="6.5" height="2.5" fill="url(#g)"/>

  <!-- M : 2 barres verticales + V central en path -->
  <rect x="15"  y="7" width="2.8" height="18" fill="url(#g)"/>
  <rect x="24.2" y="7" width="2.8" height="18" fill="url(#g)"/>
  <!-- V central (diagonales) : fill-rule evenodd pour l'espace intérieur -->
  <path fill="url(#g)" d="M15,7 L21,15.5 L27,7 L24.2,7 L21,13 L17.8,7 Z"/>
</svg>`;
}

const SIZES = [
  { name: 'favicon.png',       px: 32  },
  { name: 'favicon-48.png',    px: 48  },
  { name: 'apple-touch-icon.png', px: 180 },
  { name: 'icon-192.png',      px: 192 },
];

for (const { name, px } of SIZES) {
  const svg = buildFaviconSvg(px);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: px },
    font: { loadSystemFonts: false },
  });
  const png = resvg.render().asPng();
  const dst = path.join(OUT, name);
  fs.writeFileSync(dst, png);
  console.log(`✓ ${name} (${px}×${px}) — ${Math.round(png.length / 1024)} KB → assets/img/${name}`);
}

// Met aussi à jour le favicon.svg avec la version path (sans <text>)
const svgDst = path.join(OUT, 'favicon.svg');
fs.writeFileSync(svgDst, buildFaviconSvg(32).replace(` width="${32}" height="${32}"`, ' width="32" height="32"'));
console.log('✓ favicon.svg mis à jour (paths, sans dépendance police)');
