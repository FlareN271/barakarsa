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
// Katalog berisi dua daftar:
//   entries — IKI penugasanmu (sama seperti sebelum 3.3, dibaca juga oleh versi lama)
//   lain    — IKI tim lain dari pohon kinerja yang sama (sejak 3.3; diabaikan versi lama)
function ckpCatalog() { return ckpGet('katalog').entries || []; }
function ckpCatalogLain() { return ckpGet('katalog').lain || []; }
function ckpAllEntries() { return ckpCatalog().concat(ckpCatalogLain()); }
let ckpIndexSrc = null, ckpIndex = new Map();
function ckpEntry(id) {
    if (!id) return null;
    const kat = ckpGet('katalog');
    if (kat !== ckpIndexSrc) {
        ckpIndexSrc = kat;
        ckpIndex = new Map(ckpAllEntries().map(e => [e.id, e]));
    }
    return ckpIndex.get(id) || null;
}
// IKI tim lain = bukan penugasanmu. Entri dari versi lama tidak punya `milik` dan selalu milik sendiri.
function ckpIsLain(e) { return !!e && e.milik === false; }
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
// Kata tahapan untuk membedakan IKI dalam satu kegiatan (mis. "Sensus Ekonomi · Persiapan")
const CKP_STAGE_NAME = /Persiapan|Pengumpulan|Pengolahan|Diseminasi|keprotokolan|penyusun laporan|kehumasan|Permintaan Dokumen|pemenuhan dokumen|Pembinaan|rekomendasi|penilaian|kondisi BMN|persediaan|perencanaan|Realisasi Anggaran/i;
const isAkronim = w => /[A-Z]{2,}/.test(w) && w === w.toUpperCase();
// Huruf kecil kecuali akronim (BMN, SAKIP, PST tetap kapital)
const kecilKecualiAkronim = s => String(s || '').split(/(\s+)/).map(w => isAkronim(w) ? w : w.toLowerCase()).join('');

// Satu baris rk_iki -> entri katalog per IKI Anggota. `p` = baris penugasan (null untuk IKI tim lain).
function ckpEntriesFromRow(r, p, tw) {
    const out = [];
    const rincian = r.rincian || [];
    const rkList = r.rk_anggota || [];
    const pairs = r.iki_anggota || [];
    const seen = new Set();
    pairs.forEach((pair, i) => {
        const iki = String(pair.iki || '').replace(/^\d+\.\s*/, '').trim();
        if (!iki || seen.has(norm(iki))) return;
        seen.add(norm(iki));
        const rkIdx = rkList.indexOf(pair.rk);
        const rinc = rincian.length === rkList.length && rkIdx >= 0 ? rincian[rkIdx]
                   : rincian.length === pairs.length ? rincian[i]
                   : rincian.join('; ');
        const twRow = p ? tw.find(t => norm(t.capaian) === norm(iki)) : null;
        const kegiatan = p ? p.kegiatan : r.kegiatan;
        const e = {
            id: hashId(norm(kegiatan) + '|' + norm(iki)),
            kode_ik: p ? (p.kode_ik || '') : ((String(r.ik || '').match(/^\s*([IVX]+(\.\d+)+)/) || [])[1] || ''),
            kelompok: p ? (p.kelompok || '') : (/^[–-]?$/.test(String(r.kelompok || '').trim()) ? '' : r.kelompok),
            tim: (p && p.tim) || r.tim || '',
            peran: p ? (p.peran || 'Anggota') : '',
            ketua_tim: r.ketua_tim || '',
            tujuan: stripCode(r.tujuan),
            sasaran: stripCode(r.sasaran),
            ik: stripCode(r.ik),
            rk_ketua: r.rk_ketua || '',
            iki_ketua: r.iki_ketua || '',
            kegiatan,
            rk_anggota: pair.rk || rkList[0] || '',
            iki_anggota: iki,
            rincian: rinc || '',
            rk_ringkas: twRow ? twRow.rencana_kinerja : '',
            dipakai_tw2: !!twRow
        };
        if (!p) e.milik = false;
        out.push(e);
    });
    return out;
}

