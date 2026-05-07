# Déploiement recommandé

## Choix conseillé
GitHub + Netlify.

Pourquoi : très simple pour un site HTML/CSS/JS, gratuit au départ, déploiement automatique à chaque modification, bon pour le SEO statique.

## Étapes
1. Créer un repo GitHub `lefrancaismoyen`.
2. Envoyer tous les fichiers de ce dossier dans le repo.
3. Créer un compte Netlify.
4. New site from Git > choisir le repo.
5. Build command : laisser vide.
6. Publish directory : `/`.
7. Branch : `main`.
8. Ajouter ensuite le domaine `le-francais-moyen.com` dans Domain settings.

## Automatisation future
- Les données sont dans `/data/dashboard-series.json`.
- La note hebdo est dans `/weekly/latest.html`.
- On peut ensuite ajouter un script qui récupère INSEE/Eurostat/World Bank et met à jour le JSON automatiquement.
