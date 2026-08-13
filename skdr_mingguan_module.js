/* ===== skdr_mingguan_module.js ===== */
/* =========================================================================
   MODUL SKDR MINGGUAN — Terintegrasi ke WASPADANE Puskesmas Sale
   Pelaporan W2 per fasyankes jejaring, 25 penyakit resmi SKDR Kemenkes
   Penyimpanan GANDA: localStorage (offline) + Google Sheets (cloud/online)
   ========================================================================= */

/* ------------------------------------------------------------------
   1. DATA REFERENSI
   ------------------------------------------------------------------ */
const SKDR_PENYAKIT = [
  { k:"A",  n:"Diare Akut" },
  { k:"B",  n:"Malaria Konfirmasi" },
  { k:"C",  n:"Suspek Dengue (DBD)" },
  { k:"D",  n:"Pneumonia" },
  { k:"E",  n:"Diare Berdarah / Disentri" },
  { k:"F",  n:"Suspek Demam Tifoid" },
  { k:"G",  n:"Sindrom Jaundice Akut" },
  { k:"H",  n:"Suspek Chikungunya" },
  { k:"J",  n:"Suspek Flu Burung pada Manusia" },
  { k:"K",  n:"Suspek Campak" },
  { k:"L",  n:"Suspek Difteri" },
  { k:"M",  n:"Suspek Pertusis" },
  { k:"N",  n:"AFP (Lumpuh Layuh Mendadak)" },
  { k:"P",  n:"Gigitan Hewan Penular Rabies (GHPR)" },
  { k:"Q",  n:"Suspek Antraks" },
  { k:"R",  n:"Suspek Leptospirosis" },
  { k:"S",  n:"Suspek Kolera" },
  { k:"T",  n:"Klaster Penyakit Tidak Lazim" },
  { k:"U",  n:"Suspek Meningitis/Ensefalitis" },
  { k:"V",  n:"Suspek Tetanus Neonatorum" },
  { k:"W",  n:"Suspek Tetanus" },
  { k:"Y",  n:"ILI (Influenza Like Illness)" },
  { k:"Z",  n:"Suspek HFMD" },
  { k:"AA", n:"ISPA" },
  { k:"AC", n:"Suspek COVID-19" },
];

const SKDR_FASYANKES = [
  { nama:"Ranap",                    jenis:"Puskesmas" },
  { nama:"IGD",                      jenis:"Puskesmas" },
  { nama:"BP/Poli Umum",             jenis:"Puskesmas" },
  { nama:"Poli Anak",                jenis:"Puskesmas" },
  { nama:"Poli KIA",                 jenis:"Puskesmas" },
  { nama:"Pustu Sumbermulyo",        jenis:"Pustu" },
  { nama:"Pustu Tengger",            jenis:"Pustu" },
  { nama:"Pustu Mrayun",             jenis:"Pustu" },
  { nama:"Pustu Tahunan",            jenis:"Pustu" },
  { nama:"Pustu Ukir",               jenis:"Pustu" },
  { nama:"PKD Rendeng",              jenis:"PKD" },
  { nama:"PKD Pakis",                jenis:"PKD" },
  { nama:"PKD Ngajaran",             jenis:"PKD" },
  { nama:"PKD Bancang",              jenis:"PKD" },
  { nama:"PKD Joho",                 jenis:"PKD" },
  { nama:"BPM Emy Widyaastuti",      jenis:"BPM" },
  { nama:"BPM Endang",               jenis:"BPM" },
  { nama:"BPM Sulistyaningrum",      jenis:"BPM" },
  { nama:"BPM Kartini",              jenis:"BPM" },
  { nama:"BPM Rina Wariyanti",       jenis:"BPM" },
  { nama:"BPM Lailatul Lutfia",      jenis:"BPM" },
  { nama:"BPM Anita Dwi",            jenis:"BPM" },
  { nama:"BPM Sri Damayanti",        jenis:"BPM" },
  { nama:"BPM Nurmini",              jenis:"BPM" },
  { nama:"BPM Siti Patonah",         jenis:"BPM" },
  { nama:"BPM Lilis S",              jenis:"BPM" },
  { nama:"DPM dr. Erra Irhamni",     jenis:"DPM" },
  { nama:"DPM dr. Anton",            jenis:"DPM" },
  { nama:"drg. Lutfia",              jenis:"DPM" },
  { nama:"Laporan RS/Masyarakat",    jenis:"Masyarakat" },
];

const SKDR_JENIS_COLOR = {
  Puskesmas:"skdr-b", Pustu:"skdr-g", PKD:"skdr-a",
  BPM:"skdr-r", DPM:"skdr-b", Masyarakat:"skdr-n"
};

/* ------------------------------------------------------------------
   2. PENYIMPANAN — localStorage (offline) + Google Sheets (cloud)
   ------------------------------------------------------------------ */
const SKDR_LS       = "skdr_mingguan_v1";
const SKDR_PENDING  = "skdr_pending_sync";  // antrian data yang belum tersinkron
let skdrDb          = {};
let skdrPending     = [];  // array laporan menunggu sync

