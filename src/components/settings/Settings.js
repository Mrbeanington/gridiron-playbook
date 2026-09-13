import {
  getState, getActivePlaybook, updatePlaybookMeta, updateBranding, setActivePlaybookId,
  createPlaybook, deletePlaybook, resetAllData, toast, setTheme,
} from "../../state/store.js";
import { confirmDialog } from "../common/common.js";
import { DEFAULT_BRANDING } from "../../utils/constants.js";

const COLOR_FIELDS = [
  ["primaryColor", "Primary (brand)"],
  ["secondaryColor", "Secondary"],
  ["accentColor", "Accent"],
  ["fieldColor", "Field Color"],
  ["offenseColor", "Offense Players"],
  ["defenseColor", "Defense Players"],
  ["routeColor", "Routes"],
  ["blockColor", "Blocking"],
  ["motionColor", "Motion"],
  ["readColor", "Reads/Keys"],
  ["ballColor", "Football"],
];

const SHORTCUTS = [
  ["Ctrl/Cmd + Z", "Undo"],
  ["Ctrl/Cmd + Shift + Z", "Redo"],
  ["Ctrl/Cmd + D", "Duplicate selected player"],
  ["Delete / Backspace", "Delete selected object"],
  ["Escape", "Cancel drawing / deselect"],
  ["Enter", "Finish a route/block/motion path"],
  ["Double-click", "Finish a route/block/motion path"],
  ["Shift + Click", "Add to selection"],
];

export async function mount(container) {
  const pb = getActivePlaybook();
  const { playbooks } = getState();

  container.innerHTML = `
    <div class="section-title">Settings</div>

    <p class="panel-title">Playbooks</p>
    <div class="card" style="margin-bottom:18px;">
      <div class="flex items-center gap-8" style="flex-wrap:wrap;">
        <select data-el="pbselect" style="max-width:280px;">${playbooks.map((p) => `<option value="${p.id}" ${p.id === pb.id ? "selected" : ""}>${escapeHtml(p.name)} (${escapeHtml(p.team)})</option>`).join("")}</select>
        <button class="btn btn-sm" data-a="newpb">+ New Playbook</button>
        <button class="btn btn-sm btn-danger" data-a="delpb">Delete This Playbook</button>
      </div>
    </div>

    <p class="panel-title">Team Information</p>
    <div class="card" style="margin-bottom:18px;">
      <div class="form-row">
        <div class="field"><label>Team Name</label><input type="text" data-f="team" value="${escapeHtml(pb.team)}"/></div>
        <div class="field"><label>Season</label><input type="text" data-f="season" value="${escapeHtml(pb.season)}"/></div>
      </div>
      <div class="field"><label>Coach Name</label><input type="text" data-f="coachName" value="${escapeHtml(pb.coachName)}"/></div>
    </div>

    <p class="panel-title">Branding &amp; Colors</p>
    <div class="card" style="margin-bottom:18px;">
      <div class="form-row" style="flex-wrap:wrap;">
        ${COLOR_FIELDS.map(([key, label]) => `<div class="field" style="min-width:150px;"><label>${label}</label><input type="color" data-c="${key}" value="${pb.branding[key] || "#000000"}"/></div>`).join("")}
      </div>
      <button class="btn btn-sm" data-a="resetcolors">Reset to Defaults</button>
    </div>

    <p class="panel-title">Appearance</p>
    <div class="card" style="margin-bottom:18px;">
      <label class="checkbox-row"><input type="checkbox" data-f="theme" ${getState().ui.theme === "dark" ? "checked" : ""}/> Dark Mode</label>
    </div>

    <p class="panel-title">Keyboard Shortcuts</p>
    <div class="card" style="margin-bottom:18px;">
      ${SHORTCUTS.map(([k, d]) => `<div class="flex items-center justify-between" style="padding:4px 0;"><span class="kbd">${k}</span><span class="text-muted">${d}</span></div>`).join("")}
    </div>

    <p class="panel-title">Data</p>
    <div class="card">
      <p class="hint">Everything is stored locally in this browser (IndexedDB). Use Playbook Builder to export/import JSON backups.</p>
      <button class="btn btn-danger" data-a="reset">Reset All Application Data</button>
    </div>
  `;

  container.querySelector('[data-el="pbselect"]').addEventListener("change", (e) => { setActivePlaybookId(e.target.value); });
  container.querySelector('[data-a="newpb"]').addEventListener("click", () => {
    const pbNew = createPlaybook({ name: "New Playbook", team: "New Team" });
    toast("New playbook created", "success");
    mount(container);
  });
  container.querySelector('[data-a="delpb"]').addEventListener("click", () => {
    if (playbooks.length <= 1) { toast("You need at least one playbook.", "danger"); return; }
    confirmDialog({
      title: "Delete Playbook",
      message: `Delete "${pb.name}" and all its plays permanently? This cannot be undone.`,
      confirmLabel: "Delete Playbook",
      onConfirm: () => { deletePlaybook(pb.id); toast("Playbook deleted"); mount(container); },
    });
  });

  container.querySelector('[data-f="team"]').addEventListener("change", (e) => updatePlaybookMeta({ team: e.target.value }));
  container.querySelector('[data-f="season"]').addEventListener("change", (e) => updatePlaybookMeta({ season: e.target.value }));
  container.querySelector('[data-f="coachName"]').addEventListener("change", (e) => updatePlaybookMeta({ coachName: e.target.value }));

  container.querySelectorAll("[data-c]").forEach((input) => {
    input.addEventListener("input", () => updateBranding({ [input.dataset.c]: input.value }));
  });
  container.querySelector('[data-a="resetcolors"]').addEventListener("click", () => { updateBranding({ ...DEFAULT_BRANDING, logo: pb.branding.logo }); toast("Colors reset"); mount(container); });

  container.querySelector('[data-f="theme"]').addEventListener("change", (e) => setTheme(e.target.checked ? "dark" : "light"));

  container.querySelector('[data-a="reset"]').addEventListener("click", () => {
    confirmDialog({
      title: "Reset All Application Data",
      message: "This permanently deletes every playbook and play stored in this browser, restoring the demo content. This cannot be undone. Consider exporting a backup first.",
      confirmLabel: "Erase Everything",
      onConfirm: async () => { await resetAllData(); toast("Application data reset"); mount(container); },
    });
  });

  return () => {};
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
