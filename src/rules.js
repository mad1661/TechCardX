// Problem-child rules engine.
//
// Every rule reads the active NHRA reference dataset (refdata.js) so the
// numbers can be updated without touching code. A rule emits flags:
//   { code, severity: "problem" | "warning" | "info", message }
// "problem"  — likely mis-classification or missing data that blocks classing
// "warning"  — needs a human look before the car is classed
// "info"     — worth knowing during tech, not necessarily wrong

import { getRefData } from "./refdata.js";
import { BUNDLED_CLASS_INDEX, classLookup, normalizeClass } from "./classindex.js";

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

// Parse a class string into { group, letter, ... } or null.
// Groups: STK ("A/SA"), FS, FWD, SS ("SS/JA"), GT, FSS, FGT, COMP ("E/SMA"),
// plus STK_OTHER / SS_OTHER for NHRA-listed classes that have no weight-break
// table here (e.g. A/CM, B/PS, SS/AX, SS/TA, SS/PE).
//
// The NHRA class index (classindex.js, refreshed by the Update panel) is the
// authority on which classes exist: anything on it is accepted, and the
// patterns below only work out the group/letter used for weight breaks.
// A class that matches a pattern but is NOT on the index is still accepted
// (the index can lag the Rulebook) but carries notOnIndex so a warning can
// be raised.
function parsePattern(c, ref) {
  let m;
  if ((m = c.match(/^(AAA|AA|[A-Z])\/S(A?)$/))) {
    return { group: "STK", letter: m[1], auto: m[2] === "A" };
  }
  if ((m = c.match(/^FS\/(AAA|AA|XX|X|[A-M])$/))) return { group: "FS", letter: m[1] };
  // Front-wheel-drive Stock: AAF/S, AF/S–EF/S (+ automatic)
  if ((m = c.match(/^(AA|[A-E])F\/S(A?)$/)))
    return { group: "FWD", letter: m[1], auto: m[2] === "A" };
  // Stock CM / FCM / PS classes — listed by NHRA, no weight breaks bundled
  if ((m = c.match(/^([A-Z])\/(CM|FCM|PS)$/)))
    return { group: "STK_OTHER", letter: m[1], type: m[2] };
  // Super Stock P-series (SS/PA-1…SS/PD-1, SS/PE…SS/PJ, SS/PAA…SS/PJA)
  if ((m = c.match(/^SS\/P([A-D]-1|[E-J]|[A-J]A)$/)))
    return { group: "SS_OTHER", letter: "P" + m[1], type: "P" };
  // Super Stock turbo (SS/TA–TD) and X classes (SS/AX…SS/EX, SS/VX)
  if ((m = c.match(/^SS\/(T[A-D])$/))) return { group: "SS_OTHER", letter: m[1], type: "T" };
  if ((m = c.match(/^SS\/([A-Z])X$/))) return { group: "SS_OTHER", letter: m[1], type: "X" };
  if ((m = c.match(/^SS\/([A-Q])([AMSH]?)$/)))
    return { group: "SS", letter: m[1], suffix: m[2] || "" };
  // GT turbo GT/TA–TD (GT/TA used to parse as "GT/T automatic")
  if ((m = c.match(/^GT\/T([A-D])$/))) return { group: "GT", letter: "T" + m[1], auto: false };
  if ((m = c.match(/^GT\/([A-Z])(A?)$/)))
    return { group: "GT", letter: m[1], auto: m[2] === "A" };
  if ((m = c.match(/^FSS\/([A-M])$/))) return { group: "FSS", letter: m[1] };
  if ((m = c.match(/^(?:FGT|GT\/FS)\/?(AA|BB|[A-N])$/))) return { group: "FGT", letter: m[1] };
  // Comp: letter(s) / type-code, e.g. F/D, K/AA, E/SMA, I/SM, D/A, AA/AT
  if ((m = c.match(/^([A-L]{1,2})\/([A-Z]{1,4})$/))) {
    const suffixes = ref.compSuffixes || {};
    if (suffixes[m[2]]) return { group: "COMP", letter: m[1], type: m[2] };
  }
  return null;
}

