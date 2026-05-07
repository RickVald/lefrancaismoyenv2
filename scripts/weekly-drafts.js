#!/usr/bin/env node
// Le Français Moyen — Weekly Drafts Generator
// Runs every Monday 7am UTC via GitHub Actions
// Produces drafts/semaine-YYYY-WXX.md with 7 ready-to-post drafts

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://le-francais-moyen.com';
const DRAFTS_DIR = path.join(__dirname, '..', 'drafts');

// Current data snapshot (updated manually or via build-data)
const DATA = {
  dette_milliards: 3228,
  dette_pib_pct: 113,
  deficit_pct: 6.1,
  dette_per_capita: 47300,
  dette_per_second: 5641,
  inflation_2024: 2.3,
  chomage_pct: 7.3,
  prelevements_pib: 45.3,
  livret_a_rate: 3.0,
  pisa_maths_2022: 474,
  pisa_maths_2003: 511,
  pisa_drop: 37,
  lits_hopitaux_2000: 8.3,
  lits_hopitaux_2024: 5.7,
  lits_hopitaux_drop_pct: 31,
  retraites_pib: 13.8,
  interets_dette: 58,
  dette_vs_de_pib: 63,   // Allemagne dette % PIB
};

function getWeekNumber(d) {
  const date = new Date(d.getTime());
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

function formatMd(n) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace('.', ',') + ' Md€' : n + ' Md€';
}

const now = new Date();
const week = getWeekNumber(now);
const year = now.getUTCFullYear();
const dateStr = now.toISOString().slice(0, 10);

