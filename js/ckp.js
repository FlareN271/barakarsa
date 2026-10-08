/* ============================================================
   ckp.js — CKP Triwulan: katalog IKI, saran IKI, hub triwulan

   Katalog IKI TIDAK ditanam di kode (repo GitHub Pages publik):
   diimpor dari file pohon_kinerja_*.json milik pengguna, lalu
   disimpan di localStorage `barakarsa_ckp_v1` + tabel Supabase
   `barakarsa_settings` (satu baris per bagian: katalog, profil,
   catatan). Ekspor PDF, Word, dan Excel ada di ekspor.js.
   ============================================================ */

const CKP_KEY = 'barakarsa_ckp_v1';
const CKP_SETTINGS_TABLE = 'barakarsa_settings';
const CKP_PARTS = ['katalog', 'profil', 'catatan'];
const BULAN_ID = ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI','JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER'];
const ROMAWI = ['', 'I', 'II', 'III', 'IV'];

// ---------- Penyimpanan pengaturan CKP ----------
let ckpStore = (() => { try { return JSON.parse(localStorage.getItem(CKP_KEY)) || {}; } catch (e) { return {}; } })();

function ckpGet(part) { return (ckpStore[part] && ckpStore[part].data) || {}; }
function ckpSet(part, data) {
    ckpStore[part] = { data, updatedAt: new Date().toISOString() };
    localStorage.setItem(CKP_KEY, JSON.stringify(ckpStore));
    ckpScheduleSettingsSync();
}
function ckpCatalog() { return ckpGet('katalog').entries || []; }
function ckpEntry(id) { return id ? ckpCatalog().find(e => e.id === id) : null; }
function ckpPegawai() {
    return Object.assign({ nama: '', nip: '', pangkat: '', jabatan: '', kota: 'Paringin', idPegawai: '', wilayah: 'Balangan', unit: 'BPS Kabupaten/Kota' },
        ckpGet('profil').pegawai || {});
}
function ckpOverrides() { return ckpGet('profil').overrides || {}; }
function ckpSavePegawai(field, value) {
    const p = ckpGet('profil');
    ckpSet('profil', { ...p, pegawai: { ...ckpPegawai(), [field]: value } });
}
function ckpSaveOverride(id, field, value) {
    const p = ckpGet('profil');
    const ov = { ...(p.overrides || {}) };
    ov[id] = { ...(ov[id] || {}), [field]: value };
    ckpSet('profil', { ...p, overrides: ov });
}
function ckpPeriodKey(y, q) { return `${y}-TW${q}`; }
function ckpNote(y, q, id) { return ((ckpGet('catatan')[ckpPeriodKey(y, q)] || {})[id]) || {}; }
function ckpSaveNote(y, q, id, field, value) {
    const all = { ...ckpGet('catatan') };
    const key = ckpPeriodKey(y, q);
    all[key] = { ...(all[key] || {}) };
    all[key][id] = { ...(all[key][id] || {}), [field]: value };
    ckpSet('catatan', all);
}

// ---------- Sinkron pengaturan (tabel terpisah, aman untuk versi lama) ----------
let ckpSyncTimer = null;
let ckpSettingsUnavailable = false;
function ckpScheduleSettingsSync() {
    clearTimeout(ckpSyncTimer);
    ckpSyncTimer = setTimeout(ckpSyncSettings, 1500);
}
async function ckpSyncSettings() {
    if (ckpSettingsUnavailable || !sb || !currentUser || !navigator.onLine) return;
    try {
        const { data: rows, error } = await sb.from(CKP_SETTINGS_TABLE).select('id,data,updated_at');
        if (error) {
            console.warn('Sinkron pengaturan CKP gagal:', error.message);
            if (/does not exist|schema cache|relation/i.test(error.message)) ckpSettingsUnavailable = true;
            return;
        }
        const remote = new Map((rows || []).map(r => [r.id, r]));
        const push = [];
        let changed = false;
        CKP_PARTS.forEach(part => {
            const l = ckpStore[part];
            const r = remote.get(part);
            const lt = l ? Date.parse(l.updatedAt) : 0;
            const rt = r ? Date.parse(r.updated_at) : 0;
            if (r && rt > lt) { ckpStore[part] = { data: r.data, updatedAt: r.updated_at }; changed = true; }
            else if (l && lt > rt) push.push({ user_id: currentUser.id, id: part, data: l.data, updated_at: l.updatedAt });
        });
        if (push.length) {
            const { error: e2 } = await sb.from(CKP_SETTINGS_TABLE).upsert(push, { onConflict: 'user_id,id' });
            if (e2) console.warn('Simpan pengaturan CKP ke server gagal:', e2.message);
        }
        if (changed) {
            localStorage.setItem(CKP_KEY, JSON.stringify(ckpStore));
            debouncedRender();
            ckpRefreshHubIfIdle();
        }
    } catch (err) { console.warn('Sinkron pengaturan CKP error:', err); }
}

