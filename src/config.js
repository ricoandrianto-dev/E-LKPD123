export function getFirebaseConfig() {
  const runtime = window.FIREBASE_CONFIG || {};
  const env = import.meta.env || {};
  return {
    apiKey: runtime.apiKey || env.VITE_FIREBASE_API_KEY || "",
    authDomain: runtime.authDomain || env.VITE_FIREBASE_AUTH_DOMAIN || "",
    databaseURL: runtime.databaseURL || env.VITE_FIREBASE_DATABASE_URL || "",
    projectId: runtime.projectId || env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: runtime.storageBucket || env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: runtime.messagingSenderId || env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: runtime.appId || env.VITE_FIREBASE_APP_ID || ""
  };
}

export function getClassId() {
  const raw = window.APP_CLASS_ID || import.meta.env.VITE_APP_CLASS_ID || "collapose_kelas_1";
  return String(raw).replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function validateFirebaseConfig(config) {
  const missing = [];
  for (const key of ["apiKey", "authDomain", "databaseURL", "projectId", "appId"]) {
    if (!config[key] || String(config[key]).includes("ISI_")) missing.push(key);
  }
  if (config.databaseURL && !/firebasedatabase\.app|firebaseio\.com/.test(config.databaseURL)) {
    missing.push("databaseURL tidak valid");
  }
  return missing;
}
