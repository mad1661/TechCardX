// Live update check against nhraracer.com and the nhra.net class indexes.
//
// Browsers cannot fetch these sites directly (no CORS headers there), so
// requests go through public CORS relays. Each watched page
// is fetched, reduced to text, and compared with the snapshot from the last
// check; changelog-style lines ("Chev 1969 396 375/405 change to 396
// 375/409") found in any page are parsed and merged into the active
// dataset's hpAdjustments. Every check stamps meta.lastChecked; merged
// changes also stamp meta.lastUpdated.

import { getRefData, importRefData } from "./refdata.js";
import { NHRA_INDEX_PAGES, parseIndexPage } from "./classindex.js";

// CORS relays. As of Oct 2026 only r.jina.ai answers reliably:
// allorigins and codetabs mostly time out (408/522/503) and corsproxy.io
// requires an API key (401). By default jina returns a *flattened markdown*
// rendering of the page — the NHRA index tables come back as one long line
// ("AA/AM 07.03 04.49 AA/AT 06.87 04.39 …") — so it is asked for the raw
// HTML instead (X-Return-Format: html; its CORS preflight allows that
// header). The plain-text reader stays as a fallback only, so a check
// doesn't double the request count against jina's free rate limit.
const RELAYS = [
  { name: "r.jina.ai", url: (u) => "https://r.jina.ai/" + u, headers: { "X-Return-Format": "html" } },
  { name: "api.allorigins.win", url: (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u) },
  { name: "api.codetabs.com", url: (u) => "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(u) },
];
const FALLBACK_RELAYS = [
  { name: "r.jina.ai (text)", url: (u) => "https://r.jina.ai/" + u },
  { name: "corsproxy.io", url: (u) => "https://corsproxy.io/?url=" + encodeURIComponent(u) },
];
export const RELAY_NAMES = [...RELAYS, ...FALLBACK_RELAYS].map((r) => r.name);

const SNAP_KEY = "techcardx.snapshots";
const CHECK_KEY = "techcardx.lastChecked";

function hashText(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

function htmlToText(html) {
  if (typeof DOMParser === "undefined") {
    // non-browser (tests): rough equivalent of the DOM path below
    return String(html)
      .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,noscript").forEach((n) => n.remove());
  return (doc.body?.textContent || "").replace(/\s+/g, " ").trim();
}

// The primary relays are tried concurrently and the first USABLE response
// wins — some watched pages take 15s+ to serve, so sequential attempts
// stacked timeouts. `accept(body)` lets a caller reject a response that
// came back 200 but isn't what it needs (e.g. an index page that doesn't
// parse), so a fast-but-useless relay can't beat a good one. Fallback
// relays are only tried when every primary relay failed.
// Resolves to { body, relay }.
export async function fetchViaProxies(url, opts = {}) {
  if (typeof opts === "number") opts = { timeoutMs: opts };
  const { timeoutMs = 30000, accept = null, fetchImpl = (...a) => fetch(...a) } = opts;
  const attempt = async (relay) => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      let res;
      try {
        res = await fetchImpl(relay.url(url), { signal: ctrl.signal, headers: relay.headers || {} });
      } finally {
        clearTimeout(t);
      }
      if (!res.ok) throw new Error("HTTP " + res.status);
      const body = await res.text();
      if (body.length < 200) throw new Error("Empty response");
      if (accept) {
        const why = accept(body);
        if (why !== true && why !== undefined && why !== null)
          throw new Error("unusable response" + (typeof why === "string" ? " (" + why + ")" : ""));
      }
      return { body, relay: relay.name };
    } catch (e) {
      throw new Error(relay.name + ": " + (e.name === "AbortError" ? "timed out" : e.message));
    }
  };
  const reasons = [];
  try {
    return await Promise.any(RELAYS.map(attempt));
  } catch (e) {
    reasons.push(...(e.errors || [e]).map((err) => err.message));
  }
  for (const relay of FALLBACK_RELAYS) {
    try {
      return await attempt(relay);
    } catch (e) {
      reasons.push(e.message);
    }
  }
  throw new Error("All relays failed (" + reasons.join("; ") + ")");
}

// Parse "Make YYYY[-YY] CUI ADV/FROM change to CUI ADV/TO" lines.
const CHG_RE =
  /([A-Za-z]+)\s+(\d{2,4})(?:-(\d{2,4}))?\s+(\d{3})\s+(\d{2,4})\/(\d{2,4})\s+change\s+to\s+(\d{3})\s+(\d{2,4})\/(\d{2,4})/g;
const DATE_RE = /Update\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/g;

function fixYear(y) {
  const n = Number(y);
  if (n < 100) return n > 30 ? 1900 + n : 2000 + n;
  return n;
}

export function parseChangelog(text) {
  // associate each change with the nearest preceding "Update m.d.yyyy"
  const dates = [];
  let m;
  while ((m = DATE_RE.exec(text)))
    dates.push({
      idx: m.index,
      date: `${m[3]}-${String(m[1]).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`,
    });
  const found = [];
  while ((m = CHG_RE.exec(text))) {
    const [, make, y1, y2, cui, adv, from, , , to] = m;
    let date = null;
    for (const d of dates) if (d.idx < m.index) date = d.date;
    found.push({
      date,
      make,
      yearFrom: fixYear(y1),
      yearTo: y2 ? fixYear(y2) : fixYear(y1),
      cui: Number(cui),
      advHp: Number(adv),
      factoredFrom: Number(from),
      factoredTo: Number(to),
      note: "",
    });
  }
  return found;
}

function adjKey(a) {
  return [a.make.toUpperCase(), a.yearFrom, a.yearTo, a.cui, a.advHp, a.factoredFrom, a.factoredTo].join("|");
}

export function getLastChecked() {
  try {
    return localStorage.getItem(CHECK_KEY);
  } catch {
    return null;
  }
}

// Run the live check. onPage(label, status, detail) is called per page with
// status: "checking" | "unchanged" | "changed" | "new" | "error".
// Returns { checkedAt, changedPages, newAdjustments }.
export async function checkWebsite(onPage = () => {}) {
  const ref = getRefData();
  let snaps = {};
  try {
    snaps = JSON.parse(localStorage.getItem(SNAP_KEY) || "{}");
  } catch {}
  const changedPages = [];
  const foundAdjustments = [];

  for (const page of ref.meta.watchPages || []) {
    onPage(page.label, "checking");
    try {
      const { body, relay } = await fetchViaProxies(page.url);
      const text = htmlToText(body);
      const h = hashText(text);
      // Each relay renders a page differently (raw HTML vs. jina's
      // rendering vs. markdown), so a hash is only comparable with the
      // previous hash taken through the SAME relay. Comparing across relays
      // reported "changed" for pages that hadn't changed at all.
      const prevEntry = snaps[page.url];
      const byRelay = { ...(prevEntry?.byRelay || {}) };
      const prev = byRelay[relay];
      let status = "unchanged";
      let detail;
      if (prev) {
        if (prev.hash !== h) status = "changed";
      } else {
        status = "new";
        detail = prevEntry
          ? `first read via ${relay} — baseline saved (not comparable with the earlier read)`
          : `baseline saved via ${relay}`;
      }
      byRelay[relay] = { hash: h, date: new Date().toISOString(), length: text.length };
      snaps[page.url] = { byRelay, date: new Date().toISOString() };
      if (status === "changed") changedPages.push({ label: page.label, url: page.url, status });
      foundAdjustments.push(...parseChangelog(text));
      onPage(page.label, status, detail);
    } catch (e) {
      onPage(page.label, "error", e.message);
    }
  }

  // re-download the NHRA class index tables (Comp, Super Stock, Stock, Super)
  const classIndex = await refreshClassIndex(ref, onPage);

  // merge any newly discovered adjustments into the active dataset
  const existing = new Set((ref.hpAdjustments || []).map(adjKey));
  const fresh = foundAdjustments.filter((a) => !existing.has(adjKey(a)));
  if (fresh.length || classIndex.changed) {
    const updated = JSON.parse(JSON.stringify(ref));
    if (fresh.length) updated.hpAdjustments = [...(ref.hpAdjustments || []), ...fresh];
    if (classIndex.changed) updated.classIndex = classIndex.index;
    updated.meta.lastUpdated = new Date().toISOString().slice(0, 10);
    importRefData(updated, "website check");
  }

  const checkedAt = new Date().toISOString();
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify(snaps));
    localStorage.setItem(CHECK_KEY, checkedAt);
  } catch {}

  return { checkedAt, changedPages, newAdjustments: fresh, classIndex };
}

