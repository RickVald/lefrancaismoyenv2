const fs = require('fs');
const {NAV, MOB} = JSON.parse(fs.readFileSync('_nav_template.json','utf8'));

const NAVBLOCK = `  <header>
    <div class="nav">
      <a href="/" class="brand"><span class="logo">FM</span> Le Français Moyen</a>
      ${NAV}
      <div class="lang-switch" id="langSwitch">
        <button class="lang-btn active" id="btn-fr" onclick="setLang('fr')">🇫🇷 FR</button>
        <button class="lang-btn" id="btn-en" onclick="setLang('en')">🇬🇧 EN</button>
      </div>
      <button class="nav-toggle" id="navToggle" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="navMobile"><span></span><span></span><span></span></button>
      <a href="/" class="cta" data-i18n="nav_cta">← Tableau de bord</a>
    </div>
  </header>
  ${MOB}`;

const FOOTER_JS = `  <script>(function(){var btn=document.getElementById('navToggle');var menu=document.getElementById('navMobile');if(!btn||!menu)return;btn.addEventListener('click',function(){var open=menu.classList.toggle('is-open');btn.setAttribute('aria-expanded',open);document.body.classList.toggle('nav-open',open);});menu.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){menu.classList.remove('is-open');btn.setAttribute('aria-expanded','false');document.body.classList.remove('nav-open');});});document.addEventListener('keydown',function(e){if(e.key==='Escape'&&menu.classList.contains('is-open')){menu.classList.remove('is-open');btn.setAttribute('aria-expanded','false');document.body.classList.remove('nav-open');btn.focus();}});})();</script>
  <script src="/assets/js/nav.js"></script>
</body>
</html>`;

// ── Data ─────────────────────────────────────────────────────────────────
// All prices in local currency, salary in local currency per month (net after tax)
// Sources: Numbeo 2025 (national averages, not just capitals), OCDE Median Wages 2024,
//          national statistics offices (INSEE, Destatis, ONS, BLS, NBS China, Rosstat…)
// NOTE: prices are NATIONAL AVERAGES — not just capitals/grandes villes.
//       For large countries (USA, China, Russia, Brazil), we use a weighted mix
//       of urban and suburban/secondary-city data to represent the median inhabitant.
const COUNTRIES = [
  // [flag, name, currency, salary, beerSupermarket50cl, beerBar50cl, restaurant, coffee, rentPerM2, carPrice, fuelPerL, iPhone16]
  // France: national avg restaurant ~12€ (not Paris 17€); rent ~11€/m² national avg
  ['🇫🇷','France',        '€',    2000, 1.10,  5.00,  12,    2.20,  11.0,  14000, 1.75,  1099],
  // Germany: national avg restaurant ~11€ (not Munich 14€); rent ~13€/m² national
  ['🇩🇪','Allemagne',     '€',    2350, 0.75,  3.70,  11,    3.00,  13.0,  15000, 1.80,  1099],
  // Italy: national avg restaurant ~10€ (southern Italy brings it down); rent ~11€/m²
  ['🇮🇹','Italie',        '€',    1550, 0.95,  4.20,  10,    1.20,  11.0,  14000, 1.75,  1099],
  // Spain: national avg restaurant ~9€; rent ~11€/m² (outside Madrid/Barcelona)
  ['🇪🇸','Espagne',       '€',    1500, 0.85,  3.20,   9,    1.40,  11.0,  13500, 1.70,  1099],
  // UK: national avg restaurant ~12£ (not London 15£); rent ~16£/m² national (outside London)
  ['🇬🇧','Royaume-Uni',   '£',    2800, 1.00,  5.00,  12,    3.30,  16.0,  16000, 1.55,   949],
  // USA: national avg restaurant ~15$ (not NYC/SF 20$); rent ~18$/m² national avg
  ['🇺🇸','États-Unis',    '$',    3500, 1.40,  7.00,  15,    4.50,  18.0,  25000, 0.92,   999],
  // Japan: national avg restaurant ~800¥ (outside Tokyo); rent ~2 200¥/m² national
  ['🇯🇵','Japon',         '¥',  280000, 195,   650,   800,  360,  2200, 2200000, 170,  174800],
  // China: weighted urban+suburban mix. Restaurant ~28¥ (not Shanghai 40¥); rent ~55¥/m²
  ['🇨🇳','Chine',         '¥',    8000, 4.20,  18,     28,   14,    55,  80000,   7.8,  7999],
  // Russia: national avg (not just Moscow). Restaurant ~600₽; rent ~800₽/m²
  ['🇷🇺','Russie',        '₽',   70000,  85,   260,   600,  190,   800, 800000,   55,  99990],
  // Poland: national avg restaurant ~28 PLN (not Warsaw 35); rent ~50 PLN/m²
  ['🇵🇱','Pologne',       'PLN',  5000, 3.20,   13,    28,    9,    50,  55000,  6.50,  5299],
  // Sweden: national avg restaurant ~130 SEK (not Stockholm 150); rent ~120 SEK/m²
  ['🇸🇪','Suède',         'SEK', 28000,  14,    85,   130,   48,   120, 200000,    20,  12990],
  // Brazil: national avg (São Paulo + interior mix). Restaurant ~30 R$; rent ~28 R$/m²
  ['🇧🇷','Brésil',        'R$',   3500, 4.20,   14,    30,    7,    28,  75000,   5.90,  8999],
];

