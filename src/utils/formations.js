/*
 * Formation presets. Each entry returns an array of player templates as
 * offsets (dx, dy) in field units (1 unit = 1/10 yard) relative to the ball
 * spot on the line of scrimmage. Positive dy = further from the opponent's
 * end zone (i.e. behind the line, toward the offense's own end).
 * Positive dx = toward the field's "right" as drawn (offense's right).
 */

const OL = (spacing = 34) => [
  { position: "T", label: "LT", dx: -spacing * 2.5, dy: 0 },
  { position: "G", label: "LG", dx: -spacing * 1.25, dy: 0 },
  { position: "C", label: "C", dx: 0, dy: 0 },
  { position: "G", label: "RG", dx: spacing * 1.25, dy: 0 },
  { position: "T", label: "RT", dx: spacing * 2.5, dy: 0 },
];

function off(id, position, label, dx, dy, number = "") {
  return { position, label, number, dx, dy, team: "offense" };
}

export const OFFENSE_FORMATIONS = {
  "I Formation": () => [
    ...OL().map((p) => off(p.label, p.position, p.label, p.dx, p.dy)),
    off("TE", "TE", "Y", 128, 0),
    off("QB", "QB", "QB", 0, 25),
    off("FB", "FB", "FB", 0, 65),
    off("RB", "RB", "RB", 0, 105),
    off("X", "WR", "X", -225, 0),
    off("Z", "WR", "Z", 225, 8),
  ],
  "Strong I": () => [
    ...OL().map((p) => off(p.label, p.position, p.label, p.dx, p.dy)),
    off("TE", "TE", "Y", 128, 0),
    off("QB", "QB", "QB", 0, 25),
    off("FB", "FB", "FB", 20, 65),
    off("RB", "RB", "RB", 20, 105),
    off("X", "WR", "X", -225, 0),
    off("Z", "WR", "Z", 245, 8),
  ],
  "Weak I": () => [
    ...OL().map((p) => off(p.label, p.position, p.label, p.dx, p.dy)),
    off("TE", "TE", "Y", 128, 0),
    off("QB", "QB", "QB", 0, 25),
    off("FB", "FB", "FB", -20, 65),
    off("RB", "RB", "RB", -20, 105),
    off("X", "WR", "X", -225, 0),
    off("Z", "WR", "Z", 245, 8),
  ],
  "Pro Set": () => [
    ...OL().map((p) => off(p.label, p.position, p.label, p.dx, p.dy)),
    off("TE", "TE", "Y", 128, 0),
    off("QB", "QB", "QB", 0, 25),
    off("FB", "FB", "FB", -35, 70),
    off("RB", "RB", "RB", 35, 70),
    off("X", "WR", "X", -225, 0),
    off("Z", "WR", "Z", 245, 8),
  ],
  "Split Back": () => [
    ...OL().map((p) => off(p.label, p.position, p.label, p.dx, p.dy)),
    off("TE", "TE", "Y", 128, 0),
    off("QB", "QB", "QB", 0, 25),
    off("RB", "RB", "H", -45, 65),
    off("RB", "RB", "RB", 45, 65),
    off("X", "WR", "X", -225, 0),
    off("Z", "WR", "Z", 245, 8),
  ],
  Singleback: () => [
    ...OL().map((p) => off(p.label, p.position, p.label, p.dx, p.dy)),
    off("TE", "TE", "Y", 128, 0),
    off("QB", "QB", "QB", 0, 25),
    off("RB", "RB", "RB", -10, 75),
    off("X", "WR", "X", -225, 0),
    off("Slot", "WR", "H", 190, 0),
    off("Z", "WR", "Z", 245, 8),
  ],
  Ace: () => [
    ...OL().map((p) => off(p.label, p.position, p.label, p.dx, p.dy)),
    off("QB", "QB", "QB", 0, 25),
    off("RB", "RB", "RB", 10, 75),
    off("X", "WR", "X", -225, 0),
    off("Slot", "WR", "H", -190, 0),
    off("Y", "TE", "Y", 190, 0),
    off("Z", "WR", "Z", 245, 8),
  ],
  "Wing-T": () => [
    ...OL().map((p) => off(p.label, p.position, p.label, p.dx, p.dy)),
    off("TE", "TE", "Y", 128, 0),
    off("QB", "QB", "QB", 0, 18),
    off("H", "H", "Wing", 155, 25),
    off("FB", "FB", "FB", 0, 60),
    off("RB", "RB", "TB", -30, 75),
    off("X", "WR", "X", -225, 0),
  ],
  Wishbone: () => [
    ...OL().map((p) => off(p.label, p.position, p.label, p.dx, p.dy)),
    off("TE", "TE", "Y", 128, 0),
    off("QB", "QB", "QB", 0, 20),
    off("FB", "FB", "FB", 0, 55),
    off("RB", "RB", "HB", -35, 85),
    off("RB", "RB", "HB", 35, 85),
    off("X", "WR", "X", -225, 0),
  ],
  "Power I": () => [
    ...OL().map((p) => off(p.label, p.position, p.label, p.dx, p.dy)),
    off("TE", "TE", "Y", 128, 0),
    off("H", "FB", "FB", 90, 45),
    off("QB", "QB", "QB", 0, 25),
    off("FB", "FB", "FB", 0, 65),
    off("RB", "RB", "RB", 0, 105),
    off("X", "WR", "X", -225, 0),
  ],
  Pistol: () => [
    ...OL().map((p) => off(p.label, p.position, p.label, p.dx, p.dy)),
    off("TE", "TE", "Y", 128, 0),
    off("QB", "QB", "QB", 0, 55),
    off("RB", "RB", "RB", 0, 95),
    off("X", "WR", "X", -225, 0),
    off("Slot", "WR", "H", 190, 0),
    off("Z", "WR", "Z", 245, 8),
  ],
  Shotgun: () => [
    ...OL().map((p) => off(p.label, p.position, p.label, p.dx, p.dy)),
    off("QB", "QB", "QB", 0, 85),
    off("RB", "RB", "RB", -45, 80),
    off("X", "WR", "X", -225, 0),
    off("Slot", "WR", "H", 190, 0),
    off("Y", "TE", "Y", 128, 0),
    off("Z", "WR", "Z", 245, 8),
  ],
  "2x2": () => [
    ...OL().map((p) => off(p.label, p.position, p.label, p.dx, p.dy)),
    off("QB", "QB", "QB", 0, 85),
    off("RB", "RB", "RB", -45, 80),
    off("X", "WR", "X", -225, 0),
    off("Slot", "WR", "H", -190, 0),
    off("Slot2", "WR", "F", 190, 0),
    off("Z", "WR", "Z", 245, 8),
  ],
  "3x1": () => [
    ...OL().map((p) => off(p.label, p.position, p.label, p.dx, p.dy)),
    off("QB", "QB", "QB", 0, 85),
    off("RB", "RB", "RB", -45, 80),
    off("X", "WR", "X", -225, 0),
    off("Slot", "WR", "H", 150, 0),
    off("Slot2", "WR", "F", 195, 0),
    off("Z", "WR", "Z", 240, 8),
  ],
  Trips: () => [
    ...OL().map((p) => off(p.label, p.position, p.label, p.dx, p.dy)),
    off("QB", "QB", "QB", 0, 85),
    off("RB", "RB", "RB", -45, 80),
    off("X", "WR", "X", -225, 0),
    off("Slot", "WR", "H", 150, 0),
    off("Slot2", "WR", "F", 195, 0),
    off("Z", "WR", "Z", 240, 8),
  ],
  Empty: () => [
    ...OL().map((p) => off(p.label, p.position, p.label, p.dx, p.dy)),
    off("QB", "QB", "QB", 0, 85),
    off("X", "WR", "X", -225, 0),
    off("Slot", "WR", "H", -170, 0),
    off("RB", "RB", "RB", 155, 0),
    off("Slot2", "WR", "F", 195, 0),
    off("Z", "WR", "Z", 240, 8),
  ],
  Bunch: () => [
    ...OL().map((p) => off(p.label, p.position, p.label, p.dx, p.dy)),
    off("QB", "QB", "QB", 0, 85),
    off("RB", "RB", "RB", -45, 80),
    off("X", "WR", "X", -225, 0),
    off("Y", "TE", "Y", 150, 0),
    off("Slot", "WR", "H", 175, 15),
    off("Z", "WR", "Z", 195, 30),
  ],
  Stack: () => [
    ...OL().map((p) => off(p.label, p.position, p.label, p.dx, p.dy)),
    off("QB", "QB", "QB", 0, 85),
    off("RB", "RB", "RB", -45, 80),
    off("X", "WR", "X", -225, 0),
    off("Slot", "WR", "H", 195, 0),
    off("Z", "WR", "Z", 195, 22),
  ],
  Sniffer: () => [
    ...OL().map((p) => off(p.label, p.position, p.label, p.dx, p.dy)),
    off("QB", "QB", "QB", 0, 85),
    off("RB", "RB", "RB", -45, 80),
    off("H", "TE", "F", 90, 35),
    off("X", "WR", "X", -225, 0),
    off("Slot", "WR", "H", 190, 0),
    off("Z", "WR", "Z", 245, 8),
  ],
  Condensed: () => [
    ...OL().map((p) => off(p.label, p.position, p.label, p.dx, p.dy)),
    off("QB", "QB", "QB", 0, 85),
    off("RB", "RB", "RB", -45, 80),
    off("X", "WR", "X", -100, 0),
    off("Slot", "WR", "H", -70, 0),
    off("Slot2", "WR", "F", 70, 0),
    off("Z", "WR", "Z", 100, 0),
  ],
};

