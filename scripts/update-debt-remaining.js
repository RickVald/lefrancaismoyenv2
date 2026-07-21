/**
 * Round 2 : met à jour les pages questions restantes — T4 2025 → T1 2026
 * Usage : node scripts/update-debt-remaining.js [--apply]
 */
const fs   = require('fs');
const path = require('path');

const ROOT    = path.join(__dirname, '..');
const DRY_RUN = !process.argv.includes('--apply');

// ── Fichiers cibles ─────────────────────────────────────────────────────────
const TARGET_FILES = [
  'questions/budget-2026-mesures-fiscales-economies.html',
  'questions/combien-coute-l-etat.html',
  'questions/combien-coutent-les-interets-de-la-dette.html',
  'questions/comment-est-calculee-la-dette-publique.html',
  'questions/comment-reduire-la-dette-francaise.html',
  'questions/dette-france-117-pib-2026.html',
  'questions/dette-france-allemagne.html',
  'questions/dette-france-italie-grece.html',
  'questions/dette-publique-depuis-1974.html',
  'questions/dette-publique-france-2026.html',
  'questions/effet-boule-de-neige-dette-france.html',
  'questions/la-france-peut-elle-faire-faillite.html',
  'questions/nombre-de-taxes-en-france.html',
  'questions/pourquoi-la-france-est-endettee.html',
  'questions/pourquoi-la-france-ne-rembourse-pas-sa-dette.html',
  'questions/quel-est-le-deficit-de-la-france.html',
  'questions/quelle-est-la-difference-entre-la-dette-et-le-deficit.html',
  'questions/qui-detient-la-dette-francaise.html',
  'questions/rapport-economistes-bercy-poison-lent-deficit-2030.html',
  'questions/rapport-economistes-bercy-trajectoire-deficit-2030.html',
  // Les 4 suivants étaient priorité 8 mais ont des résidus
  'questions/dette-france-par-habitant.html',
  'questions/pourquoi-la-dette-augmente.html',
];

// Ces pages font des comparaisons Eurostat annuelles où 115,6 % est correct
const SKIP_RATIO_UPDATE = new Set([
  'questions/dette-france-allemagne.html',
  'questions/dette-france-italie-grece.html',
]);