function ckpBuildCatalog(pk) {
    const rkRows = pk.rk_iki || [];
    const tw = pk.ckp_tw2 || [];
    const entries = [];
    const used = new Set();
    // 1) Penugasanmu — cara dan id sama persis dengan versi lama, supaya IKI di task tetap terbaca
    (pk.penugasan_naufal || pk.penugasan || []).forEach(p => {
        const r = rkRows.find(x => norm(x.kegiatan) === norm(p.kegiatan) && String(x.ik || '').startsWith(p.kode_ik))
               || rkRows.find(x => norm(x.kegiatan) === norm(p.kegiatan));
        if (!r) return;
        used.add(r);
        entries.push(...ckpEntriesFromRow(r, p, tw));
    });
    // 2) Seluruh pohon kinerja: kegiatan lain yang bukan penugasanmu
    const ids = new Set(entries.map(e => e.id));
    const lain = [];
    rkRows.forEach(r => {
        if (used.has(r)) return;
        ckpEntriesFromRow(r, null, tw).forEach(e => { if (!ids.has(e.id)) { ids.add(e.id); lain.push(e); } });
    });
    // Nama pendek untuk kegiatan yang punya lebih dari satu IKI
    const all = entries.concat(lain);
    all.forEach(e => {
        const sibs = all.filter(x => x.kegiatan === e.kegiatan);
        if (sibs.length < 2) { e.short = e.kegiatan; return; }
        const stage = (e.iki_anggota.match(CKP_STAGE_NAME) || [])[0];
        e.short = e.kegiatan + ' · ' + (stage ? stage.charAt(0).toUpperCase() + kecilKecualiAkronim(stage.slice(1)) : (sibs.indexOf(e) + 1));
    });
    return { entries, lain };
}

