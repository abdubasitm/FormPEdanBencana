/* =========================================================================
   APP LOGIC — SKDR & Pelaporan Bencana Puskesmas Sale
   ========================================================================= */

const LS_KEYS = { kasus: "skdr_kasus_v1", bencana: "skdr_bencana_v1", settings: "skdr_settings_v1", penyakit: "skdr_penyakit_v1" };

function loadArr(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } }
function saveArr(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); }
function loadSettings() {
  return Object.assign({ sheetUrl: "", unitDefault: "", desaDefault: "" }, JSON.parse(localStorage.getItem(LS_KEYS.settings) || "{}"));
}
function saveSettings(s) { localStorage.setItem(LS_KEYS.settings, JSON.stringify(s)); }
function getPenyakitList() {
  const custom = JSON.parse(localStorage.getItem(LS_KEYS.penyakit) || "null");
  return custom || PENYAKIT_LIST;
}
function savePenyakitList(list) { localStorage.setItem(LS_KEYS.penyakit, JSON.stringify(list)); }

let state = {
  kasus: loadArr(LS_KEYS.kasus),
  bencana: loadArr(LS_KEYS.bencana),
  settings: loadSettings(),
  penyakit: getPenyakitList(),
  activeTab: "input-kasus"
};

function uid() { return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8); }

/* ---------------------------- SYNC KE GOOGLE SHEETS ---------------------------- */
async function syncOneRow(type, row) {
  const url = state.settings.sheetUrl;
  if (!url) return { ok: false, reason: "no-url" };
  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ type, row })
    });
    // mode no-cors tidak memberi akses ke body respons, jadi kita anggap terkirim.
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

async function syncAllPending() {
  if (!state.settings.sheetUrl) {
    toast("Isi dulu URL Google Apps Script di menu Pengaturan.", true);
    return;
  }
  const btn = document.getElementById("btnSyncAll");
  if (btn) { btn.disabled = true; btn.textContent = "Menyinkronkan..."; }

  let count = 0;
  for (const row of state.kasus) {
    if (!row._synced) {
      const r = await syncOneRow("kasus", row);
      if (r.ok) { row._synced = true; count++; }
    }
  }
  for (const row of state.bencana) {
    if (!row._synced) {
      const r = await syncOneRow("bencana", row);
      if (r.ok) { row._synced = true; count++; }
    }
  }
  saveArr(LS_KEYS.kasus, state.kasus);
  saveArr(LS_KEYS.bencana, state.bencana);
  if (btn) { btn.disabled = false; btn.textContent = "Sinkronkan ke Google Sheets"; }
  renderRekap();
  toast(count > 0 ? `${count} data berhasil disinkronkan ke Google Sheets.` : "Semua data sudah tersinkron.");
}

function toast(msg, isWarn) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (isWarn ? " warn" : "");
  setTimeout(() => t.classList.remove("show"), 3200);
}

/* ---------------------------- TAB NAVIGATION ---------------------------- */
function showTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".navbtn").forEach(b => b.classList.remove("active"));
  document.getElementById("panel-" + tab).classList.add("active");
  document.querySelector(`.navbtn[data-tab="${tab}"]`).classList.add("active");
  if (tab === "dashboard") renderDashboard();
  if (tab === "rekap") renderRekap();
  if (tab === "kelola-penyakit") renderKelolaPenyakit();
}

/* ---------------------------- FORM: PILIHAN DASAR ---------------------------- */
function fillSelect(id, options, placeholder) {
  const el = document.getElementById(id);
  el.innerHTML = "";
  if (placeholder) {
    const opt = document.createElement("option");
    opt.value = ""; opt.textContent = placeholder; opt.disabled = true; opt.selected = true;
    el.appendChild(opt);
  }
  options.forEach(o => {
    const opt = document.createElement("option");
    opt.value = o; opt.textContent = o;
    el.appendChild(opt);
  });
}

function initBasicSelects() {
  fillSelect("unitPelapor", UNIT_PELAPOR_LIST, "Pilih unit pelapor");
  fillSelect("unitPelaporBencana", UNIT_PELAPOR_LIST, "Pilih unit pelapor");
  fillSelect("statusKasus", STATUS_KASUS_LIST, "Pilih status");
  fillSelect("jenisKelamin", JENIS_KELAMIN_LIST, "Pilih jenis kelamin");
  fillSelect("jenisBencana", JENIS_BENCANA_LIST, "Pilih jenis kejadian");
  renderDesaOptions("desaKasus");
  renderDesaOptions("desaBencana");
  renderPenyakitOptions();
  if (state.settings.unitDefault) document.getElementById("unitPelapor").value = state.settings.unitDefault;
  if (state.settings.desaDefault) { /* dipilih manual tiap laporan */ }
}

