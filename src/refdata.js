// NHRA reference data used by the rules engine.
//
// Everything here is DATA, not code: class tables, weight breaks, model
// dictionary. It ships bundled with the app, but an updated dataset can be
// imported at runtime (Update panel) and is persisted in localStorage,
// overriding the bundled copy. meta.lastUpdated always reflects whichever
// dataset is active.

import { hpAdjustments, guideNotices, engineSpecs } from "./refdata-nhra-docs.js";

export const BUNDLED = {
  meta: {
    version: "2026.2",
    lastUpdated: "2026-08-14",
    updatedBy: "bundled with app",
    // Pages the website updater fetches and diffs for changes.
    watchPages: [
      {
        label: "Stock Car Classification Guides",
        url: "https://www.nhraracer.com/apcm/APCMviewer.asp?a=46635&z=132",
      },
      {
        label: "AHFS / HP adjustments",
        url: "https://www.nhraracer.com/apcm/APCMviewer.asp?a=46633&z=132",
      },
      {
        label: "Indexes and Records",
        url: "https://www.nhraracer.com/apcm/APCMviewer.asp?a=46999&z=132",
      },
      {
        label: "NHRA Accepted Products",
        url: "https://www.nhraracer.com/content/general.asp?articleid=53545&zoneid=132",
      },
    ],
    sources: [
      {
        label: "Stock Car Classification Guides (per-manufacturer PDFs)",
        url: "https://www.nhraracer.com/apcm/APCMviewer.asp?a=46635&z=132",
      },
      {
        label: "AHFS — Automatic Horsepower Factoring System / HP adjustments",
        url: "https://www.nhraracer.com/apcm/APCMviewer.asp?a=46633&z=132",
      },
      {
        label: "Class Indexes and Records",
        url: "https://www.nhraracer.com/apcm/APCMviewer.asp?a=46999&z=132",
      },
      {
        label: "Class Indexes (nhra.com)",
        url: "https://www.nhra.com/stats/class_indexes",
      },
      {
        label: "NHRA Accepted Products",
        url: "https://www.nhraracer.com/content/general.asp?articleid=53545&zoneid=132",
      },
      {
        label: "Rulebook Amendments (weight breaks live in the Rulebook)",
        url: "https://www.nhraracer.com/Files/Tech/2026_rulebook_amendments.pdf",
      },
    ],
  },

  // ---- Stock Eliminator ----------------------------------------------
  // lbs of shipping weight per factored HP (min/max inclusive).
  // AA/S 7.50 and A/S 8.00 anchors are source-confirmed; the 0.50 ladder
  // through P/S follows the confirmed pattern. Breaks for Q/S and slower
  // are NOT published consistently — left null so the numeric check stays
  // off until a verified table is imported. W/S is four-cylinder, 24.0+.
  // Min as-raced weight = top break × factored HP + 170 lb (driver).
  stockBreaks: {
    AA: { min: 7.5, max: 7.99 },
    A: { min: 8.0, max: 8.49 },
    B: { min: 8.5, max: 8.99 },
    C: { min: 9.0, max: 9.49 },
    D: { min: 9.5, max: 9.99 },
    E: { min: 10.0, max: 10.49 },
    F: { min: 10.5, max: 10.99 },
    G: { min: 11.0, max: 11.49 },
    H: { min: 11.5, max: 11.99 },
    I: { min: 12.0, max: 12.49 },
    J: { min: 12.5, max: 12.99 },
    K: { min: 13.0, max: 13.49 },
    L: { min: 13.5, max: 13.99 },
    M: { min: 14.0, max: 14.49 },
    N: { min: 14.5, max: 14.99 },
    O: { min: 15.0, max: 15.49 },
    P: { min: 15.5, max: 15.99 },
    Q: { min: null, max: null },
    R: { min: null, max: null },
    S: { min: null, max: null },
    T: { min: null, max: null },
    U: { min: null, max: null },
    V: { min: null, max: null },
    W: { min: 24.0, max: 99 }, // four-cylinder cars only
  },

  // Front-wheel-drive Stock classes AF/S–EF/S (DF/S 19.00–24.99 is the
  // one source-confirmed break; EF/S 25+ by adjacency).
  fwdBreaks: {
    A: { min: null, max: null },
    B: { min: null, max: null },
    C: { min: null, max: null },
    D: { min: 19.0, max: 24.99 },
    E: { min: 25.0, max: 99 },
  },

  // ---- Super Stock ----------------------------------------------------
  // SS/A–SS/O and GT weight breaks were restructured for 2017 and the
  // current values are only published in the NHRA Rulebook — numeric
  // checks stay OFF (null) until a verified table is imported via the
  // Update panel. Class-name validation still applies.
  ssBreaks: {
    A: { min: null, max: null }, B: { min: null, max: null },
    C: { min: null, max: null }, D: { min: null, max: null },
    E: { min: null, max: null }, F: { min: null, max: null },
    G: { min: null, max: null }, H: { min: null, max: null },
    I: { min: null, max: null }, J: { min: null, max: null },
    K: { min: null, max: null }, L: { min: null, max: null },
    M: { min: null, max: null }, N: { min: null, max: null },
    O: { min: null, max: null },
  },
  gtBreaks: {
    A: { min: null, max: null }, B: { min: null, max: null },
    C: { min: null, max: null }, D: { min: null, max: null },
    E: { min: null, max: null }, F: { min: null, max: null },
    G: { min: null, max: null }, H: { min: null, max: null },
    I: { min: null, max: null }, J: { min: null, max: null },
    K: { min: null, max: null }, L: { min: null, max: null },
    M: { min: null, max: null }, N: { min: null, max: null },
    O: { min: null, max: null }, P: { min: null, max: null },
    Q: { min: null, max: null },
  },
  // Factory Super Stock (late-model COPO / Cobra Jet / Drag Pak in SS).
  // Full table confirmed from NHRA "New Class Indexes" release.
  fssBreaks: {
    A: { min: 5.0, max: 5.49 },
    B: { min: 5.5, max: 5.99 },
    C: { min: 6.0, max: 6.49 },
    D: { min: 6.5, max: 6.99 },
    E: { min: 7.0, max: 7.49 },
    F: { min: 7.5, max: 7.99 },
    G: { min: 8.0, max: 8.49 },
    H: { min: 8.5, max: 8.99 },
    I: { min: 9.0, max: 9.49 },
    J: { min: 9.5, max: 9.99 },
    K: { min: 10.0, max: 10.99 },
    L: { min: 11.0, max: 11.99 },
    M: { min: 12.0, max: 99 },
  },
  // Factory GT (a.k.a. GT/FS): GT/FSA 8.00–8.49 … GT/FSJ 12.50+
  // confirmed endpoints, 0.50 ladder consistent between them.
  fgtBreaks: {
    A: { min: 8.0, max: 8.49 },
    B: { min: 8.5, max: 8.99 },
    C: { min: 9.0, max: 9.49 },
    D: { min: 9.5, max: 9.99 },
    E: { min: 10.0, max: 10.49 },
    F: { min: 10.5, max: 10.99 },
    G: { min: 11.0, max: 11.49 },
    H: { min: 11.5, max: 11.99 },
    I: { min: 12.0, max: 12.49 },
    J: { min: 12.5, max: 99 },
  },
  // Factory Stock in Stock Eliminator (FS/A–FS/L). A, B, C, E, F, G, L
  // source-confirmed; D and H–K follow the confirmed 0.50 ladder.
  // FS/AA appears on timing systems; break unconfirmed → check off.
  fsBreaks: {
    AA: { min: null, max: null },
    A: { min: 6.0, max: 6.49 },
    B: { min: 6.5, max: 6.99 },
    C: { min: 7.0, max: 7.49 },
    D: { min: 7.5, max: 7.99 },
    E: { min: 8.0, max: 8.49 },
    F: { min: 8.5, max: 8.99 },
    G: { min: 9.0, max: 9.49 },
    H: { min: 9.5, max: 9.99 },
    I: { min: 10.0, max: 10.49 },
    J: { min: 10.5, max: 10.99 },
    K: { min: 11.0, max: 11.49 },
    L: { min: 11.5, max: 99 },
  },

  // ---- Comp Eliminator ------------------------------------------------
  // Valid class type codes after the slash (letter prefix, incl. doubled
  // AA/BB/CC/DD blown-turbo prefixes, handled by the parser).
  compSuffixes: {
    D: "Dragster",
    DA: "Dragster (automatic)",
    ED: "Econo Dragster",
    A: "Altered / blown gas Altered",
    AA: "Altered (automatic)",
    AP: "Altered (planetary transmission)",
    AM: "Blown methanol Altered",
    AT: "Turbocharged Altered",
    AF: "Turbocharged FWD Altered",
    EA: "Econo Altered",
    SM: "Super Modified",
    SMA: "Super Modified (automatic)",
    SR: "Street Roadster",
  },

  // ---- Engine make → manufacturer family -----------------------------
  engineFamilies: {
    CHEV: "GM", CHEVY: "GM", CHVY: "GM", CHEVROLET: "GM", PONT: "GM", PONTIAC: "GM",
    OLDS: "GM", OLDSMOBILE: "GM", BUIC: "GM", BUICK: "GM", GM: "GM",
    FORD: "Ford", MERC: "Ford", MERCURY: "Ford", LINC: "Ford", LINCOLN: "Ford",
    DODG: "Mopar", DODGE: "Mopar", PLYM: "Mopar", PLYMOUTH: "Mopar",
    CHRY: "Mopar", CHRYSLER: "Mopar", MOPAR: "Mopar",
    AMC: "AMC", RAMB: "AMC", RAMBLER: "AMC",
  },

  // ---- Body / model dictionary ---------------------------------------
  // family: manufacturer family; wagon/convertible: the model is that body
  // style by definition; vague: needs more detail to identify the combo.
  models: {
    // GM
    "CAMARO": { family: "GM" },
    "Z28": { family: "GM" },
    "IROC Z": { family: "GM", aliases: ["IROC"] },
    "BERLINETTA": { family: "GM" },
    "COPO CAMARO": { family: "GM" },
    "COPO": { family: "GM", vague: true },
    "NOVA": { family: "GM" },
    "CHEVY II": { family: "GM", aliases: ["CHEVY 2", "CHEVY LL", "CHEVYII", "CHEVY2"] },
    "CHEVELLE": { family: "GM" },
    "MALIBU": { family: "GM" },
    "MONTE CARLO": { family: "GM" },
    "BELAIR": { family: "GM", aliases: ["BEL AIR"] },
    "BISCAYNE": { family: "GM" },
    "IMPALA": { family: "GM" },
    "CAPRICE": { family: "GM" },
    "CORVETTE": { family: "GM" },
    "CAVALIER": { family: "GM", aliases: ["CAVALIERS"] },
    "COBALT": { family: "GM" },
    "BERETTA": { family: "GM" },
    "VEGA": { family: "GM" },
    "MONZA": { family: "GM" },
    "EL CAMINO": { family: "GM" },
    "KINGSWOOD": { family: "GM", wagon: true },
    "TOWNSMAN": { family: "GM", wagon: true },
    "BROOKWOOD": { family: "GM", wagon: true },
    "NOMAD": { family: "GM", wagon: true },
    "FIREBIRD": { family: "GM" },
    "TRANS AM": { family: "GM" },
    "FORMULA": { family: "GM", aliases: ["FOMULER", "FORMULA FIREBIRD", "FORMULA WS6"] },
    "FIREHAWK": { family: "GM" },
    "GTO": { family: "GM" },
    "TEMPEST": { family: "GM" },
    "LEMANS": { family: "GM", aliases: ["LE MANS"] },
    "GRAND AM": { family: "GM", aliases: ["GRAND AN"] },
    "GRAND PRIX": { family: "GM" },
    "FIERO": { family: "GM" },
    "G5": { family: "GM" },
    "SAFARI": { family: "GM", wagon: true },
    "CUTLASS": { family: "GM" },
    "442": { family: "GM" },
    "CIERA": { family: "GM" },
    "VISTA CRUISER": { family: "GM", wagon: true },
    "SKYLARK": { family: "GM" },
    "GRAND NATIONAL": { family: "GM" },
    "REGAL": { family: "GM" },
    "ESTATE WAGON": { family: "GM", wagon: true },
    // Ford
    "MUSTANG": { family: "Ford" },
    "COBRA JET": { family: "Ford" },
    "COBRA": { family: "Ford", vague: true },
    "SHELBY": { family: "Ford", vague: true },
    "CJ": { family: "Ford", vague: true },
    "MAVERICK": { family: "Ford", aliases: ["MAVERICK GRABBER"] },
    "FALCON": { family: "Ford" },
    "FAIRLANE": { family: "Ford" },
    "TORINO": { family: "Ford" },
    "GALAXIE": { family: "Ford" },
    "THUNDERBOLT": { family: "Ford" },
    "PINTO": { family: "Ford" },
    "ESCORT": { family: "Ford" },
    "PROBE": { family: "Ford" },
    "FOCUS": { family: "Ford" },
    "COMET": { family: "Ford" },
    "CYCLONE": { family: "Ford" },
    "COUGAR": { family: "Ford" },
    "COUNTRY SQUIRE": { family: "Ford", wagon: true },
    "RANCH WAGON": { family: "Ford", wagon: true },
    "COLONY PARK": { family: "Ford", wagon: true },
    // Mopar
    "CHALLENGER": { family: "Mopar" },
    "DRAG PAK": { family: "Mopar", aliases: ["DRAGPAK"] },
    "BARRACUDA": { family: "Mopar", aliases: ["CUDA"] },
    "DUSTER": { family: "Mopar" },
    "VALIANT": { family: "Mopar" },
    "DART": { family: "Mopar" },
    "DEMON": { family: "Mopar" },
    "CHARGER": { family: "Mopar" },
    "CORONET": { family: "Mopar", aliases: ["CORONET BROUGHAM"] },
    "SUPER BEE": { family: "Mopar" },
    "ROADRUNNER": { family: "Mopar", aliases: ["ROAD RUNNER"] },
    "GTX": { family: "Mopar" },
    "SATELLITE": { family: "Mopar" },
    "BELVEDERE": { family: "Mopar" },
    "DAYTONA": { family: "Mopar" },
    "AVENGER": { family: "Mopar" },
    "SUNDANCE": { family: "Mopar" },
    "NEON": { family: "Mopar" },
    "OMNI": { family: "Mopar" },
    "LEBARON": { family: "Mopar" },
    // AMC
    "AMX": { family: "AMC" },
    "JAVELIN": { family: "AMC" },
    "GREMLIN": { family: "AMC" },
    "HORNET": { family: "AMC" },
    "REBEL": { family: "AMC" },
    // catch-alls
    "WAGON": { wagon: true, vague: true },
    "STA": { wagon: true, vague: true, aliases: ["STA WGN", "STATION WAGON"] },
  },

  // Token-level keywords (matched as whole words / word-substrings noted
  // in rules.js) that mark a body style needing a weight double-check.
  bodyKeywords: {
    wagon: ["WAGON", "WGN", "STA", "ESTATE", "KAMMBACK"],
    convertible: ["CONV", "VERT", "CONVERTIBLE", "RAGTOP", "CABRIOLET", "CABRIO"],
  },

  // ---- Parsed official documents --------------------------------------
  // Factored-HP corrections from the "Updates to Class Guide &
  // Specifications" changelog; other changelog lines; engine blueprint
  // spec data (currently Chrysler 1964/65/68).
  hpAdjustments,
  guideNotices,
  engineSpecs,
};

