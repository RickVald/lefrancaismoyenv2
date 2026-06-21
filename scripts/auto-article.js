/**
 * auto-article.js — Agent de publication automatique Le Français Moyen
 *
 * Exécuté par GitHub Actions (mardi + vendredi).
 * 1. Récupère les dernières actualités économiques françaises
 * 2. Appelle Claude API pour générer un article HTML complet
 * 3. Met à jour questions/index.html et sitemap.xml
 * 4. Les fichiers sont ensuite commités par l'Action
 */

const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const { renderCard } = require('./generate-og-card');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY manquante'); process.exit(1); }

const ROOT = path.join(__dirname, '..');
const TODAY = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// ── 1. Récupérer les flux RSS d'actualité ───────────────────────────────
async function fetchRSS(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(''));
    req.setTimeout(8000, () => { req.destroy(); resolve(''); });
  });
}

function extractTitles(rssXml, maxItems = 8) {
  const titles = [];
  const regex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g;
  let m;
  let count = 0;
  while ((m = regex.exec(rssXml)) && count < maxItems) {
    const t = (m[1] || m[2] || '').trim();
    if (t && !t.includes('Google News') && !t.includes('Actualités')) {
      titles.push(t);
      count++;
    }
  }
  return titles;
}

// ── 2. Lire les articles existants ─────────────────────────────────────
function getExistingArticles() {
  const dir = path.join(ROOT, 'questions');
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.html') && f !== 'index.html')
    .map(f => f.replace('.html', ''));
}

// ── 3. Lire le template de référence ──────────────────────────────────
function readTemplate() {
  return fs.readFileSync(
    path.join(ROOT, 'questions', 'comment-est-calculee-la-dette-publique.html'),
    'utf8'
  );
}

function readNavTemplate() {
  const ref = fs.readFileSync(path.join(ROOT, 'dette', 'index.html'), 'utf8');
  const s = ref.indexOf('<nav aria-label="Navigation principale">');
  const e = ref.indexOf('</nav>', s) + 6;
  const navDesktop = ref.slice(s, e);
  const mobS = ref.indexOf('<div class="nav-mobile"');
  const mainS = ref.indexOf('<main', mobS);
  const navMobile = ref.slice(mobS, mainS).trim();
  return { navDesktop, navMobile };
}