function renderDesaOptions(selectId) {
  const el = document.getElementById(selectId);
  el.innerHTML = "";
  const ph = document.createElement("option");
  ph.value = ""; ph.textContent = "Pilih desa/kelurahan"; ph.disabled = true; ph.selected = true;
  el.appendChild(ph);
  DESA_LIST.forEach(d => {
    const opt = document.createElement("option"); opt.value = d; opt.textContent = d; el.appendChild(opt);
  });
  const other = document.createElement("option"); other.value = "__LAINNYA__"; other.textContent = "Lainnya (isi manual)";
  el.appendChild(other);
}

function handleDesaChange(selectId, inputId) {
  const sel = document.getElementById(selectId);
  const wrap = document.getElementById(inputId);
  wrap.style.display = sel.value === "__LAINNYA__" ? "block" : "none";
}

function renderPenyakitOptions() {
  const el = document.getElementById("penyakitSelect");
  el.innerHTML = "";
  const ph = document.createElement("option");
  ph.value = ""; ph.textContent = "Pilih penyakit yang dilaporkan"; ph.disabled = true; ph.selected = true;
  el.appendChild(ph);
  state.penyakit.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.kode; opt.textContent = `${p.nama}`;
    el.appendChild(opt);
  });
}

function renderGejalaChecklist() {
  const kode = document.getElementById("penyakitSelect").value;
  const wrap = document.getElementById("gejalaWrap");
  wrap.innerHTML = "";
  if (!kode) { wrap.innerHTML = `<p class="hint">Pilih penyakit terlebih dahulu untuk menampilkan checklist gejala.</p>`; return; }
  const p = state.penyakit.find(x => x.kode === kode);
  if (!p) return;
  const title = document.createElement("div");
  title.className = "gejala-title";
  title.innerHTML = `<span class="badge">${p.kode}</span> Checklist gejala — <strong>${p.nama}</strong> <span class="kategori">${p.kategori || ""}</span>`;
  wrap.appendChild(title);
  const grid = document.createElement("div");
  grid.className = "gejala-grid";
  p.gejala.forEach((g, i) => {
    const label = document.createElement("label");
    label.className = "gejala-item";
    label.innerHTML = `<input type="checkbox" name="gejala" value="${g.replace(/"/g, '&quot;')}"> <span>${g}</span>`;
    grid.appendChild(label);
  });
  wrap.appendChild(grid);
}

/* ---------------------------- SUBMIT: LAPORAN KASUS ---------------------------- */
function submitKasus(ev) {
  ev.preventDefault();
  const desaSel = document.getElementById("desaKasus").value;
  const desaLain = document.getElementById("desaKasusLainnyaInput").value.trim();
  const desaFinal = desaSel === "__LAINNYA__" ? (desaLain || "Lainnya (tidak diisi)") : desaSel;
  const kode = document.getElementById("penyakitSelect").value;
  const p = state.penyakit.find(x => x.kode === kode);
  const gejalaChecked = Array.from(document.querySelectorAll('input[name="gejala"]:checked')).map(c => c.value);

  if (!document.getElementById("unitPelapor").value || !desaSel || !kode) {
    toast("Lengkapi unit pelapor, desa, dan penyakit terlebih dahulu.", true); return;
  }

  const row = {
    id: uid(),
    _synced: false,
    tanggal_lapor: document.getElementById("tanggalKasus").value || new Date().toISOString().slice(0, 10),
    unit_pelapor: document.getElementById("unitPelapor").value,
    desa: desaFinal,
    nama_pasien: document.getElementById("namaPasien").value.trim(),
    umur_tahun: document.getElementById("umurPasien").value,
    jenis_kelamin: document.getElementById("jenisKelamin").value,
    alamat_detail: document.getElementById("alamatDetail").value.trim(),
    kode_penyakit: kode,
    nama_penyakit: p ? p.nama : kode,
    gejala: gejalaChecked.join("; "),
    status_kasus: document.getElementById("statusKasus").value,
    keterangan: document.getElementById("keteranganKasus").value.trim(),
    waktu_input: new Date().toISOString()
  };
  state.kasus.unshift(row);
  saveArr(LS_KEYS.kasus, state.kasus);
  toast("Laporan kasus tersimpan. Menyinkronkan ke Google Sheets...");
  document.getElementById("formKasus").reset();
  renderDesaOptions("desaKasus");
  document.getElementById("desaKasusLainnya").style.display = "none";
  renderPenyakitOptions();
  document.getElementById("gejalaWrap").innerHTML = `<p class="hint">Pilih penyakit terlebih dahulu untuk menampilkan checklist gejala.</p>`;
  syncOneRow("kasus", row).then(r => {
    if (r.ok) { row._synced = true; saveArr(LS_KEYS.kasus, state.kasus); renderRekap(); }
  });
}

