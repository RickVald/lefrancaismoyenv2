/**
 * update-debt-t1-2026.js
 * Mise à jour systematique de la base dette : T4 2025 → T1 2026
 *
 * Règles :
 *  - Valeurs "courantes" (stock, ratio, par habitant, source) → nouvelles valeurs
 *  - Données historiques dans les tableaux/graphiques → INTACTES
 *  - "temps réel" → "compteur pédagogique" sauf dans titres commerciaux avec caveat
 *  - Intérêts > Éducation nationale → version corrigée avec nuance APU vs État
 *
 * Usage : node scripts/update-debt-t1-2026.js [--dry-run]
 */

const fs   = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry-run');
const ROOT = path.join(__dirname, '..');

// ── Règles de remplacement globales (toutes pages) ────────────────────────
// Ordre important : les plus spécifiques en premier pour éviter les doubles remplacements
const GLOBAL_RULES = [
  // Constantes JS - stock de référence
  ['3_460_500_000_000',                  '3_536_100_000_000'],
  ['3460500000000',                      '3536100000000'],
  ['3460.5e9',                           '3536.1e9'],

  // Nombres formatés FR (montant)
  ['3 460,5 milliards d\'euros',         '3 536,1 milliards d\'euros'],
  ['3 460,5 Md€',                        '3 536,1 Md€'],
  ['3 460 Md€',                          '3 536 Md€'],
  ['3 461 milliards',                    '3 536 milliards'],
  ['3 461 Md€',                          '3 536 Md€'],
  // Nombres EN
  ['€3,460.5 billion',                   '€3,536.1 billion'],
  ['3,460.5 billion',                    '3,536.1 billion'],

  // Ratio PIB — ATTENTION : ne pas toucher les tableaux historiques → réglé par règles par-fichier
  // On remplace uniquement les occurrences qui incluent le contexte "courant"
  // Les patterns avec "T4 2025" adjacents → couverts par les règles T4→T1

  // Per capita
  ['50 600 €/hab.',                      '51 700 €/hab.'],
  ['50 600 € par habitant',             '51 700 € par habitant'],
  ['50 600 € de dette',                  '51 700 € de dette'],
  ['50 600 €',                           '51 700 €'],
  ['50600',                              '51700'],

  // Sources et dates
  ['INSEE T4 2025 (publiée le 27 mars 2026)',  'INSEE T1 2026 (publiée le 25 juin 2026)'],
  ['INSEE T4 2025 (publié le 27 mars 2026)',   'INSEE T1 2026 (publié le 25 juin 2026)'],
  ['INSEE T4 2025 (publiés le 27/03/2026)',    'INSEE T1 2026 (publiés le 25/06/2026)'],
  ['INSEE T4 2025 (publiées le 27/03/2026)',   'INSEE T1 2026 (publiées le 25/06/2026)'],
  ['INSEE T4 2025, publiés le 27/03/2026',     'INSEE T1 2026, publiés le 25/06/2026'],
  ['INSEE T4 2025, publiée le 27/03/2026',     'INSEE T1 2026, publiée le 25/06/2026'],
  ['comptes nationaux T4 2025 (publiés le 27/03/2026)', 'comptes nationaux T1 2026 (publiés le 25/06/2026)'],
  ['Comptes nationaux T4 2025 (publiés le 27/03/2026)', 'Comptes nationaux T1 2026 (publiés le 25/06/2026)'],
  ['Comptes nationaux T4 2025 (27 mars 2026)', 'Comptes nationaux T1 2026 (25 juin 2026)'],
  ['Comptes nationaux T4 2025, 27/03/2026',    'Comptes nationaux T1 2026, 25/06/2026'],
  ['dette Maastricht T4 2025 (publiée le 27 mars 2026)', 'dette Maastricht T1 2026 (publiée le 25 juin 2026)'],
  ['Comptes nationaux T4 2025 (publication 27/03/2026)', 'Comptes nationaux T1 2026 (publication 25/06/2026)'],
  ['données T4 2025, publiées le 27/03/2026',  'données T1 2026, publiées le 25/06/2026'],
  ['INSEE T4 2025, publiées le 27/03/2026',    'INSEE T1 2026, publiées le 25/06/2026'],

  // Publication générique (quand pas de contexte T4)
  ['publiée le 27 mars 2026',            'publiée le 25 juin 2026'],
  ['publiés le 27 mars 2026',            'publiés le 25 juin 2026'],
  ['publiés le 27/03/2026',              'publiés le 25/06/2026'],
  ['publiée le 27/03/2026',              'publiée le 25/06/2026'],
  ['le 27 mars 2026',                    'le 25 juin 2026'],
  ['27/03/2026',                         '25/06/2026'],

  // Mis à jour
  ['Mis à jour le 26 mai 2026',          'Mis à jour le 25 juin 2026'],
  ['Mis à jour le 26/05/2026',           'Mis à jour le 25/06/2026'],
  ['26 mai 2026',                        '25 juin 2026'],
  ['26/05/2026',                         '25/06/2026'],
  ['mai 2026',                           'juin 2026'],  // ATTENTION: limité aux pages concernées

  // Étiquettes source
  ['INSEE T4 2025',                      'INSEE T1 2026'],
  ['source INSEE T4 2025',               'source INSEE T1 2026'],
  ['données officielles INSEE T4 2025',  'données officielles INSEE T1 2026'],
  ['Données : INSEE T4 2025',            'Données : INSEE T1 2026'],
  ['données T4 2025',                    'données T1 2026'],
  ['dette T4 2025',                      'dette T1 2026'],
  ['T4 2025',                            'T1 2026'],

  // Période de référence
  ['T4 2025 (31 décembre 2025)',         'T1 2026 (31 mars 2026)'],
  ['fin 2025 (3 460,5 Md€)',             'au T1 2026 (3 536,1 Md€)'],
  ['fin 2025, soit 115,6 %',             'au T1 2026, soit 117,5 %'],
  ['fin 2025 (T4 2025)',                 'au T1 2026'],
  ['dette = 3 460,5 Md€ (115,6 % du PIB)', 'dette = 3 536,1 Md€ (117,5 % du PIB)'],
  ['dette = 3 460,5 Md€, soit 115,6 % du PIB', 'dette = 3 536,1 Md€, soit 117,5 % du PIB'],

  // Étiquettes KPI
  ['dette totale (T4 2025)',             'dette totale (T1 2026)'],
  ['dette officielle INSEE T4 2025',     'dette officielle INSEE T1 2026'],
  ['par habitant (T4 2025)',             'par habitant (T1 2026)'],
  ['Stock de référence (T4 2025)',       'Stock de référence (T1 2026)'],
  ['Outil gratuit · iframe · données officielles INSEE T4 2025', 'Outil gratuit · iframe · données officielles INSEE T1 2026'],
];

