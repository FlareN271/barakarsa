/* ============================================================
   data.js — data utama: task, project, label

   Sumber utama data adalah localStorage `barakarsa_v6` (local-first).
   Sinkron ke Supabase ada di sinkron.js dan berjalan di atasnya.
   Bentuk data dijelaskan di ARSITEKTUR.md.
   ============================================================ */

const STORAGE_KEY = 'barakarsa_v6';

// Pilihan warna untuk project dan label (data pengguna, bukan warna tema)
const colorPalette = [
    '#ef4444', '#f97316', '#eab308', '#84cc16',
    '#10b981', '#14b8a6', '#0ea5e9', '#6366f1',
    '#a855f7', '#ec4899', '#f43f5e', '#64748b'
];

// Priority 1–4. Nilai yang disimpan tetap memakai kode lama (do/schedule/delegate/eliminate)
// supaya data lama, sinkron Supabase, dan versi aplikasi lama tetap cocok.
const PRIORITY_LABEL = {
    do:        { short: 'P1', long: 'Priority 1' },
    schedule:  { short: 'P2', long: 'Priority 2' },
    delegate:  { short: 'P3', long: 'Priority 3' },
    eliminate: { short: 'P4', long: 'Priority 4' }
};

let tasks = [];
let projects = [
    { id: 1, name: 'KipApp', color: '#10b981', ckp: true, mig31: true },
    { id: 2, name: 'Kerja', color: '#0ea5e9', mig31: true },
    { id: 3, name: 'Personal', color: '#a855f7', mig31: true }
];
let labels = [];
let nextProjectId = 4;
let nextLabelId = 1;
// Penanda item yang dihapus, supaya penghapusan ikut tersinkron (lihat sinkron.js)
let tombstones = [];

// ---------- Muat & simpan ----------

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const data = JSON.parse(saved);
        tasks = data.tasks || [];
        projects = data.projects || [];
        labels = data.labels || [];
        nextProjectId = data.nextProjectId || 4;
        nextLabelId = data.nextLabelId || 1;
        tombstones = data.tombstones || [];
    }
    normalizeOrder();
    initSyncSnapshot();
    primeLastStamp();
    // Simpan (dan sinkronkan) bila ada yang dimigrasi atau task yang belum bernomor urutan
    const migrated = migrate31();
    if (migrated || hasMissingOrder()) saveData();
}

// Tulis seluruh data ke localStorage apa adanya (tanpa menandai perubahan)
function writeStore() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        tasks, projects, labels, nextProjectId, nextLabelId, tombstones
    }));
}

// Simpan setelah pengguna mengubah sesuatu. Urutannya penting:
// 1) catat/hapus waktu selesai, 2) beri nomor urutan pada task baru,
// 3) beri cap updatedAt pada item yang berubah dan tombstone pada item
//    yang hilang, 4) tulis, 5) jadwalkan sinkron.
function saveData() {
    trackCompletion();
    fillMissingOrder();
    stampChanges();
    writeStore();
    scheduleSync();
}

// ---------- Nomor urutan (order) ----------
// Setiap task membawa angka "order" supaya urutannya bertahan saat lewat
// database (baris di database tidak punya urutan bawaan).

const hasOrder = t => typeof t.order === 'number' && Number.isFinite(t.order);

function hasMissingOrder() {
    return tasks.some(t => !hasOrder(t));
}

// Urutkan task menurut order. Bila ada task yang belum bernomor, urutan
// tersimpan dibiarkan apa adanya; fillMissingOrder() memberi nomor sesuai
// posisinya saat data disimpan. (Sebelum 3.2.3 semua task dinomori ulang
// di perangkat itu saja, sehingga nomor di tiap perangkat bisa berbeda.)
function normalizeOrder() {
    if (hasMissingOrder()) return;
    tasks.sort((a, b) => a.order - b.order);
}

// Beri nomor pada task yang belum punya (task baru, data lama, impor, atau
// task dari perangkat yang masih 3.2.2), di antara tetangganya di daftar.
// Task baru selalu ada di akhir daftar, jadi mendapat nomor terbesar.
function fillMissingOrder() {
    if (!hasMissingOrder()) return;
    let i = 0;
    while (i < tasks.length) {
        if (hasOrder(tasks[i])) { i++; continue; }
        let j = i;
        while (j < tasks.length && !hasOrder(tasks[j])) j++;       // tasks[i..j-1] belum bernomor
        const count = j - i;
        const prev = i > 0 ? tasks[i - 1].order : null;
        const next = j < tasks.length ? tasks[j].order : null;
        let lo, hi;
        if (prev === null && next === null) { lo = 0; hi = (count + 1) * 1000; }
        else if (prev === null) { hi = next; lo = next - (count + 1) * 1000; }
        else if (next === null || next <= prev) { lo = prev; hi = prev + (count + 1) * 1000; }
        else { lo = prev; hi = next; }
        const step = (hi - lo) / (count + 1);
        for (let k = 0; k < count; k++) tasks[i + k].order = lo + step * (k + 1);
        i = j;
    }
    tasks.sort((a, b) => a.order - b.order);
}