const DRAFTS = [

  {
    id: 1,
    type: 'Chiffre de la semaine',
    emoji: '📊',
    topic: 'Dette publique',
    tool_url: SITE_URL + '/dette/',
    x: `📊 CHIFFRE DE LA SEMAINE

La France emprunte ${DATA.dette_per_second.toLocaleString('fr-FR')} € CHAQUE SECONDE.

${DATA.dette_milliards.toLocaleString('fr-FR')} milliards de dette totale.
${DATA.dette_pib_pct}% du PIB.
${formatMd(DATA.interets_dette)} d'intérêts payés en 2024 — rien qu'en intérêts.

Et le compteur tourne en direct sur notre site ↓

${SITE_URL}/dette/

#DetteFrance #Budget #EconomieFrance #FiscalitéFR`,
    linkedin: `La France emprunte ${DATA.dette_per_second.toLocaleString('fr-FR')} euros chaque seconde.

Ce chiffre est difficile à saisir en abstrait — c'est pourquoi nous l'avons mis en temps réel. Pendant que vous lisez ce post, la dette publique française a encore augmenté.

${DATA.dette_milliards.toLocaleString('fr-FR')} milliards d'euros au total. ${DATA.dette_pib_pct}% du PIB. ${formatMd(DATA.interets_dette)} payés en intérêts en 2024 — une somme qui ne finance aucun service public, aucune infrastructure, aucune prestation sociale.

Le compteur en direct, la comparaison européenne et la trajectoire historique depuis 2000 :
${SITE_URL}/dette/

#DetteFrance #EconomieFrance #FiscalitéFR #Budget`,
  },

  {
    id: 2,
    type: 'Thread d\'analyse',
    emoji: '🧵',
    topic: 'Pouvoir d\'achat & épargne',
    tool_url: SITE_URL + '/epargne/',
    x: `🧵 THREAD — Ce que l'inflation fait vraiment à votre épargne

1/ Le Livret A rapporte 3%. L'inflation 2024 est à ${DATA.inflation_2024}%. Rendement réel : 0.7%. Mais quand l'inflation dépasse 3% (comme en 2022–23), c'est négatif.

2/ Et pour les autres placements ? La fiscalité française prélève entre 17.2% (PEA) et 36.2% (or) sur vos plus-values. Soit une à trois années de gains effacées.

3/ Résultat sur 20 ans : un capital de 10 000€ sur Livret A rapporte moins en pouvoir d'achat réel qu'il y a 20 ans. L'État + l'inflation > la rémunération.

4/ Simulez l'érosion de votre propre épargne ↓
${SITE_URL}/epargne/

#EpargneFrance #LivretA #PouvoirAchat #FiscalitéFR #Inflation`,
    linkedin: `L'ennemi silencieux de l'épargne des Français, c'est la combinaison inflation + fiscalité.

📌 Livret A à ${DATA.inflation_2024 >= 3 ? 'rendement réel négatif' : '0.7% de rendement réel'} — car l'inflation érode ce que le taux nominal construit.

📌 Flat tax à 30% sur les plus-values mobilières — soit 30 centimes prélevés sur chaque euro de gain en dehors du PEA ou du Livret A.

📌 Or imposé à 36.2% — le placement perçu comme "refuge" est aussi le plus taxé.

Sur 20 ans avec un versement mensuel de 200€, l'écart entre le meilleur et le pire placement peut représenter plusieurs dizaines de milliers d'euros. La fiscalité du placement est un sujet que très peu de Français maîtrisent.

Simulateur complet :
${SITE_URL}/epargne/

#EpargneFrance #Fiscalité #PouvoirAchat #Patrimoine`,
  },

  {
    id: 3,
    type: 'Comparaison',
    emoji: '🌍',
    topic: 'France vs Allemagne',
    tool_url: SITE_URL + '/comparateur/',
    x: `🌍 France vs Allemagne, les chiffres qui piquent :

🇫🇷 Dette : ${DATA.dette_pib_pct}% du PIB
🇩🇪 Dette : ${DATA.dette_vs_de_pib}% du PIB

🇫🇷 Prélèvements : ${DATA.prelevements_pib}% du PIB
🇩🇪 Prélèvements : ~41% du PIB

🇫🇷 PISA maths 2022 : ${DATA.pisa_maths_2022}
🇩🇪 PISA maths 2022 : 475 (et en forte progression)

Même point de départ en 1990. Deux trajectoires radicalement différentes. Pourquoi ?

${SITE_URL}/comparateur/

#France #Allemagne #EconomieFrance #Europe #Compétitivité`,
    linkedin: `En 1990, la France et l'Allemagne avaient des niveaux de dette comparables. Aujourd'hui : 113% contre 63% du PIB. L'écart est structurel, pas conjoncturel.

Ce n'est pas qu'une question de "coupes budgétaires allemandes". L'Allemagne a réformé son marché du travail (Hartz IV, 2003), modernisé sa base industrielle et maintenu une règle d'or budgétaire constitutionnelle depuis 2009.

La France, elle, a choisi la consommation publique soutenue par l'endettement — et les résultats sont visibles sur les indicateurs clés : dette, déficit, compétitivité, scores PISA.

Comparaison sur 10 indicateurs entre la France et 5 pays européens :
${SITE_URL}/comparateur/

#France #Allemagne #Europe #EconomieFrance #Réforme`,
  },

  {
    id: 4,
    type: 'Question rhétorique',
    emoji: '❓',
    topic: 'Services publics',
    tool_url: SITE_URL + '/services/',
    x: `❓ La France consacre ${DATA.prelevements_pib}% de son PIB aux prélèvements obligatoires.

C'est plus que la Suède. Plus que l'Allemagne. Plus que la quasi-totalité de l'Europe.

Pourtant :
→ −${DATA.lits_hopitaux_drop_pct}% de lits d'hôpitaux depuis 2000
→ −${DATA.pisa_drop} points PISA en maths depuis 2003
→ 3 057 postes d'enseignants non pourvus en 2024
→ 82% des plaintes classées sans suite

La question n'est pas "combien ?" mais "comment ?"

${SITE_URL}/services/

#ServicePublic #FiscalitéFR #France #Hôpital #Education`,
    linkedin: `Un paradoxe français documenté chiffres à l'appui.

La France prélève ${DATA.prelevements_pib}% de son PIB en impôts et cotisations — le record d'Europe occidentale. Et pourtant :

• Les hôpitaux ont perdu ${DATA.lits_hopitaux_drop_pct}% de leurs lits depuis 2000, malgré des dépenses de santé en hausse de +130%
• Les scores PISA en mathématiques ont baissé de ${DATA.pisa_drop} points depuis 2003 — l'équivalent d'une année scolaire perdue
• 82% des plaintes déposées sont classées sans suite par la justice
• 6 millions de Français n'ont pas de médecin traitant

La question n'est pas de savoir si l'État doit faire plus ou moins — mais pourquoi autant de prélèvements produisent aussi peu de résultats mesurables.

État complet des services publics français :
${SITE_URL}/services/

#France #ServicePublic #Fiscalité #Réforme`,
  },

  {
    id: 5,
    type: 'Mise en contexte historique',
    emoji: '📅',
    topic: 'Timeline / Histoire',
    tool_url: SITE_URL + '/histoire/',
    x: `📅 1973 : dette à 15% du PIB.
2000 : 57%.
2010 : 82%.
2020 : 115%.
2024 : ${DATA.dette_pib_pct}%.

Pas une crise. Une trajectoire.

Les 25 décisions politiques qui expliquent cette courbe :
${SITE_URL}/histoire/

#DetteFrance #France #PolitiqueÉconomique #Histoire`,
    linkedin: `Comment passe-t-on d'une dette à 15% du PIB à 113% en 50 ans ?

Pas par une catastrophe soudaine. Par une accumulation de 25 décisions politiques, chacune justifiée au moment où elle était prise, mais dont l'effet cumulé a produit la situation actuelle.

De la loi de 1973 qui a transformé le financement de l'État, aux 35 heures en 1997, en passant par les nationalisations de 1981, les privatisations de 1986, le "quoi qu'il en coûte" de 2020 et le déficit à 6.1% de 2024 — chaque étape est documentée avec ses indicateurs chiffrés.

Une lecture indispensable pour comprendre le contexte derrière les débats budgétaires d'aujourd'hui :
${SITE_URL}/histoire/

#France #Histoire #EconomieFrance #PolitiqueÉconomique #DetteFrance`,
  },

  {
    id: 6,
    type: 'Simulateur interactif',
    emoji: '🗳',
    topic: 'Élections présidentielles',
    tool_url: SITE_URL + '/elections/',
    x: `🗳 Et si Fillon avait gagné en 2017 ?

Notre simulateur compare :
→ Ce que chaque candidat promettait économiquement
→ Ce qu'il s'est réellement passé sous Macron
→ La pression fiscale comparée de chaque programme

5 élections (2002–2022). 20 candidats. Les résultats surprennent.

${SITE_URL}/elections/

#Présidentielle2022 #Politique #EconomieFrance #FiscalitéFR`,
    linkedin: `Un exercice de contre-factuel économique : que se serait-il passé si un autre candidat avait remporté chacune des 5 dernières élections présidentielles ?

Nous avons modélisé les trajectoires de 20 candidats (2002–2022) sur les indicateurs clés — dette, chômage, croissance, pression fiscale — et comparé aux chiffres réels.

La question n'est pas partisane : c'est une illustration de l'impact que les choix de politique économique ont sur le quotidien des Français, quel que soit le bord politique.

Le simulateur inclut également un comparateur de pression fiscale par programme (charges sociales, IR, TVA, TICPE, impôts indirects) :
${SITE_URL}/elections/

#France #Politique #EconomieFrance #Présidentielle #Fiscalité`,
  },

  {
    id: 7,
    type: 'Génération déclassée',
    emoji: '👶',
    topic: 'Déclassement générationnel',
    tool_url: SITE_URL + '/generations/',
    x: `👶 Né en 1990, vous héritez de :

→ ${DATA.dette_per_capita.toLocaleString('fr-FR')} € de dette publique par tête
→ Un logement 2,7× plus cher qu'en 1990 (en années de salaire)
→ Un chômage structurel à 7–9% depuis votre entrée sur le marché
→ Des retraites que vous financerez mais dont vous profiterez moins

La génération 1960 est la référence. Mesurez l'écart de votre propre génération ↓

${SITE_URL}/generations/

#DéclassementFR #Générations #Logement #JeunesFrance #Inégalités`,
    linkedin: `Le déclassement générationnel en France n'est plus un ressenti — c'est maintenant mesurable avec des données.

Les nés en 1990 cumulent quatre désavantages structurels par rapport aux baby-boomers au même âge :

1. 47 300€ de dette publique par tête héritée (vs ~8 000€ pour les nés en 1960)
2. Immobilier à 2,7× le prix en années de salaire (vs ×1,1 en 1990)
3. Taux de chômage d'entrée sur le marché 3× plus élevé
4. Taux de cotisation retraite en hausse pour financer des pensions déjà engagées

Ce n'est pas une critique de telle ou telle génération — c'est une réalité arithmétique produite par des décisions collectives sur 40 ans.

Mesurer le déclassement de votre génération :
${SITE_URL}/generations/

#Générations #Logement #Inégalités #France #EconomieFrance`,
  },

];