// ── Règles spécifiques à chaque fichier ───────────────────────────────────
// Remplacements qui nécessitent un contexte précis pour ne pas toucher les historiques
const FILE_RULES = {
  'dette/index.html': [
    // Constante JS du compteur
    ['const REF_DEBT      = 3_460_500_000_000;  // dette fin 2025 — source INSEE T4 2025 (27/03/2026)',
     'const REF_DEBT      = 3_536_100_000_000;  // dette T1 2026 — source INSEE T1 2026 (25/06/2026)'],
    ['const REF_DEBT      = 3_460_500_000_000;',
     'const REF_DEBT      = 3_536_100_000_000;'],
    // Base date du compteur
    ["new Date('2026-01-01T00:00:00Z')",        "new Date('2026-04-01T00:00:00Z')"],
    // Ratio courant dans JS (pas dans le tableau historique vals=[...115.6])
    ["style=\"color:var(--accent2)\">115,6 %",  "style=\"color:var(--accent2)\">117,5 %"],
    ["font-size:.76rem;font-weight:900;color:#a78bfa;display:block;line-height:1.2\">115,6 %",
     "font-size:.76rem;font-weight:900;color:#a78bfa;display:block;line-height:1.2\">117,5 %"],
    // DETTE_REF JS inline
    ['var DETTE_REF = 3460.5; // Md€ T4 2025',  'var DETTE_REF = 3536.1; // Md€ T1 2026'],
    // Wording "temps réel" dans notes méthodologiques
    ['la dette Maastricht n\'est pas mesurée en continu', 'la dette Maastricht est publiée trimestriellement'],
    // Compteur annualisé 2025 → texte explicatif à conserver mais ancre à corriger
    ['dette fin 2025 — source INSEE T4 2025', 'dette T1 2026 — source INSEE T1 2026'],
    // Texte "fin 2025" sur ce qui est maintenant T1 2026
    ['La dette publique française a atteint <strong style="color:var(--red)">3 460,5 milliards d\'euros fin 2025</strong>, soit <strong style="color:var(--red)">115,6 % du PIB</strong>',
     'La dette publique française atteint <strong style="color:var(--red)">3 536,1 milliards d\'euros au T1 2026</strong>, soit <strong style="color:var(--red)">117,5 % du PIB</strong>'],
    // var inline dette/widget embeddé
    ['var debt  = typeof currentDebt === \'function\' ? currentDebt() : (3460500000000',
     'var debt  = typeof currentDebt === \'function\' ? currentDebt() : (3536100000000'],
    // Correction intérêts > Éducation nationale
    ['les <strong style="color:var(--accent)">intérêts seuls coûtent 64,7 milliards d\'euros par an</strong> (APU),',
     'les <strong style="color:var(--accent)">intérêts coûtent 64,7 Md€/an (périmètre APU) ou 55,4 Md€/an (périmètre État)</strong>,'],
    // Ratio dans fact2
    ['<strong>50 600 € de dette publique</strong>',      '<strong>51 700 € de dette publique</strong>'],
  ],

  'index.html': [
    // Constante JS compteur home
    ['var DEBT_REF  = 3460500000000;  // dette fin 2025 — INSEE T4 2025 (27/03/2026)',
     'var DEBT_REF  = 3536100000000;  // dette T1 2026 — INSEE T1 2026 (25/06/2026)'],
    ['var DEBT_REF  = 3460500000000;',  'var DEBT_REF  = 3536100000000;'],
    // Base date
    ["new Date('2026-01-01T00:00:00Z')",  "new Date('2026-04-01T00:00:00Z')"],
    // Labels courants (pas dans historique)
    ["'+4 800 €/s · 115,6 % du PIB'",    "'+4 832 €/s · 117,5 % du PIB'"],
    ["Compteur continu · base 01/01/2026 · INSEE T4 2025",
     "Compteur pédagogique · base T1 2026 · INSEE T1 2026"],
    ["Compteur en direct. 115,6 % du PIB. +4 800 €/s.",
     "Compteur pédagogique. 117,5 % du PIB. +4 832 €/s."],
    ["'Compteur en direct. 115,6 % du PIB. +4 800 €/s.'",
     "'Compteur pédagogique. 117,5 % du PIB. +4 832 €/s.'"],
    // EN version
    ["'Live counter. 115.6% of GDP. +€4,832/s.'",
     "'Pedagogical counter. 117.5% of GDP. +€4,832/s.'"],
    // Ratio dans KPI inline (pas le tableau historique)
    ["style=\"color:#fb923c;margin-top:10px;font-weight:600\">Source : INSEE T4 2025 →",
     "style=\"color:#fb923c;margin-top:10px;font-weight:600\">Source : INSEE T1 2026 →"],
    // i18n stat1
    ["stat1_value:'115,6 % du PIB'",      "stat1_value:'117,5 % du PIB'"],
    ["stat1_value:'115.6% of GDP'",        "stat1_value:'117.5% of GDP'"],
    ["le 2e poste budgétaire de l'État.",  "le 2e poste par périmètre APU (55,4 Md€ pour le seul État)."],
  ],

  'widget-dette-publique-france/index.html': [
    // Wording "temps réel" → compteur pédagogique
    ['augmentation en temps réel',         'estimation continue annualisée'],
    ['Voir la dette publique française augmenter en temps réel →',
     'Compteur pédagogique de la dette publique française →'],
    ['un compteur de la dette française en temps réel, gratuit',
     'un compteur pédagogique de la dette française, gratuit'],
    ['Compteur en temps réel de la dette publique française',
     'Compteur pédagogique de la dette publique française'],
    ['Le flux en temps réel est calculé',   'L\'estimation continue est calculée'],
    ['compteur en temps réel est calculé',  'compteur pédagogique est calculé'],
    // Stock de référence T1 2026
    ['Le point de départ du compteur est la <strong style="color:var(--text)">dette publique au T4 2025 : 3 460,5 milliards d\'euros</strong>, publiée par l\'INSEE le 27 mars 2026',
     'Le point de départ du compteur est la <strong style="color:var(--text)">dette publique au T1 2026 : 3 536,1 milliards d\'euros</strong>, publiée par l\'INSEE le 25 juin 2026'],
    ['3 461 Md€',                            '3 536 Md€'],
    ['+4 832 €/seconde · 3 461 Md€ · 115,6 % du PIB',
     '+4 832 €/seconde · 3 536 Md€ · 117,5 % du PIB'],
    // KPI
    ['<div class="kpi-val">3 461 Md€</div>', '<div class="kpi-val">3 536 Md€</div>'],
    ['<div class="kpi-lbl">dette officielle INSEE T4 2025</div>',
     '<div class="kpi-lbl">dette officielle INSEE T1 2026</div>'],
    ['<div class="kpi-val">115,6 %</div>',   '<div class="kpi-val">117,5 %</div>'],
    // Related content
    ['<div class="rc-title">Quelle est la dette de la France ? — 3 461 Md€</div>',
     '<div class="rc-title">Quelle est la dette de la France ? — 3 536 Md€</div>'],
    ['<div class="rc-title">50 ans de dette : de 0 % à 115,6 % du PIB</div>',
     '<div class="rc-title">50 ans de dette : de 0 % à 117,5 % du PIB</div>'],
  ],

  'questions/sources-dette-publique-france.html': [
    // Table des données
    ['<tr><td>Stock de référence (T4 2025)</td><td class="td-hl">3 460,5 Md€</td><td>INSEE, 27 mars 2026</td></tr>',
     '<tr><td>Stock de référence (T1 2026)</td><td class="td-hl">3 536,1 Md€</td><td>INSEE, 25 juin 2026</td></tr>'],
    ['<tr><td>Déficit 2025 (flux annuel)</td><td class="td-hl">152,5 Md€</td><td>INSEE Comptes nationaux T4 2025</td></tr>',
     '<tr><td>Déficit 2025 (flux annuel — rythme compteur)</td><td class="td-hl">152,5 Md€</td><td>INSEE Comptes nationaux T4 2025</td></tr>'],
    ['<tr><td>Dette par habitant</td><td>50 600 €/hab.</td><td>3 460,5 Md€ ÷ 68,4 M hab. (INSEE)</td></tr>',
     '<tr><td>Dette par habitant</td><td>51 700 €/hab.</td><td>3 536,1 Md€ ÷ 68,4 M hab. (INSEE)</td></tr>'],
    ['<tr><td>Ratio dette/PIB</td><td>115,6 %</td><td>3 460,5 Md€ ÷ 2 993 Md€ (PIB)</td></tr>',
     '<tr><td>Ratio dette/PIB</td><td>117,5 %</td><td>3 536,1 Md€ ÷ ~3 009 Md€ (PIB estimé)</td></tr>'],
    // Note maastricht
    ['<tr><td><strong>Dette Maastricht (EDP)</strong></td><td>Administrations publiques (État + ODAC + APUL + ASSO)</td><td class="td-hl">3 460,5 Md€ · 115,6 % PIB</td></tr>',
     '<tr><td><strong>Dette Maastricht (EDP)</strong></td><td>Administrations publiques (État + ODAC + APUL + ASSO)</td><td class="td-hl">3 536,1 Md€ · 117,5 % PIB</td></tr>'],
    // FAQ
    ['Le chiffre de référence au T4 2025 est : 3 460,5 Md€ / 2 993 Md€ (PIB) = 115,6 %',
     'Le chiffre de référence au T1 2026 est : 3 536,1 Md€ / ~3 009 Md€ (PIB) = 117,5 %'],
    ['Au T4 2025 : 3 460,5 Md€ ÷ 2 993 Md€ = <strong style="color:var(--text)">115,6 %</strong>. Les deux chiffres proviennent des Comptes nationaux INSEE publiés le 27 mars 2026.',
     'Au T1 2026 : 3 536,1 Md€ ÷ ~3 009 Md€ = <strong style="color:var(--text)">117,5 %</strong>. Les deux chiffres proviennent des Comptes nationaux INSEE publiés le 25 juin 2026.'],
    // "prochaine mise à jour T1 2026 prévue pour l'été 2026" → mise à jour réalisée
    ['La prochaine mise à jour (T1 2026) est prévue pour l\'été 2026.',
     'La mise à jour T1 2026 a été réalisée le 25 juin 2026. La prochaine publication (T2 2026) est attendue fin septembre 2026.'],
    // CTA
    ['+4 832 €/seconde · 3 461 Md€ · 115,6 % du PIB',
     '+4 832 €/seconde · 3 536 Md€ · 117,5 % du PIB'],
    ['Voir la dette publique française augmenter en temps réel →',
     'Compteur pédagogique de la dette publique française →'],
    // Sources footer
    ['INSEE — Comptes nationaux trimestriels T4 2025 (27 mars 2026) · Eurostat',
     'INSEE — Comptes nationaux trimestriels T1 2026 (25 juin 2026) · Eurostat'],
    // Données utilisées
    ['<strong>Données utilisées :</strong> Dette T4 2025 : 3 460,5 Md€ · PIB 2025 : 2 993 Md€',
     '<strong>Données utilisées :</strong> Dette T1 2026 : 3 536,1 Md€ · PIB estimé T1 2026 : ~3 009 Md€'],
    ['<strong>Publication de référence :</strong> 27 mars 2026 (T4 2025)',
     '<strong>Publication de référence :</strong> 25 juin 2026 (T1 2026)'],
    // Wording dernière mise à jour page
    ['"Dernière mise à jour : mai 2026"', '"Dernière mise à jour : juin 2026"'],
    ['Dernière mise à jour : mai 2026',  'Dernière mise à jour : juin 2026'],
  ],

  'questions/quelle-est-la-dette-de-la-france.html': [
    // Titre et meta
    ['Quelle est la dette de la France en 2026 ? — 3 460,5 Md€, 115,6 % du PIB',
     'Quelle est la dette de la France en 2026 ? — 3 536,1 Md€, 117,5 % du PIB'],
    ['La dette publique française atteint 3 460,5 milliards d\'euros fin 2025 (T4 2025), soit 115,6 % du PIB. Soit 50 600 € par habitant.',
     'La dette publique française atteint 3 536,1 milliards d\'euros au T1 2026, soit 117,5 % du PIB. Soit ~51 700 € par habitant.'],
    ['Dette publique France 2026 : 3 460,5 Md€ — 115,6 % du PIB, 50 600 € par habitant',
     'Dette publique France 2026 : 3 536,1 Md€ — 117,5 % du PIB, 51 700 € par habitant'],
    ['La dette de la France atteint 3 460,5 milliards d\'euros fin 2025. Qui la détient, combien coûtent les intérêts, comparaison européenne. Source : INSEE T4 2025.',
     'La dette de la France atteint 3 536,1 milliards d\'euros au T1 2026. Qui la détient, combien coûtent les intérêts, comparaison européenne. Source : INSEE T1 2026.'],
    // JSON-LD
    ['La dette publique de la France atteignait 3 460,5 milliards d\'euros fin 2025 (T4 2025), soit 115,6 % du PIB selon l\'INSEE (données publiées le 27 mars 2026). Ramenée à la population, cela représente environ 50 600 euros par habitant.',
     'La dette publique de la France atteint 3 536,1 milliards d\'euros au T1 2026, soit 117,5 % du PIB selon l\'INSEE (données publiées le 25 juin 2026). Ramenée à la population, cela représente environ 51 700 euros par habitant.'],
    // "temps réel" dans CTA
    ['Voir la dette augmenter en temps réel, les intérêts par seconde, l\'évolution graphique',
     'Compteur pédagogique de la dette · intérêts par seconde · évolution graphique'],
    // KPI
    ["kpi1_val:'3 461 Md€',kpi1_lbl:'dette totale (T4 2025)'",
     "kpi1_val:'3 536 Md€',kpi1_lbl:'dette totale (T1 2026)'"],
    ["kpi2_val:'115,6 %',kpi2_lbl:'du PIB'",   "kpi2_val:'117,5 %',kpi2_lbl:'du PIB'"],
    ["kpi3_val:'50 600 €',kpi3_lbl:'par habitant'", "kpi3_val:'51 700 €',kpi3_lbl:'par habitant'"],
    // note maastricht
    ["En 2025, à 115,6 %, elle est presque deux fois au-dessus de la limite (INSEE T4 2025).",
     "Au T1 2026, à 117,5 %, elle est presque deux fois au-dessus de la limite (INSEE T1 2026)."],
    ["Fin 2025, à 115,6 %, elle est presque deux fois au-dessus de la limite.",
     "Au T1 2026, à 117,5 %, elle est presque deux fois au-dessus de la limite."],
    // Intérêts > Éducation — correction
    ['En 2026, ils devraient atteindre <strong style="color:#fb923c">74 Md€</strong> (PLF 2026) — soit plus que l\'Éducation nationale. C\'est le poste qui augmente',
     'En 2026, ils devraient atteindre <strong style="color:#fb923c">74 Md€</strong> (PLF 2026, périmètre APU). C\'est le poste qui augmente'],
    // i18n cout_warn
    ["cout_warn:'En 2025, les <strong style=\"color:#fb923c\">64,7 Md€ d\\'intérêts</strong> dépassent le budget de la Défense nationale (~50 Md€). En 2026, ils devraient atteindre <strong style=\"color:#fb923c\">74 Md€</strong> (PLF 2026). C\\'est le poste qui augmente le plus rapidement dans le budget de l\\'État.'",
     "cout_warn:'En 2025, les <strong style=\"color:#fb923c\">intérêts APU s\\'élèvent à 64,7 Md€</strong> (55,4 Md€ dans le seul budget de l\\'État), dépassant la Défense (~49 Md€). En 2026, la projection APU atteint 74 Md€. C\\'est le poste qui augmente le plus rapidement.'"],
    // FAQ
    ['La dette passe de ~3 300 Md€ fin 2024 à 3 460,5 Md€ fin 2025.',
     'La dette passe de ~3 300 Md€ fin 2024 à 3 460,5 Md€ fin 2025, puis à 3 536,1 Md€ au T1 2026.'],
    // CTA footer
    ['+4 832 €/seconde · 3 461 Md€ · 115,6 % du PIB',
     '+4 832 €/seconde · 3 536 Md€ · 117,5 % du PIB'],
    ['Voir la dette publique française augmenter en temps réel →',
     'Compteur pédagogique de la dette publique française →'],
    // EN
    ["France's public debt reached <strong style=\"color:var(--text)\">€3,460.5 billion</strong> at end-2025 (Q4 2025 — INSEE), i.e. <strong style=\"color:var(--text)\">115.6% of GDP</strong>. That is <strong style=\"color:var(--text)\">€50,600 per inhabitant</strong>.",
     "France's public debt reached <strong style=\"color:var(--text)\">€3,536.1 billion</strong> at Q1 2026 (INSEE, 25 June 2026), i.e. <strong style=\"color:var(--text)\">117.5% of GDP</strong>. That is approximately <strong style=\"color:var(--text)\">€51,700 per inhabitant</strong>."],
    ["kpi2_val:'115.6%',kpi2_lbl:'of GDP'",     "kpi2_val:'117.5%',kpi2_lbl:'of GDP'"],
  ],

  'questions/dette-france-par-habitant.html': [
    // Title / meta
    ['Dette de la France par habitant 2026 — 50 600 € | Le Français Moyen',
     'Dette de la France par habitant 2026 — 51 700 € | Le Français Moyen'],
    ['La dette publique française représente 50 600 € par habitant fin 2025 (T4 2025 — INSEE).',
     'La dette publique française représente ~51 700 € par habitant au T1 2026 (INSEE T1 2026).'],
    ['Dette France par habitant 2026 : 50 600 € — soit +2 380 € de plus en un an',
     'Dette France par habitant 2026 : 51 700 € — soit +1 100 € de plus depuis T4 2025'],
    ["Chaque Français doit 50 600 € de dette publique (T4 2025).",
     "Chaque Français doit ~51 700 € de dette publique (T1 2026)."],
    // JSON-LD
    ['La dette publique française représente environ 50 600 euros par habitant fin 2025 (3 460,5 milliards d\'euros divisés par 68,4 millions d\'habitants). En 2000, ce chiffre était de 15 000 euros. La dette par habitant a donc plus que triplé en 25 ans. Source : INSEE, comptes nationaux T4 2025.',
     'La dette publique française représente environ 51 700 euros par habitant au T1 2026 (3 536,1 milliards d\'euros divisés par 68,4 millions d\'habitants). En 2000, ce chiffre était de 15 000 euros. La dette par habitant a donc plus que triplé en 25 ans. Source : INSEE, comptes nationaux T1 2026.'],
    // Tableau historique — ligne 2025 reste, pas de remplacement global ici
    // KPI courant
    ['<div class="kpi-val">50 600 €</div>',    '<div class="kpi-val">51 700 €</div>'],
    ['<div class="kpi-lbl">par habitant (T4 2025)</div>',
     '<div class="kpi-lbl">par habitant (T1 2026)</div>'],
    // Body
    ['La dette publique française représente <strong style="color:var(--text)">50 600 € par habitant</strong> fin 2025 (3 460,5 Md€ ÷ 68,4 millions d\'habitants — INSEE T4 2025).',
     'La dette publique française représente <strong style="color:var(--text)">~51 700 € par habitant</strong> au T1 2026 (3 536,1 Md€ ÷ 68,4 millions d\'habitants — INSEE T1 2026).'],
    ['<p class="q-note"><strong>En 2025 : +3 300 €/habitant en un an.</strong> Le saut de 47 300 € à 50 600 € entre 2024 et 2025 reflète un déficit de 152,5 Md€ sur l\'année.',
     '<p class="q-note"><strong>T4 2025 → T1 2026 : +1 100 €/habitant en un trimestre.</strong> Le saut de 50 600 € à 51 700 € reflète l\'augmentation de 75,6 Md€ de dette en un trimestre.'],
    // Graphique européen — la valeur France doit rester 50600 dans le contexte de l'array historique
    // Le remplacement global gère {c:'🇫🇷 France',v:50600,color:'#f87171'}
    // CTA
    ['+4 832 €/seconde · 3 461 Md€ · 115,6 % du PIB',
     '+4 832 €/seconde · 3 536 Md€ · 117,5 % du PIB'],
    ['Voir la dette publique française augmenter en temps réel →',
     'Compteur pédagogique de la dette publique française →'],
  ],

  'questions/pourquoi-la-dette-augmente.html': [
    // Wording stock-flux (point 8 de l'audit)
    ['En 2025, la dette publique française augmente de 152,5 milliards d\'euros — c\'est le déficit public officiel (5,1 % du PIB selon l\'INSEE, T4 2025). Ramené à l\'année, cela représente 4 832 € par seconde, 416 millions par jour, 12,7 milliards par mois. La dette passe de ~3 300 Md€ fin 2024 à 3 460,5 Md€ fin 2025.',
     'En 2025, le déficit public s\'élève à 152,5 Md€ (5,1 % du PIB, INSEE). La variation effective du stock de dette dépend aussi d\'ajustements stock-flux (trésorerie, actifs financiers, passifs exclus de la norme Maastricht) : la dette est passée de ~3 300 Md€ fin 2024 à 3 460,5 Md€ fin 2025, puis à 3 536,1 Md€ au T1 2026.'],
    // Données eyebrow
    ['Données INSEE T4 2025 · 152,5 Md€ en 2025',
     'Données INSEE T1 2026 · déficit 2025 : 152,5 Md€'],
    // CTA
    ['+4 832 €/seconde · 3 461 Md€ · 115,6 % du PIB',
     '+4 832 €/seconde · 3 536 Md€ · 117,5 % du PIB'],
    ['Voir la dette publique française augmenter en temps réel →',
     'Compteur pédagogique de la dette publique française →'],
    // Note boule de neige (ratio courant)
    ['→ (2,8 % - 3,5 %) × 115,6 % + déficit primaire ≈ -0,8 % + dp',
     '→ (2,8 % - 3,5 %) × 117,5 % + déficit primaire ≈ -0,8 % + dp'],
    // Éducation nationale — contexte comparaison
    ['supprimer l\'équivalent du budget de l\'Éducation nationale — politiquement et socialement impossible',
     'supprimer l\'équivalent du budget de l\'Éducation nationale (périmètre État ~85 Md€) — politiquement et socialement impossible'],
  ],

  'weekly/latest.html': [
    // Intérêts 2e poste budgétaire
    ['le 2e poste budgétaire de l\'État',   'le 2e poste APU (55,4 Md€ dans le seul budget État, hors SS et collectivités)'],
    ["le 2e poste budgétaire de l'État",    "le 2e poste APU (55,4 Md€ dans le seul budget État, hors SS et collectivités)"],
    // Ratio KPI
    ["'115,6 % du PIB'",                   "'117,5 % du PIB'"],
    ['115,6 % du PIB',                      '117,5 % du PIB'],
    // Source
    ['Source : INSEE — comptes nationaux T4 2025 (publiés le 27/03/2026)',
     'Source : INSEE — comptes nationaux T1 2026 (publiés le 25/06/2026)'],
    // Text body
    ["La dette publique française atteint 3 461 milliards d'euros fin 2025, soit <strong>50 600 € par habitant</strong>. Le coût annuel des intérêts s'élève à 64,7 milliards d'euros en 2025 — le 2e poste budgétaire de l'État.",
     "La dette publique française atteint 3 536 milliards d'euros au T1 2026, soit <strong>51 700 € par habitant</strong>. Le coût annuel des intérêts s'élève à 64,7 Md€ (APU) ou 55,4 Md€ (budget État seul) en 2025."],
    // i18n
    ["stat1_text:\"La dette publique française atteint 3 461 milliards d'euros fin 2025, soit <strong>50 600 € par habitant</strong>. Le coût annuel des intérêts s'élève à 64,7 milliards d'euros en 2025 — le 2e poste budgétaire de l'État.\"",
     "stat1_text:\"La dette publique française atteint 3 536 milliards d'euros au T1 2026, soit <strong>51 700 € par habitant</strong>. Le coût annuel des intérêts s'élève à 64,7 Md€ (APU) ou 55,4 Md€ (budget État seul) en 2025.\""],
    ["stat1_source:'Source : INSEE — comptes nationaux T4 2025 (publiés le 27/03/2026)'",
     "stat1_source:'Source : INSEE — comptes nationaux T1 2026 (publiés le 25/06/2026)'"],
    // Semaine datée → label
    ['semaine du 5 mai 2026',              'dernière publication disponible'],
  ],
};

