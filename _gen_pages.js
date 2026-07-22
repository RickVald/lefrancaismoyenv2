const fs = require('fs');

// ── Load nav templates ────────────────────────────────────────────────────
const {NAV, MOB} = JSON.parse(fs.readFileSync('_nav_template.json','utf8'));

// ── Shared builders ───────────────────────────────────────────────────────
const CTA = `  <div style="max-width:760px;margin:0 auto;padding:0 20px 40px">
    <a href="/dette/" style="display:flex;align-items:center;justify-content:space-between;gap:16px;background:rgba(255,107,107,.08);border:1.5px solid rgba(255,107,107,.3);border-radius:14px;padding:20px 28px;text-decoration:none;color:inherit;transition:.15s" onmouseover="this.style.background='rgba(255,107,107,.14)'" onmouseout="this.style.background='rgba(255,107,107,.08)'">
      <div>
        <div style="font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#f87171;margin-bottom:6px">⏱️ Compteur en direct</div>
        <div style="font-size:1rem;font-weight:800;color:var(--text)">Voir la dette publique française augmenter en temps réel →</div>
        <div style="font-size:.82rem;color:var(--muted);margin-top:4px">+4 832 €/seconde · 3 536 Md€ · 117,5 % du PIB</div>
      </div>
      <div style="font-size:2rem;flex-shrink:0">📊</div>
    </a>
  </div>`;

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

const SHARED_CSS = `
    .q-hero{padding:52px 24px 36px;text-align:center;background:radial-gradient(ellipse at 50% 0%,rgba(251,146,60,.09) 0%,transparent 60%)}
    .q-container{max-width:760px;margin:0 auto;padding:0 24px 60px}
    .q-section{margin-bottom:40px}
    .q-section h2{font-size:1.2rem;font-weight:800;margin-bottom:14px;color:var(--text)}
    .q-section p{color:var(--muted);line-height:1.85;font-size:.97rem;margin-bottom:12px}
    .q-section strong{color:var(--text)}
    .q-section ul{padding-left:20px;color:var(--muted);line-height:1.9;font-size:.95rem}
    .q-section li{margin-bottom:6px}
    .answer-box{background:rgba(251,146,60,.06);border:1px solid rgba(251,146,60,.2);border-radius:14px;padding:20px 24px;margin:24px 0}
    .ab-label{font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#fb923c;margin-bottom:10px}
    .kpi-row{display:flex;gap:16px;flex-wrap:wrap;margin:24px 0}
    .kpi-card{flex:1;min-width:140px;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:12px;padding:16px 18px;text-align:center}
    .kpi-val{font-size:1.6rem;font-weight:900;color:var(--text)}
    .kpi-lbl{font-size:.78rem;color:var(--muted);margin-top:4px}
    .faq-q{font-size:.97rem;font-weight:700;color:var(--text);margin-bottom:8px}
    .faq-a{color:var(--muted);font-size:.92rem;line-height:1.7;margin-bottom:24px}
    .q-sources{background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:12px;padding:16px 20px;margin-top:36px;font-size:.82rem;color:var(--muted);line-height:1.7}
    .q-sources strong{color:var(--text);display:block;margin-bottom:6px}
    .related{margin-top:40px}
    .related h3{font-size:.78rem;font-weight:800;margin-bottom:12px;color:var(--muted);letter-spacing:.05em;text-transform:uppercase}
    .related-links{display:flex;flex-wrap:wrap;gap:10px}
    .related-link{background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:8px;padding:10px 14px;text-decoration:none;color:var(--muted);font-size:.88rem;transition:all .15s}
    .related-link:hover{border-color:#555;color:var(--text)}`;

const FOOTER_JS = `  <script>(function(){var btn=document.getElementById('navToggle');var menu=document.getElementById('navMobile');if(!btn||!menu)return;btn.addEventListener('click',function(){var open=menu.classList.toggle('is-open');btn.setAttribute('aria-expanded',open);document.body.classList.toggle('nav-open',open);});menu.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){menu.classList.remove('is-open');btn.setAttribute('aria-expanded','false');document.body.classList.remove('nav-open');});});document.addEventListener('keydown',function(e){if(e.key==='Escape'&&menu.classList.contains('is-open')){menu.classList.remove('is-open');btn.setAttribute('aria-expanded','false');document.body.classList.remove('nav-open');btn.focus();}});})();</script>
  <script src="/assets/js/nav.js"></script>
</body>
</html>`;

