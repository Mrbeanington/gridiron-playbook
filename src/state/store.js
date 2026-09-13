import { dbGetAll, dbPut, dbDelete } from "../storage/db.js";
import { STORAGE_KEYS } from "../utils/constants.js";
import { newPlaybook, duplicatePlay as dupPlay, createVariation as makeVariation, cloneDeep, sanitizePlay } from "./models.js";
import { buildDemoPlaybook } from "./demoContent.js";
import { nowIso, uid } from "../utils/id.js";

const listeners = new Set();

const state = {
  ready: false,
  playbooks: [],
  activePlaybookId: null,
  view: { name: "dashboard", params: {} },
  ui: {
    theme: localStorage.getItem("gridiron.theme") || "dark",
    sidebarOpen: false,
    toasts: [],
  },
  designer: {
    tool: "select",
    selectedIds: [],
    zoom: 1,
    clipboard: null,
    history: {}, // playId -> { stack: [snapshot], pointer: number }
  },
  library: {
    query: "",
    category: "all",
    view: "grid",
    sort: "updated",
    filters: {},
  },
};

function notify() {
  for (const fn of listeners) fn(state);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getState() {
  return state;
}

export function getActivePlaybook() {
  return state.playbooks.find((p) => p.id === state.activePlaybookId) || null;
}

export function getPlay(playId) {
  const pb = getActivePlaybook();
  if (!pb) return null;
  return pb.plays.find((p) => p.id === playId) || null;
}

/* ---------------------------------------------------------------- boot */
let saveTimer = null;

export async function boot() {
  let records = [];
  try {
    records = await dbGetAll();
  } catch (err) {
    console.error(err);
  }
  if (!records || records.length === 0) {
    const demo = buildDemoPlaybook();
    records = [demo];
    await dbPut(demo);
  }
  state.playbooks = records;
  const savedActive = localStorage.getItem(STORAGE_KEYS.ACTIVE_PLAYBOOK_LS);
  state.activePlaybookId = records.find((r) => r.id === savedActive)?.id || records[0]?.id || null;
  document.documentElement.setAttribute("data-theme", state.ui.theme);
  state.ready = true;
  notify();
}

function touchActivePlaybook(mutator) {
  const pb = getActivePlaybook();
  if (!pb) return;
  mutator(pb);
  pb.updatedAt = nowIso();
  persistActive();
  notify();
}

function persistActive() {
  const pb = getActivePlaybook();
  if (!pb) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    dbPut(cloneDeep(pb)).catch((e) => console.error("Autosave failed", e));
  }, 250);
}

export function toast(message, kind = "info") {
  const id = uid("toast");
  state.ui.toasts.push({ id, message, kind });
  notify();
  setTimeout(() => {
    state.ui.toasts = state.ui.toasts.filter((t) => t.id !== id);
    notify();
  }, 3400);
}

/* ---------------------------------------------------------------- nav */
export function navigate(name, params = {}) {
  state.view = { name, params };
  state.ui.sidebarOpen = false;
  notify();
}

export function setTheme(theme) {
  state.ui.theme = theme;
  localStorage.setItem("gridiron.theme", theme);
  document.documentElement.setAttribute("data-theme", theme);
  notify();
}

export function toggleSidebar(force) {
  state.ui.sidebarOpen = force !== undefined ? force : !state.ui.sidebarOpen;
  notify();
}

/* ---------------------------------------------------------------- playbooks */
export function createPlaybook(overrides) {
  const pb = newPlaybook(overrides);
  state.playbooks.push(pb);
  state.activePlaybookId = pb.id;
  localStorage.setItem(STORAGE_KEYS.ACTIVE_PLAYBOOK_LS, pb.id);
  dbPut(cloneDeep(pb));
  notify();
  return pb;
}

export function setActivePlaybookId(id) {
  state.activePlaybookId = id;
  localStorage.setItem(STORAGE_KEYS.ACTIVE_PLAYBOOK_LS, id);
  notify();
}

export function updatePlaybookMeta(patch) {
  touchActivePlaybook((pb) => Object.assign(pb, patch));
}

export function updateBranding(patch) {
  touchActivePlaybook((pb) => {
    pb.branding = { ...pb.branding, ...patch };
  });
}

export function deletePlaybook(id) {
  const wasActive = state.activePlaybookId === id;
  state.playbooks = state.playbooks.filter((p) => p.id !== id);
  dbDelete(id);
  if (wasActive) {
    state.activePlaybookId = state.playbooks[0]?.id || null;
  }
  notify();
}

export function importPlaybook(json) {
  let data;
  try {
    data = typeof json === "string" ? JSON.parse(json) : json;
  } catch (e) {
    throw new Error("That file isn't valid JSON.");
  }
  const payload = data && typeof data === "object" ? data.playbook || data : null;
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.plays)) {
    throw new Error("This doesn't look like a Gridiron Playbook export.");
  }
  const pb = newPlaybook({
    ...payload,
    id: undefined,
    name: (payload.name || "Imported Playbook") + " (Imported)",
  });
  // preserve original play/section ids for internal referential integrity
  pb.sections = payload.sections?.length ? payload.sections : pb.sections;
  pb.plays = (payload.plays || []).map(sanitizePlay);
  pb.playbookPages = payload.playbookPages || [];
  pb.installations = payload.installations || [];
  state.playbooks.push(pb);
  state.activePlaybookId = pb.id;
  localStorage.setItem(STORAGE_KEYS.ACTIVE_PLAYBOOK_LS, pb.id);
  dbPut(cloneDeep(pb));
  notify();
  return pb;
}

