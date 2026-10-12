/* ============================================================
   beranda.js — Beranda (sejak 3.7)

   Tempat memulai hari: sampul, kartu Bara (bara.js), dan widget.
   Menggantikan Dashboard lama (angka Total/Active/Completed/P1 dan
   daftar Undone Tasks; daftar itu kini ada di menu Belum selesai).

   Widget: ☀️ Hari ini (task bertanggal hari ini, bisa dicentang;
   berubah jadi rekap sore), 🕰️ Jam, 📅 Kalender kecil, 🔥 7 hari
   terakhir, 🎯 CKP triwulan, 💬 Kutipan, 🖼️ Album. Semuanya dihitung
   dari data di perangkat; tidak ada yang butuh internet.

   Penyimpanan — semuanya PER PERANGKAT, tidak tersinkron:
     localStorage barakarsa_beranda  pengaturan (lihat BR_BAWAAN)
     IndexedDB    barakarsa_beranda  store 'gambar': 'sampul' dan 'album:{id}' (Blob JPEG)
   Foto bukti dukung tetap di barakarsa_photos / bucket bukti-dukung; tidak bercampur.
   Sampul bawaan: sampul/sampul-{pagi,siang,sore,malam}.png (pixel-art 320×80,
   diperbesar tanpa dihaluskan), ikut cache service worker.

   Dipanggil dari file lain:
     brRender()          render() saat menu Beranda aktif (tampilan.js)
     brWidgetAktif(k)    bara.js (kartu tidak ikut bersorak bila kotak Hari ini aktif)
     openBerandaModal()  tombol di sampul, menu ⋯ → Tampilan
     setupBeranda()      main.js
   ============================================================ */

const BR_KEY = 'barakarsa_beranda';
const BR_ALBUM_MAKS = 12;
const BR_SAMPUL_SISI = 1920, BR_SAMPUL_MUTU = 0.8;    // sampul unggahan: ±150–300 KB
const BR_ALBUM_SISI = 1280, BR_ALBUM_MUTU = 0.75;     // foto album: ±100–180 KB
const BR_SAMPUL_BAWAAN = ['pagi', 'siang', 'sore', 'malam'];
const BR_WIDGET = [
    { k: 'hariini', nama: '☀️ Hari ini', ket: 'task bertanggal hari ini; jadi rekap saat jam rekap sore' },
    { k: 'jam', nama: '🕰️ Jam' },
    { k: 'kalender', nama: '📅 Kalender kecil' },
    { k: 'pekan', nama: '🔥 7 hari terakhir', ket: 'jumlah task yang dicentang' },
    { k: 'ckp', nama: '🎯 CKP triwulan' },
    { k: 'kutipan', nama: '💬 Kutipan', ket: 'berganti tiap hari' },
    { k: 'album', nama: '🖼️ Album', ket: `maks. ${BR_ALBUM_MAKS} foto` }
];
const BR_BAWAAN = {
    sampul: 'waktu',          // 'waktu' | 'pagi' | 'siang' | 'sore' | 'malam' | 'unggah'
    posisi: 50,               // posisi vertikal sampul unggahan (%)
    jam: 'analog',            // 'analog' | 'digital'
    detik: true,              // jarum/angka detik
    widget: { hariini: true, jam: true, kalender: true, pekan: true, ckp: true, kutipan: true, album: true },
    album: []                 // [{ id, dibuat }] urutan tampil; gambarnya di IndexedDB
};

let brAtur = brMuat();
const brUrl = new Map();      // kunci gambar → blob: URL
const brUkuran = new Map();   // kunci gambar → ukuran (byte)
let brKalBulan = null;        // { y, m } bulan yang dilihat di kalender kecil
let brKutipGeser = 0;         // ketuk kutipan → kalimat berikutnya (selama sesi)
let brBeresBuka = false;      // daftar "beres hari ini" di kotak Hari ini dibuka
let brFotoAktif = -1;         // foto album yang sedang diperbesar
let brHapusYakin = false;

// ---------- Pengaturan per perangkat ----------

function brMuat() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(BR_KEY)) || {}; } catch (e) { s = {}; }
    return {
        ...BR_BAWAAN, ...s,
        widget: { ...BR_BAWAAN.widget, ...(s.widget || {}) },
        album: Array.isArray(s.album) ? s.album.filter(a => a && a.id) : []
    };
}

function brSimpan() {
    try { localStorage.setItem(BR_KEY, JSON.stringify(brAtur)); } catch (e) { /* penuh/diblokir: abaikan */ }
}

function brWidgetAktif(k) {
    return !!(brAtur.widget && brAtur.widget[k]);
}

// ---------- IndexedDB: sampul & album (terpisah dari foto bukti dukung) ----------

