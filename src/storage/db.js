import { STORAGE_KEYS } from "../utils/constants.js";

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }
    const req = indexedDB.open(STORAGE_KEYS.DB_NAME, STORAGE_KEYS.DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORAGE_KEYS.STORE)) {
        db.createObjectStore(STORAGE_KEYS.STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error || new Error("Failed to open IndexedDB"));
  });
  return dbPromise;
}

function tx(storeName, mode) {
  return openDb().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

export async function dbGetAll() {
  try {
    const store = await tx(STORAGE_KEYS.STORE, "readonly");
    return await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB unavailable, falling back to localStorage", err);
    return lsGetAll();
  }
}

export async function dbPut(record) {
  try {
    const store = await tx(STORAGE_KEYS.STORE, "readwrite");
    await new Promise((resolve, reject) => {
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB put failed, falling back to localStorage", err);
    lsPut(record);
  }
}

export async function dbDelete(id) {
  try {
    const store = await tx(STORAGE_KEYS.STORE, "readwrite");
    await new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB delete failed, falling back to localStorage", err);
    lsDelete(id);
  }
}

/* ---- localStorage fallback (older browsers / private-mode restrictions) ---- */
const LS_FALLBACK_KEY = "gridiron.playbooks.fallback.v1";

function lsGetAll() {
  try {
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function lsPut(record) {
  const all = lsGetAll();
  const idx = all.findIndex((r) => r.id === record.id);
  if (idx >= 0) all[idx] = record; else all.push(record);
  localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(all));
}
function lsDelete(id) {
  const all = lsGetAll().filter((r) => r.id !== id);
  localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(all));
}
