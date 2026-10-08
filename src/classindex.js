// NHRA class index tables (Comp Eliminator, Super Stock, Stock, Super
// categories) — the source of truth for which class designations exist.
//
// nhra.com/stats/class_indexes is only a wrapper page: its content is an
// iframe to nhra.net, and each category table lives at its own URL,
// selected by an exact, case-sensitive `class=` value (`class=comp` or
// `class=SuperStock` returns HTTP 500). The bundled snapshot below was
// parsed from those pages (NHRA "Last Update: 10/6/2026"); the Update
// panel's live check re-downloads them (see updater.js).
//
// Each row: [class, 1/4-mile index, 1/8-mile index].

export const NHRA_INDEX_BASE = "https://www.nhra.net/stats/indexes.html";

// category name (as NHRA labels it) -> page + the heading we expect on it
export const NHRA_INDEX_PAGES = [
  { category: "Comp", heading: "Comp Eliminator Indexes", url: NHRA_INDEX_BASE + "?class=Comp" },
  { category: "Super Stock", heading: "Super Stock Indexes", url: NHRA_INDEX_BASE + "?class=Super%20Stock" },
  { category: "Stock", heading: "Stock Indexes", url: NHRA_INDEX_BASE + "?class=Stock" },
  { category: "Super", heading: "Super", url: NHRA_INDEX_BASE + "?class=Super" },
];

// NHRA table category -> TechCardX card category
export const INDEX_CATEGORY_TO_CARD = {
  Comp: "COMP",
  "Super Stock": "SS",
  Stock: "STK",
  Super: null, // Super Comp / Gas / Street run on dial-in limits, no classes
};

