import { app } from "./firebase.js";
import { parseWorkbook } from "./parsers.js";
import { evaluate, SEVERITY_ORDER } from "./rules.js";
import {
  getRefData,
  importRefData,
  resetRefData,
  exportRefData,
  isCustomRefData,
} from "./refdata.js";
import { checkWebsite, getLastChecked } from "./updater.js";
import "./style.css";

const $ = (sel) => document.querySelector(sel);

let currentResults = null;
let currentMeta = null;

// ------------------------------------------------------------ ref badge

function renderRefBadge() {
  const ref = getRefData();
  $("#refVersion").textContent = ref.meta.version;
  $("#refUpdated").textContent = ref.meta.lastUpdated;
  $("#refSource").textContent = isCustomRefData()
    ? "(" + (ref.meta.updatedBy || "imported") + ")"
    : "";
  const checked = getLastChecked();
  $("#refChecked").textContent = checked
    ? " · site checked " + new Date(checked).toLocaleDateString()
    : "";
}

// ---------------------------------------------------------- update panel

function renderLastChecked() {
  const checked = getLastChecked();
  $("#lastCheckedLabel").textContent = checked
    ? "Last checked " + new Date(checked).toLocaleString()
    : "Never checked from this browser yet.";
}

function openUpdatePanel() {
  const ref = getRefData();
  const list = $("#sourceList");
  list.innerHTML = "";
  const linkItems = [...(ref.meta.watchPages || []), ...(ref.meta.sources || [])];
  const seen = new Set();
  for (const s of linkItems) {
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = s.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = s.label;
    li.appendChild(a);
    list.appendChild(li);
  }
  renderLastChecked();
  $("#checkStatus").innerHTML = "";
  $("#updNotice").className = "notice hidden";
  $("#updatePanel").showModal();
}

