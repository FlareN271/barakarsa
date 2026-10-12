/* ============================================================
   bara.js — Persona Bara (sejak 3.6)

   Bara menyapa sesuai waktu, ikut senang saat task selesai,
   merekap sore, dan mengajak memilah Inbox. Semua kalimat
   disusun dari data di perangkat (tanpa AI, jalan offline),
   diambil dari kumpulan variasi supaya tidak terasa berulang.

   Tempat tampil (wadah ada di index.html; sejak 3.7 Today & Inbox dilebur):
     #baraDash   kartu Bara di Beranda (+ chip Belum dipilah)
     #brHariList kotak "Hari ini" di Beranda (beranda.js): Bara bersorak bila hari ini tuntas
     #baraInbox  ajakan memilah di Belum selesai (≥ BARA_INBOX_MIN task Belum dipilah)
     jejak       baris hijau di tempat task yang baru dicentang (+ ↶ Batal)

   Dipanggil dari file lain:
     baraRender()            akhir render() (tampilan.js)
     baraCatatPosisi(id)     sebelum status task berubah (toggleStatus, saveTask)
     baraSetelahUbah(...)    sesudah status task berubah
     baraBukaRekap()         ?rekap=1 dari notifikasi rekap sore (pwa.js)
     baraTuntasHTML(d)       Bara bersorak di kotak Hari ini (beranda.js)

   Tidak ada field task atau tabel baru. Satu kunci per perangkat:
   barakarsa_bara = { akhir: [3 kalimat terakhir], inboxTutup: tanggal, tuntas: tanggal,
                      profil: { data: { nama }, updatedAt } }.
   Nama panggilan (3.6.1): ⋯ → 👤 Nama panggilan. Kosong = sapaan netral ("Selamat pagi ☀️").
   Tersinkron lewat barakarsa_settings baris id 'bara' (perangkat lama mengabaikan baris ini).
   Kalimat memakai {nama}; baraSapa() mengisinya atau membuangnya bila nama kosong.
   Jam & hari rekap sore dibaca dari pengaturan pengingat (pgAtur, pengingat.js).
   ============================================================ */

const BARA_KEY = 'barakarsa_bara';
const BARA_NAMA_MAKS = 20;           // panjang nama panggilan
const BARA_INBOX_MIN = 5;            // dorongan memilah (Belum dipilah) mulai dari jumlah ini
const BARA_JEJAK_MS = 5000;          // lama baris jejak tampil
const BARA_REKAP_KALIMAT = 150;      // menit kalimat rekap tampil sejak jam rekap
const BARA_POSE = ['pagi', 'siap', 'semangat', 'rayakan', 'berpikir', 'waktu', 'ups', 'santai'];

let baraStore = baraMuat();
let baraPilihan = {};                // kunci situasi → nomor variasi (tetap selama sesi)
let baraJejak = null;                // { id, judul, kalimat, pose, view, nextId, statusLama, sampai, baru, batal }
let baraJejakTimer = null;
let baraLoncat = false;              // Bara di kartu melompat sekali pada gambar berikutnya
let baraSorak = false;               // hari ini baru saja tuntas → animasi sorak sekali
let baraRekapBuka = false;           // notifikasi rekap diketuk → kotak Hari ini menampilkan semua yang beres
let baraSelesaiBaru = [];            // waktu centang terakhir (untuk "3 beres sekaligus")
let baraTandaWaktu = '';             // berubah → kartu digambar ulang (lihat baraJagaWaktu)

// ---------- Penyimpanan per perangkat ----------

function baraMuat() {
    try { return JSON.parse(localStorage.getItem(BARA_KEY)) || {}; } catch (e) { return {}; }
}
function baraSimpan() {
    try { localStorage.setItem(BARA_KEY, JSON.stringify(baraStore)); } catch (e) { /* penuh/diblokir: abaikan */ }
}

// ---------- Nama panggilan (3.6.1) ----------

function baraNama() {
    const p = baraStore.profil;
    return p && p.data && typeof p.data.nama === 'string' ? p.data.nama.trim() : '';
}

