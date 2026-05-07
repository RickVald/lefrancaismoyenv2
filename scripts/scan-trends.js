#!/usr/bin/env node
// Le Français Moyen — Trend Scanner
// Fetches Google Trends FR + media RSS, generates a draft post file
// Runs via GitHub Actions 3x/day (no paid API required)
// Optional: set X_BEARER_TOKEN env var for X API enrichment

const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const SITE_URL = 'https://le-francais-moyen.com';
const DRAFTS_DIR = path.join(__dirname, '..', 'drafts');

const RSS_SOURCES = [
  { name: 'Google Trends FR',    url: 'https://trends.google.com/trends/trendingsearches/daily/rss?geo=FR', type: 'trends' },
  { name: 'Les Echos',           url: 'https://www.lesechos.fr/rss/rss_une.xml',                            type: 'media' },
  { name: 'Le Monde Économie',   url: 'https://www.lemonde.fr/economie/rss_full.xml',                       type: 'media' },
  { name: 'BFM Business',        url: 'https://bfmbusiness.bfmtv.com/rss/info/',                            type: 'media' },
];

// Keywords that match our site's content areas
const TOPIC_MAP = [
  { key: 'dette',       label: 'Dette publique',        url: SITE_URL + '/dette/',       keywords: ['dette', 'déficit', 'budget', 'emprunt', 'remboursement', 'obligataire', 'oat', 'taux d\'intérêt'] },
  { key: 'fiscal',      label: 'Fiscalité',             url: SITE_URL + '/epargne/',     keywords: ['impôt', 'taxe', 'fiscalité', 'tva', 'ir ', 'irs ', 'csg', 'livret', 'épargne', 'flat tax', 'ifi', 'isf'] },
  { key: 'pouvoir',     label: 'Pouvoir d\'achat',      url: SITE_URL + '/#dashboard',   keywords: ['pouvoir d\'achat', 'inflation', 'prix', 'salaire', 'smic', 'coût de la vie', 'énergie', 'carburant', 'loyer'] },
  { key: 'retraites',   label: 'Retraites',             url: SITE_URL + '/projections/', keywords: ['retraite', '64 ans', 'pension', 'cor ', 'cotisation', 'dépendance', 'senior'] },
  { key: 'chomage',     label: 'Emploi / Chômage',      url: SITE_URL + '/#dashboard',   keywords: ['chômage', 'emploi', 'licenciement', 'pôle emploi', 'france travail', 'chômeur', 'temps partiel'] },
  { key: 'europe',      label: 'Comparaison Europe',    url: SITE_URL + '/comparateur/', keywords: ['europe', 'allemagne', 'espagne', 'royaume-uni', 'commission européenne', 'eurostat', 'procédure déficit'] },
  { key: 'elections',   label: 'Politique / Élections', url: SITE_URL + '/elections/',   keywords: ['élection', 'barnier', 'bayrou', 'macron', 'le pen', 'mélenchon', 'assemblée nationale', 'gouvernement', 'budget 2025', 'plf'] },
  { key: 'services',    label: 'Services publics',      url: SITE_URL + '/services/',    keywords: ['hôpital', 'urgences', 'éducation nationale', 'pisa', 'sncf', 'justice', 'fonctionnaire', 'service public'] },
  { key: 'generations', label: 'Générations',           url: SITE_URL + '/generations/', keywords: ['logement', 'primo-accédant', 'génération', 'jeunes', 'déclassement', 'inégalités', 'héritage', 'étudiant'] },
];

