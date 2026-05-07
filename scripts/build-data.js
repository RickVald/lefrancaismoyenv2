/**
 * build-data.js — Fetches official French economic data and writes
 * data/dashboard-series.json for the dashboard.
 *
 * Free / open sources (no API key required):
 *   • Eurostat REST API  — https://ec.europa.eu/eurostat/api/dissemination
 *
 * Sources requiring registration (add keys to Netlify env vars):
 *   • INSEE BDM API      — https://api.insee.fr  (INSEE_TOKEN)
 *   • Banque de France   — https://webstat.banque-france.fr (BDF_TOKEN)
 *
 * Run locally : node scripts/build-data.js
 * In CI       : called by `npm run build` via netlify.toml
 */

const fs   = require('fs');
const path = require('path');

// node-fetch v3 is ESM — use dynamic import inside async wrapper
async function main() {
  const { default: fetch } = await import('node-fetch');
  const OUT = path.join(__dirname, '..', 'data', 'dashboard-series.json');

  // ── 1. Load current data as fallback ──────────────────────────────────────
  let data = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  data.lastUpdated = new Date().toISOString().slice(0, 10);

  // ── 2. Eurostat: HICP inflation France (prc_hicp_manr) ───────────────────
  try {
    const url = [
      'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_manr',
      '?format=JSON&lang=fr',
      '&geo=FR',
      '&coicop=CP00',          // All items
      '&unit=RCH_A',           // Annual rate of change
      '&sinceTimePeriod=2000-01',
    ].join('');

    const res  = await fetch(url, { timeout: 15000 });
    const json = await res.json();

    const timeKeys = Object.keys(json.dimension.time.category.index)
      .sort()
      .filter(t => /^\d{4}-\d{2}$/.test(t));

    // Keep only annual Jan values (2000–last available) for the chart
    const annualLabels = [];
    const annualValues = [];
    for (const t of timeKeys) {
      if (!t.endsWith('-01')) continue;
      const idx = json.dimension.time.category.index[t];
      const val = json.value[String(idx)];
      if (val !== undefined && val !== null) {
        annualLabels.push(t.slice(0, 4));
        annualValues.push(+val.toFixed(1));
      }
    }

    // Latest 12-month reading
    const lastKey  = timeKeys.at(-1);
    const lastIdx  = json.dimension.time.category.index[lastKey];
    const lastHICP = json.value[String(lastIdx)];

    if (annualLabels.length > 0) {
      // Update inflation series in existing data structure
      const inflSeries = data.series.find(s => s.id === 'inflation');
      if (inflSeries) {
        inflSeries.labels = annualLabels;
        inflSeries.sets[0].values = annualValues;
        inflSeries.lastValue = lastHICP;
      }
      console.log(`✓ Eurostat HICP: ${annualLabels.length} points, latest ${lastKey} = ${lastHICP}%`);
    }
  } catch (e) {
    console.warn('⚠ Eurostat HICP fetch failed:', e.message);
  }

  // ── 3. Eurostat: Government gross debt (gov_10dd_edpt1) ───────────────────
  try {
    const url = [
      'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10dd_edpt1',
      '?format=JSON&lang=fr',
      '&geo=FR',
      '&na_item=GD',           // Gross debt
      '&unit=PC_GDP',          // % of GDP
      '&sector=S13',           // General government
      '&sinceTimePeriod=2000',
    ].join('');

    const res  = await fetch(url, { timeout: 15000 });
    const json = await res.json();

    const timeKeys = Object.keys(json.dimension.time.category.index).sort();
    const labels = [], values = [];
    for (const t of timeKeys) {
      const idx = json.dimension.time.category.index[t];
      const val = json.value[String(idx)];
      if (val !== undefined && val !== null) {
        labels.push(t);
        values.push(+val.toFixed(1));
      }
    }

    const debtSeries = data.series.find(s => s.id === 'state');
    if (debtSeries && labels.length > 0) {
      debtSeries.labels = labels;
      debtSeries.sets[0].values = values;
      console.log(`✓ Eurostat Debt/GDP: ${labels.length} points, latest ${labels.at(-1)} = ${values.at(-1)}%`);
    }

    // Update snapshot KPI
    const debtKPI = data.snapshots.find(s => s.id === 'debt_pct_gdp');
    if (debtKPI && values.length > 0) {
      debtKPI.value = values.at(-1);
      debtKPI.year  = labels.at(-1);
    }
  } catch (e) {
    console.warn('⚠ Eurostat Debt fetch failed:', e.message);
  }

  // ── 4. Eurostat: Real GDP growth (nama_10_gdp) ────────────────────────────
  try {
    const url = [
      'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_gdp',
      '?format=JSON&lang=fr',
      '&geo=FR',
      '&na_item=B1GQ',         // GDP
      '&unit=CLV_PCH_PRE',     // % change on previous year, chain-linked volumes
      '&sinceTimePeriod=2000',
    ].join('');

    const res  = await fetch(url, { timeout: 15000 });
    const json = await res.json();

    const timeKeys = Object.keys(json.dimension.time.category.index).sort();
    const labels = [], values = [];
    for (const t of timeKeys) {
      const idx = json.dimension.time.category.index[t];
      const val = json.value[String(idx)];
      if (val !== undefined && val !== null) {
        labels.push(t);
        values.push(+val.toFixed(1));
      }
    }

    const gdpSeries = data.series.find(s => s.id === 'wealth');
    if (gdpSeries && labels.length > 0) {
      gdpSeries.labels = labels;
      gdpSeries.sets[0].values = values;
      console.log(`✓ Eurostat GDP growth: ${labels.length} points, latest ${labels.at(-1)} = ${values.at(-1)}%`);
    }
  } catch (e) {
    console.warn('⚠ Eurostat GDP fetch failed:', e.message);
  }

  // ── 5. Eurostat: Population + age structure (demo_pjan) ───────────────────
  try {
    const url = [
      'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_pjan',
      '?format=JSON&lang=fr',
      '&geo=FR',
      '&sex=T',
      '&age=TOTAL',
      '&sinceTimePeriod=2000',
    ].join('');

    const res  = await fetch(url, { timeout: 15000 });
    const json = await res.json();

    const timeKeys = Object.keys(json.dimension.time.category.index).sort();
    const labels = [], values = [];
    for (const t of timeKeys) {
      const idx = json.dimension.time.category.index[t];
      const val = json.value[String(idx)];
      if (val !== undefined && val !== null) {
        labels.push(t);
        values.push(Math.round(val / 1000)); // Convert to thousands
      }
    }

    const demoSeries = data.series.find(s => s.id === 'demo');
    if (demoSeries && labels.length > 0) {
      demoSeries.labels = labels;
      demoSeries.sets[0].values = values;
      console.log(`✓ Eurostat Population: ${labels.length} points, latest ${labels.at(-1)} = ${values.at(-1)}k`);
    }
  } catch (e) {
    console.warn('⚠ Eurostat Population fetch failed:', e.message);
  }

  // ── 6. INSEE BDM API (requires INSEE_TOKEN env var) ───────────────────────
  const INSEE_TOKEN = process.env.INSEE_TOKEN;
  if (INSEE_TOKEN) {
    try {
      // IPC — Indice des prix à la consommation, ensemble (series 001759971)
      const url = 'https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/001759971?startPeriod=2000-01&endPeriod=2025-12';
      const res  = await fetch(url, {
        headers: { Authorization: `Bearer ${INSEE_TOKEN}`, Accept: 'application/json' },
        timeout: 15000,
      });
      const json = await res.json();
      // Parse INSEE XML-style JSON response (GenericData format)
      const obs = json?.GenericData?.DataSet?.Series?.Obs || [];
      if (obs.length > 0) {
        console.log(`✓ INSEE IPC: ${obs.length} observations fetched`);
        // TODO: map into data.series structure as needed
      }
    } catch (e) {
      console.warn('⚠ INSEE API fetch failed:', e.message);
    }
  } else {
    console.log('ℹ INSEE_TOKEN not set — skipping INSEE BDM API (set env var to enable)');
  }

  // ── 7. Write output ────────────────────────────────────────────────────────
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  console.log(`\n✅ dashboard-series.json updated → ${data.lastUpdated}`);
}

main().catch(err => {
  console.error('Fatal error in build-data.js:', err);
  process.exit(1);
});