const brDB = (() => {
    let dbp = null;
    function open() {
        if (dbp) return dbp;
        dbp = new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) { reject(new Error('IndexedDB tidak tersedia')); return; }
            const req = indexedDB.open('barakarsa_beranda', 1);
            req.onupgradeneeded = () => req.result.createObjectStore('gambar');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        return dbp;
    }
    async function run(mode, fn) {
        const db = await open();
        return new Promise((resolve, reject) => {
            const t = db.transaction('gambar', mode);
            const req = fn(t.objectStore('gambar'));
            t.oncomplete = () => resolve(req ? req.result : undefined);
            t.onerror = () => reject(t.error);
            t.onabort = () => reject(t.error);
        });
    }
    return {
        put: (key, val) => run('readwrite', s => s.put(val, key)),
        get: (key) => run('readonly', s => s.get(key)),
        del: (key) => run('readwrite', s => s.delete(key))
    };
})();

async function brMuatGambar(key) {
    if (brUrl.has(key)) return brUrl.get(key);
    try {
        const blob = await brDB.get(key);
        if (!blob) return null;
        const url = URL.createObjectURL(blob);
        brUrl.set(key, url);
        brUkuran.set(key, blob.size || 0);
        return url;
    } catch (e) { return null; }
}

function brLupakan(key) {
    const url = brUrl.get(key);
    if (url) URL.revokeObjectURL(url);
    brUrl.delete(key);
    brUkuran.delete(key);
}

async function brSimpanGambar(key, file, sisi, mutu) {
    const bmp = await evLoadBitmap(file);                 // bukti.js (pembaca & kompresi yang sama)
    const { blob } = await evDraw(bmp, sisi, mutu);
    if (bmp.close) bmp.close();
    await brDB.put(key, blob);
    brLupakan(key);
    return brMuatGambar(key);
}

// ---------- Sampul ----------

function brSampulKini(now) {
    if (brAtur.sampul === 'unggah' && brUrl.has('sampul')) return { url: brUrl.get('sampul'), foto: true };
    const w = BR_SAMPUL_BAWAAN.includes(brAtur.sampul) ? brAtur.sampul : baraWaktu(now || new Date());
    return { url: `./sampul/sampul-${w}.png`, foto: false, waktu: w };
}

function brGambarSampul(now) {
    const el = document.getElementById('brSampul');
    if (!el) return;
    const s = brSampulKini(now);
    // Sampul unggahan belum termuat dari IndexedDB: latar polos dulu (tanpa berkedip ke sampul bawaan)
    const menunggu = brAtur.sampul === 'unggah' && !s.foto && !brSampulGagal;
    el.classList.toggle('br-sampul-pixel', !s.foto && !menunggu);
    el.style.backgroundImage = menunggu ? 'none' : `url("${s.url}")`;
    el.style.backgroundPosition = s.foto ? `center ${Math.max(0, Math.min(100, +brAtur.posisi || 50))}%` : '';
    el.dataset.sampul = s.foto ? 'foto' : s.waktu;
}
let brSampulGagal = false;    // sampul unggahan hilang dari perangkat ini → pakai bawaan

// ---------- Gambar Beranda ----------

function brRender() {
    const now = new Date();
    brGambarSampul(now);
    const grid = document.getElementById('brGrid');
    if (!grid) return;
    const isi = [];
    if (brWidgetAktif('jam')) isi.push(brJamHTML(now));
    if (brWidgetAktif('hariini')) isi.push(brHariHTML(now));
    if (brWidgetAktif('kalender')) isi.push(brKalenderHTML(now));
    if (brWidgetAktif('pekan')) isi.push(brPekanHTML(now));
    if (brWidgetAktif('ckp')) isi.push(brCkpHTML(now));
    if (brWidgetAktif('album')) isi.push(brAlbumHTML(now));
    if (brWidgetAktif('kutipan')) isi.push(brKutipanHTML(now));
    grid.innerHTML = isi.join('') || `<div class="br-kosong">Semua widget dimatikan. <button type="button" class="br-link" onclick="openBerandaModal()">Atur Beranda</button></div>`;
    grid.dataset.jam = brWidgetAktif('jam') ? '1' : '';
    grid.dataset.hari = brWidgetAktif('hariini') ? '1' : '';
    brTikJam(true);
}

const brKepala = (judul, kanan) =>
    `<div class="br-kepala"><h3>${judul}</h3>${kanan || ''}</div>`;

// ---------- ☀️ Hari ini (pengganti Today; rekap sore) ----------

