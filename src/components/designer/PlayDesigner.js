import {
  getActivePlaybook, getPlay, updatePlay, toast, subscribe,
  pushHistory, initHistory, undo, redo, canUndo, canRedo,
  navigate, duplicatePlayAction, createVariationAction,
} from "../../state/store.js";
import { renderPlaySvg, fieldViewBox } from "./playRenderer.js";
import { svgPointFromEvent, dist } from "../../utils/geometry.js";
import { uid } from "../../utils/id.js";
import {
  OFFENSE_POSITIONS, DEFENSE_POSITIONS, ROUTE_PRESETS, BLOCK_TYPES, MOTION_TYPES,
  ANNOTATION_CATEGORIES, PALETTE, FORMATION_TAGS, CONCEPT_TAGS, SITUATION_TAGS, HASHES, RUN_PASS,
  FIELD,
} from "../../utils/constants.js";
import { generateRoute } from "../../utils/routes.js";
import { createPlayer, applyFormationToPlay, cloneDeep } from "../../state/models.js";
import { OFFENSE_FORMATIONS, DEFENSE_FORMATIONS } from "../../utils/formations.js";
import { exportPlayPng } from "../../utils/exportPng.js";
import { openPrintPlay } from "../print/PrintView.js";

const TOOLS = [
  { id: "select", icon: "↖", label: "Select" },
  { id: "offense", icon: "🔵", label: "O Player" },
  { id: "defense", icon: "🔺", label: "D Player" },
  { id: "route", icon: "↗", label: "Route" },
  { id: "block", icon: "▤", label: "Block" },
  { id: "motion", icon: "⤳", label: "Motion" },
  { id: "text", icon: "📝", label: "Text" },
  { id: "circle", icon: "◯", label: "Zone" },
  { id: "rect", icon: "▭", label: "Rect" },
  { id: "arrow", icon: "➜", label: "Arrow" },
  { id: "freehand", icon: "✎", label: "Draw" },
  { id: "eraser", icon: "🧹", label: "Erase" },
];

