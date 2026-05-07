// Le Français Moyen — Share module
// Stat card generator + floating share widget

const LFM_SITE = 'https://le-francais-moyen.com';

// ─── CARD GENERATOR ──────────────────────────────────────────────────────────

function lfmGenerateCard(opts) {
  // opts: { title, value, subtitle, source, color, url, tool }
  const W = 1200, H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const color = opts.color || '#f87171';
  const bg = '#0d0d0d';
  const bgCard = '#161616';

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Card body
  roundRect(ctx, 48, 48, W - 96, H - 96, 16, bgCard);

  // Left accent bar
  ctx.fillStyle = color;
  ctx.fillRect(48, 48, 6, H - 96);

  // Top label
  ctx.fillStyle = '#555';
  ctx.font = '600 22px -apple-system,Segoe UI,sans-serif';
  ctx.fillText('LE FRANÇAIS MOYEN  ·  DONNÉES OFFICIELLES', 86, 108);

  // Main value
  ctx.fillStyle = color;
  ctx.font = 'bold 140px -apple-system,Segoe UI,sans-serif';
  const valText = opts.value || '—';
  const valW = ctx.measureText(valText).width;
  ctx.fillText(valText, 86, 300);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 46px -apple-system,Segoe UI,sans-serif';
  wrapText(ctx, opts.title || '', 86, 370, W - 172, 58);

  // Subtitle
  ctx.fillStyle = '#888888';
  ctx.font = '400 32px -apple-system,Segoe UI,sans-serif';
  wrapText(ctx, opts.subtitle || '', 86, 450, W - 172, 44);

  // Source
  ctx.fillStyle = '#444444';
  ctx.font = '400 24px -apple-system,Segoe UI,sans-serif';
  ctx.fillText('Source : ' + (opts.source || 'INSEE / Banque de France / FMI'), 86, H - 80);

  // URL bottom right
  ctx.fillStyle = '#555';
  ctx.font = '500 26px -apple-system,Segoe UI,sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('le-francais-moyen.com', W - 72, H - 80);
  ctx.textAlign = 'left';

  // Logo dot
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(W - 110, H - 86, 8, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL('image/png');
}

function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' ';
    if (ctx.measureText(test).width > maxW && i > 0) {
      ctx.fillText(line, x, cy);
      line = words[i] + ' ';
      cy += lineH;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, cy);
}

function lfmDownloadCard(dataURL, filename) {
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename || 'lefrancaismoyen-stat.png';
  a.click();
}

// ─── SHARE HELPERS ────────────────────────────────────────────────────────────

function lfmShareX(text, url) {
  const encoded = encodeURIComponent(text + '\n\n' + (url || LFM_SITE));
  window.open('https://twitter.com/intent/tweet?text=' + encoded, '_blank', 'width=600,height=400');
}

function lfmShareLinkedIn(url, title, summary) {
  const u = encodeURIComponent(url || LFM_SITE);
  window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + u, '_blank', 'width=600,height=500');
}

// ─── PAGE SHARE CONFIG ────────────────────────────────────────────────────────