function ckpImportFile(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const pk = JSON.parse(reader.result);
            const { entries, lain } = ckpBuildCatalog(pk);
            if (!entries.length && !lain.length) throw new Error('Tidak ada penugasan/IKI yang dikenali di file ini.');
            ckpSet('katalog', { entries, lain, source: file.name, importedAt: new Date().toISOString() });
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
            evToast(`Katalog terisi: ${entries.length} IKI penugasanmu + ${lain.length} IKI lain dari ${file.name}`);
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

// Disimpan di WeakMap, bukan di entri, supaya tidak ikut tertulis ke localStorage
const ckpKwCache = new WeakMap();
function ckpKeywords(e) {
    if (ckpKwCache.has(e)) return ckpKwCache.get(e);
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
    const kw = { own, syn };
    ckpKwCache.set(e, kw);
    return kw;
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
// Kolom IKI ada di HTML form task (#ikiGroup): tombol pemilih, panel pencarian,
// dan nilai terpilih di <input type="hidden" id="taskIki">.
let ckpShowLain = false;      // daftar "IKI lain" sedang dibuka (saat tidak mencari)
let ckpIkiActive = -1;        // sorotan keyboard di daftar IKI
let ckpDescItems = [];        // saran keterangan yang sedang tampil

function setupIkiField() {
    document.getElementById('taskProject').addEventListener('change', ckpToggleIkiGroup);
    let t = null;
    ['taskTitle', 'taskDesc'].forEach(id => document.getElementById(id).addEventListener('input', () => {
        clearTimeout(t); t = setTimeout(() => { ckpUpdateSuggestion(); ckpUpdateDescSuggest(); }, 250);
    }));
    const search = document.getElementById('ikiSearch');
    let ts = null;
    search.addEventListener('input', () => { clearTimeout(ts); ts = setTimeout(() => { ckpIkiActive = -1; ckpRenderIkiList(); }, 60); });
    search.addEventListener('keydown', ckpIkiSearchKey);
    document.getElementById('descSuggest').addEventListener('click', ev => {
        const b = ev.target.closest('[data-ds]');
        if (b) ckpApplyDesc(+b.dataset.ds);
    });
}

function ckpIkiValue() { return document.getElementById('taskIki').value; }

// Tombol pemilih: nama pendek + tim · kode IK
function ckpUpdateIkiPick() {
    const id = ckpIkiValue();
    const e = ckpEntry(id);
    let main, sub = '';
    if (e) { main = e.short; sub = `${e.tim} · ${e.kode_ik}`; }
    else if (id) main = '(IKI lama, tidak ada di katalog)';
    else if (!ckpAllEntries().length) main = '— impor pohon kinerja dulu (menu ⋯ → CKP Triwulan)';
    else main = '— belum dipilih —';
    const m = document.getElementById('ikiPickMain');
    m.textContent = main;
    m.classList.toggle('empty', !e);
    document.getElementById('ikiPickSub').textContent = sub;
}

function ckpPickerOpen() { return !document.getElementById('ikiPanel').hidden; }

function ckpTogglePicker(force) {
    const open = force === undefined ? !ckpPickerOpen() : !!force;
    const panel = document.getElementById('ikiPanel');
    const btn = document.getElementById('ikiPick');
    if (open === ckpPickerOpen()) { if (open) ckpRenderIkiList(); return; }
    panel.hidden = !open;
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!open) return;
    const search = document.getElementById('ikiSearch');
    search.value = '';
    ckpShowLain = false;
    ckpIkiActive = -1;
    ckpRenderIkiList();
    // Di HP keyboard tidak langsung dimunculkan; cukup pastikan panel terlihat
    if (window.matchMedia('(pointer: fine)').matches) search.focus();
    else panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// Tiga IKI yang paling akhir dipakai di task (berdasarkan waktu task terakhir diubah)
function ckpRecentIki(n) {
    const seen = new Set(), out = [];
    tasks.filter(t => t.iki).map(t => [t.updatedAt || t.createdAt || '', t.iki])
        .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
        .some(([, id]) => {
            if (seen.has(id)) return false;
            seen.add(id);
            const e = ckpEntry(id);
            if (e) out.push(e);
            return out.length >= n;
        });
    return out;
}

// ---------- Pencarian IKI ----------
// Setiap entri punya teks pencarian per bidang; disimpan di WeakMap (tidak ikut tersimpan ke localStorage)
const ckpSearchCache = new WeakMap();
const CKP_SEARCH_FIELDS = [
    ['short', 3], ['kegiatan', 3], ['tim', 2], ['kode_ik', 2],
    ['iki_anggota', 1], ['rincian', 1], ['rk_anggota', 1], ['ketua_tim', 1]
];
function ckpSearchText(e) {
    let s = ckpSearchCache.get(e);
    if (!s) {
        s = CKP_SEARCH_FIELDS.map(([k, w]) => ({ k, w, t: String(e[k] || '').toLowerCase() }));
        ckpSearchCache.set(e, s);
    }
    return s;
}
function ckpSearch(q) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const res = [];
    ckpAllEntries().forEach((e, i) => {
        const fields = ckpSearchText(e);
        let score = 0, snip = null;
        for (const w of words) {
            const hit = fields.filter(f => f.t.includes(w));
            if (!hit.length) return;
            score += Math.max(...hit.map(f => f.w));
            // Potongan teks ditampilkan bila kata hanya cocok di IKI/rincian/RK/ketua
            if (!snip && hit.every(f => f.w === 1)) snip = hit[0].k;
        }
        res.push({ e, score: score + (ckpIsLain(e) ? 0 : 0.5), snip, i });
    });
    return { words, res: res.sort((a, b) => b.score - a.score || a.i - b.i) };
}

// Teks dengan kata yang dicari disorot (<mark>); selalu lewat esc()
function ckpHighlight(text, words, maxLen) {
    let s = String(text || '');
    const low = s.toLowerCase();
    let start = 0;
    if (maxLen && s.length > maxLen) {
        const first = Math.min(...words.map(w => { const i = low.indexOf(w); return i < 0 ? Infinity : i; }));
        start = isFinite(first) ? Math.max(0, Math.min(first - 25, s.length - maxLen)) : 0;
    }
    const end = maxLen ? Math.min(s.length, start + maxLen) : s.length;
    const marks = new Array(end).fill(false);
    words.forEach(w => {
        if (!w) return;
        let i = low.indexOf(w, start);
        while (i >= 0 && i < end) { for (let k = i; k < Math.min(end, i + w.length); k++) marks[k] = true; i = low.indexOf(w, i + w.length); }
    });
    let out = start > 0 ? '…' : '', run = '', on = false;
    const flush = () => { out += on ? `<mark>${esc(run)}</mark>` : esc(run); run = ''; };
    for (let k = start; k < end; k++) { if (marks[k] !== on) { flush(); on = marks[k]; } run += s[k]; }
    flush();
    return out + (end < s.length ? '…' : '');
}

const CKP_SNIP_LABEL = { iki_anggota: 'IKI', rincian: 'Rincian', rk_anggota: 'RK', ketua_tim: 'Ketua tim' };

function ckpIkiOption(e, words, snip) {
    const cur = ckpIkiValue() === e.id;
    const lain = ckpIsLain(e);
    const hl = t => words ? ckpHighlight(t, words) : esc(t);
    let sub = `${hl(e.tim)} · ${hl(e.kode_ik)}`;
    if (snip) sub += `<span class="iki-opt-snip">${CKP_SNIP_LABEL[snip]}: ${ckpHighlight(e[snip], words, 90)}</span>`;
    return `<button type="button" class="iki-opt${cur ? ' sel' : ''}" role="option" aria-selected="${cur}" data-iki="${esc(e.id)}" onclick="ckpPickIki(this.dataset.iki)">
        <span class="iki-opt-t">${hl(e.short)}${lain ? '<span class="iki-tag">bukan penugasanmu</span>' : ''}</span>
        <span class="iki-opt-s">${sub}</span></button>`;
}

function ckpRenderIkiList() {
    const list = document.getElementById('ikiList');
    const q = document.getElementById('ikiSearch').value.trim();
    const mine = ckpCatalog(), lain = ckpCatalogLain();
    const sec = t => `<div class="iki-sec">${t}</div>`;
    let html = '';
    if (!mine.length && !lain.length) {
        list.innerHTML = '<p class="iki-empty">Katalog IKI masih kosong. Impor file pohon kinerja lewat menu ⋯ → CKP Triwulan.</p>';
        return;
    }
    if (ckpIkiValue()) html += `<button type="button" class="iki-opt iki-clear" data-iki="" onclick="ckpPickIki('')">✕ Kosongkan pilihan IKI</button>`;
    if (!q) {
        const recent = ckpRecentIki(3);
        if (recent.length) html += sec('🕘 Terakhir dipakai') + recent.map(e => ckpIkiOption(e)).join('');
        if (mine.length) html += sec(`🙋 Penugasanku (${mine.length})`) + mine.filter(e => !recent.includes(e)).map(e => ckpIkiOption(e)).join('');
        if (lain.length) {
            if (ckpShowLain) {
                html += sec(`📚 IKI lain di pohon kinerja (${lain.length})`) + lain.filter(e => !recent.includes(e)).map(e => ckpIkiOption(e)).join('')
                     + `<button type="button" class="iki-more" onclick="ckpToggleLain()">Sembunyikan IKI lain ▴</button>`;
            } else {
                html += `<button type="button" class="iki-more" onclick="ckpToggleLain()">📚 IKI lain di pohon kinerja (${lain.length}) ▸</button>`;
            }
        } else if (ckpGet('katalog').lain === undefined) {
            html += '<p class="iki-empty">Impor ulang file pohon kinerja (menu ⋯ → CKP Triwulan) untuk memuat IKI tim lain.</p>';
        }
    } else {
        const { words, res } = ckpSearch(q);
        const m = res.filter(r => !ckpIsLain(r.e)), l = res.filter(r => ckpIsLain(r.e));
        if (m.length) html += sec(`🙋 Penugasanku · ${m.length} hasil`) + m.map(r => ckpIkiOption(r.e, words, r.snip)).join('');
        if (l.length) html += sec(`📚 IKI lain · ${l.length} hasil`) + l.map(r => ckpIkiOption(r.e, words, r.snip)).join('');
        if (!res.length) html += `<p class="iki-empty">Tidak ada IKI yang cocok dengan “${esc(q)}”.</p>`;
    }
    list.innerHTML = html;
    ckpMarkActive();
}

function ckpToggleLain() {
    ckpShowLain = !ckpShowLain;
    ckpRenderIkiList();
}

// Keyboard di kotak cari: ↑/↓ pilih, Enter pakai, Esc tutup (Enter tidak boleh menyimpan form)
function ckpIkiSearchKey(ev) {
    const opts = [...document.querySelectorAll('#ikiList .iki-opt[data-iki]:not(.iki-clear)')];
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (!opts.length) return;
        ckpIkiActive = ev.key === 'ArrowDown' ? Math.min(opts.length - 1, ckpIkiActive + 1) : Math.max(0, ckpIkiActive - 1);
        ckpMarkActive();
    } else if (ev.key === 'Enter') {
        ev.preventDefault();
        const o = opts[ckpIkiActive >= 0 ? ckpIkiActive : 0];
        if (o && document.getElementById('ikiSearch').value.trim()) ckpPickIki(o.dataset.iki);
        else if (o && ckpIkiActive >= 0) ckpPickIki(o.dataset.iki);
    } else if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        ckpTogglePicker(false);
        document.getElementById('ikiPick').focus();
    }
}
function ckpMarkActive() {
    const opts = [...document.querySelectorAll('#ikiList .iki-opt[data-iki]:not(.iki-clear)')];
    opts.forEach((o, i) => o.classList.toggle('active', i === ckpIkiActive));
    if (opts[ckpIkiActive]) opts[ckpIkiActive].scrollIntoView({ block: 'nearest' });
}