/* ---------------------------- SUBMIT: LAPORAN BENCANA ---------------------------- */
function submitBencana(ev) {
  ev.preventDefault();
  const desaSel = document.getElementById("desaBencana").value;
  const desaLain = document.getElementById("desaBencanaLainnyaInput").value.trim();
  const desaFinal = desaSel === "__LAINNYA__" ? (desaLain || "Lainnya (tidak diisi)") : desaSel;

  if (!desaSel || !document.getElementById("jenisBencana").value) {
    toast("Lengkapi desa dan jenis kejadian terlebih dahulu.", true); return;
  }

  const row = {
    id: uid(),
    _synced: false,
    tanggal_kejadian: document.getElementById("tanggalBencana").value || new Date().toISOString().slice(0, 10),
    unit_pelapor: document.getElementById("unitPelaporBencana").value,
    desa: desaFinal,
    jenis_bencana: document.getElementById("jenisBencana").value,
    korban_meninggal: document.getElementById("korbanMeninggal").value || 0,
    korban_luka: document.getElementById("korbanLuka").value || 0,
    korban_mengungsi: document.getElementById("korbanMengungsi").value || 0,
    kerusakan_faskes: document.getElementById("kerusakanFaskes").value.trim(),
    kebutuhan_mendesak: document.getElementById("kebutuhanMendesak").value.trim(),
    keterangan: document.getElementById("keteranganBencana").value.trim(),
    waktu_input: new Date().toISOString()
  };
  state.bencana.unshift(row);
  saveArr(LS_KEYS.bencana, state.bencana);
  toast("Laporan bencana tersimpan. Menyinkronkan ke Google Sheets...");
  document.getElementById("formBencana").reset();
  renderDesaOptions("desaBencana");
  document.getElementById("desaBencanaLainnya").style.display = "none";
  syncOneRow("bencana", row).then(r => {
    if (r.ok) { row._synced = true; saveArr(LS_KEYS.bencana, state.bencana); renderRekap(); }
  });
}

/* ---------------------------- PENGATURAN ---------------------------- */
function loadSettingsForm() {
  document.getElementById("inputSheetUrl").value = state.settings.sheetUrl || "";
  fillSelect("inputUnitDefault", UNIT_PELAPOR_LIST, "(tidak ada default)");
  if (state.settings.unitDefault) document.getElementById("inputUnitDefault").value = state.settings.unitDefault;
}
function saveSettingsForm(ev) {
  ev.preventDefault();
  state.settings.sheetUrl = document.getElementById("inputSheetUrl").value.trim();
  state.settings.unitDefault = document.getElementById("inputUnitDefault").value;
  saveSettings(state.settings);
  toast("Pengaturan disimpan.");
  initBasicSelects();
}

/* ---------------------------- KELOLA PENYAKIT ---------------------------- */
function renderKelolaPenyakit() {
  const wrap = document.getElementById("kelolaPenyakitList");
  wrap.innerHTML = "";
  state.penyakit.forEach((p, idx) => {
    const div = document.createElement("div");
    div.className = "penyakit-card";
    div.innerHTML = `
      <div class="penyakit-card-head">
        <span class="badge">${p.kode}</span>
        <strong>${p.nama}</strong>
        <span class="kategori">${p.kategori || ""}</span>
      </div>
      <ul class="gejala-preview">${p.gejala.map(g => `<li>${g}</li>`).join("")}</ul>
    `;
    wrap.appendChild(div);
  });
}