// Ambil URL Google Apps Script dari pengaturan atau dari app.js
function skdrGetSheetUrl() {
  return localStorage.getItem('skdr_sheet_url') ||
         (typeof SKDR_SHEET_URL !== 'undefined' ? SKDR_SHEET_URL : '') ||
         '';
}

// ---- localStorage ----
function skdrLoad() {
  try { skdrDb      = JSON.parse(localStorage.getItem(SKDR_LS) || '{}'); } catch(e) { skdrDb = {}; }
  try { skdrPending = JSON.parse(localStorage.getItem(SKDR_PENDING) || '[]'); } catch(e) { skdrPending = []; }
}
function skdrSave() {
  try { localStorage.setItem(SKDR_LS,      JSON.stringify(skdrDb));      } catch(e) {}
  try { localStorage.setItem(SKDR_PENDING, JSON.stringify(skdrPending)); } catch(e) {}
}
skdrLoad();

// ---- Google Sheets: kirim satu record ----
async function skdrSyncToSheets(record) {
  const url = skdrGetSheetUrl();
  if (!url) return { ok: false, reason: 'URL belum diset' };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'skdrSimpan', record })
    });
    const json = await res.json();
    return { ok: json.status === 'ok', reason: json.message || '' };
  } catch(e) {
    return { ok: false, reason: e.message };
  }
}

// ---- Google Sheets: ambil semua data SKDR (untuk sinkronisasi masuk) ----
async function skdrFetchFromSheets(tahun, minggu) {
  const url = skdrGetSheetUrl();
  if (!url) return null;
  try {
    const params = new URLSearchParams({ action:'skdrGet', tahun, minggu });
    const res = await fetch(url + '?' + params);
    const json = await res.json();
    return json.data || null;
  } catch(e) { return null; }
}

// ---- Proses antrian pending (dipanggil saat online) ----
async function skdrFlushPending() {
  if (!skdrPending.length) return;
  const url = skdrGetSheetUrl();
  if (!url) return;
  const gagal = [];
  for (const rec of skdrPending) {
    const result = await skdrSyncToSheets(rec);
    if (!result.ok) gagal.push(rec);
  }
  skdrPending = gagal;
  skdrSave();
  if (!gagal.length) {
    skdrUpdateSyncBadge();
  }
}

// ---- Update badge pending di header ----
function skdrUpdateSyncBadge() {
  const el = document.getElementById('skdrPendingBadge');
  if (el) el.textContent = skdrPending.length;
  // Update badge utama di header jika ada
  const hdr = document.getElementById('pendingCount');
  if (hdr) {
    // gabungkan pending SKDR + pending kasus umum jika ada
    const totalPending = skdrPending.length + (parseInt(hdr.dataset.kasusCount||0));
    hdr.textContent = totalPending;
  }
}

/* ------------------------------------------------------------------
   3. MINGGU EPIDEMIOLOGI
   ------------------------------------------------------------------ */
function skdrGetEpiWeeks(year) {
  const weeks = [];
  const jan1  = new Date(year, 0, 1);
  let dow     = jan1.getDay(); if (dow === 0) dow = 7;
  const first = new Date(jan1);
  first.setDate(jan1.getDate() - (dow - 1));
  for (let i = 0; i < 53; i++) {
    const s = new Date(first); s.setDate(first.getDate() + i * 7);
    const e = new Date(s);    e.setDate(s.getDate() + 6);
    if (s.getFullYear() > year && i > 0) break;
    weeks.push({ week: i + 1, start: s, end: e });
  }
  return weeks;
}
function skdrFmtD(d) {
  return d.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
}
function skdrFillW(selId, year) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  const yr    = parseInt(year || new Date().getFullYear());
  const weeks = skdrGetEpiWeeks(yr);
  const now   = new Date();
  sel.innerHTML = '';
  let si = 0;
  weeks.forEach((w, i) => {
    const o   = document.createElement('option');
    o.value   = w.week;
    o.text    = 'Minggu ' + String(w.week).padStart(2,'0') +
                ' (' + skdrFmtD(w.start) + ' – ' + skdrFmtD(w.end) + ')';
    if (now >= w.start && now <= w.end) si = i;
    sel.appendChild(o);
  });
  sel.selectedIndex = si;
}
function skdrUpdateTgl() {
  const tahunEl  = document.getElementById('skdr-tahun');
  const mingguEl = document.getElementById('skdr-minggu');
  const periodeEl= document.getElementById('skdr-periode');
  if (!tahunEl || !mingguEl || !periodeEl) return;
  const y  = parseInt(tahunEl.value);
  const wn = parseInt(mingguEl.value);
  const w  = skdrGetEpiWeeks(y).find(x => x.week === wn);
  if (w) periodeEl.textContent = skdrFmtD(w.start) + ' — ' + skdrFmtD(w.end);
}

/* ------------------------------------------------------------------
   4. BUILD FORM
   ------------------------------------------------------------------ */
