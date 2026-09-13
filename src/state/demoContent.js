import { newPlaybook, newPlay, applyFormationToPlay, createPlayer } from "./models.js";
import { generateRoute } from "../utils/routes.js";
import { uid } from "../utils/id.js";
import { DEFAULT_SECTIONS } from "../utils/constants.js";

function findPlayer(play, label) {
  return play.players.find((p) => p.label === label);
}

function addRoute(play, label, routeName, color = "#15803d") {
  const pl = findPlayer(play, label);
  if (!pl) return;
  const points = generateRoute(routeName, pl.x, pl.y, play.ball.x);
  play.routes.push({ id: uid("route"), playerId: pl.id, points, color, style: "solid", routeType: routeName, label: routeName });
}

function addBlock(play, label, type, dx, dy, color = "#8a4b0d") {
  const pl = findPlayer(play, label);
  if (!pl) return;
  play.blocks.push({
    id: uid("block"),
    points: [{ x: pl.x, y: pl.y }, { x: pl.x + dx, y: pl.y + dy }],
    type,
    label: type,
    color,
  });
}

function addMotion(play, label, dx, dy, motionType = "jet") {
  const pl = findPlayer(play, label);
  if (!pl) return;
  play.motions.push({ id: uid("motion"), playerId: pl.id, points: [{ x: pl.x, y: pl.y }, { x: pl.x + dx, y: pl.y + dy }], motionType });
}

function addCoachingPoint(play, text) {
  play.coachingPoints.push({ id: uid("cp"), text });
}

function baseOffense(name, formation, opts = {}) {
  let play = newPlay({ name, category: "offense", formationName: formation, ...opts });
  play = applyFormationToPlay(play, formation, "offense");
  play.ball = { x: play.ball?.x ?? 266.5, y: play.lineOfScrimmageY, playerId: findPlayer(play, "C")?.id || null };
  return play;
}

function baseDefense(name, front, opts = {}) {
  let play = newPlay({ name, category: "defense", formationName: front, ...opts });
  play = applyFormationToPlay(play, front, "defense");
  return play;
}