export function exportPlaybookObject(pb = getActivePlaybook()) {
  return { version: 1, exportedAt: nowIso(), playbook: cloneDeep(pb) };
}

/* ---------------------------------------------------------------- sections */
export function addSection(section) {
  touchActivePlaybook((pb) => pb.sections.push(section));
}
export function updateSection(id, patch) {
  touchActivePlaybook((pb) => {
    const s = pb.sections.find((x) => x.id === id);
    if (s) Object.assign(s, patch);
  });
}
export function deleteSection(id) {
  touchActivePlaybook((pb) => {
    pb.sections = pb.sections.filter((s) => s.id !== id);
    pb.plays.forEach((p) => {
      if (p.sectionId === id) p.sectionId = null;
    });
  });
}

/* ---------------------------------------------------------------- plays */
export function addPlay(play) {
  touchActivePlaybook((pb) => pb.plays.push(play));
  return play;
}

export function updatePlay(playId, patchOrFn) {
  touchActivePlaybook((pb) => {
    const idx = pb.plays.findIndex((p) => p.id === playId);
    if (idx < 0) return;
    const cur = pb.plays[idx];
    const patch = typeof patchOrFn === "function" ? patchOrFn(cur) : patchOrFn;
    pb.plays[idx] = { ...cur, ...patch, updatedAt: nowIso() };
  });
}

export function deletePlay(playId) {
  touchActivePlaybook((pb) => {
    pb.plays = pb.plays.filter((p) => p.id !== playId);
    pb.playbookPages = pb.playbookPages.filter((pg) => pg.refId !== playId);
  });
}

export function duplicatePlayAction(playId) {
  const pb = getActivePlaybook();
  const play = pb.plays.find((p) => p.id === playId);
  if (!play) return null;
  const copy = dupPlay(play);
  touchActivePlaybook((p) => p.plays.push(copy));
  return copy;
}

export function createVariationAction(playId) {
  const pb = getActivePlaybook();
  const play = pb.plays.find((p) => p.id === playId);
  if (!play) return null;
  const copy = makeVariation(play);
  touchActivePlaybook((p) => p.plays.push(copy));
  return copy;
}

export function toggleFavorite(playId) {
  touchActivePlaybook((pb) => {
    const p = pb.plays.find((x) => x.id === playId);
    if (p) p.favorite = !p.favorite;
  });
}

export function markPlayOpened(playId) {
  touchActivePlaybook((pb) => {
    const p = pb.plays.find((x) => x.id === playId);
    if (p) p.lastOpenedAt = nowIso();
  });
}

/* ---------------------------------------------------------------- playbook pages */
export function setPlaybookPages(pages) {
  touchActivePlaybook((pb) => {
    pb.playbookPages = pages;
  });
}

/* ---------------------------------------------------------------- installations */
export function addInstallation(inst) {
  touchActivePlaybook((pb) => pb.installations.push(inst));
}
export function updateInstallation(id, patch) {
  touchActivePlaybook((pb) => {
    const inst = pb.installations.find((i) => i.id === id);
    if (inst) Object.assign(inst, patch);
  });
}
export function deleteInstallation(id) {
  touchActivePlaybook((pb) => {
    pb.installations = pb.installations.filter((i) => i.id !== id);
  });
}

/* ---------------------------------------------------------------- reset */
export async function resetAllData() {
  for (const pb of state.playbooks) {
    await dbDelete(pb.id);
  }
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_PLAYBOOK_LS);
  const demo = buildDemoPlaybook();
  await dbPut(demo);
  state.playbooks = [demo];
  state.activePlaybookId = demo.id;
  notify();
}

/* ---------------------------------------------------------------- undo/redo (per-play, in-memory) */
export function pushHistory(playId, snapshotPlay) {
  const h = state.designer.history[playId] || { stack: [], pointer: -1 };
  const snap = cloneDeep(snapshotPlay);
  h.stack = h.stack.slice(0, h.pointer + 1);
  h.stack.push(snap);
  if (h.stack.length > 60) h.stack.shift();
  h.pointer = h.stack.length - 1;
  state.designer.history[playId] = h;
}

export function canUndo(playId) {
  const h = state.designer.history[playId];
  return !!h && h.pointer > 0;
}
export function canRedo(playId) {
  const h = state.designer.history[playId];
  return !!h && h.pointer < h.stack.length - 1;
}

export function undo(playId) {
  const h = state.designer.history[playId];
  if (!h || h.pointer <= 0) return null;
  h.pointer -= 1;
  const snap = cloneDeep(h.stack[h.pointer]);
  updatePlay(playId, () => snap);
  return snap;
}

export function redo(playId) {
  const h = state.designer.history[playId];
  if (!h || h.pointer >= h.stack.length - 1) return null;
  h.pointer += 1;
  const snap = cloneDeep(h.stack[h.pointer]);
  updatePlay(playId, () => snap);
  return snap;
}

export function initHistory(playId, play) {
  if (!state.designer.history[playId]) {
    state.designer.history[playId] = { stack: [cloneDeep(play)], pointer: 0 };
  }
}