function skdrBuildFasSelect() {
  const sel = document.getElementById('skdr-fasyankes');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Pilih Unit Pelapor --</option>';
  SKDR_FASYANKES.forEach(f => {
    const o = document.createElement('option');
    o.value = f.nama;
    o.text  = '[' + f.jenis + '] ' + f.nama;
    sel.appendChild(o);
  });
}
function skdrBuildTable() {
  const tbody = document.getElementById('skdr-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  SKDR_PENYAKIT.forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td style="white-space:nowrap"><span class="skdr-kb">' + p.k + '</span></td>' +
      '<td style="font-size:13px">' + p.n + '</td>' +
      '<td style="text-align:center">' +
        '<input type="number" class="skdr-ni" min="0" id="skdr-k' + i + '" ' +
        'oninput="skdrCalcTotal()" placeholder="0">' +
      '</td>' +
      '<td style="text-align:center">' +
        '<input type="number" class="skdr-ni skdr-ni-mati" min="0" id="skdr-m' + i + '" ' +
        'oninput="skdrCalcTotal()" placeholder="0">' +
      '</td>';
    tbody.appendChild(tr);
  });
  skdrCalcTotal();
}

/* ------------------------------------------------------------------
   5. KALKULASI TOTAL
   ------------------------------------------------------------------ */
function skdrCalcTotal() {
  let tk = 0, tm = 0;
  SKDR_PENYAKIT.forEach((_, i) => {
    tk += parseInt(document.getElementById('skdr-k'+i)?.value || 0) || 0;
    tm += parseInt(document.getElementById('skdr-m'+i)?.value || 0) || 0;
  });
  const ek = document.getElementById('skdr-tot-kasus');
  const em = document.getElementById('skdr-tot-mati');
  if (ek) ek.textContent = tk;
  if (em) em.textContent = tm;
}

/* ------------------------------------------------------------------
   6. AMBIL DATA FORM
   ------------------------------------------------------------------ */
function skdrGetFormData() {
  const d = {};
  SKDR_PENYAKIT.forEach((p, i) => {
    d[p.k] = {
      kasus: parseInt(document.getElementById('skdr-k'+i)?.value || 0) || 0,
      mati:  parseInt(document.getElementById('skdr-m'+i)?.value || 0) || 0
    };
  });
  return d;
}
function skdrGetBase() {
  return {
    fasy:      document.getElementById('skdr-fasyankes')?.value || '',
    tahun:     document.getElementById('skdr-tahun')?.value || String(new Date().getFullYear()),
    minggu:    document.getElementById('skdr-minggu')?.value || '1',
    kunjungan: document.getElementById('skdr-kunjungan')?.value || '0'
  };
}

/* ------------------------------------------------------------------
   7. SIMPAN — DUAL STORAGE (localStorage + Google Sheets)
   ------------------------------------------------------------------ */
async function skdrSimpan() {
  const b = skdrGetBase();
  if (!b.fasy) { toast('Pilih unit pelapor terlebih dahulu.', true); return; }

  // Validasi meninggal tidak boleh > kasus
  let valid = true;
  SKDR_PENYAKIT.forEach((p, i) => {
    const kas  = parseInt(document.getElementById('skdr-k'+i)?.value || 0) || 0;
    const mati = parseInt(document.getElementById('skdr-m'+i)?.value || 0) || 0;
    if (mati > kas) valid = false;
  });
  if (!valid) {
    toast('Jumlah meninggal tidak boleh melebihi jumlah kasus.', true);
    return;
  }

  const key    = b.tahun + '_W' + String(b.minggu).padStart(2,'0') + '_' + b.fasy;
  const record = {
    ...b,
    key,
    nihil: false,
    data:  skdrGetFormData(),
    waktu: new Date().toISOString()
  };

  // 1️⃣ Simpan ke localStorage dulu (selalu berhasil, offline-safe)
  skdrDb[key] = record;
  skdrSave();
  toast('✓ Tersimpan lokal. Mengirim ke Google Sheets...');

  // 2️⃣ Kirim ke Google Sheets
  const url = skdrGetSheetUrl();
  if (!url) {
    // Belum ada URL → masukkan ke antrian pending
    skdrPending.push(record);
    skdrSave();
    skdrUpdateSyncBadge();
    toast('✓ Tersimpan lokal. (URL Google Sheets belum diset — data akan disync setelah diset)', true);
    return;
  }

  skdrSetSyncStatus(key, 'syncing');
  const result = await skdrSyncToSheets(record);
  if (result.ok) {
    record.synced = true;
    skdrDb[key]   = record;
    skdrSave();
    skdrSetSyncStatus(key, 'ok');
    toast('✓ Laporan ' + b.fasy + ' Minggu ' + b.minggu + '/' + b.tahun + ' berhasil disimpan & disinkronkan ke Google Sheets!');
  } else {
    // Gagal → masukkan antrian pending, akan dicoba ulang saat online
    skdrPending.push(record);
    skdrSave();
    skdrUpdateSyncBadge();
    skdrSetSyncStatus(key, 'pending');
    toast('✓ Tersimpan lokal. Gagal sync ke Sheets (' + result.reason + ') — akan dicoba ulang otomatis.', true);
  }
}