// Fetch every NHRA class-index category page and rebuild ref.classIndex.
// A category is only replaced when its page parses cleanly: the expected
// heading is present (a wrong `class=` value silently falls back to the
// Comp table or a 500 page) and it yields at least 80% as many classes as
// the current table — so a half-loaded or reformatted page can't wipe out
// classes. Returns { changed, index, summary }.
export function validateIndexPage(page, parsed, before = []) {
  const isSuper = page.category === "Super";
  const headingOk = isSuper
    ? parsed.rows.length > 0 && parsed.rows.every((r) => /^super/i.test(r[0]))
    : parsed.heading && parsed.heading.toLowerCase() === page.heading.toLowerCase();
  if (!headingOk)
    return `page did not contain the "${page.heading}" table (got ${parsed.heading || "no table heading"})`;
  if (parsed.rows.length < Math.floor(before.length * 0.8))
    return `only ${parsed.rows.length} classes parsed (had ${before.length}) — kept the existing table`;
  return null;
}

export async function refreshClassIndex(ref, onPage = () => {}, fetcher = fetchViaProxies) {
  const current = ref.classIndex || { categories: {} };
  const next = { ...current, categories: { ...(current.categories || {}) } };
  let changed = false;
  let newest = current.lastUpdate || "";
  const summary = [];
  for (const page of NHRA_INDEX_PAGES) {
    const label = `Class index — ${page.category}`;
    onPage(label, "checking");
    const before = current.categories?.[page.category] || [];
    try {
      const got = await fetcher(page.url, {
        accept: (body) => validateIndexPage(page, parseIndexPage(body), before) || true,
      });
      const body = typeof got === "string" ? got : got.body;
      const relay = typeof got === "string" ? null : got.relay;
      const parsed = parseIndexPage(body);
      const problem = validateIndexPage(page, parsed, before);
      if (problem) throw new Error(problem);
      const sig = (rows) => JSON.stringify(rows);
      const status = sig(before) === sig(parsed.rows) ? "unchanged" : "changed";
      if (status === "changed") {
        next.categories[page.category] = parsed.rows;
        changed = true;
      }
      if (parsed.lastUpdate && parsed.lastUpdate > newest) newest = parsed.lastUpdate;
      summary.push({ category: page.category, classes: parsed.rows.length, status, relay });
      onPage(label, status, `${parsed.rows.length} classes` + (relay ? ` via ${relay}` : ""));
    } catch (e) {
      summary.push({ category: page.category, error: e.message });
      onPage(label, "error", e.message);
    }
  }
  if (changed) {
    next.lastUpdate = newest;
    next.fetchedAt = new Date().toISOString();
  }
  return { changed, index: next, summary };
}
