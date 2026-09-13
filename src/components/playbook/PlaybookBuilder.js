import {
  getActivePlaybook, setPlaybookPages, updatePlaybookMeta, updateBranding, toast,
  exportPlaybookObject, importPlaybook,
} from "../../state/store.js";
import { openPrintPlaybook, downloadPlaybookHtml } from "../print/PrintView.js";
import { openModal, confirmDialog } from "../common/common.js";
import { uid } from "../../utils/id.js";

const printOpts = { colorMode: "color", detail: "full", pageNumbers: true, includeCover: true, includeToc: true };

export async function mount(container) {
  const pb = getActivePlaybook();

  container.innerHTML = `
    <div class="section-title">Playbook Builder</div>
    <div class="card" style="margin-bottom:18px;">
      <p class="panel-title">Cover Page</p>
      <div class="form-row">
        <div class="field"><label>Playbook Title</label><input type="text" data-f="name" value="${escapeHtml(pb.name)}"/></div>
        <div class="field"><label>Team Name</label><input type="text" data-f="team" value="${escapeHtml(pb.team)}"/></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Season</label><input type="text" data-f="season" value="${escapeHtml(pb.season)}"/></div>
        <div class="field"><label>Coach Name</label><input type="text" data-f="coachName" value="${escapeHtml(pb.coachName)}"/></div>
      </div>
      <div class="field"><label>Team Logo</label>
        <div class="flex items-center gap-12">
          ${pb.branding.logo ? `<img src="${pb.branding.logo}" style="height:44px;border-radius:6px;background:#fff;padding:2px;"/>` : ""}
          <input type="file" accept="image/*" data-f="logo"/>
          ${pb.branding.logo ? `<button class="btn btn-sm btn-ghost" data-a="removelogo">Remove</button>` : ""}
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:18px;">
      <p class="panel-title">Print &amp; Export Options</p>
      <div class="form-row">
        <div class="field"><label>Color Mode</label><select data-p="colorMode"><option value="color">Color</option><option value="bw">Black &amp; White</option></select></div>
        <div class="field"><label>Detail Level</label><select data-p="detail"><option value="full">Diagram + Assignments</option><option value="diagram">Diagram Only</option></select></div>
      </div>
      <div class="form-row">
        <label class="checkbox-row"><input type="checkbox" data-p="includeCover" checked/> Include cover page</label>
        <label class="checkbox-row"><input type="checkbox" data-p="includeToc" checked/> Include table of contents</label>
        <label class="checkbox-row"><input type="checkbox" data-p="pageNumbers" checked/> Page numbers</label>
      </div>
      <div class="flex gap-8" style="margin-top:10px;flex-wrap:wrap;">
        <button class="btn btn-primary" data-a="print">🖨 Print Playbook</button>
        <button class="btn" data-a="download">⬇ Download Playbook (HTML)</button>
        <button class="btn" data-a="exportjson">⬇ Export Playbook Data (JSON)</button>
        <label class="btn" style="cursor:pointer;">⬆ Import Playbook<input type="file" accept="application/json" data-el="importfile" style="display:none;"/></label>
      </div>
      <p class="hint" style="margin-top:8px;">Printing opens your browser's print dialog — choose "Save as PDF" there for a PDF file, or print directly to paper for a 3-ring binder (extra-wide left margin included).</p>
    </div>

    <div class="section-title">Pages<button class="btn btn-sm" data-a="addsection">+ Section Divider</button><button class="btn btn-sm" data-a="addnotes">+ Notes Page</button><button class="btn btn-sm" data-a="addblank">+ Blank Page</button><button class="btn btn-sm btn-primary" data-a="addplays">+ Add Plays</button></div>
    <p class="text-muted">Drag rows to reorder. Cover and table of contents are generated automatically from these options.</p>
    <div class="playbook-tree" data-el="pages"></div>
  `;

  function pageTitle(pg) {
    if (pg.type === "play") return pb.plays.find((p) => p.id === pg.refId)?.name || "(deleted play)";
    if (pg.type === "section") return pb.sections.find((s) => s.id === pg.refId)?.name || "(deleted section)";
    if (pg.type === "notes") return "Notes Page";
    if (pg.type === "blank") return "Blank Page";
    return "Page";
  }

  function renderPages() {
    const wrap = container.querySelector('[data-el="pages"]');
    const pages = pb.playbookPages;
    if (!pages.length) {
      wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">📖</div><h3>No pages yet</h3><p>Add plays from the library, or use the buttons above to add section dividers and pages.</p></div>`;
      return;
    }
    wrap.innerHTML = pages
      .map(
        (pg, i) => `<div class="playbook-page-row" draggable="true" data-idx="${i}">
          <span class="drag-handle">⠿</span>
          <span class="page-type-badge">${pg.type}</span>
          <span class="page-title">${escapeHtml(pageTitle(pg))}</span>
          <button class="btn btn-icon btn-ghost" data-up="${i}" title="Move up">↑</button>
          <button class="btn btn-icon btn-ghost" data-down="${i}" title="Move down">↓</button>
          <button class="btn btn-icon btn-ghost" data-remove="${i}" title="Remove">✕</button>
        </div>`
      )
      .join("");

    let dragIdx = null;
    wrap.querySelectorAll(".playbook-page-row").forEach((row) => {
      row.addEventListener("dragstart", () => { dragIdx = Number(row.dataset.idx); row.classList.add("dragging"); });
      row.addEventListener("dragend", () => row.classList.remove("dragging"));
      row.addEventListener("dragover", (e) => e.preventDefault());
      row.addEventListener("drop", () => {
        const dropIdx = Number(row.dataset.idx);
        if (dragIdx === null || dragIdx === dropIdx) return;
        const arr = pb.playbookPages.slice();
        const [moved] = arr.splice(dragIdx, 1);
        arr.splice(dropIdx, 0, moved);
        setPlaybookPages(arr);
        renderPages();
      });
    });
    wrap.querySelectorAll("[data-up]").forEach((btn) => btn.addEventListener("click", () => moveRow(Number(btn.dataset.up), -1)));
    wrap.querySelectorAll("[data-down]").forEach((btn) => btn.addEventListener("click", () => moveRow(Number(btn.dataset.down), 1)));
    wrap.querySelectorAll("[data-remove]").forEach((btn) => btn.addEventListener("click", () => {
      const arr = pb.playbookPages.slice();
      arr.splice(Number(btn.dataset.remove), 1);
      setPlaybookPages(arr);
      renderPages();
    }));
  }

  function moveRow(i, dir) {
    const arr = pb.playbookPages.slice();
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setPlaybookPages(arr);
    renderPages();
  }

  renderPages();

  // Cover page bindings
  container.querySelector('[data-f="name"]').addEventListener("change", (e) => updatePlaybookMeta({ name: e.target.value }));
  container.querySelector('[data-f="team"]').addEventListener("change", (e) => updatePlaybookMeta({ team: e.target.value }));
  container.querySelector('[data-f="season"]').addEventListener("change", (e) => updatePlaybookMeta({ season: e.target.value }));
  container.querySelector('[data-f="coachName"]').addEventListener("change", (e) => updatePlaybookMeta({ coachName: e.target.value }));
  const logoInput = container.querySelector('[data-f="logo"]');
  logoInput.addEventListener("change", () => {
    const file = logoInput.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast("Logo image is too large (max 3MB)", "danger"); return; }
    const reader = new FileReader();
    reader.onload = () => { updateBranding({ logo: reader.result }); toast("Logo updated", "success"); mount(container); };
    reader.readAsDataURL(file);
  });
  const removeLogoBtn = container.querySelector('[data-a="removelogo"]');
  if (removeLogoBtn) removeLogoBtn.addEventListener("click", () => { updateBranding({ logo: null }); mount(container); });

  // Print option bindings
  container.querySelector('[data-p="colorMode"]').value = printOpts.colorMode;
  container.querySelector('[data-p="detail"]').value = printOpts.detail;
  container.querySelector('[data-p="colorMode"]').addEventListener("change", (e) => (printOpts.colorMode = e.target.value));
  container.querySelector('[data-p="detail"]').addEventListener("change", (e) => (printOpts.detail = e.target.value));
  container.querySelector('[data-p="includeCover"]').addEventListener("change", (e) => (printOpts.includeCover = e.target.checked));
  container.querySelector('[data-p="includeToc"]').addEventListener("change", (e) => (printOpts.includeToc = e.target.checked));
  container.querySelector('[data-p="pageNumbers"]').addEventListener("change", (e) => (printOpts.pageNumbers = e.target.checked));

  container.querySelector('[data-a="print"]').addEventListener("click", () => {
    if (!pb.playbookPages.length) { toast("Add at least one page first", "danger"); return; }
    openPrintPlaybook(pb, pb.playbookPages, printOpts);
  });
  container.querySelector('[data-a="download"]').addEventListener("click", () => {
    if (!pb.playbookPages.length) { toast("Add at least one page first", "danger"); return; }
    downloadPlaybookHtml(pb, pb.playbookPages, printOpts);
  });
  container.querySelector('[data-a="exportjson"]').addEventListener("click", () => {
    const data = exportPlaybookObject(pb);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(pb.name || "playbook").replace(/[^a-z0-9-_ ]/gi, "").trim() || "playbook"}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast("Playbook data exported", "success");
  });
  container.querySelector('[data-el="importfile"]').addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importPlaybook(reader.result);
        toast("Playbook imported", "success");
        mount(container);
      } catch (err) {
        toast(err.message, "danger");
      }
    };
    reader.readAsText(file);
  });

  container.querySelector('[data-a="addsection"]').addEventListener("click", () => {
    openModal({
      title: "Add Section Divider",
      bodyHtml: `<div class="field"><label>Section</label><select data-f="sec">${pb.sections.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("")}</select></div>`,
      onMount: (body, close) => {
        const footer = document.createElement("div");
        footer.className = "modal-footer";
        footer.innerHTML = `<button class="btn" data-a="cancel">Cancel</button><button class="btn btn-primary" data-a="add">Add</button>`;
        body.parentElement.appendChild(footer);
        footer.querySelector('[data-a="cancel"]').addEventListener("click", close);
        footer.querySelector('[data-a="add"]').addEventListener("click", () => {
          const secId = body.querySelector('[data-f="sec"]').value;
          setPlaybookPages([...pb.playbookPages, { id: uid("pg"), type: "section", refId: secId }]);
          close();
          mount(container);
        });
      },
    });
  });
  container.querySelector('[data-a="addnotes"]').addEventListener("click", () => {
    setPlaybookPages([...pb.playbookPages, { id: uid("pg"), type: "notes" }]);
    renderPages();
  });
  container.querySelector('[data-a="addblank"]').addEventListener("click", () => {
    setPlaybookPages([...pb.playbookPages, { id: uid("pg"), type: "blank" }]);
    renderPages();
  });
  container.querySelector('[data-a="addplays"]').addEventListener("click", () => {
    const selected = new Set();
    openModal({
      title: "Add Plays to Playbook",
      wide: true,
      bodyHtml: `<div class="scroll-x" style="max-height:50vh;"><table class="play-list-table"><thead><tr><th></th><th>Name</th><th>Category</th><th>Formation</th></tr></thead>
        <tbody>${pb.plays.map((p) => `<tr><td><input type="checkbox" data-pick="${p.id}"/></td><td>${escapeHtml(p.name)}</td><td>${p.category}</td><td>${escapeHtml(p.formationName || "—")}</td></tr>`).join("")}</tbody>
      </table></div>`,
      onMount: (body, close) => {
        body.querySelectorAll("[data-pick]").forEach((cb) => cb.addEventListener("change", () => {
          if (cb.checked) selected.add(cb.dataset.pick); else selected.delete(cb.dataset.pick);
        }));
        const footer = document.createElement("div");
        footer.className = "modal-footer";
        footer.innerHTML = `<button class="btn" data-a="cancel">Cancel</button><button class="btn btn-primary" data-a="add">Add Selected</button>`;
        body.parentElement.appendChild(footer);
        footer.querySelector('[data-a="cancel"]').addEventListener("click", close);
        footer.querySelector('[data-a="add"]').addEventListener("click", () => {
          const arr = [...pb.playbookPages, ...[...selected].map((id) => ({ id: uid("pg"), type: "play", refId: id }))];
          setPlaybookPages(arr);
          close();
          mount(container);
        });
      },
    });
  });

  return () => {};
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
