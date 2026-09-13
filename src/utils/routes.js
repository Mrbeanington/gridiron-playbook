/*
 * Route preset generators. Each takes the receiver's starting (x, y) point
 * and `inSign` (+1 if breaking toward the ball/center reads as +x, -1 if
 * mirrored) and returns an array of absolute {x,y} points describing the
 * route path, upfield being -y.
 */
const Y = 10; // 1 yard = 10 field units

function pts(...arr) {
  return arr.map(([x, y]) => ({ x, y }));
}

export const ROUTE_GENERATORS = {
  "Go/Fade": (x, y, s) => pts([x, y], [x - s * 3, y - 55 * Y]),
  Slant: (x, y, s) => pts([x, y], [x, y - 2 * Y], [x + s * 14 * Y, y - 8 * Y]),
  Glance: (x, y, s) => pts([x, y], [x, y - 3 * Y], [x + s * 8 * Y, y - 9 * Y]),
  Hitch: (x, y, s) => pts([x, y], [x + s * 1 * Y, y - 6 * Y], [x, y - 5 * Y]),
  Curl: (x, y, s) => pts([x, y], [x + s * 1 * Y, y - 10 * Y], [x - s * 2 * Y, y - 8.5 * Y]),
  Comeback: (x, y, s) => pts([x, y], [x, y - 14 * Y], [x - s * 5 * Y, y - 11 * Y]),
  Dig: (x, y, s) => pts([x, y], [x, y - 12 * Y], [x + s * 16 * Y, y - 12 * Y]),
  Out: (x, y, s) => pts([x, y], [x, y - 8 * Y], [x - s * 14 * Y, y - 8 * Y]),
  "Speed Out": (x, y, s) => pts([x, y], [x, y - 5 * Y], [x - s * 14 * Y, y - 6 * Y]),
  Corner: (x, y, s) => pts([x, y], [x, y - 10 * Y], [x - s * 14 * Y, y - 22 * Y]),
  Post: (x, y, s) => pts([x, y], [x, y - 10 * Y], [x + s * 16 * Y, y - 26 * Y]),
  "Skinny Post": (x, y, s) => pts([x, y], [x, y - 10 * Y], [x + s * 8 * Y, y - 28 * Y]),
  Wheel: (x, y, s) => pts([x, y], [x - s * 10 * Y, y - 1 * Y], [x - s * 12 * Y, y - 20 * Y]),
  Seam: (x, y, s) => pts([x, y], [x + s * 3 * Y, y - 40 * Y]),
  Vertical: (x, y) => pts([x, y], [x, y - 45 * Y]),
  Drag: (x, y, s) => pts([x, y], [x, y - 3 * Y], [x + s * 30 * Y, y - 4 * Y]),
  Shallow: (x, y, s) => pts([x, y], [x, y - 1.5 * Y], [x + s * 34 * Y, y - 2 * Y]),
  Over: (x, y, s) => pts([x, y], [x, y - 12 * Y], [x + s * 26 * Y, y - 15 * Y]),
  Cross: (x, y, s) => pts([x, y], [x, y - 9 * Y], [x + s * 28 * Y, y - 10 * Y]),
  Pivot: (x, y, s) => pts([x, y], [x + s * 1 * Y, y - 6 * Y], [x - s * 4 * Y, y - 5 * Y]),
  Option: (x, y, s) => pts([x, y], [x, y - 6 * Y], [x + s * 6 * Y, y - 9 * Y]),
  Choice: (x, y, s) => pts([x, y], [x, y - 8 * Y], [x + s * 5 * Y, y - 10 * Y]),
  Screen: (x, y, s) => pts([x, y], [x - s * 2 * Y, y + 1 * Y], [x - s * 4 * Y, y + 3 * Y]),
  Bubble: (x, y, s) => pts([x, y], [x - s * 6 * Y, y + 1 * Y]),
  Smoke: (x, y, s) => pts([x, y], [x - s * 3 * Y, y - 1 * Y]),
  Custom: (x, y) => pts([x, y], [x, y - 8 * Y]),
};

export function generateRoute(name, x, y, centerX) {
  const gen = ROUTE_GENERATORS[name] || ROUTE_GENERATORS.Custom;
  const s = x < centerX ? 1 : -1; // break toward the formation's center
  return gen(x, y, s);
}