const CARD_CAT_FALLBACK_GROUP = { STK: "STK_OTHER", SS: "SS_OTHER", COMP: "COMP" };

export function parseClass(klass, category, ref = getRefData()) {
  const c = normalizeClass(klass);
  if (!c) return null;
  const entry = classLookup(ref.classIndex || BUNDLED_CLASS_INDEX).get(c);
  const pat = parsePattern(c, ref);
  if (entry && entry.cardCategory) {
    let parsed = pat && GROUP_TO_CATEGORY[pat.group] === entry.cardCategory ? pat : null;
    if (!parsed) {
      const [pre, type] = c.split("/");
      parsed = { group: CARD_CAT_FALLBACK_GROUP[entry.cardCategory], letter: type ? pre : null, type: type || c };
    }
    return { ...parsed, normalized: c, index: { category: entry.category, q: entry.q, e: entry.e } };
  }
  if (pat) return { ...pat, normalized: c, index: null, notOnIndex: true };
  return null;
}

const GROUP_TO_CATEGORY = {
  STK: "STK", FS: "STK", FWD: "STK", STK_OTHER: "STK",
  SS: "SS", GT: "SS", FSS: "SS", FGT: "SS", SS_OTHER: "SS",
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
    parsed.group === "FSS" || (parsed.group === "SS" && parsed.normalized === "SS/AH");
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
  if (parsed.notOnIndex) {
    const idx = ref.classIndex || BUNDLED_CLASS_INDEX;
    flags.push({
      code: "class-not-on-index",
      severity: "warning",
      message: `Class "${rec.klass}" fits the ${expectedCat || rec.category} class pattern but isn't on the NHRA class index (updated ${idx.lastUpdate || "?"}) — verify the class.`,
    });
  }
  rec._parsedClass = parsed;
}

// Weight-break range for a parsed class, or null when unknown/unconfirmed.
function breakRange(p, ref) {
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
  if (!table || !p.letter) return null;
  const range = table[p.letter];
  return range && range.min != null ? range : null;
}

function ruleWeightBreak(rec, ref, flags) {
  const p = rec._parsedClass;
  if (!p) return;
  const range = breakRange(p, ref);
  if (!range) return;

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
  // GT/FGT cars are classed on the GT Horsepower from the box at the top
  // of the card, not the regular factored HP — without a GT HP the check
  // would compare against the wrong number, so it is skipped (the GT HP
  // rule below reverse-derives the implied GT HP instead).
  const gtGroup = p.group === "GT" || p.group === "FGT";
  if (gtGroup && rec.gtHp == null) return;
  const hpBasis = gtGroup ? rec.gtHp : rec.factoredHp;
  const hpLabel = gtGroup ? "GT hp" : "hp";
  if (rec.minWeight != null && hpBasis != null && hpBasis > 0) {
    const expected = range.min * hpBasis + 170;
    if (Math.abs(rec.minWeight - expected) > 60) {
      flags.push({
        code: "min-weight-mismatch",
        severity: "warning",
        message:
          `Card min weight ${rec.minWeight} vs computed ${Math.round(expected)} ` +
          `(${range.min} lbs/hp × ${hpBasis} ${hpLabel} + 170 driver) for ${rec.klass}. Verify.`,
      });
    }
  }
}

// Stock Eliminator (and Super Stock's SS/ and FSS/ classes) require the
// engine year to match the body year, so a missing engine year on those
// cards is implied by the body year. GT/FGT are excluded — those classes
// exist precisely to run an engine the body didn't come with.
function engineYearMustMatchBody(rec) {
  const g = rec._parsedClass?.group;
  return rec.category === "STK" || g === "SS" || g === "FSS";
}