const LFM_PAGE_CONFIGS = {
  dette: {
    title: 'La dette publique française',
    value: '3 228 Md€',
    subtitle: 'Soit +178 milliards par an — 5 641 € de plus chaque seconde',
    source: 'Banque de France / INSEE 2024',
    color: '#fb923c',
    url: LFM_SITE + '/dette/',
    xText: '🚨 La dette publique française tourne à 5 641 € PAR SECONDE.\n\nEn ce moment même, pendant que vous lisez ce tweet, la France emprunte encore et encore.\n\n3 228 milliards d\'€ de dette totale. Le compteur tourne en direct ↓\n\n#DetteFrance #FiscalitéFR #EconomieFrance #Budget',
    liText: 'La dette publique française atteint 3 228 milliards d\'euros. Le chiffre est abstrait — c\'est pourquoi nous l\'avons mis en temps réel sur le Français Moyen. Chaque seconde qui passe, l\'État emprunte 5 641 euros supplémentaires. Pour 113% du PIB. Découvrez le compteur live et la comparaison européenne :',
  },
  projections: {
    title: 'Où va la France d\'ici 2035 ?',
    value: '135%',
    subtitle: 'Dette/PIB en 2035 dans le scénario d\'inertie (sans réforme)',
    source: 'Modèle LFM / projections COR-FMI',
    color: '#fbbf24',
    url: LFM_SITE + '/projections/',
    xText: '📈 Si rien ne change, la dette française atteindra 135% du PIB en 2035.\n\nScénario réforme : 108%. Scénario crise : 158%.\n\nNous avons modélisé les 3 trajectoires possibles pour la France ↓\n\n#France2035 #DetteFrance #Économie #Retraites',
    liText: 'Dans 10 ans, la France sera-t-elle dans un scénario d\'inertie (dette à 135% du PIB), de réforme (108%) ou de crise (158%) ? Nous avons modélisé les trois trajectoires avec l\'évolution des taux d\'intérêt, des retraites et de la pression fiscale. Les résultats sont préoccupants dans tous les cas :',
  },
  epargne: {
    title: 'Votre Livret A perd de la valeur',
    value: '−2.3%',
    subtitle: 'Rendement réel du Livret A quand l\'inflation dépasse 3%',
    source: 'Banque de France / INSEE / simulateur LFM',
    color: '#4ade80',
    url: LFM_SITE + '/epargne/',
    xText: '💸 Le Livret A à 3% vous fait perdre de l\'argent quand l\'inflation est à 5.2%.\n\nRendement réel : −2.3%. Pendant ce temps, l\'État taxe les autres placements à 30%.\n\nSimulez l\'érosion réelle de votre épargne ↓\n\n#EpargneFrance #LivretA #PouvoirAchat #FiscalitéFR',
    liText: 'Un fait contre-intuitif : le Livret A, placement préféré des Français, peut générer un rendement réel négatif quand l\'inflation dépasse son taux. Et pour les autres placements, la fiscalité française prélève entre 17 et 40% des plus-values. Simulez l\'érosion réelle de votre épargne sur 5, 10 ou 20 ans :',
  },
  generations: {
    title: 'Les jeunes sont plus pauvres que leurs parents',
    value: '−18 pts',
    subtitle: 'Indice de niveau de vie des nés en 1990 vs nés en 1960',
    source: 'INSEE / LFM calcul générationnel',
    color: '#a78bfa',
    url: LFM_SITE + '/generations/',
    xText: '👶 Né en 1990, vous êtes statistiquement 18% moins bien loti que vos parents à votre âge.\n\nSalaire en baisse relative, immobilier ×2.7, dette héritée, chômage structurel.\n\nMesurez le déclassement de votre génération ↓\n\n#DéclassementFR #GénérationSacrifice #Logement #Inégalités',
    liText: 'Le déclassement générationnel en France n\'est plus une impression — c\'est mesurable. Les nés en 1990 cumulent : salaire réel inférieur à leurs parents au même âge, immobilier 2.7x plus cher, 47 000€ de dette publique héritée par tête, et un chômage structurel plus élevé. Nous avons créé un outil pour mesurer l\'écart par année de naissance :',
  },
  comparateur: {
    title: 'La France, championne des prélèvements',
    value: '45.3%',
    subtitle: 'Prélèvements obligatoires / PIB — record d\'Europe occidentale',
    source: 'Eurostat 2024',
    color: '#60a5fa',
    url: LFM_SITE + '/comparateur/',
    xText: '🇫🇷 45.3% du PIB prélevé par l\'État. La France taxe plus que l\'Allemagne, la Suède, le Royaume-Uni.\n\nPourtant ses services publics sont en recul depuis 20 ans.\n\nComparez la France vs 5 pays européens sur 10 indicateurs ↓\n\n#FiscalitéFR #Europe #Impôts #CompétitivitéFrance',
    liText: 'Avec 45.3% du PIB en prélèvements obligatoires, la France se place en tête de l\'Europe occidentale. Pourtant, les résultats PISA baissent, les hôpitaux ferment des lits, et la confiance dans les institutions chute. Nous avons comparé la France à l\'Allemagne, l\'Espagne, la Suède, le Royaume-Uni et l\'Italie sur 10 indicateurs :',
  },
  elections: {
    title: 'Et si un autre candidat avait gagné ?',
    value: '2002–2022',
    subtitle: '5 élections présidentielles, 20 candidats simulés',
    source: 'LFM modèle économique comparé',
    color: '#f87171',
    url: LFM_SITE + '/elections/',
    xText: '🗳 Et si Jospin avait battu Chirac en 2002 ? Et si Fillon avait gagné en 2017 ?\n\nNous avons modélisé 5 élections présidentielles et comparé les trajectoires simulées à la réalité.\n\nRésultats surprenants ↓\n\n#Présidentielle #PolitiqueFrance #SimulateurÉlections #EconomieFrance',
    liText: 'Que se serait-il passé si Jospin, Fillon ou Mélenchon avait remporté la présidentielle ? Nous avons simulé les trajectoires économiques de 20 candidats sur 5 élections (2002–2022) et comparé aux chiffres réels. Un outil pédagogique pour comprendre l\'impact des choix politiques sur la dette, le chômage et la fiscalité :',
  },
  services: {
    title: 'La France : beaucoup d\'impôts, moins de services',
    value: '−31%',
    subtitle: 'Lits d\'hôpitaux supprimés depuis 2000 (8.3 → 5.7 / 1000 hab.)',
    source: 'DREES / INSEE 2024',
    color: '#f87171',
    url: LFM_SITE + '/services/',
    xText: '🏥 La France a supprimé 31% de ses lits d\'hôpitaux depuis 2000.\n\nEn parallèle, les dépenses de santé ont augmenté de +130%.\n\nPayez plus, obtenez moins ? Les chiffres des services publics français ↓\n\n#HôpitauxFR #ServicePublic #Santé #EconomieFrance',
    liText: 'Paradoxe français : nous dépensons +20% de plus que la moyenne OCDE en santé par habitant, mais nous avons fermé 27 000 lits d\'hôpitaux en 20 ans. Les scores PISA en maths ont chuté de 37 points depuis 2003 malgré des dépenses d\'éducation stables. L\'état réel des services publics français, chiffres à l\'appui :',
  },
  histoire: {
    title: '50 ans de décisions qui ont fragilisé la France',
    value: '1973–2026',
    subtitle: '25 ruptures politiques, fiscales et économiques documentées',
    source: 'Sources multiples / LFM synthèse',
    color: '#a78bfa',
    url: LFM_SITE + '/histoire/',
    xText: '📅 1973 : fin du financement direct de l\'État par la Banque de France.\n2008 : choc financier, dette +15 pts de PIB en 3 ans.\n2024 : déficit à 6.1%, triple de la limite Maastricht.\n\nLes 25 ruptures qui ont construit la France d\'aujourd\'hui ↓\n\n#HistoireFrance #DetteFrance #PolitiqueÉconomique',
    liText: 'Comment la France est-elle passée d\'une dette à 15% du PIB en 1973 à 113% en 2024 ? La réponse tient en 25 décisions politiques, économiques et institutionnelles que nous avons documentées dans une timeline interactive. De la loi de 1973 sur le financement de l\'État au déficit à 6.1% de 2024 :',
  },
};