/* ---------------------------- REKAP DATA ---------------------------- */
function renderRekap() {
  const kBody = document.getElementById("rekapKasusBody");
  kBody.innerHTML = state.kasus.slice(0, 300).map(r => `
    <tr>
      <td>${r.tanggal_lapor}</td>
      <td>${r.unit_pelapor}</td>
      <td>${r.desa}</td>
      <td><span class="badge">${r.kode_penyakit}</span> ${r.nama_penyakit}</td>
      <td>${r.nama_pasien || "-"}</td>
      <td>${r.umur_tahun || "-"}</td>
      <td>${r.jenis_kelamin || "-"}</td>
      <td>${r.status_kasus || "-"}</td>
      <td>${r._synced ? '<span class="sync-ok">✓ tersinkron</span>' : '<span class="sync-pending">belum</span>'}</td>
    </tr>`).join("") || `<tr><td colspan="9" class="hint">Belum ada laporan kasus.</td></tr>`;

  const bBody = document.getElementById("rekapBencanaBody");
  bBody.innerHTML = state.bencana.slice(0, 300).map(r => `
    <tr>
      <td>${r.tanggal_kejadian}</td>
      <td>${r.desa}</td>
      <td>${r.jenis_bencana}</td>
      <td>${r.korban_meninggal}</td>
      <td>${r.korban_luka}</td>
      <td>${r.korban_mengungsi}</td>
      <td>${r._synced ? '<span class="sync-ok">✓ tersinkron</span>' : '<span class="sync-pending">belum</span>'}</td>
    </tr>`).join("") || `<tr><td colspan="7" class="hint">Belum ada laporan bencana.</td></tr>`;

  const pendingCount = state.kasus.filter(r => !r._synced).length + state.bencana.filter(r => !r._synced).length;
  document.getElementById("pendingCount").textContent = pendingCount;
}

/* ---------------------------- DASHBOARD / ANALISIS ---------------------------- */
let chartTempat, chartWaktu, chartOrang, chartPenyakit;

function renderDashboard() {
  const kasus = state.kasus;
  document.getElementById("statTotalKasus").textContent = kasus.length;
  document.getElementById("statTotalBencana").textContent = state.bencana.length;
  const desaSet = new Set(kasus.map(k => k.desa));
  document.getElementById("statDesaTerdampak").textContent = desaSet.size;
  const minggu = new Set(kasus.map(k => isoWeekKey(k.tanggal_lapor)));
  document.getElementById("statMingguAktif").textContent = minggu.size;

  // ---- ANALISIS TEMPAT (per desa) ----
  const perDesa = {};
  kasus.forEach(k => perDesa[k.desa] = (perDesa[k.desa] || 0) + 1);
  const desaLabels = Object.keys(perDesa).sort((a, b) => perDesa[b] - perDesa[a]);
  drawChart("chartTempat", "bar", desaLabels, [{ label: "Jumlah kasus", data: desaLabels.map(d => perDesa[d]), backgroundColor: "#1B8A8A" }], "chartTempat");

  // ---- ANALISIS WAKTU (per minggu epidemiologi) ----
  const perMinggu = {};
  kasus.forEach(k => { const wk = isoWeekKey(k.tanggal_lapor); perMinggu[wk] = (perMinggu[wk] || 0) + 1; });
  const mingguLabels = Object.keys(perMinggu).sort();
  drawChart("chartWaktu", "line", mingguLabels, [{ label: "Jumlah kasus/minggu", data: mingguLabels.map(w => perMinggu[w]), borderColor: "#0E4749", backgroundColor: "rgba(14,71,73,0.12)", fill: true, tension: 0.25 }], "chartWaktu");

  // ---- ANALISIS ORANG (kelompok umur & jenis kelamin) ----
  const grupUmur = { "0-4": 0, "5-14": 0, "15-44": 0, "45-64": 0, "65+": 0, "?": 0 };
  const grupGender = { "Laki-laki": 0, "Perempuan": 0 };
  kasus.forEach(k => {
    const u = parseInt(k.umur_tahun, 10);
    if (isNaN(u)) grupUmur["?"]++;
    else if (u <= 4) grupUmur["0-4"]++;
    else if (u <= 14) grupUmur["5-14"]++;
    else if (u <= 44) grupUmur["15-44"]++;
    else if (u <= 64) grupUmur["45-64"]++;
    else grupUmur["65+"]++;
    if (k.jenis_kelamin) grupGender[k.jenis_kelamin] = (grupGender[k.jenis_kelamin] || 0) + 1;
  });
  drawChart("chartOrangUmur", "bar", Object.keys(grupUmur), [{ label: "Kelompok umur", data: Object.values(grupUmur), backgroundColor: "#D98E04" }], "chartOrangUmur");
  drawChart("chartOrangGender", "doughnut", Object.keys(grupGender), [{ data: Object.values(grupGender), backgroundColor: ["#1B8A8A", "#C4432B"] }], "chartOrangGender");

  // ---- TOP PENYAKIT + ALERT SEDERHANA ----
  const perPenyakit = {};
  kasus.forEach(k => perPenyakit[k.nama_penyakit] = (perPenyakit[k.nama_penyakit] || 0) + 1);
  const penyakitLabels = Object.keys(perPenyakit).sort((a, b) => perPenyakit[b] - perPenyakit[a]).slice(0, 10);
  drawChart("chartPenyakit", "bar", penyakitLabels, [{ label: "Jumlah kasus", data: penyakitLabels.map(p => perPenyakit[p]), backgroundColor: "#3E8E7E" }], "chartPenyakit", true);

  // Alert sederhana: penyakit dgn >=5 kasus pada desa+minggu yang sama minggu ini dianggap perlu perhatian
  renderAlertList(kasus);
}