function brHariHTML(now) {
    const d = baraData(now);
    const rk = baraAturRekap();
    const m = baraMenit(now);
    const rekap = rk.hari.includes(now.getDay()) && m >= rk.jam && (d.beres.length > 0 || d.sisa.length > 0);
    const t = d.hariIni.length, x = d.beresToday;
    const judul = rekap ? '🌇 Rekap hari ini' : `☀️ Hari ini · ${fmtHariPendek(d.today)}`;
    const kanan = `<button type="button" class="br-link" onclick="switchView('all')">Belum selesai →</button>`;

    let atas;
    if (!t) {
        atas = `<div class="br-hari-atas"><div class="br-hari-teks"><div class="br-hari-besar">Hari ini lapang</div>
            <div class="br-hari-kecil">Belum ada task bertanggal hari ini.${d.besokN ? ` Besok ada ${d.besokN}.` : ''}</div></div></div>`;
    } else {
        const kecil = !d.sisa.length ? 'Tuntas. Sisanya urusan besok.'
            : rekap ? `Masih ${d.sisa.length} tersisa — lanjut atau geser ke besok.`
            : 'Hanya task bertanggal hari ini yang dihitung.';
        atas = `<div class="br-hari-atas">${brCincin(x, t)}<div class="br-hari-teks">
            <div class="br-hari-besar">${x} dari ${t} beres</div><div class="br-hari-kecil">${kecil}</div></div></div>`;
    }

    // Wadah daftar = #brHariList (dipakai bara.js untuk jejak hijau + ↶ Batal)
    let daftar = d.sisa.map(brBarisHTML).join('');
    if (t && !d.sisa.length) daftar += baraTuntasHTML(d);
    daftar += `<button type="button" class="add-task-inline br-tambah" onclick="openCepat('hari ini ')">＋ Tambah untuk hari ini</button>`;

    // Yang dicentang hari ini (termasuk task tanggal lain): terbuka saat rekap
    let beres = '';
    if (d.beres.length) {
        const buka = rekap || brBeresBuka || baraRekapBuka;
        const MAKS = 6;
        const isi = d.beres.slice(-MAKS).reverse().map(t2 =>
            `<li><span class="br-ok">✓</span><button type="button" class="br-beres-judul" onclick="editTask(${t2.id})">${esc(t2.title)}</button></li>`).join('')
            + (d.beres.length > MAKS ? `<li class="br-lagi">+ ${d.beres.length - MAKS} lainnya di menu Selesai</li>` : '');
        beres = `<div class="br-beres">
            <button type="button" class="br-beres-tombol" onclick="brToggleBeres()" aria-expanded="${buka}">✓ ${d.beres.length} dicentang hari ini ${buka ? '▴' : '▾'}</button>
            ${buka ? `<ul>${isi}</ul>` : ''}</div>`;
    }

    return `<section class="br-w br-w-hariini${rekap ? ' br-rekap' : ''}" id="brHari">
        ${brKepala(judul, kanan)}${atas}
        <div class="br-hari-daftar" id="brHariList">${daftar}</div>${beres}</section>`;
}

function brBarisHTML(t) {
    const p = t.project ? projects.find(x => x.id == t.project) : null;
    const prio = prioAktif(t.quadrant) ? `<span class="br-prio prio-${t.quadrant}">⚑ ${PRIORITY_LABEL[t.quadrant].short}</span>` : '';
    return `<div class="task-item br-baris" data-task-id="${t.id}">
        <input type="checkbox" class="task-checkbox" onchange="toggleStatus(${t.id})" aria-label="Centang ${esc(t.title)}">
        <span class="br-titik" style="background: ${p ? esc(p.color) : 'var(--no-project)'};" title="${p ? esc(p.name) : 'Tanpa project'}"></span>
        <button type="button" class="br-baris-judul" onclick="editTask(${t.id})">${esc(t.title)}</button>
        ${prio}${t.time ? `<span class="br-jam-kecil">${baraJamTitik(t.time)}</span>` : ''}
    </div>`;
}

function brToggleBeres() {
    brBeresBuka = !brBeresBuka;
    baraRekapBuka = false;
    render();
}

function brCincin(n, total) {
    const r = 24, k = 2 * Math.PI * r, f = total ? n / total : 0;
    return `<svg class="br-cincin" viewBox="0 0 58 58" role="img" aria-label="${n} dari ${total} beres">
        <circle cx="29" cy="29" r="${r}" class="br-cincin-dasar"/>
        ${f > 0 ? `<circle cx="29" cy="29" r="${r}" class="br-cincin-isi${f >= 1 ? ' penuh' : ''}" stroke-dasharray="${(k * f).toFixed(1)} ${k.toFixed(1)}" transform="rotate(-90 29 29)"/>` : ''}
        <text x="29" y="33" text-anchor="middle">${Math.round(f * 100)}%</text></svg>`;
}

// ---------- 🕰️ Jam ----------

function brZona(now) {
    const o = -now.getTimezoneOffset() / 60;
    return { 7: 'WIB', 8: 'WITA', 9: 'WIT' }[o] || `GMT${o >= 0 ? '+' : ''}${o}`;
}

