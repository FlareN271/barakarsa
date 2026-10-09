/* ============================================================
   pengingat.js — notifikasi push (sejak 3.4)

   Pengiriman dilakukan server (Edge Function "pengingat" yang
   dipanggil penjadwal tiap menit) dari task yang SUDAH tersinkron
   di barakarsa_items. File ini hanya:
     - mengaktifkan/mematikan langganan push di perangkat ini,
     - menyimpan & menyinkron pengaturan (tabel barakarsa_pengingat),
     - panel ⋯ → 🔔 Pengaturan pengingat,
     - pilihan 🔔 per task di form (field task.ingat).

   task.ingat (menit): tidak ada = ikut bawaan, 0 = saat waktunya,
   -1 = tanpa pengingat. Perangkat lama membiarkan field ini utuh.
   Penerimaan notifikasi & klik ada di sw.js.
   ============================================================ */

const PENGINGAT_KEY = 'barakarsa_pengingat';          // per perangkat: { uid, atur, endpoint, vapid, terdaftar }
const PENGINGAT_TABLE = 'barakarsa_pengingat';
const LANGGANAN_TABLE = 'barakarsa_push_langganan';
const PENGINGAT_FUNGSI = SUPABASE_URL + '/functions/v1/pengingat';
const PENGINGAT_BAWAAN = { task_on: true, task_menit: 5, pagi_on: true, pagi_jam: '07:30', pagi_hari: [0, 1, 2, 3, 4, 5, 6] };
const PENGINGAT_FIELD = ['task_on', 'task_menit', 'pagi_on', 'pagi_jam', 'pagi_hari', 'zona'];
const PILIHAN_MENIT = [
    [0, 'Saat waktunya'], [5, '5 menit sebelumnya'], [10, '10 menit sebelumnya'],
    [15, '15 menit sebelumnya'], [30, '30 menit sebelumnya'], [60, '1 jam sebelumnya']
];
const NAMA_HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const URUTAN_HARI = [1, 2, 3, 4, 5, 6, 0];                // tampil Senin → Minggu

let pgStore = pgMuatLokal();
let pgTabelTidakAda = false;
let pgPerangkat = null;          // daftar perangkat dari server (null = belum dimuat)
let pgSibuk = false;
let pgPesan = null;              // { jenis: 'ok' | 'galat', teks }
let pgSyncTimer = null;
let pgSudahDiperiksa = false;

// ---------- Penyimpanan lokal ----------

function pgMuatLokal() {
    try { return JSON.parse(localStorage.getItem(PENGINGAT_KEY)) || {}; } catch (e) { return {}; }
}
function pgSimpanLokal() {
    try { localStorage.setItem(PENGINGAT_KEY, JSON.stringify(pgStore)); } catch (e) { /* penuh: abaikan */ }
}
function pgAtur() {
    return { ...PENGINGAT_BAWAAN, ...((pgStore.atur && pgStore.atur.data) || {}) };
}
function pgZona() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Makassar'; } catch (e) { return 'Asia/Makassar'; }
}
function pgTeksMenit(m) {
    const p = PILIHAN_MENIT.find(x => x[0] === m);
    return p ? p[1].toLowerCase() : `${m} menit sebelumnya`;
}

// Akun berganti di perangkat ini: pengaturan & status langganan milik akun lama dilupakan
function pgCocokkanAkun() {
    if (!currentUser) return;
    if (pgStore.uid && pgStore.uid !== currentUser.id) pgStore = {};
    if (pgStore.uid !== currentUser.id) { pgStore.uid = currentUser.id; pgSimpanLokal(); }
}

// ---------- Dukungan & izin ----------

function pgDukung() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
        && location.protocol.startsWith('http');
}
function pgIzin() {
    return 'Notification' in window ? Notification.permission : 'denied';
}

async function pgRegistrasi() {
    if (!pgDukung()) return null;
    return (await navigator.serviceWorker.getRegistration('./')) || null;
}

// Tunggu service worker aktif (paling lama 10 detik)
function pgSwSiap() {
    return Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, gagal) => setTimeout(() => gagal(new Error('Service worker belum aktif. Muat ulang halaman lalu coba lagi.')), 10000))
    ]);
}

async function pgLanggananSekarang() {
    const reg = await pgRegistrasi();
    return reg ? reg.pushManager.getSubscription() : null;
}