// ---------- Util ----------
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
function hashId(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return 'iki_' + h.toString(36);
}
function stripCode(s) { return String(s || '').replace(/^\s*[IVX]+(\.\d+)*\.?\s+/, '').trim(); }
function quarterRange(y, q) {
    const m0 = (q - 1) * 3;
    const pad = n => String(n).padStart(2, '0');
    const last = new Date(y, m0 + 3, 0).getDate();
    return { start: `${y}-${pad(m0 + 1)}-01`, end: `${y}-${pad(m0 + 3)}-${pad(last)}`, m0, last };
}

// ---------- Impor pohon kinerja -> katalog IKI ----------
function ckpBuildCatalog(pk) {
    const rkRows = pk.rk_iki || [];
    const tw = pk.ckp_tw2 || [];
    const entries = [];
    (pk.penugasan_naufal || pk.penugasan || []).forEach(p => {
        const r = rkRows.find(x => norm(x.kegiatan) === norm(p.kegiatan) && String(x.ik || '').startsWith(p.kode_ik))
               || rkRows.find(x => norm(x.kegiatan) === norm(p.kegiatan));
        if (!r) return;
        const rincian = r.rincian || [];
        const rkList = r.rk_anggota || [];
        const seen = new Set();
        (r.iki_anggota || []).forEach(pair => {
            const iki = String(pair.iki || '').replace(/^\d+\.\s*/, '').trim();
            if (!iki || seen.has(norm(iki))) return;
            seen.add(norm(iki));
            const rkIdx = rkList.indexOf(pair.rk);
            const rinc = rincian.length === rkList.length && rkIdx >= 0 ? rincian[rkIdx] : rincian.join('; ');
            const twRow = tw.find(t => norm(t.capaian) === norm(iki));
            entries.push({
                id: hashId(norm(p.kegiatan) + '|' + norm(iki)),
                kode_ik: p.kode_ik || '',
                kelompok: p.kelompok || '',
                tim: p.tim || r.tim || '',
                peran: p.peran || 'Anggota',
                ketua_tim: r.ketua_tim || '',
                tujuan: stripCode(r.tujuan),
                sasaran: stripCode(r.sasaran),
                ik: stripCode(r.ik),
                rk_ketua: r.rk_ketua || '',
                iki_ketua: r.iki_ketua || '',
                kegiatan: p.kegiatan,
                rk_anggota: pair.rk || rkList[0] || '',
                iki_anggota: iki,
                rincian: rinc || '',
                rk_ringkas: twRow ? twRow.rencana_kinerja : '',
                dipakai_tw2: !!twRow
            });
        });
    });
    // Nama pendek untuk kegiatan yang punya lebih dari satu IKI
    entries.forEach(e => {
        const sibs = entries.filter(x => x.kegiatan === e.kegiatan);
        if (sibs.length < 2) { e.short = e.kegiatan; return; }
        const stage = (e.iki_anggota.match(/Persiapan|Pengumpulan|Pengolahan|keprotokolan|penyusun laporan|kehumasan|Permintaan Dokumen|pemenuhan dokumen/i) || [])[0];
        e.short = e.kegiatan + ' · ' + (stage ? stage.charAt(0).toUpperCase() + stage.slice(1).toLowerCase() : (sibs.indexOf(e) + 1));
    });
    return entries;
}