export const BUNDLED_CLASS_INDEX = {
  lastUpdate: "2026-10-06",
  source: "https://www.nhra.com/stats/class_indexes",
  categories: {
    "Comp": [
      ["AA/AM", 7.03, 4.49], ["AA/AT", 6.87, 4.39], ["AA/AF", 7.98, 5.08], ["BB/A", 7.89, 5.02],
      ["BB/AM", 7.5, 4.78], ["BB/AT", 7.27, 4.63], ["BB/AF", 8.7, 5.52], ["CC/A", 7.51, 4.78],
      ["CC/AM", 7.35, 4.69], ["CC/AT", 7.66, 4.88], ["DD/A", 7.55, 4.81], ["DD/AT", 7.58, 4.83],
      ["A/PM", 6.57, 4.2], ["AA/PM", 6.63, 4.24], ["H/D", 7.03, 4.49], ["I/D", 7.23, 4.61],
      ["A/D", 7.04, 4.49], ["B/D", 7.27, 4.63], ["C/D", 7.48, 4.76], ["D/D", 7.84, 4.99],
      ["E/D", 8.03, 5.11], ["F/D", 8.59, 5.45], ["G/D", 9.28, 5.88], ["J/D", 8.19, 5.2],
      ["K/D", 8.03, 5.11], ["L/D", 8.95, 5.67], ["A/DA", 7.09, 4.52], ["B/DA", 7.4, 4.71],
      ["C/DA", 7.59, 4.83], ["D/DA", 8.01, 5.09], ["E/DA", 7.98, 5.08], ["F/DA", 8.74, 5.55],
      ["G/DA", 9.91, 6.26], ["J/DA", 8.29, 5.27], ["K/DA", 8.15, 5.18], ["L/DA", 9.0, 5.71],
      ["A/ED", 7.28, 4.64], ["B/ED", 7.48, 4.76], ["C/ED", 7.9, 5.02], ["D/ED", 7.94, 5.05],
      ["E/ED", 8.93, 5.66], ["F/ED", 8.71, 5.53], ["G/ED", 8.5, 5.4], ["A/ND", 7.5, 4.78],
      ["B/ND", 7.51, 4.78], ["PST", 8.04, 5.11], ["B/T", 8.77, 5.56], ["C/T", 8.81, 5.59],
      ["PST/A", 8.26, 5.25], ["B/TA", 8.82, 5.6], ["C/TA", 9.01, 5.71], ["A/AP", 7.23, 4.61],
      ["B/AP", 7.75, 4.93], ["A/A", 7.17, 4.57], ["B/A", 7.65, 4.87], ["C/A", 7.93, 5.04],
      ["D/A", 8.31, 5.28], ["E/A", 8.32, 5.29], ["F/A", 8.63, 5.48], ["G/A", 8.9, 5.64],
      ["H/A", 9.28, 5.88], ["I/A", 8.81, 5.59], ["J/A", 8.34, 5.3], ["K/A", 8.26, 5.25],
      ["L/A", 9.37, 5.94], ["M/A", 8.34, 5.3], ["A/AA", 7.15, 4.56], ["B/AA", 7.55, 4.81],
      ["C/AA", 7.85, 5.0], ["D/AA", 8.18, 5.2], ["E/AA", 8.26, 5.25], ["F/AA", 8.54, 5.42],
      ["G/AA", 8.77, 5.56], ["H/AA", 9.18, 5.82], ["I/AA", 8.68, 5.51], ["J/AA", 8.08, 5.14],
      ["K/AA", 8.12, 5.16], ["L/AA", 9.26, 5.87], ["M/AA", 8.38, 5.32], ["A/EA", 7.91, 5.03],
      ["B/EA", 8.27, 5.26], ["C/EA", 8.7, 5.52], ["D/EA", 8.76, 5.56], ["E/EA", 8.95, 5.67],
      ["F/EA", 8.38, 5.32], ["G/EA", 8.82, 5.6], ["H/EA", 9.48, 6.0], ["A/SR", 8.44, 5.36],
      ["B/SR", 8.4, 5.33], ["C/SR", 9.05, 5.74], ["A/SM", 8.45, 5.37], ["B/SM", 8.66, 5.49],
      ["C/SM", 8.85, 5.62], ["D/SM", 9.04, 5.73], ["E/SM", 9.1, 5.77], ["F/SM", 9.3, 5.89],
      ["G/SM", 9.33, 5.91], ["H/SM", 9.57, 6.06], ["I/SM", 9.56, 6.05], ["AH/SM", 8.95, 5.67],
      ["FS/SM", 8.49, 5.39], ["A/SMA", 8.53, 5.42], ["B/SMA", 8.6, 5.46], ["C/SMA", 8.71, 5.53],
      ["D/SMA", 8.98, 5.69], ["E/SMA", 8.95, 5.67], ["F/SMA", 9.26, 5.87], ["G/SMA", 9.35, 5.92],
      ["H/SMA", 9.47, 5.99], ["I/SMA", 9.58, 6.06], ["A/MP", 8.7, 5.52], ["B/MP", 8.9, 5.64],
      ["C/MP", 9.2, 5.83], ["D/MP", 9.45, 5.98], ["E/MP", 9.7, 6.14], ["A/FX", 7.45, 4.75],
    ],
    "Super Stock": [
      ["SS/AH", 9.45, 6.17], ["SS/A", 9.65, 6.28], ["SS/B", 9.9, 6.44], ["SS/C", 10.05, 6.53],
      ["SS/D", 10.2, 6.62], ["SS/E", 10.25, 6.65], ["SS/F", 10.35, 6.71], ["SS/G", 10.45, 6.77],
      ["SS/H", 10.5, 6.8], ["SS/I", 10.55, 6.83], ["SS/J", 10.8, 6.98], ["SS/K", 11.0, 7.1],
      ["SS/L", 11.25, 7.24], ["SS/M", 11.6, 7.45], ["SS/N", 11.95, 7.65], ["SS/O", 12.2, 7.79],
      ["SS/P", 12.5, 7.97], ["SS/Q", 12.65, 8.05], ["SS/AA", 9.7, 6.32], ["SS/BA", 9.9, 6.44],
      ["SS/CA", 10.05, 6.53], ["SS/DA", 10.2, 6.62], ["SS/EA", 10.35, 6.71], ["SS/FA", 10.45, 6.77],
      ["SS/GA", 10.55, 6.83], ["SS/HA", 10.6, 6.86], ["SS/IA", 10.7, 6.91], ["SS/JA", 11.0, 7.1],
      ["SS/KA", 11.25, 7.24], ["SS/LA", 11.45, 7.36], ["SS/MA", 11.85, 7.6], ["SS/NA", 12.15, 7.76],
      ["SS/OA", 12.3, 7.86], ["SS/PA", 12.65, 8.05], ["SS/QA", 12.8, 8.14], ["SS/AX", 9.7, 6.32],
      ["SS/BX", 10.75, 6.95], ["SS/CX", 11.0, 7.1], ["SS/DX", 9.15, 5.98], ["SS/EX", 10.5, 6.8],
      ["SS/VX", 11.4, 7.32], ["SS/AS", 9.6, 6.26], ["SS/BS", 9.65, 6.28], ["SS/CS", 10.3, 6.68],
      ["SS/DS", 10.75, 6.95], ["SS/ES", 12.15, 7.76], ["SS/FS", 12.45, 7.94], ["SS/GS", 13.65, 8.62],
      ["SS/AM", 9.0, 5.9], ["SS/BM", 9.2, 6.01], ["SS/CM", 9.5, 6.2], ["SS/DM", 9.75, 6.35],
      ["SS/EM", 10.0, 6.5], ["SS/FM", 10.5, 6.8], ["SS/GM", 10.25, 6.65], ["GT/A", 9.6, 6.26],
      ["GT/B", 9.7, 6.32], ["GT/C", 9.8, 6.38], ["GT/D", 9.9, 6.44], ["GT/E", 10.0, 6.5],
      ["GT/F", 10.1, 6.57], ["GT/G", 10.2, 6.62], ["GT/H", 10.35, 6.71], ["GT/I", 10.5, 6.8],
      ["GT/J", 10.6, 6.86], ["GT/K", 10.75, 6.95], ["GT/L", 10.85, 7.01], ["GT/M", 10.95, 7.06],
      ["GT/N", 11.05, 7.13], ["GT/O", 11.1, 7.16], ["GT/P", 11.3, 7.27], ["GT/Q", 11.5, 7.39],
      ["GT/AA", 9.7, 6.32], ["GT/BA", 9.8, 6.38], ["GT/CA", 9.9, 6.44], ["GT/DA", 10.0, 6.5],
      ["GT/EA", 10.1, 6.57], ["GT/FA", 10.25, 6.65], ["GT/GA", 10.4, 6.73], ["GT/HA", 10.5, 6.8],
      ["GT/IA", 10.65, 6.88], ["GT/JA", 10.8, 6.98], ["GT/KA", 10.9, 7.03], ["GT/LA", 11.05, 7.13],
      ["GT/MA", 11.2, 7.21], ["GT/NA", 11.3, 7.27], ["GT/OA", 11.45, 7.36], ["GT/PA", 11.55, 7.42],
      ["GT/QA", 11.75, 7.53], ["SS/TA", 9.9, 6.44], ["SS/TB", 9.9, 6.44], ["SS/TC", 10.5, 6.8],
      ["SS/TD", 11.0, 7.1], ["GT/TA", 10.55, 6.83], ["GT/TB", 10.85, 7.01], ["GT/TC", 11.1, 7.16],
      ["GT/TD", 11.3, 7.27], ["FSS/A", 8.8, 5.77], ["FSS/B", 9.2, 6.01], ["FSS/C", 9.65, 6.28],
      ["FSS/D", 9.9, 6.44], ["FSS/E", 10.05, 6.53], ["FSS/F", 10.2, 6.62], ["FSS/G", 10.25, 6.65],
      ["FSS/H", 10.35, 6.71], ["FSS/I", 10.45, 6.77], ["FSS/J", 10.5, 6.8], ["FSS/K", 10.55, 6.83],
      ["FSS/L", 10.8, 6.98], ["FSS/M", 11.0, 7.1], ["FGT/AA", 8.5, 5.59], ["FGT/BB", 8.65, 5.68],
      ["FGT/A", 8.8, 5.77], ["FGT/B", 9.2, 6.01], ["FGT/C", 9.8, 6.38], ["FGT/D", 9.9, 6.44],
      ["FGT/E", 10.0, 6.5], ["FGT/F", 10.1, 6.57], ["FGT/G", 10.2, 6.62], ["FGT/H", 10.35, 6.71],
      ["FGT/I", 10.5, 6.8], ["FGT/J", 10.6, 6.86], ["FGT/K", 10.75, 6.95], ["FGT/L", 10.85, 7.01],
      ["FGT/M", 10.95, 7.06], ["FGT/N", 11.05, 7.13], ["SS/PA-1", 9.8, 6.38], ["SS/PB-1", 9.9, 6.44],
      ["SS/PC-1", 10.0, 6.5], ["SS/PD-1", 10.1, 6.57], ["SS/PE", 10.2, 6.62], ["SS/PF", 10.3, 6.68],
      ["SS/PG", 10.5, 6.8], ["SS/PH", 10.8, 6.98], ["SS/PI", 11.1, 7.16], ["SS/PJ", 11.5, 7.39],
      ["SS/PAA", 9.85, 6.41], ["SS/PBA", 9.95, 6.47], ["SS/PCA", 10.05, 6.53], ["SS/PDA", 10.15, 6.58],
      ["SS/PEA", 10.25, 6.65], ["SS/PFA", 10.45, 6.77], ["SS/PGA", 10.65, 6.88], ["SS/PHA", 11.0, 7.1],
      ["SS/PIA", 11.35, 7.31], ["SS/PJA", 11.75, 7.53],
    ],
    "Stock": [
      ["AAA/S", 10.4, 6.73], ["AA/S", 10.7, 6.91], ["A/S", 10.95, 7.06], ["B/S", 11.2, 7.21],
      ["C/S", 11.35, 7.31], ["D/S", 11.5, 7.39], ["E/S", 11.65, 7.47], ["F/S", 11.8, 7.57],
      ["G/S", 11.9, 7.62], ["H/S", 12.0, 7.68], ["I/S", 12.2, 7.79], ["J/S", 12.35, 7.89],
      ["K/S", 12.55, 8.0], ["L/S", 12.7, 8.08], ["M/S", 12.85, 8.18], ["N/S", 12.95, 8.22],
      ["O/S", 13.1, 8.32], ["P/S", 13.35, 8.46], ["Q/S", 13.65, 8.62], ["R/S", 13.95, 8.79],
      ["T/S", 14.4, 9.04], ["U/S", 14.65, 9.17], ["V/S", 15.25, 9.51], ["W/S", 16.4, 10.17],
      ["AAA/SA", 10.4, 6.73], ["AA/SA", 10.7, 6.91], ["A/SA", 11.0, 7.1], ["B/SA", 11.25, 7.24],
      ["C/SA", 11.4, 7.32], ["D/SA", 11.55, 7.42], ["E/SA", 11.7, 7.5], ["F/SA", 11.85, 7.6],
      ["G/SA", 12.0, 7.68], ["H/SA", 12.15, 7.76], ["I/SA", 12.3, 7.86], ["J/SA", 12.45, 7.94],
      ["K/SA", 12.65, 8.05], ["L/SA", 12.7, 8.08], ["M/SA", 12.85, 8.18], ["N/SA", 13.0, 8.26],
      ["O/SA", 13.15, 8.33], ["P/SA", 13.45, 8.51], ["Q/SA", 13.8, 8.71], ["R/SA", 14.05, 8.85],
      ["T/SA", 14.4, 9.04], ["U/SA", 14.85, 9.3], ["V/SA", 15.5, 9.65], ["W/SA", 16.65, 10.32],
      ["AAF/S", 13.5, 8.54], ["AF/S", 13.85, 8.74], ["BF/S", 14.65, 9.17], ["CF/S", 15.6, 9.71],
      ["DF/S", 16.5, 10.23], ["EF/S", 17.45, 10.82], ["FS/AAA", 9.0, 5.9], ["FS/AA", 9.4, 6.13],
      ["FS/A", 9.7, 6.32], ["FS/B", 10.0, 6.5], ["FS/C", 10.3, 6.68], ["FS/D", 10.6, 6.86],
      ["FS/E", 10.95, 7.06], ["FS/F", 11.2, 7.21], ["FS/G", 11.35, 7.31], ["FS/H", 11.5, 7.39],
      ["FS/I", 11.65, 7.47], ["FS/J", 11.8, 7.57], ["FS/K", 11.9, 7.62], ["FS/L", 12.0, 7.68],
      ["A/CM", 10.9, 7.03], ["B/CM", 11.05, 7.13], ["C/CM", 11.2, 7.21], ["D/CM", 11.35, 7.31],
      ["E/CM", 11.5, 7.39], ["F/CM", 11.65, 7.47], ["G/CM", 11.8, 7.57], ["H/CM", 11.95, 7.65],
      ["I/CM", 12.1, 7.74], ["J/CM", 12.25, 7.82], ["K/CM", 12.4, 7.91], ["L/CM", 12.55, 8.0],
      ["M/CM", 12.65, 8.05], ["A/FCM", 11.55, 7.42], ["B/FCM", 11.85, 7.6], ["C/FCM", 12.15, 7.76],
      ["A/PS", 12.05, 7.71], ["B/PS", 12.45, 7.94], ["C/PS", 12.75, 8.11], ["D/PS", 13.1, 8.32],
      ["E/PS", 13.4, 8.48], ["F/PS", 13.75, 8.68], ["G/PS", 14.05, 8.85], ["H/PS", 14.3, 8.99],
      ["I/PS", 14.55, 9.13], ["FS/X", 10.15, 6.58], ["FS/XX", 9.9, 6.44],
    ],
    "Super": [
      ["SuperComp", 8.9, 5.7], ["SuperGas", 9.9, 6.3], ["SuperStreet", 10.9, 6.9],
    ],
  },
};