function def(position, label, dx, dy) {
  return { position, label, dx, dy, team: "defense" };
}

export const DEFENSE_FORMATIONS = {
  "4-3": () => [
    def("DE", "DE", -95, -18), def("DT", "DT", -30, -18), def("DT", "DT", 30, -18), def("DE", "DE", 95, -18),
    def("OLB", "SLB", -140, -70), def("MLB", "MLB", 0, -75), def("OLB", "WLB", 140, -70),
    def("CB", "CB", -220, -25), def("CB", "CB", 220, -25),
    def("FS", "FS", -35, -140), def("SS", "SS", 90, -110),
  ],
  "3-4": () => [
    def("NT", "NT", 0, -18), def("DE", "DE", -55, -20), def("DE", "DE", 55, -20),
    def("OLB", "OLB", -140, -60), def("ILB", "ILB", -30, -75), def("ILB", "ILB", 30, -75), def("OLB", "OLB", 140, -60),
    def("CB", "CB", -220, -25), def("CB", "CB", 220, -25),
    def("FS", "FS", -20, -140), def("SS", "SS", 100, -100),
  ],
  "4-2-5": () => [
    def("DE", "DE", -95, -18), def("DT", "DT", -25, -18), def("DT", "DT", 25, -18), def("DE", "DE", 95, -18),
    def("LB", "LB", -80, -70), def("LB", "LB", 80, -70),
    def("CB", "CB", -220, -25), def("CB", "CB", 220, -25), def("NB", "NB", 150, -35),
    def("FS", "FS", -20, -145), def("SS", "SS", 40, -105),
  ],
  "3-3-5": () => [
    def("DE", "DE", -70, -20), def("NT", "NT", 0, -18), def("DE", "DE", 70, -20),
    def("LB", "LB", -120, -65), def("LB", "LB", 0, -75), def("LB", "LB", 120, -65),
    def("CB", "CB", -220, -25), def("CB", "CB", 220, -25), def("NB", "NB", 160, -35),
    def("FS", "FS", -20, -140), def("SS", "SS", 40, -105),
  ],
  "4-4": () => [
    def("DE", "DE", -95, -18), def("DT", "DT", -30, -18), def("DT", "DT", 30, -18), def("DE", "DE", 95, -18),
    def("OLB", "OLB", -160, -55), def("LB", "LB", -40, -65), def("LB", "LB", 40, -65), def("OLB", "OLB", 160, -55),
    def("CB", "CB", -220, -20), def("CB", "CB", 220, -20),
    def("FS", "FS", 0, -130),
  ],
  "5-2": () => [
    def("DE", "DE", -110, -18), def("DT", "DT", -50, -18), def("NT", "NT", 0, -18), def("DT", "DT", 50, -18), def("DE", "DE", 110, -18),
    def("LB", "LB", -45, -70), def("LB", "LB", 45, -70),
    def("CB", "CB", -220, -20), def("CB", "CB", 220, -20),
    def("FS", "FS", 0, -130),
  ],
  "6-2": () => [
    def("DE", "DE", -120, -18), def("DT", "DT", -60, -18), def("NT", "NT", -10, -18), def("NT2", "NT", 10, -18), def("DT", "DT", 60, -18), def("DE", "DE", 120, -18),
    def("LB", "LB", -35, -65), def("LB", "LB", 35, -65),
    def("CB", "CB", -220, -20), def("CB", "CB", 220, -20),
  ],
  Bear: () => [
    def("DE", "DE", -100, -18), def("DT", "DT", -35, -18), def("NT", "NT", 0, -18), def("DT", "DT", 35, -18), def("DE", "DE", 100, -18),
    def("LB", "LB", -70, -70), def("LB", "LB", 70, -70),
    def("CB", "CB", -220, -20), def("CB", "CB", 220, -20),
    def("FS", "FS", -20, -140), def("SS", "SS", 40, -100),
  ],
  Tite: () => [
    def("DE", "DE", -35, -18), def("NT", "NT", 0, -18), def("DE", "DE", 35, -18),
    def("OLB", "OLB", -140, -60), def("ILB", "ILB", -25, -75), def("ILB", "ILB", 25, -75), def("OLB", "OLB", 140, -60),
    def("CB", "CB", -220, -25), def("CB", "CB", 220, -25),
    def("FS", "FS", -20, -140), def("SS", "SS", 100, -100),
  ],
};

export function buildFormation(name, side) {
  const map = side === "defense" ? DEFENSE_FORMATIONS : OFFENSE_FORMATIONS;
  const fn = map[name];
  if (!fn) return [];
  return fn();
}
