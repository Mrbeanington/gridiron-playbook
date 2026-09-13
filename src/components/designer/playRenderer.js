import { FIELD, BLOCK_TYPES, DEFAULT_BRANDING } from "../../utils/constants.js";
import { smoothPathD, straightPathD, angleDeg } from "../../utils/geometry.js";

const BLOCK_ABBR = Object.fromEntries(BLOCK_TYPES.map((b) => [b.id, b.label.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 3)]));
const DASHED_BLOCKS = new Set(["pull", "trap", "kick", "climb", "checkrelease"]);
const DOUBLE_BLOCKS = new Set(["double", "combo"]);

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function arrowHead(points, color, size = 9) {
  if (!points || points.length < 2) return "";
  const b = points[points.length - 1];
  const a = points[points.length - 2];
  const ang = (angleDeg(a, b) * Math.PI) / 180;
  const p1 = { x: b.x, y: b.y };
  const p2 = { x: b.x - size * Math.cos(ang - Math.PI / 7), y: b.y - size * Math.sin(ang - Math.PI / 7) };
  const p3 = { x: b.x - size * Math.cos(ang + Math.PI / 7), y: b.y - size * Math.sin(ang + Math.PI / 7) };
  return `<polygon points="${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}" fill="${color}"></polygon>`;
}

