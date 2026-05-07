# Stratégie marketing bas coût — Le Français Moyen

Objectif : devenir la référence des Français qui cherchent des données économiques fiables.
Budget mensuel cible : **0–50 €/mois** (hors temps passé).

---

## 1. SEO organique — priorité absolue

Le SEO est le seul canal avec un ROI illimité dans le temps.

### Actions immédiates (semaine 1-2)
- [ ] Soumettre le sitemap.xml dans Google Search Console
- [ ] Soumettre dans Bing Webmaster Tools
- [ ] Valider les rich results sur https://search.google.com/test/rich-results (FAQPage, Dataset, BreadcrumbList)
- [ ] Vérifier le score PageSpeed Insights > 90 sur mobile
- [ ] Créer une fiche Google Business Profile (type : "Ressource éducative")

### Stratégie de contenu (mois 1-6)
Créer 2 articles/mois ciblant des requêtes à fort volume :

| Requête cible | Volume estimé | Page à créer |
|---|---|---|
| "salaire moyen france 2024" | 40 000/mois | `/questions/salaire-moyen-france.html` |
| "taux chomage france" | 30 000/mois | `/questions/taux-chomage-france.html` |
| "coût de la vie france" | 25 000/mois | `/questions/cout-de-la-vie-france.html` |
| "retraite france age" | 20 000/mois | `/questions/age-retraite-france.html` |
| "impots france classement" | 15 000/mois | `/questions/impots-france-comparaison.html` |
| "pouvoir d'achat 2024" | 35 000/mois | `/questions/pouvoir-achat-evolution.html` |

**Format gagnant pour chaque page :**
1. Réponse directe en 2 phrases (vise le featured snippet Google)
2. 4 chiffres clés visuels (comme les pages existantes)
3. Explication en 4 points numérotés
4. Sources officielles listées
5. 2 questions connexes (maillage interne)
6. Boutons de partage social

---

## 2. Réseaux sociaux — distribution gratuite

### Twitter/X — chaîne principale (objectif : 5 000 abonnés en 6 mois)
**Fréquence :** 3 posts/semaine

**Types de contenu qui performent :**
- **Fil de chiffres** : "🧵 La dette française en 10 chiffres que vous ne connaissez pas" → pointe vers le site
- **Comparaison choc** : "L'Allemagne dépense 49% de son PIB en services publics. La France 57%. Est-ce que ça vaut le coup ? [données]"
- **Actu + données** : chaque annonce gouvernementale = tweet avec les données de contexte du dashboard
- **Réponse à un journaliste** : quand un éditorialiste cite un chiffre, vérifier sur le site et répondre avec la source

**Outils gratuits :** Buffer (10 posts gratuits), TweetDeck pour veille

### LinkedIn — audience professionnelle et relais médias
- 1 post/semaine, format "analyse" de 300 mots avec visuel
- Cibler : journalistes économiques, profs d'économie, élus locaux, chercheurs
- Rejoindre et participer aux groupes : "Économie Française", "Data Journalisme France"

### Reddit — trafic ciblé très qualifié
- Subreddits : r/france, r/finances_perso, r/economie
- **Ne pas spammer** : répondre aux questions avec un lien vers la page pertinente
- Exemple : question "c'est quoi le salaire moyen en France ?" → répondre avec les données + lien vers la page dédiée
- 1-2 posts "standalone" par mois maximum, toujours avec une vraie valeur ajoutée

### Instagram/TikTok (secondaire)
- Créer 1 visuel par semaine à partir de l'OG image (Canva gratuit)
- Format "Saviez-vous que..." avec 1 chiffre choc et source
- Renvoi systématique vers le site dans la bio

---

## 3. Relations presse et partenariats

### Médias à contacter (gratuit, cold outreach)
Envoyer un email court (3 lignes max) à :
- **Fact-checkers** : Les Décodeurs (Le Monde), AFP Factuel, France 24 Observers
- **Journalistes économiques** : @mentions sur Twitter quand ils traitent un sujet couvert par le site
- **Blogs économie** : Alternatives Économiques, The Conversation France, Cairn.info
- **Podcasts** : "Chaleur humaine", "Splash!", "Politique et éco" — proposer une intervention de 10 min sur un chiffre

