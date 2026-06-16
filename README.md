# E-LKPD Collapose Firebase Ready

Versi ini dibuat ulang agar tidak lagi diam-diam menjalankan mode lokal. Jika Firebase salah, aplikasi menampilkan status **Firebase belum terkoneksi**. Jika Firebase benar, whiteboard, jawaban kelompok, revisi soal, persetujuan anggota, dashboard guru, dan bank soal tersinkron melalui Firebase Realtime Database.

## Struktur

```text
e-lkpd-collapose-firebase-ready/
├─ index.html
├─ package.json
├─ vercel.json
├─ .env.example
├─ public/
│  └─ firebase-config.js
└─ src/
   ├─ main.js
   ├─ styles.css
   ├─ config.js
   ├─ defaults.js
   ├─ firebase-service.js
   ├─ app-state.js
   ├─ utils.js
   └─ whiteboard.js
```

## Cara paling mudah mengisi Firebase

Buka:

```text
public/firebase-config.js
```

Ganti bagian ini:

```javascript
window.FIREBASE_CONFIG = {
  apiKey: "ISI_API_KEY_FIREBASE",
  authDomain: "ISI_PROJECT.firebaseapp.com",
  databaseURL: "https://ISI_PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ISI_PROJECT",
  storageBucket: "ISI_PROJECT.appspot.com",
  messagingSenderId: "ISI_MESSAGING_SENDER_ID",
  appId: "ISI_APP_ID"
};
```

dengan config Firebase Bapak.

## Wajib: databaseURL dari Realtime Database

Jangan hanya mengambil config dari Web App jika `databaseURL` belum muncul. Ambil URL dari:

```text
Firebase Console
→ Build / Databases & Storage
→ Realtime Database
→ Data
→ copy URL database di bagian atas
```

Contoh:

```javascript
databaseURL: "https://e-lkpd-8b8fa-default-rtdb.asia-southeast1.firebasedatabase.app"
```

## Rules untuk uji coba awal

Di Firebase Realtime Database → Rules, gunakan sementara:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

Rules ini hanya untuk uji coba, bukan produksi.

## Cara menjalankan lokal

```bash
npm install
npm run dev
```

## Deploy ke Vercel

1. Upload seluruh folder ini ke GitHub.
2. Import repository ke Vercel.
3. Framework preset: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Deploy.

## Tes realtime

1. Buka link Vercel di Chrome.
2. Buka link yang sama di Edge/Firefox atau perangkat lain.
3. Masuk pada **kelompok yang sama**, tetapi pilih anggota berbeda.
4. Ketik jawaban fase 1.
5. Coret whiteboard.
6. Jika status menunjukkan **Firebase terkoneksi**, perubahan akan muncul di browser lain.

## Format Excel/CSV mahasiswa

```csv
Nama,NIM,Kelompok
Citra Putri Ayuningtyas,23010001,1
Daffa Nur Aditya,23010002,1
Hendra Arif Hidayat,23010003,1
```