// ---------- Waktu selesai (completedAt) ----------
// Diisi saat task menjadi Completed, dihapus saat dibuka kembali.
// null = selesai sebelum v3.1, waktunya tidak diketahui.
function trackCompletion() {
    const now = new Date().toISOString();
    tasks.forEach(t => {
        if (t.status === 'completed') {
            if (t.completedAt === undefined) t.completedAt = now;
        } else if (t.completedAt !== undefined) {
            delete t.completedAt;
        }
    });
}

// ---------- Migrasi v3.1 (aman diulang, aman untuk sinkron) ----------
// Setiap project hanya dimigrasi sekali (ditandai mig31), jadi nama yang
// kemudian diubah sendiri oleh pengguna tidak akan ditimpa lagi.
function migrate31() {
    let changed = false;
    projects.forEach(p => {
        if (p.mig31) return;
        const name = String(p.name || '').trim();
        if (name.toUpperCase() === 'ASN') { p.name = 'KipApp'; p.ckp = true; }
        else if (name.toLowerCase() === 'work') { p.name = 'Kerja'; }
        p.mig31 = true;
        changed = true;
    });

    // Data lama yang project CKP-nya sudah diganti nama sebelum v3.1:
    // dulu CKP mengenalinya lewat id 1, jadi tandai project id 1.
    if (!localStorage.getItem('barakarsa_mig31_ckp')) {
        if (!projects.some(p => p.ckp)) {
            const p1 = projects.find(p => p.id == 1);
            if (p1) { p1.ckp = true; changed = true; }
        }
        localStorage.setItem('barakarsa_mig31_ckp', '1');
    }

    // Task yang sudah selesai sebelum v3.1: waktu selesainya tidak diketahui (null),
    // supaya tidak tercatat seolah-olah selesai hari ini.
    if (!localStorage.getItem('barakarsa_mig31_done')) {
        tasks.forEach(t => {
            if (t.status === 'completed' && t.completedAt === undefined) { t.completedAt = null; changed = true; }
        });
        localStorage.setItem('barakarsa_mig31_done', '1');
    }
    return changed;
}

// ---------- Project CKP ----------
// CKP mengikuti penanda "Project CKP" (v3.1), bukan lagi nama "ASN".
function ckpProjectIds() {
    const flagged = projects.filter(p => p.ckp);
    if (flagged.length) return flagged.map(p => p.id);
    // Cadangan untuk data yang belum termigrasi
    return projects.filter(p => /^(asn|kipapp)$/i.test((p.name || '').trim())).map(p => p.id);
}

// Apakah task ini masuk CKP? (task.project tersimpan sebagai teks, id project angka: pakai ==)
function isCkpTask(task) {
    if (!task || task.project == null || task.project === '') return false;
    return ckpProjectIds().some(id => id == task.project);
}

// ---------- Tanggal ----------
// Semua "hari ini" memakai tanggal lokal perangkat (WITA), bukan UTC.
// Sebelum 3.2.3, Today/Upcoming dan tanggal bawaan form memakai UTC, sehingga
// antara pukul 00.00–07.59 WITA aplikasi masih menganggap hari kemarin.
function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------- Utilitas teks & tanggal (dipakai di banyak file) ----------

// Amankan teks sebelum dimasukkan ke HTML
function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// "2026-10-08" → "8 Oktober 2026"
function fmtTanggal(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Rentang tanggal ringkas: "8–10 Oktober 2026", "30 September – 2 Oktober 2026"
function fmtRentang(a, b) {
    if (!a) return '';
    if (!b || b <= a) return fmtTanggal(a);
    const d1 = new Date(a + 'T00:00:00'), d2 = new Date(b + 'T00:00:00');
    const bln = d => d.toLocaleDateString('id-ID', { month: 'long' });
    if (d1.getFullYear() !== d2.getFullYear()) return `${fmtTanggal(a)} – ${fmtTanggal(b)}`;
    if (d1.getMonth() !== d2.getMonth()) return `${d1.getDate()} ${bln(d1)} – ${d2.getDate()} ${bln(d2)} ${d2.getFullYear()}`;
    return `${d1.getDate()}–${d2.getDate()} ${bln(d2)} ${d2.getFullYear()}`;
}

// "2026-10-08" → "08 Okt" (badge tanggal di kartu task)
function fmtPendek(iso) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

// Tanggal Minggu awal pekan ini (tanggal lokal), untuk "This Week Done"
function weekStartISO() {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