function ckpPickIki(id) {
    document.getElementById('taskIki').value = id || '';
    ckpTogglePicker(false);
    ckpOnIkiChange();
}

function ckpToggleIkiGroup() {
    const g = document.getElementById('ikiGroup');
    const isCkp = isCkpTask({ project: document.getElementById('taskProject').value });
    g.style.display = isCkp ? '' : 'none';
    if (!isCkp) ckpTogglePicker(false);
    document.querySelectorAll('#taskModal .ckp-sub').forEach(el => { el.style.display = isCkp ? '' : 'none'; });
    ckpUpdateSuggestion();
    ckpUpdateDescSuggest();
}

function ckpOnIkiChange() {
    const e = ckpEntry(ckpIkiValue());
    ckpUpdateIkiPick();
    document.getElementById('ikiFull').textContent = e ? e.iki_anggota : '';
    document.getElementById('ikiLainNote').hidden = !ckpIsLain(e);
    ckpUpdateSuggestion();
    ckpUpdateDescSuggest();
}

// 💡 Saran IKI dari judul + description (hanya dari IKI penugasanmu)
function ckpUpdateSuggestion() {
    const box = document.getElementById('ikiSuggest');
    const isCkp = isCkpTask({ project: document.getElementById('taskProject').value });
    if (!isCkp || ckpIkiValue() || !ckpCatalog().length) { box.innerHTML = ''; return; }
    const text = document.getElementById('taskTitle').value + ' ' + document.getElementById('taskDesc').value;
    const e = ckpSuggest(text);
    box.innerHTML = e ? `<button type="button" data-iki="${esc(e.id)}" onclick="ckpPickIki(this.dataset.iki)">💡 Saran: ${esc(e.short)}</button>` : '';
}

