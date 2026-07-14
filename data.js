/* =========================================================================
   DATA REFERENSI — Aplikasi SKDR & Pelaporan Bencana Puskesmas Sale
   Sumber daftar & definisi operasional: Pedoman SKDR Kemenkes RI (2021/2023)
   Catatan: daftar penyakit dapat disesuaikan lewat menu "Kelola Penyakit"
   ========================================================================= */

const DESA_LIST = [
  "Bancang", "Bitingan", "Gading", "Jinanten", "Joho", "Mrayun", "Ngajaran",
  "Pakis", "Rendeng", "Sale", "Sumbermulyo", "Tahunan", "Tengger", "Ukir",
  "Wonokerto"
];

const UNIT_PELAPOR_LIST = [
  "Poli Anak", "Ranap", "IGD", "BP/Poli Umum", "Poli KIA",
  "Pustu Sumbermulyo", "Pustu Tengger", "Pustu Mrayun", "Pustu Tahunan", "Pustu Ukir",
  "PKD Rendeng", "PKD Pakis", "PKD Ngajaran",
  "BPM Emy Widyaastuti", "BPM Endang", "BPM Sulistyaningrum", "BPM Kartini",
  "BPM Rina Wariyanti", "PKD Bancang", "BPM Lailatul Lutfia", "BPM Anita Dwi",
  "BPM Sri Damayanti", "BPM Nurmini", "BPM Siti Patonah", "PKD Joho",
  "BPM Lilis S", "DPM dr. Erra Irhamni", "DPM dr. Anton", "drg. Lutfia",
  "Laporan RS/Masyarakat"
];

