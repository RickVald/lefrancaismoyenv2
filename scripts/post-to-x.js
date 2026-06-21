/**
 * Poste automatiquement sur X (Twitter) l'article auto-publié du jour.
 * Lit _auto_article_info.json (écrit par auto-article.js).
 * Nécessite 4 secrets GitHub : X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
 * (clés OAuth 1.0a d'une app X avec permission "Read and Write").
 *
 * Échoue sans bloquer la pipeline si les clés ne sont pas configurées
 * (le partage social est un bonus, pas une condition de publication).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const INFO_PATH = path.join(ROOT, '_auto_article_info.json');

const API_KEY = process.env.X_API_KEY;
const API_SECRET = process.env.X_API_SECRET;
const ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
const ACCESS_SECRET = process.env.X_ACCESS_TOKEN_SECRET;

if (!API_KEY || !API_SECRET || !ACCESS_TOKEN || !ACCESS_SECRET) {
  console.log('Clés X (X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET) manquantes — partage X ignoré.');
  process.exit(0);
}

if (!fs.existsSync(INFO_PATH)) {
  console.log('Aucun _auto_article_info.json trouvé — rien à partager.');
  process.exit(0);
}

const info = JSON.parse(fs.readFileSync(INFO_PATH, 'utf8'));
const articleUrl = `https://le-francais-moyen.com/questions/${info.slug}`;

function buildTweetText() {
  const headline = (info.og_headline || info.title || '').trim();
  let chiffrePart = '';
  if (info.og_chiffre) {
    chiffrePart = info.og_chiffre + (info.og_chiffre_label ? ' ' + info.og_chiffre_label : '');
  }
  let text = headline;
  if (chiffrePart) text += '\n\n' + chiffrePart;
  text += '\n\n' + articleUrl;
  if (text.length > 280) {
    const overflow = text.length - 277;
    text = headline.slice(0, Math.max(0, headline.length - overflow)) + '…' +
      (chiffrePart ? '\n\n' + chiffrePart : '') + '\n\n' + articleUrl;
  }
  return text;
}

// ── OAuth 1.0a signing (HMAC-SHA1) ──────────────────────────────────────────
function pctEncode(s) {
  return encodeURIComponent(s).replace(/[!*'()]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function oauthAuthHeader(method, url) {
  const oauthParams = {
    oauth_consumer_key: API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN,
    oauth_version: '1.0',
  };
  const sortedKeys = Object.keys(oauthParams).sort();
  const paramStr = sortedKeys.map(k => `${pctEncode(k)}=${pctEncode(oauthParams[k])}`).join('&');
  const baseStr = `${method}&${pctEncode(url)}&${pctEncode(paramStr)}`;
  const signingKey = `${pctEncode(API_SECRET)}&${pctEncode(ACCESS_SECRET)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseStr).digest('base64');
  oauthParams.oauth_signature = signature;
  return 'OAuth ' + sortedKeys.concat('oauth_signature').sort()
    .map(k => `${pctEncode(k)}="${pctEncode(oauthParams[k])}"`).join(', ');
}

function postTweet(text) {
  const url = 'https://api.twitter.com/2/tweets';
  const body = JSON.stringify({ text });
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        Authorization: oauthAuthHeader('POST', url),
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        console.log('X API —', res.statusCode, data);
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(data));
        else reject(new Error(`X API error ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const text = buildTweetText();
console.log('Tweet à publier :\n---\n' + text + '\n---');

postTweet(text)
  .then((r) => console.log('✅ Tweet publié, id:', r.data && r.data.id))
  .catch((e) => {
    console.error('Erreur publication X (non bloquant pour la pipeline):', e.message);
    process.exit(0); // ne fait pas échouer le workflow — l'article est déjà publié
  });