function pgNamaPerangkat() {
    const ua = navigator.userAgent;
    const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iPhone/iPad'
        : /Windows/i.test(ua) ? 'Windows' : /Mac OS X/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : 'Perangkat';
    const br = /Edg[A]?\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
        : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    let app = '';
    try { if (matchMedia('(display-mode: standalone)').matches) app = ' (aplikasi)'; } catch (e) { /* abaikan */ }
    return `${os} · ${br}${app}`;
}

function pgKeBytes(b64u) {
    const b = b64u.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b + '==='.slice((b.length + 3) % 4));
    return Uint8Array.from(bin, c => c.charCodeAt(0));
}

// ---------- Panggil Edge Function ----------

async function pgPanggil(jenis, data) {
    if (!sb) throw new Error('Pustaka sinkron belum termuat. Periksa koneksi lalu coba lagi.');
    const { data: s } = await sb.auth.getSession();
    const token = s && s.session ? s.session.access_token : '';
    let res;
    try {
        res = await fetch(PENGINGAT_FUNGSI, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, ...(token ? { Authorization: 'Bearer ' + token } : {}) },
            body: JSON.stringify({ jenis, ...(data || {}) })
        });
    } catch (e) {
        throw new Error(navigator.onLine
            ? 'Server pengingat tidak menjawab. Pastikan Edge Function "pengingat" sudah dipasang.'
            : 'Tidak ada koneksi internet.');
    }
    let isi = {};
    try { isi = await res.json(); } catch (e) { /* bukan JSON */ }
    if (res.ok) return isi;
    const pesan = isi.galat || isi.msg || isi.message || '';
    if (res.status === 404 && !isi.galat) throw new Error('Edge Function "pengingat" belum dipasang di Supabase.');
    if (res.status === 401 && !isi.galat && /jwt|authorization/i.test(pesan)) {
        throw new Error('Matikan pilihan "Verify JWT" pada Edge Function "pengingat", lalu coba lagi.');
    }
    throw new Error(pesan || ('Server menjawab ' + res.status));
}

// ---------- Pengaturan: simpan & sinkron (updated_at terbaru menang) ----------

function pgUbahAtur(field, nilai) {
    const data = { ...pgAtur(), [field]: nilai, zona: pgZona() };
    pgStore.atur = { data, updatedAt: new Date().toISOString() };
    pgSimpanLokal();
    pgIsiPilihanForm();
    clearTimeout(pgSyncTimer);
    pgSyncTimer = setTimeout(() => pgSyncAtur(false), 800);
    pgRender();
}

function pgBarisServer(d, updatedAt) {
    const row = { user_id: currentUser.id, updated_at: updatedAt };
    PENGINGAT_FIELD.forEach(k => { if (d[k] !== undefined) row[k] = d[k]; });
    if (!row.zona) row.zona = pgZona();
    return row;
}

// pastikanAda: bila server belum punya baris, kirim pengaturan (atau bawaan) supaya penjadwal mengenal akun ini
async function pgSyncAtur(pastikanAda) {
    if (pgTabelTidakAda || !sb || !currentUser || !navigator.onLine) return;
    pgCocokkanAkun();
    try {
        const { data: rows, error } = await sb.from(PENGINGAT_TABLE).select('*').eq('user_id', currentUser.id);
        if (error) {
            if (/does not exist|schema cache|relation/i.test(error.message)) pgTabelTidakAda = true;
            console.warn('Sinkron pengaturan pengingat gagal:', error.message);
            return;
        }
        const r = rows && rows[0];
        const l = pgStore.atur;
        const lt = l ? Date.parse(l.updatedAt) : 0;
        const rt = r ? Date.parse(r.updated_at) : 0;
        if (r && rt > lt) {
            const data = {};
            PENGINGAT_FIELD.forEach(k => { if (r[k] !== undefined && r[k] !== null) data[k] = r[k]; });
            pgStore.atur = { data, updatedAt: r.updated_at };
            pgSimpanLokal();
            pgIsiPilihanForm();
            pgRender();
        } else if ((l && lt > rt) || (!r && pastikanAda)) {
            if (!pgStore.atur) {
                pgStore.atur = { data: { ...PENGINGAT_BAWAAN, zona: pgZona() }, updatedAt: new Date().toISOString() };
                pgSimpanLokal();
            }
            const { error: e2 } = await sb.from(PENGINGAT_TABLE)
                .upsert(pgBarisServer(pgStore.atur.data, pgStore.atur.updatedAt), { onConflict: 'user_id' });
            if (e2) console.warn('Simpan pengaturan pengingat gagal:', e2.message);
        }
    } catch (err) { console.warn('Sinkron pengaturan pengingat error:', err); }
}

