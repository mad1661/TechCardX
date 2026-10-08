// Replays the responses the CORS relays actually returned (captured
// 2026-10-08 from r.jina.ai, api.allorigins.win, api.codetabs.com and
// corsproxy.io for nhra.net/stats/indexes.html?class=…).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BUNDLED_CLASS_INDEX, NHRA_INDEX_PAGES, parseIndexPage } from "../src/classindex.js";
import { checkWebsite, fetchViaProxies, refreshClassIndex } from "../src/updater.js";
import { getRefData } from "../src/refdata.js";

const fx = (n) => readFileSync(new URL("./fixtures/relay/" + n, import.meta.url), "utf8");
const SLUG = { Comp: "comp", "Super Stock": "super-stock", Stock: "stock", Super: "super" };
const COUNTS = { Comp: 116, "Super Stock": 146, Stock: 95, Super: 3 };

function res(status, body) {
  return { ok: status >= 200 && status < 300, status, text: async () => body };
}
const catOf = (u) => NHRA_INDEX_PAGES.find((p) => decodeURIComponent(u).includes(decodeURIComponent(p.url)))?.category;
const isJinaHtml = (u, init) => u.startsWith("https://r.jina.ai/") && init?.headers?.["X-Return-Format"] === "html";
const isJinaText = (u, init) => u.startsWith("https://r.jina.ai/") && !init?.headers?.["X-Return-Format"];

// What the relays returned on 2026-10-08
function realRelays({ jinaHtml = true } = {}) {
  return async (u, init) => {
    const cat = catOf(u);
    if (u.startsWith("https://api.allorigins.win/")) return res(408, fx("allorigins-408-comp.txt"));
    if (u.startsWith("https://api.codetabs.com/")) return res(522, fx("codetabs-522.txt"));
    if (u.startsWith("https://corsproxy.io/")) return res(401, fx("corsproxy-401.txt"));
    if (isJinaHtml(u, init)) return jinaHtml ? res(200, fx(`jina-html-${SLUG[cat]}.html`)) : res(429, "rate limited");
    if (isJinaText(u, init)) return res(200, fx(`jina-text-${SLUG[cat]}.txt`));
    throw new Error("unexpected " + u);
  };
}

test("jina plain-text output (table flattened onto one line) parses fully", () => {
  for (const [cat, slug] of Object.entries(SLUG)) {
    const p = parseIndexPage(fx(`jina-text-${slug}.txt`));
    assert.equal(p.rows.length, COUNTS[cat], cat);
    assert.deepEqual(p.rows, BUNDLED_CLASS_INDEX.categories[cat], cat);
  }
  // the exact shape that produced "only 0 classes parsed" on the live site
  assert.match(fx("jina-text-comp.txt"), /\*\*Class\*\*\*\*1\/4 Mile\*\*\*\*1\/8 Mile\*\* AA\/AM 07\.03 04\.49 AA\/AT/);
});

test("jina raw-HTML output (X-Return-Format: html) parses fully", () => {
  for (const [cat, slug] of Object.entries(SLUG)) {
    const p = parseIndexPage(fx(`jina-html-${slug}.html`));
    assert.deepEqual(p.rows, BUNDLED_CLASS_INDEX.categories[cat], cat);
  }
});

test("relays: jina HTML wins even though the other relays fail", async () => {
  const got = await fetchViaProxies(NHRA_INDEX_PAGES[0].url, { fetchImpl: realRelays() });
  assert.equal(got.relay, "r.jina.ai");
  assert.equal(parseIndexPage(got.body).rows.length, 116);
});

