// Run with: npm test   (node's built-in test runner, no extra deps)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseClass, evaluate } from "../src/rules.js";
import { getRefData, upgradeStored, BUNDLED } from "../src/refdata.js";
import {
  BUNDLED_CLASS_INDEX,
  INDEX_CATEGORY_TO_CARD,
  NHRA_INDEX_PAGES,
  normalizeClass,
  parseIndexPage,
} from "../src/classindex.js";
import { refreshClassIndex } from "../src/updater.js";

const fixture = (name) => readFileSync(new URL("./fixtures/" + name, import.meta.url), "latin1");
const PAGES = {
  Comp: "nhra-indexes-comp.html",
  "Super Stock": "nhra-indexes-super-stock.html",
  Stock: "nhra-indexes-stock.html",
  Super: "nhra-indexes-super.html",
};

function card(category, klass) {
  return {
    category, klass, carNumber: "1", firstName: "T", lastName: "Est",
    engineMake: "", engineYear: null, cui: null, bodyMake: "", bodyType: "",
    bodyYear: null, hp: null, factoredHp: null, gtHp: null, pwFactor: null,
    minWeight: null, notes: [],
  };
}
const classFlags = (category, klass) =>
  evaluate([card(category, klass)])[0].flags.filter((f) => f.code.startsWith("class-"));

test("NHRA index pages parse completely (zero-padded, two index columns)", () => {
  const counts = { Comp: 116, "Super Stock": 146, Stock: 95, Super: 3 };
  for (const [cat, file] of Object.entries(PAGES)) {
    const p = parseIndexPage(fixture(file));
    assert.equal(p.rows.length, counts[cat], cat);
    assert.deepEqual(p.rows, BUNDLED_CLASS_INDEX.categories[cat], cat + " matches bundled snapshot");
  }
  const comp = parseIndexPage(fixture(PAGES.Comp));
  assert.equal(comp.heading, "Comp Eliminator Indexes");
  assert.equal(comp.lastUpdate, "2026-10-06");
  assert.deepEqual(comp.rows[0], ["AA/AM", 7.03, 4.49]);
  assert.deepEqual(comp.rows.find((r) => r[0] === "AA/PM"), ["AA/PM", 6.63, 4.24]);
  const ss = parseIndexPage(fixture(PAGES["Super Stock"]));
  assert.deepEqual(ss.rows.find((r) => r[0] === "SS/Q"), ["SS/Q", 12.65, 8.05]);
});

test("category URLs use NHRA's exact, case-sensitive class= values", () => {
  const urls = Object.fromEntries(NHRA_INDEX_PAGES.map((p) => [p.category, p.url]));
  assert.equal(urls.Comp, "https://www.nhra.net/stats/indexes.html?class=Comp");
  assert.equal(urls["Super Stock"], "https://www.nhra.net/stats/indexes.html?class=Super%20Stock");
  assert.equal(urls.Stock, "https://www.nhra.net/stats/indexes.html?class=Stock");
});

test("every class on the NHRA Comp / Super Stock / Stock tables is recognized", () => {
  const ref = getRefData();
  let n = 0;
  for (const [cat, rows] of Object.entries(BUNDLED_CLASS_INDEX.categories)) {
    const cardCat = INDEX_CATEGORY_TO_CARD[cat];
    if (!cardCat) continue;
    for (const [cls, q, e] of rows) {
      const p = parseClass(cls, cardCat, ref);
      assert.ok(p, `${cls} (${cat}) should parse`);
      assert.deepEqual([p.index.q, p.index.e], [q, e], `${cls} index`);
      assert.deepEqual(classFlags(cardCat, cls), [], `${cls} (${cat}) should raise no class flags`);
      n++;
    }
  }
  assert.equal(n, 357);
});

test("previously rejected classes, incl. SS/Q and all Comp classes", () => {
  for (const [cat, cls] of [
    ["SS", "SS/Q"], ["SS", "SS/P"], ["SS", "SS/QA"], ["SS", "SS/AX"], ["SS", "SS/TA"],
    ["SS", "GT/TB"], ["SS", "FGT/AA"], ["SS", "FGT/N"], ["SS", "SS/PA-1"], ["SS", "SS/PJA"],
    ["COMP", "AA/PM"], ["COMP", "A/PM"], ["COMP", "A/ND"], ["COMP", "PST"], ["COMP", "PST/A"],
    ["COMP", "B/TA"], ["COMP", "M/A"], ["COMP", "M/AA"], ["COMP", "FS/SM"], ["COMP", "A/MP"],
    ["COMP", "A/FX"], ["STK", "AAF/S"], ["STK", "FS/AAA"], ["STK", "A/CM"], ["STK", "C/FCM"],
    ["STK", "I/PS"], ["STK", "FS/XX"],
  ])
    assert.deepEqual(classFlags(cat, cls), [], `${cat} ${cls}`);
});

