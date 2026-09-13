export const SCHEMA_VERSION = 1;

/* Field coordinate space: 1 unit = 1/10 yard. Width is always 533 (53.3yd). */
export const FIELD = {
  WIDTH: 533,
  VIEWS: {
    window20: { length: 200, endzone: 0, label: "20-Yard Window" },
    full: { length: 1200, endzone: 100, label: "Full Field" },
    half: { length: 650, endzone: 100, label: "Half Field" },
    redzone: { length: 320, endzone: 100, label: "Red Zone" },
    goalline: { length: 170, endzone: 100, label: "Goal Line" },
  },
};

export const CATEGORIES = [
  { id: "offense", label: "Offense", icon: "🏈" },
  { id: "defense", label: "Defense", icon: "🛡️" },
  { id: "specialteams", label: "Special Teams", icon: "🎯" },
];

export const DEFAULT_SECTIONS = [
  { id: "sec_off_run", name: "Run Game", category: "offense" },
  { id: "sec_off_pass", name: "Pass Game", category: "offense" },
  { id: "sec_off_screens", name: "Screens", category: "offense" },
  { id: "sec_off_rpo", name: "RPO", category: "offense" },
  { id: "sec_off_pa", name: "Play Action", category: "offense" },
  { id: "sec_off_goalline", name: "Goal Line / Short Yardage", category: "offense" },
  { id: "sec_def_base", name: "Base Defense", category: "defense" },
  { id: "sec_def_nickel", name: "Nickel / Dime", category: "defense" },
  { id: "sec_def_blitz", name: "Blitzes / Pressures", category: "defense" },
  { id: "sec_def_coverage", name: "Coverages", category: "defense" },
  { id: "sec_def_goalline", name: "Goal Line", category: "defense" },
  { id: "sec_st_kick", name: "Kickoff / Return", category: "specialteams" },
  { id: "sec_st_punt", name: "Punt / Return", category: "specialteams" },
  { id: "sec_st_fg", name: "Field Goal / PAT", category: "specialteams" },
  { id: "sec_st_situational", name: "Special Situations", category: "specialteams" },
];

export const OFFENSE_POSITIONS = ["QB","C","G","T","TE","WR","RB","FB","H","Slot","X","Y","Z"];
export const DEFENSE_POSITIONS = ["DL","DE","DT","NT","LB","MLB","ILB","OLB","EDGE","CB","NB","SS","FS","S"];
export const SPECIAL_POSITIONS = ["K","P","LS","PR","KR","GUN","WING","UP"];

export const FORMATION_TAGS = [
  "I Formation","Strong I","Weak I","Pro Set","Split Back","Singleback","Ace","Wing-T","Wishbone","Power I",
  "Pistol","Shotgun","2x2","3x1","Trips","Empty","Bunch","Stack","Sniffer","Condensed",
  "4-3","3-4","4-2-5","3-3-5","4-4","5-2","6-2","Bear","Tite","Even","Odd","Nickel","Dime",
  "Custom",
];

export const CONCEPT_TAGS = [
  "Inside Zone","Outside Zone","Split Zone","Duo","Power","Counter","Trap","Iso","Lead","Draw","Toss","Sweep",
  "Pin & Pull","Crack Toss","QB Run","QB Draw","Read Option","Speed Option","Triple Option","Veer","Midline",
  "Mesh","Four Verticals","Smash","Flood","Stick","Levels","Shallow Cross","Y-Cross","Spacing","Snag",
  "Cover 0","Cover 1","Cover 2","Cover 3","Cover 4","Cover 6","Man","Match","Quarters","Robber","Rat","Bracket",
  "Fire Zone","Blitz","Stunt","Twist","Sim Pressure",
];

export const SITUATION_TAGS = [
  "1st & 10","2nd & Short","2nd & Long","3rd & Short","3rd & Medium","3rd & Long","4th Down",
  "Goal Line","Red Zone","Backed Up","Two-Minute","Four-Minute","Short Yardage","Coming Out",
  "End of Half","End of Game","Two-Point Conversion",
];

export const HASHES = ["Left","Middle","Right"];
export const RUN_PASS = ["Run","Pass","RPO","Screen","Play Action","Other"];

export const ROUTE_PRESETS = [
  "Go/Fade","Slant","Glance","Hitch","Curl","Comeback","Dig","Out","Speed Out","Corner","Post","Skinny Post",
  "Wheel","Seam","Vertical","Drag","Shallow","Over","Cross","Pivot","Option","Choice","Screen","Bubble","Smoke","Custom",
];

export const BLOCK_TYPES = [
  { id: "drive", label: "Drive" },
  { id: "reach", label: "Reach" },
  { id: "down", label: "Down" },
  { id: "pull", label: "Pull" },
  { id: "kick", label: "Kick Out" },
  { id: "trap", label: "Trap" },
  { id: "double", label: "Double Team" },
  { id: "combo", label: "Combo" },
  { id: "climb", label: "Climb" },
  { id: "lead", label: "Lead" },
  { id: "passpro", label: "Pass Pro" },
  { id: "slide", label: "Slide Protection" },
  { id: "manpro", label: "Man Protection" },
  { id: "zonepro", label: "Zone Protection" },
  { id: "checkrelease", label: "Check/Release" },
];

export const MOTION_TYPES = [
  { id: "standard", label: "Pre-Snap Motion" },
  { id: "jet", label: "Jet Motion" },
  { id: "orbit", label: "Orbit Motion" },
  { id: "return", label: "Return Motion" },
  { id: "shift", label: "Shift" },
  { id: "trade", label: "Trade" },
];

export const DEFENSE_ASSIGNMENT_TYPES = [
  { id: "blitz", label: "Blitz Path" },
  { id: "rushlane", label: "Rush Lane" },
  { id: "zonedrop", label: "Zone Drop" },
  { id: "man", label: "Man Assignment" },
  { id: "runfit", label: "Run Fit" },
  { id: "force", label: "Force" },
  { id: "spill", label: "Spill" },
  { id: "alley", label: "Alley" },
  { id: "contain", label: "Contain" },
  { id: "scrape", label: "Scrape Exchange" },
  { id: "stunt", label: "Stunt" },
  { id: "twist", label: "Twist" },
  { id: "spy", label: "Spy" },
];

export const ANNOTATION_CATEGORIES = [
  { id: "coaching", label: "Coaching Point" },
  { id: "assignment", label: "Assignment Note" },
  { id: "alert", label: "Alert" },
  { id: "read", label: "Read / Progression" },
  { id: "key", label: "Key" },
  { id: "correction", label: "Correction" },
  { id: "reminder", label: "Reminder" },
];

export const DEFAULT_BRANDING = {
  primaryColor: "#1e5c33",
  secondaryColor: "#0a0f1c",
  accentColor: "#d5342e",
  fieldColor: "#1e5c33",
  offenseColor: "#2455c4",
  defenseColor: "#c22b26",
  routeColor: "#15803d",
  blockColor: "#8a4b0d",
  motionColor: "#7a3ac2",
  readColor: "#c47a0f",
  ballColor: "#5b3a1e",
  logo: null,
};

export const PALETTE = ["#2455c4","#c22b26","#15803d","#8a4b0d","#7a3ac2","#c47a0f","#0891b2","#db2777","#eab308","#111827","#ffffff"];

export const STORAGE_KEYS = {
  DB_NAME: "gridiron-playbook-db",
  DB_VERSION: 1,
  STORE: "playbooks",
  SETTINGS_LS: "gridiron.settings.v1",
  ACTIVE_PLAYBOOK_LS: "gridiron.activePlaybookId.v1",
};
