/**
 * Cloudflare Pages Function — Génération d'images OG dynamiques
 * URL : /og?title=...&stat=...&sub=...&color=...&theme=...
 *
 * Paramètres :
 *   title  — Titre de l'article (max ~60 chars)
 *   stat   — Chiffre clé mis en avant (ex : "113 %")
 *   sub    — Sous-titre / contexte du chiffre
 *   color  — Couleur accent (hex, ex: %23fb923c). Défaut : #fb923c
 *   theme  — "dette" | "fisc" | "log" | "ret" | "sante" | "indus" | "educ" (preset couleurs)
 *
 * Exemple :
 *   /og?title=Pourquoi+la+France+est+endettée&stat=113+%25+du+PIB&sub=Banque+de+France+2024
 *
 * Renvoie un SVG 1200×630 compatible LinkedIn, Facebook, WhatsApp, Discord, Slack.
 * Pour Twitter/X (qui requiert PNG), utiliser un screenshot ou Cloudflare Image Transform.
 */

const THEMES = {
  dette:  '#fb923c',
  fisc:   '#a78bfa',
  log:    '#fbbf24',
  ret:    '#a78bfa',
  sante:  '#34d399',
  indus:  '#fbbf24',
  educ:   '#60a5fa',
  emploi: '#fb923c',
  energie:'#34d399',
  default:'#fb923c',
};

function escapeXml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}

/** Découpe un texte long en lignes ≤ maxChars caractères */
function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

export async function onRequest(context) {
  const url   = new URL(context.request.url);
  const p     = url.searchParams;

  const title  = p.get('title') || 'Le Français Moyen';
  const stat   = p.get('stat')  || '';
  const sub    = p.get('sub')   || 'Données officielles — INSEE, Eurostat, Banque de France';
  const theme  = p.get('theme') || 'default';
  const color  = p.get('color') ? '#' + p.get('color').replace(/^#/, '') : (THEMES[theme] || THEMES.default);

  // Couleur de fond légèrement teintée
  const bgTint = color + '18'; // ~9 % opacité

  // Découpe du titre en lignes
  const titleLines = wrapText(escapeXml(title), 38);
  const titleY0 = stat ? 210 : 270;
  const titleLineH = 64;

  const titleSvg = titleLines.slice(0, 3).map((line, i) =>
    `<text x="80" y="${titleY0 + i * titleLineH}" font-family="'Segoe UI',Arial,sans-serif" font-size="52" font-weight="800" fill="#f5f5f5" letter-spacing="-1">${line}</text>`
  ).join('\n    ');

  // Bloc stat
  const statSvg = stat ? `
    <rect x="80" y="${titleY0 + titleLines.slice(0,3).length * titleLineH + 20}" width="auto" height="72" rx="12" fill="${bgTint}"/>
    <text x="80" y="${titleY0 + titleLines.slice(0,3).length * titleLineH + 78}" font-family="'Segoe UI',Arial,sans-serif" font-size="68" font-weight="900" fill="${color}" letter-spacing="-2">${escapeXml(stat)}</text>
    <text x="80" y="${titleY0 + titleLines.slice(0,3).length * titleLineH + 118}" font-family="'Segoe UI',Arial,sans-serif" font-size="26" fill="#888" letter-spacing="0">${escapeXml(sub)}</text>` : '';

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bg" cx="30%" cy="0%" r="80%">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#0d0d0d" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="strip" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Fond -->
  <rect width="1200" height="630" fill="#0d0d0d"/>
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Bande couleur gauche -->
  <rect x="0" y="0" width="6" height="630" fill="${color}"/>

  <!-- Bande décorative haute -->
  <rect x="0" y="0" width="600" height="3" fill="url(#strip)"/>

  <!-- Logo FM -->
  <rect x="80" y="52" width="52" height="52" rx="10" fill="${color}"/>
  <text x="106" y="90" font-family="'Segoe UI',Arial,sans-serif" font-size="26" font-weight="900" fill="#0d0d0d" text-anchor="middle">FM</text>
  <text x="148" y="88" font-family="'Segoe UI',Arial,sans-serif" font-size="22" font-weight="700" fill="#f5f5f5">Le Français Moyen</text>
  <text x="148" y="112" font-family="'Segoe UI',Arial,sans-serif" font-size="16" fill="#666">le-francais-moyen.com · Données officielles</text>

  <!-- Titre -->
  ${titleSvg}

  <!-- Stat + sous-titre -->
  ${statSvg}

  <!-- Bordure basse -->
  <rect x="80" y="590" width="1040" height="1" fill="#333"/>
  <text x="80" y="616" font-family="'Segoe UI',Arial,sans-serif" font-size="18" fill="#555">Sources : INSEE · Eurostat · Banque de France · OCDE · DREES</text>
  <text x="1120" y="616" font-family="'Segoe UI',Arial,sans-serif" font-size="18" fill="${color}" text-anchor="end" font-weight="700">→</text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=604800, s-maxage=604800',
      'Vary': 'Accept-Encoding',
    },
  });
}
