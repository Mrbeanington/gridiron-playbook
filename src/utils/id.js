let counter = 0;

export function uid(prefix = "id") {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${rand}${counter}`;
}

export function nowIso() {
  return new Date().toISOString();
}