function ckpImportFile(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const pk = JSON.parse(reader.result);
            const entries = ckpBuildCatalog(pk);
            if (!entries.length) throw new Error('Tidak ada penugasan/IKI yang dikenali di file ini.');
            ckpSet('katalog', { entries, source: file.name, importedAt: new Date().toISOString() });
            // Isi profil pegawai dari file bila masih kosong
            const peg = ckpPegawai();
            const hdr = (pk.ckp_format && pk.ckp_format.header) || {};
            const upd = {};
            if (!peg.nama && pk.pegawai) upd.nama = pk.pegawai;
            if (!peg.idPegawai && hdr.pegawai) { const m = String(hdr.pegawai).match(/\[(\d+)\]/); if (m) upd.idPegawai = m[1]; }
            if (hdr.wilayah && !ckpGet('profil').pegawai) upd.wilayah = hdr.wilayah;
            if (hdr.unit && !ckpGet('profil').pegawai) upd.unit = hdr.unit;
            if (Object.keys(upd).length) {
                const p = ckpGet('profil');
                ckpSet('profil', { ...p, pegawai: { ...peg, ...upd } });
            }
            evToast(`Katalog terisi: ${entries.length} IKI dari ${file.name}`);
            ckpRenderHub();
            debouncedRender();
        } catch (err) {
            evToast('Impor gagal: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// ---------- Saran IKI dari judul task ----------
const CKP_SYNONYMS = [
    [/sakip/i, ['sakip', 'akip', 'lkip', 'renstra', 'perjanjian kinerja', 'pk', 'kertas kerja', 'capaian output']],
    [/humas/i, ['humas', 'kehumasan', 'medsos', 'media sosial', 'instagram', 'konten', 'desain', 'protokol', 'keprotokolan', 'rapat pimpinan', 'liputan']],
    [/sensus ekonomi/i, ['se2026', 'se 2026', 'sensus ekonomi', 'sensus']],
    [/ksa/i, ['ksa', 'kerangka sampel area']],
    [/ubinan/i, ['ubinan']],
    [/hortikultura/i, ['horti', 'hortibun', 'hortikultura', 'perkebunan']],
    [/podes/i, ['podes', 'potensi desa']],
    [/desa cinta/i, ['desa cantik', 'desa cinta', 'dcs', 'pembinaan desa']],
    [/pelayanan statistik terpadu/i, ['pst', 'pelayanan statistik', 'skd', 'pekppp', 'konsultasi data', 'layanan data']],
    [/ketahanan sosial/i, ['polkam', 'gc pbi', 'gc pln', 'ground check', 'ketahanan sosial']],
    [/industri/i, ['imk', 'ibs', 'industri']],
    [/mineral/i, ['sktr', 'skth', 'air bersih', 'galian', 'konstruksi', 'urt']],
    [/statkesra|kesejahteraan/i, ['susenas', 'seruti', 'snlik', 'kesra']],
    [/^dda$/i, ['dda', 'kcda', 'dalam angka']]
];
const CKP_STAGES = [
    [/persiapan/i, /persiapan|pelatihan|rekrut|briefing|sosialisasi|pemutakhiran/],
    [/pengumpulan/i, /pencacahan|cacah|lapangan|pendataan|listing|pengumpulan/],
    [/pengolahan/i, /pengolahan|olah|entri|entry|validasi|evaluasi|cleaning/],
    [/keprotokolan/i, /protokol|rapat pimpinan|agenda pimpinan|mc\b|pembawa acara/],
    [/kehumasan yang kreatif/i, /konten|medsos|media sosial|instagram|rilis|desain|liputan|website/]
];
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasWord = (text, w) => new RegExp('(^|[^a-z0-9])' + reEsc(w) + '($|[^a-z0-9])').test(text);

function ckpKeywords(e) {
    if (e._kw) return e._kw;
    const STOP = ['dokumen', 'pengisian', 'kegiatan', 'laporan', 'statistik', 'pendataan', 'pelaksanaan', 'triwulanan', 'keluar', 'masuk'];
    const own = [], words = [];
    String(e.rincian || '').split(/[;,&()]|\bdsb\b|\bdll\b/i).map(s => s.trim().toLowerCase())
        .filter(s => s.length >= 2 && !/^(dsb|dll|-)$/.test(s))
        .forEach(s => {
            own.push(s);
            s.split(/\s+/).forEach(w => { if (w.length >= 6 && !STOP.includes(w) && !words.includes(w)) words.push(w); });
        });
    const syn = [...words];
    CKP_SYNONYMS.forEach(([re, words]) => { if (re.test(e.kegiatan)) syn.push(...words); });
    syn.push(e.kegiatan.toLowerCase());
    e._kw = { own, syn };
    return e._kw;
}

function ckpSuggest(text) {
    const t = ' ' + String(text || '').toLowerCase() + ' ';
    if (t.trim().length < 3) return null;
    let best = null, bestScore = 0;
    ckpCatalog().forEach(e => {
        const kw = ckpKeywords(e);
        let score = 0;
        kw.own.forEach(w => { if (hasWord(t, w)) score += 2; });
        kw.syn.forEach(w => { if (hasWord(t, w)) score += 1; });
        if (!score) return;
        CKP_STAGES.forEach(([ikiRe, textRe]) => { if (ikiRe.test(e.iki_anggota) && textRe.test(t)) score += 2; });
        if (e.dipakai_tw2) score += 0.1;
        if (score > bestScore) { best = e; bestScore = score; }
    });
    return best;
}

// ---------- IKI di form task ----------
// Kolom IKI ada di HTML form task (#ikiGroup); di sini hanya pemasangan event-nya
function setupIkiField() {
    document.getElementById('taskProject').addEventListener('change', ckpToggleIkiGroup);
    let t = null;
    ['taskTitle', 'taskDesc'].forEach(id => document.getElementById(id).addEventListener('input', () => {
        clearTimeout(t); t = setTimeout(ckpUpdateSuggestion, 250);
    }));
}

function ckpFillIkiSelect(selected) {
    const sel = document.getElementById('taskIki');
    const cat = ckpCatalog();
    if (!cat.length) {
        sel.innerHTML = '<option value="">— impor pohon kinerja dulu (menu ⋯ → CKP Triwulan)</option>';
        return;
    }
    const groups = [];
    cat.forEach(e => {
        let g = groups.find(x => x.tim === e.tim);
        if (!g) { g = { tim: e.tim, items: [] }; groups.push(g); }
        g.items.push(e);
    });
    let html = '<option value="">— belum dipilih —</option>';
    if (selected && !ckpEntry(selected)) html += `<option value="${esc(selected)}">(IKI lama, tidak ada di katalog)</option>`;
    groups.forEach(g => {
        html += `<optgroup label="${esc(g.tim)}">` + g.items.map(e =>
            `<option value="${e.id}" title="${esc(e.iki_anggota)}">${esc(e.short)}</option>`).join('') + '</optgroup>';
    });
    sel.innerHTML = html;
    sel.value = selected || '';
}

function ckpToggleIkiGroup() {
    const g = document.getElementById('ikiGroup');
    const isCkp = isCkpTask({ project: document.getElementById('taskProject').value });
    g.style.display = isCkp ? '' : 'none';
    document.querySelectorAll('#taskModal .ckp-sub').forEach(el => { el.style.display = isCkp ? '' : 'none'; });
    ckpUpdateSuggestion();
}

function ckpOnIkiChange() {
    const e = ckpEntry(document.getElementById('taskIki').value);
    document.getElementById('ikiFull').textContent = e ? e.iki_anggota : '';
    ckpUpdateSuggestion();
}

function ckpUpdateSuggestion() {
    const box = document.getElementById('ikiSuggest');
    const sel = document.getElementById('taskIki');
    const isCkp = isCkpTask({ project: document.getElementById('taskProject').value });
    if (!isCkp || sel.value || !ckpCatalog().length) { box.innerHTML = ''; return; }
    const text = document.getElementById('taskTitle').value + ' ' + document.getElementById('taskDesc').value;
    const e = ckpSuggest(text);
    box.innerHTML = e ? `<button type="button" onclick="ckpPickSuggestion('${e.id}')">💡 Saran: ${esc(e.short)}</button>` : '';
}

function ckpPickSuggestion(id) {
    document.getElementById('taskIki').value = id;
    ckpOnIkiChange();
}

function ckpLoadTaskForm(task) {
    document.getElementById('taskDateEnd').value = (task && task.dateEnd) || '';
    ckpFillIkiSelect(task ? task.iki : '');
    ckpOnIkiChange();
    ckpToggleIkiGroup();
}

// Dipanggil dari saveTask: IKI dan "Sampai tanggal" (hanya bila setelah tanggal mulai)
function ckpApplyToTask(task) {
    task.iki = document.getElementById('taskIki').value || '';
    const de = document.getElementById('taskDateEnd').value;
    task.dateEnd = (de && task.date && de > task.date) ? de : '';
}

// ---------- Hub CKP Triwulan ----------
const now0 = new Date();
let ckpYear = now0.getFullYear();
let ckpQ = Math.floor(now0.getMonth() / 3) + 1;
let ckpIncludeUnfinished = false;
let ckpOpenEditor = null;

function openCkpHub() {
    ckpRenderHub();
    document.getElementById('ckpHubModal').classList.add('active');
    ckpSyncSettings();
}

function closeCkpHub() {
    document.getElementById('ckpHubModal').classList.remove('active');
}

function ckpHubOpen() {
    return document.getElementById('ckpHubModal').classList.contains('active');
}

// Gambar ulang hub bila terbuka, kecuali pengguna sedang mengetik di dalamnya
function ckpRefreshHubIfIdle() {
    if (!ckpHubOpen()) return;
    const a = document.activeElement;
    if (a && document.getElementById('ckpHubModal').contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
    ckpRenderHub();
}

function ckpPeriodTasks() {
    const { start, end } = quarterRange(ckpYear, ckpQ);
    return tasks.filter(t => isCkpTask(t) && t.date && t.date >= start && t.date <= end);
}
function ckpTasksFor(entryId) {
    return ckpPeriodTasks()
        .filter(t => t.iki === entryId && (ckpIncludeUnfinished || t.status === 'completed'))
        .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.order || 0) - (b.order || 0));
}

function ckpHeader(e) {
    const o = ckpOverrides()[e.id] || {};
    const base = {
        judul: ckpDefaultJudul(e),
        peranLabel: /pj/i.test(e.peran) ? 'PJ KEGIATAN' : 'ANGGOTA TIM',
        timKerja: e.tim, tujuan: e.tujuan,
        sasaranKepala: e.sasaran, indikatorKepala: e.ik,
        sasaranKetua: e.rk_ketua, indikatorKetua: e.iki_ketua,
        sasaranAnggota: e.rk_anggota, indikatorAnggota: e.iki_anggota,
        ketuaNama: e.ketua_tim, ketuaNip: ''
    };
    Object.keys(o).forEach(k => { if (o[k] != null && String(o[k]).trim() !== '') base[k] = o[k]; });
    return base;
}
function ckpDefaultJudul(e) {
    return String(e.rk_anggota || e.kegiatan)
        .replace(/^(Terlaksananya|Terpenuhinya|Terselenggaranya|Tersedianya|Terlayani)\s+/i, '')
        .replace(/^Tahapan\s+(Pelaksanaan\s+)?Kegiatan\s+/i, '')
        .replace(/^kegiatan\s+/i, '')
        .replace(/\s+yang\s+(tepat waktu|sesuai SOP|efektif|sesuai standar).*$/i, '')
        .toUpperCase();
}

const HEADER_FIELDS = [
    ['judul', 'Judul laporan (baris ke-3 judul)'], ['peranLabel', 'Peran di judul (mis. ANGGOTA TIM)'],
    ['timKerja', 'Tim kerja'], ['tujuan', 'Tujuan'],
    ['sasaranKepala', 'Sasaran kinerja kepala'], ['indikatorKepala', 'Indikator kinerja kepala'],
    ['sasaranKetua', 'Sasaran kinerja ketua tim'], ['indikatorKetua', 'Indikator kinerja ketua tim'],
    ['sasaranAnggota', 'Sasaran kinerja anggota tim'], ['indikatorAnggota', 'Indikator kinerja anggota tim'],
    ['ketuaNama', 'Nama ketua tim (penandatangan)'], ['ketuaNip', 'NIP ketua tim']
];

function ckpRenderHub() {
    const body = document.getElementById('ckpHubBody');
    if (!body) return;
    const cat = ckpCatalog();
    const kat = ckpGet('katalog');
    const peg = ckpPegawai();
    const years = [];
    for (let y = now0.getFullYear() + 1; y >= now0.getFullYear() - 3; y--) years.push(y);

    let html = `<h2 class="modal-title">📋 CKP Triwulan</h2>
        <div class="ckp-row ckp-period">
            <select onchange="ckpYear=+this.value; ckpRenderHub()">${years.map(y => `<option ${y === ckpYear ? 'selected' : ''}>${y}</option>`).join('')}</select>
            <select onchange="ckpQ=+this.value; ckpRenderHub()">${[1, 2, 3, 4].map(q => `<option value="${q}" ${q === ckpQ ? 'selected' : ''}>Triwulan ${ROMAWI[q]}</option>`).join('')}</select>
            <label class="ckp-check">
                <input type="checkbox" ${ckpIncludeUnfinished ? 'checked' : ''} onchange="ckpIncludeUnfinished=this.checked; ckpRenderHub()"> sertakan task yang belum Completed</label>
        </div>`;

    if (!cat.length) {
        html += `<div class="ckp-card ckp-start">
            <strong>Mulai dengan mengimpor pohon kinerja</strong>
            <p class="ckp-note">Pilih file <code>pohon_kinerja_*.json</code>. Barakarsa akan membuat daftar IKI dari penugasanmu, lengkap dengan tim, ketua tim, sasaran, dan indikatornya.</p>
            <label class="btn btn-primary btn-sm ckp-file-btn">📥 Impor pohon kinerja (JSON)
                <input type="file" accept=".json,application/json" hidden onchange="ckpImportFile(this)"></label>
        </div>`;
        body.innerHTML = html;
        return;
    }

    // Peringatan
    const period = ckpPeriodTasks();
    const noIki = period.filter(t => !t.iki || !ckpEntry(t.iki));
    const unfinished = period.filter(t => t.status !== 'completed');
    const noPhoto = period.filter(t => t.status === 'completed' && evPhotos(t).length === 0);
    if (noIki.length || noPhoto.length || (!ckpIncludeUnfinished && unfinished.length)) {
        html += `<div class="ev-banner ckp-warn">`;
        if (noIki.length) html += `<div>🎯 <strong>${noIki.length}</strong> task CKP triwulan ini belum dipilih IKI-nya (tidak akan masuk laporan):</div>
            <ul class="ckp-warnlist">${noIki.slice(0, 12).map(t => `<li><a onclick="editTask(${t.id})">${esc(t.title)}</a> <span class="ckp-warn-date">${fmtTanggal(t.date)}</span></li>`).join('')}${noIki.length > 12 ? `<li>…dan ${noIki.length - 12} lagi</li>` : ''}</ul>`;
        if (noPhoto.length) html += `<div class="ckp-warn-more">📷 <strong>${noPhoto.length}</strong> task selesai belum ada foto bukti dukung.</div>`;
        if (!ckpIncludeUnfinished && unfinished.length) html += `<div class="ckp-warn-more">⏳ <strong>${unfinished.length}</strong> task CKP triwulan ini belum berstatus Completed (tidak ikut dihitung).</div>`;
        html += `</div>`;
    }

    // Daftar IKI
    const withTasks = cat.filter(e => ckpTasksFor(e.id).length);
    const withoutTasks = cat.filter(e => !ckpTasksFor(e.id).length);
    html += `<div class="ckp-row ckp-list-head">
            <h3>IKI dengan kegiatan di Triwulan ${ROMAWI[ckpQ]} ${ckpYear} (${withTasks.length})</h3>
            <button class="btn btn-secondary btn-sm" onclick="ckpExportExcel()" ${withTasks.length ? '' : 'disabled'}>⬇️ Excel rekap CKP</button>
        </div>`;
    html += withTasks.length ? withTasks.map(e => ckpCardHTML(e)).join('')
        : '<p class="ckp-note">Belum ada task CKP yang ditautkan ke IKI pada triwulan ini.</p>';
    if (withoutTasks.length) {
        html += `<details><summary>IKI lain tanpa kegiatan triwulan ini (${withoutTasks.length})</summary>
            ${withoutTasks.map(e => ckpCardHTML(e, true)).join('')}</details>`;
    }

    // Profil pegawai
    html += `<details ${peg.nama && peg.nip ? '' : 'open'}><summary>👤 Profil pegawai (untuk semua laporan)</summary>
        <div class="ckp-grid">
            ${[['nama', 'Nama lengkap + gelar'], ['nip', 'NIP'], ['pangkat', 'Pangkat/Golongan'], ['jabatan', 'Jabatan'],
               ['kota', 'Kota tanda tangan'], ['idPegawai', 'ID pegawai (header Excel CKP)'], ['wilayah', 'Wilayah'], ['unit', 'Unit kerja']]
              .map(([k, l]) => `<div><label>${l}</label><input value="${esc(peg[k])}" onchange="ckpSavePegawai('${k}', this.value)"></div>`).join('')}
        </div></details>`;

    html += `<details><summary>📚 Katalog IKI</summary>
        <p class="ckp-note">${cat.length} IKI dari <strong>${esc(kat.source || 'file')}</strong>, diimpor ${kat.importedAt ? new Date(kat.importedAt).toLocaleString('id-ID') : '-'}.
        Impor ulang (misalnya pohon kinerja tahun baru) akan mengganti katalog; isian yang sudah kamu ubah per IKI tetap disimpan.</p>
        <label class="btn btn-secondary btn-sm ckp-file-btn">📥 Impor ulang JSON
            <input type="file" accept=".json,application/json" hidden onchange="ckpImportFile(this)"></label></details>`;

    body.innerHTML = html;
    ckpFillSolusiThumbs();
}

function ckpCardHTML(e, muted) {
    const list = ckpTasksFor(e.id);
    const miss = list.filter(t => evPhotos(t).length === 0).length;
    const open = ckpOpenEditor === e.id;
    let html = `<div class="ckp-card ${muted ? 'muted' : ''}">
        <div class="ckp-card-head">
            <div class="ckp-card-title"><strong>${esc(e.short)}</strong>
                <small>${esc(e.tim)} · ${esc(e.kode_ik)} · ${esc(e.peran)}</small>
                <small>${esc(e.iki_anggota)}</small></div>
            <div class="ckp-stats">${list.length} kegiatan${miss ? ` · <span class="warn">${miss} tanpa foto</span>` : ''}</div>
            <div class="ckp-row">
                <button class="btn btn-primary btn-sm" onclick="ckpOpenReport('${e.id}')" ${list.length ? '' : 'disabled'}>🖨️ PDF</button>
                <button class="btn btn-secondary btn-sm" onclick="ckpExportWord('${e.id}')" ${list.length ? '' : 'disabled'}>📄 Word</button>
                <button class="btn btn-secondary btn-sm" onclick="ckpToggleEditor('${e.id}')">${open ? 'Tutup' : '✏️ Atur'}</button>
            </div>
        </div>`;
    if (open) {
        const h = ckpHeader(e);
        const n = ckpNote(ckpYear, ckpQ, e.id);
        html += `<div class="ckp-editor">
            <div class="ckp-note"><strong>Triwulan ${ROMAWI[ckpQ]} ${ckpYear}</strong> — isian khusus triwulan ini</div>
            <div class="ckp-grid">
                <div class="ckp-field"><label>Kendala</label><textarea onchange="ckpSaveNote(ckpYear, ckpQ, '${e.id}', 'kendala', this.value)">${esc(n.kendala || '')}</textarea></div>
                <div class="ckp-field"><label>Solusi</label><textarea onchange="ckpSaveNote(ckpYear, ckpQ, '${e.id}', 'solusi', this.value)">${esc(n.solusi || '')}</textarea></div>
                <div class="ckp-field"><label>Bukti dukung pelaksanaan solusi (foto JPG/PNG + keterangan opsional)</label>
                    <div class="ev-grid ckp-solusi-grid">${(n.buktiSolusiFoto || []).map(p => `
                        <div class="ev-thumb" data-solusi-thumb="${p.id}"><span>📷</span>${p.pending ? '<span class="ev-flag" title="Belum terunggah">⏳</span>' : ''}
                        <button type="button" class="ev-del" title="Hapus foto" onclick="ckpRemoveSolusiPhoto('${e.id}','${p.id}')">✕</button></div>`).join('')}</div>
                    <label class="btn btn-secondary btn-sm ckp-file-btn ckp-solusi-add">📁 Tambah foto
                        <input type="file" accept="image/jpeg,image/png" multiple hidden onchange="ckpAddSolusiPhotos('${e.id}', this)"></label>
                    <textarea placeholder="Keterangan (opsional)" onchange="ckpSaveNote(ckpYear, ckpQ, '${e.id}', 'buktiSolusi', this.value)">${esc(n.buktiSolusi || '')}</textarea></div>
                <div class="ckp-field"><label>Tanggal laporan (tanda tangan)</label><input type="date" value="${esc(n.tanggal || '')}" onchange="ckpSaveNote(ckpYear, ckpQ, '${e.id}', 'tanggal', this.value)"></div>
                <div class="ckp-field"><label>Link Data Dukung (untuk Excel rekap)</label><input placeholder="https://drive.google.com/…" value="${esc(n.link || '')}" onchange="ckpSaveNote(ckpYear, ckpQ, '${e.id}', 'link', this.value)"></div>
            </div>
            <div class="ckp-note ckp-note-gap"><strong>Header laporan</strong> — berlaku untuk semua triwulan. Kosongkan kolom untuk kembali ke isi dari pohon kinerja.</div>
            ${HEADER_FIELDS.map(([k, l]) => `<div class="ckp-field"><label>${l}</label>
                <textarea rows="1" onchange="ckpSaveOverride('${e.id}', '${k}', this.value)">${esc(h[k])}</textarea></div>`).join('')}
        </div>`;
    }
    return html + '</div>';
}

function ckpToggleEditor(id) {
    ckpOpenEditor = ckpOpenEditor === id ? null : id;
    ckpRenderHub();
}

// ---------- Foto bukti dukung pelaksanaan solusi (CKP) ----------
// Gambar kecil foto solusi di editor hub
function ckpFillSolusiThumbs() {
    document.querySelectorAll('[data-solusi-thumb]').forEach(box => {
        const id = box.dataset.solusiThumb;
        let photo = null;
        Object.values(ckpGet('catatan')).forEach(per => Object.values(per || {}).forEach(n =>
            (n.buktiSolusiFoto || []).forEach(p => { if (p.id === id) photo = p; })));
        if (photo) evFillThumbBox(`[data-solusi-thumb="${id}"]`, photo);
    });
}

async function ckpAddSolusiPhotos(entryId, input) {
    const files = Array.from(input.files || []).filter(f => /^image\/(jpeg|png)$/.test(f.type));
    input.value = '';
    if (!files.length) { evToast('Pilih file JPG atau PNG.'); return; }
    evToast(`Memproses ${files.length} foto…`);
    const list = (ckpNote(ckpYear, ckpQ, entryId).buktiSolusiFoto || []).slice();
    for (const file of files) {
        try {
            list.push(await evStorePhoto(file));
        } catch (err) { evToast('Foto gagal diproses: ' + err.message); }
    }
    ckpSaveNote(ckpYear, ckpQ, entryId, 'buktiSolusiFoto', list);
    ckpRenderHub();
    evProcessQueue();
}

function ckpRemoveSolusiPhoto(entryId, photoId) {
    const list = (ckpNote(ckpYear, ckpQ, entryId).buktiSolusiFoto || []);
    const photo = list.find(p => p.id === photoId);
    if (!photo) return;
    if (photo.path) evTrash([photo.path]);
    evForgetLocal(photoId);
    ckpSaveNote(ckpYear, ckpQ, entryId, 'buktiSolusiFoto', list.filter(p => p.id !== photoId));
    ckpRenderHub();
    evProcessQueue();
}

// Dipanggil dari antrean unggah foto
async function ckpUploadNotePhotos() {
    const jobs = [];
    Object.entries(ckpGet('catatan')).forEach(([per, ids]) => Object.entries(ids || {}).forEach(([entryId, n]) =>
        (n.buktiSolusiFoto || []).forEach(p => { if (p.pending) jobs.push({ per, entryId, photoId: p.id }); })));
    let changed = false;
    for (const job of jobs) {
        const blob = await photoDB.get('blobs', job.photoId).catch(() => null);
        if (!blob) continue;
        const path = `${currentUser.id}/ckp/${job.per}/${job.entryId}/${job.photoId}.jpg`;
        const { error } = await sb.storage.from(EVIDENCE_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true });
        if (error) { console.warn('Unggah foto solusi gagal:', error.message); break; }
        const all = JSON.parse(JSON.stringify(ckpGet('catatan')));
        const n = all[job.per] && all[job.per][job.entryId];
        const photo = n && (n.buktiSolusiFoto || []).find(p => p.id === job.photoId);
        if (photo) {
            photo.pending = false; photo.path = path;
            ckpSet('catatan', all);
            changed = true;
            await photoDB.del('blobs', job.photoId).catch(() => {});
        } else evTrash([path]);
    }
    if (changed) ckpRefreshHubIfIdle();
    return changed;
}