export function buildDemoPlaybook() {
  const pb = newPlaybook({
    name: "Demo Playbook",
    team: "Gridiron Eagles",
    season: String(new Date().getFullYear()),
    coachName: "Coach Example",
  });
  pb.sections = DEFAULT_SECTIONS.map((s) => ({ ...s, parentId: null, order: 0 }));

  const secByName = (name) => pb.sections.find((s) => s.name === name)?.id || null;

  /* ---------------- OFFENSE ---------------- */
  let p;

  p = baseOffense("Inside Zone", "Singleback", {
    number: "24", concept: "Inside Zone", runPassRPO: "Run", personnel: "11", down: "1", distance: "10",
    sectionId: secByName("Run Game"), tags: ["Run", "Zone"], situationTags: ["1st & 10"],
  });
  addBlock(p, "LT", "reach", 10, -4); addBlock(p, "LG", "combo", 15, -30);
  addBlock(p, "C", "combo", 20, -30); addBlock(p, "RG", "down", -15, -6); addBlock(p, "RT", "reach", 20, -6);
  addBlock(p, "Y", "down", -20, -6);
  p.routes.push();
  const ibRB = findPlayer(p, "RB");
  if (ibRB) p.routes.push({ id: uid("route"), playerId: ibRB.id, points: [{ x: ibRB.x, y: ibRB.y }, { x: ibRB.x + 10, y: ibRB.y - 40 }, { x: ibRB.x + 60, y: ibRB.y - 140 }], color: "#8a4b0d", style: "solid", routeType: "Run Path", label: "IZ" });
  addCoachingPoint(p, "RB presses A-gap, reads first down lineman past the center-guard combo.");
  addCoachingPoint(p, "OL rule: covered = base/reach, uncovered = combo to backer.");
  p.notes = "Bread-and-butter zone run. Works from any personnel grouping.";
  pb.plays.push(p);

  p = baseOffense("Power", "Strong I", {
    number: "34", concept: "Power", runPassRPO: "Run", personnel: "21", down: "1", distance: "10",
    sectionId: secByName("Run Game"), tags: ["Run", "Gap"], situationTags: ["Short Yardage", "Goal Line"],
  });
  addBlock(p, "LT", "down", 10, -4); addBlock(p, "LG", "pull", 140, -10); addBlock(p, "C", "drive", 5, -8);
  addBlock(p, "RG", "drive", -5, -8); addBlock(p, "RT", "down", -10, -4); addBlock(p, "Y", "kick", -30, -4);
  addBlock(p, "FB", "lead", 40, -30);
  const pwrRB = findPlayer(p, "RB");
  if (pwrRB) p.routes.push({ id: uid("route"), playerId: pwrRB.id, points: [{ x: pwrRB.x, y: pwrRB.y }, { x: pwrRB.x + 100, y: pwrRB.y - 60 }, { x: pwrRB.x + 130, y: pwrRB.y - 150 }], color: "#8a4b0d", style: "solid", routeType: "Run Path", label: "Power" });
  addCoachingPoint(p, "Backside guard pulls and kicks out the force defender.");
  addCoachingPoint(p, "FB leads through the hole, picks off first color to show.");
  pb.plays.push(p);

  p = baseOffense("Counter", "Singleback", {
    number: "36", concept: "Counter", runPassRPO: "Run", personnel: "11", down: "2", distance: "7",
    sectionId: secByName("Run Game"), tags: ["Run", "Gap", "Counter"],
  });
  addBlock(p, "LT", "down", 10, -4); addBlock(p, "LG", "pull", 150, -6); addBlock(p, "C", "drive", 5, -8);
  addBlock(p, "RG", "drive", -5, -8); addBlock(p, "RT", "pull", -150, -6);
  const cntRB = findPlayer(p, "RB");
  if (cntRB) p.routes.push({ id: uid("route"), playerId: cntRB.id, points: [{ x: cntRB.x, y: cntRB.y }, { x: cntRB.x - 30, y: cntRB.y - 20 }, { x: cntRB.x + 110, y: cntRB.y - 140 }], color: "#8a4b0d", style: "solid", routeType: "Run Path", label: "Counter" });
  addCoachingPoint(p, "RB takes counter step to sell backside zone before pressing the pulling guard.");
  pb.plays.push(p);

  p = baseOffense("Outside Zone", "Shotgun", {
    number: "16", concept: "Outside Zone", runPassRPO: "Run", personnel: "11", down: "1", distance: "10",
    sectionId: secByName("Run Game"), tags: ["Run", "Zone", "Perimeter"],
  });
  ["LT","LG","C","RG","RT"].forEach((l) => addBlock(p, l, "reach", 25, -4));
  const ozRB = findPlayer(p, "RB");
  if (ozRB) p.routes.push({ id: uid("route"), playerId: ozRB.id, points: [{ x: ozRB.x, y: ozRB.y }, { x: ozRB.x + 120, y: ozRB.y - 30 }, { x: ozRB.x + 170, y: ozRB.y - 130 }], color: "#8a4b0d", style: "solid", routeType: "Run Path", label: "OZ" });
  addCoachingPoint(p, "Everyone reaches playside gap; backside cutoff is critical.");
  pb.plays.push(p);

  p = baseOffense("Mesh", "2x2", {
    number: "82", concept: "Mesh", runPassRPO: "Pass", personnel: "10", down: "3", distance: "6",
    sectionId: secByName("Pass Game"), tags: ["Pass", "Man-Beater"], situationTags: ["3rd & Medium"],
  });
  addRoute(p, "X", "Corner"); addRoute(p, "Z", "Corner");
  addRoute(p, "H", "Shallow"); addRoute(p, "F", "Shallow");
  const meshRB = findPlayer(p, "RB");
  if (meshRB) p.routes.push({ id: uid("route"), playerId: meshRB.id, points: [{ x: meshRB.x, y: meshRB.y }, { x: meshRB.x, y: meshRB.y - 50 }], color: "#15803d", style: "solid", routeType: "Curl", label: "Curl" });
  addCoachingPoint(p, "Shallow crossers rub off each other around 5 yards; both stay flat.");
  addCoachingPoint(p, "QB progression: shallow drag away from pressure -> curl -> corner.");
  pb.plays.push(p);

  p = baseOffense("Four Verticals", "Empty", {
    number: "890", concept: "Four Verticals", runPassRPO: "Pass", personnel: "10", down: "2", distance: "8",
    sectionId: secByName("Pass Game"), tags: ["Pass", "Vertical"],
  });
  addRoute(p, "X", "Go/Fade"); addRoute(p, "Z", "Go/Fade");
  addRoute(p, "H", "Seam"); addRoute(p, "F", "Seam");
  addRoute(p, "RB", "Option", "#15803d");
  addCoachingPoint(p, "Seam receivers bend away from the safety's leverage.");
  addCoachingPoint(p, "QB read: post-safety rotation, throw off the safety's depth.");
  pb.plays.push(p);

  p = baseOffense("Smash", "Trips", {
    number: "638", concept: "Smash", runPassRPO: "Pass", personnel: "11", down: "3", distance: "4",
    sectionId: secByName("Pass Game"), tags: ["Pass", "Cover 2 Beater"], situationTags: ["3rd & Short", "Red Zone"],
  });
  addRoute(p, "X", "Hitch"); addRoute(p, "H", "Corner"); addRoute(p, "F", "Hitch"); addRoute(p, "Z", "Corner");
  addCoachingPoint(p, "High-low read on the corner: hitch first, then corner route behind it.");
  pb.plays.push(p);

  p = baseOffense("Flood", "3x1", {
    number: "624", concept: "Flood", runPassRPO: "Pass", personnel: "11", down: "1", distance: "10",
    sectionId: secByName("Pass Game"), tags: ["Pass", "3-Level"],
  });
  addRoute(p, "X", "Go/Fade"); addRoute(p, "H", "Corner"); addRoute(p, "F", "Out");
  const floodRB = findPlayer(p, "RB");
  if (floodRB) p.routes.push({ id: uid("route"), playerId: floodRB.id, points: [{ x: floodRB.x, y: floodRB.y }, { x: floodRB.x - 40, y: floodRB.y + 5 }], color: "#15803d", style: "solid", routeType: "Flat", label: "Flat" });
  addCoachingPoint(p, "Three-level flood to the trips side: go, corner, flat. QB reads deep-to-short.");
  pb.plays.push(p);

  p = baseOffense("Inside Zone RPO Glance", "Singleback", {
    number: "24", concept: "RPO Glance", runPassRPO: "RPO", personnel: "11", down: "1", distance: "10",
    sectionId: secByName("RPO"), tags: ["RPO"], family: "Inside Zone", parentPlayId: null,
  });
  addBlock(p, "LT", "reach", 10, -4); addBlock(p, "LG", "combo", 15, -30);
  addBlock(p, "C", "combo", 20, -30); addBlock(p, "RG", "down", -15, -6); addBlock(p, "RT", "reach", 20, -6);
  addRoute(p, "Z", "Glance");
  const rpoRB = findPlayer(p, "RB");
  if (rpoRB) p.routes.push({ id: uid("route"), playerId: rpoRB.id, points: [{ x: rpoRB.x, y: rpoRB.y }, { x: rpoRB.x + 10, y: rpoRB.y - 40 }, { x: rpoRB.x + 60, y: rpoRB.y - 140 }], color: "#8a4b0d", style: "solid", routeType: "Run Path", label: "IZ" });
  addCoachingPoint(p, "Read the alley/overhang defender: if he crashes down on run, pull and throw glance.");
  p.texts.push({ id: uid("txt"), x: p.ball.x + 80, y: p.lineOfScrimmageY - 60, text: "READ: overhang defender", color: "#c47a0f", fontSize: 12, category: "read" });
  pb.plays.push(p);

  /* ---------------- DEFENSE ---------------- */
  p = baseDefense("Cover 3", "4-3", { number: "3", concept: "Cover 3", personnel: "Base", sectionId: secByName("Coverages") });
  addCoachingPoint(p, "3 deep, 4 under. Corners bail to deep thirds, FS splits the middle.");
  pb.plays.push(p);

  p = baseDefense("Cover 1", "4-3", { number: "1", concept: "Cover 1", personnel: "Base", sectionId: secByName("Coverages") });
  addCoachingPoint(p, "Man coverage across the board, FS robs the middle, MLB spy/blitz.");
  pb.plays.push(p);

  p = baseDefense("Cover 2", "4-3", { number: "2", concept: "Cover 2", personnel: "Base", sectionId: secByName("Coverages") });
  addCoachingPoint(p, "Corners squeeze/jam then flat zone; safeties split the deep halves.");
  pb.plays.push(p);

  p = baseDefense("Quarters", "4-2-5", { number: "4", concept: "Quarters", personnel: "Nickel", sectionId: secByName("Coverages") });
  addCoachingPoint(p, "Pattern-match quarters; safeties read #2 receiver's release.");
  pb.plays.push(p);

  p = baseDefense("Nickel Blitz", "4-2-5", { number: "55", concept: "Blitz", personnel: "Nickel", sectionId: secByName("Blitzes / Pressures") });
  const nb = findPlayer(p, "NB");
  if (nb) p.routes.push({ id: uid("route"), playerId: nb.id, points: [{ x: nb.x, y: nb.y }, { x: nb.x - 60, y: nb.y + 60 }], color: "#c22b26", style: "dashed", routeType: "blitz", label: "Blitz" });
  addCoachingPoint(p, "Nickel blitzes off the edge; DL slants away to open the lane.");
  pb.plays.push(p);

  p = baseDefense("Fire Zone", "3-4", { number: "0", concept: "Fire Zone", personnel: "Base", sectionId: secByName("Blitzes / Pressures") });
  const olbFz = p.players.find((pl) => pl.position === "OLB");
  if (olbFz) p.routes.push({ id: uid("route"), playerId: olbFz.id, points: [{ x: olbFz.x, y: olbFz.y }, { x: olbFz.x - 40, y: olbFz.y + 50 }], color: "#c22b26", style: "dashed", routeType: "blitz", label: "Blitz" });
  addCoachingPoint(p, "5-man pressure, 3-deep 3-under behind it. DL games to confuse protection.");
  pb.plays.push(p);

  /* ---------------- SPECIAL TEAMS ---------------- */
  p = newPlay({ name: "Kickoff", number: "K1", category: "specialteams", sectionId: secByName("Kickoff / Return"), concept: "Kickoff", runPassRPO: "Other" });
  const kY = p.lineOfScrimmageY;
  const kickPositions = [-240,-190,-140,-90,-40,0,40,90,140,190,240].map((dx, i) => ({ position: i===5?"K":"GUN", label: i===5?"K":"L"+i, dx, dy: i===5?-20:0, team:"offense" }));
  p.players = kickPositions.map((t) => createPlayer(t, 266.5, kY));
  addCoachingPoint(p, "Kicker aims for a hang time of 4.2+ seconds; lanes stay in their rush lane until the ball is caught.");
  pb.plays.push(p);

  p = newPlay({ name: "Punt", number: "P1", category: "specialteams", sectionId: secByName("Punt / Return"), concept: "Punt", runPassRPO: "Other" });
  const puntY = p.lineOfScrimmageY;
  const puntPositions = [
    { position:"T", label:"LT", dx:-60, dy:0 }, { position:"G", label:"LG", dx:-30, dy:0 }, { position:"LS", label:"LS", dx:0, dy:0 },
    { position:"G", label:"RG", dx:30, dy:0 }, { position:"T", label:"RT", dx:60, dy:0 }, { position:"WING", label:"WL", dx:-90, dy:15 },
    { position:"WING", label:"WR", dx:90, dy:15 }, { position:"GUN", label:"GL", dx:-230, dy:0 }, { position:"GUN", label:"GR", dx:230, dy:0 },
    { position:"UP", label:"UP", dx:0, dy:25 }, { position:"P", label:"P", dx:0, dy:80 },
  ].map((t)=>({...t, team:"offense"}));
  p.players = puntPositions.map((t) => createPlayer(t, 266.5, puntY));
  addCoachingPoint(p, "Protection first: punter gets ball off in 2.0 seconds. Gunners release for coverage.");
  pb.plays.push(p);

  p = newPlay({ name: "Punt Return", number: "PR1", category: "specialteams", sectionId: secByName("Punt / Return"), concept: "Punt Return", runPassRPO: "Other" });
  const prY = Math.round(p.lineOfScrimmageY * 0.4);
  p.lineOfScrimmageY = prY;
  const prPositions = [
    { position:"DL", label:"L1", dx:-70, dy:20, team:"defense" }, { position:"DL", label:"L2", dx:-25, dy:20, team:"defense" },
    { position:"DL", label:"L3", dx:25, dy:20, team:"defense" }, { position:"DL", label:"L4", dx:70, dy:20, team:"defense" },
    { position:"CB", label:"GL", dx:-230, dy:10, team:"defense" }, { position:"CB", label:"GR", dx:230, dy:10, team:"defense" },
    { position:"LB", label:"W1", dx:-100, dy:35, team:"defense" }, { position:"LB", label:"W2", dx:100, dy:35, team:"defense" },
    { position:"S", label:"S1", dx:-40, dy:60, team:"defense" }, { position:"S", label:"S2", dx:40, dy:60, team:"defense" },
    { position:"PR", label:"PR", dx:0, dy:260, team:"defense" },
  ];
  p.players = prPositions.map((t) => createPlayer(t, 266.5, prY));
  addCoachingPoint(p, "Return lane set up left; wall off the first three defenders downfield.");
  pb.plays.push(p);

  return pb;
}