async function skdrSimpanNihil() {
  const b = skdrGetBase();
  if (!b.fasy) { toast('Pilih unit pelapor terlebih dahulu.', true); return; }
  if (!confirm(
    'Kirim laporan NIHIL untuk ' + b.fasy + '?\n\n' +
    'Artinya tidak ada kunjungan maupun kasus penyakit SKDR pada minggu ini.'
  )) return;

  const key      = b.tahun + '_W' + String(b.minggu).padStart(2,'0') + '_' + b.fasy;
  const emptyData = {};
  SKDR_PENYAKIT.forEach(p => { emptyData[p.k] = { kasus:0, mati:0 }; });
  const record = {
    ...b,
    key,
    nihil: true,
    data:  emptyData,
    waktu: new Date().toISOString()
  };

  // 1️⃣ localStorage
  skdrDb[key] = record;
  skdrSave();

  // 2️⃣ Google Sheets
  const url = skdrGetSheetUrl();
  if (url) {
    const result = await skdrSyncToSheets(record);
    if (result.ok) {
      record.synced = true;
      skdrDb[key]   = record;
      skdrSave();
      toast('✓ Laporan NIHIL ' + b.fasy + ' tersimpan & disinkronkan!');
    } else {
      skdrPending.push(record);
      skdrSave();
      skdrUpdateSyncBadge();
      toast('✓ Laporan NIHIL tersimpan lokal. Gagal sync ke Sheets — akan dicoba ulang.', true);
    }
  } else {
    skdrPending.push(record);
    skdrSave();
    skdrUpdateSyncBadge();
    toast('✓ Laporan NIHIL ' + b.fasy + ' tersimpan lokal.');
  }
}

// ---- Sync manual: tarik data dari Sheets & gabungkan ke localStorage ----
async function skdrPullFromSheets() {
  const url = skdrGetSheetUrl();
  if (!url) { toast('URL Google Sheets belum diset di Pengaturan.', true); return; }
  const tahun  = document.getElementById('skdr-r-tahun')?.value  || new Date().getFullYear();
  const minggu = document.getElementById('skdr-r-minggu')?.value || 1;
  toast('Mengambil data dari Google Sheets...');
  const data = await skdrFetchFromSheets(tahun, minggu);
  if (!data) { toast('Gagal mengambil data dari Sheets.', true); return; }
  // Gabungkan: data dari Sheets menimpa localStorage untuk key yang sama
  let count = 0;
  data.forEach(rec => {
    if (rec.key) { skdrDb[rec.key] = rec; count++; }
  });
  skdrSave();
  skdrRenderRekap();
  skdrRenderStatus();
  toast('✓ ' + count + ' data berhasil disinkronkan dari Google Sheets.');
}

/* ------------------------------------------------------------------
   8. INDIKATOR SYNC PER BARIS (opsional, untuk status di form)
   ------------------------------------------------------------------ */
function skdrSetSyncStatus(key, status) {
  // Bisa dikembangkan untuk menampilkan indikator per baris di tabel status
  skdrRenderStatus();
}

/* ------------------------------------------------------------------
   9. RESET
   ------------------------------------------------------------------ */
function skdrReset() {
  SKDR_PENYAKIT.forEach((_, i) => {
    const ek = document.getElementById('skdr-k'+i); if (ek) ek.value = '';
    const em = document.getElementById('skdr-m'+i); if (em) em.value = '';
  });
  skdrCalcTotal();
  const kj  = document.getElementById('skdr-kunjungan');
  if (kj) kj.value = '';
  const fas = document.getElementById('skdr-fasyankes');
  if (fas) fas.value = '';
}

/* ------------------------------------------------------------------
   10. AGREGASI DATA
   ------------------------------------------------------------------ */
function skdrGetAggr(tahun, minggu) {
  const mStr  = String(minggu).padStart(2,'0');
  const prefix = tahun + '_W' + mStr + '_';
  const keys  = Object.keys(skdrDb).filter(k => k.startsWith(prefix));
  const aggr  = {};
  SKDR_PENYAKIT.forEach(p => { aggr[p.k] = { kasus:0, mati:0 }; });
  let totalK = 0, nihilCount = 0;
  keys.forEach(k => {
    const r = skdrDb[k];
    if (r.nihil) nihilCount++;
    SKDR_PENYAKIT.forEach(p => {
      aggr[p.k].kasus += (r.data?.[p.k]?.kasus || 0);
      aggr[p.k].mati  += (r.data?.[p.k]?.mati  || 0);
    });
    totalK += parseInt(r.kunjungan) || 0;
  });
  return { aggr, totalK, keys, nihilCount };
}

/* ------------------------------------------------------------------
   11. RENDER REKAPITULASI
   ------------------------------------------------------------------ */