// Canonical form of a class designation as typed on a card: upper case, no
// whitespace (incl. non-breaking/zero-width), typographic dashes and
// slashes folded to ASCII.
export function normalizeClass(klass) {
  return String(klass ?? "")
    .toUpperCase()
    .replace(/[\s\u00a0\u200b-\u200d\ufeff]+/g, "")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\\\u2044\u2215\uff0f]/g, "/");
}

const lookupCache = new WeakMap();

// Map normalized class -> { class, category, cardCategory, q, e }.
export function classLookup(index = BUNDLED_CLASS_INDEX) {
  if (!index || !index.categories) return new Map();
  let map = lookupCache.get(index);
  if (map) return map;
  map = new Map();
  for (const [category, rows] of Object.entries(index.categories)) {
    for (const [cls, q, e] of rows || []) {
      const key = normalizeClass(cls);
      if (!key || map.has(key)) continue;
      map.set(key, { class: cls, category, cardCategory: INDEX_CATEGORY_TO_CARD[category] ?? null, q, e });
    }
  }
  lookupCache.set(index, map);
  return map;
}

const decode = (s) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

const IDX_RE = /^\d{1,2}\.\d{1,3}$/;
const CLASS_RE = /^[A-Za-z0-9][A-Za-z0-9/\- ]{0,15}$/;