// Dipanggil dari syncNow() (sinkron.js)
async function pengingatSync() {
    await pgSyncAtur(false);
    if (pgSudahDiperiksa) return;
    pgSudahDiperiksa = true;
    await pgPeriksaLangganan();
}

// Sekali per sesi: daftarkan ulang langganan bila berganti atau sudah lama (≥ 7 hari),
// supaya server tetap punya alamat perangkat yang benar.
async function pgPeriksaLangganan() {
    if (!pgDukung() || !currentUser || !sb) return;
    pgCocokkanAkun();
    if (pgIzin() !== 'granted') {
        if (pgStore.endpoint) { pgStore.endpoint = ''; pgSimpanLokal(); }
        return;
    }
    try {
        const sub = await pgLanggananSekarang();
        if (!sub) { if (pgStore.endpoint) { pgStore.endpoint = ''; pgSimpanLokal(); } return; }
        if (!pgStore.endpoint) return;                      // belum pernah diaktifkan di akun ini
        const basi = !pgStore.terdaftar || Date.now() - pgStore.terdaftar > 7 * 86400000;
        if (sub.endpoint === pgStore.endpoint && !basi) return;
        await pgPanggil('daftar', { langganan: sub.toJSON(), perangkat: pgNamaPerangkat() });
        pgStore.endpoint = sub.endpoint;
        pgStore.terdaftar = Date.now();
        pgSimpanLokal();
    } catch (e) { console.warn('Periksa langganan pengingat:', e.message); }
}

// ---------- Aktifkan / matikan / uji ----------

async function pgAktifkan() {
    if (!currentUser) { closePengingatModal(); openAuthModal(); return; }
    pgSibuk = true; pgPesan = null; pgRender();
    try {
        const izin = await Notification.requestPermission();
        if (izin !== 'granted') {
            if (izin !== 'denied') pgPesan = { jenis: 'galat', teks: 'Izin notifikasi belum diberikan. Ketuk Aktifkan lagi, lalu pilih Izinkan.' };
            return;
        }
        const info = await pgPanggil('info');
        if (!info.vapid) throw new Error('Kunci VAPID belum diisi di Supabase (Edge Functions → Secrets).');
        const reg = await pgSwSiap();
        let sub = await reg.pushManager.getSubscription();
        if (sub && pgStore.vapid && pgStore.vapid !== info.vapid) { await sub.unsubscribe(); sub = null; }
        if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: pgKeBytes(info.vapid) });
        await pgPanggil('daftar', { langganan: sub.toJSON(), perangkat: pgNamaPerangkat() });
        pgCocokkanAkun();
        pgStore.endpoint = sub.endpoint;
        pgStore.vapid = info.vapid;
        pgStore.terdaftar = Date.now();
        pgSimpanLokal();
        await pgSyncAtur(true);
        pgPesan = { jenis: 'ok', teks: '🔔 Pengingat aktif di perangkat ini. Coba "Kirim notifikasi uji".' };
    } catch (e) {
        pgPesan = { jenis: 'galat', teks: e.message || String(e) };
    } finally {
        pgSibuk = false;
        pgRender();
        pgMuatPerangkat();
    }
}

async function pgMatikan() {
    pgSibuk = true; pgPesan = null; pgRender();
    try {
        const sub = await pgLanggananSekarang();
        const endpoint = (sub && sub.endpoint) || pgStore.endpoint;
        if (endpoint && currentUser) await pgPanggil('lepas', { endpoint });
        if (sub) await sub.unsubscribe();
        pgStore.endpoint = '';
        pgSimpanLokal();
        pgPesan = { jenis: 'ok', teks: 'Perangkat ini tidak lagi menerima pengingat.' };
    } catch (e) {
        pgPesan = { jenis: 'galat', teks: e.message || String(e) };
    } finally {
        pgSibuk = false;
        pgRender();
        pgMuatPerangkat();
    }
}