function brJamHTML(now) {
    const tgl = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (brAtur.jam === 'digital') {
        return `<section class="br-w br-w-jam br-digital" id="brJam" aria-label="Jam">
            <div class="br-dg-besar"><span id="brJamHM"></span><span class="br-dg-detik" id="brJamS" ${brAtur.detik ? '' : 'hidden'}></span></div>
            <div class="br-zona">${brZona(now)}</div><div class="br-tgl">${esc(tgl)}</div></section>`;
    }
    let tanda = '';
    for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6, panjang = i % 3 === 0;
        const r1 = panjang ? 70 : 75, r2 = 83;
        tanda += `<line x1="${(100 + r1 * Math.sin(a)).toFixed(1)}" y1="${(100 - r1 * Math.cos(a)).toFixed(1)}" x2="${(100 + r2 * Math.sin(a)).toFixed(1)}" y2="${(100 - r2 * Math.cos(a)).toFixed(1)}" class="${panjang ? 'br-tanda-p' : 'br-tanda'}"/>`;
    }
    return `<section class="br-w br-w-jam" id="brJam" aria-label="Jam">
        <svg class="br-analog" viewBox="0 0 200 200" aria-hidden="true">
            <circle cx="100" cy="100" r="93" class="br-muka"/>${tanda}
            <line id="brJarumJ" x1="100" y1="100" x2="100" y2="55" class="br-jarum-j"/>
            <line id="brJarumM" x1="100" y1="108" x2="100" y2="30" class="br-jarum-m"/>
            ${brAtur.detik ? '<line id="brJarumS" x1="100" y1="114" x2="100" y2="26" class="br-jarum-s"/>' : ''}
            <circle cx="100" cy="100" r="4.5" class="br-poros"/>
        </svg>
        <div class="br-dg"><span id="brJamHM"></span></div><div class="br-zona">${brZona(now)}</div><div class="br-tgl">${esc(tgl)}</div></section>`;
}

let brJamMenitAkhir = -1;
function brTikJam(paksa) {
    if (currentView !== 'dashboard' || document.hidden || !brWidgetAktif('jam')) return;
    const now = new Date();
    const mnt = now.getHours() * 60 + now.getMinutes();
    if (!paksa && !brAtur.detik && mnt === brJamMenitAkhir) return;
    brJamMenitAkhir = mnt;
    const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
    const pad = n => String(n).padStart(2, '0');
    const hm = document.getElementById('brJamHM');
    if (hm) hm.textContent = `${pad(h)}.${pad(m)}`;
    const ds = document.getElementById('brJamS');
    if (ds) ds.textContent = pad(s);
    const putar = (id, deg) => { const el = document.getElementById(id); if (el) el.setAttribute('transform', `rotate(${deg.toFixed(2)} 100 100)`); };
    putar('brJarumJ', (h % 12 + m / 60) * 30);
    putar('brJarumM', (m + s / 60) * 6);
    putar('brJarumS', s * 6);
}

// ---------- 📅 Kalender kecil ----------

function brKalenderHTML(now) {
    if (!brKalBulan) brKalBulan = { y: now.getFullYear(), m: now.getMonth() };
    const { y, m } = brKalBulan;
    const today = todayISO();
    const awal = new Date(y, m, 1), jml = new Date(y, m + 1, 0).getDate();
    const pad = n => String(n).padStart(2, '0');
    const ada = {}, sisa = {};
    const mulaiBulan = `${y}-${pad(m + 1)}-01`, akhirBulan = `${y}-${pad(m + 1)}-${pad(jml)}`;
    tasks.forEach(t => {
        if (!t.date || t.status === 'cancelled') return;
        const a = t.date, b = t.dateEnd && t.dateEnd > t.date ? t.dateEnd : t.date;
        if (b < mulaiBulan || a > akhirBulan) return;
        for (let d = Math.max(1, a < mulaiBulan ? 1 : +a.slice(8)); d <= (b > akhirBulan ? jml : +b.slice(8)); d++) {
            ada[d] = true;
            if (t.status !== 'completed') sisa[d] = true;
        }
    });
    let sel = '';
    for (let i = 0; i < awal.getDay(); i++) sel += '<span></span>';
    for (let d = 1; d <= jml; d++) {
        const iso = `${y}-${pad(m + 1)}-${pad(d)}`;
        const kls = [iso === today ? 'kini' : '', ada[d] ? (sisa[d] ? 'ada' : 'ada beres') : ''].join(' ').trim();
        sel += `<button type="button" class="${kls}" onclick="brKalHari('${iso}')" aria-label="${esc(fmtTanggal(iso))}${ada[d] ? ', ada task' : ''}">${d}</button>`;
    }
    const nama = awal.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const pendek = `${LP_BULAN_PENDEK[m]} ${y}`;
    const kanan = `<span class="br-kal-nav">
        <button type="button" onclick="brKalGeser(-1)" aria-label="Bulan sebelumnya">‹</button>
        <button type="button" onclick="brKalGeser(1)" aria-label="Bulan berikutnya">›</button></span>`;
    return `<section class="br-w br-w-kalender">
        ${brKepala(`<button type="button" class="br-kal-judul" onclick="brKeKalender()" title="Buka menu Kalender">📅 <span class="br-panjang">${esc(nama.charAt(0).toUpperCase() + nama.slice(1))}</span><span class="br-pendek">${pendek}</span></button>`, kanan)}
        <div class="br-kal">${['M', 'S', 'S', 'R', 'K', 'J', 'S'].map(h => `<span class="br-kal-h">${h}</span>`).join('')}${sel}</div></section>`;
}

function brKalGeser(n) {
    let { y, m } = brKalBulan;
    m += n;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    brKalBulan = { y, m };
    render();
}