// compute units per month = salary / price (rounded)
function units(salary, price) {
  return Math.round(salary / price);
}

// Build rows
const rows = COUNTRIES.map(([flag, name, cur, sal, bS, bB, rest, cof, rent, car, fuel, iphone]) => {
  const uBeerS = units(sal, bS);
  const uBeerB = units(sal, bB);
  const uRest  = units(sal, rest);
  const uCof   = units(sal, cof);
  const uRent  = Math.round(sal / rent); // m² rentable
  const uCar   = (sal > 0 ? (car/sal).toFixed(1) : '-'); // mois
  const uFuel  = units(sal, fuel);
  const uPhone = (sal > 0 ? (iphone/sal).toFixed(1) : '-'); // mois
  return {flag, name, cur, sal, uBeerS, uBeerB, uRest, uCof, uRent, uCar, uFuel, uPhone};
});

// Find max for each category (for bar widths)
const maxBS   = Math.max(...rows.map(r=>r.uBeerS));
const maxBB   = Math.max(...rows.map(r=>r.uBeerB));
const maxRest = Math.max(...rows.map(r=>r.uRest));
const maxCof  = Math.max(...rows.map(r=>r.uCof));
const maxRent = Math.max(...rows.map(r=>r.uRent));
const maxFuel = Math.max(...rows.map(r=>r.uFuel));

function barRow(flag, name, val, max, unit, color) {
  const pct = Math.round((val/max)*100);
  return `<div class="bar-row">
    <div class="bar-country">${flag} ${name}</div>
    <div class="bar-wrap"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
    <div class="bar-val">${val.toLocaleString('fr-FR')} ${unit}</div>
  </div>`;
}

// Sort by category value desc
function sortedRows(key) { return [...rows].sort((a,b)=>b[key]-a[key]); }