// Isi {nama}. Nama kosong: "Selamat pagi, {nama} ☀️" → "Selamat pagi ☀️", "Pagi, {nama}!" → "Pagi!"
function baraSapa(teks, html) {
    const nama = baraNama();
    if (!nama) return String(teks).replace(/,?\s*\{nama\}/g, '');
    return String(teks).replace(/\{nama\}/g, html ? esc(nama) : nama);
}

function baraRapikanNama(s) {
    return String(s || '').replace(/\s+/g, ' ').trim().slice(0, BARA_NAMA_MAKS);
}

function openNamaModal() {
    const input = document.getElementById('baraNamaInput');
    input.value = baraNama();
    baraPratinjauNama();
    document.getElementById('namaModal').classList.add('active');
    if (window.innerWidth > 768) setTimeout(() => input.focus(), 50);
}

function closeNamaModal() {
    document.getElementById('namaModal').classList.remove('active');
}

function baraPratinjauNama() {
    const nama = baraRapikanNama(document.getElementById('baraNamaInput').value);
    document.getElementById('baraNamaContoh').textContent = nama ? `"Selamat pagi, ${nama} ☀️"` : '"Selamat pagi ☀️" (tanpa nama)';
}

function simpanNama(e, kosongkan) {
    if (e) e.preventDefault();
    const nama = kosongkan ? '' : baraRapikanNama(document.getElementById('baraNamaInput').value);
    baraStore.profil = { data: { nama }, updatedAt: new Date().toISOString() };
    baraSimpan();
    closeNamaModal();
    render();
    baraSyncProfil();
    evToast(nama ? `Bara akan memanggilmu ${nama}.` : 'Nama dikosongkan. Bara menyapa tanpa nama.');
}

// Sinkron nama lewat barakarsa_settings (baris id 'bara'); updated_at terbaru menang.
// Dipanggil dari syncNow() (sinkron.js).
async function baraSyncProfil() {
    if (!sb || !currentUser || !navigator.onLine || (typeof ckpSettingsUnavailable !== 'undefined' && ckpSettingsUnavailable)) return;
    try {
        const { data: rows, error } = await sb.from(CKP_SETTINGS_TABLE).select('id,data,updated_at').eq('id', 'bara');
        if (error) { console.warn('Sinkron nama Bara gagal:', error.message); return; }
        const r = rows && rows[0];
        const l = baraStore.profil;
        const lt = l ? Date.parse(l.updatedAt) : 0;
        const rt = r ? Date.parse(r.updated_at) : 0;
        if (r && rt > lt) {
            baraStore.profil = { data: { nama: baraRapikanNama(r.data && r.data.nama) }, updatedAt: r.updated_at };
            baraSimpan();
            render();
        } else if (l && lt > rt) {
            const { error: e2 } = await sb.from(CKP_SETTINGS_TABLE)
                .upsert({ user_id: currentUser.id, id: 'bara', data: l.data, updated_at: l.updatedAt }, { onConflict: 'user_id,id' });
            if (e2) console.warn('Simpan nama Bara gagal:', e2.message);
        }
    } catch (err) { console.warn('Sinkron nama Bara error:', err); }
}

function baraGerakBoleh() {
    try { return !matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return true; }
}

const baraImg = (pose, kelas) =>
    `<img class="${kelas || ''}" src="./maskot/bara-${BARA_POSE.includes(pose) ? pose : 'siap'}.webp" alt="" decoding="async" draggable="false">`;

// ---------- Waktu ----------

const baraMenit = d => d.getHours() * 60 + d.getMinutes();
const baraJamKeMenit = s => { const m = /^(\d{1,2}):(\d{2})/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : null; };
const baraJamTitik = s => String(s || '').slice(0, 5).replace(':', '.');

// pagi 04.00–10.59, siang 11.00–14.59, sore 15.00–18.29, malam 18.30–03.59
function baraWaktu(d) {
    const m = baraMenit(d);
    if (m >= 240 && m < 660) return 'pagi';
    if (m >= 660 && m < 900) return 'siang';
    if (m >= 900 && m < 1110) return 'sore';
    return 'malam';
}

