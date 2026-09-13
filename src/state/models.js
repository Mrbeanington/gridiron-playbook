import { uid, nowIso } from "../utils/id.js";
import { SCHEMA_VERSION, FIELD, DEFAULT_SECTIONS, DEFAULT_BRANDING } from "../utils/constants.js";
import { buildFormation } from "../utils/formations.js";

export function createPlayer(tpl, ballX, losY) {
  return {
    id: uid("plyr"),
    x: ballX + (tpl.dx || 0),
    y: losY + (tpl.dy || 0),
    position: tpl.position || "WR",
    label: tpl.label || tpl.position || "P",
    number: tpl.number || "",
    team: tpl.team || "offense",
    color: null,
    locked: false,
    groupId: null,
    rotation: 0,
  };
}

export function newPlay(overrides = {}) {
  const category = overrides.category || "offense";
  const fieldView = overrides.fieldView || "full";
  const length = FIELD.VIEWS[fieldView].length;
  const losY = overrides.lineOfScrimmageY ?? Math.round(length * 0.62);
  const ballX = FIELD.WIDTH / 2;
  const play = {
    id: uid("play"),
    name: overrides.name || "Untitled Play",
    number: overrides.number || "",
    category,
    sectionId: overrides.sectionId || null,
    formationName: overrides.formationName || "",
    personnel: overrides.personnel || "",
    concept: overrides.concept || "",
    runPassRPO: overrides.runPassRPO || "Run",
    down: overrides.down || "",
    distance: overrides.distance || "",
    fieldPosition: overrides.fieldPosition || "",
    hash: overrides.hash || "Middle",
    situationTags: overrides.situationTags || [],
    tags: overrides.tags || [],
    fieldView,
    orientation: overrides.orientation || "vertical",
    lineOfScrimmageY: losY,
    players: overrides.players || [],
    routes: overrides.routes || [],
    blocks: overrides.blocks || [],
    motions: overrides.motions || [],
    shapes: overrides.shapes || [],
    texts: overrides.texts || [],
    ball: overrides.ball || { x: ballX, y: losY, playerId: null },
    coachingPoints: overrides.coachingPoints || [],
    notes: overrides.notes || "",
    favorite: overrides.favorite || false,
    parentPlayId: overrides.parentPlayId || null,
    family: overrides.family || "",
    installDay: overrides.installDay || null,
    practice: overrides.practice || { installDate: "", period: "", reps: "", emphasis: "", corrections: "" },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  return play;
}

/**
 * Normalizes a play object that may have come from outside this app (a JSON
 * import, a hand-edited backup, a future/older schema version) so every
 * array/field the rest of the app assumes exists actually does. Missing or
 * wrong-typed fields fall back to the same defaults `newPlay()` uses, rather
 * than the app throwing later when it hits an unexpected `undefined`.
 */
export function sanitizePlay(raw) {
  const base = newPlay({});
  const r = raw && typeof raw === "object" ? raw : {};
  const arr = (v) => (Array.isArray(v) ? v : []);
  const fieldView = FIELD.VIEWS[r.fieldView] ? r.fieldView : base.fieldView;
  return {
    ...base,
    ...r,
    id: r.id || base.id,
    fieldView,
    orientation: r.orientation === "horizontal" ? "horizontal" : "vertical",
    lineOfScrimmageY: typeof r.lineOfScrimmageY === "number" ? r.lineOfScrimmageY : base.lineOfScrimmageY,
    players: arr(r.players),
    routes: arr(r.routes),
    blocks: arr(r.blocks),
    motions: arr(r.motions),
    shapes: arr(r.shapes),
    texts: arr(r.texts),
    coachingPoints: arr(r.coachingPoints),
    situationTags: arr(r.situationTags),
    tags: arr(r.tags),
    ball: r.ball && typeof r.ball === "object" ? { x: 0, y: 0, playerId: null, ...r.ball } : base.ball,
    practice: { ...base.practice, ...(r.practice && typeof r.practice === "object" ? r.practice : {}) },
  };
}

export function applyFormationToPlay(play, formationName, side) {
  const templates = buildFormation(formationName, side);
  if (!templates.length) return play;
  const ballX = play.ball?.x ?? FIELD.WIDTH / 2;
  const losY = play.lineOfScrimmageY;
  const existingOther = play.players.filter((p) => p.team !== side);
  const created = templates.map((t) => createPlayer(t, ballX, losY));
  return { ...play, players: [...existingOther, ...created], formationName: side === "offense" ? formationName : play.formationName };
}

export function newSection(name, category, parentId = null) {
  return { id: uid("sec"), name, category, parentId, order: 0 };
}

export function newPlaybook(overrides = {}) {
  return {
    version: SCHEMA_VERSION,
    id: uid("pbk"),
    name: overrides.name || "My Playbook",
    team: overrides.team || "My Team",
    season: overrides.season || String(new Date().getFullYear()),
    coachName: overrides.coachName || "",
    branding: { ...DEFAULT_BRANDING, ...(overrides.branding || {}) },
    sections: overrides.sections || DEFAULT_SECTIONS.map((s) => ({ ...s, parentId: null, order: 0 })),
    plays: overrides.plays || [],
    installations: overrides.installations || [],
    playbookPages: overrides.playbookPages || [],
    settings: {
      units: "yards",
      defaultFieldView: "full",
      theme: "dark",
      printOptions: { color: "color", detail: "full", pageNumbers: true },
      ...(overrides.settings || {}),
    },
    createdAt: overrides.createdAt || nowIso(),
    updatedAt: overrides.updatedAt || nowIso(),
  };
}

export function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function duplicatePlay(play, nameSuffix = " (Copy)") {
  const copy = cloneDeep(play);
  copy.id = uid("play");
  copy.name = play.name + nameSuffix;
  copy.createdAt = nowIso();
  copy.updatedAt = nowIso();
  copy.favorite = false;
  const remapIds = (arr) =>
    (arr || []).map((o) => ({ ...o, id: uid("obj") }));
  // Remap player ids and keep route/motion playerId references intact
  const idMap = {};
  copy.players = (play.players || []).map((p) => {
    const newId = uid("plyr");
    idMap[p.id] = newId;
    return { ...cloneDeep(p), id: newId };
  });
  copy.routes = (play.routes || []).map((r) => ({ ...cloneDeep(r), id: uid("route"), playerId: idMap[r.playerId] || r.playerId }));
  copy.motions = (play.motions || []).map((m) => ({ ...cloneDeep(m), id: uid("motion"), playerId: idMap[m.playerId] || m.playerId }));
  copy.blocks = remapIds(play.blocks);
  copy.shapes = remapIds(play.shapes);
  copy.texts = remapIds(play.texts);
  copy.coachingPoints = remapIds(play.coachingPoints);
  if (copy.ball?.playerId) copy.ball = { ...copy.ball, playerId: idMap[copy.ball.playerId] || null };
  return copy;
}

export function createVariation(play) {
  const v = duplicatePlay(play, " (Variation)");
  v.parentPlayId = play.id;
  v.family = play.family || play.name;
  return v;
}
