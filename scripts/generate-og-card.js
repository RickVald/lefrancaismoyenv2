/**
 * Génère une image OG (1200×630) personnalisée par page : titre + chiffre choc + source.
 * Usage : node scripts/generate-og-card.js
 * Édite le tableau CARDS ci-dessous pour ajouter une page, puis relance le script.
 * Utilisé aussi par scripts/auto-article.js pour générer l'image de chaque article auto-publié.
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'img', 'og');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const ACCENTS = {
  gold: { c1: '#f6c343', c2: '#fff0aa' },
  teal: { c1: '#5dd6c5', c2: '#7eebd8' },
  red:  { c1: '#ff6b6b', c2: '#ffb3b3' },
  purple: { c1: '#a78bfa', c2: '#d6c8fd' },
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Wrap headline into max 2 lines of ~22 chars/line at this font size
function wrapHeadline(text, maxLen = 24) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxLen && cur) { lines.push(cur.trim()); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur.trim());
  return lines.slice(0, 2);
}

function buildSvg({ headline, chiffre, chiffreLabel, source, accent = 'gold' }) {
  const a = ACCENTS[accent] || ACCENTS.gold;
  const lines = wrapHeadline(headline);
  const lineY = [320, 392];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18295a"/>
      <stop offset="50%" stop-color="#0b1020"/>
      <stop offset="100%" stop-color="#070a14"/>
    </linearGradient>
    <linearGradient id="acc" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${a.c1}"/>
      <stop offset="100%" stop-color="${a.c2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="85%" cy="15%" r="55%">
      <stop offset="0%" stop-color="${a.c1}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${a.c1}" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="44"/></filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <ellipse cx="1020" cy="120" rx="340" ry="260" fill="url(#glow)" filter="url(#blur)"/>

  <line x1="0" y1="157" x2="1200" y2="157" stroke="white" stroke-opacity="0.04" stroke-width="1"/>
  <line x1="0" y1="473" x2="1200" y2="473" stroke="white" stroke-opacity="0.04" stroke-width="1"/>

  <!-- Logo -->
  <rect x="60" y="56" width="64" height="64" rx="15" fill="url(#acc)" opacity="0.95"/>
  <text x="92" y="100" font-family="system-ui,-apple-system,sans-serif" font-weight="900" font-size="30" fill="#101520" text-anchor="middle">FM</text>
  <text x="140" y="84" font-family="system-ui,-apple-system,sans-serif" font-weight="900" font-size="26" fill="white" letter-spacing="-0.5">Le Français Moyen</text>
  <text x="140" y="109" font-family="system-ui,-apple-system,sans-serif" font-weight="400" font-size="15" fill="#aebbd4">le-francais-moyen.com</text>

  <!-- Headline -->
  ${lines.map((l, i) => `<text x="60" y="${lineY[i]}" font-family="system-ui,-apple-system,sans-serif" font-weight="900" font-size="56" fill="white" letter-spacing="-2">${esc(l)}</text>`).join('\n  ')}

  <!-- Big chiffre chip -->
  <rect x="60" y="430" width="${Math.min(900, 140 + esc(chiffre).length * 36)}" height="110" rx="20" fill="rgba(255,255,255,0.06)" stroke="url(#acc)" stroke-width="2"/>
  <text x="92" y="500" font-family="system-ui,-apple-system,sans-serif" font-weight="900" font-size="58" fill="url(#acc)">${esc(chiffre)}</text>

  <!-- Chiffre label -->
  <text x="60" y="572" font-family="system-ui,-apple-system,sans-serif" font-weight="600" font-size="22" fill="#dbe2f0">${esc(chiffreLabel)}</text>

  <!-- Source badge -->
  <rect x="${1140 - 18 - esc(source).length * 9}" y="585" width="${18 + esc(source).length * 9}" height="32" rx="16" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
  <text x="1131" y="606" font-family="system-ui,-apple-system,sans-serif" font-weight="700" font-size="14" fill="#aebbd4" text-anchor="end">${esc(source)}</text>

  <rect x="0" y="618" width="1200" height="12" fill="url(#acc)" opacity="0.6"/>
</svg>`;
}

function renderCard({ slug, headline, chiffre, chiffreLabel, source, accent }) {
  const svg = buildSvg({ headline, chiffre, chiffreLabel, source, accent });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { loadSystemFonts: true } });
  const png = resvg.render().asPng();
  const dst = path.join(OUT_DIR, `${slug}.png`);
  fs.writeFileSync(dst, png);
  console.log(`OG card written → assets/img/og/${slug}.png (${Math.round(png.length / 1024)} KB)`);
}

// ── Pages prioritaires (ROI immédiat) ───────────────────────────────────────
const CARDS = [
  { slug: 'dette',  headline: "Les intérêts de la dette explosent", chiffre: '64,7 Md€', chiffreLabel: "payés en 2025 — soit 1,8 Md€ par semaine", source: 'INSEE T4 2025', accent: 'red' },
  { slug: 'dette-par-habitant', headline: "La dette publique par habitant", chiffre: '50 600 €', chiffreLabel: 'pour chaque Français, fin 2025', source: 'INSEE T4 2025', accent: 'gold' },
  { slug: 'budget', headline: "Dépenses publiques : record OCDE", chiffre: '57,2 %', chiffreLabel: 'du PIB — 1er rang des pays de l\'OCDE', source: 'INSEE / OCDE', accent: 'teal' },
  { slug: 'demographie-angleterre', headline: "La démographie de l'Angleterre", chiffre: '58,6 M', chiffreLabel: "d'habitants — +19,7M depuis 1945", source: 'ONS Census 2021', accent: 'gold' },
  { slug: 'melenchon-2027', headline: "Le programme de Mélenchon en chiffres", chiffre: '831', chiffreLabel: "mesures dans L'Avenir en Commun, éd. 2025", source: 'melenchon2027.fr · IFRAP', accent: 'red' },
  { slug: 'retraites', headline: "Le système de retraites s'essouffle", chiffre: '1,7', chiffreLabel: 'cotisant par retraité — contre 4,3 en 1965', source: 'COR 2025', accent: 'purple' },
];

if (require.main === module) {
  for (const card of CARDS) renderCard(card);
  console.log(`\n${CARDS.length} cartes OG générées dans assets/img/og/`);
}

module.exports = { renderCard, buildSvg };