function effectiveEngineYear(rec) {
  if (rec.engineYear != null) return rec.engineYear;
  return engineYearMustMatchBody(rec) ? rec.bodyYear : null;
}

function ruleRequiredPowertrain(rec, ref, flags) {
  if (rec.category !== "STK" && rec.category !== "SS") return;
  if (rec.engineYear == null && effectiveEngineYear(rec) == null)
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
  if (rec.factoredHp == null && rec.hp == null && rec.gtHp == null)
    flags.push({
      code: "hp-missing",
      severity: "problem",
      message: "Neither advertised nor factored HP entered — car cannot be classed.",
    });
  else if (rec.factoredHp == null && rec.gtHp == null)
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
  // GT cars are classed on the GT Horsepower designated in the box at the
  // top of the card — a GT entry without one cannot be verified, and a
  // GT HP on a non-GT card is worth a look.
  if (p.group === "GT" || p.group === "FGT") {
    if (rec.gtHp == null) {
      if (rec.gtHpOnExport) {
        // The export carries the GT HP box and this card left it blank.
        flags.push({
          code: "gt-hp-missing",
          severity: "problem",
          message:
            `${rec.klass} is a GT class but no GT Horsepower is designated on the card — ` +
            `GT cars must be classed on the GT HP from the box at the top of the card.`,
        });
      } else {
        // The download format has no GT HP column at all, so its absence
        // says nothing about the physical card. Reverse-derive what the
        // card's min weight implies so tech has a number to compare.
        const range = breakRange(p, ref);
        const implied =
          range && rec.minWeight != null && rec.minWeight > 170
            ? Math.round((rec.minWeight - 170) / range.min)
            : null;
        flags.push({
          code: "gt-hp-check",
          severity: "info",
          message:
            `${rec.klass} is classed on the GT Horsepower box, which this download doesn't include — ` +
            (implied != null
              ? `the card's min weight ${rec.minWeight} implies ≈${implied} GT hp for ${rec.klass}; `
              : ``) +
            `check the box on the physical card.`,
        });
      }
    } else if (rec.factoredHp != null && rec.gtHp === rec.factoredHp) {
      flags.push({
        code: "gt-hp-equals-factored",
        severity: "info",
        message:
          `GT HP and factored HP are both ${rec.gtHp} — fine if the Guide agrees, ` +
          `but check it isn't a copy-over.`,
      });
    }
  } else if (rec.gtHp != null) {
    flags.push({
      code: "gt-hp-on-non-gt",
      severity: "warning",
      message:
        `Card designates GT Horsepower ${rec.gtHp} but the class is ${rec.klass || "not GT"} — ` +
        `either the class or the GT HP box is wrong.`,
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
  if (engineYearMustMatchBody(rec) && rec.engineYear != null && rec.bodyYear != null) {
    if (rec.engineYear !== rec.bodyYear) {
      const label =
        GROUP_TO_CATEGORY[p.group] === "STK" ? "Stock Eliminator" : `Super Stock ${p.group}`;
      flags.push({
        code: "engine-body-year-differ",
        severity: "problem",
        message:
          `${label} requires the engine year to match the body year — ` +
          `card shows a ${rec.engineYear} engine in a ${rec.bodyYear} body.`,
      });
    }
  }
}

// Factored-HP corrections from the Class Guide changelog: if a card's
// combo matches an adjustment and still shows the OLD factor, the card is
// stale — the min weight computed from it will be wrong too.
const ADJ_MAKE_FAMILY = {
  CHEV: "GM", GM: "GM", PONT: "GM", OLDS: "GM", BUICK: "GM", BUIC: "GM",
  MOPAR: "Mopar", DODGE: "Mopar", DODG: "Mopar", PLYM: "Mopar", CHRY: "Mopar",
  FORD: "Ford", MERC: "Ford", AMC: "AMC",
};

// Keep only the newest adjustment per combo (the changelog chains
// corrections, e.g. 291→293 then 293→294 — only the latest is current).
function latestAdjustments(list) {
  const byCombo = new Map();
  for (const adj of list || []) {
    const key = [adj.make.toUpperCase(), adj.yearFrom, adj.yearTo, adj.cui, adj.advHp].join("|");
    const prev = byCombo.get(key);
    if (!prev || (adj.date || "") >= (prev.date || "")) byCombo.set(key, adj);
  }
  return [...byCombo.values()];
}

function ruleHpAdjustments(rec, ref, flags) {
  if (!CLASS_CATS.has(rec.category)) return;
  const engYear = effectiveEngineYear(rec);
  if (engYear == null || rec.cui == null || rec.hp == null) return;
  const fam = engineFamily(rec.engineMake, ref);
  if (!ref._latestAdj) ref._latestAdj = latestAdjustments(ref.hpAdjustments);
  for (const adj of ref._latestAdj) {
    const adjFam = ADJ_MAKE_FAMILY[adj.make.toUpperCase()] || adj.make;
    if (fam && adjFam !== fam) continue;
    if (engYear < adj.yearFrom || engYear > adj.yearTo) continue;
    if (rec.cui !== adj.cui || rec.hp !== adj.advHp) continue;
    if (rec.factoredHp === adj.factoredFrom) {
      flags.push({
        code: "factored-hp-outdated",
        severity: "problem",
        message:
          `Factored HP for ${adj.make} ${engYear} ${adj.cui}/${adj.advHp} was changed ` +
          `${adj.factoredFrom} → ${adj.factoredTo} on ${adj.date} — card still shows the old ${adj.factoredFrom}.`,
      });
    } else if (rec.factoredHp != null && rec.factoredHp !== adj.factoredTo) {
      flags.push({
        code: "factored-hp-differs-from-bulletin",
        severity: "warning",
        message:
          `NHRA set factored HP for ${adj.make} ${engYear} ${adj.cui}/${adj.advHp} to ` +
          `${adj.factoredTo} on ${adj.date}, but the card shows ${rec.factoredHp}. Verify against the current guide.`,
      });
    }
  }
}

// Engine blueprint spec sheets: for covered make/years, the displacement
// and (displacement, advertised HP) combo must exist in the factory specs.
function ruleEngineSpecs(rec, ref, flags) {
  if (rec.category !== "STK" && rec.category !== "SS") return;
  const engYear = effectiveEngineYear(rec);
  if (engYear == null || rec.cui == null) return;
  const fam = engineFamily(rec.engineMake, ref);
  const specs = fam && ref.engineSpecs ? ref.engineSpecs[fam] : null;
  const yearSpec = specs ? specs[String(engYear)] : null;
  if (!yearSpec) return;
  const dispOk = yearSpec.displacements.some((d) => d.cui === rec.cui);
  if (!dispOk) {
    flags.push({
      code: "engine-disp-not-in-specs",
      severity: "warning",
      message:
        `${engYear} ${rec.engineMake} blueprint specs list no ${rec.cui} CUI engine ` +
        `(valid: ${[...new Set(yearSpec.displacements.map((d) => d.cui))].join(", ")}).`,
    });
    return;
  }
  if (rec.hp != null && yearSpec.combos.length) {
    const comboOk = yearSpec.combos.some(
      (c) => c.cui === rec.cui && c.advHp === rec.hp
    );
    if (!comboOk) {
      const hps = yearSpec.combos
        .filter((c) => c.cui === rec.cui)
        .map((c) => c.advHp);
      flags.push({
        code: "combo-not-in-specs",
        severity: "warning",
        message:
          `No ${engYear} ${rec.engineMake} ${rec.cui}/${rec.hp} hp combo in the blueprint specs` +
          (hps.length ? ` (listed for ${rec.cui} CUI: ${[...new Set(hps)].join(", ")} hp).` : "."),
      });
    }
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
  ruleHpAdjustments,
  ruleEngineSpecs,
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
