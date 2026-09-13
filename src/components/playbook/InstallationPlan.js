import { getActivePlaybook, addInstallation, updateInstallation, deleteInstallation, navigate } from "../../state/store.js";
import { confirmDialog, emptyState, openModal } from "../common/common.js";
import { uid } from "../../utils/id.js";

export async function mount(container) {
  const pb = getActivePlaybook();
  container.innerHTML = `
    <div class="section-title">Installation Plan<button class="btn btn-primary" data-a="new">+ New Installation Day</button></div>
    <p class="text-muted">Organize plays into install sessions for practice — Day 1, Day 2, game-plan installs, etc.</p>
    <div data-el="list"></div>
  `;
  const list = container.querySelector('[data-el="list"]');

  function render() {
    if (!pb.installations.length) {
      list.innerHTML = "";
      list.appendChild(emptyState({ icon: "🗓️", title: "No installation days yet", message: "Group plays into sessions to plan your install schedule.", actionLabel: "Create Installation Day", onAction: newDay }));
      return;
    }
    list.innerHTML = pb.installations
      .map(
        (inst) => `<div class="card" style="margin-bottom:14px;" data-inst="${inst.id}">
          <div class="flex items-center justify-between">
            <div>
              <strong>${escapeHtml(inst.name)}</strong>
              <span class="text-muted"> — ${escapeHtml(inst.date || "no date set")}</span>
            </div>
            <div class="flex gap-8">
              <button class="btn btn-sm" data-addplay="${inst.id}">+ Add Play</button>
              <button class="btn btn-sm btn-danger" data-del="${inst.id}">Delete</button>
            </div>
          </div>
          <div class="divider"></div>
          ${
            inst.items?.length
              ? `<ul style="margin:0;padding-left:18px;">${inst.items
                  .map((it) => {
                    const play = pb.plays.find((p) => p.id === it.playId);
                    return `<li style="margin-bottom:4px;"><a href="#" data-open="${it.playId}">${escapeHtml(play?.name || "(deleted play)")}</a> ${it.notes ? `<span class="text-muted">— ${escapeHtml(it.notes)}</span>` : ""} <button class="btn btn-icon btn-ghost" data-removeitem="${inst.id}:${it.playId}">✕</button></li>`;
                  })
                  .join("")}</ul>`
              : `<p class="hint">No plays added to this session yet.</p>`
          }
        </div>`
      )
      .join("");

    list.querySelectorAll("[data-open]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); navigate("designer", { playId: a.dataset.open }); }));
    list.querySelectorAll("[data-del]").forEach((btn) =>
      btn.addEventListener("click", () =>
        confirmDialog({
          title: "Delete Installation Day",
          message: "This removes the session (not the plays themselves).",
          onConfirm: () => { deleteInstallation(btn.dataset.del); render(); },
        })
      )
    );
    list.querySelectorAll("[data-removeitem]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const [instId, playId] = btn.dataset.removeitem.split(":");
        const inst = pb.installations.find((i) => i.id === instId);
        updateInstallation(instId, { items: inst.items.filter((it) => it.playId !== playId) });
        render();
      })
    );
    list.querySelectorAll("[data-addplay]").forEach((btn) => btn.addEventListener("click", () => addPlayToInstall(btn.dataset.addplay)));
  }

  function newDay() {
    addInstallation({ id: uid("inst"), name: `Day ${pb.installations.length + 1}`, date: "", items: [] });
    render();
  }

  function addPlayToInstall(instId) {
    openModal({
      title: "Add Play to Installation",
      bodyHtml: `<div class="field"><label>Play</label><select data-f="play">${pb.plays.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("")}</select></div>
        <div class="field"><label>Notes</label><input type="text" data-f="notes" placeholder="Reps, emphasis..."/></div>`,
      onMount: (body, close) => {
        const footer = document.createElement("div");
        footer.className = "modal-footer";
        footer.innerHTML = `<button class="btn" data-a="cancel">Cancel</button><button class="btn btn-primary" data-a="add">Add</button>`;
        body.parentElement.appendChild(footer);
        footer.querySelector('[data-a="cancel"]').addEventListener("click", close);
        footer.querySelector('[data-a="add"]').addEventListener("click", () => {
          const playId = body.querySelector('[data-f="play"]').value;
          const notes = body.querySelector('[data-f="notes"]').value;
          const inst = pb.installations.find((i) => i.id === instId);
          updateInstallation(instId, { items: [...(inst.items || []), { playId, notes }] });
          close();
          render();
        });
      },
    });
  }

  container.querySelector('[data-a="new"]').addEventListener("click", newDay);
  render();
  return () => {};
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