// ---------- Saran keterangan (Description) ----------
// Sumber utama: description task sebelumnya dengan IKI yang sama. Yang judulnya mirip
// dengan judul sekarang didahulukan, lalu yang paling sering dipakai, lalu yang terbaru.
// Bila IKI ini belum pernah punya description, ditawarkan kalimat dasar dari judul + RK.
const ckpWords = s => new Set(String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3));
function ckpSimilar(a, b) {
    const A = ckpWords(a), B = ckpWords(b);
    if (!A.size || !B.size) return 0;
    let same = 0;
    A.forEach(w => { if (B.has(w)) same++; });
    return same / (A.size + B.size - same);
}
const ckpNormText = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

function ckpDescHistory(iki, title, exceptId) {
    const groups = new Map();
    tasks.forEach(t => {
        if (t.iki !== iki || t.id === exceptId) return;
        const d = String(t.description || '').trim();
        if (!d) return;
        const key = ckpNormText(d);
        const g = groups.get(key) || { text: d, count: 0, last: '', sim: 0 };
        const ts = t.updatedAt || t.createdAt || '';
        g.count++;
        if (ts >= g.last) { g.last = ts; g.text = d; }
        g.sim = Math.max(g.sim, ckpSimilar(title, t.title));
        groups.set(key, g);
    });
    return [...groups.values()].sort((a, b) =>
        Math.round(b.sim * 4) - Math.round(a.sim * 4) || b.count - a.count || (a.last < b.last ? 1 : a.last > b.last ? -1 : 0));
}

function ckpDescTemplate(e, title) {
    const t = String(title || '').trim().replace(/[.\s]+$/, '');
    const rk = String(e.rk_anggota || '').trim().replace(/[.\s]+$/, '');
    return t && rk ? `${t} untuk mendukung ${kecilKecualiAkronim(rk)}.` : '';
}