// ── Moteur de remplacement ────────────────────────────────────────────────
function applyRules(content, rules) {
  let changed = 0;
  for (const [from, to] of rules) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed++;
    }
  }
  return { content, changed };
}

// ── Main ──────────────────────────────────────────────────────────────────
const FILES = Object.keys(FILE_RULES);
let totalFiles = 0, totalChanges = 0;

for (const rel of FILES) {
  const fpath = path.join(ROOT, rel);
  if (!fs.existsSync(fpath)) {
    console.warn(`⚠ Fichier introuvable : ${rel}`);
    continue;
  }

  let content = fs.readFileSync(fpath, 'utf8');
  const orig  = content;

  // 1. Règles globales
  const g = applyRules(content, GLOBAL_RULES);
  content = g.content;

  // 2. Règles spécifiques
  const s = applyRules(content, FILE_RULES[rel]);
  content = s.content;

  const total = g.changed + s.changed;
  if (total === 0) {
    console.log(`  (no change) ${rel}`);
    continue;
  }

  if (!DRY) {
    fs.writeFileSync(fpath, content, 'utf8');
  }

  console.log(`${DRY ? '[DRY]' : '✓'} ${rel} — ${total} remplacement(s) (global: ${g.changed}, spécifique: ${s.changed})`);
  totalFiles++;
  totalChanges += total;
}

console.log(`\n${DRY ? '[DRY RUN]' : 'DONE'} — ${totalFiles} fichiers modifiés, ${totalChanges} remplacements.`);
