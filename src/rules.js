// Problem-child rules engine.
//
// Every rule reads the active NHRA reference dataset (refdata.js) so the
// numbers can be updated without touching code. A rule emits flags:
//   { code, severity: "problem" | "warning" | "info", message }
// "problem"  — likely mis-classification or missing data that blocks classing
// "warning"  — needs a human look before the car is classed
// "info"     — worth knowing during tech, not necessarily wrong

import { getRefData } from "./refdata.js";

// ---------------------------------------------------------------- helpers

const CLASS_CATS = new Set(["STK", "SS", "COMP"]);

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
}

function normBody(s) {
  return s.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

// Whole-word phrase match: "CAMARO SS" contains "CAMARO" but "MUSTANG"
// does not contain "STA".
function containsPhrase(norm, phrase) {
  return (" " + norm + " ").includes(" " + phrase + " ");
}

// Find the model dictionary entry for a body-type string.
// Returns { key, entry, exact } or null. Tries whole-word phrase match
// first, then fuzzy (edit distance <= 2 on words of length >= 5).
function matchModel(bodyType, models) {
  const norm = normBody(bodyType);
  if (!norm) return null;
  let phraseHit = null;
  for (const [key, entry] of Object.entries(models)) {
    const names = [key, ...(entry.aliases || [])];
    for (const name of names) {
      if (norm === name || containsPhrase(norm, name)) {
        const hit = { key, entry, exact: true, matchedName: name };
        // prefer the longest matching phrase (e.g. "COPO CAMARO" over "COPO")
        if (!phraseHit || name.length > phraseHit.matchedName.length) phraseHit = hit;
      }
    }
  }
  if (phraseHit) return phraseHit;
  // fuzzy pass over whole string and individual words
  let best = null;
  const words = [norm, ...norm.split(" ")];
  for (const [key, entry] of Object.entries(models)) {
    const names = [key, ...(entry.aliases || [])];
    for (const name of names) {
      if (name.length < 5) continue;
      for (const w of words) {
        if (w.length < 4) continue;
        const d = levenshtein(w, name);
        if (d > 0 && d <= 2 && (!best || d < best.d)) {
          best = { key, entry, exact: false, matchedName: name, d };
        }
      }
    }
  }
  return best;
}

function engineFamily(engineMake, ref) {
  const m = engineMake.toUpperCase().replace(/[^A-Z]/g, "");
  return ref.engineFamilies?.[m] || null;
}

function inRange(v, range) {
  return v >= range.min && v <= range.max;
}

function fmtRange(r) {
  return `${r.min.toFixed(2)}–${r.max.toFixed(2)} lbs/hp`;
}

// ------------------------------------------------------- class validation

// Parse a class string into { group, letter, suffix } or null.
// Groups: STK ("A/SA"), FS, CF, SS ("SS/JA"), GT, FSS, FGT, COMP ("E/SMA").
export function parseClass(klass, category, ref) {
  const c = (klass || "").toUpperCase().replace(/\s+/g, "");
  if (!c) return null;
  let m;
  if ((m = c.match(/^(AA|[A-Z])\/S(A?)$/))) {
    return { group: "STK", letter: m[1], auto: m[2] === "A" };
  }
  if ((m = c.match(/^FS\/(AA|[A-M])$/))) return { group: "FS", letter: m[1] };
  // Front-wheel-drive Stock: AF/S–EF/S (+ automatic)
  if ((m = c.match(/^([A-E])F\/S(A?)$/)))
    return { group: "FWD", letter: m[1], auto: m[2] === "A" };
  if ((m = c.match(/^SS\/([A-O])([AMSH]?)$/)))
    return { group: "SS", letter: m[1], suffix: m[2] || "" };
  if ((m = c.match(/^GT\/([A-Z])(A?)$/)))
    return { group: "GT", letter: m[1], auto: m[2] === "A" };
  if ((m = c.match(/^FSS\/([A-M])$/))) return { group: "FSS", letter: m[1] };
  if ((m = c.match(/^(?:FGT|GT\/FS)\/?([A-M])$/))) return { group: "FGT", letter: m[1] };
  // Comp: letter(s) / type-code, e.g. F/D, K/AA, E/SMA, I/SM, D/A, AA/AT
  if ((m = c.match(/^([A-L]{1,2})\/([A-Z]{1,4})$/))) {
    const suffixes = ref.compSuffixes || {};
    if (suffixes[m[2]]) return { group: "COMP", letter: m[1], type: m[2] };
  }
  return null;
}

const GROUP_TO_CATEGORY = {
  STK: "STK", FS: "STK", FWD: "STK",
  SS: "SS", GT: "SS", FSS: "SS", FGT: "SS",
  COMP: "COMP",
};

// ---------------------------------------------------------------- rules

function ruleClassValid(rec, ref, flags) {
  if (!CLASS_CATS.has(rec.category)) return;
  if (!rec.klass) {
    flags.push({
      code: "class-missing",
      severity: "problem",
      message: `No class entered for a ${rec.category} car — cannot verify combo.`,
    });
    return;
  }
  const parsed = parseClass(rec.klass, rec.category, ref);
  if (!parsed) {
    flags.push({
      code: "class-invalid",
      severity: "problem",
      message: `Class "${rec.klass}" is not a recognized ${rec.category} class designation.`,
    });
    return;
  }
  const expectedCat = GROUP_TO_CATEGORY[parsed.group];
  // FSS cars and SS/AH also run in Comp Eliminator since their class
  // addition — both SS and COMP are legitimate categories for them.
  const compAllowed =
    parsed.group === "FSS" || (parsed.group === "SS" && rec.klass === "SS/AH");
  if (
    expectedCat &&
    expectedCat !== rec.category &&
    !(compAllowed && rec.category === "COMP")
  ) {
    flags.push({
      code: "class-category-mismatch",
      severity: "problem",
      message: `Class "${rec.klass}" belongs to ${expectedCat}, but the card says category ${rec.category}.`,
    });
  }
  rec._parsedClass = parsed;
}

function ruleWeightBreak(rec, ref, flags) {
  const p = rec._parsedClass;
  if (!p) return;
  const tables = {
    STK: ref.stockBreaks,
    FWD: ref.fwdBreaks,
    SS: ref.ssBreaks,
    GT: ref.gtBreaks,
    FSS: ref.fssBreaks,
    FGT: ref.fgtBreaks,
    FS: ref.fsBreaks,
  };
  const table = tables[p.group];
  if (!table || !p.letter) return;
  const range = table[p.letter];
  if (!range || range.min == null) return;

  // TCND exports carry the pounds-per-HP factor directly.
  if (rec.pwFactor != null) {
    if (!inRange(rec.pwFactor, range)) {
      flags.push({
        code: "pw-factor-outside-class",
        severity: "problem",
        message:
          `Card shows ${rec.pwFactor} lbs/hp but ${rec.klass} is ${fmtRange(range)}. ` +
          `Wrong class letter, wrong factor, or wrong HP.`,
      });
    }
  }

  // Minimum as-raced weight = top of class break × factored HP + 170 lb
  // driver allowance (confirmed NHRA formula for Stock-side classes).
  if (rec.minWeight != null && rec.factoredHp != null && rec.factoredHp > 0) {
    const expected = range.min * rec.factoredHp + 170;
    if (Math.abs(rec.minWeight - expected) > 60) {
      flags.push({
        code: "min-weight-mismatch",
        severity: "warning",
        message:
          `Card min weight ${rec.minWeight} vs computed ${Math.round(expected)} ` +
          `(${range.min} lbs/hp × ${rec.factoredHp} hp + 170 driver) for ${rec.klass}. Verify.`,
      });
    }
  }
}

function ruleRequiredPowertrain(rec, ref, flags) {
  if (rec.category !== "STK" && rec.category !== "SS") return;
  if (rec.engineYear == null)
    flags.push({
      code: "engine-year-missing",
      severity: "warning",
      message: "No engine year — combo cannot be looked up in the Classification Guide without it.",
    });
  if (rec.cui == null)
    flags.push({
      code: "cui-missing",
      severity: "warning",
      message: "No engine size (CUI) on the card.",
    });
  if (rec.factoredHp == null && rec.hp == null)
    flags.push({
      code: "hp-missing",
      severity: "problem",
      message: "Neither advertised nor factored HP entered — car cannot be classed.",
    });
  else if (rec.factoredHp == null)
    flags.push({
      code: "factored-hp-missing",
      severity: "warning",
      message: "No factored HP — check current National HP Ratings for this combo.",
    });
  if (rec.engineYear != null && (rec.engineYear < 1900 || rec.engineYear > 2027))
    flags.push({
      code: "engine-year-implausible",
      severity: "problem",
      message: `Engine year ${rec.engineYear} is not plausible.`,
    });
  if (
    rec.cui != null && rec.hp != null && rec.factoredHp != null &&
    rec.cui === rec.hp && rec.hp === rec.factoredHp
  )
    flags.push({
      code: "cui-hp-identical",
      severity: "warning",
      message: `CUI, HP and factored HP are all ${rec.cui} — looks like a data-entry shortcut. Verify each value.`,
    });
}

function ruleBody(rec, ref, flags) {
  if (!CLASS_CATS.has(rec.category)) return;
  if (rec.category === "COMP") return; // Comp bodies are purpose-built; skip dictionary checks
  const body = rec.bodyType || rec.bodyMake;
  if (!body) {
    flags.push({
      code: "body-missing",
      severity: "problem",
      message: "No body make/model on the card.",
    });
    return;
  }
  const norm = normBody(body + " " + (rec.bodyMake || ""));

  // 1. explicit wagon / convertible wording (including mangled spellings).
  // Wagon words must match as whole words ("STA" must not hit "MUSTANG");
  // convertible words also match inside tokens to catch garbage like
  // "Onvconv." → ONVCONV containing CONV.
  const kw = ref.bodyKeywords || {};
  const tokens = norm.split(" ");
  const saysWagon = (kw.wagon || []).some((k) => tokens.includes(k));
  const saysConvertible = (kw.convertible || []).some((k) =>
    tokens.some((t) => t.includes(k))
  );
  if (saysWagon)
    flags.push({
      code: "body-wagon",
      severity: "warning",
      message:
        "Card indicates a STATION WAGON — wagons carry a different shipping weight than the coupe/sedan. Confirm the combo was classed as the wagon.",
    });
  if (saysConvertible)
    flags.push({
      code: "body-convertible",
      severity: "warning",
      message:
        "Card indicates a CONVERTIBLE — convertibles carry a different shipping weight than the hardtop. Confirm the combo was classed as the convertible.",
    });

  // 2. model dictionary
  const match = matchModel(body, ref.models || {});
  if (match) {
    const e = match.entry;
    if (!match.exact) {
      flags.push({
        code: "body-possible-typo",
        severity: "warning",
        message: `Body "${body}" doesn't match a known model — did they mean "${titleCase(match.matchedName)}"?`,
      });
    }
    if (e.wagon && !saysWagon)
      flags.push({
        code: "body-known-wagon-model",
        severity: "warning",
        message: `"${titleCase(match.matchedName)}" is a station-wagon model but the card doesn't say wagon — verify body style and shipping weight.`,
      });
    if (e.convertible && !saysConvertible)
      flags.push({
        code: "body-known-convertible-model",
        severity: "warning",
        message: `"${titleCase(match.matchedName)}" is a convertible model but the card doesn't say convertible — verify body style and shipping weight.`,
      });
    if (e.vague)
      flags.push({
        code: "body-too-vague",
        severity: "warning",
        message: `Body "${body}" is not specific enough to verify the combo — need make, model and body style (e.g. which model is the "${titleCase(match.matchedName)}"?).`,
      });
    // 3. engine make family vs body family
    const fam = engineFamily(rec.engineMake, ref);
    if (fam && e.family && fam !== e.family) {
      flags.push({
        code: "engine-body-make-mismatch",
        severity: "problem",
        message:
          `${rec.engineMake} engine in a ${titleCase(match.matchedName)} (${e.family} body) — ` +
          `cross-manufacturer combos are not permitted in Stock/Super Stock.`,
      });
    }
  } else if (norm.length >= 4) {
    flags.push({
      code: "body-unrecognized",
      severity: "info",
      message: `Body "${body}" isn't in the model dictionary — give it a look (typo, rare model, or needs more detail).`,
    });
  }
}

function ruleGroupSpecific(rec, ref, flags) {
  const p = rec._parsedClass;
  if (!p) return;
  // FS/FSS are late-model factory package cars — the BODY must be modern.
  if ((p.group === "FSS" || p.group === "FS") && rec.bodyYear != null) {
    if (rec.bodyYear < 2008)
      flags.push({
        code: "factory-class-old-body",
        severity: "warning",
        message: `${rec.klass} is a late-model factory class (COPO / Cobra Jet / Drag Pak) but body year is ${rec.bodyYear}.`,
      });
  }
  // FGT is the inverse: a current factory crate ENGINE in an older
  // same-make body — so the engine must be modern.
  if (p.group === "FGT" && rec.engineYear != null && rec.engineYear < 2010) {
    flags.push({
      code: "fgt-engine-not-late-model",
      severity: "warning",
      message: `${rec.klass} (Factory GT) requires a current factory crate engine, but engine year is ${rec.engineYear}.`,
    });
  }
  if (p.group === "FWD" && rec.cui != null && rec.cui > 250) {
    flags.push({
      code: "fwd-engine-too-big",
      severity: "warning",
      message: `${rec.klass} is a front-wheel-drive Stock class but engine is ${rec.cui} CUI — verify.`,
    });
  }
  // GT permits any Guide-listed same-corporation engine that didn't come
  // in that car — typically an earlier engine in a later body. An engine
  // much newer than the body is the suspicious direction.
  if (p.group === "GT" && rec.engineYear != null && rec.bodyYear != null) {
    if (rec.engineYear > rec.bodyYear + 2)
      flags.push({
        code: "gt-engine-newer-than-body",
        severity: "warning",
        message: `GT combo with a ${rec.engineYear} engine in a ${rec.bodyYear} body — GT is normally an earlier engine in a later body (FGT covers modern crate engines). Verify.`,
      });
    else if (rec.engineYear > rec.bodyYear)
      flags.push({
        code: "gt-engine-slightly-newer",
        severity: "info",
        message: `GT combo with a ${rec.engineYear} engine in a ${rec.bodyYear} body — legal if the Guide lists it for the corporation, worth a look.`,
      });
  }
  if (p.group === "STK" && rec.engineYear != null && rec.bodyYear != null) {
    if (rec.engineYear !== rec.bodyYear)
      flags.push({
        code: "stock-engine-body-year-differ",
        severity: "info",
        message: `Engine year ${rec.engineYear} ≠ body year ${rec.bodyYear} on a Stock car — verify the combo is as delivered.`,
      });
  }
}

function ruleAdmin(rec, ref, flags) {
  const refDate = rec.eventEnd || rec.eventStart || new Date();
  if (rec.licenseExp && rec.licenseExp < refDate)
    flags.push({
      code: "license-expired",
      severity: "problem",
      message: `Competition license expired ${rec.licenseExp.toLocaleDateString()}.`,
    });
  if (rec.memberExp && rec.memberExp < refDate)
    flags.push({
      code: "membership-expired",
      severity: "problem",
      message: `NHRA membership expired ${rec.memberExp.toLocaleDateString()}.`,
    });
  if (!rec.carNumber)
    flags.push({
      code: "car-number-missing",
      severity: "warning",
      message: "No car number on the card.",
    });
}

function titleCase(s) {
  return s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

// ------------------------------------------------------------- top level

const RECORD_RULES = [
  ruleClassValid,
  ruleWeightBreak,
  ruleRequiredPowertrain,
  ruleBody,
  ruleGroupSpecific,
  ruleAdmin,
];

export function evaluate(records) {
  const ref = getRefData();
  const results = records.map((rec) => {
    const flags = [];
    for (const rule of RECORD_RULES) rule(rec, ref, flags);
    return { record: rec, flags };
  });

  // dataset-level: duplicate car numbers within a category
  const seen = new Map();
  for (const r of results) {
    const key = r.record.category + "|" + r.record.carNumber;
    if (!r.record.carNumber) continue;
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key).push(r);
  }
  for (const [key, group] of seen) {
    if (group.length > 1) {
      const names = group
        .map((g) => `${g.record.firstName} ${g.record.lastName}`.trim())
        .join(", ");
      for (const g of group)
        g.flags.push({
          code: "duplicate-car-number",
          severity: "problem",
          message: `Car number ${g.record.carNumber} appears ${group.length}× in ${g.record.category} (${names}).`,
        });
    }
  }

  for (const r of results) {
    r.maxSeverity = r.flags.some((f) => f.severity === "problem")
      ? "problem"
      : r.flags.some((f) => f.severity === "warning")
      ? "warning"
      : r.flags.length
      ? "info"
      : "clean";
  }
  return results;
}

export const SEVERITY_ORDER = { problem: 0, warning: 1, info: 2, clean: 3 };
