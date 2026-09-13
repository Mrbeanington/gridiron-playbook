import { getActivePlaybook, navigate, toggleFavorite, duplicatePlayAction, deletePlay, toast, setPlaybookPages } from "../../state/store.js";
import { renderPlaySvg } from "../designer/playRenderer.js";
import { confirmDialog, emptyState } from "../common/common.js";
import { uid } from "../../utils/id.js";

const state = { query: "", category: "all", view: "grid", sort: "updated", favOnly: false, selected: new Set() };

export async function mount(container) {
  const pb = getActivePlaybook();
  container.innerHTML = `
    <div class="section-title">Play Library</div>
    <div class="library-toolbar">
      <div class="search-wrap"><span class="search-icon">🔎</span><input type="search" placeholder="Search plays, concepts, tags…" data-el="search" value="${escapeHtml(state.query)}"/></div>
      <button class="filter-chip ${state.category === "all" ? "active" : ""}" data-cat="all">All</button>
      <button class="filter-chip ${state.category === "offense" ? "active" : ""}" data-cat="offense">Offense</button>
      <button class="filter-chip ${state.category === "defense" ? "active" : ""}" data-cat="defense">Defense</button>
      <button class="filter-chip ${state.category === "specialteams" ? "active" : ""}" data-cat="specialteams">Special Teams</button>
      <button class="filter-chip ${state.favOnly ? "active" : ""}" data-fav="1">⭐ Favorites</button>
      <select data-el="sort">
        <option value="updated" ${state.sort === "updated" ? "selected" : ""}>Recently Edited</option>
        <option value="name" ${state.sort === "name" ? "selected" : ""}>Name (A–Z)</option>
        <option value="number" ${state.sort === "number" ? "selected" : ""}>Play Number</option>
      </select>
      <div class="topbar-spacer"></div>
      <span class="text-muted" data-el="selcount"></span>
      <button class="btn btn-sm" data-a="addtoplaybook">+ Add Selected to Playbook</button>
      <div class="view-toggle">
        <button data-view="grid" class="${state.view === "grid" ? "active" : ""}">▦</button>
        <button data-view="list" class="${state.view === "list" ? "active" : ""}">☰</button>
      </div>
    </div>
    <div data-el="results"></div>
  `;
  const els = {
    search: container.querySelector('[data-el="search"]'),
    sort: container.querySelector('[data-el="sort"]'),
    results: container.querySelector('[data-el="results"]'),
    selcount: container.querySelector('[data-el="selcount"]'),
  };

  function filtered() {
    const pb2 = getActivePlaybook();
    let list = pb2.plays.slice();
    if (state.category !== "all") list = list.filter((p) => p.category === state.category);
    if (state.favOnly) list = list.filter((p) => p.favorite);
    if (state.query.trim()) {
      const q = state.query.toLowerCase();
      list = list.filter((p) =>
        [p.name, p.formationName, p.concept, p.personnel, p.notes, ...(p.tags || []), ...(p.situationTags || [])]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(q))
      );
    }
    if (state.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (state.sort === "number") list.sort((a, b) => (a.number || "").localeCompare(b.number || "", undefined, { numeric: true }));
    else list.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    return list;
  }

  function renderResults() {
    const pb2 = getActivePlaybook();
    const list = filtered();
    els.selcount.textContent = state.selected.size ? `${state.selected.size} selected` : "";
    if (!list.length) {
      els.results.innerHTML = "";
      els.results.appendChild(
        emptyState({
          title: "No plays match your filters",
          message: pb2.plays.length ? "Try clearing the search or filters." : "Create your first play to get started.",
        })
      );
      return;
    }
    if (state.view === "grid") {
      els.results.innerHTML = `<div class="play-grid">${list.map((p) => gridCard(p, pb2)).join("")}</div>`;
    } else {
      els.results.innerHTML = `
        <div class="scroll-x"><table class="play-list-table">
          <thead><tr><th></th><th></th><th>Name</th><th>Category</th><th>Formation</th><th>Concept</th><th>Down &amp; Dist</th><th>Updated</th><th></th></tr></thead>
          <tbody>${list.map((p) => listRow(p, pb2)).join("")}</tbody>
        </table></div>`;
    }
    bindResultEvents();
  }

  function gridCard(p, pb2) {
    const svg = renderPlaySvg(p, { branding: pb2.branding, fit: "slice" });
    return `<div class="play-card ${state.selected.has(p.id) ? "selected" : ""}" data-id="${p.id}">
      <div class="thumb-wrap" data-open="${p.id}">${svg}<button class="fav-btn" data-fav="${p.id}">${p.favorite ? "★" : "☆"}</button></div>
      <div class="card-body">
        <div class="flex items-center gap-8">
          <input type="checkbox" data-select="${p.id}" ${state.selected.has(p.id) ? "checked" : ""}/>
          <div class="card-title" data-open="${p.id}" style="cursor:pointer;">${escapeHtml(p.name)}</div>
        </div>
        <div class="card-meta">
          <span class="tag tag-${tagClass(p.category)}">${p.category}</span>
          ${p.formationName ? `<span>${escapeHtml(p.formationName)}</span>` : ""}
          ${p.down ? `<span>${escapeHtml(p.down)}&amp;${escapeHtml(p.distance || "-")}</span>` : ""}
        </div>
        <div class="card-actions">
          <button class="btn btn-sm" data-open="${p.id}">Open</button>
          <button class="btn btn-sm" data-dup="${p.id}">Duplicate</button>
          <button class="btn btn-sm btn-danger" data-del="${p.id}">Delete</button>
        </div>
      </div>
    </div>`;
  }

  function listRow(p, pb2) {
    const svg = renderPlaySvg(p, { branding: pb2.branding, fit: "slice" });
    return `<tr class="${state.selected.has(p.id) ? "selected" : ""}" data-open="${p.id}">
      <td onclick="event.stopPropagation()"><input type="checkbox" data-select="${p.id}" ${state.selected.has(p.id) ? "checked" : ""}/></td>
      <td><div class="mini-thumb">${svg}</div></td>
      <td>${escapeHtml(p.name)} ${p.favorite ? "★" : ""}</td>
      <td><span class="tag tag-${tagClass(p.category)}">${p.category}</span></td>
      <td>${escapeHtml(p.formationName || "—")}</td>
      <td>${escapeHtml(p.concept || "—")}</td>
      <td>${p.down ? escapeHtml(p.down) + " & " + escapeHtml(p.distance || "-") : "—"}</td>
      <td>${p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "—"}</td>
      <td onclick="event.stopPropagation()"><button class="btn btn-sm" data-dup="${p.id}">⧉</button> <button class="btn btn-sm btn-danger" data-del="${p.id}">🗑</button></td>
    </tr>`;
  }

  function bindResultEvents() {
    els.results.querySelectorAll("[data-open]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        navigate("designer", { playId: el.dataset.open });
      })
    );
    els.results.querySelectorAll("[data-fav]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(el.dataset.fav);
        renderResults();
      })
    );
    els.results.querySelectorAll("[data-select]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (state.selected.has(el.dataset.select)) state.selected.delete(el.dataset.select);
        else state.selected.add(el.dataset.select);
        renderResults();
      })
    );
    els.results.querySelectorAll("[data-dup]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        duplicatePlayAction(el.dataset.dup);
        toast("Play duplicated", "success");
        renderResults();
      })
    );
    els.results.querySelectorAll("[data-del]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        confirmDialog({
          title: "Delete Play",
          message: "This permanently removes the play from your playbook. This can't be undone.",
          confirmLabel: "Delete",
          onConfirm: () => { deletePlay(el.dataset.del); toast("Play deleted"); renderResults(); },
        });
      })
    );
  }

  container.querySelectorAll("[data-cat]").forEach((el) => el.addEventListener("click", () => { state.category = el.dataset.cat; mount(container); }));
  container.querySelector('[data-fav="1"]').addEventListener("click", () => { state.favOnly = !state.favOnly; mount(container); });
  container.querySelectorAll("[data-view]").forEach((el) => el.addEventListener("click", () => { state.view = el.dataset.view; mount(container); }));
  els.search.addEventListener("input", () => { state.query = els.search.value; renderResults(); });
  els.sort.addEventListener("change", () => { state.sort = els.sort.value; renderResults(); });
  container.querySelector('[data-a="addtoplaybook"]').addEventListener("click", () => {
    if (!state.selected.size) { toast("Select plays first"); return; }
    const pb2 = getActivePlaybook();
    const newPages = [...pb2.playbookPages];
    state.selected.forEach((id) => newPages.push({ id: uid("pg"), type: "play", refId: id }));
    setPlaybookPages(newPages);
    toast(`Added ${state.selected.size} play(s) to the playbook`, "success");
    state.selected.clear();
    renderResults();
  });

  renderResults();
  return () => {};
}

function tagClass(cat) {
  return cat === "offense" ? "offense" : cat === "defense" ? "defense" : "special";
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