export function mountPlayDesigner(container, playId) {
  let play = getPlay(playId);
  if (!play) {
    container.innerHTML = `<div class="empty-state"><h3>Play not found</h3></div>`;
    return () => {};
  }
  initHistory(playId, play);

  const local = {
    tool: "select",
    selectedIds: [],
    zoom: 1,
    snap: false,
    routePreset: "Go/Fade",
    blockType: "drive",
    motionType: "standard",
    activeColor: null,
    drawing: null, // { kind, playerId, points }
    clipboard: null,
    addTeam: "offense",
    addPosition: "WR",
  };

  container.innerHTML = `
    <div class="designer">
      <div class="designer-toolbar" data-el="tools"></div>
      <div class="designer-center">
        <div class="designer-canvas-toolbar" data-el="canvastoolbar"></div>
        <div class="canvas-scroll" data-el="scroll">
          <div class="field-svg-wrap" data-el="svgwrap"></div>
        </div>
      </div>
      <div class="designer-right" data-el="right"></div>
    </div>
  `;
  const els = {
    tools: container.querySelector('[data-el="tools"]'),
    canvastoolbar: container.querySelector('[data-el="canvastoolbar"]'),
    scroll: container.querySelector('[data-el="scroll"]'),
    svgwrap: container.querySelector('[data-el="svgwrap"]'),
    right: container.querySelector('[data-el="right"]'),
  };

  function getBranding() {
    return getActivePlaybook()?.branding || {};
  }

  function commit(mutatorOrPatch, { history = true, silent = false } = {}) {
    const cur = getPlay(playId);
    if (!cur) return;
    let next;
    if (typeof mutatorOrPatch === "function") {
      next = cloneDeep(cur);
      mutatorOrPatch(next);
    } else {
      next = { ...cur, ...mutatorOrPatch };
    }
    updatePlay(playId, () => next);
    if (history) pushHistory(playId, next);
    play = getPlay(playId);
    // `silent` skips the re-render so a field the user is actively typing in
    // doesn't get its DOM node destroyed (and focus lost) on every keystroke.
    // The data is still saved/autosaved either way.
    if (!silent) renderAll();
  }

  function renderCanvas() {
    play = getPlay(playId);
    els.svgwrap.innerHTML = renderPlaySvg(play, { selectedIds: local.selectedIds, branding: getBranding() });
    const box = fieldViewBox(play);
    els.svgwrap.style.width = box.w * local.zoom + "px";
    els.svgwrap.style.height = box.h * local.zoom + "px";
    const svg = els.svgwrap.querySelector("svg");
    if (local.tool === "select") svg.classList.add("tool-select");
    attachCanvasEvents(svg);
    renderDrawingOverlay();
  }

  function renderDrawingOverlay() {
    if (!local.drawing) return;
    const svg = els.svgwrap.querySelector("svg");
    const g = svg.querySelector("g");
    const pathPts = local.drawing.points.map((p) => `${p.x},${p.y}`).join(" ");
    const overlay = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    overlay.setAttribute("points", pathPts);
    overlay.setAttribute("fill", "none");
    overlay.setAttribute("stroke", "#ffd23f");
    overlay.setAttribute("stroke-width", "2");
    overlay.setAttribute("stroke-dasharray", "5 4");
    overlay.setAttribute("data-el", "draw-overlay");
    g.appendChild(overlay);
    local.drawing.points.forEach((p) => {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", p.x); c.setAttribute("cy", p.y); c.setAttribute("r", 4);
      c.setAttribute("fill", "#ffd23f");
      g.appendChild(c);
    });
  }

  function renderToolbar() {
    els.tools.innerHTML = TOOLS.map(
      (t) => `<button class="tool-btn${local.tool === t.id ? " active" : ""}" data-tool="${t.id}" title="${t.label}">
        <span>${t.icon}</span><span class="tool-label">${t.label}</span>
      </button>`
    ).join("") + `<div class="tool-sep"></div>
      <button class="tool-btn" data-action="undo" title="Undo (Ctrl+Z)"><span>↶</span><span class="tool-label">Undo</span></button>
      <button class="tool-btn" data-action="redo" title="Redo (Ctrl+Shift+Z)"><span>↷</span><span class="tool-label">Redo</span></button>
      <div class="tool-sep"></div>
      <button class="tool-btn" data-action="delete" title="Delete selected (Del)"><span>🗑</span><span class="tool-label">Delete</span></button>
    `;
    els.tools.querySelectorAll("[data-tool]").forEach((btn) => {
      btn.addEventListener("click", () => {
        local.tool = btn.dataset.tool;
        local.drawing = null;
        local.selectedIds = [];
        renderAll();
      });
    });
    els.tools.querySelector('[data-action="undo"]').addEventListener("click", doUndo);
    els.tools.querySelector('[data-action="redo"]').addEventListener("click", doRedo);
    els.tools.querySelector('[data-action="delete"]').addEventListener("click", deleteSelected);
  }

  function renderCanvasToolbar() {
    let extra = "";
    if (local.tool === "route") {
      extra = `<select data-field="routePreset">${ROUTE_PRESETS.map((r) => `<option ${r === local.routePreset ? "selected" : ""}>${r}</option>`).join("")}</select>
        <span class="hint text-muted">Click a receiver${local.routePreset === "Custom" ? ", then click points, double-click to finish" : " to draw"}</span>`;
    } else if (local.tool === "block") {
      extra = `<select data-field="blockType">${BLOCK_TYPES.map((b) => `<option value="${b.id}" ${b.id === local.blockType ? "selected" : ""}>${b.label}</option>`).join("")}</select>
        <span class="hint text-muted">Click a blocker, then click points, double-click to finish</span>`;
    } else if (local.tool === "motion") {
      extra = `<select data-field="motionType">${MOTION_TYPES.map((m) => `<option value="${m.id}" ${m.id === local.motionType ? "selected" : ""}>${m.label}</option>`).join("")}</select>
        <span class="hint text-muted">Click a player, then click endpoint, double-click to finish</span>`;
    } else if (["offense", "defense"].includes(local.tool)) {
      const positions = local.tool === "offense" ? OFFENSE_POSITIONS : DEFENSE_POSITIONS;
      extra = `<select data-field="addPosition">${positions.map((p) => `<option ${p === local.addPosition ? "selected" : ""}>${p}</option>`).join("")}</select>
        <span class="hint text-muted">Click the field to place a player</span>`;
    } else if (["circle", "rect", "arrow", "freehand"].includes(local.tool)) {
      extra = `<span class="hint text-muted">Click and drag to draw</span>`;
    } else if (local.tool === "text") {
      extra = `<span class="hint text-muted">Click to add a note</span>`;
    } else if (local.tool === "eraser") {
      extra = `<span class="hint text-muted">Click any object to delete it</span>`;
    }
    els.canvastoolbar.innerHTML = `
      <label class="checkbox-row"><input type="checkbox" data-field="snap" ${local.snap ? "checked" : ""}/> Snap to grid</label>
      <div class="sep"></div>
      <select data-field="fieldView">
        ${Object.entries(FIELD.VIEWS).map(([k, v]) => `<option value="${k}" ${play.fieldView === k ? "selected" : ""}>${v.label}</option>`).join("")}
      </select>
      <select data-field="orientation">
        <option value="vertical" ${play.orientation === "vertical" ? "selected" : ""}>Vertical</option>
        <option value="horizontal" ${play.orientation === "horizontal" ? "selected" : ""}>Horizontal</option>
      </select>
      <div class="sep"></div>
      <button class="btn btn-sm btn-ghost" data-action="zoomout" title="Zoom out">−</button>
      <span class="zoom-readout">${Math.round(local.zoom * 100)}%</span>
      <button class="btn btn-sm btn-ghost" data-action="zoomin" title="Zoom in">+</button>
      <button class="btn btn-sm btn-ghost" data-action="zoomfit">Fit</button>
      <button class="btn btn-sm btn-ghost" data-action="zoom100">100%</button>
      <button class="btn btn-sm btn-ghost" data-action="fullscreen" title="Full screen">⛶</button>
      <div class="sep"></div>
      ${extra}
      <div class="topbar-spacer"></div>
      <button class="btn btn-sm" data-action="print">🖨 Print Play</button>
      <button class="btn btn-sm btn-primary" data-action="pngexport">⬇ PNG</button>
    `;
    els.canvastoolbar.querySelector('[data-field="snap"]').addEventListener("change", (e) => (local.snap = e.target.checked));
    els.canvastoolbar.querySelector('[data-field="fieldView"]').addEventListener("change", (e) => commit((p) => (p.fieldView = e.target.value)));
    els.canvastoolbar.querySelector('[data-field="orientation"]').addEventListener("change", (e) => commit((p) => (p.orientation = e.target.value)));
    const rp = els.canvastoolbar.querySelector('[data-field="routePreset"]');
    if (rp) rp.addEventListener("change", (e) => (local.routePreset = e.target.value));
    const bt = els.canvastoolbar.querySelector('[data-field="blockType"]');
    if (bt) bt.addEventListener("change", (e) => (local.blockType = e.target.value));
    const mt = els.canvastoolbar.querySelector('[data-field="motionType"]');
    if (mt) mt.addEventListener("change", (e) => (local.motionType = e.target.value));
    const ap = els.canvastoolbar.querySelector('[data-field="addPosition"]');
    if (ap) ap.addEventListener("change", (e) => (local.addPosition = e.target.value));
    els.canvastoolbar.querySelector('[data-action="zoomout"]').addEventListener("click", () => setZoom(local.zoom - 0.1));
    els.canvastoolbar.querySelector('[data-action="zoomin"]').addEventListener("click", () => setZoom(local.zoom + 0.1));
    els.canvastoolbar.querySelector('[data-action="zoom100"]').addEventListener("click", () => setZoom(1));
    els.canvastoolbar.querySelector('[data-action="zoomfit"]').addEventListener("click", () => fitZoom());
    els.canvastoolbar.querySelector('[data-action="fullscreen"]').addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else container.querySelector(".designer-center").requestFullscreen?.();
    });
    els.canvastoolbar.querySelector('[data-action="print"]').addEventListener("click", () => openPrintPlay(play, getActivePlaybook()));
    els.canvastoolbar.querySelector('[data-action="pngexport"]').addEventListener("click", () => exportPlayPng(play, getBranding()));
  }

  function setZoom(z) {
    local.zoom = Math.max(0.3, Math.min(3, z));
    renderAll();
  }
  function fitZoom() {
    const box = fieldViewBox(play);
    const avail = els.scroll.clientWidth - 48;
    local.zoom = Math.max(0.3, Math.min(2, avail / box.w));
    renderAll();
  }

  function doUndo() {
    const snap = undo(playId);
    if (snap) { play = snap; local.selectedIds = []; renderAll(); toast("Undo"); }
  }
  function doRedo() {
    const snap = redo(playId);
    if (snap) { play = snap; local.selectedIds = []; renderAll(); toast("Redo"); }
  }

  function deleteSelected() {
    if (!local.selectedIds.length) return;
    commit((p) => {
      const ids = new Set(local.selectedIds);
      p.players = p.players.filter((x) => !ids.has(x.id));
      p.routes = p.routes.filter((x) => !ids.has(x.id));
      p.blocks = p.blocks.filter((x) => !ids.has(x.id));
      p.motions = p.motions.filter((x) => !ids.has(x.id));
      p.shapes = p.shapes.filter((x) => !ids.has(x.id));
      p.texts = p.texts.filter((x) => !ids.has(x.id));
    });
    local.selectedIds = [];
    renderAll();
  }

  function snapVal(v) {
    return local.snap ? Math.round(v / 10) * 10 : v;
  }

  /* -------------------------------------------------- canvas interactions */
  function attachCanvasEvents(svg) {
    svg.addEventListener("pointerdown", onPointerDown);
    svg.addEventListener("dblclick", onDblClick);
  }

  function findEl(evt, kind) {
    let el = evt.target;
    while (el && el !== svgRoot()) {
      if (el.getAttribute && el.getAttribute("data-kind") === kind) return el;
      el = el.parentElement;
    }
    return null;
  }
  function svgRoot() {
    return els.svgwrap.querySelector("svg");
  }

  /* Tracks a pointer drag on `window` and always re-resolves the live <svg>
   * (never a captured reference), so if anything re-renders the canvas
   * mid-drag (undo/redo/delete/tool-switch via keyboard) the drag safely
   * aborts instead of computing a bogus delta against a detached node. */
  function beginPointerTracking(onMove, onEnd) {
    function handleMove(e) {
      const svg = svgRoot();
      if (!svg || !svg.isConnected) { cleanup(); return; }
      onMove(svg, e);
    }
    function handleUp(e) {
      cleanup();
      const svg = svgRoot();
      if (!svg || !svg.isConnected) return;
      onEnd(svg, e);
    }
    function handleCancel() {
      cleanup();
    }
    function cleanup() {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
  }

  function onPointerDown(evt) {
    const svg = svgRoot();
    const pt = svgPointFromEvent(svg, evt);

    if (local.drawing) {
      // adding a point to in-progress path
      local.drawing.points.push({ x: snapVal(pt.x), y: snapVal(pt.y) });
      renderCanvas();
      return;
    }

    const handleEl = findEl(evt, "handle");
    if (handleEl && local.tool === "select") {
      startHandleDrag(handleEl, evt);
      return;
    }
    const ballEl = findEl(evt, "ball");
    const playerEl = findEl(evt, "player");
    const routeEl = findEl(evt, "route");
    const blockEl = findEl(evt, "block");
    const motionEl = findEl(evt, "motion");
    const shapeEl = findEl(evt, "shape");
    const textEl = findEl(evt, "text");
    const hitEl = playerEl || ballEl || routeEl || blockEl || motionEl || shapeEl || textEl;

    if (local.tool === "eraser") {
      if (hitEl) {
        const id = hitEl.dataset.id;
        commit((p) => {
          p.players = p.players.filter((x) => x.id !== id);
          p.routes = p.routes.filter((x) => x.id !== id);
          p.blocks = p.blocks.filter((x) => x.id !== id);
          p.motions = p.motions.filter((x) => x.id !== id);
          p.shapes = p.shapes.filter((x) => x.id !== id);
          p.texts = p.texts.filter((x) => x.id !== id);
        });
      }
      return;
    }

    if (local.tool === "select") {
      if (playerEl) {
        selectOne(playerEl.dataset.id, evt.shiftKey);
        startPlayerDrag(evt, pt);
      } else if (ballEl) {
        selectOne("ball", false);
        startBallDrag(evt);
      } else if (textEl) {
        selectOne(textEl.dataset.id, evt.shiftKey);
        startTextDrag(evt, textEl.dataset.id, pt);
      } else if (routeEl) {
        selectOne(routeEl.dataset.id, evt.shiftKey);
      } else if (blockEl) {
        selectOne(blockEl.dataset.id, evt.shiftKey);
      } else if (motionEl) {
        selectOne(motionEl.dataset.id, evt.shiftKey);
      } else if (shapeEl) {
        selectOne(shapeEl.dataset.id, evt.shiftKey);
      } else {
        local.selectedIds = [];
        renderAll();
      }
      return;
    }

    if (local.tool === "offense" || local.tool === "defense") {
      const tpl = { position: local.addPosition, label: local.addPosition, team: local.tool, dx: 0, dy: 0 };
      const p2 = createPlayer(tpl, snapVal(pt.x), snapVal(pt.y));
      p2.x = snapVal(pt.x); p2.y = snapVal(pt.y);
      commit((p) => p.players.push(p2));
      selectOne(p2.id, false);
      return;
    }

    if (local.tool === "route" || local.tool === "block" || local.tool === "motion") {
      if (playerEl) {
        const playerId = playerEl.dataset.id;
        const pl = play.players.find((x) => x.id === playerId);
        if (local.tool === "route" && local.routePreset !== "Custom") {
          const points = generateRoute(local.routePreset, pl.x, pl.y, play.ball.x);
          const newRoute = { id: uid("route"), playerId, points, color: null, style: "solid", routeType: local.routePreset, label: local.routePreset };
          commit((p) => p.routes.push(newRoute));
          selectOne(newRoute.id, false);
          return;
        }
        local.drawing = { kind: local.tool, playerId, points: [{ x: pl.x, y: pl.y }] };
        renderCanvas();
      }
      return;
    }

    if (["circle", "rect", "arrow", "freehand"].includes(local.tool)) {
      startShapeDraw(evt, pt);
      return;
    }

    if (local.tool === "text") {
      const t = { id: uid("text"), x: pt.x, y: pt.y, text: "New note", color: null, fontSize: 12, category: "coaching" };
      commit((p) => p.texts.push(t));
      local.tool = "select";
      selectOne(t.id, false);
      return;
    }
  }

  function onDblClick() {
    if (local.drawing) finishDrawing();
  }

  function finishDrawing() {
    const d = local.drawing;
    local.drawing = null;
    if (!d || d.points.length < 2) { renderAll(); return; }
    if (d.kind === "route") {
      const r = { id: uid("route"), playerId: d.playerId, points: d.points, color: null, style: "solid", routeType: "Custom", label: "Custom" };
      commit((p) => p.routes.push(r));
      selectOne(r.id, false);
    } else if (d.kind === "block") {
      const b = { id: uid("block"), points: d.points, type: local.blockType, label: local.blockType, color: null };
      commit((p) => p.blocks.push(b));
      selectOne(b.id, false);
    } else if (d.kind === "motion") {
      const m = { id: uid("motion"), playerId: d.playerId, points: d.points, motionType: local.motionType, color: null };
      commit((p) => p.motions.push(m));
      selectOne(m.id, false);
    }
  }

  function selectOne(id, additive) {
    if (additive) {
      if (local.selectedIds.includes(id)) local.selectedIds = local.selectedIds.filter((x) => x !== id);
      else local.selectedIds = [...local.selectedIds, id];
    } else {
      local.selectedIds = [id];
    }
    renderAll();
  }

  function startPlayerDrag(evt, startPt) {
    const ids = local.selectedIds.filter((id) => play.players.some((p) => p.id === id));
    if (!ids.length) return;
    const startPositions = play.players.filter((p) => ids.includes(p.id)).map((p) => ({ id: p.id, x: p.x, y: p.y }));
    if (play.players.find((p) => ids.includes(p.id) && p.locked)) return;
    let moved = false;
    beginPointerTracking(
      (svg, e2) => {
        const pt = svgPointFromEvent(svg, e2);
        const dx = pt.x - startPt.x, dy = pt.y - startPt.y;
        if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
        startPositions.forEach((sp) => {
          const g = svg.querySelector(`[data-kind="player"][data-id="${sp.id}"]`);
          if (g) g.setAttribute("transform", `translate(${snapVal(sp.x + dx)},${snapVal(sp.y + dy)})`);
        });
      },
      (svg, e2) => {
        if (!moved) return;
        const pt = svgPointFromEvent(svg, e2);
        const dx = pt.x - startPt.x, dy = pt.y - startPt.y;
        commit((p) => {
          startPositions.forEach((sp) => {
            const pl = p.players.find((x) => x.id === sp.id);
            if (pl) { pl.x = snapVal(sp.x + dx); pl.y = snapVal(sp.y + dy); }
          });
        });
      }
    );
  }

  function startBallDrag(evt) {
    beginPointerTracking(
      (svg, e2) => {
        const pt = svgPointFromEvent(svg, e2);
        const g = svg.querySelector('[data-kind="ball"]');
        if (g) g.setAttribute("transform", `translate(${snapVal(pt.x)},${snapVal(pt.y)}) rotate(35)`);
      },
      (svg, e2) => {
        const pt = svgPointFromEvent(svg, e2);
        commit((p) => { p.ball.x = snapVal(pt.x); p.ball.y = snapVal(pt.y); });
      }
    );
  }

  function startTextDrag(evt, id, startPt) {
    const txt = play.texts.find((t) => t.id === id);
    if (!txt) return;
    const orig = { x: txt.x, y: txt.y };
    beginPointerTracking(
      (svg, e2) => {
        const pt = svgPointFromEvent(svg, e2);
        const dx = pt.x - startPt.x, dy = pt.y - startPt.y;
        const g = svg.querySelector(`[data-kind="text"][data-id="${id}"]`);
        if (g) g.setAttribute("transform", `translate(${orig.x + dx},${orig.y + dy})`);
      },
      (svg, e2) => {
        const pt = svgPointFromEvent(svg, e2);
        const dx = pt.x - startPt.x, dy = pt.y - startPt.y;
        commit((p) => {
          const t = p.texts.find((x) => x.id === id);
          if (t) { t.x = snapVal(orig.x + dx); t.y = snapVal(orig.y + dy); }
        });
      }
    );
  }

  function startHandleDrag(handleEl, evt) {
    const owner = handleEl.dataset.owner;
    const id = handleEl.dataset.id;
    const idx = Number(handleEl.dataset.idx);
    beginPointerTracking(
      (svg, e2) => {
        const pt = svgPointFromEvent(svg, e2);
        // Re-query the handle live rather than reuse the captured element,
        // which would be stale/detached after any full re-render mid-drag.
        const live = svg.querySelector(`[data-kind="handle"][data-owner="${owner}"][data-id="${id}"][data-idx="${idx}"]`);
        if (live) { live.setAttribute("cx", snapVal(pt.x)); live.setAttribute("cy", snapVal(pt.y)); }
      },
      (svg, e2) => {
        const pt = svgPointFromEvent(svg, e2);
        commit((p) => {
          const arr = owner === "route" ? p.routes : p.blocks;
          const obj = arr.find((x) => x.id === id);
          if (obj) obj.points[idx] = { x: snapVal(pt.x), y: snapVal(pt.y) };
        });
      }
    );
  }

  function startShapeDraw(evt, startPt) {
    const tool = local.tool;
    const points = tool === "freehand" ? [startPt] : [startPt, startPt];
    let previewEl = null;
    let previewSvg = null;

    function ensurePreview(svg) {
      if (previewEl && previewSvg === svg && previewEl.isConnected) return;
      if (previewEl) previewEl.remove();
      previewEl = document.createElementNS("http://www.w3.org/2000/svg", tool === "circle" ? "circle" : tool === "rect" ? "rect" : "path");
      previewEl.setAttribute("fill", tool === "freehand" || tool === "arrow" ? "none" : "#ffd23f33");
      previewEl.setAttribute("stroke", "#ffd23f");
      previewEl.setAttribute("stroke-width", "2");
      svg.querySelector("g").appendChild(previewEl);
      previewSvg = svg;
    }
    function updatePreview() {
      if (!previewEl) return;
      if (tool === "circle") {
        const r = dist(points[0], points[1]);
        previewEl.setAttribute("cx", points[0].x); previewEl.setAttribute("cy", points[0].y); previewEl.setAttribute("r", r);
      } else if (tool === "rect") {
        const x = Math.min(points[0].x, points[1].x), y = Math.min(points[0].y, points[1].y);
        previewEl.setAttribute("x", x); previewEl.setAttribute("y", y);
        previewEl.setAttribute("width", Math.abs(points[1].x - points[0].x));
        previewEl.setAttribute("height", Math.abs(points[1].y - points[0].y));
      } else {
        previewEl.setAttribute("d", points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" "));
      }
    }
    const initialSvg = svgRoot();
    if (initialSvg) { ensurePreview(initialSvg); updatePreview(); }

    beginPointerTracking(
      (svg, e2) => {
        ensurePreview(svg);
        const pt = svgPointFromEvent(svg, e2);
        if (tool === "freehand") points.push(pt);
        else points[1] = pt;
        updatePreview();
      },
      () => {
        if (previewEl) previewEl.remove();
        if (tool !== "freehand" && dist(points[0], points[1]) < 3) return;
        const shape = { id: uid("shape"), type: tool, points, color: null, dashed: false };
        commit((p) => p.shapes.push(shape));
        selectOne(shape.id, false);
      }
    );
  }

  /* -------------------------------------------------- properties panel */
  function findSelectedObject() {
    if (local.selectedIds.length !== 1) return null;
    const id = local.selectedIds[0];
    if (id === "ball") return { kind: "ball", obj: play.ball };
    let obj = play.players.find((x) => x.id === id); if (obj) return { kind: "player", obj };
    obj = play.routes.find((x) => x.id === id); if (obj) return { kind: "route", obj };
    obj = play.blocks.find((x) => x.id === id); if (obj) return { kind: "block", obj };
    obj = play.motions.find((x) => x.id === id); if (obj) return { kind: "motion", obj };
    obj = play.shapes.find((x) => x.id === id); if (obj) return { kind: "shape", obj };
    obj = play.texts.find((x) => x.id === id); if (obj) return { kind: "text", obj };
    return null;
  }

  function colorSwatches(current, onPick) {
    return `<div class="color-swatch-row">${PALETTE.map(
      (c) => `<button class="color-swatch${current === c ? " active" : ""}" style="background:${c}" data-color="${c}" title="${c}"></button>`
    ).join("")}</div>`;
  }

  function renderRight() {
    const sel = findSelectedObject();
    if (!sel) {
      renderPlayInfoPanel();
      return;
    }
    if (sel.kind === "player") renderPlayerPanel(sel.obj);
    else if (sel.kind === "route") renderRoutePanel(sel.obj);
    else if (sel.kind === "block") renderBlockPanel(sel.obj);
    else if (sel.kind === "motion") renderMotionPanel(sel.obj);
    else if (sel.kind === "shape") renderShapePanel(sel.obj);
    else if (sel.kind === "text") renderTextPanel(sel.obj);
    else if (sel.kind === "ball") renderBallPanel();
  }

  function panelWrap(title, body, backBtn = true) {
    els.right.innerHTML = `
      <div class="prop-section">
        <div class="flex items-center justify-between">
          <p class="panel-title" style="margin:0;">${title}</p>
          ${backBtn ? `<button class="btn btn-sm btn-ghost" data-action="deselect">✕</button>` : ""}
        </div>
      </div>
      ${body}
    `;
    const back = els.right.querySelector('[data-action="deselect"]');
    if (back) back.addEventListener("click", () => { local.selectedIds = []; renderAll(); });
  }

  function renderPlayerPanel(pl) {
    const positions = pl.team === "offense" ? OFFENSE_POSITIONS : DEFENSE_POSITIONS;
    panelWrap("Player", `
      <div class="prop-section">
        <div class="field"><label>Label</label><input type="text" data-field="label" value="${pl.label || ""}"/></div>
        <div class="form-row">
          <div class="field"><label>Number</label><input type="text" data-field="number" value="${pl.number || ""}"/></div>
          <div class="field"><label>Position</label>
            <select data-field="position">${positions.map((p) => `<option ${p === pl.position ? "selected" : ""}>${p}</option>`).join("")}</select>
          </div>
        </div>
        <div class="field"><label>Team</label>
          <select data-field="team"><option value="offense" ${pl.team === "offense" ? "selected" : ""}>Offense</option><option value="defense" ${pl.team === "defense" ? "selected" : ""}>Defense</option></select>
        </div>
        <div class="field"><label>Color</label>${colorSwatches(pl.color)}</div>
        <label class="checkbox-row"><input type="checkbox" data-field="locked" ${pl.locked ? "checked" : ""}/> Lock position</label>
      </div>
      <div class="prop-section flex gap-8">
        <button class="btn btn-sm" data-action="duplicate">⧉ Duplicate</button>
        <button class="btn btn-sm btn-danger" data-action="delete">Delete</button>
      </div>
    `);
    bindField("label", (v, o) => updateObj("players", pl.id, { label: v }, o));
    bindField("number", (v, o) => updateObj("players", pl.id, { number: v }, o));
    bindField("position", (v, o) => updateObj("players", pl.id, { position: v, label: v }, o));
    bindField("team", (v, o) => updateObj("players", pl.id, { team: v, position: v === "offense" ? "WR" : "DL" }, o));
    bindCheckbox("locked", (v, o) => updateObj("players", pl.id, { locked: v }, o));
    bindSwatches((c, o) => updateObj("players", pl.id, { color: c }, o));
    els.right.querySelector('[data-action="duplicate"]').addEventListener("click", () => {
      const copy = { ...cloneDeep(pl), id: uid("plyr"), x: pl.x + 15, y: pl.y + 15 };
      commit((p) => p.players.push(copy));
      selectOne(copy.id, false);
    });
    els.right.querySelector('[data-action="delete"]').addEventListener("click", () => { commit((p) => { p.players = p.players.filter((x) => x.id !== pl.id); }); local.selectedIds = []; renderAll(); });
  }

  function renderRoutePanel(r) {
    panelWrap("Route", `
      <div class="prop-section">
        <div class="field"><label>Route type</label>
          <select data-field="routeType">${ROUTE_PRESETS.map((p) => `<option ${p === r.routeType ? "selected" : ""}>${p}</option>`).join("")}</select>
        </div>
        <div class="field"><label>Color</label>${colorSwatches(r.color)}</div>
        <div class="field"><label>Style</label>
          <div class="style-chip-row">
            <button class="style-chip${r.style === "solid" ? " active" : ""}" data-style="solid">Solid</button>
            <button class="style-chip${r.style === "dashed" ? " active" : ""}" data-style="dashed">Dashed</button>
          </div>
        </div>
      </div>
      <div class="prop-section"><button class="btn btn-sm btn-danger btn-block" data-action="delete">Delete Route</button></div>
    `);
    bindField("routeType", (v, o) => updateObj("routes", r.id, { routeType: v, label: v }, o));
    bindSwatches((c, o) => updateObj("routes", r.id, { color: c }, o));
    els.right.querySelectorAll("[data-style]").forEach((btn) => btn.addEventListener("click", () => updateObj("routes", r.id, { style: btn.dataset.style })));
    els.right.querySelector('[data-action="delete"]').addEventListener("click", () => { commit((p) => { p.routes = p.routes.filter((x) => x.id !== r.id); }); local.selectedIds = []; renderAll(); });
  }

  function renderBlockPanel(b) {
    panelWrap("Blocking Assignment", `
      <div class="prop-section">
        <div class="field"><label>Block type</label>
          <select data-field="type">${BLOCK_TYPES.map((t) => `<option value="${t.id}" ${t.id === b.type ? "selected" : ""}>${t.label}</option>`).join("")}</select>
        </div>
        <div class="field"><label>Color</label>${colorSwatches(b.color)}</div>
      </div>
      <div class="prop-section"><button class="btn btn-sm btn-danger btn-block" data-action="delete">Delete Block</button></div>
    `);
    bindField("type", (v, o) => updateObj("blocks", b.id, { type: v, label: v }, o));
    bindSwatches((c, o) => updateObj("blocks", b.id, { color: c }, o));
    els.right.querySelector('[data-action="delete"]').addEventListener("click", () => { commit((p) => { p.blocks = p.blocks.filter((x) => x.id !== b.id); }); local.selectedIds = []; renderAll(); });
  }

  function renderMotionPanel(m) {
    panelWrap("Motion", `
      <div class="prop-section">
        <div class="field"><label>Motion type</label>
          <select data-field="motionType">${MOTION_TYPES.map((t) => `<option value="${t.id}" ${t.id === m.motionType ? "selected" : ""}>${t.label}</option>`).join("")}</select>
        </div>
        <div class="field"><label>Color</label>${colorSwatches(m.color)}</div>
      </div>
      <div class="prop-section"><button class="btn btn-sm btn-danger btn-block" data-action="delete">Delete Motion</button></div>
    `);
    bindField("motionType", (v, o) => updateObj("motions", m.id, { motionType: v }, o));
    bindSwatches((c, o) => updateObj("motions", m.id, { color: c }, o));
    els.right.querySelector('[data-action="delete"]').addEventListener("click", () => { commit((p) => { p.motions = p.motions.filter((x) => x.id !== m.id); }); local.selectedIds = []; renderAll(); });
  }

  function renderShapePanel(s) {
    panelWrap("Shape", `
      <div class="prop-section"><div class="field"><label>Color</label>${colorSwatches(s.color)}</div></div>
      <div class="prop-section"><button class="btn btn-sm btn-danger btn-block" data-action="delete">Delete Shape</button></div>
    `);
    bindSwatches((c, o) => updateObj("shapes", s.id, { color: c }, o));
    els.right.querySelector('[data-action="delete"]').addEventListener("click", () => { commit((p) => { p.shapes = p.shapes.filter((x) => x.id !== s.id); }); local.selectedIds = []; renderAll(); });
  }

  function renderTextPanel(t) {
    panelWrap("Annotation", `
      <div class="prop-section">
        <div class="field"><label>Text</label><textarea data-field="text">${t.text || ""}</textarea></div>
        <div class="field"><label>Category</label>
          <select data-field="category">${ANNOTATION_CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === t.category ? "selected" : ""}>${c.label}</option>`).join("")}</select>
        </div>
        <div class="field"><label>Color</label>${colorSwatches(t.color)}</div>
      </div>
      <div class="prop-section"><button class="btn btn-sm btn-danger btn-block" data-action="delete">Delete Note</button></div>
    `);
    bindField("text", (v, o) => updateObj("texts", t.id, { text: v }, o));
    bindField("category", (v, o) => updateObj("texts", t.id, { category: v }, o));
    bindSwatches((c, o) => updateObj("texts", t.id, { color: c }, o));
    els.right.querySelector('[data-action="delete"]').addEventListener("click", () => { commit((p) => { p.texts = p.texts.filter((x) => x.id !== t.id); }); local.selectedIds = []; renderAll(); });
  }

  function renderBallPanel() {
    panelWrap("Football", `<div class="prop-section"><p class="hint">Drag the ball on the field to mark the snap point, handoff, or pass target.</p></div>`);
  }

  // Text-like fields update live (on "input") WITHOUT re-rendering — so the
  // element the user is actively typing in never gets destroyed/recreated —
  // and only push undo history + refresh the panel once the user leaves the
  // field ("change"/blur). Non-text controls (selects, checkboxes) just
  // commit fully on "change" since there's no keystroke-by-keystroke concern.
  function bindField(name, cb) {
    const el = els.right.querySelector(`[data-field="${name}"]`);
    if (!el) return;
    const isTextLike = el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && ["text", "date", "number"].includes(el.type));
    if (isTextLike) {
      el.addEventListener("input", () => cb(el.value, { history: false, silent: true }));
      el.addEventListener("change", () => cb(el.value, { history: true, silent: false }));
    } else {
      el.addEventListener("change", () => cb(el.value, { history: true, silent: false }));
    }
  }
  const bindTop = bindField;

  function bindCheckbox(name, cb) {
    const el = els.right.querySelector(`[data-field="${name}"]`);
    if (!el) return;
    el.addEventListener("change", () => cb(el.checked, { history: true, silent: false }));
  }
  function bindSwatches(cb) {
    els.right.querySelectorAll("[data-color]").forEach((btn) => btn.addEventListener("click", () => cb(btn.dataset.color, { history: true, silent: false })));
  }

  function updateObj(arrName, id, patch, opts) {
    commit((p) => {
      const idx = p[arrName].findIndex((x) => x.id === id);
      if (idx >= 0) p[arrName][idx] = { ...p[arrName][idx], ...patch };
    }, opts);
  }

  function renderPlayInfoPanel() {
    const pb = getActivePlaybook();
    const formationOptions = play.category === "defense" ? Object.keys(DEFENSE_FORMATIONS) : Object.keys(OFFENSE_FORMATIONS);
    const fieldViewInfo = FIELD.VIEWS[play.fieldView] || FIELD.VIEWS.full;
    const situationTags = play.situationTags || [];
    els.right.innerHTML = `
      <div class="prop-section">
        <p class="panel-title">Play Info</p>
        <div class="field"><label>Play Name</label><input type="text" data-field="name" value="${escAttr(play.name)}"/></div>
        <div class="form-row">
          <div class="field"><label>Play #</label><input type="text" data-field="number" value="${escAttr(play.number)}"/></div>
          <div class="field"><label>Category</label>
            <select data-field="category">
              <option value="offense" ${play.category === "offense" ? "selected" : ""}>Offense</option>
              <option value="defense" ${play.category === "defense" ? "selected" : ""}>Defense</option>
              <option value="specialteams" ${play.category === "specialteams" ? "selected" : ""}>Special Teams</option>
            </select>
          </div>
        </div>
        <div class="field"><label>Formation</label>
          <div class="flex gap-8">
            <select data-field="formationPick" style="flex:1">${formationOptions.map((f) => `<option ${f === play.formationName ? "selected" : ""}>${f}</option>`).join("")}</select>
            <button class="btn btn-sm" data-action="applyFormation">Apply</button>
          </div>
        </div>
        <div class="form-row">
          <div class="field"><label>Personnel</label><input type="text" data-field="personnel" value="${escAttr(play.personnel)}" placeholder="11, 21, Nickel..."/></div>
          <div class="field"><label>Run/Pass</label><select data-field="runPassRPO">${RUN_PASS.map((r) => `<option ${r === play.runPassRPO ? "selected" : ""}>${r}</option>`).join("")}</select></div>
        </div>
        <div class="field"><label>Concept</label><input list="concept-list" data-field="concept" value="${escAttr(play.concept)}"/>
          <datalist id="concept-list">${CONCEPT_TAGS.map((c) => `<option value="${c}">`).join("")}</datalist>
        </div>
        <div class="form-row">
          <div class="field"><label>Down</label><input type="text" data-field="down" value="${escAttr(play.down)}"/></div>
          <div class="field"><label>Distance</label><input type="text" data-field="distance" value="${escAttr(play.distance)}"/></div>
          <div class="field"><label>Hash</label><select data-field="hash">${HASHES.map((h) => `<option ${h === play.hash ? "selected" : ""}>${h}</option>`).join("")}</select></div>
        </div>
        <div class="field"><label>Field Position</label><input type="text" data-field="fieldPosition" value="${escAttr(play.fieldPosition)}" placeholder="Own 25, Opp 10..."/></div>
        <div class="field"><label>Line of Scrimmage (drag)</label><input type="range" min="${fieldViewInfo.endzone}" max="${fieldViewInfo.length - fieldViewInfo.endzone}" data-field="los" value="${play.lineOfScrimmageY}"/></div>
        <div class="field"><label>Situations</label>
          <div class="style-chip-row">${SITUATION_TAGS.map((s) => `<button class="style-chip${situationTags.includes(s) ? " active" : ""}" data-sit="${escAttr(s)}">${s}</button>`).join("")}</div>
        </div>
        <label class="checkbox-row"><input type="checkbox" data-field="favorite" ${play.favorite ? "checked" : ""}/> ⭐ Favorite</label>
      </div>
      <div class="prop-section">
        <p class="panel-title">Coaching Points</p>
        <div data-el="cplist"></div>
        <button class="btn btn-sm btn-block" data-action="addcp">+ Add Coaching Point</button>
      </div>
      <div class="prop-section">
        <p class="panel-title">Notes</p>
        <textarea data-field="notes" placeholder="Install notes, situational reminders...">${play.notes || ""}</textarea>
      </div>
      <div class="prop-section">
        <p class="panel-title">Practice</p>
        <div class="field"><label>Install Date</label><input type="date" data-field="installDate" value="${play.practice?.installDate || ""}"/></div>
        <div class="field"><label>Emphasis</label><input type="text" data-field="emphasis" value="${escAttr(play.practice?.emphasis || "")}"/></div>
      </div>
      <div class="prop-section flex gap-8">
        <button class="btn btn-sm" data-action="duplicatePlay">⧉ Duplicate Play</button>
        <button class="btn btn-sm" data-action="variation">🌿 New Variation</button>
      </div>
    `;
    bindTop("name", (v, o) => commit((p) => (p.name = v), o));
    bindTop("number", (v, o) => commit((p) => (p.number = v), o));
    bindTop("category", (v, o) => commit((p) => (p.category = v), o));
    bindTop("personnel", (v, o) => commit((p) => (p.personnel = v), o));
    bindTop("runPassRPO", (v, o) => commit((p) => (p.runPassRPO = v), o));
    bindTop("concept", (v, o) => commit((p) => (p.concept = v), o));
    bindTop("down", (v, o) => commit((p) => (p.down = v), o));
    bindTop("distance", (v, o) => commit((p) => (p.distance = v), o));
    bindTop("hash", (v, o) => commit((p) => (p.hash = v), o));
    bindTop("fieldPosition", (v, o) => commit((p) => (p.fieldPosition = v), o));
    bindTop("notes", (v, o) => commit((p) => (p.notes = v), o));
    bindTop("installDate", (v, o) => commit((p) => (p.practice = { ...p.practice, installDate: v }), o));
    bindTop("emphasis", (v, o) => commit((p) => (p.practice = { ...p.practice, emphasis: v }), o));
    const losInput = els.right.querySelector('[data-field="los"]');
    losInput.addEventListener("input", () => { play.lineOfScrimmageY = Number(losInput.value); renderCanvas(); });
    losInput.addEventListener("change", () => commit((p) => (p.lineOfScrimmageY = Number(losInput.value))));
    els.right.querySelector('[data-field="favorite"]').addEventListener("change", (e) => commit((p) => (p.favorite = e.target.checked)));
    els.right.querySelectorAll("[data-sit]").forEach((btn) => btn.addEventListener("click", () => {
      const s = btn.dataset.sit;
      commit((p) => {
        const tags = p.situationTags || [];
        p.situationTags = tags.includes(s) ? tags.filter((x) => x !== s) : [...tags, s];
      });
    }));
    els.right.querySelector('[data-action="applyFormation"]').addEventListener("click", () => {
      const val = els.right.querySelector('[data-field="formationPick"]').value;
      const side = play.category === "defense" ? "defense" : "offense";
      commit((p) => Object.assign(p, applyFormationToPlay(p, val, side)));
      toast(`Applied ${val} formation`);
    });
    els.right.querySelector('[data-action="duplicatePlay"]').addEventListener("click", () => {
      const copy = duplicatePlayAction(playId);
      if (copy) {
        toast("Play duplicated", "success");
        // Go through navigate() (not a direct mountPlayDesigner call) so
        // App.js properly tears down this instance's listeners first.
        navigate("designer", { playId: copy.id });
      }
    });
    els.right.querySelector('[data-action="variation"]').addEventListener("click", () => {
      const copy = createVariationAction(playId);
      if (copy) {
        toast("Variation created", "success");
        navigate("designer", { playId: copy.id });
      }
    });
    renderCoachingPoints();
    els.right.querySelector('[data-action="addcp"]').addEventListener("click", () => {
      commit((p) => p.coachingPoints.push({ id: uid("cp"), text: "" }));
    });
  }

  function renderCoachingPoints() {
    const wrap = els.right.querySelector('[data-el="cplist"]');
    if (!wrap) return;
    wrap.innerHTML = (play.coachingPoints || []).map(
      (cp) => `<div class="coaching-point-row"><textarea data-cp="${cp.id}">${cp.text || ""}</textarea><button class="btn btn-icon btn-ghost" data-cpdel="${cp.id}">✕</button></div>`
    ).join("") || `<p class="hint">No coaching points yet.</p>`;
    wrap.querySelectorAll("[data-cp]").forEach((ta) => {
      const apply = (opts) => commit((p) => {
        const cp = p.coachingPoints.find((c) => c.id === ta.dataset.cp);
        if (cp) cp.text = ta.value;
      }, opts);
      ta.addEventListener("input", () => apply({ history: false, silent: true }));
      ta.addEventListener("change", () => apply({ history: true, silent: false }));
    });
    wrap.querySelectorAll("[data-cpdel]").forEach((btn) => btn.addEventListener("click", () => {
      commit((p) => { p.coachingPoints = p.coachingPoints.filter((c) => c.id !== btn.dataset.cpdel); });
    }));
  }

  function escAttr(s) {
    return String(s ?? "").replace(/"/g, "&quot;");
  }

  /* -------------------------------------------------- keyboard */
  function onKeydown(e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); doUndo(); }
    else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); doRedo(); }
    else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelected(); }
    else if (e.key === "Escape") { local.drawing = null; local.selectedIds = []; renderAll(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
      e.preventDefault();
      const sel = findSelectedObject();
      if (sel && sel.kind === "player") {
        const copy = { ...cloneDeep(sel.obj), id: uid("plyr"), x: sel.obj.x + 15, y: sel.obj.y + 15 };
        commit((p) => p.players.push(copy));
        selectOne(copy.id, false);
      }
    } else if (e.key === "Enter" && local.drawing) { finishDrawing(); }
  }
  window.addEventListener("keydown", onKeydown);

  function renderAll() {
    renderToolbar();
    renderCanvasToolbar();
    renderCanvas();
    renderRight();
  }

  try {
    renderAll();
    fitZoom();
  } catch (err) {
    // Never leave the keydown listener (or a half-built canvas) dangling if
    // rendering throws — e.g. on unexpectedly-shaped imported play data.
    console.error("Play Designer failed to render this play:", err);
    container.innerHTML = `<div class="empty-state"><h3>This play couldn't be displayed</h3><p>${escAttr(err.message)}</p><p class="hint">The play's data may be corrupted or from an incompatible export. Try re-importing the playbook, or delete this play from the Play Library.</p></div>`;
  }

  return () => {
    window.removeEventListener("keydown", onKeydown);
  };
}