async function pgLepasPerangkat(i) {
    const p = pgPerangkat && pgPerangkat[i];
    if (!p) return;
    if (p.endpoint === pgStore.endpoint) { pgMatikan(); return; }
    if (!confirm(`Berhenti mengirim pengingat ke "${p.perangkat || 'perangkat itu'}"?`)) return;
    try {
        await pgPanggil('lepas', { endpoint: p.endpoint });
        pgPesan = { jenis: 'ok', teks: 'Perangkat dilepas. Aktifkan lagi dari perangkat itu bila diperlukan.' };
    } catch (e) { pgPesan = { jenis: 'galat', teks: e.message }; }
    pgMuatPerangkat();
}

async function pgUji() {
    pgSibuk = true; pgPesan = null; pgRender();
    try {
        const r = await pgPanggil('uji', { endpoint: pgStore.endpoint });
        pgPesan = r.ok
            ? { jenis: 'ok', teks: '🧪 Terkirim. Notifikasi muncul dalam beberapa detik.' }
            : { jenis: 'galat', teks: 'Layanan push menolak pesan (kode ' + ((r.hasil || []).map(h => h.status).join(', ') || '?') + '). Coba Matikan lalu Aktifkan lagi.' };
    } catch (e) {
        pgPesan = { jenis: 'galat', teks: e.message };
    } finally {
        pgSibuk = false;
        pgRender();
    }
}

async function pgMuatPerangkat() {
    if (!sb || !currentUser || pgTabelTidakAda) { pgPerangkat = null; pgRender(); return; }
    try {
        const { data, error } = await sb.from(LANGGANAN_TABLE).select('endpoint,perangkat,dibuat,terakhir_ok').order('dibuat');
        if (error) {
            if (/does not exist|schema cache|relation/i.test(error.message)) pgTabelTidakAda = true;
            pgPerangkat = null;
        } else {
            pgPerangkat = data || [];
        }
    } catch (e) { pgPerangkat = null; }
    pgRender();
}

// ---------- Panel ⋯ → 🔔 Pengaturan pengingat ----------

function openPengingatModal() {
    pgPesan = null;
    document.getElementById('pengingatModal').classList.add('active');
    pgRender();
    pgMuatPerangkat();
    pgSyncAtur(false);
}

function closePengingatModal() {
    document.getElementById('pengingatModal').classList.remove('active');
}

function pgTerbuka() {
    const m = document.getElementById('pengingatModal');
    return m && m.classList.contains('active');
}

// Status perangkat ini; diperiksa ulang setiap kali panel digambar
async function pgStatus() {
    if (!pgDukung()) return 'takdukung';
    if (!currentUser) return 'belummasuk';
    const izin = pgIzin();
    if (izin === 'denied') return 'diblokir';
    if (izin !== 'granted' || !pgStore.endpoint) return 'belum';
    const sub = await pgLanggananSekarang();
    if (!sub || sub.endpoint !== pgStore.endpoint) return 'belum';
    // Server sudah melepas perangkat ini (mis. dihapus dari perangkat lain)
    if (pgPerangkat && !pgPerangkat.some(p => p.endpoint === sub.endpoint)) return 'dilepas';
    return 'aktif';
}

function pgHtmlStatus(st) {
    const tombol = (teks, aksi, kelas) =>
        `<button class="btn ${kelas || 'btn-primary'} btn-block" onclick="${aksi}" ${pgSibuk ? 'disabled' : ''}>${pgSibuk ? 'Memproses…' : teks}</button>`;
    const iPhone = /iPhone|iPad/i.test(navigator.userAgent);
    switch (st) {
        case 'aktif':
            return `<div class="pg-status pg-ok"><b>● Aktif di perangkat ini</b>
                <span>${esc(pgNamaPerangkat())}. Notifikasi tetap muncul walau aplikasi ditutup.</span>
                <button class="pg-tautan" onclick="pgMatikan()" ${pgSibuk ? 'disabled' : ''}>Matikan di perangkat ini</button></div>`;
        case 'belum':
        case 'dilepas':
            return `<div class="pg-status pg-netral"><b>○ Belum aktif di perangkat ini</b>
                <span>${st === 'dilepas' ? 'Perangkat ini sudah dilepas dari daftar penerima. ' : ''}Ketuk tombol di bawah, lalu pilih <i>Izinkan</i> saat browser bertanya.</span>
                ${tombol('🔔 Aktifkan di perangkat ini', 'pgAktifkan()')}</div>`;
        case 'diblokir':
            return `<div class="pg-status pg-tolak"><b>▲ Notifikasi diblokir di perangkat ini</b>
                <span>Izin notifikasi pernah ditolak, jadi aplikasi tidak bisa bertanya lagi. Buka izinnya lewat ikon 🔒 di bilah alamat → Notifikasi → Izinkan
                (aplikasi terpasang di HP: tekan lama ikon Barakarsa → Info aplikasi → Notifikasi), lalu buka panel ini lagi.
                Aplikasi tetap berjalan seperti biasa; pengaturan di bawah tetap berlaku untuk perangkat lain.</span></div>`;
        case 'belummasuk':
            return `<div class="pg-status pg-netral"><b>○ Belum masuk akun</b>
                <span>Pengingat dikirim dari server berdasarkan task yang tersinkron, jadi perlu masuk akun dulu.</span>
                ${tombol('🔑 Masuk untuk sinkron', 'closePengingatModal(); openAuthModal()', 'btn-secondary')}</div>`;
        default:
            return `<div class="pg-status pg-tolak"><b>▲ Browser ini tidak mendukung notifikasi push</b>
                <span>${iPhone ? 'Di iPhone/iPad, pasang Barakarsa ke Home Screen dulu (Bagikan → Tambah ke Layar Utama), lalu buka dari ikonnya.'
                    : 'Gunakan Chrome atau Edge versi terbaru.'}</span></div>`;
    }
}