// ═══════════════════════════════════════════════════════════════════════════
// PAGE 1: Comment est calculée la dette publique ?
// ═══════════════════════════════════════════════════════════════════════════
const page1 = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Comment est calculée la dette publique française ? — Méthode INSEE 2026</title>
  <meta name="description" content="La dette publique française est calculée selon la norme Maastricht : dette brute consolidée des APU. 3 460,5 Md€ fin T4 2025, soit 115,6 % du PIB. Méthode, 4 composantes et sources expliqués.">
  <link rel="canonical" href="https://le-francais-moyen.com/questions/comment-est-calculee-la-dette-publique">
  <link rel="alternate" hreflang="fr" href="https://le-francais-moyen.com/questions/comment-est-calculee-la-dette-publique">
  <link rel="alternate" hreflang="x-default" href="https://le-francais-moyen.com/questions/comment-est-calculee-la-dette-publique">
  <meta property="og:title" content="Comment est calculée la dette publique française ?">
  <meta property="og:description" content="Norme Maastricht, 4 composantes, publication trimestrielle INSEE. 3 460,5 Md€ fin 2025. Tout sur le calcul officiel de la dette.">
  <meta property="og:url" content="https://le-francais-moyen.com/questions/comment-est-calculee-la-dette-publique">
  <meta property="og:image" content="https://le-francais-moyen.com/assets/img/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/svg+xml" href="/assets/img/favicon.svg">
  <link rel="stylesheet" href="../assets/css/styles.css?v=22">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Article","headline":"Comment est calculée la dette publique française ?","description":"La dette publique française est calculée selon la norme Maastricht : dette brute consolidée des APU. 3 460,5 Md€ fin T4 2025.","datePublished":"2026-05-31","dateModified":"2026-05-31","author":{"@type":"Organization","name":"Le Français Moyen","url":"https://le-francais-moyen.com"},"publisher":{"@type":"Organization","name":"Le Français Moyen","logo":{"@type":"ImageObject","url":"https://le-francais-moyen.com/assets/img/og-image.png"}},"mainEntityOfPage":{"@type":"WebPage","@id":"https://le-francais-moyen.com/questions/comment-est-calculee-la-dette-publique"},"inLanguage":"fr-FR"}
  </script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
    {"@type":"Question","name":"Quelle est la définition officielle de la dette publique ?","acceptedAnswer":{"@type":"Answer","text":"La dette publique française est mesurée selon la norme européenne dite Maastricht. Elle correspond à la dette brute consolidée de l'ensemble des administrations publiques, exprimée en valeur nominale. Elle exclut les engagements hors bilan comme les retraites des fonctionnaires."}},
    {"@type":"Question","name":"Qui calcule la dette publique en France ?","acceptedAnswer":{"@type":"Answer","text":"L'INSEE calcule et publie la dette publique dans le cadre des Comptes nationaux trimestriels (SEC 2010). Les données sont transmises à Eurostat. La publication intervient environ 90 jours après la fin du trimestre."}},
    {"@type":"Question","name":"Quels organismes composent la dette publique française ?","acceptedAnswer":{"@type":"Answer","text":"La dette publique rassemble 4 sous-secteurs : l'État (~70%), les administrations de sécurité sociale ASSO (~18%), les administrations publiques locales APUL (~9%), et les organismes divers d'administration centrale ODAC (~3%). Les dettes entre ces entités sont consolidées pour éviter les doubles comptages."}}
  ]}</script>
  <style>${SHARED_CSS}
    .compo-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:20px 0}
    .compo-card{background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:12px;padding:16px 18px}
    .compo-card .c-icon{font-size:1.4rem;margin-bottom:8px}
    .compo-card .c-name{font-size:.88rem;font-weight:700;color:var(--text);margin-bottom:4px}
    .compo-card .c-pct{font-size:1.2rem;font-weight:900;color:#fb923c}
    .compo-card .c-desc{font-size:.8rem;color:var(--muted);margin-top:4px;line-height:1.5}
    @media(max-width:520px){.compo-grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <a class="skip" href="#contenu">Aller au contenu</a>
  ${NAVBLOCK}

  <main id="contenu">
    <div class="q-hero">
      <div style="font-size:.78rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#fb923c;margin-bottom:12px">📐 Méthodologie · INSEE · Eurostat</div>
      <nav aria-label="Fil d'Ariane" style="margin-bottom:16px;font-size:.82rem;color:var(--muted)">
        <a href="/" style="color:var(--muted);text-decoration:none">Accueil</a> › <a href="/questions/" style="color:var(--muted);text-decoration:none">Questions</a> › Calcul de la dette
      </nav>
      <h1 style="font-size:clamp(1.5rem,3.5vw,2.2rem);font-weight:900;margin:0 auto 16px;max-width:660px">Comment est calculée la dette publique française ?</h1>
      <p style="color:var(--muted);font-size:.97rem;max-width:540px;margin:0 auto">Définition Maastricht, 4 composantes, publication trimestrielle par l'INSEE — tout ce qu'il faut savoir sur le calcul officiel.</p>
    </div>

    <div class="q-container">
      <div class="answer-box">
        <div class="ab-label">Réponse directe</div>
        <p>La dette publique française est calculée selon la <strong>norme européenne Maastricht</strong> : c'est la dette brute consolidée de l'ensemble des administrations publiques (État + collectivités + sécurité sociale), exprimée en valeur nominale. À fin T4 2025, elle atteint <strong>3 460,5 milliards d'euros</strong>, soit <strong>115,6 % du PIB</strong>. Source : INSEE, Comptes nationaux T4 2025, publiés le 27 mars 2026.</p>
      </div>

      <div class="kpi-row">
        <div class="kpi-card"><div class="kpi-val">3 460,5 Md€</div><div class="kpi-lbl">dette publique fin 2025</div></div>
        <div class="kpi-card"><div class="kpi-val">115,6 %</div><div class="kpi-lbl">du PIB (Maastricht)</div></div>
        <div class="kpi-card"><div class="kpi-val">4</div><div class="kpi-lbl">composantes des APU</div></div>
        <div class="kpi-card"><div class="kpi-val">T+90j</div><div class="kpi-lbl">délai publication INSEE</div></div>
      </div>

      <div class="q-section">
        <h2>La définition Maastricht : ce que la norme inclut (et exclut)</h2>
        <p>La dette retenue par les traités européens est la <strong>dette brute consolidée des administrations publiques</strong>, calculée selon le règlement européen SEC 2010. Elle comprend les obligations et bons du Trésor, les crédits bancaires et les dépôts entre entités publiques.</p>
        <p>Elle <strong>exclut</strong> les engagements hors bilan : retraites futures des fonctionnaires, garanties de l'État, passifs éventuels. C'est pourquoi certains économistes parlent de "dette implicite" pour ces engagements non comptabilisés, souvent estimés entre 1 500 et 3 000 Md€ supplémentaires.</p>
        <p>La <strong>consolidation</strong> est essentielle : les dettes entre entités publiques sont supprimées pour éviter les doubles comptages. Par exemple, si la Sécurité sociale détient des OAT (obligations d'État), ce montant est soustrait de la dette brute totale.</p>
      </div>

      <div class="q-section">
        <h2>Les 4 composantes des administrations publiques</h2>
        <div class="compo-grid">
          <div class="compo-card">
            <div class="c-icon">🏛️</div>
            <div class="c-name">État</div>
            <div class="c-pct">~70 %</div>
            <div class="c-desc">Trésor public, OAT (obligations assimilables du Trésor), BTF (bons à court terme). Géré par l'AFT (Agence France Trésor). Stock d'environ 2 420 Md€.</div>
          </div>
          <div class="compo-card">
            <div class="c-icon">🏥</div>
            <div class="c-name">Sécurité sociale (ASSO)</div>
            <div class="c-pct">~18 %</div>
            <div class="c-desc">CADES (caisse qui porte la dette COVID et les déficits Sécu), UNEDIC, hôpitaux. La CADES rembourse environ 16 Md€/an via la CRDS.</div>
          </div>
          <div class="compo-card">
            <div class="c-icon">🏙️</div>
            <div class="c-name">Collectivités locales (APUL)</div>
            <div class="c-pct">~9 %</div>
            <div class="c-desc">Régions, départements, communes, intercommunalités. Dettes contractées principalement auprès de la Caisse des Dépôts et des banques.</div>
          </div>
          <div class="compo-card">
            <div class="c-icon">📋</div>
            <div class="c-name">ODAC</div>
            <div class="c-pct">~3 %</div>
            <div class="c-desc">Organismes divers d'administration centrale : Bpifrance, universités, grandes écoles, agences nationales.</div>
          </div>
        </div>
      </div>

      <div class="q-section">
        <h2>Pourquoi le chiffre varie-t-il selon les sources ?</h2>
        <p>Plusieurs chiffres circulent car ils ne couvrent pas le même périmètre :</p>
        <ul>
          <li><strong>3 460,5 Md€ (115,6 % du PIB)</strong> — Dette APU Maastricht, fin T4 2025 (INSEE) : le chiffre officiel de référence</li>
          <li><strong>~2 420 Md€</strong> — Dette négociable de l'État seul (AFT) : périmètre État uniquement</li>
          <li><strong>~3 050 Md€</strong> — Dette nette des APU (brute moins actifs financiers) : non retenue par Maastricht</li>
          <li><strong>6 000-8 000 Md€</strong> — Estimations incluant la dette implicite (retraites fonctionnaires, garanties) : hors norme comptable officielle</li>
        </ul>
        <p>Ce site utilise systématiquement la dette brute APU Maastricht publiée par l'INSEE, qui est la référence pour le seuil de <strong>60 % du PIB</strong> des traités européens.</p>
      </div>

      <div class="q-section">
        <h2>Questions fréquentes</h2>
        <div class="faq-q">La dette peut-elle baisser sans remboursement ?</div>
        <p class="faq-a">Oui — le ratio dette/PIB peut baisser si la croissance économique nominale dépasse la croissance de la dette. C'est ainsi que la France a réduit son ratio de 114 % (2020, COVID) à 111 % (2022) malgré l'absence de remboursement net. L'inflation aide mécaniquement : elle augmente le PIB nominal sans modifier la valeur nominale de la dette.</p>
        <div class="faq-q">Pourquoi utiliser la dette brute plutôt que la dette nette ?</div>
        <p class="faq-a">Les traités européens retiennent la dette brute par souci de comparabilité. La valorisation des actifs publics est délicate et contestable (faut-il inclure les participations dans EDF, les forêts domaniales, les musées nationaux ?). La dette brute est plus simple, plus objective et moins manipulable politiquement.</p>
      </div>

      <div class="q-sources">
        <strong>Sources</strong>
        INSEE — Comptes nationaux T4 2025 (27/03/2026), tableau des finances publiques · Eurostat — Government consolidated gross debt (Maastricht criteria) · AFT — Bulletin mensuel dette de l'État · Règlement européen SEC 2010 · Protocole n°12 sur la procédure concernant les déficits excessifs.
      </div>

      <div class="related">
        <h3>Approfondir</h3>
        <div class="related-links">
          <a href="/dette/" class="related-link">⏱️ Compteur en direct</a>
          <a href="/questions/quelle-est-la-difference-entre-la-dette-et-le-deficit.html" class="related-link">📉 Dette vs déficit</a>
          <a href="/questions/qui-detient-la-dette-francaise.html" class="related-link">🏦 Qui détient la dette ?</a>
          <a href="/questions/sources-dette-publique-france.html" class="related-link">📚 Sources officielles</a>
        </div>
      </div>
    </div>

${CTA}
  </main>
${FOOTER_JS}`;

// ═══════════════════════════════════════════════════════════════════════════
// PAGE 2 : Pourquoi la France ne rembourse-t-elle pas sa dette ?
// ═══════════════════════════════════════════════════════════════════════════
const page2 = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Pourquoi la France ne rembourse-t-elle pas sa dette ? — Explication 2026</title>
  <meta name="description" content="La France rembourse ~300 Md€ par an mais en emprunte autant pour refinancer + financer le déficit. Aucun excédent budgétaire depuis 1974. Explication du mécanisme de la dette perpétuelle.">
  <link rel="canonical" href="https://le-francais-moyen.com/questions/pourquoi-la-france-ne-rembourse-pas-sa-dette">
  <link rel="alternate" hreflang="fr" href="https://le-francais-moyen.com/questions/pourquoi-la-france-ne-rembourse-pas-sa-dette">
  <link rel="alternate" hreflang="x-default" href="https://le-francais-moyen.com/questions/pourquoi-la-france-ne-rembourse-pas-sa-dette">
  <meta property="og:title" content="Pourquoi la France ne rembourse-t-elle pas sa dette ?">
  <meta property="og:description" content="Elle rembourse 300 Md€/an, mais en emprunte autant. Aucun excédent depuis 1974. Le mécanisme de la dette qui s'auto-alimente expliqué simplement.">
  <meta property="og:url" content="https://le-francais-moyen.com/questions/pourquoi-la-france-ne-rembourse-pas-sa-dette">
  <meta property="og:image" content="https://le-francais-moyen.com/assets/img/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/svg+xml" href="/assets/img/favicon.svg">
  <link rel="stylesheet" href="../assets/css/styles.css?v=22">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Article","headline":"Pourquoi la France ne rembourse-t-elle pas sa dette ?","description":"La France rembourse environ 300 Md€ de dette par an mais en emprunte autant pour refinancer et financer le déficit structurel. Aucun excédent budgétaire depuis 1974.","datePublished":"2026-05-31","dateModified":"2026-05-31","author":{"@type":"Organization","name":"Le Français Moyen","url":"https://le-francais-moyen.com"},"publisher":{"@type":"Organization","name":"Le Français Moyen","logo":{"@type":"ImageObject","url":"https://le-francais-moyen.com/assets/img/og-image.png"}},"mainEntityOfPage":{"@type":"WebPage","@id":"https://le-francais-moyen.com/questions/pourquoi-la-france-ne-rembourse-pas-sa-dette"},"inLanguage":"fr-FR"}
  </script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
    {"@type":"Question","name":"La France rembourse-t-elle vraiment sa dette ?","acceptedAnswer":{"@type":"Answer","text":"Oui, la France rembourse environ 300 milliards d'euros de dette chaque année via l'AFT (Agence France Trésor). Mais elle emprunte simultanément un montant équivalent ou supérieur pour refinancer les dettes arrivant à échéance et couvrir le déficit budgétaire annuel. Le stock de dette net augmente donc chaque année du montant du déficit public."}},
    {"@type":"Question","name":"Depuis quand la France n'a-t-elle pas eu de budget équilibré ?","acceptedAnswer":{"@type":"Answer","text":"La France n'a pas connu d'excédent budgétaire depuis 1974, soit plus de 50 ans. Aucun gouvernement de gauche ou de droite n'a réussi à dégager un excédent primaire durable. Le déficit structurel tourne autour de 3 à 6% du PIB depuis les années 1990."}},
    {"@type":"Question","name":"Qu'est-ce que l'effet boule de neige de la dette ?","acceptedAnswer":{"@type":"Answer","text":"L'effet boule de neige se produit quand le taux d'intérêt moyen sur la dette (r) dépasse le taux de croissance nominal de l'économie (g). Dans ce cas, même avec un budget primaire à l'équilibre, le ratio dette/PIB augmente mécaniquement. La France est dans cette situation depuis 2022 avec la remontée des taux."}}
  ]}</script>
  <style>${SHARED_CSS}
    .timeline{margin:24px 0}
    .tl-item{display:flex;gap:16px;padding:14px 0;border-bottom:1px solid var(--border)}
    .tl-item:last-child{border-bottom:none}
    .tl-year{font-size:.88rem;font-weight:800;color:#fb923c;min-width:44px}
    .tl-text{font-size:.9rem;color:var(--muted);line-height:1.6}
    .mechanic-box{background:rgba(248,113,113,.06);border:1px solid rgba(248,113,113,.2);border-radius:14px;padding:20px 24px;margin:20px 0}
    .mechanic-box .mb-title{font-size:.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#f87171;margin-bottom:12px}
    .mechanic-box p{color:var(--muted);font-size:.93rem;line-height:1.7;margin:0}
  </style>
</head>
<body>
  <a class="skip" href="#contenu">Aller au contenu</a>
  ${NAVBLOCK}

  <main id="contenu">
    <div class="q-hero">
      <div style="font-size:.78rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#f87171;margin-bottom:12px">❓ Question clé · Finances publiques · 2026</div>
      <nav aria-label="Fil d'Ariane" style="margin-bottom:16px;font-size:.82rem;color:var(--muted)">
        <a href="/" style="color:var(--muted);text-decoration:none">Accueil</a> › <a href="/questions/" style="color:var(--muted);text-decoration:none">Questions</a> › Remboursement de la dette
      </nav>
      <h1 style="font-size:clamp(1.5rem,3.5vw,2.2rem);font-weight:900;margin:0 auto 16px;max-width:660px">Pourquoi la France ne rembourse-t-elle pas sa dette ?</h1>
      <p style="color:var(--muted);font-size:.97rem;max-width:540px;margin:0 auto">Elle rembourse 300 Md€/an — mais en emprunte autant. Aucun excédent budgétaire depuis 1974. Voici le mécanisme.</p>
    </div>

    <div class="q-container">
      <div class="answer-box">
        <div class="ab-label">Réponse directe</div>
        <p>La France <strong>rembourse bien sa dette</strong> — environ 300 milliards d'euros par an via l'AFT. Mais elle emprunte simultanément le même montant pour refinancer les obligations arrivées à maturité, <strong>et</strong> elle emprunte en plus le montant du déficit annuel (~152,5 Md€ en 2025). Résultat : le stock de dette augmente chaque année du montant du déficit. Depuis 1974, aucun gouvernement n'a présenté un budget excédentaire.</p>
      </div>

      <div class="kpi-row">
        <div class="kpi-card"><div class="kpi-val">~300 Md€</div><div class="kpi-lbl">remboursés par an (refinancement)</div></div>
        <div class="kpi-card"><div class="kpi-val">0</div><div class="kpi-lbl">excédent budgétaire depuis 1974</div></div>
        <div class="kpi-card"><div class="kpi-val">~8 ans</div><div class="kpi-lbl">maturité moyenne de la dette</div></div>
        <div class="kpi-card"><div class="kpi-val">52 ans</div><div class="kpi-lbl">de déficits ininterrompus</div></div>
      </div>

      <div class="q-section">
        <h2>La confusion entre "refinancement" et "remboursement net"</h2>
        <p>Chaque année, des obligations d'État (OAT) arrivent à maturité. L'AFT les rembourse intégralement — environ <strong>300 milliards d'euros</strong> en 2025. Mais simultanément, elle émet de nouvelles obligations pour le même montant : c'est le <strong>refinancement</strong>. Le stock de dette ne bouge pas de ce fait.</p>
        <p>Ce qui fait augmenter la dette, c'est uniquement le <strong>déficit public annuel</strong> : en 2025, l'État a dépensé 152,5 milliards de plus qu'il n'a collecté. Ces 152,5 Md€ ont été financés par de nouveaux emprunts, s'ajoutant au stock existant.</p>

        <div class="mechanic-box">
          <div class="mb-title">🔄 Le mécanisme en une phrase</div>
          <p>Dette(n+1) = Dette(n) + Déficit(n) — c'est aussi simple que ça. Tant que le déficit est positif, la dette augmente, quoi qu'il arrive par ailleurs.</p>
        </div>
      </div>

      <div class="q-section">
        <h2>52 ans sans excédent : retour sur une anomalie historique</h2>
        <p>La France a présenté son dernier budget excédentaire en <strong>1974</strong>. Depuis, aucun gouvernement — de droite ou de gauche — n'a réussi à dépenser moins qu'il ne collectait. Cette situation est en partie structurelle :</p>
        <ul>
          <li>Un <strong>État providence étendu</strong> : retraites, assurance-maladie, chômage, minima sociaux représentent ~30% du PIB de dépenses sociales</li>
          <li>Des <strong>recettes élastiques</strong> qui s'effondrent en récession (TVA, IR, IS) alors que les dépenses restent rigides</li>
          <li>Des <strong>réformes structurelles différées</strong> : chaque gouvernement hérite du coût des promesses passées</li>
          <li>Le <strong>coût des intérêts</strong> lui-même : 64,7 Md€ en 2025 qui s'ajoutent aux dépenses sans financer aucun service public</li>
        </ul>

        <div class="timeline">
          <div class="tl-item"><div class="tl-year">1974</div><div class="tl-text">Dernier excédent budgétaire. Chocs pétroliers, fin des Trente Glorieuses — début du déficit structurel.</div></div>
          <div class="tl-item"><div class="tl-year">1993</div><div class="tl-text">Déficit à -6,1% du PIB (récession). Premier dépassement du seuil de Maastricht.</div></div>
          <div class="tl-item"><div class="tl-year">2007</div><div class="tl-text">Meilleur résultat récent : déficit à -2,5% du PIB. Seule fois sous le seuil de 3% depuis 2001.</div></div>
          <div class="tl-item"><div class="tl-year">2020</div><div class="tl-text">COVID : déficit à -9,0% du PIB. La dette monte de 98% à 114% en un an.</div></div>
          <div class="tl-item"><div class="tl-year">2025</div><div class="tl-text">Déficit à -5,1% du PIB (152,5 Md€). La dette atteint 3 460,5 Md€, soit 115,6% du PIB.</div></div>
        </div>
      </div>

      <div class="q-section">
        <h2>L'effet boule de neige : quand la dette s'auto-alimente</h2>
        <p>Il y a un phénomène aggravant appelé <strong>"effet boule de neige"</strong> : quand le taux d'intérêt moyen sur la dette (r) dépasse le taux de croissance nominale de l'économie (g), le ratio dette/PIB augmente mécaniquement — même si l'État arrive à équilibrer son budget primaire.</p>
        <p>Pendant les années 2010, la France bénéficiait de taux d'intérêt historiquement bas (r &lt; g) : la charge de la dette diminuait mécaniquement même avec une dette en hausse. Depuis 2022 et la remontée des taux directeurs de la BCE, la situation s'est inversée : <strong>r &gt; g</strong>. La charge d'intérêts est passée de 35 Md€ en 2021 à 64,7 Md€ en 2025.</p>
        <p>En 2026, le PLF prévoit 74 Md€ d'intérêts — soit +39 Md€ en cinq ans. C'est autant d'argent en moins pour les services publics, et autant en plus à emprunter.</p>
      </div>

      <div class="q-section">
        <h2>Peut-on rembourser la dette ?</h2>
        <p>Techniquement, oui. Pratiquement, c'est un défi considérable. Pour stabiliser le ratio dette/PIB à son niveau actuel (115,6%), il faudrait un <strong>déficit structurel nul</strong>. Pour le faire baisser, il faudrait un <strong>excédent primaire</strong> (recettes &gt; dépenses hors intérêts).</p>
        <p>Les options usuellement citées : austérité fiscale (coupes dans les dépenses), hausses d'impôts, croissance forte, inflation maîtrisée qui érode la dette en termes réels, ou — dans les cas extrêmes — restructuration négociée. La France n'a jamais fait défaut depuis la Révolution française.</p>
      </div>

      <div class="q-section">
        <h2>Questions fréquentes</h2>
        <div class="faq-q">La France pourrait-elle décider de ne plus rembourser sa dette ?</div>
        <p class="faq-a">C'est théoriquement possible (on appelle ça un "défaut souverain") mais aux conséquences catastrophiques : perte d'accès aux marchés financiers, effondrement de l'euro, crise bancaire (les banques françaises et européennes détiennent massivement des OAT). La France bénéficie du soutien implicite de la BCE (TPI — Transmission Protection Instrument), ce qui rend un défaut improbable à court terme.</p>
        <div class="faq-q">À quoi serviraient 152 milliards de moins de déficit ?</div>
        <p class="faq-a">152,5 Md€, c'est l'équivalent de 2,3 fois le budget de l'Éducation nationale (enseignement scolaire), ou 2,7 fois le budget de la Défense. Ce sont des économies qui nécessiteraient des réformes structurelles profondes sur les retraites, la santé et le fonctionnement de l'État.</p>
      </div>

      <div class="q-sources">
        <strong>Sources</strong>
        INSEE — Comptes nationaux, déficit et dette des APU T4 2025 · AFT — Programme indicatif de financement 2025 · PLF 2026 — Rapport sur la dette de l'État · Banque de France — Rapport annuel 2024 · Cour des comptes — Note sur la situation des finances publiques 2025.
      </div>

      <div class="related">
        <h3>Approfondir</h3>
        <div class="related-links">
          <a href="/dette/" class="related-link">⏱️ Compteur en direct</a>
          <a href="/questions/comment-est-calculee-la-dette-publique.html" class="related-link">📐 Comment est calculée la dette ?</a>
          <a href="/questions/combien-coutent-les-interets-de-la-dette.html" class="related-link">💸 Intérêts de la dette</a>
          <a href="/questions/comment-reduire-la-dette-francaise.html" class="related-link">📉 Comment réduire la dette ?</a>
          <a href="/questions/dette-publique-depuis-1974.html" class="related-link">📊 Historique depuis 1974</a>
        </div>
      </div>
    </div>

${CTA}
  </main>
${FOOTER_JS}`;

// ═══════════════════════════════════════════════════════════════════════════
// PAGE 3 : Dette publique France 2026
// ═══════════════════════════════════════════════════════════════════════════
const page3 = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Quelle est la dette publique de la France en 2026 ? — Chiffres officiels</title>
  <meta name="description" content="La dette publique française atteint 3 460,5 Md€ fin 2025 (115,6 % du PIB). Pour 2026, le PLF prévoit un déficit de ~5 % et des intérêts de 74 Md€. Données INSEE officielles.">
  <link rel="canonical" href="https://le-francais-moyen.com/questions/dette-publique-france-2026">
  <link rel="alternate" hreflang="fr" href="https://le-francais-moyen.com/questions/dette-publique-france-2026">
  <link rel="alternate" hreflang="x-default" href="https://le-francais-moyen.com/questions/dette-publique-france-2026">
  <meta property="og:title" content="Dette publique de la France en 2026 — chiffres officiels">
  <meta property="og:description" content="3 460,5 Md€ fin 2025, soit 115,6 % du PIB. Projection 2026 : ~3 600 Md€, intérêts 74 Md€. Données INSEE T4 2025.">
  <meta property="og:url" content="https://le-francais-moyen.com/questions/dette-publique-france-2026">
  <meta property="og:image" content="https://le-francais-moyen.com/assets/img/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/svg+xml" href="/assets/img/favicon.svg">
  <link rel="stylesheet" href="../assets/css/styles.css?v=22">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Article","headline":"Quelle est la dette publique de la France en 2026 ?","description":"La dette publique française atteint 3 460,5 Md€ fin 2025. Pour 2026, le PLF prévoit un déficit de 5% du PIB et une charge d'intérêts de 74 Md€.","datePublished":"2026-05-31","dateModified":"2026-05-31","author":{"@type":"Organization","name":"Le Français Moyen","url":"https://le-francais-moyen.com"},"publisher":{"@type":"Organization","name":"Le Français Moyen","logo":{"@type":"ImageObject","url":"https://le-francais-moyen.com/assets/img/og-image.png"}},"mainEntityOfPage":{"@type":"WebPage","@id":"https://le-francais-moyen.com/questions/dette-publique-france-2026"},"inLanguage":"fr-FR"}
  </script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Dataset","name":"Dette publique France 2025-2026","description":"Données officielles de dette publique française fin 2025 et projections 2026 selon le PLF.","url":"https://le-francais-moyen.com/questions/dette-publique-france-2026","creator":{"@type":"Organization","name":"Le Français Moyen","url":"https://le-francais-moyen.com"},"temporalCoverage":"2020/2026","spatialCoverage":{"@type":"Place","name":"France"},"inLanguage":"fr-FR"}
  </script>
  <style>${SHARED_CSS}
    .proj-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0}
    .proj-card{background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:14px;padding:18px 20px}
    .proj-card.actual{border-color:rgba(251,146,60,.3);background:rgba(251,146,60,.05)}
    .proj-card.proj{border-color:rgba(167,139,250,.3);background:rgba(167,139,250,.05)}
    .proj-label{font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px}
    .proj-card.actual .proj-label{color:#fb923c}
    .proj-card.proj .proj-label{color:#a78bfa}
    .proj-val{font-size:1.8rem;font-weight:900;color:var(--text)}
    .proj-sub{font-size:.82rem;color:var(--muted);margin-top:6px;line-height:1.5}
    .data-table{width:100%;border-collapse:collapse;margin:20px 0;font-size:.9rem}
    .data-table th{text-align:left;padding:10px 14px;background:rgba(255,255,255,.04);color:var(--muted);font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--border)}
    .data-table td{padding:10px 14px;color:var(--muted);border-bottom:1px solid rgba(255,255,255,.05)}
    .data-table tr:last-child td{border-bottom:none}
    .data-table td:nth-child(2),.data-table td:nth-child(3){color:var(--text);font-weight:600}
    .data-table tr.highlight td{background:rgba(251,146,60,.06);color:var(--text)}
    @media(max-width:520px){.proj-grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <a class="skip" href="#contenu">Aller au contenu</a>
  ${NAVBLOCK}

  <main id="contenu">
    <div class="q-hero">
      <div style="font-size:.78rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#fb923c;margin-bottom:12px">📊 Données officelles · INSEE T4 2025 · PLF 2026</div>
      <nav aria-label="Fil d'Ariane" style="margin-bottom:16px;font-size:.82rem;color:var(--muted)">
        <a href="/" style="color:var(--muted);text-decoration:none">Accueil</a> › <a href="/questions/" style="color:var(--muted);text-decoration:none">Questions</a> › Dette 2026
      </nav>
      <h1 style="font-size:clamp(1.5rem,3.5vw,2.2rem);font-weight:900;margin:0 auto 16px;max-width:660px">Quelle est la dette publique de la France en 2026 ?</h1>
      <p style="color:var(--muted);font-size:.97rem;max-width:540px;margin:0 auto">Dernier chiffre officiel : 3 460,5 Md€ fin 2025. Projections 2026 et trajectoire selon le PLF.</p>
    </div>

    <div class="q-container">
      <div class="answer-box">
        <div class="ab-label">Réponse directe</div>
        <p>Le dernier chiffre officiel publié par l'INSEE est <strong>3 460,5 milliards d'euros</strong> au 31 décembre 2025, soit <strong>115,6 % du PIB</strong> (source : Comptes nationaux T4 2025, publiés le 27 mars 2026). Pour 2026, le Projet de loi de finances (PLF) prévoyait un déficit de l'ordre de <strong>5 % du PIB</strong> et une charge d'intérêts de <strong>74 Md€</strong>, ce qui porterait la dette vers <strong>~3 600 Md€</strong> fin 2026.</p>
      </div>

      <div class="proj-grid">
        <div class="proj-card actual">
          <div class="proj-label">✅ Réalisé — fin 2025</div>
          <div class="proj-val">3 460,5 Md€</div>
          <div class="proj-sub">115,6 % du PIB · Source : INSEE T4 2025 (27/03/2026) · 50 600 € par habitant</div>
        </div>
        <div class="proj-card proj">
          <div class="proj-label">🔮 Projection 2026 (PLF)</div>
          <div class="proj-val">~3 600 Md€</div>
          <div class="proj-sub">~116-118 % du PIB estimé · Dépend du déficit effectif 2026 · Mise à jour : T4 2026 (mars 2027)</div>
        </div>
      </div>

      <div class="q-section">
        <h2>Évolution récente de la dette publique française</h2>
        <table class="data-table">
          <thead><tr><th>Année</th><th>Dette (Md€)</th><th>% du PIB</th><th>Note</th></tr></thead>
          <tbody>
            <tr><td>2019</td><td>2 380</td><td>97,4 %</td><td>Pré-COVID</td></tr>
            <tr><td>2020</td><td>2 675</td><td>114,6 %</td><td>Choc COVID : +295 Md€ en un an</td></tr>
            <tr><td>2021</td><td>2 813</td><td>112,9 %</td><td>Rebond économique</td></tr>
            <tr><td>2022</td><td>2 950</td><td>111,6 %</td><td>Inflation réduit le ratio PIB</td></tr>
            <tr><td>2023</td><td>3 101</td><td>112,0 %</td><td>Retour au-dessus de 112 %</td></tr>
            <tr><td>2024</td><td>3 299</td><td>113,7 %</td><td>Déficit 2024 à 6,1 % du PIB</td></tr>
            <tr class="highlight"><td>2025 (T4)</td><td><strong>3 460,5</strong></td><td><strong>115,6 %</strong></td><td>Dernier chiffre officiel (INSEE)</td></tr>
            <tr><td>2026 (proj.)</td><td>~3 600</td><td>~117 %</td><td>Estimation PLF 2026</td></tr>
          </tbody>
        </table>
      </div>

      <div class="q-section">
        <h2>Ce qui va faire évoluer la dette en 2026</h2>
        <p>Trois facteurs déterminent l'évolution de la dette en 2026 :</p>
        <ul>
          <li><strong>Le déficit public 2026</strong> : le PLF 2026 tablait sur ~5 % du PIB, soit environ 150 Md€ de nouveau déficit. C'est le principal moteur de la hausse du stock de dette.</li>
          <li><strong>La charge d'intérêts</strong> : 74 Md€ prévus en 2026 (vs 64,7 Md€ en 2025), sous l'effet du refinancement des obligations émises à taux bas (2016-2021) qui arrivent à maturité et sont remplacées par des émissions à 3-4 %.</li>
          <li><strong>La croissance du PIB nominal</strong> : si le PIB nominal croît de 3-4 %, cela peut limiter la hausse du ratio dette/PIB même si la dette en valeur absolue augmente.</li>
        </ul>
        <p>Note : les données officielles pour fin 2026 ne seront publiées par l'INSEE qu'en mars 2027. D'ici là, les chiffres trimestriels intermédiaires (T1, T2, T3 2026) permettront de suivre la trajectoire.</p>
      </div>

      <div class="q-section">
        <h2>La France en Europe : contexte comparatif</h2>
        <p>À 115,6 % du PIB, la France est l'un des pays les plus endettés de la zone euro, derrière la Grèce (~168 %), l'Italie (~137 %) et la Belgique (~105 %), mais devant l'Espagne (~105 %), l'Allemagne (~63 %) et les Pays-Bas (~46 %). Le critère de Maastricht est fixé à <strong>60 % du PIB</strong> — la France le dépasse de près de 56 points.</p>
        <p>L'objectif officiel du gouvernement est de revenir sous la barre des 3 % de déficit à l'horizon 2029-2030. À ce rythme, le ratio dette/PIB continuerait d'augmenter jusqu'en 2026-2027 avant de se stabiliser.</p>
      </div>

      <div class="q-section">
        <h2>Questions fréquentes</h2>
        <div class="faq-q">Quand la dette de la France va-t-elle dépasser 4 000 milliards ?</div>
        <p class="faq-a">Au rythme actuel (+150-160 Md€/an), la dette française atteindrait 4 000 Md€ vers 2028-2029. Si la croissance ralentit ou si les taux d'intérêt restent élevés, ce cap pourrait être atteint plus tôt. En revanche, des réformes structurelles significatives pourraient repousser cette échéance.</p>
        <div class="faq-q">Pourquoi le ratio dette/PIB peut-il baisser alors que la dette augmente ?</div>
        <p class="faq-a">Le ratio dette/PIB est une fraction : si le PIB nominal (dénominateur) croît plus vite que la dette (numérateur), le ratio baisse. C'est ce qui s'est passé en 2021-2022 : la combinaison d'une forte croissance post-COVID et d'inflation a fait baisser le ratio malgré une dette en hausse absolue.</p>
      </div>

      <div class="q-sources">
        <strong>Sources</strong>
        INSEE — Comptes nationaux T4 2025 (27/03/2026) · PLF 2026 — Rapport économique, social et financier (RESF) · Eurostat — General government gross debt, France series · AFT — Programme d'émission 2026 · FMI — Article IV Consultation France 2025.
      </div>

      <div class="related">
        <h3>Approfondir</h3>
        <div class="related-links">
          <a href="/dette/" class="related-link">⏱️ Compteur en direct</a>
          <a href="/questions/dette-publique-depuis-1974.html" class="related-link">📊 Historique depuis 1974</a>
          <a href="/questions/combien-coutent-les-interets-de-la-dette.html" class="related-link">💸 Intérêts de la dette</a>
          <a href="/questions/dette-france-italie-grece.html" class="related-link">🌍 Comparaison Europe</a>
          <a href="/questions/comment-reduire-la-dette-francaise.html" class="related-link">📉 Peut-on réduire la dette ?</a>
        </div>
      </div>
    </div>

${CTA}
  </main>
${FOOTER_JS}`;

// ─── Write the 3 pages ────────────────────────────────────────────────────
fs.writeFileSync('questions/comment-est-calculee-la-dette-publique.html', page1, 'utf8');
fs.writeFileSync('questions/pourquoi-la-france-ne-rembourse-pas-sa-dette.html', page2, 'utf8');
fs.writeFileSync('questions/dette-publique-france-2026.html', page3, 'utf8');
console.log('Pages 1-3 written OK');