function setupUpdatePanel() {
  $("#btnUpdate").addEventListener("click", openUpdatePanel);
  $("#btnCloseUpdate").addEventListener("click", () => $("#updatePanel").close());

  $("#btnCheckSite").addEventListener("click", async () => {
    const btn = $("#btnCheckSite");
    const list = $("#checkStatus");
    const notice = $("#updNotice");
    btn.disabled = true;
    list.innerHTML = "";
    notice.className = "notice hidden";
    const rows = new Map();
    const onPage = (label, status, detail) => {
      let li = rows.get(label);
      if (!li) {
        li = document.createElement("li");
        rows.set(label, li);
        list.appendChild(li);
      }
      li.innerHTML =
        `<span class="st ${status}">${status}</span><span>${label}` +
        (detail ? ` <span class="muted">— ${detail}</span>` : "") +
        `</span>`;
    };
    try {
      const result = await checkWebsite(onPage);
      renderRefBadge();
      renderLastChecked();
      const parts = [];
      if (result.newAdjustments.length)
        parts.push(
          `${result.newAdjustments.length} factored-HP change(s) pulled in and applied`
        );
      if (result.changedPages.length)
        parts.push(
          `${result.changedPages.length} page(s) changed since last check — open them below to review`
        );
      notice.className = "notice ok";
      notice.textContent = parts.length
        ? "Check finished: " + parts.join("; ") + "."
        : "Check finished: no changes detected on the watched pages.";
      if (result.newAdjustments.length && currentMeta) rerun();
    } catch (e) {
      notice.className = "notice err";
      notice.textContent =
        "Live check failed (the relay services may be blocked or down): " + e.message;
    }
    btn.disabled = false;
  });

  $("#btnExportRef").addEventListener("click", () => {
    const blob = new Blob([exportRefData()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "techcardx-refdata.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("#refImportFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const notice = $("#updNotice");
    try {
      const obj = JSON.parse(await file.text());
      importRefData(obj, file.name);
      renderRefBadge();
      notice.className = "notice ok";
      notice.textContent =
        "Reference data updated from " + file.name + ". Re-run any open upload to apply.";
      if (currentMeta) rerun();
    } catch (err) {
      notice.className = "notice err";
      notice.textContent = "Import failed: " + err.message;
    }
    e.target.value = "";
  });

  $("#btnResetRef").addEventListener("click", () => {
    resetRefData();
    renderRefBadge();
    const notice = $("#updNotice");
    notice.className = "notice ok";
    notice.textContent = "Reverted to the bundled dataset.";
    if (currentMeta) rerun();
  });
}

// -------------------------------------------------------------- uploads

function setupDropzone() {
  const dz = $("#dropzone");
  const input = $("#fileInput");
  dz.addEventListener("click", () => input.click());
  dz.addEventListener("dragover", (e) => {
    e.preventDefault();
    dz.classList.add("drag");
  });
  dz.addEventListener("dragleave", () => dz.classList.remove("drag"));
  dz.addEventListener("drop", (e) => {
    e.preventDefault();
    dz.classList.remove("drag");
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  input.addEventListener("change", () => {
    if (input.files[0]) handleFile(input.files[0]);
    input.value = "";
  });
}

async function handleFile(file) {
  $("#fileError").textContent = "";
  try {
    const buf = await file.arrayBuffer();
    const { format, records, fileName } = parseWorkbook(new Uint8Array(buf), file.name);
    currentMeta = { format, fileName: file.name, count: records.length, records };
    rerun();
  } catch (err) {
    $("#fileError").textContent = err.message;
  }
}

function rerun() {
  if (!currentMeta) return;
  currentResults = evaluate(currentMeta.records);
  $("#uploadInfo").textContent =
    `${currentMeta.fileName} — ${currentMeta.count} cards ` +
    `(${currentMeta.format === "tcnd" ? "TCND division export" : "Compulink track export"})`;
  populateCategoryFilter();
  renderSummary();
  renderTable();
  $("#resultsSection").classList.remove("hidden");
}

// -------------------------------------------------------------- results

function filteredResults() {
  const sev = $("#sevFilter").value;
  const cat = $("#catFilter").value;
  const q = $("#searchBox").value.trim().toLowerCase();
  return currentResults
    .filter((r) => {
      if (sev === "flagged" && r.maxSeverity === "clean") return false;
      if (sev !== "all" && sev !== "flagged" && r.maxSeverity !== sev) return false;
      if (cat !== "all" && r.record.category !== cat) return false;
      if (q) {
        const hay = [
          r.record.carNumber, r.record.firstName, r.record.lastName,
          r.record.klass, r.record.bodyType, r.record.engineMake,
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.maxSeverity] - SEVERITY_ORDER[b.maxSeverity] ||
        (a.record.carNumber || "").localeCompare(b.record.carNumber || "", undefined, {
          numeric: true,
          sensitivity: "base",
        })
    );
}

function populateCategoryFilter() {
  const cats = [...new Set(currentResults.map((r) => r.record.category).filter(Boolean))].sort();
  const sel = $("#catFilter");
  const prev = sel.value;
  sel.innerHTML = '<option value="all">All categories</option>';
  for (const c of cats) {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    sel.appendChild(o);
  }
  if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
}

function renderSummary() {
  const counts = { problem: 0, warning: 0, info: 0, clean: 0 };
  for (const r of currentResults) counts[r.maxSeverity]++;
  $("#statTotal").textContent = currentResults.length;
  $("#statProblem").textContent = counts.problem;
  $("#statWarning").textContent = counts.warning;
  $("#statInfo").textContent = counts.info;
  $("#statClean").textContent = counts.clean;
}

function renderTable() {
  const tbody = $("#resultsBody");
  tbody.innerHTML = "";
  const rows = filteredResults();
  $("#shownCount").textContent = rows.length;
  for (const r of rows) {
    const rec = r.record;
    const tr = document.createElement("tr");
    tr.className = `entry sev-${r.maxSeverity}`;
    tr.innerHTML = `
      <td class="mono">${esc(rec.carNumber) || "—"}</td>
      <td>${esc(rec.firstName)} ${esc(rec.lastName)}</td>
      <td class="mono">${esc(rec.category)}</td>
      <td class="mono">${esc(rec.klass) || "—"}</td>
      <td>${esc(rec.engineMake)} ${rec.engineYear ?? ""} ${rec.cui ? rec.cui + "ci" : ""}</td>
      <td>${esc(rec.bodyType)} ${rec.bodyYear ?? ""}</td>
      <td>${rec.hp ?? "—"} / ${rec.factoredHp ?? "—"}</td>
      <td><span class="pill ${r.maxSeverity}">${r.maxSeverity === "clean" ? "OK" : r.flags.length + " flag" + (r.flags.length > 1 ? "s" : "")}</span></td>`;
    tbody.appendChild(tr);
    if (r.flags.length) {
      const fr = document.createElement("tr");
      fr.className = "flagrow hidden";
      const td = document.createElement("td");
      td.colSpan = 8;
      td.innerHTML = r.flags
        .map(
          (f) =>
            `<div class="flag"><span class="pill ${f.severity}">${f.severity}</span>` +
            `<span class="msg">${esc(f.message)} <span class="muted mono">[${f.code}]</span></span></div>`
        )
        .join("");
      fr.appendChild(td);
      tbody.appendChild(fr);
      tr.addEventListener("click", () => fr.classList.toggle("hidden"));
    }
  }
}

function exportCsv() {
  if (!currentResults) return;
  const rows = [
    [
      "CarNumber", "Driver", "Category", "Class", "Engine", "Body",
      "HP", "FactoredHP", "Severity", "Flags",
    ],
  ];
  for (const r of filteredResults()) {
    if (r.maxSeverity === "clean") continue;
    const rec = r.record;
    rows.push([
      rec.carNumber,
      `${rec.firstName} ${rec.lastName}`.trim(),
      rec.category,
      rec.klass,
      `${rec.engineMake} ${rec.engineYear ?? ""} ${rec.cui ?? ""}`.trim(),
      `${rec.bodyType} ${rec.bodyYear ?? ""}`.trim(),
      rec.hp ?? "",
      rec.factoredHp ?? "",
      r.maxSeverity,
      r.flags.map((f) => `[${f.severity}] ${f.message}`).join(" | "),
    ]);
  }
  const csv = rows
    .map((row) => row.map((c) => '"' + String(c ?? "").replace(/"/g, '""') + '"').join(","))
    .join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "problem-children.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

// Build the print sheet from the current filters (flagged cards only,
// sorted problems-first) and open the browser print dialog.
function printProblemList() {
  if (!currentResults) return;
  const ref = getRefData();
  const rows = filteredResults().filter((r) => r.maxSeverity !== "clean");
  const cat = $("#catFilter").value;
  const sheet = $("#printSheet");
  const now = new Date();
  sheet.innerHTML =
    `<h1>Problem Child List — Tech Review</h1>` +
    `<div class="meta">${esc(currentMeta.fileName)} · ${rows.length} flagged of ${currentResults.length} cards` +
    (cat !== "all" ? ` · category ${esc(cat)}` : "") +
    ` · printed ${now.toLocaleString()} · NHRA data v${esc(ref.meta.version)} (updated ${esc(ref.meta.lastUpdated)})</div>` +
    `<div class="phead">Event: <span class="line md"></span>　Inspector: <span class="line md"></span>　Date: <span class="line sm"></span></div>` +
    rows
      .map((r) => {
        const rec = r.record;
        return (
          `<div class="pcar ${r.maxSeverity}">` +
          `<div class="head">#${esc(rec.carNumber) || "—"} · ${esc(rec.firstName)} ${esc(rec.lastName)} · ${esc(rec.category)} ${esc(rec.klass)}</div>` +
          `<div class="sub">${esc(rec.engineMake)} ${rec.engineYear ?? "?"} ${rec.cui ? rec.cui + "ci" : ""} · ` +
          `${esc(rec.bodyType)} ${rec.bodyYear ?? ""} · HP ${rec.hp ?? "—"} / factored ${rec.factoredHp ?? "—"}</div>` +
          r.flags
            .map(
              (f) =>
                `<div class="pflag"><span class="box"></span><span class="sev">${f.severity}</span>${esc(f.message)}` +
                `<div class="answer">Answer: <span class="line xl"></span></div></div>`
            )
            .join("") +
          `<div class="verify">Verified — Body style: <span class="line sm"></span>　Class: <span class="line sm"></span>` +
          `　Factored HP: <span class="line xs"></span>　Min weight: <span class="line xs"></span>` +
          `　Cleared by: <span class="line sm"></span></div>` +
          `</div>`
        );
      })
      .join("") +
    `<div class="footer">TechCardX screening aid — final classification per the current NHRA Rulebook &amp; Classification Guide. Check each box as it is cleared and write the answer on the line.</div>`;
  window.print();
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// ---------------------------------------------------------------- boot

renderRefBadge();
setupUpdatePanel();
setupDropzone();
$("#sevFilter").addEventListener("change", renderTable);
$("#catFilter").addEventListener("change", renderTable);
$("#searchBox").addEventListener("input", renderTable);
$("#btnExportCsv").addEventListener("click", exportCsv);
$("#btnPrint").addEventListener("click", printProblemList);

console.log("TechCardX ready — Firebase project:", app.options.projectId);