function pgHtmlPerangkat() {
    if (pgTabelTidakAda) return '<div class="pg-sub">Tabel pengingat belum dibuat di Supabase (lihat panduan pemasangan 3.4).</div>';
    if (!currentUser) return '<div class="pg-sub">Masuk akun untuk melihat perangkat.</div>';
    if (pgPerangkat === null) return '<div class="pg-sub">Memuat…</div>';
    if (!pgPerangkat.length) return '<div class="pg-sub">Belum ada perangkat. Aktifkan di setiap HP/laptop yang ingin menerima pengingat.</div>';
    return pgPerangkat.map((p, i) => {
        const nama = p.perangkat || 'Perangkat';
        const ikon = /Android|iPhone/i.test(nama) ? '📱' : '💻';
        const ini = p.endpoint === pgStore.endpoint ? '<em class="pg-ini">perangkat ini</em>' : '';
        return `<div class="pg-perangkat"><span>${ikon} ${esc(nama)} ${ini}</span>
            <button class="pg-hapus" title="Berhenti mengirim ke perangkat ini" aria-label="Lepas ${esc(nama)}" onclick="pgLepasPerangkat(${i})">✕</button></div>`;
    }).join('');
}

let pgRenderNo = 0;
async function pgRender() {
    if (!pgTerbuka()) return;
    const no = ++pgRenderNo;
    const st = await pgStatus();
    if (no !== pgRenderNo) return;                       // ada gambar ulang yang lebih baru

    const a = pgAtur();
    const opsiMenit = PILIHAN_MENIT.map(([m, t]) => `<option value="${m}" ${m === a.task_menit ? 'selected' : ''}>${t}</option>`).join('');
    const hari = URUTAN_HARI.map(h => `<button type="button" class="pg-hari-item ${a.pagi_hari.includes(h) ? 'on' : ''}"
        aria-pressed="${a.pagi_hari.includes(h)}" onclick="pgToggleHari(${h})">${NAMA_HARI_PENDEK[h]}</button>`).join('');
    const pesan = pgPesan ? `<div class="pg-pesan pg-pesan-${pgPesan.jenis}">${esc(pgPesan.teks)}</div>` : '';

    // Pertahankan fokus & posisi gulir saat digambar ulang
    const body = document.getElementById('pengingatIsi');
    const fokus = document.activeElement && body.contains(document.activeElement) ? document.activeElement.id : '';
    body.innerHTML = `
        ${pgHtmlStatus(st)}
        ${pesan}
        <div class="pg-bagian">
            <div class="pg-baris">
                <div><div class="pg-judul">⏰ Pengingat task</div>
                <div class="pg-sub">Untuk task yang punya tanggal <b>dan</b> jam.</div></div>
                <label class="pg-saklar"><input type="checkbox" id="pgTaskOn" ${a.task_on ? 'checked' : ''}
                    onchange="pgUbahAtur('task_on', this.checked)" aria-label="Pengingat task"><span></span></label>
            </div>
            <div class="form-group pg-isian">
                <label for="pgTaskMenit">Bawaan untuk task</label>
                <select id="pgTaskMenit" onchange="pgUbahAtur('task_menit', Number(this.value))" ${a.task_on ? '' : 'disabled'}>${opsiMenit}</select>
                <div class="pg-sub">Bisa diganti per task di form task (di bawah kolom Time). Task Completed dan Cancelled tidak diingatkan.</div>
            </div>
        </div>
        <div class="pg-bagian">
            <div class="pg-baris">
                <div><div class="pg-judul">☀️ Ringkasan pagi</div>
                <div class="pg-sub">Daftar task Today, termasuk yang tanpa jam.</div></div>
                <label class="pg-saklar"><input type="checkbox" id="pgPagiOn" ${a.pagi_on ? 'checked' : ''}
                    onchange="pgUbahAtur('pagi_on', this.checked)" aria-label="Ringkasan pagi"><span></span></label>
            </div>
            <div class="pg-dua">
                <div class="form-group pg-isian"><label for="pgPagiJam">Jam</label>
                    <input type="time" id="pgPagiJam" value="${esc(a.pagi_jam)}" ${a.pagi_on ? '' : 'disabled'}
                        onchange="if (this.value) pgUbahAtur('pagi_jam', this.value)"></div>
                <div class="form-group pg-isian"><label>Hari</label>
                    <div class="pg-hari ${a.pagi_on ? '' : 'pg-mati'}">${hari}</div></div>
            </div>
        </div>
        <div class="pg-bagian">
            <div class="pg-judul">📱 Perangkat yang menerima</div>
            <div class="pg-daftar">${pgHtmlPerangkat()}</div>
        </div>
        ${st === 'aktif' ? `<button class="btn btn-secondary btn-block" onclick="pgUji()" ${pgSibuk ? 'disabled' : ''}>🧪 Kirim notifikasi uji ke perangkat ini</button>` : ''}
        <p class="modal-note pg-catatan">Pengingat dikirim dari server berdasarkan task yang sudah <b>tersinkron</b>
        (status ● Tersinkron di header). Task yang dibuat atau diselesaikan saat offline baru diperhitungkan setelah tersinkron.
        Di laptop, notifikasi muncul selama Edge/Chrome berjalan.</p>`;
    if (fokus) { const el = document.getElementById(fokus); if (el) el.focus(); }
}