// Pre-written tweet angles for each topic
const TWEET_ANGLES = {
  dette:      ['Le chiffre qui fait réfléchir :', 'Pendant ce temps, la dette française :', 'Ce que l\'actu ne dit pas :'],
  fiscal:     ['Impôts : ce que vous ne savez peut-être pas :', 'La fiscalité française en un chiffre :', 'Votre argent après l\'État :'],
  pouvoir:    ['Pouvoir d\'achat, la réalité chiffrée :', 'Ce que l\'inflation vous coûte vraiment :', 'Le chiffre de la semaine :'],
  retraites:  ['Retraites : les projections que personne ne publie :', 'Dans 10 ans, les retraites :', 'Ce que le COR projette vraiment :'],
  chomage:    ['Emploi, le vrai tableau de bord :', 'Chômage : les chiffres dans leur contexte :', 'La réalité du marché du travail :'],
  europe:     ['La France vs ses voisins :', 'Ce que font les autres pays que la France ne fait pas :', 'Comparaison européenne :'],
  elections:  ['Et si l\'élection avait été différente ?', 'Politique et économie : le lien chiffré :', 'Avant de voter, ces chiffres :'],
  services:   ['Ce que vous payez vs ce que vous obtenez :', 'Services publics : état des lieux :', 'La France, les impôts et les résultats :'],
  generations:['Votre génération a-t-elle décroché ?', 'Né en 1990 vs né en 1960 :', 'Le déclassement en chiffres :'],
};

const HASHTAG_MAP = {
  dette:      '#DetteFrance #BudgetFrance #FiscalitéFR #EconomieFrance',
  fiscal:     '#Impôts #FiscalitéFR #EpargneFrance #PouvoirAchat',
  pouvoir:    '#PouvoirAchat #Inflation #FranceMoyen #EconomieFrance',
  retraites:  '#Retraites #France #COR #Budget',
  chomage:    '#Chômage #Emploi #France #EconomieFrance',
  europe:     '#Europe #France #EconomieFrance #Compétitivité',
  elections:  '#France #Politique #Présidentielle #EconomieFrance',
  services:   '#ServicePublic #Hôpital #Education #France',
  generations:'#Logement #Générations #Inégalités #JeunesFrance',
};

// ─── HTTP FETCH ───────────────────────────────────────────────────────────────

function fetchUrl(url, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'LeFrancaisMoyen-TrendBot/1.0' },
      timeout,
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, timeout).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ─── XML PARSER (minimal, no deps) ───────────────────────────────────────────

function parseRSSItems(xml) {
  const items = [];
  const itemMatches = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];

  for (const item of itemMatches.slice(0, 20)) {
    const title   = extractTag(item, 'title');
    const link    = extractTag(item, 'link') || extractTag(item, 'guid');
    const desc    = extractTag(item, 'description');
    const pubDate = extractTag(item, 'pubDate');
    if (title) items.push({ title: cleanText(title), link, desc: cleanText(desc || ''), pubDate });
  }
  return items;
}

function parseGoogleTrends(xml) {
  const items = [];
  // Google Trends RSS has <title> inside <ht:news_item> and main <item> titles
  const titleMatches = xml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g) ||
                       xml.match(/<title>(.*?)<\/title>/g) || [];
  for (const m of titleMatches.slice(0, 15)) {
    const t = m.replace(/<[^>]+>/g, '').replace(/CDATA\[|\]\]/g, '').trim();
    if (t && t.length > 3) items.push({ title: t, link: '', desc: '' });
  }
  return items;
}

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i')) ||
            xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}

function cleanText(t) {
  return t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}

// ─── TOPIC MATCHER ────────────────────────────────────────────────────────────

