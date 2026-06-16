export const defaultQuestions = {
  q1: { id: "q1", title: "Soal Beras Pecahan", text: "Seorang pedagang beras memiliki kemasan 1/3 kg, 1/4 kg, 1/2 kg, dan 1 kg. Pembeli ingin membeli 2 kg beras. Kemasan mana saja yang harus disiapkan? Tentukan dua cara berbeda untuk menyiapkan beras tersebut." },
  q2: { id: "q2", title: "Soal Penjumlahan Pecahan", text: "Sinta ingin menjumlahkan pecahan 1/3 kg, 1/4 kg, dan 1/2 kg. Menurut kalian, ada berapa cara untuk menyamakan penyebut dari pecahan tersebut? Buatlah dua soal berbeda yang menggunakan tiga pecahan." },
  q3: { id: "q3", title: "Soal Coklat", text: "Dian memiliki 3 buah coklat. Ketiga coklat tersebut akan dipotong menjadi beberapa bagian dan diberikan kepada 6 temannya. Berapa bagian coklat yang diperoleh masing-masing teman Dian jika mereka mendapat bagian yang sama?" }
};

export const defaultGroups = {
  g1: { id: "g1", number: 1, name: "Kelompok 1", type: "Heterogen 1", members: {
    g1_m1: { id: "g1_m1", name: "Elvina Ratna Puspita", nim: "-", code: "K1-1" },
    g1_m2: { id: "g1_m2", name: "Muhammad Fajar Aditya Nugraha", nim: "-", code: "K1-2" },
    g1_m3: { id: "g1_m3", name: "Nadia Anindya Dewanti", nim: "-", code: "K1-3" }
  }},
  g2: { id: "g2", number: 2, name: "Kelompok 2", type: "Heterogen 2", members: {
    g2_m1: { id: "g2_m1", name: "Daffa Nur Aditya", nim: "-", code: "K2-1" },
    g2_m2: { id: "g2_m2", name: "Citra Putri Ayuningtyas", nim: "-", code: "K2-2" },
    g2_m3: { id: "g2_m3", name: "Hendra Arif Hidayat", nim: "-", code: "K2-3" }
  }}
};

export const defaultSettings = { questionMode: "random", selectedQuestionId: "q1", assignments: { g1: "q1", g2: "q2" } };

export const phases = [
  { id: 1, key: "phase1", label: "Fase 1", title: "Mengerjakan Soal dari Guru", minutes: 15, desc: "Jawaban kelompok dan whiteboard.", submit: "Kumpulkan Jawaban" },
  { id: 2, key: "phase2", label: "Fase 2", title: "Membuat Soal Baru", minutes: 10, desc: "Soal guru read-only, area revisi, dan preview.", submit: "Cetak/Download Soal Final" },
  { id: 3, key: "phase3", label: "Fase 3", title: "Memeriksa & Menyempurnakan", minutes: 10, desc: "Penyempurnaan akhir dan finalisasi.", submit: "Kirim ke Bank Soal" }
];