**Template email presse :**
> Objet: Source de données économiques officielles françaises — lefrancaismoyen.fr
>
> Bonjour [Prénom],
> Je crée lefrancaismoyen.fr, un tableau de bord des données officielles françaises (INSEE, Eurostat, Banque de France) à destination du grand public. Le site met notamment en perspective [sujet de leur dernier article]. 
> Voici la page la plus pertinente pour vous : [URL].
> N'hésitez pas à le citer comme source — les données sont vérifiables directement depuis les APIs officielles.
> Cordialement, [Prénom]

### Partenariats contenu
- **Professeurs d'économie** : proposer d'utiliser le site en classe, en échange d'un lien depuis leur ENT/blog
- **Associations de consommateurs** : UFC-Que Choisir, CLCV — proposer le simulateur fiscal en co-brand
- **Wikimédiens** : contribuer aux articles Wikipedia économiques avec des liens vers le site comme source

---

## 4. SEO technique — points critiques

### Core Web Vitals (à maintenir > 90)
- Images : og-image.png < 100 KB (déjà SVG → PNG optimisé)
- JS/CSS : servis avec `Cache-Control: immutable` via Netlify (déjà configuré)
- Pas de render-blocking resources : CSS en `<link>`, JS en `defer` (déjà en place)

### Netlify Analytics (4 $/mois)
Si le budget le permet, activer Netlify Analytics pour :
- Voir les pages les plus visitées sans cookie (RGPD-friendly)
- Identifier les requêtes 404 (pages manquantes = opportunités SEO)
- Mesurer le trafic sans dépendre de Google Analytics

### Alternatives gratuites
- Plausible.io (gratuit < 10 000 vues/mois) — RGPD-compliant, no-cookie
- Umami self-hosted sur Railway/Render (gratuit)

---

## 5. Automatisation de contenu (zéro coût)

### Twitter automatique après mise à jour des données
Ajouter dans le workflow GitHub Actions :
```yaml
- name: Tweet weekly data update
  if: ${{ secrets.TWITTER_BEARER_TOKEN != '' }}
  run: |
    curl -X POST "https://api.twitter.com/2/tweets" \
      -H "Authorization: Bearer ${{ secrets.TWITTER_BEARER_TOKEN }}" \
      -d '{"text": "📊 Tableau de bord mis à jour — nouvelles données INSEE/Eurostat disponibles ➡ lefrancaismoyen.fr"}'
```

### Newsletter (Brevo gratuit jusqu'à 300 emails/jour)
- Formulaire d'inscription en bas de page (5 lignes de HTML)
- Email automatique chaque lundi avec le "chiffre de la semaine"
- Segmenter : économie générale / fiscalité / démographie

---

## 6. Métriques de succès (KPIs à 6 mois)

| Métrique | Objectif 3 mois | Objectif 6 mois |
|---|---|---|
| Visiteurs organiques/mois | 5 000 | 20 000 |
| Pages indexées Google | 10 | 25 |
| Position moyenne (Search Console) | < 25 | < 15 |
| Abonnés Twitter/X | 500 | 2 000 |
| Backlinks (Ahrefs free check) | 20 | 75 |
| Pages FAQ créées | 5 ✓ | 15 |

---

## 7. Checklist de lancement (J0)

- [ ] Push sur GitHub + deploy Netlify
- [ ] Soumettre sitemap dans Google Search Console
- [ ] Soumettre sitemap dans Bing Webmaster Tools
- [ ] Valider les rich results (FAQPage, Dataset)
- [ ] Créer le compte Twitter/X @lefrancaismoyen
- [ ] Premier tweet de lancement avec l'OG image
- [ ] Post LinkedIn d'annonce
- [ ] Post r/france (format : "J'ai créé un tableau de bord des données officielles françaises…")
- [ ] Configurer Plausible.io ou Umami analytics
- [ ] Activer les alertes Google pour "données économiques france", "pouvoir d'achat france"

---

*Stratégie rédigée le 2026-05-07 — à réviser tous les trimestres selon les performances Search Console.*