function fieldBackground(view, length, width, fieldColor) {
  const ez = FIELD.VIEWS[view].endzone;
  let g = `<rect x="0" y="0" width="${width}" height="${length}" fill="${fieldColor}"></rect>`;
  // yard lines every 5 yards (50 units), major every 10 yards
  const start = ez;
  const end = view === "full" ? length - ez : length;
  for (let y = start; y <= end; y += 50) {
    const major = Math.round((y - start) % 100) === 0;
    g += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="rgba(255,255,255,${major ? 0.55 : 0.28})" stroke-width="${major ? 2 : 1}"></line>`;
    if (major) {
      const yardNum = Math.round(Math.abs((y - start)) / 10);
      const label = yardNum > 50 ? 100 - yardNum : yardNum;
      if (label !== 0 || view !== "full") {
        g += textEl(width * 0.14, y + 4, String(label), { size: 15, color: "rgba(255,255,255,.65)", weight: 800, anchor: "middle" });
        g += textEl(width * 0.86, y + 4, String(label), { size: 15, color: "rgba(255,255,255,.65)", weight: 800, anchor: "middle" });
      }
    }
  }
  // hash marks
  const hashX1 = width * 0.32, hashX2 = width * 0.68;
  for (let y = start; y <= end; y += 10) {
    g += `<line x1="${hashX1 - 5}" y1="${y}" x2="${hashX1 + 5}" y2="${y}" stroke="rgba(255,255,255,.45)" stroke-width="1.5"></line>`;
    g += `<line x1="${hashX2 - 5}" y1="${y}" x2="${hashX2 + 5}" y2="${y}" stroke="rgba(255,255,255,.45)" stroke-width="1.5"></line>`;
  }
  // end zones
  if (view === "full") {
    g += `<rect x="0" y="0" width="${width}" height="${ez}" fill="rgba(0,0,0,.32)"></rect>`;
    g += `<rect x="0" y="${length - ez}" width="${width}" height="${ez}" fill="rgba(0,0,0,.32)"></rect>`;
  } else {
    g += `<rect x="0" y="0" width="${width}" height="${ez}" fill="rgba(0,0,0,.32)"></rect>`;
  }
  // sidelines
  g += `<rect x="0" y="0" width="3" height="${length}" fill="#fff"></rect>`;
  g += `<rect x="${width - 3}" y="0" width="3" height="${length}" fill="#fff"></rect>`;
  return g;
}

function textEl(x, y, str, opts = {}) {
  const { size = 12, color = "#fff", weight = 600, anchor = "start", italic = false, family = "inherit" } = opts;
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}" font-style="${italic ? "italic" : "normal"}" font-family="${family}">${esc(str)}</text>`;
}

function playerMarkup(pl, selected, branding) {
  const isOff = pl.team === "offense";
  const color = pl.color || (isOff ? branding.offenseColor : branding.defenseColor);
  const r = 15;
  let shape;
  if (isOff) {
    shape = `<circle class="player-ring" cx="0" cy="0" r="${r + 3}" fill="none" stroke="transparent"></circle>
      <circle cx="0" cy="0" r="${r}" fill="${color}" stroke="#fff" stroke-width="2"></circle>`;
  } else {
    const s = r + 4;
    shape = `<polygon class="player-ring" points="0,${-s} ${s},${s} ${-s},${s}" fill="none" stroke="transparent"></polygon>
      <polygon points="0,${-r} ${r},${r} ${-r},${r}" fill="${color}" stroke="#fff" stroke-width="2"></polygon>`;
  }
  const label = pl.label || pl.position;
  return `<g class="player-token${selected ? " selected" : ""}${pl.locked ? " locked" : ""}" data-kind="player" data-id="${pl.id}" transform="translate(${pl.x},${pl.y})">
    ${shape}
    <text x="0" y="5" font-size="12" fill="#fff" font-weight="800" text-anchor="middle" pointer-events="none">${esc(label)}</text>
    <circle class="player-hit" cx="0" cy="0" r="${r + 6}" fill="transparent"></circle>
  </g>`;
}

function routeMarkup(route, selected, branding) {
  const d = smoothPathD(route.points);
  const dash = route.style === "dashed" ? `stroke-dasharray="6 5"` : "";
  const color = route.color || branding.routeColor;
  const head = arrowHead(route.points, color);
  let handles = "";
  if (selected) {
    handles = route.points
      .map((p, i) => `<circle class="handle" data-kind="handle" data-owner="route" data-id="${route.id}" data-idx="${i}" cx="${p.x}" cy="${p.y}" r="5"></circle>`)
      .join("");
  }
  return `<g class="route-obj" data-kind="route" data-id="${route.id}">
    <path class="route-path${selected ? " selected" : ""}" d="${d}" fill="none" stroke="${color}" stroke-width="3" ${dash}></path>
    ${head}
    ${handles}
  </g>`;
}

function blockMarkup(block, selected, branding) {
  const d = straightPathD(block.points);
  const dashed = DASHED_BLOCKS.has(block.type);
  const double = DOUBLE_BLOCKS.has(block.type);
  const color = block.color || branding.blockColor;
  const head = arrowHead(block.points, color, 10);
  const mid = block.points[Math.floor(block.points.length / 2)] || block.points[0];
  let handles = "";
  if (selected) {
    handles = block.points
      .map((p, i) => `<circle class="handle" data-kind="handle" data-owner="block" data-id="${block.id}" data-idx="${i}" cx="${p.x}" cy="${p.y}" r="5"></circle>`)
      .join("");
  }
  return `<g class="block-obj" data-kind="block" data-id="${block.id}">
    ${double ? `<path class="block-path${selected ? " selected" : ""}" d="${d}" fill="none" stroke="${color}" stroke-width="7" stroke-opacity=".35"></path>` : ""}
    <path class="block-path${selected ? " selected" : ""}" d="${d}" fill="none" stroke="${color}" stroke-width="4" ${dashed ? 'stroke-dasharray="9 5"' : ""}></path>
    ${head}
    ${textEl(mid.x + 8, mid.y - 6, BLOCK_ABBR[block.type] || "BL", { size: 10, color, weight: 800 })}
    ${handles}
  </g>`;
}

function motionMarkup(motion, selected, color, branding) {
  const d = smoothPathD(motion.points);
  const resolvedColor = color || branding.motionColor;
  const head = arrowHead(motion.points, resolvedColor);
  return `<g class="motion-obj" data-kind="motion" data-id="${motion.id}">
    <path class="motion-path${selected ? " selected" : ""}" d="${d}" fill="none" stroke="${resolvedColor}" stroke-width="2.5" stroke-dasharray="2 5"></path>
    ${head}
  </g>`;
}

function shapeMarkup(shape, selected) {
  const color = shape.color || "#ffffff";
  if (shape.type === "circle") {
    const [c, edge] = shape.points;
    const rr = edge ? Math.hypot(edge.x - c.x, edge.y - c.y) : 30;
    return `<g class="shape-obj" data-kind="shape" data-id="${shape.id}"><circle cx="${c.x}" cy="${c.y}" r="${rr}" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="2"></circle></g>`;
  }
  if (shape.type === "rect") {
    const [a, b] = shape.points;
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    return `<g class="shape-obj" data-kind="shape" data-id="${shape.id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="2"></rect></g>`;
  }
  if (shape.type === "line" || shape.type === "arrow") {
    const d = straightPathD(shape.points);
    const head = shape.type === "arrow" ? arrowHead(shape.points, color) : "";
    return `<g class="shape-obj" data-kind="shape" data-id="${shape.id}"><path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="${shape.dashed ? "6 5" : ""}"></path>${head}</g>`;
  }
  // freehand
  const d = straightPathD(shape.points);
  return `<g class="shape-obj" data-kind="shape" data-id="${shape.id}"><path d="${d}" fill="none" stroke="${color}" stroke-width="3"></path></g>`;
}

function textMarkup(t, selected) {
  const w = Math.max(70, String(t.text || "").length * (t.fontSize || 12) * 0.56 + 16);
  const h = 26;
  return `<g class="text-annotation" data-kind="text" data-id="${t.id}" transform="translate(${t.x},${t.y})">
    <rect x="0" y="0" width="${w}" height="${h}" rx="5" fill="#fffceecc" stroke="${selected ? "#ffd23f" : "#8892a6"}" stroke-width="${selected ? 2 : 1}"></rect>
    <text x="8" y="17" font-size="${t.fontSize || 12}" fill="${t.color || "#1b2436"}" font-weight="700">${esc(t.text || "")}</text>
  </g>`;
}

function ballMarkup(ball, selected, branding) {
  return `<g class="ball-icon" data-kind="ball" data-id="ball" transform="translate(${ball.x},${ball.y}) rotate(35)">
    <ellipse cx="0" cy="0" rx="10" ry="6.5" fill="${branding.ballColor || "#5b3a1e"}" stroke="${selected ? "#ffd23f" : "#3a2410"}" stroke-width="2"></ellipse>
    <line x1="-5" y1="0" x2="5" y2="0" stroke="#fff" stroke-width="1"></line>
    <line x1="-1.5" y1="-2" x2="-1.5" y2="2" stroke="#fff" stroke-width="1"></line>
    <line x1="1.5" y1="-2" x2="1.5" y2="2" stroke="#fff" stroke-width="1"></line>
  </g>`;
}

export function renderPlaySvg(play, opts = {}) {
  const { selectedIds = [], interactive = false, branding: brandingOverride = {}, fit = "meet" } = opts;
  const branding = { ...DEFAULT_BRANDING, ...brandingOverride };
  const view = FIELD.VIEWS[play.fieldView] || FIELD.VIEWS.full;
  const width = FIELD.WIDTH;
  const length = view.length;
  const isHoriz = play.orientation === "horizontal";
  const outW = isHoriz ? length : width;
  const outH = isHoriz ? width : length;
  const fieldColor = branding.fieldColor;

  const sel = new Set(selectedIds);
  let inner = "";
  inner += `<g class="field-bg">${fieldBackground(play.fieldView, length, width, fieldColor)}</g>`;
  inner += `<line x1="0" y1="${play.lineOfScrimmageY}" x2="${width}" y2="${play.lineOfScrimmageY}" stroke="#ffd23f" stroke-width="2.5" stroke-dasharray="1 0"></line>`;
  if (play.firstDownY != null) {
    inner += `<line x1="0" y1="${play.firstDownY}" x2="${width}" y2="${play.firstDownY}" stroke="#ffb703" stroke-width="2" stroke-dasharray="10 6"></line>`;
  }
  inner += (play.shapes || []).map((s) => shapeMarkup(s, sel.has(s.id))).join("");
  inner += (play.motions || []).map((m) => motionMarkup(m, sel.has(m.id), m.color, branding)).join("");
  inner += (play.blocks || []).map((b) => blockMarkup(b, sel.has(b.id), branding)).join("");
  inner += (play.routes || []).map((r) => routeMarkup(r, sel.has(r.id), branding)).join("");
  inner += (play.players || []).map((p) => playerMarkup(p, sel.has(p.id), branding)).join("");
  if (play.ball) inner += ballMarkup(play.ball, sel.has("ball"), branding);
  inner += (play.texts || []).map((t) => textMarkup(t, sel.has(t.id))).join("");

  const groupTransform = isHoriz ? `translate(0,${width}) rotate(-90)` : "";

  return `<svg class="field-svg" viewBox="0 0 ${outW} ${outH}" preserveAspectRatio="xMidYMid ${fit}" xmlns="http://www.w3.org/2000/svg" data-play-id="${play.id}">
    <g transform="${groupTransform}">${inner}</g>
  </svg>`;
}

export function fieldViewBox(play) {
  const view = FIELD.VIEWS[play.fieldView] || FIELD.VIEWS.full;
  const isHoriz = play.orientation === "horizontal";
  return isHoriz ? { w: view.length, h: FIELD.WIDTH } : { w: FIELD.WIDTH, h: view.length };
}