// ── Règles globales SÛRES (stock, per-habitant, dates publication) ───────────
const SAFE_RULES = [
  // Stock T4 2025 précis → T1 2026
  [/3 460,5 Md€/g,               '3 536,1 Md€'],
  [/3 460,5 milliards/g,          '3 536,1 milliards'],
  [/3 460,5/g,                    '3 536,1'],
  // Stock arrondi
  [/3 461 Md€/g,                  '3 536 Md€'],
  [/3 461 milliards/g,            '3 536 milliards'],
  // Per-habitant
  [/50 600 €/g,                   '51 700 €'],
  [/50 600/g,                     '51 700'],
  [/98 000 € par actif/g,         '100 000 € par actif'],
  [/141 600 € par contribuable/g, '144 800 € par contribuable'],
  // Date publication T4 2025 → T1 2026 (stock dette seulement)
  [/dette Maastricht T4 2025 \(27 mars 2026\)/g, 'dette Maastricht T1 2026 (25 juin 2026)'],
  [/dette Maastricht T4 2025/g,   'dette Maastricht T1 2026'],
  [/dette T4 2025 \(27 mars 2026\)/g, 'dette T1 2026 (25 juin 2026)'],
  // Nettoyage "fin 2025" résiduel après substitution du stock
  [/3 536,1 Md€ fin 2025/g,                      '3 536,1 Md€ au T1 2026'],
  [/3 536 Md€ fin 2025/g,                         '3 536 Md€ au T1 2026'],
  [/3 536,1 milliards d'euros fin 2025/g,          "3 536,1 milliards d'euros au T1 2026"],
  [/3 536 milliards d'euros fin 2025/g,            "3 536 milliards d'euros au T1 2026"],
  // CTA de bas de page (cross-links)
  [/\+4 832 €\/seconde · 3 461 Md€ · 115,6 % du PIB/g,
   '+4 832 €/seconde · 3 536 Md€ · 117,5 % du PIB'],
  [/\+4 832 €\/seconde · 3 536 Md€ · 115,6 % du PIB/g,
   '+4 832 €/seconde · 3 536 Md€ · 117,5 % du PIB'],
  // Titre de cross-link ("Quelle est la dette de la France ? — 3 461 Md€")
  [/Quelle est la dette de la France \? — 3 461 Md€/g,
   'Quelle est la dette de la France ? — 3 536 Md€'],
];

// ── Règle ratio PIB (appliquée sur les fichiers NON-comparaison) ─────────────
const RATIO_RULE = [/115,6 % du PIB/g, '117,5 % du PIB'];

// ── Règles spécifiques par fichier ──────────────────────────────────────────
const FILE_RULES = {
  'questions/pourquoi-la-france-est-endettee.html': [
    // meta, og, JSON-LD description
    [/3 461 milliards d'euros \(115,6 % du PIB\)/g, '3 536 milliards d\'euros (117,5 % du PIB)'],
    [/3 461 milliards d'euros \(115,6 % du PIB\)/g, '3 536 milliards d\'euros (117,5 % du PIB)'],
    [/atteint 3 461 Md€ fin 2025, soit 115,6 % du PIB/g,
     'atteint 3 536 Md€ au T1 2026, soit 117,5 % du PIB'],
    [/dette qui atteint 3 461 Md€ fin 2025, soit 115,6 % du PIB/g,
     'dette qui atteint 3 536 Md€ au T1 2026, soit 117,5 % du PIB'],
    [/115,6 % du PIB en 2025 selon la Banque de France, soit environ 50 600/g,
     '117,5 % du PIB au T1 2026 (INSEE), soit environ 51 700'],
    [/La France est dans la moyenne haute avec 115,6 %/g,
     'La France est dans la moyenne haute avec 117,5 %'],
    [/50 ans de déficits ininterrompus\./g,
     '50 ans de déficits ininterrompus.'],
  ],
  'questions/qui-detient-la-dette-francaise.html': [
    [/3 460,5 Md€ et \+4 832 €\/s/g, '3 536,1 Md€ et +4 832 €/s'],
    [/3 460,5 Md€ fin 2025\)/g, '3 536,1 Md€ au T1 2026)'],
    [/dette Maastricht T4 2025 \(27 mars 2026\)/g, 'dette Maastricht T1 2026 (25 juin 2026)'],
  ],
  'questions/quel-est-le-deficit-de-la-france.html': [
    // "3 461 Md€ (le cumul historique)" — cross-link mentions, update stock value
    [/dette = 3 461 Md€ \(le cumul historique\)/g, 'dette = 3 536 Md€ (le cumul historique)'],
    [/dette = 3 461 Md€ \(flux/g, 'dette = 3 536 Md€ (flux'],
    // NOTE: "INSEE T4 2025" for deficit data is CORRECT, don't change
    // "Résultat INSEE T4 2025" in table for 2025 deficit → keep (it IS T4 2025 data)
  ],
  'questions/dette-france-117-pib-2026.html': [
    // Mentions de 115,6 comme valeur précédente sont correctes (T4 2025)
    // On ne touche pas les contextes "passé de 115,6 % à 117,5 %"
  ],
  'questions/dette-publique-depuis-1974.html': [
    // 115,6 dans la série historique est la valeur 2025 Eurostat — laisser
    // Mais la valeur "actuelle" (T1 2026) doit être 117,5 si mentionnée hors tableau
    [/atteint 3 461 Md€/g, 'atteint 3 536 Md€'],
    [/à 115,6 % du PIB en 50 ans/g, 'à 117,5 % du PIB en 50 ans'],
  ],
  'questions/comment-est-calculee-la-dette-publique.html': [
    [/3 461 Md€ au T4 2025/g, '3 536,1 Md€ au T1 2026'],
    [/3 461/g, '3 536'],
  ],
  'questions/effet-boule-de-neige-dette-france.html': [
    [/3 461 Md€ de dette/g, '3 536 Md€ de dette'],
  ],
};

// ── Application ──────────────────────────────────────────────────────────────
let totalFiles = 0, totalReplacements = 0;

for (const relPath of TARGET_FILES) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) { console.warn(`⚠ MISSING: ${relPath}`); continue; }

  let src = fs.readFileSync(fullPath, 'utf8');
  let count = 0;

  // Règles sûres globales
  for (const [pattern, replacement] of SAFE_RULES) {
    const before = src;
    src = src.replace(pattern, replacement);
    count += (before.match(pattern) || []).length;
  }

  // Règle ratio PIB (sauf pages comparaison)
  if (!SKIP_RATIO_UPDATE.has(relPath)) {
    const before = src;
    src = src.replace(RATIO_RULE[0], RATIO_RULE[1]);
    count += (before.match(RATIO_RULE[0]) || []).length;
  }

  // Règles spécifiques
  const fileRules = FILE_RULES[relPath] || [];
  for (const [pattern, replacement] of fileRules) {
    const before = src;
    src = src.replace(pattern, replacement);
    count += (before.match(pattern) || []).length;
  }

  if (count > 0) {
    totalFiles++;
    totalReplacements += count;
    if (DRY_RUN) {
      console.log(`[DRY] ${relPath} : ${count} remplacement(s)`);
    } else {
      fs.writeFileSync(fullPath, src, 'utf8');
      console.log(`✓ ${relPath} : ${count} remplacement(s)`);
    }
  } else {
    console.log(`  (inchangé) ${relPath}`);
  }
}

console.log(`\n${DRY_RUN ? '[DRY-RUN] ' : ''}Total : ${totalReplacements} remplacements dans ${totalFiles} fichiers`);
if (DRY_RUN) console.log('Ajouter --apply pour appliquer.');