function brKalHari(iso) {
    calLastList = tasks.slice();          // tampilan.js: daftar task di tanggal itu + tombol tambah
    calShowDay(iso);
}

function brKeKalender() {
    calendarYear = brKalBulan.y;
    calendarMonth = brKalBulan.m;
    switchView('kalender');
}

// ---------- 🔥 7 hari terakhir ----------

function brPekanHTML(now) {
    const today = todayISO();
    const hari = [];
    for (let i = 6; i >= 0; i--) hari.push(lpGeser(today, -i));
    const n = {};
    hari.forEach(h => { n[h] = 0; });
    tasks.forEach(t => {
        if (t.status !== 'completed') return;
        const s = lpSelesai(t);                     // laporan.js: tanggal selesai (atau perkiraan)
        if (s && s.tgl in n) n[s.tgl]++;
    });
    const total = hari.reduce((a, h) => a + n[h], 0);
    const aktif = hari.filter(h => n[h] > 0).length;
    const maks = Math.max(1, ...hari.map(h => n[h]));
    const NAMA = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const batang = hari.map(h => `<div class="br-btg${h === today ? ' kini' : ''}" title="${esc(fmtTanggal(h))}: ${n[h]} selesai">
        <span class="br-btg-n">${n[h] || ''}</span><i style="height: ${n[h] ? Math.max(8, Math.round(n[h] / maks * 100)) : 0}%"></i><span class="br-btg-h">${NAMA[lpD(h).getDay()]}</span></div>`).join('');
    return `<section class="br-w br-w-pekan">
        ${brKepala('🔥 7 hari terakhir', `<button type="button" class="br-link" onclick="switchView('reporting')" aria-label="Buka Reporting"><span class="br-panjang">Reporting </span>→</button>`)}
        <div class="br-angka">${total}<small> task selesai</small></div>
        <div class="br-batang">${batang}</div>
        <div class="br-catatan">Aktif <b>${aktif} dari 7</b> hari</div></section>`;
}

// ---------- 🎯 CKP triwulan ----------

function brCkpHTML(now) {
    const today = todayISO();
    const q = Math.floor(now.getMonth() / 3) + 1;
    const { start, end } = quarterRange(now.getFullYear(), q);
    const per = tasks.filter(t => isCkpTask(t) && t.date && t.date >= start && t.date <= end && t.status !== 'cancelled');
    const cat = ckpCatalog();
    const sisaHari = Math.max(0, lpSelisih(today, end));
    const tanpaBukti = tasks.filter(evIsMissing).length;
    const tanpaIki = cat.length || ckpCatalogLain().length ? per.filter(t => !t.iki || !ckpEntry(t.iki)).length : 0;

    let isi;
    if (cat.length) {
        const ada = cat.filter(e => per.some(t => t.iki === e.id)).length;
        isi = `<div class="br-angka">${ada}<small> / ${cat.length} IKI ada kegiatan</small></div>
            <div class="br-jalur" role="progressbar" aria-valuemin="0" aria-valuemax="${cat.length}" aria-valuenow="${ada}"><i style="width: ${(ada / cat.length * 100).toFixed(1)}%"></i></div>`;
    } else {
        isi = `<div class="br-angka">${per.length}<small> kegiatan CKP triwulan ini</small></div>
            <div class="br-catatan">Impor pohon kinerja di CKP Triwulan untuk melihat progres per IKI.</div>`;
    }
    const chip = [];
    if (tanpaBukti) chip.push(`<button type="button" class="br-chip br-chip-warn" onclick="evShowMissing()">📷 ${tanpaBukti} belum ada bukti</button>`);
    if (tanpaIki) chip.push(`<button type="button" class="br-chip br-chip-warn" onclick="openCkpHub()">🎯 ${tanpaIki} belum ada IKI</button>`);
    return `<section class="br-w br-w-ckp">
        ${brKepala(`🎯 CKP <span class="br-panjang">Triwulan</span><span class="br-pendek">Tw</span> ${ROMAWI[q]}`, `<button type="button" class="br-link" onclick="openCkpHub()" aria-label="Buka CKP Triwulan"><span class="br-panjang">Buka </span>→</button>`)}
        ${isi}
        <div class="br-catatan"><b>${sisaHari} hari</b> lagi sampai ${esc(fmtPendek(end))}</div>
        ${chip.length ? `<div class="br-chips">${chip.join('')}</div>` : ''}</section>`;
}

// ---------- 💬 Kutipan (offline, berganti tiap hari) ----------