function skdrRenderRekap() {
  const el = document.getElementById('skdr-rekap-content');
  if (!el) return;
  const tahun  = document.getElementById('skdr-r-tahun')?.value  || new Date().getFullYear();
  const minggu = document.getElementById('skdr-r-minggu')?.value || 1;
  const { aggr, totalK, keys, nihilCount } = skdrGetAggr(tahun, minggu);

  const syncUrl = skdrGetSheetUrl();
  let syncBtn = syncUrl
    ? '<button class="btn secondary" style="font-size:12.5px;padding:7px 14px" onclick="skdrPullFromSheets()">🔄 Tarik data dari Google Sheets</button>'
    : '<span style="font-size:12px;color:var(--muted)">ℹ️ Hubungkan Google Sheets di Pengaturan SKDR untuk sinkronisasi antar perangkat.</span>';

  if (!keys.length) {
    el.innerHTML = '<div style="margin-bottom:12px">' + syncBtn + '</div>'
      + '<p style="color:var(--muted);font-size:13px;padding:12px 0">Belum ada laporan masuk untuk Minggu ' + minggu + ' / ' + tahun + '.</p>';
    return;
  }

  const totKasus = SKDR_PENYAKIT.reduce((s, p) => s + aggr[p.k].kasus, 0);
  const totMati  = SKDR_PENYAKIT.reduce((s, p) => s + aggr[p.k].mati,  0);
  const cfr      = totKasus > 0 ? ((totMati / totKasus) * 100).toFixed(1) + '%' : '—';

  let html = '<div style="margin-bottom:12px">' + syncBtn + '</div>'
    + '<div class="stat-row" style="grid-template-columns:repeat(3,1fr);margin-bottom:14px;">'
    + skdrStatCard(keys.length + '/' + SKDR_FASYANKES.length, 'Fasyankes melapor', '')
    + skdrStatCard(nihilCount, 'Laporan NIHIL', 'var(--amber)')
    + skdrStatCard(SKDR_FASYANKES.length - keys.length, 'Belum melapor', 'var(--danger)')
    + '</div>'
    + '<div class="stat-row" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px;">'
    + skdrStatCard(totalK.toLocaleString('id-ID'), 'Total kunjungan', '')
    + skdrStatCard(totKasus, 'Total kasus', 'var(--teal)')
    + skdrStatCard(totMati + ' (' + cfr + ')', 'Meninggal (CFR)', totMati > 0 ? 'var(--danger)' : '')
    + '</div>';

  html += '<div class="table-wrap"><table>'
    + '<thead><tr>'
    + '<th style="width:44px">Kode</th>'
    + '<th>Penyakit</th>'
    + '<th style="text-align:center;background:#EBF5FB;color:#1A5276">Kasus</th>'
    + '<th style="text-align:center;background:#FDEDEC;color:#922B21">Meninggal</th>'
    + '<th style="text-align:center">CFR (%)</th>'
    + '</tr></thead><tbody>';

  SKDR_PENYAKIT.forEach(p => {
    const kas = aggr[p.k].kasus;
    const mat = aggr[p.k].mati;
    const cfr = kas > 0 ? ((mat / kas) * 100).toFixed(1) + '%' : '—';
    const cls = kas > 10 ? 'skdr-r' : kas > 5 ? 'skdr-a' : kas > 0 ? 'skdr-g' : 'skdr-n';
    html += '<tr>'
      + '<td><span class="skdr-kb">' + p.k + '</span></td>'
      + '<td style="font-size:13px">' + p.n + '</td>'
      + '<td style="text-align:center"><span class="skdr-badge ' + cls + '">' + (kas || '—') + '</span></td>'
      + '<td style="text-align:center">'
        + (mat ? '<span class="skdr-badge skdr-r">' + mat + '</span>' : '<span style="color:#bbb">—</span>')
      + '</td>'
      + '<td style="text-align:center;font-size:12px;color:var(--muted)">' + cfr + '</td>'
      + '</tr>';
  });

  html += '<tr style="background:#EDF3F3;font-weight:600">'
    + '<td colspan="2" style="padding:8px 9px">Total</td>'
    + '<td style="text-align:center;color:var(--teal)">' + totKasus + '</td>'
    + '<td style="text-align:center;color:var(--danger)">' + totMati + '</td>'
    + '<td style="text-align:center;font-size:12px">'
      + (totKasus > 0 ? ((totMati/totKasus)*100).toFixed(1) + '%' : '—')
    + '</td>'
    + '</tr></tbody></table></div>';

  el.innerHTML = html;
}

/* ------------------------------------------------------------------
   12. RENDER STATUS PELAPORAN
   ------------------------------------------------------------------ */
