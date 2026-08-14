// Import NHRA's actual update files, as published by the Tech Department:
//
//  - "Updates to Class Guide & Specifications" (.doc)  — the changelog with
//    "Make YYYY CUI ADV/FROM change to CUI ADV/TO" lines → hpAdjustments
//  - Engine blueprint spec sheets like CHRY64.rtf (.rtf/.doc) — per
//    make/year displacement + HP combo tables → engineSpecs
//  - Exported TechCardX datasets (.json) — full dataset replacement
//
// Word 97-2003 .doc files are binary; rather than a full parser we pull the
// printable text runs out (the document text is stored as either CP1252 or
// UTF-16), which is enough for these single-table documents.

import { getRefData, importRefData } from "./refdata.js";
import { parseChangelog } from "./updater.js";

// ------------------------------------------------------- text extraction

function rtfToText(rtf) {
  const skipGroups = new Set([
    "fonttbl", "colortbl", "stylesheet", "info", "pict", "object",
    "themedata", "colorschememapping", "latentstyles", "datastore",
    "xmlnstbl", "generator", "wgrffmtfilter", "filetbl", "listtable",
    "listoverridetable", "rsidtbl", "mmathPr", "header", "footer",
  ]);
  let out = "";
  let depth = 0;
  let skipDepth = null;
  let i = 0;
  while (i < rtf.length) {
    const c = rtf[i];
    if (c === "{") {
      depth++;
      const m = /^\{\\\*?\\?([a-zA-Z]+)/.exec(rtf.slice(i, i + 30));
      if (skipDepth === null && m && skipGroups.has(m[1])) skipDepth = depth;
      i++;
    } else if (c === "}") {
      if (skipDepth !== null && depth === skipDepth) skipDepth = null;
      depth--;
      i++;
    } else if (c === "\\") {
      let m;
      if ((m = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(i)))) {
        if (skipDepth === null) {
          const w = m[1];
          if (w === "par" || w === "line" || w === "row" || w === "sect" || w === "page") out += "\n";
          else if (w === "tab" || w === "cell") out += "\t";
        }
        i += m[0].length;
      } else if ((m = /^\\'([0-9a-fA-F]{2})/.exec(rtf.slice(i)))) {
        if (skipDepth === null) out += String.fromCharCode(parseInt(m[1], 16));
        i += 4;
      } else {
        if (skipDepth === null && "\\{}".includes(rtf[i + 1])) out += rtf[i + 1];
        i += 2;
      }
    } else {
      if (skipDepth === null && c !== "\r" && c !== "\n") out += c;
      i++;
    }
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

function docToText(bytes) {
  const latin = new TextDecoder("windows-1252").decode(bytes);
  const runs8 = latin.match(/[\x20-\x7e\r\t]{8,}/g) || [];
  const runs16 = [];
  let cur = "";
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const code = bytes[i] | (bytes[i + 1] << 8);
    if (code >= 0x20 && code <= 0x7e) cur += String.fromCharCode(code);
    else {
      if (cur.length >= 8) runs16.push(cur);
      cur = "";
    }
  }
  if (cur.length >= 8) runs16.push(cur);
  const t8 = runs8.join("\n");
  const t16 = runs16.join("\n");
  return (t16.length > t8.length ? t16 : t8).replace(/\r/g, "\n");
}

export function extractText(fileName, buffer) {
  const bytes = new Uint8Array(buffer);
  const head = new TextDecoder("latin1").decode(bytes.slice(0, 6));
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  if (head.startsWith("{\\rtf") || ext === "rtf")
    return rtfToText(new TextDecoder("windows-1252").decode(bytes));
  if (ext === "doc") return docToText(bytes);
  return new TextDecoder("utf-8").decode(bytes); // .txt and friends
}

// ------------------------------------------------------ spec sheet parse

const SHEET_TITLE_RE =
  /NHRA\s+Technical\s+Specifications\s*For\s*(\d{4})\s+(.+?)\s+Motors/i;

// "3.406  3.125  170  6  5.710 [Wedge|Hemi ...]"
const DISP_ROW_RE =
  /^\s*(\d\.\d{2,3})\s+(\d\.\d{2,3})\s+(\d{2,4})\s+(\d{1,2})\s+(\d\.\d{2,3})\s*([A-Za-z][A-Za-z ]*)?/;

// "101  170  D    8.5  ..." (mfg letters C/D/P etc., compression ratio)
const COMBO_ROW_RE = /^\s*(\d{2,4})\s+(\d{2,4})\s+([A-Z]{1,3})\s+(\d{1,2}\.\d{1,2})/;

export function parseSpecSheet(text, families) {
  const title = SHEET_TITLE_RE.exec(text);
  if (!title) return null;
  const year = title[1];
  const makeText = title[2];
  let family = null;
  for (const word of makeText.toUpperCase().split(/[^A-Z]+/)) {
    if (families[word]) {
      family = families[word];
      break;
    }
  }
  if (!family) return null;
  const displacements = [];
  const combos = [];
  for (const line of text.split("\n")) {
    let m;
    if ((m = DISP_ROW_RE.exec(line))) {
      const note = (m[6] || "").trim();
      displacements.push({
        cui: Number(m[3]),
        bore: Number(m[1]),
        stroke: Number(m[2]),
        cyl: Number(m[4]),
        rod: Number(m[5]),
        note,
      });
    } else if ((m = COMBO_ROW_RE.exec(line))) {
      const advHp = Number(m[1]);
      const cui = Number(m[2]);
      if (advHp >= 50 && advHp <= 1500 && cui >= 60 && cui <= 700)
        combos.push({ advHp, cui, mfg: m[3], cr: Number(m[4]) });
    }
  }
  if (!displacements.length && !combos.length) return null;
  return { family, makeText, year, displacements, combos };
}

// ------------------------------------------------------------- importing

// Import one uploaded NHRA file. Returns a human-readable summary of what
// was pulled in, or throws if the file isn't recognized.
export function importNhraFile(fileName, buffer) {
  const text = extractText(fileName, buffer);
  const ref = getRefData();

  // 1. Blueprint spec sheet (CHRY64.rtf and friends)
  const sheet = parseSpecSheet(text, ref.engineFamilies || {});
  if (sheet) {
    const updated = JSON.parse(JSON.stringify(ref));
    updated.engineSpecs = updated.engineSpecs || {};
    updated.engineSpecs[sheet.family] = updated.engineSpecs[sheet.family] || {};
    const had = updated.engineSpecs[sheet.family][sheet.year];
    updated.engineSpecs[sheet.family][sheet.year] = {
      displacements: sheet.displacements,
      combos: sheet.combos,
    };
    updated.meta.lastUpdated = new Date().toISOString().slice(0, 10);
    importRefData(updated, fileName);
    return (
      `${fileName}: ${had ? "updated" : "added"} ${sheet.year} ${sheet.family} blueprint specs ` +
      `(${sheet.displacements.length} displacements, ${sheet.combos.length} HP combos).`
    );
  }

  // 2. Class Guide changelog ("... 396 375/405 change to 396 375/409")
  const found = parseChangelog(text);
  if (found.length) {
    const key = (a) =>
      [a.make.toUpperCase(), a.yearFrom, a.yearTo, a.cui, a.advHp, a.factoredFrom, a.factoredTo].join("|");
    const existing = new Set((ref.hpAdjustments || []).map(key));
    const fresh = found.filter((a) => !existing.has(key(a)));
    if (fresh.length) {
      const updated = JSON.parse(JSON.stringify(ref));
      updated.hpAdjustments = [...(ref.hpAdjustments || []), ...fresh];
      updated.meta.lastUpdated = new Date().toISOString().slice(0, 10);
      importRefData(updated, fileName);
    }
    return (
      `${fileName}: found ${found.length} factored-HP change(s), ` +
      (fresh.length ? `${fresh.length} new — applied.` : "all already known.")
    );
  }

  // 3. Recognized as NHRA prose with nothing machine-readable?
  if (/NHRA|Class Guide|Blueprint|Blue Print/i.test(text)) {
    return (
      `${fileName}: read the document but found no spec tables or ` +
      `"change to" lines — likely a notice with prose-only changes; review it by hand.`
    );
  }
  throw new Error(
    `${fileName}: not recognized as an NHRA update document (no spec sheet title, no changelog lines).`
  );
}
