# Instagram Analytics — Le Français Moyen

## Structure

```
instagram/
├── analytics/
│   ├── data/                    ← Source de vérité JSON (ne jamais supprimer)
│   │   ├── account_daily.json   ← Stats compte jour par jour
│   │   ├── post_snapshots.json  ← Métriques par post à différents âges
│   │   ├── posts.json           ← Métadonnées éditoriales de chaque post
│   │   ├── experiments.json     ← Tests A/B
│   │   ├── analytics_notes.json ← Notes libres horodatées
│   │   └── gsc_monthly.json     ← Google Search Console (mensuel)
│   ├── backups/                 ← Créés automatiquement à chaque build
│   ├── build_dashboard.py       ← Script de génération
│   └── dashboard.html           ← Dashboard généré (ne pas éditer à la main)
└── content/
    ├── calendar.json            ← Calendrier éditorial
    └── posts/                   ← Fiches contenu Markdown par post
```

---

## Workflow quotidien

### 1. Ajouter les stats du compte (chaque jour)

Ouvrir `analytics/data/account_daily.json` et ajouter une entrée à la fin du tableau :

```json
{
  "date": "2026-09-23",
  "followers_total": 1250,
  "followers_gained": 12,
  "reach_total": 3400,
  "impressions_total": 5800,
  "profile_visits": 180,
  "website_clicks": 22,
  "accounts_reached_followers": null,
  "accounts_reached_non_followers": null
}
```

- `null` = donnée non disponible (ne jamais inventer)
- Ne jamais modifier les entrées passées

---

### 2. Ajouter un snapshot après publication

Ouvrir `analytics/data/post_snapshots.json` et ajouter une entrée :

```json
{
  "post_id": "2026-09-22-dette-par-habitant",
  "captured_at": "2026-09-23T18:35:00+02:00",
  "age_hours": 24,
  "reach": 4200,
  "impressions": 6100,
  "likes": 310,
  "comments": 18,
  "shares": 85,
  "saves": 140,
  "follows": 42,
  "profile_visits": 95,
  "website_clicks": 12,
  "reach_non_followers": 2900,
  "plays": null,
  "three_second_views": null,
  "carousel_last_slide_views": null
}
```

**Âges à capturer :** 1h · 6h · 24h · 48h · 72h · 7j · 14j

- Ne jamais écraser une entrée existante — toujours append
- `plays` / `three_second_views` pour les reels uniquement
- `carousel_last_slide_views` pour les carousels uniquement

---

### 3. Mettre à jour le statut d'un post

Dans `analytics/data/posts.json`, trouver le post par `post_id` et modifier :

```json
"status": "published",
"published_at": "2026-09-22T18:30:00+02:00",
"instagram_url": "https://www.instagram.com/p/XXXXXXXXX/"
```

---

### 4. Régénérer le dashboard

```bash
python instagram/analytics/build_dashboard.py
```

Ouvrir `instagram/analytics/dashboard.html` dans un navigateur (fonctionne sans serveur).

---

## Ajouter un nouveau post

### Étape 1 — Créer la fiche contenu

Créer `instagram/content/posts/YYYY-MM-DD-slug.md` en suivant le modèle des fichiers existants (métadonnées + slides + caption + sources).

### Étape 2 — Ajouter dans posts.json

```json
{
  "post_id": "2026-10-10-nouveau-sujet",
  "title": "Titre du post",
  "status": "planned",
  "published_at": null,
  "instagram_url": null,
  "format": "carousel",
  "pillar": "dette",
  "series": "le-chiffre-du-jour",
  "news_or_evergreen": "evergreen",
  "hook_type": "big_number",
  "cta_type": "save",
  "slide_count": 6,
  "hypothesis": "...",
  "objective": "saves",
  "sources": ["Source 1", "Source 2"],
  "tags": [],
  "notes": null
}
```

### Étape 3 — Ajouter dans calendar.json

```json
{
  "date": "2026-10-10",
  "time": "18:30",
  "post_id": "2026-10-10-nouveau-sujet",
  "format": "carousel",
  "status": "researching"
}
```

Statuts possibles : `idea` → `researching` → `writing` → `ready` → `scheduled` → `published`

---

## Règles fondamentales

1. **JSON = source de vérité.** Ne jamais modifier le dashboard.html directement.
2. **Ne jamais inventer de données.** `null` pour tout ce qui n'est pas mesuré.
3. **Ne jamais écraser un snapshot existant.** Toujours ajouter à la fin.
4. **Snapshot de référence = 72h** (fallback : 24h, puis le plus récent).
5. **Score de performance** : percentile intra-format — un post ne se compare qu'à des posts du même format.
6. **Conclusions** : minimum n=5 posts avant de tirer une conclusion. n<3 = insuffisant.
7. **Likes** : jamais comme KPI principal.

---

## Performance Score

Formule : percentile pondéré par rapport aux posts du même format.

| KPI | Poids |
|-----|-------|
| Follow rate (follows / reach) | 35 % |
| Share rate (shares / reach) | 25 % |
| Save rate (saves / reach) | 20 % |
| Non-follower % (reach_nf / reach) | 10 % |
| Profile visit rate (pv / reach) | 5 % |
| Site reach rate (clicks / reach) | 5 % |

Score 0–100 · 50 = médiane du groupe · <30 = sous-performance · >70 = sur-performance
