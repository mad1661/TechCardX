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
}

// ---------------------------------------------------------- update panel

function openUpdatePanel() {
  const ref = getRefData();
  const list = $("#sourceList");
  list.innerHTML = "";
  for (const s of ref.meta.sources || []) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = s.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = s.label;
    li.appendChild(a);
    list.appendChild(li);
  }
  $("#updNotice").className = "notice hidden";
  $("#updatePanel").showModal();
}

function setupUpdatePanel() {
  $("#btnUpdate").addEventListener("click", openUpdatePanel);
  $("#btnCloseUpdate").addEventListener("click", () => $("#updatePanel").close());

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
        (a.record.category || "").localeCompare(b.record.category || "") ||
        (a.record.carNumber || "").localeCompare(b.record.carNumber || "")
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

console.log("TechCardX ready — Firebase project:", app.options.projectId);