const BR_KUTIPAN = [
    ['Sedikit demi sedikit, lama-lama menjadi bukit.', 'Peribahasa'],
    ['Berakit-rakit ke hulu, berenang-renang ke tepian. Bersakit-sakit dahulu, bersenang-senang kemudian.', 'Peribahasa'],
    ['Di mana ada kemauan, di situ ada jalan.', 'Peribahasa'],
    ['Alah bisa karena biasa.', 'Peribahasa'],
    ['Rajin pangkal pandai.', 'Peribahasa'],
    ['Ringan sama dijinjing, berat sama dipikul.', 'Peribahasa'],
    ['Sambil menyelam minum air.', 'Peribahasa'],
    ['Tak ada rotan, akar pun jadi.', 'Peribahasa'],
    ['Satu task beres lebih berarti daripada sepuluh yang dipikirkan.', 'Bara'],
    ['Api yang dijaga kecil tetap menyala sampai pagi.', 'Bara'],
    ['Yang belum selesai hari ini masih punya besok. Yang sudah selesai, rayakan.', 'Bara'],
    ['Mulai dari yang paling kecil. Bara juga dulu cuma percikan.', 'Bara'],
    ['Tidak perlu cepat, yang penting tidak berhenti.', 'Bara'],
    ['Catat dulu, pikirkan nanti. Kepala jadi lebih lapang.', 'Bara'],
    ['Foto bukti dukung hari ini, CKP tenang di akhir triwulan.', 'Bara'],
    ['Istirahat juga bagian dari pekerjaan.', 'Bara'],
    ['Hari yang berat tetap selesai, satu centang demi satu centang.', 'Bara'],
    ['Data yang rapi lahir dari kebiasaan kecil yang diulang.', 'Bara'],
    ['Kalau ragu mulai dari mana, mulai dari yang lima menit.', 'Bara'],
    ['Bara kecil yang terus menyala lebih hangat dari api besar yang cepat padam.', 'Bara']
];

function brHariKe(now) {
    return Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(now.getFullYear(), 0, 0)) / 86400000);
}

function brKutipanHTML(now) {
    const n = BR_KUTIPAN.length;
    const [teks, dari] = BR_KUTIPAN[((brHariKe(now) + now.getFullYear() * 7 + brKutipGeser) % n + n) % n];
    const pose = baraWaktu(now) === 'malam' ? 'santai' : 'semangat';
    return `<section class="br-w br-w-kutipan">
        ${brKepala('💬 Kutipan hari ini', `<button type="button" class="br-link" onclick="brKutipLain()" title="Kutipan lain">↻</button>`)}
        <figure class="br-kutip">${baraImg(pose, 'br-kutip-bara')}
            <div><blockquote>“${esc(teks)}”</blockquote><figcaption>${esc(dari)}</figcaption></div></figure></section>`;
}

function brKutipLain() {
    brKutipGeser++;
    render();
}

// ---------- 🖼️ Album (per perangkat) ----------

function brAlbumHTML(now) {
    const ada = brAtur.album.filter(a => brUrl.has('album:' + a.id));
    const kanan = brAtur.album.length < BR_ALBUM_MAKS
        ? `<button type="button" class="br-link" onclick="document.getElementById('brAlbumInput').click()">+ Foto</button>` : '';
    if (!brAtur.album.length) {
        return `<section class="br-w br-w-album">${brKepala('🖼️ Album', '')}
            <button type="button" class="br-album-kosong" onclick="document.getElementById('brAlbumInput').click()">
                <span>＋ Tambah foto</span><small>Foto tim, kenangan, atau tempat favorit. Disimpan di perangkat ini saja.</small></button></section>`;
    }
    // Foto utama berganti tiap hari; sisanya menyusul (maks. 5 kotak)
    const mulai = ada.length ? brHariKe(now) % ada.length : 0;
    const urut = ada.slice(mulai).concat(ada.slice(0, mulai));
    const tampil = urut.slice(0, 5);
    const lebih = ada.length - tampil.length;
    const kotak = tampil.map((a, i) => {
        const idx = brAtur.album.indexOf(a);
        const plus = i === tampil.length - 1 && lebih > 0 ? `<span class="br-album-lebih">+${lebih}</span>` : '';
        return `<button type="button" class="br-album-foto" style="background-image: url('${brUrl.get('album:' + a.id)}')" onclick="brLihatFoto(${idx})" aria-label="Perbesar foto ${idx + 1}">${plus}</button>`;
    }).join('');
    return `<section class="br-w br-w-album">${brKepala('🖼️ Album', kanan)}
        <div class="br-album br-album-${Math.min(tampil.length, 5)}">${kotak || '<span class="br-catatan">Memuat foto…</span>'}</div></section>`;
}

async function brTambahAlbum(input) {
    const files = Array.from(input.files || []).filter(f => f.type && f.type.startsWith('image/'));
    input.value = '';
    if (!files.length) return;
    const ruang = BR_ALBUM_MAKS - brAtur.album.length;
    if (ruang <= 0) { evToast(`Album sudah penuh (${BR_ALBUM_MAKS} foto). Hapus satu dulu.`); return; }
    if (files.length > ruang) evToast(`Hanya ${ruang} foto pertama yang ditambahkan (maks. ${BR_ALBUM_MAKS}).`);
    let ok = 0;
    for (const f of files.slice(0, ruang)) {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        try {
            await brSimpanGambar('album:' + id, f, BR_ALBUM_SISI, BR_ALBUM_MUTU);
            brAtur.album.push({ id, dibuat: new Date().toISOString() });
            ok++;
        } catch (e) {
            evToast('Foto tidak bisa disimpan: ' + (e && e.message ? e.message : 'gagal'));
        }
    }
    brSimpan();
    if (ok) evToast(ok === 1 ? 'Foto ditambahkan ke album.' : `${ok} foto ditambahkan ke album.`);
    render();
    brRefreshAtur();
}

