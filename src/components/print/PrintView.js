import { renderPlaySvg } from "../designer/playRenderer.js";
import { toast } from "../../state/store.js";

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function metaChips(play) {
  const chips = [];
  if (play.formationName) chips.push(play.formationName);
  if (play.personnel) chips.push(`Personnel: ${play.personnel}`);
  if (play.runPassRPO) chips.push(play.runPassRPO);
  if (play.down) chips.push(`${play.down} & ${play.distance || "-"}`);
  if (play.hash) chips.push(`Hash: ${play.hash}`);
  if (play.fieldPosition) chips.push(play.fieldPosition);
  (play.situationTags || []).forEach((s) => chips.push(s));
  return chips.map((c) => `<span class="meta-chip">${esc(c)}</span>`).join("");
}

export function buildPlayPageHtml(play, playbook, opts = {}) {
  const { detail = "full", pageNumber = null, colorMode = "color" } = opts;
  const svg = renderPlaySvg(play, { branding: playbook.branding });
  const assignments = (play.coachingPoints || []).filter((c) => c.text?.trim());
  return `
    <div class="print-page play-print-page ${detail === "diagram" ? "diagram-only" : ""} ${colorMode === "bw" ? "bw" : ""}">
      <div class="play-print-header">
        <div>
          <h1 class="play-print-title">${esc(play.name)}</h1>
          <div class="play-print-sub">${esc(playbook.team || "")} ${playbook.season ? "• " + esc(playbook.season) : ""}</div>
        </div>
        ${play.number ? `<div class="play-print-number">#${esc(play.number)}</div>` : ""}
      </div>
      <div class="meta-strip">${metaChips(play)}</div>
      <div class="play-print-body">
        <div class="play-print-diagram">${svg}</div>
        <div class="play-print-side">
          ${play.notes ? `<div class="side-block"><h4>Notes</h4><p>${esc(play.notes)}</p></div>` : ""}
          ${assignments.length ? `<div class="side-block"><h4>Coaching Points</h4><ul>${assignments.map((a) => `<li>${esc(a.text)}</li>`).join("")}</ul></div>` : ""}
          ${play.concept ? `<div class="side-block"><h4>Concept</h4><p>${esc(play.concept)}</p></div>` : ""}
        </div>
      </div>
      <div class="page-footer-label">${esc(playbook.name || "")}</div>
      ${pageNumber ? `<div class="page-number">${pageNumber}</div>` : ""}
    </div>
  `;
}

export function buildCoverPageHtml(playbook) {
  const b = playbook.branding || {};
  return `
    <div class="print-page">
      <div class="cover-page">
        ${b.logo ? `<img class="cover-logo" src="${b.logo}"/>` : ""}
        <h1 class="cover-team" style="color:${b.primaryColor || "#1e5c33"}">${esc(playbook.team || "Team")}</h1>
        <div class="cover-title">${esc(playbook.name || "Playbook")}</div>
        <div class="cover-bar" style="background:${b.accentColor || "#d5342e"}"></div>
        <div class="cover-season">${esc(playbook.season || "")} Season</div>
        ${playbook.coachName ? `<div class="cover-coach">Head Coach: ${esc(playbook.coachName)}</div>` : ""}
      </div>
    </div>
  `;
}

export function buildTocPageHtml(playbook, entries) {
  const bySection = {};
  entries.forEach((e) => {
    const key = e.sectionName || "Other";
    bySection[key] = bySection[key] || [];
    bySection[key].push(e);
  });
  let list = "";
  Object.entries(bySection).forEach(([sec, items]) => {
    list += `<div class="toc-section-heading">${esc(sec)}</div>`;
    items.forEach((it) => {
      list += `<div class="toc-row"><span>${esc(it.title)}</span><span class="toc-page-num">${it.page ?? ""}</span></div>`;
    });
  });
  return `
    <div class="print-page toc-page">
      <h1>Table of Contents</h1>
      <div class="toc-list">${list}</div>
    </div>
  `;
}

export function buildSectionDividerHtml(section, playbook) {
  const b = playbook.branding || {};
  return `
    <div class="print-page">
      <div class="section-divider-page">
        <div class="divider-bar" style="background:${b.primaryColor || "#1e5c33"}"></div>
        <h1>${esc(section.name)}</h1>
        <p>${esc(playbook.team || "")}</p>
      </div>
    </div>
  `;
}

export function buildNotesPageHtml(title = "Notes") {
  return `<div class="print-page notes-page"><h1>${esc(title)}</h1><div class="notes-lines"></div></div>`;
}

export function buildBlankPageHtml() {
  return `<div class="print-page blank-page"></div>`;
}

function writeAndPrint(html) {
  const root = document.getElementById("print-root");
  root.innerHTML = html;
  setTimeout(() => {
    window.print();
  }, 80);
}

export function openPrintPlay(play, playbook, opts = {}) {
  if (!play || !playbook) return;
  writeAndPrint(buildPlayPageHtml(play, playbook, opts));
  toast("Opening print dialog…");
}

export function buildPlaybookPagesHtml(playbook, pageList, opts = {}) {
  let pageNum = 1;
  let html = "";
  if (opts.includeCover !== false) { html += buildCoverPageHtml(playbook); pageNum++; }
  const entries = [];
  let runningPage = pageNum + (opts.includeToc !== false ? 1 : 0);
  const preview = [];
  pageList.forEach((pg) => {
    if (pg.type === "play") {
      const play = playbook.plays.find((p) => p.id === pg.refId);
      if (play) { preview.push({ type: "play", play, page: runningPage }); runningPage++; }
    } else if (pg.type === "section") {
      const sec = playbook.sections.find((s) => s.id === pg.refId);
      if (sec) { preview.push({ type: "section", section: sec, page: runningPage }); runningPage++; }
    } else {
      preview.push({ type: pg.type, page: runningPage });
      runningPage++;
    }
  });
  if (opts.includeToc !== false) {
    const tocEntries = [];
    let curSection = "General";
    preview.forEach((p) => {
      if (p.type === "section") curSection = p.section.name;
      if (p.type === "play") tocEntries.push({ title: p.play.name, sectionName: curSection, page: p.page });
    });
    html += buildTocPageHtml(playbook, tocEntries);
  }
  preview.forEach((p) => {
    if (p.type === "play") html += buildPlayPageHtml(p.play, playbook, { ...opts, pageNumber: opts.pageNumbers === false ? null : p.page });
    else if (p.type === "section") html += buildSectionDividerHtml(p.section, playbook);
    else if (p.type === "notes") html += buildNotesPageHtml();
    else if (p.type === "blank") html += buildBlankPageHtml();
  });
  return html;
}

export function openPrintPlaybook(playbook, pageList, opts = {}) {
  const html = buildPlaybookPagesHtml(playbook, pageList, opts);
  writeAndPrint(html);
  toast("Opening print dialog for playbook…");
}

export function downloadPlaybookHtml(playbook, pageList, opts = {}) {
  const inner = buildPlaybookPagesHtml(playbook, pageList, opts);
  const printCss = document.querySelector('link[href*="print.css"]');
  const doc = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(playbook.name)}</title>
  <style>
  @page{ size: letter portrait; margin:0; }
  *{box-sizing:border-box;}
  body{margin:0;font-family:Arial,sans-serif;background:#fff;}
  .print-page{width:8.5in;height:11in;padding:0.55in 0.5in 0.55in 1in;page-break-after:always;position:relative;background:#fff;color:#111;overflow:hidden;}
  .print-page:last-child{page-break-after:auto;}
  .print-page .page-number{position:absolute;bottom:0.28in;right:0.5in;font-size:9pt;color:#555;}
  .print-page .page-footer-label{position:absolute;bottom:0.28in;left:1in;font-size:9pt;color:#555;}
  .cover-page{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;height:100%;}
  .cover-page .cover-logo{max-width:180px;max-height:180px;margin-bottom:22px;object-fit:contain;}
  .cover-page .cover-team{font-size:30pt;font-weight:800;margin:0;}
  .cover-page .cover-title{font-size:16pt;font-weight:600;color:#333;margin:6px 0 0;}
  .cover-page .cover-season{font-size:12pt;color:#555;margin-top:18px;}
  .cover-page .cover-coach{font-size:11pt;color:#555;margin-top:4px;}
  .cover-page .cover-bar{width:120px;height:5px;margin:22px 0;border-radius:3px;}
  .toc-page h1{font-size:18pt;border-bottom:2px solid #222;padding-bottom:8px;margin-bottom:16px;}
  .toc-list{font-size:11pt;}
  .toc-section-heading{font-weight:800;text-transform:uppercase;font-size:10.5pt;margin:14px 0 4px;color:#333;}
  .toc-row{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dotted #bbb;}
  .section-divider-page{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;height:100%;}
  .section-divider-page .divider-bar{width:70px;height:8px;border-radius:4px;margin-bottom:16px;}
  .section-divider-page h1{font-size:26pt;margin:0;}
  .play-print-header{display:flex;justify-content:space-between;border-bottom:2px solid #222;padding-bottom:8px;margin-bottom:10px;}
  .play-print-title{font-size:17pt;font-weight:800;margin:0;}
  .play-print-sub{font-size:10pt;color:#444;}
  .play-print-number{font-size:22pt;font-weight:800;color:#333;}
  .meta-strip{display:flex;flex-wrap:wrap;gap:10px;font-size:9pt;margin-bottom:10px;}
  .meta-chip{border:1px solid #999;border-radius:10px;padding:2px 9px;color:#333;}
  .play-print-body{display:flex;gap:14px;}
  .play-print-diagram{flex:1.3;border:1px solid #ccc;border-radius:4px;overflow:hidden;background:#0c3b1f;}
  .play-print-diagram svg{width:100%;height:auto;display:block;}
  .play-print-side{flex:1;font-size:9.5pt;}
  .side-block{margin-bottom:10px;}
  .side-block h4{font-size:9.5pt;text-transform:uppercase;margin:0 0 4px;border-bottom:1px solid #ccc;padding-bottom:2px;}
  .diagram-only .play-print-side{display:none;}
  .diagram-only .play-print-diagram{flex:1;}
  .notes-page .notes-lines{height:8.5in;margin-top:20px;background-image:repeating-linear-gradient(to bottom, transparent, transparent 27px, #ccc 28px);}
  </style>
  </head><body>${inner}</body></html>`;
  const blob = new Blob([doc], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(playbook.name || "playbook").replace(/[^a-z0-9-_ ]/gi, "").trim() || "playbook"}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast("Playbook downloaded as a printable HTML file", "success");
}
