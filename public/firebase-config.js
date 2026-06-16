// WAJIB DIISI AGAR REALTIME BERFUNGSI DI VERCEL.
// Ambil dari Firebase Console > Project settings > Your apps.
// Pastikan Realtime Database sudah dibuat dan databaseURL benar.
window.FIREBASE_CONFIG = {
  apiKey: "ISI_API_KEY_FIREBASE",
  authDomain: "ISI_PROJECT.firebaseapp.com",
  databaseURL: "https://ISI_PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ISI_PROJECT",
  storageBucket: "ISI_PROJECT.appspot.com",
  messagingSenderId: "ISI_MESSAGING_SENDER_ID",
  appId: "ISI_APP_ID"
};

// Ganti classId jika ingin membuat kelas/ruang data baru tanpa menghapus data lama.
window.APP_CLASS_ID = "collapose_kelas_1";