// Jam & hari rekap sore: mengikuti pengaturan 🔔 (tersinkron), bawaan Sen–Jum 15.55
function baraAturRekap() {
    const a = typeof pgAtur === 'function' ? pgAtur() : {};
    return {
        jam: baraJamKeMenit(a.sore_jam) ?? baraJamKeMenit('15:55'),
        hari: Array.isArray(a.sore_hari) && a.sore_hari.length ? a.sore_hari : [1, 2, 3, 4, 5]
    };
}

// ---------- Data hari ini ----------

function baraData(now) {
    const today = todayISO();
    const nowJam = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const hariIni = tasks.filter(t => t.date === today && t.status !== 'cancelled');
    const sisa = hariIni.filter(t => t.status !== 'completed').sort(baraUrutJam);
    const beresToday = hariIni.length - sisa.length;
    // "Beres hari ini" = dicentang hari ini, termasuk task lama yang tertunda
    const beres = tasks.filter(t => t.status === 'completed' && t.completedAt && lpIsoLokal(t.completedAt) === today)
        .sort((a, b) => String(a.completedAt).localeCompare(String(b.completedAt)));
    const tenggat = t => (t.dateEnd && t.dateEnd > t.date ? t.dateEnd : t.date);
    const lewat = tasks.filter(t => t.date && t.status !== 'completed' && t.status !== 'cancelled' && tenggat(t) < today).length;
    const besok = lpGeser(today, 1);
    const besokN = tasks.filter(t => t.date === besok && t.status !== 'completed' && t.status !== 'cancelled').length;
    const inbox = tasks.filter(t => t.isInbox && t.status !== 'completed').length;
    const berikut = sisa.find(t => t.time && t.time.slice(0, 5) >= nowJam) || null;
    return { today, hariIni, sisa, beresToday, beres, lewat, besokN, inbox, berikut };
}

function baraUrutJam(a, b) {
    const ja = a.time || '', jb = b.time || '';
    if (ja && jb && ja !== jb) return ja < jb ? -1 : 1;
    if (ja && !jb) return -1;
    if (!ja && jb) return 1;
    return (a.order ?? 0) - (b.order ?? 0);
}

// ---------- Kalimat ----------

// Pilih satu variasi yang tetap selama sesi untuk situasi yang sama
// (supaya kalimat tidak berganti setiap kali layar digambar ulang)
function baraPilih(kunci, daftar) {
    if (!(kunci in baraPilihan)) baraPilihan[kunci] = Math.floor(Math.random() * daftar.length);
    return daftar[baraPilihan[kunci] % daftar.length];
}

const baraIsi = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => (v[k] ?? m));

const BARA_SALAM = {
    pagi: [`Selamat pagi, {nama} ☀️`, `Pagi, {nama}!`, `Selamat pagi, {nama}`],
    siang: [`Selamat siang, {nama}`, `Siang, {nama}!`],
    sore: [`Selamat sore, {nama} 🌇`, `Sore, {nama}!`],
    malam: [`Selamat malam, {nama} 🌙`, `Malam, {nama}.`]
};
const BARA_TUNTAS_SALAM = ['Semua task hari ini beres! 🎉', `Bersih, {nama}! 🎉`, 'Hari ini tuntas! 🎉'];
const BARA_TUNTAS_SUB = {
    siang: ['{t} dari {t} tuntas. Mantap!', 'Semua {t} task hari ini sudah dicentang. Bara bangga 🔥', 'Hari ini bersih. Sisa hari bisa buat yang lain.'],
    malam: ['Hari ini {t} beres semua. Istirahat yang enak ya.', 'Tuntas semua. Waktunya rehat 🔥']
};
// Ketuk maskot: kalimat tambahan di luar situasi
const BARA_KETUK = [
    `Semangat, {nama} 🔥`, 'Satu-satu, pasti beres.', `Jangan lupa minum air, {nama}.`,
    'Bara di sini, nemenin.', 'Tarik napas dulu. Lanjut pelan-pelan.', 'Hehe, geli 😆'
];

