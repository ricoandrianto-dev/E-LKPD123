import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set, update, push, remove, onValue, onDisconnect } from "firebase/database";
import { getFirebaseConfig, getClassId, validateFirebaseConfig } from "./config.js";
import { defaultGroups, defaultQuestions, defaultSettings } from "./defaults.js";

let db = null;
let classId = getClassId();
let status = { ok: false, message: "Memeriksa konfigurasi Firebase", missing: [] };

export function getStatus() { return status; }
export function rootPath(child = "") { return `classes/${classId}${child ? "/" + child : ""}`; }

export async function initFirebase() {
  const config = getFirebaseConfig();
  const missing = validateFirebaseConfig(config);
  if (missing.length > 0) {
    status = { ok: false, message: `Firebase belum siap: ${missing.join(", ")}`, missing };
    return status;
  }
  try {
    const app = initializeApp(config);
    db = getDatabase(app);
    await get(ref(db, rootPath("meta/ping")));
    status = { ok: true, message: "Firebase terkoneksi", missing: [] };
    await ensureSeedData();
    return status;
  } catch (error) {
    status = { ok: false, message: `Firebase gagal terhubung: ${error.message}`, missing: [] };
    return status;
  }
}

async function ensureSeedData() {
  const snap = await get(ref(db, rootPath("meta/initialized")));
  if (snap.exists()) return;
  await set(ref(db, rootPath()), {
    meta: { initialized: true, createdAt: Date.now(), classId },
    questions: defaultQuestions,
    groups: defaultGroups,
    settings: defaultSettings,
    students: {},
    bank: {},
    rooms: { g1: { currentPhase: 1, maxPhase: 1 }, g2: { currentPhase: 1, maxPhase: 1 } }
  });
}

export async function read(path, fallback = null) {
  const snap = await get(ref(db, rootPath(path)));
  return snap.exists() ? snap.val() : fallback;
}
export function listen(path, callback) {
  return onValue(ref(db, rootPath(path)), (snap) => callback(snap.exists() ? snap.val() : null));
}
export function write(path, value) { return set(ref(db, rootPath(path)), value); }
export function patch(path, value) { return update(ref(db, rootPath(path)), value); }
export function add(path, value) { return push(ref(db, rootPath(path)), value); }
export function del(path) { return remove(ref(db, rootPath(path))); }
export function disconnectRemove(path) { return onDisconnect(ref(db, rootPath(path))).remove(); }