function brLihatFoto(i) {
    if (i < 0 || i >= brAtur.album.length) return brTutupFoto();
    brFotoAktif = i;
    brHapusYakin = false;
    brGambarLihat();
    document.getElementById('brLihat').hidden = false;
}

function brGambarLihat() {
    const el = document.getElementById('brLihat');
    const a = brAtur.album[brFotoAktif];
    if (!a) return;
    const n = brAtur.album.length;
    el.innerHTML = `<div class="br-lihat-isi" role="dialog" aria-modal="true" aria-label="Foto album ${brFotoAktif + 1} dari ${n}">
        <img src="${brUrl.get('album:' + a.id) || ''}" alt="Foto album ${brFotoAktif + 1}">
        <div class="br-lihat-bar">
            <button type="button" onclick="brLihatFoto(${(brFotoAktif - 1 + n) % n})" ${n < 2 ? 'disabled' : ''} aria-label="Sebelumnya">‹</button>
            <span>${brFotoAktif + 1} / ${n}</span>
            <button type="button" onclick="brLihatFoto(${(brFotoAktif + 1) % n})" ${n < 2 ? 'disabled' : ''} aria-label="Berikutnya">›</button>
            <button type="button" class="br-lihat-hapus${brHapusYakin ? ' yakin' : ''}" onclick="brHapusFoto()">${brHapusYakin ? 'Ketuk lagi untuk hapus' : '🗑️ Hapus'}</button>
            <button type="button" onclick="brTutupFoto()" aria-label="Tutup">✕</button>
        </div></div>`;
}

async function brHapusFoto() {
    if (!brHapusYakin) { brHapusYakin = true; brGambarLihat(); return; }
    const a = brAtur.album[brFotoAktif];
    if (!a) return;
    brAtur.album.splice(brFotoAktif, 1);
    brSimpan();
    brLupakan('album:' + a.id);
    try { await brDB.del('album:' + a.id); } catch (e) { /* abaikan */ }
    evToast('Foto dihapus dari album.');
    if (brAtur.album.length) brLihatFoto(Math.min(brFotoAktif, brAtur.album.length - 1));
    else brTutupFoto();
    render();
    brRefreshAtur();
}

function brTutupFoto() {
    brFotoAktif = -1;
    const el = document.getElementById('brLihat');
    el.hidden = true;
    el.innerHTML = '';
}

// ---------- 🎨 Atur Beranda ----------

function openBerandaModal() {
    brRenderAtur();
    document.getElementById('berandaModal').classList.add('active');
}

function closeBerandaModal() {
    document.getElementById('berandaModal').classList.remove('active');
}

function brRefreshAtur() {
    if (document.getElementById('berandaModal').classList.contains('active')) brRenderAtur();
}

