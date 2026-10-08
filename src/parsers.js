// Tech card upload parsing.
//
// Two known export formats are auto-detected by their header rows:
//  - "TCND" division export  (Submission_ID, CarBike_Num, EngMake, ...)
//  - "Compulink" track export (Car Number, License #, Engine Make, ...)
// Both are normalized into a common TechCard record so the rules engine
// only deals with one shape.

import * as XLSX from "xlsx";

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const str = (v) => {
  if (v === null || v === undefined) return "";
  return String(v).trim();
};

const upper = (v) => str(v).toUpperCase();

// Card category as the rules engine expects it (STK / SS / COMP / ...).
// Exports normally carry the short codes; spelled-out names are mapped so
// those cards aren't silently skipped by the class checks.
const CATEGORY_ALIASES = {
  STOCK: "STK",
  "STOCK ELIMINATOR": "STK",
  "SUPER STOCK": "SS",
  SUPERSTOCK: "SS",
  COMPETITION: "COMP",
  "COMP ELIMINATOR": "COMP",
  "COMPETITION ELIMINATOR": "COMP",
};
const category = (v) => {
  const c = upper(v).replace(/\s+/g, " ");
  return CATEGORY_ALIASES[c] || c;
};

// Header cells sometimes carry stray spaces ("Class "), which made every
// value in that column read as blank. Trim the keys of each row object.
function trimKeys(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const key = String(k).trim();
    if (!(key in out) || out[key] == null) out[key] = v;
  }
  return out;
}

function parseDate(v) {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  if (typeof v === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    return d ? new Date(d.y, d.m - 1, d.d) : null;
  }
  const s = String(v).trim();
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

// The GT Horsepower box at the top of the card comes through the exports
// under varying headers (GT_HP, GT HP, GTHP, GT Horsepower...) — when it
// comes through at all: the TCND download omits the box entirely, and the
// rules engine treats a missing column differently from a blank cell.
const GT_HP_HEADER_RE = /(^|[^a-z])gt[ _-]*(h\.?p|horse ?power)/i;

function findGtHp(row) {
  const key = Object.keys(row).find((k) => GT_HP_HEADER_RE.test(k));
  return key ? num(row[key]) : null;
}

export function detectFormat(headers) {
  const set = new Set(headers.map((h) => str(h)));
  if (set.has("Submission_ID") && set.has("CarBike_Num")) return "tcnd";
  if (set.has("Car Number") && set.has("License #")) return "compulink";
  return null;
}

function fromTcnd(row) {
  return {
    source: "tcnd",
    submissionDate: parseDate(row["SubmissionDate"]),
    carNumber: str(row["CarBike_Num"]),
    firstName: str(row["First_Name"]),
    lastName: str(row["Last_Name"]),
    category: category(row["Category"]),
    klass: upper(row["Class"]),
    engineMake: upper(row["EngMake"]),
    engineYear: num(row["Eng_Year"]),
    cui: num(row["CUICC"]),
    bodyMake: str(row["Body_Make"]),
    bodyType: str(row["Type"]),
    bodyYear: num(row["Body_Year"]),
    hp: num(row["Advertised_HP"]),
    factoredHp: num(row["factoredHp137"]),
    gtHp: findGtHp(row),
    pwFactor: num(row["PW_Factor"]),
    minWeight: num(row["Min_Wieght"]), // header typo is in the source export
    transmission: str(row["Transmission_Details_Type"]),
    heads: str(row["Heads"]),
    memberNum: str(row["MEMBER_NUM"]),
    licenseExp: parseDate(row["LICENSE_EXP_DATE"]),
    memberExp: parseDate(row["MEMBERSHIP_EXP_DATE"]),
    eventStart: parseDate(row["bdate"]),
    eventEnd: parseDate(row["edate"]),
    notes: [],
  };
}

function fromCompulink(row) {
  const notes = [];
  for (let i = 1; i <= 6; i++) {
    const v = str(row["line" + i]);
    if (v) notes.push(v);
  }
  return {
    source: "compulink",
    submissionDate: parseDate(row["SubmissionDate"]),
    carNumber: str(row["Car Number"]),
    firstName: str(row["First Name"]),
    lastName: str(row["Last Name"]),
    category: category(row["Category"]),
    klass: upper(row["Class"]),
    engineMake: upper(row["Engine Make"]),
    engineYear: num(row["Engine Year"]),
    cui: num(row["CUI/CC"]),
    bodyMake: "",
    bodyType: str(row["Body Type"]),
    bodyYear: num(row["Body Year"]),
    hp: num(row["HP"]),
    factoredHp: num(row["Factored HP"]),
    gtHp: findGtHp(row),
    pwFactor: null,
    minWeight: null,
    transmission: "",
    heads: "",
    memberNum: str(row["Member #"]),
    licenseExp: parseDate(row["License Expiry"]),
    memberExp: parseDate(row["Member Expiry"]),
    eventStart: null,
    eventEnd: null,
    notes,
  };
}

// Parse an uploaded .xlsx/.csv ArrayBuffer into normalized tech card records.
// Returns { format, records, warnings }.
export function parseWorkbook(buffer, fileName = "") {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const warnings = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null }).map(trimKeys);
    if (!rows.length) continue;
    const headers = Object.keys(rows[0]);
    const format = detectFormat(headers);
    if (!format) continue;
    const mapper = format === "tcnd" ? fromTcnd : fromCompulink;
    const hasGtHpColumn = headers.some((h) => GT_HP_HEADER_RE.test(str(h)));
    const records = rows
      .map(mapper)
      .filter((r) => r.carNumber || r.lastName || r.category);
    records.forEach((r, i) => {
      r.rowIndex = i + 2; // 1-based + header row
      r.gtHpOnExport = hasGtHpColumn;
    });
    return { format, records, warnings, sheetName, fileName };
  }
  throw new Error(
    "Could not recognize this file as a TCND or Compulink tech card export. " +
      "Expected headers like 'Submission_ID'/'CarBike_Num' or 'Car Number'/'License #'."
  );
}