function matchTopic(text) {
  const lower = (text || '').toLowerCase();
  const scores = {};
  for (const topic of TOPIC_MAP) {
    let score = 0;
    for (const kw of topic.keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > 0) scores[topic.key] = (scores[topic.key] || 0) + score;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best ? TOPIC_MAP.find(t => t.key === best[0]) : null;
}

// ─── DRAFT GENERATOR ─────────────────────────────────────────────────────────

function pickAngle(topicKey) {
  const angles = TWEET_ANGLES[topicKey] || ['Chiffre à retenir :'];
  return angles[Math.floor(Math.random() * angles.length)];
}

function generateDraft(item, topic, source) {
  const angle = pickAngle(topic.key);
  const hashtags = HASHTAG_MAP[topic.key] || '#EconomieFrance #France';

  return `
### 📰 Source : ${item.title}
> *Via ${source}*

**Angle X/Twitter :**
\`\`\`
${angle}

[COMPLÉTEZ avec le chiffre clé de l'article]

👉 Retrouvez le contexte complet et les données officielles :
${topic.url}

${hashtags}
\`\`\`

**Angle LinkedIn :**
\`\`\`
[TITRE ACCROCHEUR — reprendre le chiffre principal]

[2-3 phrases de contexte avec les données de notre site]

Un outil pour visualiser cela en détail :
${topic.url}

${hashtags}
\`\`\`

**Outils LFM associés :** [${topic.label}](${topic.url})

---`;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(DRAFTS_DIR)) fs.mkdirSync(DRAFTS_DIR, { recursive: true });

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const hourStr = String(now.getUTCHours()).padStart(2, '0') + 'h';
  const filename = `scan-${dateStr}-${hourStr}.md`;
  const filepath = path.join(DRAFTS_DIR, filename);

  console.log(`🔍 Scanning trends at ${dateStr} ${hourStr}...`);

  const allItems = [];

  for (const source of RSS_SOURCES) {
    try {
      console.log(`  Fetching ${source.name}...`);
      const xml = await fetchUrl(source.url);
      const items = source.type === 'trends'
        ? parseGoogleTrends(xml)
        : parseRSSItems(xml);
      for (const item of items) {
        allItems.push({ ...item, source: source.name });
      }
      console.log(`  ✓ ${items.length} items`);
    } catch (e) {
      console.warn(`  ✗ ${source.name}: ${e.message}`);
    }
  }

  // Match to topics
  const matched = [];
  for (const item of allItems) {
    const topic = matchTopic(item.title + ' ' + item.desc);
    if (topic) matched.push({ item, topic });
  }

  // Deduplicate by topic (keep best match per topic)
  const seen = new Set();
  const deduped = matched.filter(({ topic }) => {
    if (seen.has(topic.key)) return false;
    seen.add(topic.key);
    return true;
  });

  console.log(`\n📊 ${allItems.length} articles scannés, ${deduped.length} opportunités de post trouvées.\n`);

  // Build output
  let md = `# Scan de tendances — ${dateStr} à ${hourStr} (Paris)\n\n`;
  md += `> Généré automatiquement par Le Français Moyen · ${allItems.length} articles analysés depuis ${RSS_SOURCES.length} sources.\n\n`;

  if (deduped.length === 0) {
    md += `_Aucune correspondance forte avec les thématiques du site cette heure-ci. Réessayez à la prochaine plage horaire._\n`;
  } else {
    md += `## 🎯 ${deduped.length} opportunité(s) de publication\n\n`;
    md += `> **Mode d'emploi :** Lisez l'article source, choisissez un draft, complétez les [CROCHETS], ajoutez le chiffre clé et taguez les comptes pertinents.\n\n`;
    for (const { item, topic } of deduped) {
      md += generateDraft(item, topic, item.source);
    }
  }

  md += `\n## 📌 Comptes à considérer selon le sujet\n\n`;
  md += `| Sujet | Médias | Comptes éco/politique |\n`;
  md += `|---|---|---|\n`;
  md += `| Dette / Budget | @lesechos @lefigaro @lemonde | Chercher : économiste France, think tank, iFRAP |\n`;
  md += `| Pouvoir d'achat | @BFMBusiness @RTLFrance | Chercher : syndicat conso, UFC Que Choisir |\n`;
  md += `| Retraites / Social | @franceinfo @leparisien | Chercher : @COR_retraites, associations retraités |\n`;
  md += `| Politique | @BFMTV @franceinfo | Chercher : député, sénateur concerné par le sujet |\n`;
  md += `| Comparaison Europe | @EUCouncil @Eurostat | Chercher : euro-économistes, think tanks EU |\n\n`;

  md += `---\n_Prochain scan : dans ~4 heures_\n`;

  fs.writeFileSync(filepath, md, 'utf8');
  console.log(`✅ Draft sauvegardé : drafts/${filename}`);
}

main().catch(e => { console.error(e); process.exit(1); });