const LS_KEY = "techcardx.refdata";
const LS_META = "techcardx.refdata.meta";

let active = null;

export function getRefData() {
  if (active) return active;
  try {
    if (typeof localStorage === "undefined") throw new Error("no localStorage");
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.meta && parsed.stockBreaks) {
        active = parsed;
        return active;
      }
    }
  } catch (e) {
    /* fall through to bundled */
  }
  active = BUNDLED;
  return active;
}

// Import an updated dataset (parsed JSON object). Validates minimal shape,
// stamps lastUpdated if absent, persists, and makes it active.
export function importRefData(obj, sourceLabel = "imported file") {
  if (!obj || typeof obj !== "object") throw new Error("Not a JSON object");
  if (!obj.stockBreaks || !obj.meta)
    throw new Error(
      "Dataset missing required keys (meta, stockBreaks). Export a dataset from the Update panel to see the expected shape."
    );
  obj.meta.lastUpdated = obj.meta.lastUpdated || new Date().toISOString().slice(0, 10);
  obj.meta.updatedBy = sourceLabel;
  localStorage.setItem(LS_KEY, JSON.stringify(obj));
  active = obj;
  return active;
}

export function resetRefData() {
  localStorage.removeItem(LS_KEY);
  active = BUNDLED;
  return active;
}

export function exportRefData() {
  return JSON.stringify(getRefData(), null, 2);
}

export function isCustomRefData() {
  return getRefData() !== BUNDLED;
}
