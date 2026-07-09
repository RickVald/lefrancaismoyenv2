#!/usr/bin/env node
/**
 * Scrape Wikipedia 2027 presidential polls and update data/sondages-2027.json
 * Run: node _scrape_sondages.js
 * Called by: .github/workflows/sondages-refresh.yml
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUT_FILE = path.join(__dirname, 'data', 'sondages-2027.json');
const WIKI_TITLE = "Liste de sondages sur l'élection présidentielle française de 2027";

// Column order in main 1st-round table (after Sondeur, Date, Échantillon)
const COL_MAP = [
  'arthaud', 'melenchon', 'roussel', 'tondelier',
  'glucksmann', 'attal', 'philippe', 'villepin',
  'retailleau', 'dupont_aignan', 'rn_candidate_raw', 'zemmour', 'autre'
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseNum(s) {
  if (!s || s === '—' || s === '-' || s.trim() === '') return null;
  // Extract leading number (e.g. "36Bardella" → 36, "8Hollande (PS)" → 8, "4,5" → 4.5)
  const m = s.match(/^(\d+(?:[,\.]\d+)?)/);
  if (!m) return null;
  return parseFloat(m[1].replace(',', '.'));
}

function extractRnCandidateName(raw) {
  if (!raw) return null;
  // "36Bardella" → "Bardella", "34Le Pen" → "Le Pen"
  const m = raw.match(/^\d+[,.]?\d*(.+)$/);
  return m ? m[1].trim() : null;
}

function parseTableWithRowspan(rows) {
  const grid = [];
  const rsMap = {};
  for (let ri = 0; ri < rows.length; ri++) {
    const gridRow = [];
    let ci = 0, cellIdx = 0;
    while (ci < 30) {
      if (rsMap[ci] && rsMap[ci].rem > 0) {
        gridRow.push(rsMap[ci].val);
        rsMap[ci].rem--;
        ci++;
      } else if (cellIdx < rows[ri].length) {
        const cell = rows[ri][cellIdx];
        gridRow.push(cell.text);
        for (let s = 0; s < cell.colspan; s++) {
          if (cell.rowspan > 1) rsMap[ci + s] = { val: cell.text, rem: cell.rowspan - 1 };
        }
        ci += cell.colspan;
        cellIdx++;
      } else break;
    }
    if (gridRow.length > 3) grid.push(gridRow);
  }
  return grid;
}

function htmlToRows(html) {
  // Minimal HTML table row/cell parser (no cheerio needed)
  const rows = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRe = /<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/gi;
  let rowMatch;
  while ((rowMatch = rowRe.exec(html)) !== null) {
    const cells = [];
    const rowHtml = rowMatch[1];
    let cellMatch;
    while ((cellMatch = cellRe.exec(rowHtml)) !== null) {
      const attrs = cellMatch[1];
      const inner = cellMatch[2]
        .replace(/<[^>]+>/g, '')          // strip tags
        .replace(/\[.*?\]/g, '')           // strip footnotes like [a]
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
      const colspanM = attrs.match(/colspan="?(\d+)"?/);
      const rowspanM = attrs.match(/rowspan="?(\d+)"?/);
      cells.push({
        text: inner,
        colspan: colspanM ? parseInt(colspanM[1]) : 1,
        rowspan: rowspanM ? parseInt(rowspanM[1]) : 1,
      });
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

function parseTables(html) {
  const tables = [];
  const tableRe = /<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
  let m;
  while ((m = tableRe.exec(html)) !== null) {
    tables.push(htmlToRows(m[1]));
  }
  return tables;
}

function extractDateYear(rawDate) {
  // "7-8 juillet" → try to infer year from surrounding context
  // We'll add the year by looking at context — for now assume current or last year
  const months = {
    'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
    'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
    'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
  };
  for (const [fr, num] of Object.entries(months)) {
    if (rawDate.toLowerCase().includes(fr)) {
      // Extract day (last number in range)
      const dayM = rawDate.match(/(\d+)\s*[-–]\s*(\d+)/) || rawDate.match(/(\d+)/);
      const day = dayM ? dayM[dayM.length - 1].padStart(2, '0') : '01';
      return { month: num, day };
    }
  }
  return null;
}

function assignYear(polls) {
  // Assign years based on descending order — polls should go newest to oldest
  // Wikipedia table is ordered newest-first within each section
  let currentYear = new Date().getFullYear();
  const result = [];
  let lastMonth = 13; // start higher than any month

  for (const poll of polls) {
    const parts = poll._dateParsed;
    if (!parts) { result.push(poll); continue; }
    const month = parseInt(parts.month);
    // If we go from a low month to a high month, we've gone back a year
    if (month > lastMonth + 2) currentYear--;
    lastMonth = month;
    const date = `${currentYear}-${parts.month}-${parts.day}`;
    result.push({ ...poll, date, _dateParsed: undefined });
  }
  return result;
}

function extractPollsFromGrid(grid, headerSkip, colOffset) {
  const polls = [];
  const seen = new Set();

  for (const row of grid.slice(headerSkip)) {
    const institut = row[0];
    const rawDate  = row[1];
    const rawN     = row[2];

    // Skip non-poll rows (notes, headers, etc.)
    if (!institut || institut.length > 40 || /sondeur|date/i.test(institut)) continue;
    if (!rawDate || rawDate.length > 25) continue;

    const key = `${institut}|${rawDate}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const dateParsed = extractDateYear(rawDate);
    if (!dateParsed) continue;

    const scores = {};
    const startCol = colOffset !== undefined ? colOffset : 3;
    for (let i = 0; i < COL_MAP.length; i++) {
      const val = row[startCol + i];
      if (!val) continue;
      const key2 = COL_MAP[i];
      if (key2 === 'rn_candidate_raw') {
        const num = parseNum(val);
        const name = extractRnCandidateName(val);
        if (num !== null) {
          if (name && name.toLowerCase().includes('le pen')) scores.le_pen = num;
          else if (name && (name.toLowerCase().includes('bardella') || !name)) scores.bardella = num;
          else scores.rn = num;
        }
      } else {
        const num = parseNum(val);
        if (num !== null) scores[key2] = num;
      }
    }

    if (Object.keys(scores).length < 3) continue; // skip incomplete rows

    polls.push({
      _dateParsed: dateParsed,
      institute: institut
        .replace(/\[.*?\]/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
      n: parseNum(rawN) || null,
      scores
    });
  }
  return polls;
}

async function main() {
  console.log('Fetching Wikipedia…');
  const apiUrl = `https://fr.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(WIKI_TITLE)}&prop=text&format=json`;
  const raw = await fetch(apiUrl);
  const json = JSON.parse(raw);
  const html = json.parse?.text?.['*'] || '';

  const tables = parseTables(html);
  console.log(`Found ${tables.length} tables`);

  // Table 0: latest polls (newest, post-candidacy announcements)
  // Table 1: main historical 1st round table
  const latestPolls = extractPollsFromGrid(parseTableWithRowspan(tables[0]), 2, 3);
  const mainPolls   = extractPollsFromGrid(parseTableWithRowspan(tables[1]), 3, 3);

  const allPolls = [...latestPolls, ...mainPolls];
  const withYears = assignYear(allPolls);

  // Merge with existing data (keep manual entries not from Wikipedia)
  let existing = { polls: [] };
  if (fs.existsSync(OUT_FILE)) {
    existing = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
  }

  // Deduplicate by date+institute
  const existingKeys = new Set(existing.polls.map(p => `${p.date}|${p.institute}`));
  const newPolls = withYears.filter(p => !existingKeys.has(`${p.date}|${p.institute}`));

  const merged = [...withYears, ...existing.polls.filter(p => {
    return !withYears.some(np => np.date === p.date && np.institute === p.institute);
  })];

  merged.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const out = {
    ...existing,
    updated: new Date().toISOString().slice(0, 10),
    polls: merged
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log(`✓ Saved ${merged.length} polls (${newPolls.length} new) to ${OUT_FILE}`);
}

main().catch(e => { console.error(e); process.exit(1); });