function pgToggleHari(h) {
    const a = pgAtur();
    if (!a.pagi_on) return;
    const set = new Set(a.pagi_hari);
    if (set.has(h)) { if (set.size === 1) return; set.delete(h); } else set.add(h);   // minimal satu hari
    pgUbahAtur('pagi_hari', [...set].sort());
}

// ---------- Form task: 🔔 per task ----------

function pgIsiPilihanForm() {
    const sel = document.getElementById('taskIngat');
    if (!sel) return;
    const a = pgAtur();
    const nilai = sel.value;
    const bawaan = a.task_on ? `Ikuti bawaan (${pgTeksMenit(a.task_menit)})` : 'Ikuti bawaan (pengingat task mati)';
    sel.innerHTML = `<option value="">${bawaan}</option>`
        + PILIHAN_MENIT.map(([m, t]) => `<option value="${m}">${t}</option>`).join('')
        + '<option value="-1">Tanpa pengingat</option>';
    sel.value = nilai;
    if (sel.value !== nilai) sel.value = '';
}

function pgTampilkanBarisForm() {
    const baris = document.getElementById('ingatTaskBaris');
    if (baris) baris.hidden = !document.getElementById('taskTime').value;
}

// Dipanggil saat form dibuka (task baru: null)
function pgMuatForm(task) {
    pgIsiPilihanForm();
    const sel = document.getElementById('taskIngat');
    const v = task && typeof task.ingat === 'number' ? String(task.ingat) : '';
    sel.value = v;
    if (sel.value !== v) {
        // Nilai menit lain (mis. dari versi berikutnya): tetap ditampilkan & dipertahankan
        sel.insertAdjacentHTML('beforeend', `<option value="${esc(v)}">${esc(v)} menit sebelumnya</option>`);
        sel.value = v;
    }
    pgTampilkanBarisForm();
}

// Dipanggil dari saveTask()
function pgTerapkanKeTask(task) {
    const v = document.getElementById('taskIngat').value;
    if (v === '') delete task.ingat;
    else task.ingat = Number(v);
}

function setupPengingat() {
    const jam = document.getElementById('taskTime');
    if (jam) jam.addEventListener('input', pgTampilkanBarisForm);
    pgIsiPilihanForm();
}