test("refresh parses Comp, Super Stock and Stock through the real relay responses", async () => {
  for (const jinaHtml of [true, false]) {
    const fetcher = (url, opts) => fetchViaProxies(url, { ...opts, fetchImpl: realRelays({ jinaHtml }) });
    const r = await refreshClassIndex(getRefData(), () => {}, fetcher);
    for (const s of r.summary) {
      assert.ok(!s.error, `${s.category}: ${s.error}`);
      assert.equal(s.classes, COUNTS[s.category], s.category);
      assert.equal(s.relay, jinaHtml ? "r.jina.ai" : "r.jina.ai (text)");
    }
  }
});

test("a fast 200 response that doesn't parse can't beat a usable one", async () => {
  const comp = fx("jina-html-comp.html");
  const ss = fx("jina-html-super-stock.html");
  const fetchImpl = async (u, init) => {
    if (isJinaHtml(u, init)) return res(200, comp); // wrong table, instantly
    if (u.startsWith("https://api.allorigins.win/")) {
      await new Promise((r) => setTimeout(r, 30));
      return res(200, ss);
    }
    return res(522, "error code: 522");
  };
  const page = NHRA_INDEX_PAGES.find((p) => p.category === "Super Stock");
  const r = await refreshClassIndex(
    { ...getRefData(), classIndex: { ...BUNDLED_CLASS_INDEX } },
    () => {},
    (url, opts) => (url === page.url ? fetchViaProxies(url, { ...opts, fetchImpl }) : Promise.reject(new Error("skip")))
  );
  const s = r.summary.find((x) => x.category === "Super Stock");
  assert.equal(s.relay, "api.allorigins.win");
  assert.equal(s.classes, 146);
});

// ---- watch-page change detection --------------------------------------

const store = new Map();
beforeEach(() => {
  store.clear();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
});

test("watch pages: a different relay winning is not reported as 'changed'", async () => {
  const realFetch = globalThis.fetch;
  const page = (relayFlavor, extra = "") =>
    relayFlavor === "html"
      ? `<html><body><h1>Stock Car Classification</h1><p>Guides ${extra}</p><script>x()</script></body></html>`
      : `Title: Stock Car | NHRA Racer\n\nMarkdown Content:\nStock Car Classification\n\nGuides ${extra}`;
  let mode = "allorigins";
  let extra = "";
  globalThis.fetch = async (u, init) => {
    if (u.startsWith("https://api.allorigins.win/")) return mode === "allorigins" ? res(200, page("html", extra).padEnd(300)) : res(522, "x");
    if (isJinaHtml(u, init)) return mode === "jina" ? res(200, page("html", extra).padEnd(320) + "<!--rendered-->") : res(429, "x");
    if (u.startsWith("https://r.jina.ai/")) return res(429, "x");
    if (catOf(u)) return res(522, "x");
    return res(522, "x");
  };
  try {
    const statuses = async () => {
      const seen = {};
      await checkWebsite((label, status) => { if (status !== "checking") seen[label] = status; });
      return seen["Stock Car Classification Guides"];
    };
    assert.equal(await statuses(), "new"); // first ever read (allorigins)
    assert.equal(await statuses(), "unchanged"); // same relay, same page
    mode = "jina";
    assert.equal(await statuses(), "new"); // other relay: baseline, NOT "changed"
    assert.equal(await statuses(), "unchanged");
    extra = "2027 update";
    assert.equal(await statuses(), "changed"); // real content change is still caught
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("watch pages: pre-fix snapshots (no relay recorded) don't produce 'changed'", async () => {
  store.set("techcardx.snapshots", JSON.stringify({
    "https://www.nhraracer.com/stockcarclassification": { hash: "123", date: "2026-10-08T21:00:00Z", length: 10 },
  }));
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (u, init) =>
    isJinaHtml(u, init) ? res(200, "<html><body>" + "Stock Car Classification ".repeat(20) + "</body></html>") : res(522, "x");
  try {
    const seen = {};
    await checkWebsite((label, status) => { if (status !== "checking") seen[label] = status; });
    assert.equal(seen["Stock Car Classification Guides"], "new");
  } finally {
    globalThis.fetch = realFetch;
  }
});