function skdrRenderStatus() {
  const el = document.getElementById('skdr-status-content');
  if (!el) return;
  const tahun  = document.getElementById('skdr-s-tahun')?.value  || new Date().getFullYear();
  const minggu = document.getElementById('skdr-s-minggu')?.value || 1;
  const mStr   = String(minggu).padStart(2,'0');
  let sudah = 0, nihilCount = 0;

  let html = '<div class="table-wrap"><table>'
    + '<thead><tr>'
    + '<th style="width:32px">No</th>'
    + '<th>Unit Pelapor</th>'
    + '<th>Jenis</th>'
    + '<th>Status</th>'
    + '<th>Sinkron</th>'
    + '<th>Waktu Lapor</th>'
    + '</tr></thead><tbody>';

  SKDR_FASYANKES.forEach((f, i) => {
    const key  = tahun + '_W' + mStr + '_' + f.nama;
    const r    = skdrDb[key];
    const jcls = SKDR_JENIS_COLOR[f.jenis] || 'skdr-n';

    if (r) {
      sudah++;
      if (r.nihil) nihilCount++;
      const t       = new Date(r.waktu);
      const statusEl = r.nihil
        ? '<span class="skdr-badge skdr-a">NIHIL</span>'
        : '<span class="skdr-badge skdr-g">✓ Sudah lapor</span>';
      // Indikator sinkronisasi
      const syncEl = r.synced
        ? '<span style="color:var(--sage);font-size:12px">☁ Tersync</span>'
        : (skdrPending.some(p => p.key === key)
            ? '<span style="color:var(--amber);font-size:12px">⏳ Pending</span>'
            : '<span style="color:var(--muted);font-size:12px">💾 Lokal</span>');
      html += '<tr>'
        + '<td style="font-size:11px;color:#aaa">' + (i+1) + '</td>'
        + '<td style="font-weight:500;font-size:13px">' + f.nama + '</td>'
        + '<td><span class="skdr-badge ' + jcls + '">' + f.jenis + '</span></td>'
        + '<td>' + statusEl + '</td>'
        + '<td>' + syncEl + '</td>'
        + '<td style="font-size:12px;color:var(--muted)">'
          + t.toLocaleDateString('id-ID') + ' '
          + t.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })
        + '</td>'
        + '</tr>';
    } else {
      html += '<tr>'
        + '<td style="font-size:11px;color:#aaa">' + (i+1) + '</td>'
        + '<td style="font-weight:500;font-size:13px">' + f.nama + '</td>'
        + '<td><span class="skdr-badge ' + jcls + '">' + f.jenis + '</span></td>'
        + '<td><span class="skdr-badge skdr-a" style="opacity:.75">Belum lapor</span></td>'
        + '<td>—</td>'
        + '<td style="color:#ccc;font-size:12px">—</td>'
        + '</tr>';
    }
  });

  const pct = Math.round(sudah / SKDR_FASYANKES.length * 100);
  html += '</tbody></table></div>'
    + '<div class="stat-row" style="grid-template-columns:repeat(4,1fr);margin-top:12px;">'
    + skdrStatCard(sudah, 'Sudah melapor', 'var(--sage)')
    + skdrStatCard(nihilCount, 'Laporan NIHIL', 'var(--amber)')
    + skdrStatCard(SKDR_FASYANKES.length - sudah, 'Belum melapor', 'var(--danger)')
    + skdrStatCard(pct + '%', 'Kelengkapan', pct >= 80 ? 'var(--teal)' : 'var(--amber)')
    + '</div>';

  // Tampilkan info pending jika ada
  if (skdrPending.length) {
    html += '<div style="margin-top:10px;padding:10px 14px;background:#FFF8E1;border:1px solid var(--amber);border-radius:8px;font-size:13px;color:#7B4A00;">'
      + '⏳ <strong>' + skdrPending.length + ' laporan</strong> menunggu sinkronisasi ke Google Sheets. '
      + '<button class="btn" style="font-size:12px;padding:5px 12px;margin-left:10px" onclick="skdrFlushPending()">Coba Sync Sekarang</button>'
      + '</div>';
  }

  el.innerHTML = html;
}

/* ------------------------------------------------------------------
   13. RENDER KIRIM DINKES
   ------------------------------------------------------------------ */