// Parse one NHRA index page (raw HTML, or the plain-text/markdown that the
// r.jina.ai relay returns) into { heading, lastUpdate, rows }. Rows are
// [class, q, e]; indexes are zero-padded on the site ("07.03").
export function parseIndexPage(body) {
  const text = String(body || "");
  const rows = [];
  const pushRow = (cells) => {
    const c = cells.map((x) => x.trim()).filter((x) => x !== "");
    if (c.length < 3) return;
    const [cls, q, e] = c;
    if (!CLASS_RE.test(cls) || !IDX_RE.test(q) || !IDX_RE.test(e)) return;
    rows.push([cls.replace(/\s+/g, " "), parseFloat(q), parseFloat(e)]);
  };
  if (/<tr[\s>]/i.test(text)) {
    for (const tr of text.match(/<tr[\s>][\s\S]*?<\/tr>/gi) || []) {
      const cells = (tr.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || []).map(decode);
      pushRow(cells);
    }
  }
  if (!rows.length) {
    // Plain text / markdown (the r.jina.ai reader). It flattens the whole
    // table onto ONE line — "**Class****1/4 Mile****1/8 Mile** AA/AM 07.03
    // 04.49 AA/AT 06.87 04.39 …" — or emits "| AA/AM | 07.03 | 04.49 |"
    // markdown rows, or one row per line. Scan for "class idx idx" triples
    // anywhere after the table heading instead of relying on line breaks.
    const plainText = /<[a-z]/i.test(text) ? decode(text) : text;
    const hIdx = plainText.search(/(Comp Eliminator|Super Stock|Stock|Super Categories) Indexes|SUPER CATEGORIES/i);
    const seg = hIdx >= 0 ? plainText.slice(hIdx) : plainText;
    const TRIPLE =
      /(?:^|[\s|*])([A-Za-z][A-Za-z0-9]*(?:\/[A-Za-z0-9]+(?:-\d+)?)?)[\s|*]+(\d{1,2}\.\d{2,3})[\s|*]+(\d{1,2}\.\d{2,3})(?=[\s|*]|$)/g;
    let m;
    while ((m = TRIPLE.exec(seg))) {
      pushRow([m[1], m[2], m[3]]);
    }
  }
  const plain = /<[a-z]/i.test(text) ? decode(text) : text.replace(/\s+/g, " ");
  const hm = plain.match(/(Comp Eliminator|Super Stock|Stock|Super Categories) Indexes/i);
  const um = plain.match(/Last Update:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  return {
    heading: hm ? hm[0] : null,
    lastUpdate: um ? `${um[3]}-${um[1].padStart(2, "0")}-${um[2].padStart(2, "0")}` : null,
    rows,
  };
}