// Keadaan kartu: pose, baris salam, baris keadaan (HTML), rekap tersedia?
function baraKeadaan(now, view) {
    const d = baraData(now);
    const w = baraWaktu(now);
    const m = baraMenit(now);
    const rk = baraAturRekap();
    const hariRekap = rk.hari.includes(now.getDay());
    const rekapAda = hariRekap && m >= rk.jam && (d.beres.length > 0 || d.sisa.length > 0);
    const rekapKalimat = rekapAda && m < rk.jam + BARA_REKAP_KALIMAT;
    const t = d.hariIni.length, s = d.sisa.length, x = d.beresToday;
    const jamNext = d.berikut ? baraJamTitik(d.berikut.time) : '';
    const v = { t, s, x, b: d.beres.length, l: d.lewat, n: d.besokN, j: jamNext };
    const kunciMalam = w === 'malam' ? 'malam' : 'siang';

    let pose, salam, sub, kunci;
    if (t > 0 && s === 0) {
        kunci = 'tuntas-' + kunciMalam;
        pose = 'rayakan';
        if (view === 'today' || (view === 'dashboard' && brWidgetAktif('hariini'))) {
            // Kotak Hari ini (3.7, dulu Today) sudah berisi Bara bersorak; kartu cukup menyapa
            salam = baraPilih('salam-' + w, BARA_SALAM[w]);
            sub = baraIsi('<b>{t} dari {t}</b> beres — semua sudah dicentang.', v);
        } else {
            salam = baraPilih('tuntas-salam', BARA_TUNTAS_SALAM);
            sub = baraIsi(baraPilih(kunci, BARA_TUNTAS_SUB[kunciMalam]), v);
        }
    } else if (rekapKalimat) {
        kunci = 'rekap';
        salam = baraPilih('salam-sore', BARA_SALAM.sore);
        if (d.beres.length && s) { pose = 'waktu'; sub = baraIsi('Rekap sore: <b>{b} beres</b> ✓ · <b>{s} tersisa</b>', v); }
        else if (d.beres.length) { pose = 'semangat'; sub = baraIsi('Rekap sore: <b>{b} beres</b>, tidak ada yang tersisa. Mantap!', v); }
        else { pose = 'waktu'; sub = baraIsi('Rekap sore: <b>{s} task</b> hari ini belum dicentang. Masih sempat satu, atau geser ke besok?', v); }
    } else if (t === 0) {
        kunci = 'kosong-' + w;
        pose = w === 'malam' ? 'santai' : 'berpikir';
        salam = baraPilih('salam-' + w, BARA_SALAM[w]);
        if (w === 'malam') sub = d.besokN ? baraIsi('Hari ini lapang. Besok ada <b>{n} task</b>.', v) : 'Hari ini lapang. Istirahat dulu.';
        else if (d.lewat) sub = baraIsi('Hari ini masih kosong. Ada <b>{l} task</b> lewat tanggal — mau dijadwalkan ulang?', v);
        else if (d.inbox) sub = 'Hari ini masih kosong. Mau ambil dari yang belum dipilah?';
        else sub = baraPilih(kunci, ['Hari ini masih lapang.', 'Belum ada task untuk hari ini.']);
    } else if (w === 'malam') {
        kunci = 'malam-' + (x ? 'ada' : 'nol');
        pose = 'santai';
        salam = baraPilih('salam-malam', BARA_SALAM.malam);
        sub = baraIsi(baraPilih(kunci, x
            ? ['Hari ini {x} beres. {s} sisanya bisa lanjut besok — istirahat dulu.', '{x} beres hari ini. Sisanya besok juga tidak apa-apa.']
            : ['{s} task hari ini belum tersentuh. Besok lagi juga tidak apa-apa.', 'Lembur, {nama}? Jangan lupa istirahat.']), v);
    } else if (w === 'pagi') {
        kunci = 'pagi-' + (x ? 'ada' : 'nol');
        pose = 'pagi';
        salam = baraPilih('salam-pagi', BARA_SALAM.pagi);
        const next = d.berikut ? ` — ${x ? 'berikutnya' : 'pertama'} jam ${jamNext}<span class="bara-judul">: ${esc(d.berikut.title)}</span>` : '';
        sub = baraIsi(baraPilih(kunci, x
            ? ['<b>{s} task</b> lagi hari ini, {x} sudah beres', 'Sudah {x} beres, tinggal <b>{s}</b>']
            : ['<b>{t} task</b> hari ini', 'Hari ini ada <b>{t} task</b>']), v) + next + '.';
    } else {
        // siang & sore
        kunci = w + '-' + (s === 1 ? 'satu' : x ? 'ada' : 'nol');
        pose = x ? 'semangat' : 'siap';
        salam = baraPilih('salam-' + w, BARA_SALAM[w]);
        if (s === 1) sub = `Tinggal satu lagi: <b>${esc(d.sisa[0].title)}</b>.`;
        else if (x) sub = baraIsi(baraPilih(kunci, ['<b>{x} dari {t}</b> beres. Sisa {s}, pelan-pelan aja.', 'Sudah {x} beres, tinggal {s} lagi.', '<b>{x} dari {t}</b> beres. Gas terus!']), v);
        else sub = baraIsi(baraPilih(kunci, ['Belum ada yang dicentang — mulai dari yang kecil dulu?', '<b>{t} task</b> menunggu hari ini' + (jamNext ? ', berikutnya jam {j}' : '') + '.']), v);
    }
    // Hasil ketukan maskot menggantikan baris keadaan sampai situasinya berubah
    const k = baraPilihan.__ketuk;
    if (k && k.kunci === kunci) sub = esc(baraSapa(k.teks));
    return { pose, salam, sub, kunci, rekapAda, d };
}