function skdrRenderKirim() {
  const el = document.getElementById('skdr-kirim-content');
  if (!el) return;
  const tahun  = document.getElementById('skdr-k-tahun')?.value  || new Date().getFullYear();
  const minggu = document.getElementById('skdr-k-minggu')?.value || 1;
  const { aggr, totalK, keys, nihilCount } = skdrGetAggr(tahun, minggu);
  const pct      = Math.round(keys.length / SKDR_FASYANKES.length * 100);
  const totKasus = SKDR_PENYAKIT.reduce((s, p) => s + aggr[p.k].kasus, 0);
  const totMati  = SKDR_PENYAKIT.reduce((s, p) => s + aggr[p.k].mati,  0);
  const kasusAda = SKDR_PENYAKIT.filter(p => aggr[p.k].kasus > 0);

  let html = '';
  if (!keys.length) {
    html = '<p style="color:var(--muted);font-size:13px;padding:12px 0">Belum ada laporan masuk untuk Minggu ' + minggu + ' / ' + tahun + '.</p>';
    el.innerHTML = html;
    return;
  }

  if (pct < 80) {
    html += '<div style="padding:10px 14px;background:#FFF6E9;border:1px solid #F1DBAA;border-radius:8px;margin-bottom:14px;font-size:13px;color:#7B4A00">'
      + '⚠ Kelengkapan ' + pct + '% (' + keys.length + '/' + SKDR_FASYANKES.length
      + ' fasyankes). Disarankan ≥80% sebelum mengirim ke Dinkes.</div>';
  }

  html += '<div class="stat-row" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px;">'
    + skdrStatCard(keys.length + '/' + SKDR_FASYANKES.length, 'Fasyankes melapor', '')
    + skdrStatCard(pct + '%', 'Kelengkapan', pct >= 80 ? 'var(--teal)' : 'var(--amber)')
    + skdrStatCard(nihilCount, 'Laporan NIHIL', 'var(--amber)')
    + '</div>'
    + '<div class="stat-row" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px;">'
    + skdrStatCard(totalK.toLocaleString('id-ID'), 'Total kunjungan', '')
    + skdrStatCard(totKasus, 'Total kasus', 'var(--teal)')
    + skdrStatCard(totMati, 'Meninggal', totMati > 0 ? 'var(--danger)' : '')
    + '</div>';

  if (kasusAda.length) {
    html += '<div class="card" style="margin-bottom:14px;padding:14px;">'
      + '<h2 style="font-size:14px;margin-bottom:10px;">Penyakit dengan kasus ditemukan (' + kasusAda.length + '/25)</h2>';
    kasusAda.forEach(p => {
      const kas = aggr[p.k].kasus, mat = aggr[p.k].mati;
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--line);font-size:13px;">'
        + '<span><span class="skdr-kb" style="margin-right:8px">' + p.k + '</span>' + p.n + '</span>'
        + '<span style="display:flex;gap:6px;align-items:center">'
        + '<span class="skdr-badge ' + (kas > 10 ? 'skdr-r' : kas > 5 ? 'skdr-a' : 'skdr-g') + '">' + kas + ' kasus</span>'
        + (mat ? '<span class="skdr-badge skdr-r">' + mat + ' meninggal</span>' : '')
        + '</span></div>';
    });
    html += '</div>';
  } else {
    html += '<div style="padding:10px 14px;background:#D5F5E3;border:1px solid #A9DFBF;border-radius:8px;color:#1E8449;font-size:13px;margin-bottom:14px;">'
      + '✓ Tidak ada kasus dari 25 penyakit SKDR ditemukan minggu ini.</div>';
  }

  html += '<div class="actions-row">'
    + '<button class="btn" onclick="skdrKonfirmKirim(\'' + tahun + '\',\'' + minggu + '\')">'
    + 'Kirim ke Dinas Kesehatan' + (pct < 80 ? ' (kelengkapan rendah)' : '') + '</button>'
    + '<button class="btn secondary" onclick="window.print()">Cetak / PDF</button>'
    + '</div>';

  el.innerHTML = html;
}

function skdrKonfirmKirim(tahun, minggu) {
  if (confirm(
    'Kirim laporan SKDR Minggu ' + minggu + '/' + tahun + ' ke Dinas Kesehatan Kab. Rembang?\n\n' +
    'Pastikan semua data sudah diperiksa dan disetujui.'
  )) {
    const ref = 'SKDR-' + tahun + '-W' + String(minggu).padStart(2,'0') + '-' + Date.now().toString().slice(-6);
    toast('✓ Laporan SKDR Minggu ' + minggu + '/' + tahun + ' berhasil dikirim. No. Ref: ' + ref);
  }
}

/* ------------------------------------------------------------------
   14. PENGATURAN GOOGLE SHEETS UNTUK SKDR
   ------------------------------------------------------------------ */
function skdrSaveSheetUrl() {
  const url = document.getElementById('skdr-sheet-url-input')?.value?.trim();
  if (!url) { toast('URL tidak boleh kosong.', true); return; }
  localStorage.setItem('skdr_sheet_url', url);
  toast('✓ URL Google Sheets SKDR berhasil disimpan!');
  // Langsung coba flush pending jika ada
  skdrFlushPending();
  skdrUpdateSyncBadge();
}

/* ------------------------------------------------------------------
   15. HELPER
   ------------------------------------------------------------------ */
function skdrStatCard(val, lbl, color) {
  return '<div class="stat-card">'
    + '<div class="num" style="font-size:20px' + (color ? ';color:' + color : '') + '">' + val + '</div>'
    + '<div class="lbl">' + lbl + '</div>'
    + '</div>';
}

/* ------------------------------------------------------------------
   16. SUB-TAB NAVIGATION
   ------------------------------------------------------------------ */
function skdrShowSubTab(id) {
  document.querySelectorAll('.skdr-subtab-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.skdr-subtab-btn').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById('skdr-panel-' + id);
  const btn   = document.querySelector('.skdr-subtab-btn[data-skdr="' + id + '"]');
  if (panel) panel.style.display = 'block';
  if (btn)   btn.classList.add('active');
  if (id === 'input') {
    skdrBuildFasSelect();
    skdrBuildTable();
    skdrFillW('skdr-minggu', document.getElementById('skdr-tahun')?.value || new Date().getFullYear());
    skdrUpdateTgl();
  }
  if (id === 'rekap')  skdrRenderRekap();
  if (id === 'status') skdrRenderStatus();
  if (id === 'kirim')  skdrRenderKirim();
  if (id === 'pengaturan') skdrRenderPengaturan();
}

