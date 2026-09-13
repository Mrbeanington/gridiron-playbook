import { getActivePlaybook, navigate, addPlay } from "../../state/store.js";
import { newPlay } from "../../state/models.js";
import { mountPlayDesigner } from "./PlayDesigner.js";
import { emptyState, openModal } from "../common/common.js";

export async function mount(container, params) {
  if (params.playId) {
    return mountPlayDesigner(container, params.playId);
  }
  const pb = getActivePlaybook();
  const recent = [...(pb?.plays || [])].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")).slice(0, 6);
  container.classList.remove("no-pad", "no-scroll");
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="section-title">Play Designer<button class="btn btn-primary" data-a="new">+ New Play</button></div>
    ${recent.length ? `<p class="text-muted">Continue editing a recent play, or start a new one.</p>` : ""}
    <div class="play-grid" data-el="recent"></div>
  `;
  container.appendChild(wrap);
  if (!recent.length) {
    wrap.querySelector('[data-el="recent"]').replaceWith(
      emptyState({
        title: "No plays yet",
        message: "Create your first play from scratch, or pick a formation to get started fast.",
        actionLabel: "Create a Play",
        onAction: () => openNewPlayModal(),
      })
    );
  } else {
    const grid = wrap.querySelector('[data-el="recent"]');
    grid.innerHTML = recent
      .map(
        (p) => `<div class="play-card" data-open="${p.id}"><div class="card-body">
        <div class="card-title">${p.name}</div>
        <div class="card-meta"><span class="tag tag-${p.category === "offense" ? "offense" : p.category === "defense" ? "defense" : "special"}">${p.category}</span>${p.formationName ? `<span>${p.formationName}</span>` : ""}</div>
      </div></div>`
      )
      .join("");
    grid.querySelectorAll("[data-open]").forEach((el) => el.addEventListener("click", () => navigate("designer", { playId: el.dataset.open })));
  }
  wrap.querySelector('[data-a="new"]').addEventListener("click", () => openNewPlayModal());
  return () => {};
}

export function openNewPlayModal() {
  openModal({
    title: "Create a New Play",
    bodyHtml: `
      <div class="field"><label>Play Name</label><input type="text" data-f="name" value="Untitled Play"/></div>
      <div class="field"><label>Category</label>
        <select data-f="category">
          <option value="offense">Offense</option>
          <option value="defense">Defense</option>
          <option value="specialteams">Special Teams</option>
        </select>
      </div>
      <div class="field"><label>Field View</label>
        <select data-f="fieldView">
          <option value="full">Full Field</option>
          <option value="half">Half Field</option>
          <option value="redzone">Red Zone</option>
          <option value="goalline">Goal Line</option>
        </select>
      </div>
    `,
    onMount: (body, close) => {
      const footer = document.createElement("div");
      footer.className = "modal-footer";
      footer.innerHTML = `<button class="btn" data-a="cancel">Cancel</button><button class="btn btn-primary" data-a="create">Create Play</button>`;
      body.parentElement.appendChild(footer);
      footer.querySelector('[data-a="cancel"]').addEventListener("click", close);
      footer.querySelector('[data-a="create"]').addEventListener("click", () => {
        const name = body.querySelector('[data-f="name"]').value || "Untitled Play";
        const category = body.querySelector('[data-f="category"]').value;
        const fieldView = body.querySelector('[data-f="fieldView"]').value;
        const play = newPlay({ name, category, fieldView });
        addPlay(play);
        close();
        navigate("designer", { playId: play.id });
      });
    },
  });
}