// ─── GENERATE FILE ────────────────────────────────────────────────────────────

if (!fs.existsSync(DRAFTS_DIR)) fs.mkdirSync(DRAFTS_DIR, { recursive: true });

const filename = `semaine-${year}-W${String(week).padStart(2, '0')}.md`;
const filepath = path.join(DRAFTS_DIR, filename);

let md = `# 📬 Drafts de publication — Semaine ${week} / ${year}\n`;
md += `> Généré le ${dateStr} · 7 posts prêts à publier sur X et LinkedIn\n\n`;
md += `## 📋 Résumé\n\n`;
md += `| # | Type | Sujet | Outil |\n|---|---|---|---|\n`;
for (const d of DRAFTS) {
  md += `| ${d.id} | ${d.emoji} ${d.type} | ${d.topic} | [Lien](${d.tool_url}) |\n`;
}
md += `\n---\n\n`;

for (const d of DRAFTS) {
  md += `## ${d.emoji} Post ${d.id} — ${d.type}\n`;
  md += `**Sujet :** ${d.topic} · **Outil associé :** ${d.tool_url}\n\n`;
  md += `### 𝕏 Version Twitter / X\n`;
  md += '```\n' + d.x + '\n```\n\n';
  md += `### 💼 Version LinkedIn\n`;
  md += '```\n' + d.linkedin + '\n```\n\n';
  md += `---\n\n`;
}

md += `## 🏷 Hashtags récurrents à utiliser\n\n`;
md += `\`#EconomieFrance\` \`#FiscalitéFR\` \`#DetteFrance\` \`#PouvoirAchat\` \`#France\` \`#BudgetFrance\`\n\n`;
md += `## 📢 Médias / comptes à mentionner selon le sujet\n\n`;
md += `- **Économie générale :** @lesechos @lefigaro @lemonde @BFMBusiness\n`;
md += `- **Data / infographie :** comptes data journalisme FR (rechercher "dataviz France")\n`;
md += `- **Politique :** député(e) ou ministre concerné par le sujet du post\n`;
md += `- **Think tanks :** @InstitutMontaigne, rechercher OFCE, iFRAP, Terra Nova selon l'angle\n\n`;
md += `---\n_Prochain batch : lundi prochain · Scanner de tendances : 3x/jour dans \`drafts/scan-*.md\`_\n`;

fs.writeFileSync(filepath, md, 'utf8');
console.log(`✅ Drafts générés : drafts/${filename}`);
console.log(`   ${DRAFTS.length} posts prêts (${DRAFTS.length} X + ${DRAFTS.length} LinkedIn)`);