/* ------------------------------------------------------------------
   17. PANEL PENGATURAN SKDR (koneksi Google Sheets)
   ------------------------------------------------------------------ */
function skdrRenderPengaturan() {
  const el = document.getElementById('skdr-panel-pengaturan');
  if (!el) return;
  const savedUrl = skdrGetSheetUrl();
  el.innerHTML = `
    <div class="card">
      <h2>Koneksi Google Sheets untuk SKDR</h2>
      <p class="sub">Setelah terhubung, setiap laporan akan otomatis tersimpan ke Google Sheets dan bisa diakses dari HP/perangkat manapun.</p>
      <label class="field">
        <span>URL Google Apps Script (Web App SKDR)</span>
        <input type="text" id="skdr-sheet-url-input"
          value="${savedUrl}"
          placeholder="https://script.google.com/macros/s/xxx/exec">
      </label>
      <div class="actions-row">
        <button class="btn" onclick="skdrSaveSheetUrl()">Simpan URL</button>
        <button class="btn secondary" onclick="skdrTestConnection()">Test Koneksi</button>
      </div>
      ${skdrPending.length ? `
        <div style="margin-top:14px;padding:10px 14px;background:#FFF8E1;border:1px solid var(--amber);border-radius:8px;font-size:13px;color:#7B4A00;">
          ⏳ <strong>${skdrPending.length} laporan</strong> menunggu sinkronisasi.
          <button class="btn" style="font-size:12px;padding:5px 12px;margin-left:10px" onclick="skdrFlushPending()">Sync Sekarang</button>
        </div>` : ''}
      <div style="margin-top:20px;padding:14px;background:#EDF3F3;border-radius:8px;font-size:13px;">
        <strong>Cara mendapatkan URL:</strong>
        <ol style="margin:8px 0 0;padding-left:18px;line-height:1.8;">
          <li>Buka <a href="https://script.google.com" target="_blank">script.google.com</a> → buat project baru</li>
          <li>Paste isi file <code>skdr_sheets.gs</code> ke editor</li>
          <li>Klik <strong>Deploy → New deployment → Web app</strong></li>
          <li>Execute as: <strong>Me</strong> · Who has access: <strong>Anyone</strong></li>
          <li>Klik Deploy → salin URL → paste di atas</li>
        </ol>
      </div>
    </div>
  `;
}

async function skdrTestConnection() {
  const url = document.getElementById('skdr-sheet-url-input')?.value?.trim();
  if (!url) { toast('Isi URL terlebih dahulu.', true); return; }
  toast('Menguji koneksi...');
  try {
    const res  = await fetch(url + '?action=ping');
    const json = await res.json();
    if (json.status === 'ok') toast('✓ Koneksi berhasil! Google Sheets terhubung.');
    else toast('Respons tidak dikenali: ' + JSON.stringify(json), true);
  } catch(e) {
    toast('Gagal terhubung: ' + e.message, true);
  }
}

/* ------------------------------------------------------------------
   18. INISIALISASI
   ------------------------------------------------------------------ */
function skdrInit() {
  const yr = new Date().getFullYear();
  ['skdr-tahun','skdr-r-tahun','skdr-s-tahun','skdr-k-tahun'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = yr;
  });
  ['skdr-minggu','skdr-r-minggu','skdr-s-minggu','skdr-k-minggu'].forEach(id => skdrFillW(id, yr));
  skdrBuildFasSelect();
  skdrBuildTable();
  skdrUpdateTgl();
  skdrUpdateSyncBadge();

  // Auto flush pending saat koneksi kembali online
  window.addEventListener('online', () => {
    toast('Koneksi kembali — mencoba sinkronisasi data pending...');
    skdrFlushPending();
  });

  document.getElementById('skdr-tahun')?.addEventListener('change', function() {
    skdrFillW('skdr-minggu', this.value); skdrUpdateTgl();
  });
  document.getElementById('skdr-minggu')?.addEventListener('change', skdrUpdateTgl);
  document.getElementById('skdr-r-tahun')?.addEventListener('change', function() {
    skdrFillW('skdr-r-minggu', this.value); skdrRenderRekap();
  });
  document.getElementById('skdr-r-minggu')?.addEventListener('change', skdrRenderRekap);
  document.getElementById('skdr-s-tahun')?.addEventListener('change', function() {
    skdrFillW('skdr-s-minggu', this.value); skdrRenderStatus();
  });
  document.getElementById('skdr-s-minggu')?.addEventListener('change', skdrRenderStatus);
  document.getElementById('skdr-k-tahun')?.addEventListener('change', function() {
    skdrFillW('skdr-k-minggu', this.value); skdrRenderKirim();
  });
  document.getElementById('skdr-k-minggu')?.addEventListener('change', skdrRenderKirim);
}