// ---------- Kartu Bara ----------

function baraKartuHTML(view, now) {
    const k = baraKeadaan(now, view);
    let chip = '';
    if (view === 'dashboard' && k.d.inbox >= BARA_INBOX_MIN && baraStore.inboxTutup !== k.d.today) {
        chip = `<span class="bara-chip"><button type="button" class="bara-chip-buka" onclick="baraKeInbox()">📥 ${k.d.inbox} belum dipilah →</button>` +
            `<button type="button" class="bara-chip-tutup" onclick="baraTutupInbox()" title="Sembunyikan sampai besok" aria-label="Sembunyikan sampai besok">✕</button></span>`;
    }
    // Daftar rekap (≤3.6 di Today) sejak 3.7 ada di kotak Hari ini Beranda; kartu cukup kalimatnya
    const baris = chip ? `<div class="bara-aksi">${chip}</div>` : '';
    const loncat = baraLoncat && baraGerakBoleh() ? ' bara-loncat' : '';
    return `<div class="bara-kartu">
        <button type="button" class="bara-ava${loncat}" onclick="baraKetuk()" title="Ketuk Bara" aria-label="Bara — ketuk untuk kalimat lain">${baraImg(k.pose)}</button>
        <div class="bara-teks" aria-live="polite">
            <div class="bara-salam">${esc(baraSapa(k.salam))}</div>
            <div class="bara-sub">${baraSapa(k.sub, true)}</div>
            ${baris}
        </div>
    </div>`;
}

// Bara bersorak saat semua task hari ini beres (3.7: di kotak Hari ini Beranda)
function baraTuntasHTML(d) {
    const akhir = d.beres.length ? new Date(d.beres[d.beres.length - 1].completedAt) : null;
    const jam = akhir ? `${String(akhir.getHours()).padStart(2, '0')}.${String(akhir.getMinutes()).padStart(2, '0')}` : '';
    const malam = baraWaktu(new Date()) === 'malam';
    const t1 = baraPilih('tuntas-t1', [`Bersih, {nama}!`, 'Hari ini tuntas!', 'Semua beres!']);
    const t2 = malam ? 'Semua task hari ini tuntas. Istirahat yang enak ya.'
        : baraPilih('tuntas-t2', ['Semua task hari ini tuntas. Bara bangga 🔥', 'Tidak ada yang tersisa hari ini. Mantap!']);
    const sorak = baraSorak && baraGerakBoleh() ? ' bara-sorak' : '';
    return `<div class="bara-tuntas${sorak}">
        ${baraImg('rayakan')}
        <div class="bara-t1">${baraSapa(t1, true)}</div>
        <div class="bara-t2">${baraSapa(t2, true)}</div>
        <div class="bara-stat"><span>✓ ${d.beresToday} beres</span>${jam ? `<span>terakhir ${jam}</span>` : ''}</div>
    </div>`;
}