test("class normalization: case, spaces, NBSP, backslash, unicode dash", () => {
  for (const raw of ["ss/q", " SS / Q ", "SS\u00a0/Q", "SS\\Q", "ss / pa\u20131"])
    assert.ok(parseClass(raw, "SS"), JSON.stringify(raw));
  assert.equal(normalizeClass(" aa / pm "), "AA/PM");
  // SS/AH may run Comp regardless of how it was typed
  assert.deepEqual(classFlags("COMP", "ss / ah"), []);
});

test("still rejects garbage and flags category mismatches", () => {
  assert.equal(classFlags("SS", "SS/ZZ")[0].code, "class-invalid");
  assert.equal(classFlags("STK", "HELLO")[0].code, "class-invalid");
  assert.equal(classFlags("STK", "SS/Q")[0].code, "class-category-mismatch");
  assert.equal(classFlags("SS", "AA/PM")[0].code, "class-category-mismatch");
  // pattern-valid but not on the index -> warning, not an outright reject
  const w = classFlags("SS", "SS/OH");
  assert.equal(w.length, 1);
  assert.equal(w[0].code, "class-not-on-index");
  assert.equal(w[0].severity, "warning");
});

test("Mark's D1 entry list: every Stock / Super Stock / Comp class is recognized", () => {
  const lines = fixture("d1-entry-classes.csv").trim().split(/\r?\n/).slice(1);
  let cards = 0, checked = 0;
  const failures = [];
  for (const line of lines) {
    const [category, klass, n] = line.split(",");
    cards += Number(n);
    const cat = category.toUpperCase();
    if (!["STK", "SS", "COMP"].includes(cat)) continue;
    checked += Number(n);
    const f = classFlags(cat, klass);
    if (f.length) failures.push(`${cat} ${klass}: ${f.map((x) => x.code).join(",")}`);
  }
  assert.equal(cards, 573);
  assert.equal(checked, 228);
  assert.deepEqual(failures, []);
});

test("live refresh: replaces tables only from well-formed category pages", async () => {
  const ref = getRefData();
  const byUrl = Object.fromEntries(NHRA_INDEX_PAGES.map((p) => [p.url, fixture(PAGES[p.category])]));
  const ok = await refreshClassIndex(ref, () => {}, async (u) => byUrl[u]);
  assert.equal(ok.changed, false);
  assert.ok(ok.summary.every((s) => !s.error), JSON.stringify(ok.summary));

  // NHRA adds a class -> picked up
  const added = fixture(PAGES["Super Stock"]).replace(
    "</table>",
    '<tr><td>SS/ZQ</td><td>13.00</td><td>08.30</td></tr></table>'
  );
  const upd = await refreshClassIndex(ref, () => {}, async (u) =>
    u.includes("Super%20Stock") ? added : byUrl[u]
  );
  assert.equal(upd.changed, true);
  assert.ok(upd.index.categories["Super Stock"].some((r) => r[0] === "SS/ZQ"));
  assert.ok(parseClass("SS/ZQ", "SS", { ...ref, classIndex: upd.index }).index);

  // wrong page (server fell back to the Comp table) or truncated page -> kept
  const bad = await refreshClassIndex(ref, () => {}, async (u) =>
    u.includes("Super%20Stock") ? byUrl[NHRA_INDEX_PAGES[0].url]
    : u.includes("class=Stock") ? fixture(PAGES.Stock).slice(0, 4000) : byUrl[u]
  );
  assert.equal(bad.changed, false);
  assert.equal(bad.summary.filter((s) => s.error).length, 2);
  assert.equal(bad.index.categories["Super Stock"].length, 146);
});

test("r.jina.ai plain-text/markdown relay output parses too", () => {
  const md = "Comp Eliminator Indexes\n\nLast Update: 10/6/2026\n\n| Class | 1/4 Mile | 1/8 Mile |\n|---|---|---|\n| AA/AM | 07.03 | 04.49 |\n| AA/PM | 06.63 | 04.24 |\n";
  const p = parseIndexPage(md);
  assert.equal(p.heading, "Comp Eliminator Indexes");
  assert.deepEqual(p.rows, [["AA/AM", 7.03, 4.49], ["AA/PM", 6.63, 4.24]]);
});

test("stale localStorage datasets pick up the class index and current links", () => {
  const old = JSON.parse(JSON.stringify({ ...BUNDLED, classIndex: undefined }));
  delete old.classIndex;
  old.meta.watchPages = [{ label: "x", url: "https://www.nhraracer.com/apcm/APCMviewer.asp?a=46999&z=132" }];
  const up = upgradeStored(old);
  assert.equal(up.classIndex.lastUpdate, BUNDLED_CLASS_INDEX.lastUpdate);
  assert.deepEqual(up.meta.watchPages, BUNDLED.meta.watchPages);
  assert.ok(!JSON.stringify(up.meta).includes("APCMviewer"));
});
