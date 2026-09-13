import { OFFENSE_FORMATIONS, DEFENSE_FORMATIONS } from "../../utils/formations.js";
import { newPlay, applyFormationToPlay } from "../../state/models.js";
import { addPlay, navigate, getActivePlaybook } from "../../state/store.js";
import { renderPlaySvg } from "../designer/playRenderer.js";

export async function mount(container) {
  container.innerHTML = `
    <div class="section-title">Formations</div>
    <p class="text-muted">Start a new play from a preset formation. Everything stays fully editable afterward.</p>
    <h3>Offensive Formations</h3>
    <div class="play-grid" data-el="off"></div>
    <h3 style="margin-top:24px;">Defensive Fronts</h3>
    <div class="play-grid" data-el="def"></div>
  `;
  const pb = getActivePlaybook();
  const offGrid = container.querySelector('[data-el="off"]');
  const defGrid = container.querySelector('[data-el="def"]');

  Object.keys(OFFENSE_FORMATIONS).forEach((name) => {
    let p = newPlay({ name, category: "offense", formationName: name });
    p = applyFormationToPlay(p, name, "offense");
    const card = document.createElement("div");
    card.className = "play-card";
    card.innerHTML = `<div class="thumb-wrap">${renderPlaySvg(p, { branding: pb.branding, fit: "slice" })}</div>
      <div class="card-body"><div class="card-title">${name}</div><button class="btn btn-sm btn-primary btn-block" data-use>Create Play</button></div>`;
    card.querySelector("[data-use]").addEventListener("click", () => {
      addPlay(p);
      navigate("designer", { playId: p.id });
    });
    offGrid.appendChild(card);
  });

  Object.keys(DEFENSE_FORMATIONS).forEach((name) => {
    let p = newPlay({ name, category: "defense", formationName: name });
    p = applyFormationToPlay(p, name, "defense");
    const card = document.createElement("div");
    card.className = "play-card";
    card.innerHTML = `<div class="thumb-wrap">${renderPlaySvg(p, { branding: pb.branding, fit: "slice" })}</div>
      <div class="card-body"><div class="card-title">${name}</div><button class="btn btn-sm btn-primary btn-block" data-use>Create Play</button></div>`;
    card.querySelector("[data-use]").addEventListener("click", () => {
      addPlay(p);
      navigate("designer", { playId: p.id });
    });
    defGrid.appendChild(card);
  });

  return () => {};
}