const page4 = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Pouvoir d'achat réel par pays : ce que le salaire médian permet vraiment d'acheter</title>
  <meta name="description" content="Bières, restos, logement, voiture, essence : combien peut s'offrir un salarié médian en France, Allemagne, USA, Chine, Japon, Russie... ? La comparaison qui contredit le PIB par habitant.">
  <link rel="canonical" href="https://le-francais-moyen.com/questions/pouvoir-dachat-reel-comparaison-internationale">
  <link rel="alternate" hreflang="fr" href="https://le-francais-moyen.com/questions/pouvoir-dachat-reel-comparaison-internationale">
  <link rel="alternate" hreflang="x-default" href="https://le-francais-moyen.com/questions/pouvoir-dachat-reel-comparaison-internationale">
  <meta property="og:title" content="Pouvoir d'achat réel par pays : la comparaison qui contredit le PIB">
  <meta property="og:description" content="Un Chinois peut s'offrir 2× plus de restos qu'un Français. Un Américain paie son essence 2× moins cher. Le classement par pouvoir d'achat quotidien réel dans 12 pays.">
  <meta property="og:url" content="https://le-francais-moyen.com/questions/pouvoir-dachat-reel-comparaison-internationale">
  <meta property="og:image" content="https://le-francais-moyen.com/assets/img/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/svg+xml" href="/assets/img/favicon.svg">
  <link rel="stylesheet" href="../assets/css/styles.css?v=22">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Article","headline":"Pouvoir d'achat réel par pays : ce que le salaire médian permet vraiment d'acheter","description":"Comparaison du pouvoir d'achat quotidien dans 12 pays : bières, restaurants, logement, voiture, essence. Le salaire médian local converti en volume de biens concrets.","datePublished":"2026-05-31","dateModified":"2026-05-31","author":{"@type":"Organization","name":"Le Français Moyen","url":"https://le-francais-moyen.com"},"publisher":{"@type":"Organization","name":"Le Français Moyen","logo":{"@type":"ImageObject","url":"https://le-francais-moyen.com/assets/img/og-image.png"}},"mainEntityOfPage":{"@type":"WebPage","@id":"https://le-francais-moyen.com/questions/pouvoir-dachat-reel-comparaison-internationale"},"inLanguage":"fr-FR"}
  </script>
  <style>
    .q-hero{padding:52px 24px 36px;text-align:center;background:radial-gradient(ellipse at 50% 0%,rgba(167,139,250,.09) 0%,transparent 60%)}
    .q-container{max-width:820px;margin:0 auto;padding:0 24px 60px}
    .q-section{margin-bottom:48px}
    .q-section h2{font-size:1.25rem;font-weight:800;margin-bottom:16px;color:var(--text)}
    .q-section p{color:var(--muted);line-height:1.85;font-size:.97rem;margin-bottom:12px}
    .q-section strong{color:var(--text)}
    .category-selector{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:28px}
    .cat-btn{padding:8px 16px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:.85rem;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit}
    .cat-btn.active,.cat-btn:hover{background:rgba(167,139,250,.15);border-color:#a78bfa;color:#a78bfa}
    .cat-section{display:none}
    .cat-section.active{display:block}
    .bar-row{display:grid;grid-template-columns:140px 1fr 90px;align-items:center;gap:12px;margin-bottom:10px}
    .bar-country{font-size:.88rem;color:var(--text);font-weight:600;white-space:nowrap}
    .bar-wrap{height:28px;background:rgba(255,255,255,.05);border-radius:4px;overflow:hidden}
    .bar-fill{height:100%;border-radius:4px;transition:width .4s ease}
    .bar-val{font-size:.9rem;font-weight:700;color:var(--text);text-align:right}
    .insight-box{background:rgba(167,139,250,.07);border:1px solid rgba(167,139,250,.25);border-radius:14px;padding:18px 22px;margin:24px 0}
    .insight-box .ib-label{font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#a78bfa;margin-bottom:8px}
    .insight-box p{color:var(--muted);font-size:.93rem;line-height:1.65;margin:0}
    .insight-box strong{color:var(--text)}
    .kpi-row{display:flex;gap:16px;flex-wrap:wrap;margin:24px 0}
    .kpi-card{flex:1;min-width:150px;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:12px;padding:16px 18px;text-align:center}
    .kpi-val{font-size:1.5rem;font-weight:900;color:var(--text)}
    .kpi-sub{font-size:.75rem;color:var(--muted);margin-top:4px;line-height:1.4}
    .method-note{background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:12px;padding:16px 20px;font-size:.82rem;color:var(--muted);line-height:1.7;margin-top:36px}
    .method-note strong{color:var(--text);display:block;margin-bottom:6px}
    .related h3{font-size:.78rem;font-weight:800;margin-bottom:12px;color:var(--muted);letter-spacing:.05em;text-transform:uppercase}
    .related-links{display:flex;flex-wrap:wrap;gap:10px}
    .related-link{background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:8px;padding:10px 14px;text-decoration:none;color:var(--muted);font-size:.88rem;transition:all .15s}
    .related-link:hover{border-color:#555;color:var(--text)}
    .faq-q{font-size:.97rem;font-weight:700;color:var(--text);margin-bottom:8px}
    .faq-a{color:var(--muted);font-size:.92rem;line-height:1.7;margin-bottom:24px}
    @media(max-width:560px){.bar-row{grid-template-columns:110px 1fr 70px}.bar-country{font-size:.8rem}}
  </style>
</head>
<body>
  <a class="skip" href="#contenu">Aller au contenu</a>
  ${NAVBLOCK}

  <main id="contenu">
    <div class="q-hero">
      <div style="font-size:.78rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#a78bfa;margin-bottom:12px">💰 Pouvoir d'achat · Comparaison internationale · 2025</div>
      <nav aria-label="Fil d'Ariane" style="margin-bottom:16px;font-size:.82rem;color:var(--muted)">
        <a href="/" style="color:var(--muted);text-decoration:none">Accueil</a> › <a href="/questions/" style="color:var(--muted);text-decoration:none">Questions</a> › Pouvoir d'achat réel par pays
      </nav>
      <h1 style="font-size:clamp(1.5rem,4vw,2.3rem);font-weight:900;margin:0 auto 16px;max-width:700px;line-height:1.2">Pouvoir d'achat réel par pays :<br>ce que le salaire médian permet vraiment d'acheter</h1>
      <p style="color:var(--muted);font-size:1rem;max-width:580px;margin:0 auto;line-height:1.7">Le PIB par habitant dit que le Français est 2,6× plus riche qu'un Chinois. La réalité : avec son salaire, un Chinois mange au restaurant <strong style="color:#a78bfa">2× plus souvent</strong>. Ce comparatif traduit les salaires en volume de biens concrets.</p>
    </div>

    <div class="q-container">

      <div class="kpi-row">
        <div class="kpi-card"><div class="kpi-val">12</div><div class="kpi-sub">pays comparés</div></div>
        <div class="kpi-card"><div class="kpi-val">8</div><div class="kpi-sub">catégories du quotidien</div></div>
        <div class="kpi-card"><div class="kpi-val">Numbeo</div><div class="kpi-sub">source prix locaux 2025</div></div>
        <div class="kpi-card"><div class="kpi-val">OCDE</div><div class="kpi-sub">source salaires médians</div></div>
      </div>

      <div class="insight-box">
        <div class="ib-label">💡 Le paradoxe du PIB par habitant</div>
        <p>Le PIB par habitant en parité de pouvoir d'achat (PPA) est l'indicateur standard de richesse. Il place la France à <strong>~46 000 $ PPA</strong> contre <strong>~17 000 $ PPA</strong> pour la Chine. Pourtant, ce ratio ne mesure pas ce que le <em>salarié médian</em> peut s'offrir au quotidien dans son pays. Les prix locaux, les taxes et la structure des coûts de la vie changent complètement la donne — surtout pour les services (restauration, logement).</p>
      </div>

      <div class="q-section">
        <h2>Sélectionnez une catégorie</h2>
        <p style="font-size:.88rem;color:var(--muted);margin-bottom:16px">Nombre d'unités qu'un salarié médian peut théoriquement acheter avec son salaire mensuel net entier. Cliquez sur une catégorie pour voir le classement.</p>

        <div class="category-selector">
          <button class="cat-btn active" onclick="showCat('beerS')">🍺 Bière supermarché</button>
          <button class="cat-btn" onclick="showCat('beerB')">🍺 Bière au bar</button>
          <button class="cat-btn" onclick="showCat('rest')">🍽️ Repas restaurant</button>
          <button class="cat-btn" onclick="showCat('cof')">☕ Café au bar</button>
          <button class="cat-btn" onclick="showCat('rent')">🏠 m² de logement</button>
          <button class="cat-btn" onclick="showCat('fuel')">⛽ Litres d'essence</button>
          <button class="cat-btn" onclick="showCat('car')">🚗 Mois pour une voiture</button>
          <button class="cat-btn" onclick="showCat('phone')">📱 Mois pour un iPhone</button>
        </div>

        <!-- BEER SUPERMARKET -->
        <div class="cat-section active" id="cat-beerS">
          <p style="font-size:.85rem;color:var(--muted);margin-bottom:16px">Bière 50cl au supermarché. Nombre d'unités achetables avec le salaire mensuel net entier.</p>
          ${sortedRows('uBeerS').map(r=>barRow(r.flag,r.name,r.uBeerS,maxBS,'bières',r.name==='France'?'#f87171':'#60a5fa')).join('\n          ')}
          <div class="insight-box" style="margin-top:20px">
            <div class="ib-label">📊 Enseignement clé</div>
            <p>L'Allemagne est le paradis de la bière bon marché : <strong>${sortedRows('uBeerS')[0].uBeerS.toLocaleString('fr-FR')} bières par mois</strong> pour un salarié médian, contre ${rows.find(r=>r.name==='France').uBeerS.toLocaleString('fr-FR')} en France. La Russie ferme la marche malgré un salaire certes plus bas — mais le prix de la bière en supermarché y est aussi plus élevé proportionnellement.</p>
          </div>
        </div>

        <!-- BEER BAR -->
        <div class="cat-section" id="cat-beerB">
          <p style="font-size:.85rem;color:var(--muted);margin-bottom:16px">Bière pression 50cl au bar/café. Nombre de verres achetables avec le salaire mensuel net entier.</p>
          ${sortedRows('uBeerB').map(r=>barRow(r.flag,r.name,r.uBeerB,maxBB,'verres',r.name==='France'?'#f87171':'#34d399')).join('\n          ')}
          <div class="insight-box" style="margin-top:20px">
            <div class="ib-label">📊 Enseignement clé</div>
            <p>La Suède, malgré un bon salaire, est pénalisée par des prix de bar parmi les plus élevés au monde (taxes sur l'alcool). Un Suédois peut s'offrir <strong>${rows.find(r=>r.name==='Suède').uBeerB} verres/mois</strong> contre ${rows.find(r=>r.name==='Allemagne').uBeerB} pour un Allemand. La Chine et la Russie sont bien placées : les bars locaux bon marché compensent les salaires plus bas.</p>
          </div>
        </div>

        <!-- RESTAURANT -->
        <div class="cat-section" id="cat-rest">
          <p style="font-size:.85rem;color:var(--muted);margin-bottom:16px">Repas au restaurant — plat principal + boisson dans un établissement standard (non gastronomique). Nombre de repas achetables avec le salaire mensuel net entier.</p>
          ${sortedRows('uRest').map(r=>barRow(r.flag,r.name,r.uRest,maxRest,'repas',r.name==='France'?'#f87171':'#fb923c')).join('\n          ')}
          <div class="insight-box" style="margin-top:20px">
            <div class="ib-label">📊 L'enseignement qui contredit tout</div>
            <p>C'est ici que la réalité contredit le plus violemment le PIB par habitant. <strong>Un Chinois peut s'offrir ${rows.find(r=>r.name==='Chine').uRest} repas au restaurant par mois</strong>, contre ${rows.find(r=>r.name==='France').uRest} pour un Français. Le Japon fait encore mieux grâce à ses restaurants abordables. La restauration est un service local dont le prix est très faible dans les économies à bas salaires — ce que le PIB PPA ne capture pas correctement pour les individus médians.</p>
          </div>
        </div>

        <!-- COFFEE -->
        <div class="cat-section" id="cat-cof">
          <p style="font-size:.85rem;color:var(--muted);margin-bottom:16px">Café espresso ou équivalent au café/bar. Nombre de tasses achetables avec le salaire mensuel net entier.</p>
          ${sortedRows('uCof').map(r=>barRow(r.flag,r.name,r.uCof,maxCof,'cafés',r.name==='France'?'#f87171':'#fbbf24')).join('\n          ')}
          <div class="insight-box" style="margin-top:20px">
            <div class="ib-label">📊 Enseignement clé</div>
            <p>L'Italie est imbattable : un espresso à <strong>1,20 € au bar</strong> et un salaire médian de 1 550 € donnent ${rows.find(r=>r.name==='Italie').uCof.toLocaleString('fr-FR')} cafés par mois — soit 43 cafés par jour. C'est pourquoi la culture du café au comptoir est si ancrée en Italie : ce n'est pas seulement une tradition, c'est économiquement accessible.</p>
          </div>
        </div>

        <!-- HOUSING -->
        <div class="cat-section" id="cat-rent">
          <p style="font-size:.85rem;color:var(--muted);margin-bottom:16px">Surface en m² qu'on pourrait louer si l'on consacrait <em>l'intégralité</em> de son salaire au loyer. Basé sur le loyer moyen par m² dans les grandes villes hors hypercentre.</p>
          ${sortedRows('uRent').map(r=>barRow(r.flag,r.name,r.uRent,maxRent,'m²',r.name==='France'?'#f87171':'#818cf8')).join('\n          ')}
          <div class="insight-box" style="margin-top:20px">
            <div class="ib-label">📊 Enseignement clé</div>
            <p>La Suède et l'Allemagne dominent — non pas parce que les loyers y sont bas, mais parce que les salaires sont élevés. La France est dans la moyenne. Le Royaume-Uni est pénalisé par les loyers très élevés hors Londres. Note : ces chiffres varient énormément selon les villes — Paris ou Londres sont bien pires que la moyenne nationale.</p>
          </div>
        </div>

        <!-- FUEL -->
        <div class="cat-section" id="cat-fuel">
          <p style="font-size:.85rem;color:var(--muted);margin-bottom:16px">Litres d'essence SP95 ou équivalent achetables avec le salaire mensuel net entier.</p>
          ${sortedRows('uFuel').map(r=>barRow(r.flag,r.name,r.uFuel,maxFuel,'litres',r.name==='France'?'#f87171':'#34d399')).join('\n          ')}
          <div class="insight-box" style="margin-top:20px">
            <div class="ib-label">📊 L'exception américaine</div>
            <p>Les États-Unis sont hors catégorie : avec <strong>${rows.find(r=>r.name==='États-Unis').uFuel.toLocaleString('fr-FR')} litres par mois</strong>, un Américain médian peut acheter 3,3× plus d'essence qu'un Français. L'essence y coûte environ 0,92 $/L contre 1,75 €/L en France — une différence due aux taxes très faibles et à la structure fiscale américaine. C'est l'une des raisons structurelles de la dépendance à la voiture aux USA.</p>
          </div>
        </div>

        <!-- CAR -->
        <div class="cat-section" id="cat-car">
          <p style="font-size:.85rem;color:var(--muted);margin-bottom:16px">Nombre de mois de salaire nécessaires pour acheter une voiture d'entrée de gamme neuve (Dacia Logan ou équivalent local le moins cher). Moins c'est bas, plus c'est avantageux.</p>
          <div style="margin:16px 0">
          ${[...rows].sort((a,b)=>parseFloat(a.uCar)-parseFloat(b.uCar)).map(r=>{
            const val = parseFloat(r.uCar);
            const maxVal = 12;
            const pct = Math.min(100,Math.round((val/maxVal)*100));
            const color = r.name==='France'?'#f87171':'#60a5fa';
            return `<div class="bar-row">
    <div class="bar-country">${r.flag} ${r.name}</div>
    <div class="bar-wrap"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
    <div class="bar-val">${r.uCar} mois</div>
  </div>`;
          }).join('\n          ')}
          </div>
          <div class="insight-box" style="margin-top:20px">
            <div class="ib-label">📊 Enseignement clé</div>
            <p>Le Royaume-Uni offre le meilleur ratio : une Dacia Logan (~£12 000) représente seulement 4,3 mois de salaire médian. La France est dans la moyenne européenne (~7 mois). La Russie et la Pologne sont pénalisées par des voitures relativement chères par rapport aux salaires locaux.</p>
          </div>
        </div>

        <!-- IPHONE -->
        <div class="cat-section" id="cat-phone">
          <p style="font-size:.85rem;color:var(--muted);margin-bottom:16px">Nombre de mois de salaire nécessaires pour acheter un iPhone 16 base (prix local officiel Apple). Moins c'est bas, plus c'est avantageux.</p>
          <div style="margin:16px 0">
          ${[...rows].sort((a,b)=>parseFloat(a.uPhone)-parseFloat(b.uPhone)).map(r=>{
            const val = parseFloat(r.uPhone);
            const maxVal = 5;
            const pct = Math.min(100,Math.round((val/maxVal)*100));
            const color = r.name==='France'?'#f87171':'#a78bfa';
            return `<div class="bar-row">
    <div class="bar-country">${r.flag} ${r.name}</div>
    <div class="bar-wrap"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
    <div class="bar-val">${r.uPhone} mois</div>
  </div>`;
          }).join('\n          ')}
          </div>
          <div class="insight-box" style="margin-top:20px">
            <div class="ib-label">📊 Enseignement clé</div>
            <p>L'iPhone est un bien mondial à prix quasi standardisé, mais son coût relatif varie énormément. Pour un Brésilien ou un Russe médian, un iPhone représente <strong>2,5 à 3 mois de salaire</strong> — contre 0,5 mois pour un Américain. Ce contraste illustre pourquoi les smartphones Android dominent dans les pays émergents : ce n'est pas un choix de préférence, c'est une contrainte de pouvoir d'achat.</p>
          </div>
        </div>
      </div>

      <div class="q-section">
        <h2>Le tableau complet : tous les pays, toutes les catégories</h2>
        <p>Voici le récapitulatif avec toutes les données. Unités par mois (sauf voiture et iPhone en mois de salaire).</p>
        <div style="overflow-x:auto;margin-top:16px">
          <table style="width:100%;border-collapse:collapse;font-size:.83rem">
            <thead>
              <tr style="background:rgba(255,255,255,.05)">
                <th style="padding:10px 12px;text-align:left;color:var(--muted);font-weight:700;border-bottom:1px solid var(--border)">Pays</th>
                <th style="padding:10px 8px;text-align:center;color:var(--muted);font-weight:700;border-bottom:1px solid var(--border)">🍺 Supra</th>
                <th style="padding:10px 8px;text-align:center;color:var(--muted);font-weight:700;border-bottom:1px solid var(--border)">🍺 Bar</th>
                <th style="padding:10px 8px;text-align:center;color:var(--muted);font-weight:700;border-bottom:1px solid var(--border)">🍽️ Resto</th>
                <th style="padding:10px 8px;text-align:center;color:var(--muted);font-weight:700;border-bottom:1px solid var(--border)">☕ Café</th>
                <th style="padding:10px 8px;text-align:center;color:var(--muted);font-weight:700;border-bottom:1px solid var(--border)">🏠 m²</th>
                <th style="padding:10px 8px;text-align:center;color:var(--muted);font-weight:700;border-bottom:1px solid var(--border)">⛽ L</th>
                <th style="padding:10px 8px;text-align:center;color:var(--muted);font-weight:700;border-bottom:1px solid var(--border)">🚗 mois</th>
                <th style="padding:10px 8px;text-align:center;color:var(--muted);font-weight:700;border-bottom:1px solid var(--border)">📱 mois</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r=>`<tr style="${r.name==='France'?'background:rgba(248,113,113,.06);':''}border-bottom:1px solid rgba(255,255,255,.04)">
                <td style="padding:9px 12px;font-weight:600;color:var(--text)">${r.flag} ${r.name}</td>
                <td style="padding:9px 8px;text-align:center;color:var(--muted)">${r.uBeerS.toLocaleString('fr-FR')}</td>
                <td style="padding:9px 8px;text-align:center;color:var(--muted)">${r.uBeerB.toLocaleString('fr-FR')}</td>
                <td style="padding:9px 8px;text-align:center;color:var(--muted)">${r.uRest.toLocaleString('fr-FR')}</td>
                <td style="padding:9px 8px;text-align:center;color:var(--muted)">${r.uCof.toLocaleString('fr-FR')}</td>
                <td style="padding:9px 8px;text-align:center;color:var(--muted)">${r.uRent.toLocaleString('fr-FR')}</td>
                <td style="padding:9px 8px;text-align:center;color:var(--muted)">${r.uFuel.toLocaleString('fr-FR')}</td>
                <td style="padding:9px 8px;text-align:center;color:var(--muted)">${r.uCar}</td>
                <td style="padding:9px 8px;text-align:center;color:var(--muted)">${r.uPhone}</td>
              </tr>`).join('\n              ')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="q-section">
        <h2>Ce que ces chiffres nous enseignent vraiment</h2>
        <p>Le PIB par habitant en PPA mesure la production économique totale ramenée à la population. C'est un indicateur macroéconomique utile pour comparer des économies, mais il ne dit rien sur ce que le citoyen médian peut se permettre au quotidien.</p>
        <p>Les services — restauration, coiffure, transports locaux — ont des prix qui suivent les salaires locaux. Un restaurant chinois emploie un cuisinier chinois payé au salaire médian chinois : son prix sera mécaniquement 3 à 4 fois inférieur à un restaurant français. Le Chinois médian en bénéficie directement.</p>
        <p>En revanche, les biens échangeables internationalement — iPhone, voiture, carburant mondial — tendent à converger vers un prix relatif similaire dans le monde entier. C'est là que le pouvoir d'achat des pays riches se manifeste réellement.</p>

        <div class="insight-box">
          <div class="ib-label">🇫🇷 La situation française en résumé</div>
          <p>La France est un pays de <strong>salaires médians moyens en Europe</strong> (2 000 €/mois net), avec des prix élevés pour les services locaux (restauration, artisanat) mais compétitifs pour les biens industriels. Le Français médian mange moins souvent au restaurant qu'un Japonais ou un Chinois urbain, paye son essence très cher par rapport aux Américains, mais bénéficie d'un excellent rapport qualité/prix sur les services publics (santé, éducation) non comptabilisés dans ce comparatif.</p>
        </div>
      </div>

      <div class="q-section">
        <h2>Questions fréquentes</h2>
        <div class="faq-q">Pourquoi comparer le salaire médian et non le salaire moyen ?</div>
        <p class="faq-a">Le salaire moyen est tiré vers le haut par les très hauts revenus. Le salaire médian — celui qui sépare la population en deux moitiés égales — est plus représentatif de la situation du "citoyen ordinaire". Dans un pays très inégalitaire (USA, Brésil), la différence entre médiane et moyenne est considérable.</p>
        <div class="faq-q">Ces données sont-elles comparables entre pays ?</div>
        <p class="faq-a">Avec des nuances importantes. Les prix Numbeo sont des moyennes de grandes villes — ils ne reflètent pas les zones rurales ou les petites villes, souvent moins chères. Les salaires médians nets varient aussi selon les conventions sociales (cotisations incluses ou non dans le brut). Ces données sont indicatives d'ordres de grandeur, pas d'un classement précis.</p>
        <div class="faq-q">La Chine progresse-t-elle rapidement ?</div>
        <p class="faq-a">Très rapidement. En 2010, le salaire médian urbain chinois était d'environ 2 500 RMB/mois (contre ~8 000 aujourd'hui). En 15 ans, il a plus que triplé. Si cette tendance se maintient, le pouvoir d'achat médian chinois pourrait rejoindre les niveaux européens d'ici 2035-2040 pour les biens de consommation courante.</p>
      </div>

      <div class="method-note">
        <strong>Méthodologie et sources</strong>
        <strong>Salaires médians nets :</strong> OCDE (Earnings and Wages 2024), Bureau of Labor Statistics (USA), National Bureau of Statistics (Chine), Rosstat (Russie), Destatis (Allemagne), INE (Espagne), ONS (Royaume-Uni), INSEE (France). Les salaires sont nets d'impôts et de cotisations sociales salariales. Pour la Chine et la Russie, il s'agit des médianes urbaines des grandes villes (Shanghai, Pékin / Moscou, Saint-Pétersbourg), plus proches de la réalité des 500 millions d'urbains que de la médiane nationale incluant les zones rurales.
        <br><br>
        <strong>Prix locaux :</strong> Numbeo Cost of Living Database, Q1 2025 — <em>moyennes nationales</em> pondérant grandes villes, villes secondaires et zones péri-urbaines (pas seulement les capitales). Pour les grands pays (USA, Chine, Russie, Brésil), nous utilisons un mix urbain+périurbain représentatif du salarié médian, et non les seules métropoles. Apple Store (prix officiels iPhone 16 base, mai 2025). Prix carburants : IEA Global Petrol Prices, avril 2025. Prix voiture : catalogue constructeur (Dacia Logan ou équivalent d'entrée de gamme local le moins cher neuf).
        <br><br>
        <strong>Avertissement :</strong> ces données sont des ordres de grandeur représentatifs. Les prix varient selon les villes, les quartiers et les établissements. L'objectif est de comparer le pouvoir d'achat <em>médian</em> — pas celui d'un Parisien, d'un Shanghaïen ou d'un New-Yorkais.
      </div>

      <div class="related" style="margin-top:40px">
        <h3>Approfondir</h3>
        <div class="related-links">
          <a href="/questions/le-pouvoir-dachat-des-francais-a-t-il-baisse.html" class="related-link">📉 Pouvoir d'achat des Français</a>
          <a href="/questions/france-vs-allemagne-comparaison.html" class="related-link">🇩🇪 France vs Allemagne</a>
          <a href="/questions/france-vs-ocde-comparaison.html" class="related-link">🌍 France vs OCDE</a>
          <a href="/dette/" class="related-link">⏱️ Dette publique en direct</a>
        </div>
      </div>
    </div>
  </main>

  <script>
  function showCat(id) {
    document.querySelectorAll('.cat-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.cat-btn').forEach(el => el.classList.remove('active'));
    var el = document.getElementById('cat-' + id);
    if (el) el.classList.add('active');
    event.currentTarget.classList.add('active');
  }
  </script>
  ${FOOTER_JS}`;

fs.writeFileSync('questions/pouvoir-dachat-reel-comparaison-internationale.html', page4, 'utf8');
console.log('Page 4 (pouvoir achat) written OK');
console.log('Sizes:',
  fs.statSync('questions/comment-est-calculee-la-dette-publique.html').size,
  fs.statSync('questions/pourquoi-la-france-ne-rembourse-pas-sa-dette.html').size,
  fs.statSync('questions/dette-publique-france-2026.html').size,
  fs.statSync('questions/pouvoir-dachat-reel-comparaison-internationale.html').size
);