// 24 penyakit potensial KLB/wabah SKDR + gejala kunci (checklist) per penyakit.
// "kode" mengikuti kode SMS W2 SKDR resmi (A-Z, tanpa I & O).
const PENYAKIT_LIST = [
  { kode: "A", nama: "Diare Akut", kategori: "Pencernaan", gejala: [
    "BAB cair ≥3 kali dalam 24 jam", "Tanpa darah dalam tinja", "Onset mendadak",
    "Tanda dehidrasi (haus, mata cekung, turgor kulit menurun)", "Mual/muntah", "Nyeri perut" ] },
  { kode: "B", nama: "Malaria Konfirmasi", kategori: "Vektor", gejala: [
    "Demam menggigil berkala (periodik)", "Hasil pemeriksaan darah/RDT positif Plasmodium",
    "Riwayat bepergian/tinggal di daerah endemis malaria", "Sakit kepala", "Nyeri otot/sendi", "Berkeringat banyak setelah demam turun" ] },
  { kode: "C", nama: "Suspek Dengue (DBD)", kategori: "Vektor", gejala: [
    "Demam mendadak tinggi 2-7 hari", "Nyeri sendi/otot/tulang hebat", "Nyeri di belakang mata",
    "Ruam kulit (bintik merah)", "Tanda perdarahan (mimisan, gusi berdarah, petekie)", "Trombosit rendah (bila ada hasil lab)" ] },
  { kode: "D", nama: "Pneumonia", kategori: "Saluran napas", gejala: [
    "Batuk", "Napas cepat sesuai usia", "Sesak napas", "Tarikan dinding dada bagian bawah ke dalam",
    "Demam", "Pada balita: tidak mau menyusu/makan" ] },
  { kode: "E", nama: "Diare Berdarah / Disentri", kategori: "Pencernaan", gejala: [
    "BAB berdarah, dengan/tanpa lendir", "Nyeri perut (kram)", "Tenesmus (rasa ingin BAB terus-menerus)",
    "Demam", "Frekuensi BAB meningkat" ] },
  { kode: "F", nama: "Suspek Demam Tifoid", kategori: "Pencernaan", gejala: [
    "Demam ≥7 hari, naik turun terutama sore/malam", "Gangguan pencernaan (mual, nyeri perut, sembelit/diare)",
    "Lidah kotor (coated tongue)", "Nadi lambat tak sebanding demam (bradikardi relatif)", "Sakit kepala", "Lemas/lesu" ] },
  { kode: "G", nama: "Sindrom Jaundice Akut", kategori: "Hepatitis", gejala: [
    "Kulit dan/atau mata kuning mendadak", "Urin berwarna gelap seperti teh",
    "Mual/muntah", "Nyeri perut kanan atas", "Demam", "Lemas" ] },
  { kode: "H", nama: "Suspek Chikungunya", kategori: "Vektor", gejala: [
    "Demam mendadak tinggi (>38.5°C)", "Nyeri sendi hebat (bisa sampai sulit berjalan)",
    "Ruam kulit", "Sakit kepala", "Nyeri otot" ] },
  { kode: "J", nama: "Suspek Flu Burung pada Manusia", kategori: "Zoonosis", gejala: [
    "Demam mendadak", "Batuk/pilek", "Sesak napas atau tanda pneumonia",
    "Riwayat kontak unggas sakit/mati mendadak atau produk unggas", "Leukopenia (bila ada hasil lab)" ] },
  { kode: "K", nama: "Suspek Campak", kategori: "PD3I", gejala: [
    "Demam ≥38°C selama 3 hari atau lebih", "Ruam kemerahan makulopapular",
    "Disertai batuk", "Dan/atau pilek", "Dan/atau mata merah (konjungtivitis)" ] },
  { kode: "L", nama: "Suspek Difteri", kategori: "PD3I", gejala: [
    "Radang tenggorokan/amandel/laring, dengan atau tanpa demam",
    "Pseudomembran putih keabu-abuan, mudah berdarah bila dilepas",
    "Pembengkakan kelenjar leher ('bullneck')", "Suara serak atau bunyi napas (stridor)" ] },
  { kode: "M", nama: "Suspek Pertusis", kategori: "PD3I", gejala: [
    "Batuk lebih dari 2 minggu", "Batuk paroksismal/beruntun (batuk rejan)",
    "Diikuti tarikan napas berbunyi ('whoop')", "Muntah setelah batuk", "Batuk lebih berat pada malam hari" ] },
  { kode: "N", nama: "AFP (Lumpuh Layuh Mendadak)", kategori: "PD3I", gejala: [
    "Kelumpuhan/kelemahan otot mendadak bersifat layuh (flaccid)", "Usia penderita < 15 tahun",
    "Bukan disebabkan trauma/kecelakaan", "Terjadi progresif dalam beberapa hari" ] },
  { kode: "P", nama: "Gigitan Hewan Penular Rabies (GHPR)", kategori: "Zoonosis", gejala: [
    "Riwayat digigit/dicakar/terpapar liur hewan (anjing/kucing/kera, dll)",
    "Terdapat luka gigitan/cakaran", "Hewan tersangka rabies atau tidak dapat diobservasi 14 hari",
    "Gejala neurologis bila sudah lanjut (takut air/hidrofobia, kejang)" ] },
  { kode: "Q", nama: "Suspek Antraks", kategori: "Zoonosis", gejala: [
    "Luka kulit dengan bagian tengah kehitaman (eskar) tanpa nyeri",
    "Riwayat kontak dengan ternak sakit/mati mendadak atau produk hewan",
    "Demam", "Sesak napas (bentuk paru)", "Gejala pencernaan berat (bentuk usus)" ] },
  { kode: "R", nama: "Suspek Leptospirosis", kategori: "Zoonosis", gejala: [
    "Demam akut mendadak", "Nyeri otot terutama betis", "Sakit kepala",
    "Mata merah tanpa kotoran mata (conjunctival suffusion)",
    "Riwayat kontak air/lumpur banjir atau lingkungan tercemar urin tikus" ] },
  { kode: "S", nama: "Suspek Kolera", kategori: "Pencernaan", gejala: [
    "Diare cair terus-menerus seperti air cucian beras", "Tanpa nyeri perut",
    "Mual/muntah di awal penyakit", "Dehidrasi berat yang cepat", "Onset mendadak" ] },
  { kode: "T", nama: "Klaster Penyakit Tidak Lazim", kategori: "Kejadian khusus", gejala: [
    "Dua atau lebih kasus/kematian dengan gejala serupa", "Ada hubungan epidemiologi (waktu, tempat, orang)",
    "Terjadi dalam satu wilayah/kelompok masyarakat", "Tidak sesuai definisi penyakit SKDR lain" ] },
  { kode: "U", nama: "Suspek Meningitis/Ensefalitis", kategori: "Saraf", gejala: [
    "Demam mendadak tinggi", "Sakit kepala hebat", "Kaku kuduk",
    "Penurunan kesadaran", "Kejang", "Muntah proyektil" ] },
  { kode: "V", nama: "Suspek Tetanus Neonatorum", kategori: "PD3I", gejala: [
    "Bayi usia 3-28 hari", "Tiba-tiba sulit/tidak bisa menyusu", "Mulut mencucu (trismus)",
    "Kejang/kaku seluruh tubuh", "Riwayat persalinan/perawatan tali pusat tidak higienis" ] },
  { kode: "W", nama: "Suspek Tetanus", kategori: "PD3I", gejala: [
    "Kekakuan otot rahang/wajah (trismus)", "Kejang otot mendadak",
    "Riwayat luka sebelumnya (tertusuk paku/benda kotor)", "Kesulitan menelan", "Punggung melengkung (opistotonus)" ] },
  { kode: "Y", nama: "ILI (Influenza Like Illness)", kategori: "Saluran napas", gejala: [
    "Demam mendadak >38°C", "Batuk", "Dan/atau nyeri tenggorokan",
    "Tanpa penyebab lain yang jelas", "Nyeri otot/sakit kepala/lemas" ] },
  { kode: "Z", nama: "Suspek HFMD", kategori: "Anak", gejala: [
    "Demam 38-39°C selama 3-7 hari", "Nyeri menelan", "Bintik/lepuh (vesikel) di rongga mulut",
    "Dan/atau ruam di telapak tangan, kaki, bokong", "Umumnya usia < 10 tahun" ] },
  { kode: "X", nama: "Suspek COVID-19", kategori: "Saluran napas", gejala: [
    "Demam atau riwayat demam", "Batuk kering/berdahak", "Gangguan penciuman/pengecapan",
    "Sesak napas", "Riwayat kontak erat kasus konfirmasi atau riwayat bepergian dari wilayah transmisi" ] },
];

const JENIS_BENCANA_LIST = [
  "Banjir", "Tanah Longsor", "Angin Puting Beliung/Kencang", "Kebakaran",
  "Gempa Bumi", "Kekeringan", "Wabah/KLB Penyakit", "Lainnya"
];

const STATUS_KASUS_LIST = ["Suspek", "Probable", "Konfirmasi", "Discarded/Bukan Kasus"];
const JENIS_KELAMIN_LIST = ["Laki-laki", "Perempuan"];