function ckpUpdateDescSuggest() {
    const box = document.getElementById('descSuggest');
    const isCkp = isCkpTask({ project: document.getElementById('taskProject').value });
    const e = ckpEntry(ckpIkiValue());
    ckpDescItems = [];
    if (!isCkp || !e) { box.innerHTML = ''; return; }
    const title = document.getElementById('taskTitle').value;
    const cur = ckpNormText(document.getElementById('taskDesc').value);
    const hist = ckpDescHistory(e.id, title, typeof editingTaskId !== 'undefined' ? editingTaskId : null);
    hist.filter(g => !cur.includes(ckpNormText(g.text))).slice(0, 3)
        .forEach(g => ckpDescItems.push({ icon: '🕘', text: g.text, note: g.count > 1 ? `${g.count}×` : '' }));
    // Kalimat dasar hanya sebagai pembuka saat Description masih kosong
    if (!hist.length && !cur) {
        const tpl = ckpDescTemplate(e, title);
        if (tpl && !cur.includes(ckpNormText(tpl))) ckpDescItems.push({ icon: '🧩', text: tpl, note: 'kalimat dasar' });
    }
    if (!ckpDescItems.length) { box.innerHTML = ''; return; }
    box.innerHTML = `<span class="desc-suggest-head">💡 Saran keterangan ${hist.length ? '— dari task sebelumnya dengan IKI ini' : '— dari judul + rencana kinerja (sunting seperlunya)'}</span>`
        + ckpDescItems.map((it, i) => `<button type="button" class="ds-chip" data-ds="${i}" title="${esc(it.text)}">
            <span class="ds-icon">${it.icon}</span><span class="ds-text">${esc(it.text)}</span>${it.note ? `<small>${esc(it.note)}</small>` : ''}</button>`).join('');
}

// Klik saran: Description kosong → diisi; sudah ada isinya → ditambah di baris baru
function ckpApplyDesc(i) {
    const it = ckpDescItems[i];
    if (!it) return;
    const ta = document.getElementById('taskDesc');
    const cur = ta.value.replace(/\s+$/, '');
    ta.value = cur ? cur + '\n' + it.text : it.text;
    ckpUpdateDescSuggest();
    ckpUpdateSuggestion();
}

function ckpLoadTaskForm(task) {
    document.getElementById('taskDateEnd').value = (task && task.dateEnd) || '';
    document.getElementById('taskIki').value = (task && task.iki) || '';
    ckpTogglePicker(false);
    ckpOnIkiChange();
    ckpToggleIkiGroup();
}

// Dipanggil dari saveTask: IKI dan "Sampai tanggal" (hanya bila setelah tanggal mulai)
function ckpApplyToTask(task) {
    task.iki = ckpIkiValue() || '';
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
    const lain = ckpCatalogLain();
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

    if (!cat.length && !lain.length) {
        html += `<div class="ckp-card ckp-start">
            <strong>Mulai dengan mengimpor pohon kinerja</strong>
            <p class="ckp-note">Pilih file <code>pohon_kinerja_*.json</code>. Barakarsa akan membuat daftar IKI dari seluruh pohon kinerja — penugasanmu ditandai — lengkap dengan tim, ketua tim, sasaran, dan indikatornya.</p>
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

    // Daftar IKI: penugasanmu, ditambah IKI tim lain yang punya kegiatan di triwulan ini
    const withTasks = cat.filter(e => ckpTasksFor(e.id).length).concat(lain.filter(e => ckpTasksFor(e.id).length));
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
        <p class="ckp-note">${cat.length} IKI penugasanmu${lain.length ? ` + ${lain.length} IKI tim lain` : ''} dari <strong>${esc(kat.source || 'file')}</strong>, diimpor ${kat.importedAt ? new Date(kat.importedAt).toLocaleString('id-ID') : '-'}.
        ${kat.lain === undefined ? 'Katalog ini dibuat versi lama dan baru berisi penugasanmu; impor ulang file yang sama untuk memuat IKI tim lain. ' : ''}
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
                <small>${esc(e.tim)} · ${esc(e.kode_ik)} · ${ckpIsLain(e) ? '<span class="iki-tag">bukan penugasanmu</span>' : esc(e.peran)}</small>
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