// ---------- Gambar (dipanggil di akhir render()) ----------

function baraRender() {
    const now = new Date();
    baraTandaWaktu = baraTanda(now);
    const dash = document.getElementById('baraDash');
    const inbox = document.getElementById('baraInbox');
    if (!dash || !inbox) return;

    // Beranda: kartu selalu tampil (sejak 3.7 project dilihat di Belum selesai)
    dash.innerHTML = currentView === 'dashboard' ? baraKartuHTML('dashboard', now) : '';

    // Ajakan memilah di atas Belum selesai (tidak saat melihat satu project atau Board)
    const n = tasks.filter(t => t.isInbox && t.status !== 'completed').length;
    const tampil = currentView === 'all' && currentProjectFilter == null && n >= BARA_INBOX_MIN;
    inbox.hidden = !tampil;
    if (tampil) {
        const kal = baraIsi(baraPilih('inbox', [
            '<b>{n} task</b> belum dipilah. Beri tanggal atau project satu per satu, biar Hari ini makin jelas.',
            'Yang belum dipilah mulai menumpuk (<b>{n}</b>). Pilah sebentar, Hari ini jadi lebih jelas.',
            'Ada <b>{n} ide</b> nganggur belum dipilah. Kasih tanggal yuk.'
        ]), { n });
        inbox.innerHTML = `${baraImg('berpikir')}<span>${kal}</span>`;
    }

    baraPasangJejak();
    baraLoncat = false;
    baraSorak = false;
}

// ---------- Saat status task berubah ----------

// Wadah daftar task per menu (3.7: Beranda = kotak Hari ini)
const BARA_DAFTAR_VIEW = { dashboard: 'brHariList', all: 'allList', completed: 'completedList' };

// Catat posisi kartu task sebelum berubah, supaya jejak muncul di tempat yang sama
function baraCatatPosisi(id) {
    const wadah = document.getElementById(BARA_DAFTAR_VIEW[currentView] || '');
    const el = wadah ? wadah.querySelector(`.task-item[data-task-id="${id}"]`) : null;
    let next = el ? el.nextElementSibling : null;
    while (next && next.classList.contains('bara-jejak')) next = next.nextElementSibling;
    return {
        view: currentView,
        nextId: next && next.dataset.taskId ? next.dataset.taskId : null,
        el,
        kotak: el ? el.querySelector('.task-checkbox') : null
    };
}

// Dipanggil sesudah saveData(). Mengembalikan true bila kartu task sedang dianimasikan
// keluar (pemanggil menunda render ±0,3 detik).
function baraSetelahUbah(id, statusLama, pos) {
    const task = tasks.find(t => t.id === id);
    if (!task || statusLama === 'completed' || task.status !== 'completed') return false;

    const now = new Date();
    const d = baraData(now);
    baraSelesaiBaru = baraSelesaiBaru.filter(w => now - w < 10000).concat(+now);
    const tuntasBaru = task.date === d.today && d.hariIni.length > 0 && d.sisa.length === 0;
    const kalimat = baraKalimatSelesai(task, d, tuntasBaru, now);

    if (tuntasBaru && baraStore.tuntas !== d.today) {
        baraStore.tuntas = d.today;
        baraSimpan();
        baraSorak = true;
    }
    baraLoncat = true;
    baraMulaiJejak({
        id, judul: task.title, kalimat, pose: tuntasBaru ? 'rayakan' : 'semangat',
        view: pos ? pos.view : currentView, nextId: pos ? pos.nextId : null, statusLama
    });

    const gerak = baraGerakBoleh();
    if (gerak && pos && pos.kotak) baraPercik(pos.kotak.getBoundingClientRect(), tuntasBaru ? 14 : 6);
    if (gerak && pos && pos.el && pos.el.isConnected) {
        pos.el.classList.add('bara-pergi');
        return true;
    }
    return false;
}