// ── 4. Appeler Claude API ──────────────────────────────────────────────
async function callClaude(prompt) {
  const body = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }]
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.content?.[0]?.text || '');
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(280000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

// ── 5. Parser la réponse de Claude ─────────────────────────────────────
function parseClaudeResponse(text) {
  // Claude doit retourner un JSON structuré entre balises ~~~json ... ~~~
  const jsonMatch = text.match(/~~~json\s*([\s\S]+?)\s*~~~/);
  if (!jsonMatch) throw new Error('Réponse Claude non parseable — JSON manquant');
  return JSON.parse(jsonMatch[1]);
}

// ── 6. Mettre à jour questions/index.html ─────────────────────────────
function updateQuestionsIndex(slug, tag, tagClass, title, excerpt, stat) {
  const indexPath = path.join(ROOT, 'questions', 'index.html');
  let content = fs.readFileSync(indexPath, 'utf8');

  const card = `
        <a href="/questions/${slug}" class="faq-card">
          <span class="fc-tag ${tagClass}">${tag}</span>
          <h3>${title}</h3>
          <p>${excerpt}</p>
          <span class="fc-stat ${tagClass}">${stat}</span>
        </a>`;

  // Trouver la bonne section selon le tag et insérer avant </div></section>
  // On insère avant le premier </div>\n    </section> après une section dette/finances
  const sectionEnd = content.lastIndexOf('      </div>\n    </section>\n\n    <!-- FONCTIONNAIRES');
  if (sectionEnd > -1) {
    content = content.slice(0, sectionEnd) + card + '\n' + content.slice(sectionEnd);
  } else {
    // Fallback : insérer avant la fin de la première section
    const firstEnd = content.indexOf('      </div>\n    </section>');
    content = content.slice(0, firstEnd) + card + '\n' + content.slice(firstEnd);
  }

  // Mettre à jour les compteurs
  content = content.replace(
    /Dette &amp; finances publiques — (\d+) articles/,
    (m, n) => `Dette &amp; finances publiques — ${parseInt(n)+1} articles`
  );
  content = content.replace(/(\d+) articles →/g, (m, n) => `${parseInt(n)+1} articles →`);
  content = content.replace(/"(\d+) articles sur/g, (m, n, num) => `"${parseInt(num)+1} articles sur`);

  fs.writeFileSync(indexPath, content, 'utf8');
  console.log('questions/index.html mis à jour');
}

// ── 7. Mettre à jour sitemap.xml ───────────────────────────────────────
function updateSitemap(slug) {
  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  let content = fs.readFileSync(sitemapPath, 'utf8');

  const entry = `
  <url>
    <loc>https://le-francais-moyen.com/questions/${slug}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.80</priority>
  </url>`;

  content = content.replace('</urlset>', entry + '\n\n</urlset>');
  fs.writeFileSync(sitemapPath, content, 'utf8');
  console.log('sitemap.xml mis à jour');
}

// ── MAIN ───────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== Auto-article Le Français Moyen — ${TODAY} ===\n`);

  // 1. Flux RSS
  console.log('Récupération des flux RSS...');
  const [rss1, rss2, rss3] = await Promise.all([
    fetchRSS('https://news.google.com/rss/search?q=finances+publiques+france+deficit+dette&hl=fr&gl=FR&ceid=FR:fr'),
    fetchRSS('https://news.google.com/rss/search?q=INSEE+france+statistiques+economie&hl=fr&gl=FR&ceid=FR:fr'),
    fetchRSS('https://news.google.com/rss/search?q=budget+france+2026+PLF&hl=fr&gl=FR&ceid=FR:fr'),
  ]);

  const headlines = [
    ...extractTitles(rss1, 6),
    ...extractTitles(rss2, 4),
    ...extractTitles(rss3, 4),
  ].filter((v, i, a) => a.indexOf(v) === i); // dédoublonnage

  console.log(`${headlines.length} titres récupérés`);

  // 2. Articles existants
  const existing = getExistingArticles();
  console.log(`${existing.length} articles existants`);

  // 3. Template
  const { navDesktop, navMobile } = readNavTemplate();

  // 4. Appel Claude
  const prompt = `Tu es l'agent de publication du site "Le Français Moyen" (le-francais-moyen.com).
Site spécialisé dans la dette publique française et les finances publiques. Style : factuel, sourcé, engagé.

Date du jour : ${TODAY}

Titres d'actualité récents (Google News) :
${headlines.map((h, i) => `${i+1}. ${h}`).join('\n')}

Articles déjà publiés sur le site (à ne PAS dupliquer) :
${existing.join(', ')}

Ta mission :
1. Parmi les titres, choisis le sujet le plus pertinent pour l'audience du site (citoyens français intéressés par la dette, le déficit, les finances publiques, le pouvoir d'achat).
2. Écris un article HTML complet sur ce sujet.
3. Réponds UNIQUEMENT avec un bloc ~~~json ... ~~~ contenant :

~~~json
{
  "slug": "nom-du-fichier-sans-extension-kebab-case",
  "title": "Titre SEO complet | Le Français Moyen",
  "og_title": "Titre pour réseaux sociaux (court)",
  "description": "Meta description 150 chars max",
  "card_title": "Titre court pour la carte questions/index",
  "card_excerpt": "Description courte 1-2 phrases pour la carte",
  "card_stat": "Chiffre clé principal (ex: 152,5 Md€ de déficit)",
  "card_tag": "Dette",
  "card_tag_class": "tag-dette",
  "source_label": "Source principale",
  "og_headline": "Phrase choc courte pour l'image sociale, 4-6 mots (ex: Le déficit se creuse encore)",
  "og_chiffre": "Le chiffre principal seul, format compact (ex: 152,5 Md€)",
  "og_chiffre_label": "Légende courte sous le chiffre (ex: de déficit public en 2025)",
  "og_accent": "Une couleur parmi : gold, teal, red, purple (rouge pour les sujets négatifs/alarmants, teal pour informatif neutre, gold par défaut)",
  "html_body": "<!-- CONTENU HTML COMPLET ICI (entre <main> et </main>) -->"
}
~~~

IMPORTANT — html_body ne doit contenir QUE le contenu de <main id="contenu">...</main> (hero + sections), strictement RIEN d'autre. Le header, la navigation, le menu mobile et le footer sont déjà gérés par le script qui t'appelle — ne les inclus PAS, ne recopie AUCUN bloc <header> ou <nav> : ça gaspille des tokens et risque de casser la page. Commence directement par <main id="contenu"> et termine par </main>.

Structure attendue à l'intérieur de <main id="contenu">...</main> :
- Un hero avec fil d'Ariane, tag orange, H1 accrocheur, sous-titre
- Un answer-box orange avec la réponse directe (chiffres clés)
- 3-4 KPI cards
- 3-4 sections h2 avec contenu factuel sourcé
- Une FAQ (3 questions/réponses) sur le sujet
- Un bloc sources
- Des related links vers /dette/, et d'autres pages pertinentes du site
- Un CTA compteur dette (bloc rouge standard)

CSS shared :
.q-hero{padding:52px 24px 36px;text-align:center;background:radial-gradient(ellipse at 50% 0%,rgba(251,146,60,.09) 0%,transparent 60%)}
.q-container{max-width:760px;margin:0 auto;padding:0 24px 60px}
.q-section{margin-bottom:40px}.q-section h2{font-size:1.2rem;font-weight:800;margin-bottom:14px;color:var(--text)}.q-section p{color:var(--muted);line-height:1.85;font-size:.97rem;margin-bottom:12px}.q-section strong{color:var(--text)}.q-section ul{padding-left:20px;color:var(--muted);line-height:1.9;font-size:.95rem}.q-section li{margin-bottom:6px}
.answer-box{background:rgba(251,146,60,.06);border:1px solid rgba(251,146,60,.2);border-radius:14px;padding:20px 24px;margin:24px 0}.ab-label{font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#fb923c;margin-bottom:10px}
.kpi-row{display:flex;gap:16px;flex-wrap:wrap;margin:24px 0}.kpi-card{flex:1;min-width:140px;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:12px;padding:16px 18px;text-align:center}.kpi-val{font-size:1.6rem;font-weight:900;color:var(--text)}.kpi-lbl{font-size:.78rem;color:var(--muted);margin-top:4px}
.faq-q{font-size:.97rem;font-weight:700;color:var(--text);margin-bottom:8px}.faq-a{color:var(--muted);font-size:.92rem;line-height:1.7;margin-bottom:24px}
.q-sources{background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:12px;padding:16px 20px;margin-top:36px;font-size:.82rem;color:var(--muted);line-height:1.7}.q-sources strong{color:var(--text);display:block;margin-bottom:6px}
.related{margin-top:40px}.related h3{font-size:.78rem;font-weight:800;margin-bottom:12px;color:var(--muted);letter-spacing:.05em;text-transform:uppercase}.related-links{display:flex;flex-wrap:wrap;gap:10px}.related-link{background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:8px;padding:10px 14px;text-decoration:none;color:var(--muted);font-size:.88rem;transition:all .15s}.related-link:hover{border-color:#555;color:var(--text)}

Qualité requise : au moins 500 mots de contenu utile, sources officielles citées (INSEE, Banque de France, Eurostat, PLF, Cour des comptes). Si aucun sujet récent pertinent n'existe, choisis un sujet evergreen non encore traité.`;

  console.log('Appel Claude API...');
  const response = await callClaude(prompt);

  // 5. Parser la réponse
  let article;
  try {
    article = parseClaudeResponse(response);
  } catch(e) {
    console.error('Erreur parsing réponse Claude:', e.message);
    console.error('Longueur réponse:', response.length, 'caractères');
    console.error('Réponse brute (début):', response.slice(0, 500));
    console.error('Réponse brute (fin):', response.slice(-300));
    process.exit(1);
  }

  const { slug, title, og_title, description, card_title, card_excerpt, card_stat, card_tag, card_tag_class, source_label, og_headline, og_chiffre, og_chiffre_label, og_accent, html_body } = article;

  if (!slug || !html_body) {
    console.error('Données manquantes dans la réponse Claude');
    process.exit(1);
  }

  // 6. Vérifier que l'article n'existe pas déjà
  const articlePath = path.join(ROOT, 'questions', `${slug}.html`);
  if (fs.existsSync(articlePath)) {
    console.log(`Article ${slug} existe déjà — skip`);
    process.exit(0);
  }

  // 6b. Générer l'image OG dédiée à l'article
  let ogImageUrl = 'https://le-francais-moyen.com/assets/img/og-image.png';
  try {
    renderCard({
      slug,
      headline: og_headline || card_title || title,
      chiffre: og_chiffre || card_stat || '',
      chiffreLabel: og_chiffre_label || card_excerpt || '',
      source: source_label || 'Le Français Moyen',
      accent: og_accent || 'gold',
    });
    ogImageUrl = `https://le-francais-moyen.com/assets/img/og/${slug}.png`;
  } catch (e) {
    console.error('Génération image OG échouée, fallback image générique:', e.message);
  }

  // 7. Écrire le fichier HTML complet
  const fullHtml = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="https://le-francais-moyen.com/questions/${slug}">
  <link rel="alternate" hreflang="fr" href="https://le-francais-moyen.com/questions/${slug}">
  <link rel="alternate" hreflang="x-default" href="https://le-francais-moyen.com/questions/${slug}">
  <meta property="og:title" content="${og_title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="https://le-francais-moyen.com/questions/${slug}">
  <meta property="og:image" content="${ogImageUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${ogImageUrl}">
  <link rel="icon" type="image/svg+xml" href="/assets/img/favicon.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/img/apple-touch-icon.png">
  <link rel="stylesheet" href="../assets/css/styles.css?v=22">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Article","headline":"${title.replace(' | Le Français Moyen','')}","description":"${description}","datePublished":"${TODAY}","dateModified":"${TODAY}","author":{"@type":"Organization","name":"Le Français Moyen","url":"https://le-francais-moyen.com"},"publisher":{"@type":"Organization","name":"Le Français Moyen","logo":{"@type":"ImageObject","url":"${ogImageUrl}"}},"mainEntityOfPage":{"@type":"WebPage","@id":"https://le-francais-moyen.com/questions/${slug}"},"inLanguage":"fr-FR"}
  </script>
</head>
<body>
  <a class="skip" href="#contenu">Aller au contenu</a>
  <header>
    <div class="nav">
      <a href="/" class="brand"><span class="logo">FM</span> Le Français Moyen</a>
      ${navDesktop}
      <div class="lang-switch" id="langSwitch">
        <button class="lang-btn active" id="btn-fr" onclick="setLang('fr')">🇫🇷 FR</button>
        <button class="lang-btn" id="btn-en" onclick="setLang('en')">🇬🇧 EN</button>
      </div>
      <button class="nav-toggle" id="navToggle" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="navMobile"><span></span><span></span><span></span></button>
      <a href="/" class="cta" data-i18n="nav_cta">← Tableau de bord</a>
    </div>
  </header>
  ${navMobile}
  ${html_body}
  <script>(function(){var btn=document.getElementById('navToggle');var menu=document.getElementById('navMobile');if(!btn||!menu)return;btn.addEventListener('click',function(){var open=menu.classList.toggle('is-open');btn.setAttribute('aria-expanded',open);document.body.classList.toggle('nav-open',open);});menu.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){menu.classList.remove('is-open');btn.setAttribute('aria-expanded','false');document.body.classList.remove('nav-open');});});document.addEventListener('keydown',function(e){if(e.key==='Escape'&&menu.classList.contains('is-open')){menu.classList.remove('is-open');btn.setAttribute('aria-expanded','false');document.body.classList.remove('nav-open');btn.focus();}});})();</script>
  <script src="/assets/js/nav.js"></script>
</body>
</html>`;

  fs.writeFileSync(articlePath, fullHtml, 'utf8');
  console.log(`Article écrit : questions/${slug}.html (${fullHtml.length} chars)`);

  // 8. Mettre à jour index + sitemap
  updateQuestionsIndex(slug, card_tag, card_tag_class, card_title, card_excerpt, card_stat);
  updateSitemap(slug);

  // 9. Écrire les infos pour le commit message et le partage X
  fs.writeFileSync(
    path.join(ROOT, '_auto_article_info.json'),
    JSON.stringify({
      date: TODAY,
      slug,
      title: card_title,
      source: source_label,
      og_headline: og_headline || card_title,
      og_chiffre: og_chiffre || card_stat || '',
      og_chiffre_label: og_chiffre_label || '',
    })
  );

  console.log('\n✅ Article prêt pour commit:', slug);
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