function brRenderAtur() {
    const now = new Date();
    const w = baraWaktu(now);
    const pilih = (v, label, url, kelas) => `<button type="button" class="br-pilih-sampul ${kelas || ''}${brAtur.sampul === v ? ' aktif' : ''}"
        style="${url ? `background-image: url('${url}')` : ''}" onclick="brSetSampul('${v}')" aria-pressed="${brAtur.sampul === v}"><span>${label}</span></button>`;
    const unggah = brUrl.get('sampul');
    let sampul = `<div class="br-pilih-grid">
        ${pilih('waktu', 'Ikut waktu', `./sampul/sampul-${w}.png`, 'pixel')}
        ${BR_SAMPUL_BAWAAN.map(x => pilih(x, x.charAt(0).toUpperCase() + x.slice(1), `./sampul/sampul-${x}.png`, 'pixel')).join('')}
        ${unggah ? pilih('unggah', 'Foto saya', unggah, 'foto')
            : `<button type="button" class="br-pilih-sampul br-pilih-unggah" onclick="document.getElementById('brSampulInput').click()"><span>⬆ Unggah foto</span></button>`}
    </div>`;
    if (unggah) {
        sampul += `<div class="br-atur-baris">
            <label for="brPosisi">Posisi foto</label>
            <input type="range" id="brPosisi" min="0" max="100" value="${+brAtur.posisi || 50}" oninput="brSetPosisi(this.value)" ${brAtur.sampul === 'unggah' ? '' : 'disabled'}>
        </div>
        <div class="br-atur-aksi">
            <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('brSampulInput').click()">Ganti foto</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="brHapusSampul()">Hapus foto</button>
        </div>`;
    }
    const sakelar = (id, on, label, ket, aksi) => `<label class="br-sakelar" for="${id}">
        <span>${label}${ket ? `<small>${ket}</small>` : ''}</span>
        <input type="checkbox" id="${id}" ${on ? 'checked' : ''} onchange="${aksi}"><i aria-hidden="true"></i></label>`;
    const widget = BR_WIDGET.map(x => sakelar('brW-' + x.k, brWidgetAktif(x.k), x.nama, x.ket || '', `brSetWidget('${x.k}', this.checked)`)).join('');
    const kb = [...brUkuran.values()].reduce((a, b) => a + b, 0) / 1024;
    const ruang = kb < 1 ? 'belum ada gambar' : kb < 1024 ? `±${Math.round(kb)} KB` : `±${(kb / 1024).toFixed(1).replace('.', ',')} MB`;

    document.getElementById('berandaAturIsi').innerHTML = `
        <h3 class="br-atur-judul">Sampul</h3>${sampul}
        <h3 class="br-atur-judul">Jam</h3>
        <div class="br-seg" role="group" aria-label="Gaya jam">
            <button type="button" aria-pressed="${brAtur.jam === 'analog'}" onclick="brSetJam('analog')">🕰️ Analog</button>
            <button type="button" aria-pressed="${brAtur.jam === 'digital'}" onclick="brSetJam('digital')">🔢 Digital</button>
        </div>
        ${sakelar('brDetik', brAtur.detik, 'Tampilkan detik', 'matikan agar lebih tenang', 'brSetDetik(this.checked)')}
        <h3 class="br-atur-judul">Widget</h3>${widget}
        <h3 class="br-atur-judul">Album</h3>
        <div class="br-atur-aksi"><span class="br-catatan">${brAtur.album.length} dari ${BR_ALBUM_MAKS} foto</span>
            ${brAtur.album.length < BR_ALBUM_MAKS ? `<button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('brAlbumInput').click()">＋ Tambah foto</button>` : ''}</div>
        <p class="modal-note">Sampul unggahan dan album disimpan di perangkat ini saja (${ruang}), tidak tersinkron dan tidak ikut laporan CKP. HP dan laptop bisa memakai gambar berbeda.</p>`;
}

function brSetSampul(v) {
    brAtur.sampul = v;
    brSampulGagal = false;
    brSimpan();
    render();
    brRenderAtur();
}

function brSetPosisi(v) {
    brAtur.posisi = Math.max(0, Math.min(100, +v || 0));
    brSimpan();
    brGambarSampul();
}

async function brPilihSampul(input) {
    const f = input.files && input.files[0];
    input.value = '';
    if (!f || !f.type.startsWith('image/')) return;
    try {
        await brSimpanGambar('sampul', f, BR_SAMPUL_SISI, BR_SAMPUL_MUTU);
        brAtur.sampul = 'unggah';
        brAtur.posisi = 50;
        brSampulGagal = false;
        brSimpan();
        evToast('Sampul diganti.');
    } catch (e) {
        evToast('Gambar tidak bisa dipakai: ' + (e && e.message ? e.message : 'gagal'));
    }
    render();
    brRefreshAtur();
}

async function brHapusSampul() {
    brLupakan('sampul');
    try { await brDB.del('sampul'); } catch (e) { /* abaikan */ }
    if (brAtur.sampul === 'unggah') brAtur.sampul = 'waktu';
    brSimpan();
    render();
    brRenderAtur();
}

function brSetJam(v) { brAtur.jam = v; brSimpan(); render(); brRenderAtur(); }
function brSetDetik(on) { brAtur.detik = !!on; brSimpan(); render(); }
function brSetWidget(k, on) {
    brAtur.widget = { ...brAtur.widget, [k]: !!on };
    brSimpan();
    render();
}

// ---------- Mulai ----------

function setupBeranda() {
    // Gambar dari IndexedDB dimuat setelah tampilan pertama, supaya aplikasi tetap cepat terbuka
    window.addEventListener('load', async () => {
        const kunci = brAtur.album.map(a => 'album:' + a.id);
        if (brAtur.sampul === 'unggah' || brUrl.size === 0) kunci.unshift('sampul');
        await Promise.all(kunci.map(brMuatGambar));
        if (brAtur.sampul === 'unggah' && !brUrl.has('sampul')) brSampulGagal = true;   // data situs dihapus
        // Foto album yang hilang dari perangkat ini (mis. data situs dihapus) dibuang dari daftar
        const sebelum = brAtur.album.length;
        brAtur.album = brAtur.album.filter(a => brUrl.has('album:' + a.id));
        if (brAtur.album.length !== sebelum) brSimpan();
        if (typeof currentView !== 'undefined' && currentView === 'dashboard') render();
    });
    setInterval(() => brTikJam(false), 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) brTikJam(true); });
    document.addEventListener('keydown', (e) => {
        if (brFotoAktif < 0) return;
        if (e.key === 'Escape') brTutupFoto();
        else if (e.key === 'ArrowLeft') brLihatFoto((brFotoAktif - 1 + brAtur.album.length) % brAtur.album.length);
        else if (e.key === 'ArrowRight') brLihatFoto((brFotoAktif + 1) % brAtur.album.length);
    });
}