function baraKalimatSelesai(task, d, tuntasBaru, now) {
    const s = d.sisa.length;
    if (tuntasBaru) return baraAcak(['Itu yang terakhir hari ini! 🎉', 'Centang terakhir hari ini ✓ 🎉', `Yang terakhir beres, {nama}! 🎉`]);
    if (baraSelesaiBaru.length >= 3) return `${baraSelesaiBaru.length} beres sekaligus! 🔥`;
    if (task.date === d.today && s === 1) return baraAcak(['Tinggal satu lagi, hampir!', `Satu lagi, {nama}!`]);
    if (typeof evIsMissing === 'function' && evIsMissing(task)) return 'Beres! Jangan lupa foto bukti dukungnya 📷';
    const tenggat = task.dateEnd && task.dateEnd > task.date ? task.dateEnd : task.date;
    if (tenggat && tenggat < d.today) return `Akhirnya! Yang tertunda sejak ${lpPendek(tenggat)} beres juga.`;
    if (task.quadrant === 'do') return 'P1 beres — yang paling berat sudah lewat.';
    if (baraWaktu(now) === 'malam') return 'Lembur ya? Satu beres, jangan lupa istirahat.';
    const pool = ['Mantap, satu beres! 🔥', 'Satu lagi tumbang 💪', 'Rapi. Lanjut?', `Gas terus, {nama}!`, 'Beres! Satu langkah lebih ringan.', 'Centang yang memuaskan ✓'];
    if (task.date === d.today && s > 1) pool.push(`Sip! Sisa ${s} hari ini.`);
    return baraAcak(pool);
}

// Acak tanpa mengulang 3 kalimat terakhir di perangkat ini
function baraAcak(pool) {
    const akhir = Array.isArray(baraStore.akhir) ? baraStore.akhir : [];
    const calon = pool.filter(k => !akhir.includes(k));
    const k = (calon.length ? calon : pool)[Math.floor(Math.random() * (calon.length || pool.length))];
    baraStore.akhir = [k, ...akhir.filter(x => x !== k)].slice(0, 3);
    baraSimpan();
    return k;
}

// ---------- Jejak: baris hijau + ↶ Batal ----------

function baraMulaiJejak(j) {
    baraJejak = { ...j, sampai: Date.now() + BARA_JEJAK_MS, baru: true };
    clearTimeout(baraJejakTimer);
    baraJejakTimer = setTimeout(baraAkhiriJejak, BARA_JEJAK_MS);
}

function baraAkhiriJejak() {
    const el = document.querySelector('.bara-jejak');
    baraJejak = null;
    if (!el) return;
    if (baraGerakBoleh()) {
        el.classList.add('bara-hilang');
        setTimeout(() => el.remove(), 400);
    } else {
        el.remove();
    }
}

function baraPasangJejak() {
    document.querySelectorAll('.bara-jejak').forEach(el => el.remove());
    const j = baraJejak;
    if (!j || Date.now() > j.sampai) return;
    if (j.view !== currentView) { baraJejak = null; return; }
    const wadah = document.getElementById(BARA_DAFTAR_VIEW[currentView] || '');
    if (!wadah) return;
    // Task masih tampil di daftar ini (mis. menu Completed): tidak perlu jejak
    if (!j.batal && wadah.querySelector(`.task-item[data-task-id="${j.id}"]`)) return;

    const anchor = (j.nextId && wadah.querySelector(`.task-item[data-task-id="${j.nextId}"]`))
        || wadah.querySelector(':scope > .bara-tuntas, :scope > .empty-state, :scope > .add-task-inline');
    const html = `<div class="bara-jejak${j.baru && baraGerakBoleh() ? ' bara-baru' : ''}${j.batal ? ' bara-jejak-batal' : ''}" role="status">
        ${baraImg(j.pose)}
        <span class="bara-ok">${j.batal ? '↶' : '✓'}</span>
        <span class="bara-jj">${esc(j.judul)}</span>
        ${j.batal ? '' : '<button type="button" class="bara-batal" onclick="baraBatal()">↶ Batal</button>'}
        <span class="bara-kk">${esc(baraSapa(j.kalimat))}</span>
    </div>`;
    if (anchor) anchor.insertAdjacentHTML('beforebegin', html);
    else wadah.insertAdjacentHTML('beforeend', html);
    j.baru = false;
}

