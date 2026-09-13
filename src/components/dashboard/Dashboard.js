import { getActivePlaybook, navigate } from "../../state/store.js";
import { renderPlaySvg } from "../designer/playRenderer.js";
import { openNewPlayModal } from "../designer/DesignerView.js";
import { emptyState } from "../common/common.js";

export async function mount(container) {
  const pb = getActivePlaybook();
  const plays = pb?.plays || [];
  const counts = {
    total: plays.length,
    offense: plays.filter((p) => p.category === "offense").length,
    defense: plays.filter((p) => p.category === "defense").length,
    specialteams: plays.filter((p) => p.category === "specialteams").length,
  };
  const recent = [...plays].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")).slice(0, 4);
  const favorites = plays.filter((p) => p.favorite).slice(0, 4);

  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="flex items-center justify-between" style="margin-bottom:16px;">
      <div>
        <h1 style="margin:0 0 4px;font-size:22px;">Welcome back${pb?.coachName ? ", Coach " + escapeHtml(pb.coachName) : ""}</h1>
        <p class="text-muted" style="margin:0;">${escapeHtml(pb?.team || "")} — ${escapeHtml(pb?.name || "")}</p>
      </div>
      <div class="flex gap-8">
        <button class="btn" data-a="continue">Continue Editing</button>
        <button class="btn btn-primary" data-a="new">+ Quick Create</button>
      </div>
    </div>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-value">${counts.total}</div><div class="stat-label">Total Plays</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--offense-color)">${counts.offense}</div><div class="stat-label">Offensive Plays</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--defense-color)">${counts.defense}</div><div class="stat-label">Defensive Plays</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--warning)">${counts.specialteams}</div><div class="stat-label">Special Teams</div></div>
    </div>
    <div class="section-title">Recently Edited</div>
    <div class="play-grid" data-el="recent"></div>
    <div class="section-title">Favorites</div>
    <div class="play-grid" data-el="favorites"></div>
  `;
  container.appendChild(wrap);

  const recentGrid = wrap.querySelector('[data-el="recent"]');
  if (!recent.length) {
    recentGrid.replaceWith(emptyState({ title: "No plays yet", message: "Create your first play or start with a template.", actionLabel: "Create a Play", onAction: () => openNewPlayModal() }));
  } else {
    recentGrid.innerHTML = recent.map((p) => playCardHtml(p, pb)).join("");
    bindCards(recentGrid);
  }
  const favGrid = wrap.querySelector('[data-el="favorites"]');
  if (!favorites.length) {
    favGrid.replaceWith(emptyState({ icon: "⭐", title: "No favorites yet", message: "Star plays in the designer or library to pin them here." }));
  } else {
    favGrid.innerHTML = favorites.map((p) => playCardHtml(p, pb)).join("");
    bindCards(favGrid);
  }

  wrap.querySelector('[data-a="new"]').addEventListener("click", () => openNewPlayModal());
  wrap.querySelector('[data-a="continue"]').addEventListener("click", () => {
    if (recent[0]) navigate("designer", { playId: recent[0].id });
    else openNewPlayModal();
  });

  return () => {};
}

function playCardHtml(p, pb) {
  const svg = renderPlaySvg(p, { branding: pb.branding, fit: "slice" });
  return `<div class="play-card" data-open="${p.id}">
    <div class="thumb-wrap">${svg}</div>
    <div class="card-body">
      <div class="card-title">${escapeHtml(p.name)}</div>
      <div class="card-meta"><span class="tag tag-${p.category === "offense" ? "offense" : p.category === "defense" ? "defense" : "special"}">${p.category}</span></div>
    </div>
  </div>`;
}

function bindCards(el) {
  el.querySelectorAll("[data-open]").forEach((card) => card.addEventListener("click", () => navigate("designer", { playId: card.dataset.open })));
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
