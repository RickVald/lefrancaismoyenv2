/**
 * build-data.js — Fetches official French economic data from Eurostat.
 * Writes data/dashboard-series.json used by the dashboard frontend.
 *
 * Free sources (no API key): Eurostat REST API
 * Run: node scripts/build-data.js
 */

const fs   = require('fs');
const path = require('path');

async function fetchEurostat(fetch, datasetId, params, timeoutMs = 15000) {
  const base = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/';
  const qs   = Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');
  const url  = `${base}${datasetId}?format=JSON&lang=fr&${qs}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res  = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonStat(json) {
  const timeIdx = json.dimension?.time?.category?.index;
  if (!timeIdx) throw new Error('No time dimension in response');
  const pairs = [];
  for (const [t, i] of Object.entries(timeIdx)) {
    const v = json.value?.[String(i)];
    if (v !== undefined && v !== null) {
      pairs.push([t, +Number(v).toFixed(2)]);
    }
  }
  pairs.sort((a, b) => a[0].localeCompare(b[0]));
  return pairs;
}

function annualSeries(pairs) {
  const annual = pairs.filter(([t]) => /^\d{4}$/.test(t) || t.endsWith('-01'));
  return {
    labels: annual.map(([t]) => +t.slice(0, 4)),
    values: annual.map(([, v]) => v),
  };
}

async function main() {
  const { default: fetch } = await import('node-fetch');
  const OUT  = path.join(__dirname, '..', 'data', 'dashboard-series.json');
  const data = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  data.lastUpdated = new Date().toISOString().slice(0, 10);

  // ── Eurostat: HICP food inflation France (CP01) ───────────────────────────
  try {
    const json   = await fetchEurostat(fetch, 'prc_hicp_manr', { geo: 'FR', coicop: 'CP01', unit: 'RCH_A', sinceTimePeriod: '2000-01' });
    const pairs  = parseJsonStat(json);
    const latest = pairs.at(-1);
    if (latest) {
      data.kpis.foodInflation = latest[1];
      console.log(`✓ Eurostat HICP food: latest ${latest[0]} = ${latest[1]}%`);
    }
    const series = annualSeries(pairs);
    if (series.labels.length > 0) {
      data.charts.foodInflation = series;
      console.log(`  → ${series.labels.length} annual points`);
    }
  } catch (e) {
    console.warn('⚠ Eurostat HICP food failed:', e.message);
  }

  // ── Eurostat: HICP general inflation France (CP00) ───────────────────────
  try {
    const json   = await fetchEurostat(fetch, 'prc_hicp_manr', { geo: 'FR', coicop: 'CP00', unit: 'RCH_A', sinceTimePeriod: '2000-01' });
    const pairs  = parseJsonStat(json);
    const series = annualSeries(pairs);
    if (series.labels.length > 0) {
      data.charts.inflation = series;
      console.log(`✓ Eurostat HICP general: ${series.labels.length} annual points`);
    }
  } catch (e) {
    console.warn('⚠ Eurostat HICP general failed:', e.message);
  }

  // ── Eurostat: Government gross debt % GDP (France) ───────────────────────
  try {
    const json   = await fetchEurostat(fetch, 'gov_10dd_edpt1', { geo: 'FR', na_item: 'GD', unit: 'PC_GDP', sector: 'S13', sinceTimePeriod: '2000' });
    const pairs  = parseJsonStat(json);
    const latest = pairs.at(-1);
    if (latest) {
      data.kpis.debtPctGdp = latest[1];
      console.log(`✓ Eurostat Debt/GDP: latest ${latest[0]} = ${latest[1]}%`);
    }
    if (pairs.length > 0) {
      data.charts.debtPctGdp = { labels: pairs.map(([t]) => +t), values: pairs.map(([, v]) => v) };
      console.log(`  → ${pairs.length} points`);
    }
  } catch (e) {
    console.warn('⚠ Eurostat Debt/GDP failed:', e.message);
  }

  // ── Eurostat: Real GDP growth France ─────────────────────────────────────
  try {
    const json   = await fetchEurostat(fetch, 'nama_10_gdp', { geo: 'FR', na_item: 'B1GQ', unit: 'CLV_PCH_PRE', sinceTimePeriod: '2000' });
    const pairs  = parseJsonStat(json);
    if (pairs.length > 0) {
      data.charts.gdpGrowth = { labels: pairs.map(([t]) => +t), values: pairs.map(([, v]) => v) };
      console.log(`✓ Eurostat GDP growth: ${pairs.length} points, latest ${pairs.at(-1)[0]} = ${pairs.at(-1)[1]}%`);
    }
  } catch (e) {
    console.warn('⚠ Eurostat GDP growth failed:', e.message);
  }

  // ── World Bank API — GDP per capita France (current USD) ─────────────────
  try {
    const url = 'https://api.worldbank.org/v2/country/FR/indicator/NY.GDP.PCAP.CD?format=json&mrv=10&per_page=10';
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const rows = (json[1] || []).filter(r => r.value !== null).sort((a, b) => +b.date - +a.date);
    if (rows.length) {
      data.kpis.gdpPerCapitaUsd = Math.round(rows[0].value);
      data.charts.gdpPerCapita = {
        labels: rows.map(r => +r.date).reverse(),
        values: rows.map(r => Math.round(r.value)).reverse(),
      };
      console.log(`✓ World Bank GDP/cap: ${rows[0].date} = $${data.kpis.gdpPerCapitaUsd}`);
    }
  } catch (e) {
    console.warn('⚠ World Bank GDP/cap failed:', e.message);
  }

  // ── World Bank API — Unemployment rate France ─────────────────────────────
  try {
    const url = 'https://api.worldbank.org/v2/country/FR/indicator/SL.UEM.TOTL.ZS?format=json&mrv=10&per_page=10';
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const rows = (json[1] || []).filter(r => r.value !== null).sort((a, b) => +b.date - +a.date);
    if (rows.length) {
      data.kpis.unemploymentRate = +rows[0].value.toFixed(1);
      data.charts.unemployment = {
        labels: rows.map(r => +r.date).reverse(),
        values: rows.map(r => +r.value.toFixed(1)).reverse(),
      };
      console.log(`✓ World Bank unemployment: ${rows[0].date} = ${data.kpis.unemploymentRate}%`);
    }
  } catch (e) {
    console.warn('⚠ World Bank unemployment failed:', e.message);
  }

  // ── World Bank API — Population France ────────────────────────────────────
  try {
    const url = 'https://api.worldbank.org/v2/country/FR/indicator/SP.POP.TOTL?format=json&mrv=5&per_page=5';
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const rows = (json[1] || []).filter(r => r.value !== null).sort((a, b) => +b.date - +a.date);
    if (rows.length) {
      data.kpis.population = Math.round(rows[0].value / 1e6 * 10) / 10;
      console.log(`✓ World Bank population: ${rows[0].date} = ${data.kpis.population}M`);
    }
  } catch (e) {
    console.warn('⚠ World Bank population failed:', e.message);
  }

  // ── INSEE BDM API (requires INSEE_TOKEN) ─────────────────────────────────
  if (process.env.INSEE_TOKEN) {
    console.log('ℹ INSEE_TOKEN found — INSEE integration available (not yet mapped)');
  } else {
    console.log('ℹ INSEE_TOKEN not set — skipping INSEE BDM API');
  }

  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  console.log(`\n✅ dashboard-series.json updated → ${data.lastUpdated}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
