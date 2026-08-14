// Live update check against nhraracer.com.
//
// Browsers cannot fetch nhraracer.com directly (no CORS headers there), so
// requests go through public CORS relays, tried in order. Each watched page
// is fetched, reduced to text, and compared with the snapshot from the last
// check; changelog-style lines ("Chev 1969 396 375/405 change to 396
// 375/409") found in any page are parsed and merged into the active
// dataset's hpAdjustments. Every check stamps meta.lastChecked; merged
// changes also stamp meta.lastUpdated.

import { getRefData, importRefData } from "./refdata.js";

const PROXIES = [
  (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
  (u) => "https://corsproxy.io/?url=" + encodeURIComponent(u),
  (u) => "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(u),
];

const SNAP_KEY = "techcardx.snapshots";
const CHECK_KEY = "techcardx.lastChecked";

function hashText(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

function htmlToText(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,noscript").forEach((n) => n.remove());
  return (doc.body?.textContent || "").replace(/\s+/g, " ").trim();
}

async function fetchViaProxies(url, timeoutMs = 15000) {
  let lastErr = null;
  for (const wrap of PROXIES) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(wrap(url), { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const body = await res.text();
      if (body.length < 200) throw new Error("Empty response");
      return body;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("All relays failed");
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
      const html = await fetchViaProxies(page.url);
      const text = htmlToText(html);
      const h = hashText(text);
      const prev = snaps[page.url];
      let status = "unchanged";
      if (!prev) status = "new";
      else if (prev.hash !== h) status = "changed";
      snaps[page.url] = { hash: h, date: new Date().toISOString(), length: text.length };
      if (status !== "unchanged") changedPages.push({ label: page.label, url: page.url, status });
      foundAdjustments.push(...parseChangelog(text));
      onPage(page.label, status);
    } catch (e) {
      onPage(page.label, "error", e.message);
    }
  }

  // merge any newly discovered adjustments into the active dataset
  const existing = new Set((ref.hpAdjustments || []).map(adjKey));
  const fresh = foundAdjustments.filter((a) => !existing.has(adjKey(a)));
  if (fresh.length) {
    const updated = JSON.parse(JSON.stringify(ref));
    updated.hpAdjustments = [...(ref.hpAdjustments || []), ...fresh];
    updated.meta.lastUpdated = new Date().toISOString().slice(0, 10);
    importRefData(updated, "website check");
  }

  const checkedAt = new Date().toISOString();
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify(snaps));
    localStorage.setItem(CHECK_KEY, checkedAt);
  } catch {}

  return { checkedAt, changedPages, newAdjustments: fresh };
}
