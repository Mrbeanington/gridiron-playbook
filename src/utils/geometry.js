export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Convert a polyline of points into a smooth SVG path "d" string using
 * simple quadratic smoothing between midpoints (fast, dependency-free). */
export function smoothPathD(points) {
  if (!points || points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const cur = points[i];
    const next = points[i + 1];
    const midX = (cur.x + next.x) / 2;
    const midY = (cur.y + next.y) / 2;
    d += ` Q ${cur.x} ${cur.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export function straightPathD(points) {
  if (!points || points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

/** Angle in degrees from a to b, for orienting arrowheads/markers. */
export function angleDeg(a, b) {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

export function svgPointFromEvent(svgEl, evt) {
  const pt = svgEl.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const transformed = pt.matrixTransform(ctm.inverse());
  return { x: transformed.x, y: transformed.y };
}

export function pointInRect(p, rect) {
  return p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h;
}