function renderAlertList(kasus) {
  const key = k => `${k.desa}||${k.nama_penyakit}||${isoWeekKey(k.tanggal_lapor)}`;
  const counter = {};
  kasus.forEach(k => { const kk = key(k); counter[kk] = (counter[kk] || 0) + 1; });
  const alerts = Object.entries(counter).filter(([k, v]) => v >= 3).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const wrap = document.getElementById("alertList");
  if (alerts.length === 0) { wrap.innerHTML = `<p class="hint">Belum ada pola kasus yang perlu perhatian khusus minggu ini.</p>`; return; }
  wrap.innerHTML = alerts.map(([k, v]) => {
    const [desa, penyakit, minggu] = k.split("||");
    return `<div class="alert-item"><span class="alert-count">${v}</span><div><strong>${penyakit}</strong> — Desa ${desa} <span class="hint">(${minggu})</span></div></div>`;
  }).join("");
}

function isoWeekKey(dateStr) {
  if (!dateStr) return "?";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return "?";
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target - firstThursday;
  const week = 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
  return `${target.getFullYear()}-M${String(week).padStart(2, "0")}`;
}

const chartInstances = {};
function drawChart(canvasId, type, labels, datasets, key) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
  chartInstances[canvasId] = new Chart(ctx, {
    type,
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: (canvasId === "chartPenyakit") ? "y" : "x",
      plugins: { legend: { display: type === "doughnut" } },
      scales: type === "doughnut" ? {} : { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

/* ---------------------------- EXPORT CSV (cadangan lokal) ---------------------------- */
function exportCSV(which) {
  const rows = which === "kasus" ? state.kasus : state.bencana;
  if (rows.length === 0) { toast("Tidak ada data untuk diekspor.", true); return; }
  const keys = Object.keys(rows[0]).filter(k => k !== "_synced");
  const csv = [keys.join(",")].concat(rows.map(r => keys.map(k => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `skdr_${which}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

/* ---------------------------- INIT ---------------------------- */
window.addEventListener("DOMContentLoaded", () => {
  initBasicSelects();
  document.getElementById("formKasus").addEventListener("submit", submitKasus);
  document.getElementById("formBencana").addEventListener("submit", submitBencana);
  document.getElementById("formSettings").addEventListener("submit", saveSettingsForm);
  document.getElementById("penyakitSelect").addEventListener("change", renderGejalaChecklist);
  document.getElementById("desaKasus").addEventListener("change", () => handleDesaChange("desaKasus", "desaKasusLainnya"));
  document.getElementById("desaBencana").addEventListener("change", () => handleDesaChange("desaBencana", "desaBencanaLainnya"));
  document.getElementById("btnSyncAll").addEventListener("click", syncAllPending);
  document.getElementById("btnExportKasus").addEventListener("click", () => exportCSV("kasus"));
  document.getElementById("btnExportBencana").addEventListener("click", () => exportCSV("bencana"));
  document.querySelectorAll(".navbtn").forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab)));
  loadSettingsForm();
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById("tanggalKasus").value = today;
  document.getElementById("tanggalBencana").value = today;
  renderRekap();
});