// ─── FLOATING WIDGET ──────────────────────────────────────────────────────────

function lfmInitShareWidget(pageKey) {
  const cfg = LFM_PAGE_CONFIGS[pageKey];
  if (!cfg) return;

  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    #lfm-share-fab{position:fixed;bottom:28px;right:28px;z-index:999;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
    #lfm-share-toggle{width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.6);transition:transform .2s}
    #lfm-share-toggle:hover{transform:scale(1.1)}
    #lfm-share-panel{background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:16px;min-width:260px;display:none;flex-direction:column;gap:10px;box-shadow:0 8px 32px rgba(0,0,0,.8)}
    #lfm-share-panel.open{display:flex}
    .lfm-share-btn{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;border:1px solid #2a2a2a;background:#111;color:#e8e8e8;cursor:pointer;font-size:13px;font-weight:600;text-align:left;transition:all .15s;text-decoration:none}
    .lfm-share-btn:hover{background:#222;border-color:#444}
    .lfm-share-icon{font-size:16px;min-width:20px}
    .lfm-share-label{flex:1}
    .lfm-share-title{font-size:12px;color:#888;margin-bottom:4px;padding:0 2px}
    .lfm-share-card-preview{background:#0d0d0d;border:1px solid #222;border-radius:6px;padding:10px;font-size:11px;color:#666;margin-bottom:4px}
  `;
  document.head.appendChild(style);

  // Create FAB
  const fab = document.createElement('div');
  fab.id = 'lfm-share-fab';
  fab.innerHTML = `
    <div id="lfm-share-panel">
      <div class="lfm-share-title">Partager ce chiffre</div>
      <button class="lfm-share-btn" id="lfm-btn-card" onclick="lfmDoDownload('${pageKey}')">
        <span class="lfm-share-icon">🖼</span>
        <span class="lfm-share-label">Télécharger la carte image</span>
      </button>
      <button class="lfm-share-btn" onclick="lfmDoShareX('${pageKey}')">
        <span class="lfm-share-icon">𝕏</span>
        <span class="lfm-share-label">Partager sur X / Twitter</span>
      </button>
      <button class="lfm-share-btn" onclick="lfmDoShareLI('${pageKey}')">
        <span class="lfm-share-icon">💼</span>
        <span class="lfm-share-label">Partager sur LinkedIn</span>
      </button>
      <button class="lfm-share-btn" onclick="lfmDoCopyLink('${pageKey}')">
        <span class="lfm-share-icon">🔗</span>
        <span class="lfm-share-label" id="lfm-copy-label">Copier le lien</span>
      </button>
    </div>
    <button id="lfm-share-toggle" style="background:${cfg.color};color:#000" onclick="document.getElementById('lfm-share-panel').classList.toggle('open')">
      ↗
    </button>
  `;
  document.body.appendChild(fab);
}

function lfmDoDownload(key) {
  const cfg = LFM_PAGE_CONFIGS[key];
  if (!cfg) return;
  const dataURL = lfmGenerateCard(cfg);
  lfmDownloadCard(dataURL, 'lfm-' + key + '-stat.png');
}

function lfmDoShareX(key) {
  const cfg = LFM_PAGE_CONFIGS[key];
  if (!cfg) return;
  lfmShareX(cfg.xText, cfg.url);
}

function lfmDoShareLI(key) {
  const cfg = LFM_PAGE_CONFIGS[key];
  if (!cfg) return;
  lfmShareLinkedIn(cfg.url);
}

function lfmDoCopyLink(key) {
  const cfg = LFM_PAGE_CONFIGS[key];
  if (!cfg) return;
  navigator.clipboard && navigator.clipboard.writeText(cfg.url).then(() => {
    const el = document.getElementById('lfm-copy-label');
    if (el) { el.textContent = '✓ Copié !'; setTimeout(() => el.textContent = 'Copier le lien', 2000); }
  });
}