// Kembalikan task ke status sebelum dicentang
function baraBatal() {
    const j = baraJejak;
    if (!j || j.batal) return;
    const task = tasks.find(t => t.id === j.id);
    if (!task) return;
    tasks = tasks.map(t => t.id === j.id ? { ...t, status: j.statusLama || 'in-progress' } : t);
    saveData();
    const today = todayISO();
    if (baraStore.tuntas === today && tasks.some(t => t.date === today && t.status !== 'completed' && t.status !== 'cancelled')) {
        delete baraStore.tuntas;
        baraSimpan();
    }
    baraSelesaiBaru = [];
    baraMulaiJejak({ ...j, batal: true, pose: 'ups', kalimat: 'Oke, dibatalkan — task kembali.' });
    clearTimeout(baraJejakTimer);
    baraJejakTimer = setTimeout(baraAkhiriJejak, 2500);
    baraJejak.sampai = Date.now() + 2500;
    render();
}

// ---------- Percik bara (animasi ringan) ----------

function baraPercik(rect, banyak) {
    if (!rect || (!rect.width && !rect.height)) return;
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    for (let i = 0; i < banyak; i++) {
        const p = document.createElement('span');
        p.className = 'bara-percik bara-percik-' + (i % 3);
        p.style.left = (cx - 3.5) + 'px';
        p.style.top = (cy - 3.5) + 'px';
        const sudut = -Math.PI / 2 + (Math.random() - 0.5) * (banyak > 8 ? 2.6 : 1.7);
        const jarak = (banyak > 8 ? 50 : 28) + Math.random() * (banyak > 8 ? 60 : 36);
        p.style.setProperty('--dx', (Math.cos(sudut) * jarak).toFixed(1) + 'px');
        p.style.setProperty('--dy', (Math.sin(sudut) * jarak).toFixed(1) + 'px');
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 900);
    }
}

// ---------- Aksi dari kartu ----------

function baraKetuk() {
    const k = baraKeadaan(new Date(), currentView);
    const pilihan = BARA_KETUK.filter(x => !(baraPilihan.__ketuk && baraPilihan.__ketuk.teks === x));
    baraPilihan.__ketuk = { kunci: k.kunci, teks: pilihan[Math.floor(Math.random() * pilihan.length)] };
    baraLoncat = true;
    baraRender();
}

// Notifikasi rekap sore diketuk → Beranda, kotak Hari ini (berisi rekap) terlihat
function baraBukaRekap() {
    baraRekapBuka = true;
    switchView('dashboard');
    const el = document.getElementById('brHari');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
}

function baraKeInbox() {
    switchView('all');
}

function baraTutupInbox() {
    baraStore.inboxTutup = todayISO();
    baraSimpan();
    baraRender();
}

// ---------- Pergantian waktu tanpa membuka ulang aplikasi ----------
// Kartu digambar ulang bila bagian hari, mode rekap, atau tanggal berubah.

function baraTanda(now) {
    const rk = baraAturRekap();
    const m = baraMenit(now);
    return [todayISO(), baraWaktu(now), m >= rk.jam, m >= rk.jam + BARA_REKAP_KALIMAT].join('|');
}

function baraJagaWaktu() {
    if (document.hidden) return;
    if (currentView !== 'dashboard') return;
    if (baraTanda(new Date()) !== baraTandaWaktu) render();
}

function setupBara() {
    setInterval(baraJagaWaktu, 60000);
    document.addEventListener('visibilitychange', baraJagaWaktu);
}
