#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_dashboard.py — Génère analytics/dashboard.html depuis les JSON Instagram.

Usage : python build_dashboard.py [--no-backup]

Workflow :
  1. Backup automatique des JSON dans analytics/backups/YYYY-MM-DD_HH-MM/
  2. Lecture et validation des données
  3. Calcul des métriques (taux, Performance Score, dimensions)
  4. Génération d'un dashboard.html autonome (fonctionne en file://)
"""

import json
import os
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

# ── Chemins ───────────────────────────────────────────────────────────────────
BASE     = Path(__file__).parent
DATA     = BASE / "data"
OUTPUT   = BASE / "dashboard.html"
BACKUPS  = BASE / "backups"
CALENDAR = BASE.parent / "content" / "calendar.json"

# ── Poids Performance Score ───────────────────────────────────────────────────
PERF_W = {
    "follow_rate":        0.35,
    "share_rate":         0.25,
    "save_rate":          0.20,
    "non_follower_pct":   0.10,
    "profile_visit_rate": 0.05,
    "site_reach_rate":    0.05,
}

PREFERRED_AGES = [72, 24, 48, 168, 336, 6, 1]

# ── Loaders ───────────────────────────────────────────────────────────────────
def load(fname):
    p = DATA / fname
    if not p.exists():
        print(f"  ⚠  {fname} absent — tableau vide utilisé")
        return []
    with open(p, encoding="utf-8") as f:
        return json.load(f)

def load_calendar():
    if not CALENDAR.exists():
        return []
    with open(CALENDAR, encoding="utf-8") as f:
        return json.load(f)

# ── Backup ────────────────────────────────────────────────────────────────────
def backup():
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M")
    dst = BACKUPS / ts
    dst.mkdir(parents=True, exist_ok=True)
    for f in DATA.glob("*.json"):
        shutil.copy(f, dst / f.name)
    return str(dst)

# ── Math helpers ──────────────────────────────────────────────────────────────
def safe_div(a, b):
    if a is None or b is None or b == 0:
        return None
    return a / b

def median_of(vals):
    vals = [v for v in vals if v is not None]
    if not vals:
        return None
    vals = sorted(vals)
    n = len(vals)
    mid = n // 2
    return (vals[mid - 1] + vals[mid]) / 2 if n % 2 == 0 else vals[mid]

def mean_of(vals):
    vals = [v for v in vals if v is not None]
    return sum(vals) / len(vals) if vals else None

# ── Taux depuis snapshot ───────────────────────────────────────────────────────
def calc_rates(snap):
    r  = snap.get("reach")
    pv = snap.get("profile_visits")
    pl = snap.get("plays")
    return {
        "follow_rate":         safe_div(snap.get("follows"), r),
        "share_rate":          safe_div(snap.get("shares"), r),
        "save_rate":           safe_div(snap.get("saves"), r),
        "comment_rate":        safe_div(snap.get("comments"), r),
        "like_rate":           safe_div(snap.get("likes"), r),
        "profile_visit_rate":  safe_div(pv, r),
        "non_follower_pct":    safe_div(snap.get("reach_non_followers"), r),
        "site_conversion":     safe_div(snap.get("website_clicks"), pv),
        "site_reach_rate":     safe_div(snap.get("website_clicks"), r),
        "three_sec_hold_rate": safe_div(snap.get("three_second_views"), pl),
        "carousel_completion": safe_div(snap.get("carousel_last_slide_views"), r),
    }

# ── Snapshot de référence ─────────────────────────────────────────────────────
def best_snapshot(snaps, preferred=PREFERRED_AGES):
    for age in preferred:
        cands = [s for s in snaps if s.get("age_hours") == age]
        if cands:
            return cands[-1]
    return sorted(snaps, key=lambda x: x.get("age_hours", 0))[-1] if snaps else None

# ── Performance Score (percentile intra-format) ───────────────────────────────
def calc_perf_scores(posts, metrics):
    scores = {}
    formats = set(p.get("format") for p in posts)
    for fmt in formats:
        grp = [p for p in posts if p.get("format") == fmt and metrics.get(p["post_id"])]
        if len(grp) < 2:
            continue
        for post in grp:
            pid  = post["post_id"]
            m    = metrics[pid]
            num  = 0.0
            denom = 0.0
            for kpi, w in PERF_W.items():
                vals = [metrics[p["post_id"]][kpi] for p in grp
                        if metrics.get(p["post_id"]) and metrics[p["post_id"]].get(kpi) is not None]
                my = m.get(kpi)
                if vals and my is not None:
                    rank = sum(1 for v in vals if v <= my) / len(vals)
                    num   += rank * w
                    denom += w
            if denom:
                scores[pid] = round(num / denom * 100, 1)
    return scores

# ── Data Quality ──────────────────────────────────────────────────────────────
def data_quality(posts, snaps_by_post):
    issues = []
    for p in posts:
        pid = p["post_id"]
        if not p.get("hypothesis"):
            issues.append({"type": "missing_hypothesis", "post_id": pid, "sev": "warning"})
        if not p.get("sources"):
            issues.append({"type": "missing_sources",    "post_id": pid, "sev": "warning"})
        if not p.get("objective"):
            issues.append({"type": "missing_objective",  "post_id": pid, "sev": "info"})
        if p.get("status") == "published":
            ages = [s.get("age_hours") for s in snaps_by_post.get(pid, [])]
            if 24 not in ages:
                issues.append({"type": "missing_snapshot_24h", "post_id": pid, "sev": "critical"})
            if 72 not in ages:
                issues.append({"type": "missing_snapshot_72h", "post_id": pid, "sev": "warning"})
    return issues

# ── Analyse par dimension ──────────────────────────────────────────────────────
def dim_stats(posts, metrics, dim):
    result = {}
    vals = set(p.get(dim) for p in posts if p.get(dim))
    for val in vals:
        pids = [p["post_id"] for p in posts if p.get(dim) == val]
        m_list = [metrics[pid] for pid in pids if metrics.get(pid)]
        entry = {"n": len(pids), "n_with_data": len(m_list)}
        for kpi in PERF_W:
            kvals = [m[kpi] for m in m_list if m.get(kpi) is not None]
            entry[kpi + "_median"] = median_of(kvals)
            entry[kpi + "_mean"]   = mean_of(kvals)
            entry[kpi + "_n"]      = len(kvals)
        reach_vals = [m.get("reach") for m in m_list if m.get("reach") is not None]
        entry["reach_median"] = median_of(reach_vals)
        result[val] = entry
    return result

# ── What Works / Doesn't Work ─────────────────────────────────────────────────
def what_works_analysis(dims_data):
    MIN_N = 5
    findings_good  = []
    findings_bad   = []

    for dim, groups in dims_data.items():
        all_medians = {kpi: [] for kpi in PERF_W}
        for val, data in groups.items():
            for kpi in PERF_W:
                v = data.get(kpi + "_median")
                if v is not None:
                    all_medians[kpi].append(v)

        baselines = {kpi: median_of(v) for kpi, v in all_medians.items()}

        for val, data in groups.items():
            n = data.get("n_with_data", 0)
            if n < MIN_N:
                continue
            signal = "fort" if n >= 10 else "modéré" if n >= 5 else "faible"
            deltas = {}
            for kpi in ["follow_rate", "share_rate", "save_rate"]:
                m = data.get(kpi + "_median")
                b = baselines.get(kpi)
                if m is not None and b and b != 0:
                    deltas[kpi] = (m - b) / b
            if not deltas:
                continue
            avg_delta = sum(deltas.values()) / len(deltas)
            entry = {"dim": dim, "val": val, "n": n, "signal": signal, "deltas": deltas, "avg_delta": avg_delta}
            if avg_delta > 0.05:
                findings_good.append(entry)
            elif avg_delta < -0.05:
                findings_bad.append(entry)

    findings_good.sort(key=lambda x: -x["avg_delta"])
    findings_bad.sort(key=lambda x: x["avg_delta"])
    return findings_good[:5], findings_bad[:5]

# ── Génération HTML ───────────────────────────────────────────────────────────
def generate_html(payload):
    data_js  = json.dumps(payload, ensure_ascii=False, default=str, indent=2)
    gen_time = payload["generated_at"]
    n_posts  = len(payload.get("posts", []))
    n_snaps  = len(payload.get("snapshots", []))
    n_issues = len(payload.get("quality_issues", []))
    n_pub    = len([p for p in payload.get("posts", []) if p.get("status") == "published"])

    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Instagram Dashboard — Le Français Moyen</title>
<style>
:root {{
  --bg:      #0a0c10;
  --surface: #13161d;
  --card:    #1a1e28;
  --border:  #252932;
  --accent:  #fb923c;
  --green:   #22c55e;
  --red:     #ef4444;
  --blue:    #3b82f6;
  --purple:  #a78bfa;
  --text:    #e8eaf0;
  --muted:   #6b7280;
  --crit:    #ef4444;
  --warn:    #f59e0b;
  --info:    #3b82f6;
}}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.5}}
a{{color:var(--accent);text-decoration:none}}
a:hover{{text-decoration:underline}}

/* Layout */
.header{{background:var(--surface);border-bottom:1px solid var(--border);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}}
.header h1{{font-size:1rem;font-weight:800;color:var(--text)}}
.header .meta{{font-size:.75rem;color:var(--muted)}}
.nav{{background:var(--surface);border-bottom:1px solid var(--border);padding:0 24px;display:flex;gap:0;overflow-x:auto}}
.nav a{{display:block;padding:10px 16px;font-size:.8rem;font-weight:600;color:var(--muted);border-bottom:2px solid transparent;white-space:nowrap;transition:.15s}}
.nav a:hover{{color:var(--text);text-decoration:none}}
.nav a.active{{color:var(--accent);border-bottom-color:var(--accent)}}
.main{{max-width:1400px;margin:0 auto;padding:24px}}
.section{{margin-bottom:48px}}
.section-title{{font-size:1rem;font-weight:800;color:var(--text);margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}}
.section-title .badge{{font-size:.65rem;font-weight:700;padding:2px 8px;border-radius:20px;background:rgba(251,146,60,.15);color:var(--accent)}}

/* Cards / KPIs */
.kpi-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px}}
.kpi{{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px}}
.kpi .label{{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:4px}}
.kpi .value{{font-size:1.5rem;font-weight:900;color:var(--text);font-variant-numeric:tabular-nums}}
.kpi .sub{{font-size:.72rem;color:var(--muted);margin-top:2px}}
.kpi .pos{{color:var(--green)}}
.kpi .neg{{color:var(--red)}}
.kpi .null{{color:var(--muted);font-size:1rem}}

/* Tables */
.table-wrap{{overflow-x:auto;border:1px solid var(--border);border-radius:10px}}
table{{width:100%;border-collapse:collapse;font-size:.8rem}}
thead th{{background:var(--surface);padding:10px 12px;font-weight:700;color:var(--muted);text-align:left;white-space:nowrap;cursor:pointer;user-select:none;border-bottom:1px solid var(--border)}}
thead th:hover{{color:var(--text)}}
thead th.sort-asc::after{{content:" ↑";color:var(--accent)}}
thead th.sort-desc::after{{content:" ↓";color:var(--accent)}}
tbody tr{{border-bottom:1px solid var(--border);transition:.1s}}
tbody tr:last-child{{border-bottom:none}}
tbody tr:hover{{background:rgba(255,255,255,.03)}}
tbody td{{padding:10px 12px;vertical-align:middle}}
.null-cell{{color:var(--muted)}}
.tag{{display:inline-block;font-size:.65rem;font-weight:700;padding:2px 7px;border-radius:20px;background:rgba(255,255,255,.08);color:var(--muted)}}
.tag.carousel{{background:rgba(59,130,246,.15);color:var(--blue)}}
.tag.reel{{background:rgba(167,139,250,.15);color:var(--purple)}}
.tag.single_image{{background:rgba(34,197,94,.15);color:var(--green)}}
.tag.story{{background:rgba(251,146,60,.15);color:var(--accent)}}
.tag.published{{background:rgba(34,197,94,.15);color:var(--green)}}
.tag.planned{{background:rgba(107,114,128,.15);color:var(--muted)}}
.tag.researching{{background:rgba(59,130,246,.15);color:var(--blue)}}
.tag.ready{{background:rgba(251,146,60,.15);color:var(--accent)}}

/* Charts */
.chart-container{{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:20px;margin-bottom:16px}}
.chart-title{{font-size:.8rem;font-weight:700;color:var(--muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:.06em}}
.empty-chart{{display:flex;align-items:center;justify-content:center;height:120px;color:var(--muted);font-size:.82rem;border:1px dashed var(--border);border-radius:8px}}
svg text{{font-family:-apple-system,sans-serif}}

/* Filters */
.filters{{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}}
.filter-select{{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 10px;color:var(--text);font-size:.8rem;cursor:pointer}}
.filter-select:focus{{outline:1px solid var(--accent)}}

/* Leaderboard */
.leader-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}}
.leader-card{{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px}}
.leader-card h4{{font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:12px}}
.leader-item{{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)}}
.leader-item:last-child{{border-bottom:none}}
.leader-rank{{font-size:.7rem;font-weight:900;color:var(--muted);width:18px;text-align:center}}
.leader-rank.r1{{color:var(--accent)}}
.leader-name{{flex:1;font-size:.78rem;color:var(--text)}}
.leader-val{{font-size:.78rem;font-weight:700;color:var(--accent);font-variant-numeric:tabular-nums}}

/* What Works */
.ww-grid{{display:grid;grid-template-columns:1fr 1fr;gap:16px}}
@media(max-width:700px){{.ww-grid{{grid-template-columns:1fr}}}}
.ww-card{{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px}}
.ww-card.good{{border-left:3px solid var(--green)}}
.ww-card.bad{{border-left:3px solid var(--red)}}
.ww-card h4{{font-size:.75rem;font-weight:800;text-transform:uppercase;color:var(--muted);margin-bottom:12px}}
.ww-item{{padding:8px 0;border-bottom:1px solid var(--border);font-size:.8rem}}
.ww-item:last-child{{border-bottom:none}}
.ww-item .dim{{font-weight:700;color:var(--text)}}
.ww-item .signal{{font-size:.65rem;font-weight:700;padding:1px 6px;border-radius:20px;margin-left:6px}}
.ww-item .signal.fort{{background:rgba(34,197,94,.15);color:var(--green)}}
.ww-item .signal.modéré{{background:rgba(245,158,11,.15);color:var(--warn)}}
.ww-item .signal.faible{{background:rgba(107,114,128,.15);color:var(--muted)}}
.ww-item .deltas{{margin-top:4px;font-size:.75rem;color:var(--muted)}}
.empty-state{{background:var(--card);border:1px dashed var(--border);border-radius:10px;padding:24px;text-align:center;color:var(--muted);font-size:.82rem}}
.empty-state .n-rule{{margin-top:8px;font-size:.72rem}}

/* Quality */
.quality-list{{display:flex;flex-direction:column;gap:6px}}
.quality-item{{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;font-size:.8rem}}
.quality-item.critical{{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25)}}
.quality-item.warning{{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25)}}
.quality-item.info{{background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.25)}}
.quality-item .dot{{width:8px;height:8px;border-radius:50%;flex-shrink:0}}
.quality-item.critical .dot{{background:var(--red)}}
.quality-item.warning  .dot{{background:var(--warn)}}
.quality-item.info     .dot{{background:var(--blue)}}
.quality-ok{{color:var(--green);font-size:.82rem;padding:8px 0}}

/* Experiments */
.exp-list{{display:flex;flex-direction:column;gap:12px}}
.exp-card{{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px}}
.exp-card h4{{font-size:.85rem;font-weight:700;color:var(--text);margin-bottom:4px}}
.exp-card .hyp{{font-size:.78rem;color:var(--muted);margin-bottom:10px;font-style:italic}}
.exp-card .meta{{display:flex;gap:12px;font-size:.72rem;color:var(--muted)}}
.exp-status{{display:inline-block;font-size:.65rem;font-weight:700;padding:2px 8px;border-radius:20px}}
.exp-status.running{{background:rgba(34,197,94,.15);color:var(--green)}}
.exp-status.planned{{background:rgba(107,114,128,.15);color:var(--muted)}}
.exp-status.done{{background:rgba(59,130,246,.15);color:var(--blue)}}

/* Calendar */
.cal-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}}
.cal-card{{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px}}
.cal-card .date{{font-size:.72rem;color:var(--muted);margin-bottom:4px}}
.cal-card .title{{font-size:.85rem;font-weight:700;color:var(--text);margin-bottom:8px}}
.cal-card .meta{{display:flex;gap:6px;flex-wrap:wrap}}

/* Score pill */
.score{{display:inline-block;font-size:.72rem;font-weight:800;padding:2px 8px;border-radius:20px;font-variant-numeric:tabular-nums}}
.score.hi{{background:rgba(34,197,94,.15);color:var(--green)}}
.score.md{{background:rgba(245,158,11,.15);color:var(--warn)}}
.score.lo{{background:rgba(239,68,68,.15);color:var(--red)}}
.score.na{{background:rgba(107,114,128,.1);color:var(--muted)}}

/* Dim analysis */
.dim-tabs{{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}}
.dim-tab{{padding:6px 12px;border-radius:8px;border:1px solid var(--border);font-size:.78rem;cursor:pointer;background:var(--surface);color:var(--muted)}}
.dim-tab.active{{background:rgba(251,146,60,.15);border-color:var(--accent);color:var(--accent)}}
.dim-section{{display:none}}
.dim-section.visible{{display:block}}

/* Next actions */
.actions-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}}
.action-card{{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px}}
.action-card h4{{font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px}}
.action-card h4.do-more{{color:var(--green)}}
.action-card h4.test{{color:var(--blue)}}
.action-card h4.reduce{{color:var(--red)}}
.action-card ul{{list-style:none;display:flex;flex-direction:column;gap:6px}}
.action-card li{{font-size:.8rem;color:var(--muted);padding-left:12px;position:relative}}
.action-card li::before{{content:"→";position:absolute;left:0;color:var(--muted)}}
</style>
</head>
<body>
<div class="header">
  <h1>📊 Instagram Dashboard — Le Français Moyen</h1>
  <span class="meta">Généré le {gen_time} · {n_posts} posts · {n_snaps} snapshots · {n_pub} publiés</span>
</div>

<nav class="nav" id="nav">
  <a href="#overview" class="active">Vue d'ensemble</a>
  <a href="#publications">Publications</a>
  <a href="#leaderboard">Leaderboard</a>
  <a href="#analysis">Analyse par dimension</a>
  <a href="#what-works">Ce qui marche</a>
  <a href="#experiments">Expériments</a>
  <a href="#calendar">Calendrier</a>
  <a href="#data-quality">Data Quality <span id="issue-badge" style="display:none;background:var(--red);color:#fff;border-radius:20px;padding:1px 6px;font-size:.65rem;margin-left:4px">{n_issues}</span></a>
</nav>

<div class="main">

<!-- ── OVERVIEW ── -->
<section class="section" id="overview">
  <h2 class="section-title">Vue d'ensemble</h2>
  <div class="kpi-grid" id="kpi-grid"></div>
  <div class="chart-container">
    <div class="chart-title">Followers dans le temps</div>
    <div id="followers-chart"></div>
  </div>
  <div class="chart-container">
    <div class="chart-title">Reach 30 derniers jours</div>
    <div id="reach-chart"></div>
  </div>
</section>

<!-- ── PUBLICATIONS ── -->
<section class="section" id="publications">
  <h2 class="section-title">Publications <span class="badge" id="posts-count"></span></h2>
  <div class="filters" id="filters-row">
    <select class="filter-select" id="f-format" onchange="applyFilters()">
      <option value="">Tous les formats</option>
      <option value="carousel">Carousel</option>
      <option value="reel">Reel</option>
      <option value="single_image">Image</option>
      <option value="story">Story</option>
    </select>
    <select class="filter-select" id="f-pillar" onchange="applyFilters()">
      <option value="">Tous les piliers</option>
      <option value="dette">Dette</option>
      <option value="cout_etat">Coût État</option>
      <option value="pouvoir_achat">Pouvoir d'achat</option>
      <option value="france_vs">France VS</option>
      <option value="programmes_2027">Programmes 2027</option>
    </select>
    <select class="filter-select" id="f-status" onchange="applyFilters()">
      <option value="">Tous les statuts</option>
      <option value="published">Publiés</option>
      <option value="planned">Planifiés</option>
      <option value="ready">Prêts</option>
    </select>
    <select class="filter-select" id="f-evergreen" onchange="applyFilters()">
      <option value="">News + Evergreen</option>
      <option value="evergreen">Evergreen</option>
      <option value="news">News</option>
    </select>
  </div>
  <div class="table-wrap">
    <table id="posts-table">
      <thead>
        <tr>
          <th onclick="sortTable('published_at')" data-col="published_at">Date</th>
          <th onclick="sortTable('title')" data-col="title">Post</th>
          <th onclick="sortTable('format')" data-col="format">Format</th>
          <th onclick="sortTable('pillar')" data-col="pillar">Pilier</th>
          <th onclick="sortTable('series')" data-col="series">Série</th>
          <th onclick="sortTable('reach')" data-col="reach">Reach</th>
          <th onclick="sortTable('non_follower_pct')" data-col="non_follower_pct">Non-abon.</th>
          <th onclick="sortTable('follows')" data-col="follows">Follows</th>
          <th onclick="sortTable('follow_rate')" data-col="follow_rate">Follow rate</th>
          <th onclick="sortTable('shares')" data-col="shares">Shares</th>
          <th onclick="sortTable('share_rate')" data-col="share_rate">Share rate</th>
          <th onclick="sortTable('saves')" data-col="saves">Saves</th>
          <th onclick="sortTable('save_rate')" data-col="save_rate">Save rate</th>
          <th onclick="sortTable('profile_visits')" data-col="profile_visits">Profil</th>
          <th onclick="sortTable('website_clicks')" data-col="website_clicks">Site</th>
          <th onclick="sortTable('perf_score')" data-col="perf_score">Score</th>
        </tr>
      </thead>
      <tbody id="posts-tbody"></tbody>
    </table>
  </div>
  <p style="font-size:.72rem;color:var(--muted);margin-top:8px">* Métriques issues du snapshot de référence (72h si disponible, sinon 24h, sinon le plus récent). <strong>Un post planifié n'a pas encore de métriques.</strong></p>
</section>

<!-- ── LEADERBOARD ── -->
<section class="section" id="leaderboard">
  <h2 class="section-title">Leaderboard <span class="badge">top performers</span></h2>
  <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
    <button class="dim-tab active" onclick="showWindow('24h',this)">24h</button>
    <button class="dim-tab" onclick="showWindow('72h',this)">72h</button>
    <button class="dim-tab" onclick="showWindow('7d',this)">7 jours</button>
  </div>
  <div id="leaderboard-content"></div>
</section>

<!-- ── ANALYSE PAR DIMENSION ── -->
<section class="section" id="analysis">
  <h2 class="section-title">Analyse par dimension</h2>
  <div class="dim-tabs" id="dim-tabs">
    <button class="dim-tab active" onclick="showDim('format',this)">Format</button>
    <button class="dim-tab" onclick="showDim('pillar',this)">Pilier</button>
    <button class="dim-tab" onclick="showDim('series',this)">Série</button>
    <button class="dim-tab" onclick="showDim('hook_type',this)">Hook</button>
    <button class="dim-tab" onclick="showDim('cta_type',this)">CTA</button>
    <button class="dim-tab" onclick="showDim('news_or_evergreen',this)">Nature</button>
  </div>
  <div id="dim-content"></div>
</section>

<!-- ── WHAT WORKS ── -->
<section class="section" id="what-works">
  <h2 class="section-title">Ce qui marche / Ce qui ne marche pas</h2>
  <div id="what-works-content"></div>
</section>

<!-- ── NEXT ACTIONS ── -->
<section class="section" id="next-actions">
  <h2 class="section-title">Prochaines décisions</h2>
  <div class="actions-grid" id="actions-content"></div>
</section>

<!-- ── EXPERIMENTS ── -->
<section class="section" id="experiments">
  <h2 class="section-title">Expériments</h2>
  <div class="exp-list" id="exp-list"></div>
</section>

<!-- ── CALENDRIER ── -->
<section class="section" id="calendar">
  <h2 class="section-title">Calendrier éditorial</h2>
  <div class="cal-grid" id="cal-grid"></div>
</section>

<!-- ── DATA QUALITY ── -->
<section class="section" id="data-quality">
  <h2 class="section-title">Data Quality <span id="dq-badge" style="color:var(--red)"></span></h2>
  <div class="quality-list" id="quality-list"></div>
</section>

</div><!-- /.main -->

<script>
const DATA = {data_js};

// ── Helpers ──────────────────────────────────────────────────────────────────
function pct(v, decimals=2) {{
  if (v === null || v === undefined) return null;
  return (v * 100).toFixed(decimals) + ' %';
}}
function fmt(v, decimals=0) {{
  if (v === null || v === undefined) return '—';
  return typeof v === 'number' ? v.toLocaleString('fr-FR', {{maximumFractionDigits:decimals}}) : v;
}}
function fmtPct(v) {{
  if (v === null || v === undefined) return '—';
  return (v * 100).toFixed(2) + ' %';
}}
function fmtDate(s) {{
  if (!s) return '—';
  return s.split('T')[0];
}}
function cell(v, fmtFn) {{
  if (v === null || v === undefined) return '<td class="null-cell">—</td>';
  return '<td>' + (fmtFn ? fmtFn(v) : v) + '</td>';
}}

// ── Nav active state ──────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {{
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav a');
  let current = '';
  sections.forEach(s => {{
    if (window.scrollY >= s.offsetTop - 80) current = s.id;
  }});
  navLinks.forEach(a => {{
    a.classList.toggle('active', a.getAttribute('href') === '#' + current);
  }});
}});

// ── SVG Line Chart ─────────────────────────────────────────────────────────
function svgLineChart(container, data, xKey, yKey, options={{}} ) {{
  if (!data || !data.length || !data.some(d => d[yKey] !== null)) {{
    container.innerHTML = '<div class="empty-chart">Pas encore de données — renseigner account_daily.json</div>';
    return;
  }}
  const W = 760, H = 160, PAD = {{t:12, r:20, b:30, l:50}};
  const pts = data.filter(d => d[yKey] !== null);
  const xs = pts.map((_,i) => i);
  const ys = pts.map(d => d[yKey]);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeY = maxY - minY || 1;
  const toX = i => PAD.l + i / Math.max(xs.length-1, 1) * (W - PAD.l - PAD.r);
  const toY = v => PAD.t + (1 - (v - minY) / rangeY) * (H - PAD.t - PAD.b);

  const pathD = pts.map((p,i) => (i===0?'M':'L') + toX(i).toFixed(1)+','+toY(ys[i]).toFixed(1)).join(' ');
  const areaD = pathD + ` L${{toX(pts.length-1).toFixed(1)}},${{(H-PAD.b).toFixed(1)}} L${{toX(0).toFixed(1)}},${{(H-PAD.b).toFixed(1)}} Z`;

  // Labels
  const labels = pts.map((p,i) => {{
    const step = Math.max(1, Math.floor(pts.length / 6));
    return i % step === 0 ? `<text x="${{toX(i).toFixed(1)}}" y="${{H-4}}" text-anchor="middle" fill="#6b7280" font-size="10">${{p[xKey].slice(5)}}</text>` : '';
  }}).join('');
  const yLabels = [minY, (minY+maxY)/2, maxY].map(v =>
    `<text x="${{PAD.l-4}}" y="${{toY(v).toFixed(1)}}" text-anchor="end" dominant-baseline="middle" fill="#6b7280" font-size="10">${{Math.round(v).toLocaleString('fr-FR')}}</text>`
  ).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${{W}} ${{H}}" style="width:100%;height:auto">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fb923c" stop-opacity=".25"/>
          <stop offset="100%" stop-color="#fb923c" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${{areaD}}" fill="url(#lg)"/>
      <path d="${{pathD}}" fill="none" stroke="#fb923c" stroke-width="2"/>
      ${{pts.map((_,i) => `<circle cx="${{toX(i).toFixed(1)}}" cy="${{toY(ys[i]).toFixed(1)}}" r="3" fill="#fb923c"/>`).join('')}}
      ${{labels}}${{yLabels}}
    </svg>`;
}}

// ── KPI Overview ──────────────────────────────────────────────────────────────
function renderOverview() {{
  const daily = DATA.daily || [];
  const posts = DATA.posts || [];
  const n7 = daily.slice(-7);
  const n30 = daily.slice(-30);

  const latest = daily.length ? daily[daily.length-1] : null;
  const followers = latest?.followers_total ?? null;
  const reach7  = n7.reduce((a,d) => a + (d.reach_total ?? 0), 0) || null;
  const reach30  = n30.reduce((a,d) => a + (d.reach_total ?? 0), 0) || null;
  const fgained7 = n7.reduce((a,d) => a + (d.followers_gained ?? 0), 0) || null;
  const fgained30= n30.reduce((a,d) => a + (d.followers_gained ?? 0), 0) || null;
  const clicks7  = n7.reduce((a,d) => a + (d.website_clicks ?? 0), 0) || null;
  const nPub     = posts.filter(p => p.status === 'published').length;
  const nPlanned = posts.filter(p => p.status !== 'published').length;

  const nullKpi = v => v === null ? '<span class="null">—</span>' : fmt(v);

  document.getElementById('kpi-grid').innerHTML = `
    <div class="kpi"><div class="label">Followers</div><div class="value">${{nullKpi(followers)}}</div><div class="sub">total actuel</div></div>
    <div class="kpi"><div class="label">Followers +7j</div><div class="value">${{nullKpi(fgained7)}}</div><div class="sub">abonnés gagnés</div></div>
    <div class="kpi"><div class="label">Followers +30j</div><div class="value">${{nullKpi(fgained30)}}</div><div class="sub">abonnés gagnés</div></div>
    <div class="kpi"><div class="label">Reach 7j</div><div class="value">${{nullKpi(reach7)}}</div><div class="sub">comptes atteints</div></div>
    <div class="kpi"><div class="label">Reach 30j</div><div class="value">${{nullKpi(reach30)}}</div><div class="sub">comptes atteints</div></div>
    <div class="kpi"><div class="label">Clics site 7j</div><div class="value">${{nullKpi(clicks7)}}</div><div class="sub">visites depuis profil</div></div>
    <div class="kpi"><div class="label">Publiés</div><div class="value">${{nPub}}</div><div class="sub">posts live</div></div>
    <div class="kpi"><div class="label">En préparation</div><div class="value">${{nPlanned}}</div><div class="sub">planifiés</div></div>
  `;

  // Issue badge
  if ((DATA.quality_issues||[]).length > 0) {{
    document.getElementById('issue-badge').style.display = 'inline';
  }}

  svgLineChart(document.getElementById('followers-chart'), daily, 'date', 'followers_total', {{}});
  svgLineChart(document.getElementById('reach-chart'), daily, 'date', 'reach_total', {{}});
}}

// ── Posts table ───────────────────────────────────────────────────────────────
let sortCol = 'published_at', sortDir = -1;
let filteredPosts = [];

function buildPostRow(post) {{
  const m  = DATA.post_metrics?.[post.post_id];
  const sc = DATA.perf_scores?.[post.post_id] ?? null;
  const scorePill = sc === null
    ? '<span class="score na">—</span>'
    : `<span class="score ${{sc>=70?'hi':sc>=40?'md':'lo'}}">${{sc.toFixed(0)}}</span>`;
  const statusTag = `<span class="tag ${{post.status||''}}">${{post.status||'—'}}</span>`;
  const fmtTag    = `<span class="tag ${{post.format||''}}">${{post.format||'—'}}</span>`;

  return `<tr>
    <td>${{fmtDate(post.published_at)}} ${{statusTag}}</td>
    <td style="max-width:180px"><div style="font-weight:700;color:var(--text)">${{post.title||'—'}}</div><div style="font-size:.7rem;color:var(--muted)">${{post.post_id}}</div></td>
    <td>${{fmtTag}}</td>
    <td>${{post.pillar||'—'}}</td>
    <td>${{post.series||'—'}}</td>
    ${{cell(m?.reach, fmt)}}
    ${{cell(m?.non_follower_pct, fmtPct)}}
    ${{cell(m?.follows, fmt)}}
    ${{cell(m?.follow_rate, fmtPct)}}
    ${{cell(m?.shares, fmt)}}
    ${{cell(m?.share_rate, fmtPct)}}
    ${{cell(m?.saves, fmt)}}
    ${{cell(m?.save_rate, fmtPct)}}
    ${{cell(m?.profile_visits, fmt)}}
    ${{cell(m?.website_clicks, fmt)}}
    <td>${{scorePill}}</td>
  </tr>`;
}}

function applyFilters() {{
  const fmt_  = document.getElementById('f-format').value;
  const pil   = document.getElementById('f-pillar').value;
  const sta   = document.getElementById('f-status').value;
  const ne    = document.getElementById('f-evergreen').value;
  filteredPosts = (DATA.posts||[]).filter(p =>
    (!fmt_ || p.format === fmt_) &&
    (!pil  || p.pillar === pil)  &&
    (!sta  || p.status === sta)  &&
    (!ne   || p.news_or_evergreen === ne)
  );
  renderPostsTable();
}}

function sortTable(col) {{
  if (sortCol === col) {{ sortDir *= -1; }} else {{ sortCol = col; sortDir = -1; }}
  document.querySelectorAll('thead th').forEach(th => {{
    th.classList.remove('sort-asc','sort-desc');
    if (th.dataset.col === col) th.classList.add(sortDir === -1 ? 'sort-desc':'sort-asc');
  }});
  renderPostsTable();
}}

function renderPostsTable() {{
  const posts = [...filteredPosts];
  posts.sort((a, b) => {{
    const m = col => {{
      const pm = DATA.post_metrics?.[col.post_id];
      const map = {{
        reach: pm?.reach, follows: pm?.follows, shares: pm?.shares, saves: pm?.saves,
        follow_rate: pm?.follow_rate, share_rate: pm?.share_rate, save_rate: pm?.save_rate,
        non_follower_pct: pm?.non_follower_pct, profile_visits: pm?.profile_visits,
        website_clicks: pm?.website_clicks, perf_score: DATA.perf_scores?.[col.post_id]
      }};
      return map[sortCol] ?? col[sortCol] ?? '';
    }};
    const av = m(a), bv = m(b);
    if (av === null || av === undefined || av === '') return 1;
    if (bv === null || bv === undefined || bv === '') return -1;
    return av < bv ? sortDir : av > bv ? -sortDir : 0;
  }});
  document.getElementById('posts-tbody').innerHTML = posts.map(buildPostRow).join('');
  document.getElementById('posts-count').textContent = posts.length + ' post' + (posts.length > 1 ? 's' : '');
}}

function renderPublications() {{
  filteredPosts = DATA.posts || [];
  renderPostsTable();
}}

// ── Leaderboard ───────────────────────────────────────────────────────────────
let currentWindow = '24h';
function showWindow(w, btn) {{
  currentWindow = w;
  document.querySelectorAll('#leaderboard .dim-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderLeaderboard();
}}

function renderLeaderboard() {{
  const snaps = (DATA.snapshots || []).filter(s => {{
    if (currentWindow === '24h') return s.age_hours === 24;
    if (currentWindow === '72h') return s.age_hours === 72;
    if (currentWindow === '7d')  return s.age_hours === 168;
    return false;
  }});

  if (!snaps.length) {{
    document.getElementById('leaderboard-content').innerHTML =
      `<div class="empty-state">Pas de snapshots à ${{currentWindow}} disponibles.<div class="n-rule">Les classements apparaîtront après publication des premiers posts et saisie des snapshots.</div></div>`;
    return;
  }}

  const kpis = [
    {{ key:'follow_rate', label:'Meilleur follow rate', fn: s => s.follows / s.reach }},
    {{ key:'share_rate',  label:'Meilleur share rate',  fn: s => s.shares  / s.reach }},
    {{ key:'save_rate',   label:'Meilleur save rate',   fn: s => s.saves   / s.reach }},
    {{ key:'non_follower_pct', label:'Reach non-abonnés', fn: s => s.reach_non_followers / s.reach }},
    {{ key:'profile_visit_rate', label:'Visite profil / reach', fn: s => s.profile_visits / s.reach }},
    {{ key:'site_reach_rate', label:'Clics site / reach', fn: s => s.website_clicks / s.reach }},
  ];

  document.getElementById('leaderboard-content').innerHTML = '<div class="leader-grid">' +
    kpis.map(kpi => {{
      const ranked = snaps
        .map(s => ({{ post_id: s.post_id, val: kpi.fn(s) }}))
        .filter(x => x.val !== null && !isNaN(x.val) && isFinite(x.val))
        .sort((a,b) => b.val - a.val)
        .slice(0,5);
      const items = ranked.length
        ? ranked.map((r,i) => {{
            const post = (DATA.posts||[]).find(p => p.post_id === r.post_id);
            return `<div class="leader-item">
              <span class="leader-rank ${{i===0?'r1':''}}">${{i+1}}</span>
              <span class="leader-name">${{post?.title||r.post_id}}</span>
              <span class="leader-val">${{fmtPct(r.val)}}</span>
            </div>`;
          }}).join('')
        : '<div style="color:var(--muted);font-size:.78rem">Pas de données</div>';
      return `<div class="leader-card"><h4>${{kpi.label}}</h4>${{items}}</div>`;
    }}).join('') + '</div>';
}}

// ── Analyse par dimension ─────────────────────────────────────────────────────
let currentDim = 'format';
function showDim(dim, btn) {{
  currentDim = dim;
  document.querySelectorAll('.dim-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderDimAnalysis();
}}

function renderDimAnalysis() {{
  const dims = DATA.dims || {{}};
  const groups = dims[currentDim] || {{}};
  const entries = Object.entries(groups);

  if (!entries.length) {{
    document.getElementById('dim-content').innerHTML = '<div class="empty-state">Pas encore de données.</div>';
    return;
  }}

  const MIN_N = 3;
  const rows = entries.map(([val, data]) => {{
    const n = data.n || 0;
    const nData = data.n_with_data || 0;
    const insuff = nData < MIN_N;
    const na = v => v !== null && v !== undefined ? fmtPct(v) : '—';
    return `<tr${{insuff?' style="opacity:.5"':''}}>
      <td><strong>${{val}}</strong></td>
      <td>${{n}} <span style="color:var(--muted);font-size:.72rem">(données: ${{nData}})</span></td>
      ${{cell(data.reach_median, v => fmt(v,0))}}
      <td>${{na(data.follow_rate_median)}}</td>
      <td>${{na(data.share_rate_median)}}</td>
      <td>${{na(data.save_rate_median)}}</td>
      <td>${{na(data.non_follower_pct_median)}}</td>
      <td>${{insuff ? '<span style="font-size:.7rem;color:var(--muted)">n<3</span>' : ''}}</td>
    </tr>`;
  }}).join('');

  document.getElementById('dim-content').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>${{currentDim}}</th><th>Posts</th>
          <th>Reach médian</th><th>Follow rate</th><th>Share rate</th>
          <th>Save rate</th><th>Non-abon.</th><th>Signal</th>
        </tr></thead>
        <tbody>${{rows}}</tbody>
      </table>
    </div>
    <p style="font-size:.72rem;color:var(--muted);margin-top:8px">
      Médianes affichées. n &lt; 3 = données insuffisantes (ligne grisée). n ≥ 5 = signal exploitable.
    </p>`;
}}

// ── What Works ─────────────────────────────────────────────────────────────
function renderWhatWorks() {{
  const good = DATA.findings_good || [];
  const bad  = DATA.findings_bad  || [];
  const MIN_N = 5;
  const published = (DATA.posts||[]).filter(p => p.status === 'published').length;

  if (published < MIN_N) {{
    document.getElementById('what-works-content').innerHTML = `
      <div class="empty-state">
        <strong>Données insuffisantes</strong><br>
        ${{published}} post${{published>1?'s':''}} publiés sur ${{MIN_N}} minimum requis pour identifier des tendances.<br>
        <span class="n-rule">Règle : n &lt; 3 = données insuffisantes · n 3–4 = signal faible · n ≥ 5 = début de conclusion · n ≥ 10 = signal robuste</span>
      </div>`;
    return;
  }}

  const renderCard = (items, cls, title) => {{
    if (!items.length) return `<div class="ww-card ${{cls}}"><h4>${{title}}</h4><div style="color:var(--muted);font-size:.8rem">Pas encore de signal clair.</div></div>`;
    return `<div class="ww-card ${{cls}}"><h4>${{title}}</h4>` +
      items.map(f => {{
        const deltas = Object.entries(f.deltas).map(([k,v]) => `${{k.replace('_rate','')}} : ${{(v*100>0?'+':'')}}${{(v*100).toFixed(0)}} %`).join(' · ');
        return `<div class="ww-item">
          <span class="dim">${{f.dim}} : ${{f.val}}</span>
          <span class="signal ${{f.signal}}">${{f.signal}} (n=${{f.n}})</span>
          <div class="deltas">${{deltas}}</div>
        </div>`;
      }}).join('') + '</div>';
  }};

  document.getElementById('what-works-content').innerHTML = `
    <div class="ww-grid">
      ${{renderCard(good, 'good', '✅ Ce qui performe')}}
      ${{renderCard(bad,  'bad',  '⚠️ Ce qui sous-performe')}}
    </div>
    <p style="font-size:.72rem;color:var(--muted);margin-top:12px">
      Comparaison à la médiane globale par KPI. Signal minimum : n ≥ 5.
      Ne jamais conclure sur 1–2 posts.
    </p>`;
}}

// ── Next Actions ──────────────────────────────────────────────────────────────
function renderNextActions() {{
  const published = (DATA.posts||[]).filter(p => p.status === 'published').length;
  const el = document.getElementById('actions-content');

  if (published < 5) {{
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      Les recommandations apparaîtront après publication d'au moins 5 posts.<br>
      <span class="n-rule">Actuellement : ${{published}} post${{published>1?'s':''}} publiés.</span>
    </div>`;
    return;
  }}

  // When enough data: auto-generate from findings
  const good = DATA.findings_good || [];
  const doMore  = good.slice(0,3).map(f => f.dim + ' : ' + f.val);
  const toTest  = (DATA.experiments||[]).filter(e => e.status === 'planned').slice(0,3).map(e => e.name);
  const toReduce= (DATA.findings_bad||[]).slice(0,3).map(f => f.dim + ' : ' + f.val);

  const card = (cls, title, items, fallback) => `
    <div class="action-card">
      <h4 class="${{cls}}">${{title}}</h4>
      ${{items.length
        ? '<ul>' + items.map(i => `<li>${{i}}</li>`).join('') + '</ul>'
        : `<p style="color:var(--muted);font-size:.8rem">${{fallback}}</p>`
      }}
    </div>`;

  el.innerHTML =
    card('do-more', 'À FAIRE DAVANTAGE', doMore, 'Continuer à diversifier les formats.') +
    card('test',    'À TESTER', toTest, 'Lancer les expériments planifiés.') +
    card('reduce',  'À RÉDUIRE', toReduce, 'Pas encore de signal négatif clair.');
}}

// ── Experiments ───────────────────────────────────────────────────────────────
function renderExperiments() {{
  const exps = DATA.experiments || [];
  if (!exps.length) {{
    document.getElementById('exp-list').innerHTML = '<div class="empty-state">Aucun expériment défini.</div>';
    return;
  }}
  document.getElementById('exp-list').innerHTML = exps.map(e => `
    <div class="exp-card">
      <h4>${{e.experiment_id}} — ${{e.name}} <span class="exp-status ${{e.status}}">${{e.status}}</span></h4>
      <div class="hyp">"${{e.hypothesis}}"</div>
      <div class="meta">
        <span>KPI : <strong>${{e.metric_primary}}</strong></span>
        <span>Contrôle : ${{e.posts_control?.length||0}} posts</span>
        <span>Variante : ${{e.posts_variant?.length||0}} posts</span>
        ${{e.result ? `<span style="color:var(--green)">Résultat : ${{e.result}}</span>` : ''}}
      </div>
      ${{e.notes ? `<div style="font-size:.72rem;color:var(--muted);margin-top:8px">${{e.notes}}</div>` : ''}}
    </div>`).join('');
}}

// ── Calendar ──────────────────────────────────────────────────────────────────
function renderCalendar() {{
  const cal   = DATA.calendar || [];
  const posts = DATA.posts || [];
  if (!cal.length) {{
    document.getElementById('cal-grid').innerHTML = '<div class="empty-state">Calendrier vide — éditer content/calendar.json</div>';
    return;
  }}
  const sorted = [...cal].sort((a,b) => a.date < b.date ? -1 : 1);
  document.getElementById('cal-grid').innerHTML = sorted.map(entry => {{
    const post = posts.find(p => p.post_id === entry.post_id);
    return `<div class="cal-card">
      <div class="date">📅 ${{entry.date}} · ${{entry.time||'—'}}</div>
      <div class="title">${{post?.title || entry.post_id}}</div>
      <div class="meta">
        <span class="tag ${{entry.format||''}}">${{entry.format||'—'}}</span>
        <span class="tag ${{entry.status||''}}">${{entry.status||'—'}}</span>
      </div>
    </div>`;
  }}).join('');
}}

// ── Data Quality ──────────────────────────────────────────────────────────────
function renderDataQuality() {{
  const issues = DATA.quality_issues || [];
  const el = document.getElementById('quality-list');
  const badge = document.getElementById('dq-badge');

  const labels = {{
    missing_hypothesis:    'Hypothèse manquante',
    missing_sources:       'Sources manquantes',
    missing_objective:     'Objectif non défini',
    missing_snapshot_24h:  'Snapshot 24h manquant',
    missing_snapshot_72h:  'Snapshot 72h manquant',
  }};

  if (!issues.length) {{
    el.innerHTML = '<div class="quality-ok">✅ Aucun problème détecté.</div>';
    return;
  }}
  badge.textContent = '— ' + issues.length + ' alerte' + (issues.length>1?'s':'');
  el.innerHTML = issues.map(i => `
    <div class="quality-item ${{i.sev}}">
      <div class="dot"></div>
      <div>
        <strong>${{labels[i.type]||i.type}}</strong>
        <span style="color:var(--muted);margin-left:8px;font-size:.75rem">${{i.post_id}}</span>
      </div>
    </div>`).join('');
}}

// ── Init ─────────────────────────────────────────────────────────────────────
(function init() {{
  renderOverview();
  renderPublications();
  renderLeaderboard();
  renderDimAnalysis();
  renderWhatWorks();
  renderNextActions();
  renderExperiments();
  renderCalendar();
  renderDataQuality();
}})();
</script>
</body>
</html>"""


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    no_backup = "--no-backup" in sys.argv
    print("📊 Build Instagram Dashboard — Le Français Moyen")
    print()

    if not no_backup:
        dst = backup()
        print(f"  ✓ Backup : {dst}")

    print("  ← Chargement des données...")
    daily     = load("account_daily.json")
    posts     = load("posts.json")
    snapshots = load("post_snapshots.json")
    exps      = load("experiments.json")
    notes     = load("analytics_notes.json")
    gsc       = load("gsc_monthly.json")
    calendar  = load_calendar()

    # Regrouper les snapshots par post
    snaps_by_post = {}
    for s in snapshots:
        pid = s["post_id"]
        snaps_by_post.setdefault(pid, []).append(s)

    # Métriques par post (snapshot de référence)
    print("  ← Calcul des métriques...")
    post_metrics = {}
    for post in posts:
        pid   = post["post_id"]
        snaps = snaps_by_post.get(pid, [])
        snap  = best_snapshot(snaps)
        if snap:
            rates = calc_rates(snap)
            post_metrics[pid] = {**snap, **rates, "snapshot_age": snap.get("age_hours")}
        # Posts sans snapshot : None (pas de metrics inventées)

    # Performance Score
    perf_scores = calc_perf_scores(posts, post_metrics)

    # Data Quality
    issues = data_quality(posts, snaps_by_post)

    # Analyse par dimension
    dims = {}
    for dim in ["format", "pillar", "series", "hook_type", "cta_type", "news_or_evergreen"]:
        dims[dim] = dim_stats(posts, post_metrics, dim)

    # What Works / Doesn't
    findings_good, findings_bad = what_works_analysis(dims)

    payload = {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "daily":         daily,
        "posts":         posts,
        "snapshots":     snapshots,
        "post_metrics":  post_metrics,
        "perf_scores":   perf_scores,
        "experiments":   exps,
        "calendar":      calendar,
        "quality_issues": issues,
        "dims":          dims,
        "findings_good": findings_good,
        "findings_bad":  findings_bad,
    }

    print("  ← Génération HTML...")
    html = generate_html(payload)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write(html)

    print()
    print(f"  ✅ Dashboard généré : {OUTPUT}")
    print(f"     Posts         : {len(posts)}")
    print(f"     Snapshots     : {len(snapshots)}")
    print(f"     Publiés       : {len([p for p in posts if p.get('status')=='published'])}")
    print(f"     Alertes qualité : {len(issues)}")
    print()
    print("  → Ouvrir analytics/dashboard.html dans un navigateur.")


if __name__ == "__main__":
    main()
