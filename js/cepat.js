/* ============================================================
   cepat.js — ⚡ Tambah cepat (sejak 3.7, pengganti Inbox cepat)

   Satu kalimat → satu task. Bagian yang dikenali langsung tampil
   sebagai chip (bisa dibatalkan dengan ✕) dan dibuang dari judul:
     tanggal   hari ini · besok · lusa · senin…minggu · tgl 15 · 15 okt · 15/10
     jam       13.30 · 13:30 · jam 9 · pukul 9.15        (jam tanpa tanggal = hari ini)
     project   #kerja  (awal nama project, tanpa spasi; "#kip" → KipApp)
     prioritas !1 !2 !3 · p1 p2 p3
     label     @urgent (awal nama label)
   Tanpa tanggal & tanpa project → isInbox: true (kelompok 📥 Belum dipilah).

   Dibuka dari: tombol Tambah task di sidebar, ➕ melayang (desktop), ➕ di
   bilah bawah HP, tombol Q, bilah ⚡ di Belum selesai, "＋ Tambah untuk hari
   ini" di Beranda, shortcut ikon aplikasi (?quick=1).
   Detail… membuka form task lengkap yang sudah terisi.
   Bentuk task sama dengan form (tidak ada field baru).
   ============================================================ */

let cpAbaikan = new Set();    // teks token yang dibatalkan pengguna (✕ di chip)
let cpHasil = null;           // hasil uraian terakhir

const CP_HARI = { minggu: 0, ahad: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, "jum'at": 5, sabtu: 6 };
const CP_BULAN = { jan: 0, januari: 0, feb: 1, februari: 1, mar: 2, maret: 2, apr: 3, april: 3, mei: 4, jun: 5, juni: 5,
    jul: 6, juli: 6, agu: 7, agt: 7, agus: 7, agustus: 7, sep: 8, sept: 8, september: 8, okt: 9, oktober: 9,
    nov: 10, november: 10, des: 11, desember: 11 };

// ---------- Pengurai (murni: teks + tanggal hari ini → hasil) ----------

function cpUrai(teks, today, abaikan) {
    abaikan = abaikan || new Set();
    const tok = [];                                       // { jenis, a, b, teks, nilai, label }
    const bebas = (a, b) => !tok.some(t => a < t.b && b > t.a);
    const ambil = (re, jenis, fn) => {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(teks))) {
            const a = m.index + (m[1] ? m[1].length : 0);  // grup 1 = batas kiri (spasi/awal)
            const isi = m[0].slice(m[1] ? m[1].length : 0);
            const b = a + isi.length;
            if (!isi || !bebas(a, b) || abaikan.has(jenis + ':' + isi.toLowerCase())) continue;
            if (tok.some(t => t.jenis === jenis)) continue; // satu per jenis (label boleh banyak, lihat bawah)
            const r = fn(m, isi);
            if (r) tok.push({ jenis, a, b, teks: isi, ...r });
        }
    };
    const kiri = '(^|\\s)';
    const kanan = '(?=$|[\\s,.;!?])';
    const D = iso => new Date(iso + 'T00:00:00');
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const geser = n => { const d = D(today); d.setDate(d.getDate() + n); return iso(d); };
    const t0 = D(today);

    // Tanggal
    ambil(new RegExp(kiri + '(hari ini|hr ini|besok|bsk|lusa)' + kanan, 'gi'), 'tanggal', (m, s) => {
        const k = s.toLowerCase();
        return { nilai: k === 'lusa' ? geser(2) : (k === 'besok' || k === 'bsk') ? geser(1) : today };
    });
    ambil(new RegExp(kiri + '((?:hari\\s+)?(?:minggu|ahad|senin|selasa|rabu|kamis|jum\'?at|sabtu)(?:\\s+depan)?)' + kanan, 'gi'), 'tanggal', (m, s) => {
        const k = s.toLowerCase().replace(/^hari\s+/, '');
        const depan = /\sdepan$/.test(k);
        const nama = k.replace(/\s+depan$/, '');
        // "minggu ini/depan/lalu" = pekan, bukan hari Minggu
        if (nama === 'minggu' && /^\s+(ini|depan|lalu)\b/i.test(teks.slice(m.index + m[0].length)) ) return null;
        if (nama === 'minggu' && depan) return null;
        const target = CP_HARI[nama];
        if (target === undefined) return null;
        let n = (target - t0.getDay() + 7) % 7;
        if (depan) n += n === 0 ? 7 : 7;
        return { nilai: geser(n) };
    });
    ambil(new RegExp(kiri + '((?:tgl|tanggal)\\.?\\s*(\\d{1,2}))' + kanan, 'gi'), 'tanggal', (m) => {
        const tg = +m[3];
        if (tg < 1 || tg > 31) return null;
        let d = new Date(t0.getFullYear(), t0.getMonth(), tg);
        if (d.getDate() !== tg) return null;
        if (iso(d) < today) d = new Date(t0.getFullYear(), t0.getMonth() + 1, tg);
        if (d.getDate() !== tg) return null;
        return { nilai: iso(d) };
    });
    ambil(new RegExp(kiri + '((\\d{1,2})\\s+([a-z]{3,9})(?:\\s+(\\d{4}))?)' + kanan, 'gi'), 'tanggal', (m) => {
        const bln = CP_BULAN[m[4].toLowerCase()];
        if (bln === undefined) return null;
        const tg = +m[3];
        let th = m[5] ? +m[5] : t0.getFullYear();
        let d = new Date(th, bln, tg);
        if (d.getMonth() !== bln) return null;
        // Tanpa tahun dan sudah lewat lebih dari sebulan → tahun depan (mis. "5 jan" diketik bulan Desember)
        if (!m[5] && (t0 - d) / 86400000 > 31) d = new Date(th + 1, bln, tg);
        return { nilai: iso(d) };
    });
    ambil(new RegExp(kiri + '((\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?)' + kanan, 'gi'), 'tanggal', (m) => {
        const tg = +m[3], bln = +m[4] - 1;
        let th = m[5] ? +m[5] : t0.getFullYear();
        if (th < 100) th += 2000;
        if (bln < 0 || bln > 11) return null;
        let d = new Date(th, bln, tg);
        if (d.getMonth() !== bln) return null;
        if (!m[5] && (t0 - d) / 86400000 > 31) d = new Date(th + 1, bln, tg);
        return { nilai: iso(d) };
    });

    // Jam: "jam 9", "pukul 13.30", atau "13.30"/"13:30" berdiri sendiri
    const jamNilai = (h, mm) => (h >= 0 && h <= 23 && mm >= 0 && mm <= 59) ? `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}` : null;
    ambil(new RegExp(kiri + '((?:jam|pukul|pkl\\.?)\\s*(\\d{1,2})(?:[.:](\\d{2}))?)' + kanan, 'gi'), 'jam', (m) => {
        const v = jamNilai(+m[3], m[4] ? +m[4] : 0);
        return v ? { nilai: v } : null;
    });
    ambil(new RegExp(kiri + '((\\d{1,2})[.:](\\d{2}))' + kanan, 'g'), 'jam', (m) => {
        const v = jamNilai(+m[3], +m[4]);
        return v ? { nilai: v } : null;
    });

    // Project: #nama (awal nama, tanpa memperhatikan spasi & huruf besar)
    const rapat = s => String(s || '').toLowerCase().replace(/\s+/g, '');
    ambil(new RegExp(kiri + '(#[^\\s#@!]+)', 'g'), 'project', (m, s) => {
        const q = rapat(s.slice(1));
        const p = projects.find(x => rapat(x.name) === q) || projects.find(x => rapat(x.name).startsWith(q));
        return p ? { nilai: String(p.id), label: p.name, warna: p.color } : null;
    });

    // Prioritas
    ambil(new RegExp(kiri + '((?:!|p)([1-3]))' + kanan, 'gi'), 'prioritas', (m) => ({ nilai: ['do', 'schedule', 'delegate'][+m[3] - 1] }));

    // Label (boleh lebih dari satu)
    const reLabel = new RegExp(kiri + '(@[^\\s#@!]+)', 'g');
    let m;
    while ((m = reLabel.exec(teks))) {
        const a = m.index + m[1].length, isi = m[2], b = a + isi.length;
        if (!bebas(a, b) || abaikan.has('label:' + isi.toLowerCase())) continue;
        const q = rapat(isi.slice(1));
        const l = labels.find(x => rapat(x.name) === q) || labels.find(x => rapat(x.name).startsWith(q));
        if (l && !tok.some(t => t.jenis === 'label' && t.nilai === l.id)) tok.push({ jenis: 'label', a, b, teks: isi, nilai: l.id, label: l.name, warna: l.color });
    }

    // Judul = teks tanpa token, spasi dirapikan
    let judul = '';
    let i = 0;
    tok.slice().sort((x, y) => x.a - y.a).forEach(t => { judul += teks.slice(i, t.a); i = t.b; });
    judul = (judul + teks.slice(i)).replace(/\s{2,}/g, ' ').replace(/\s+([,.;])/g, '$1').trim();

    const cari = j => tok.find(t => t.jenis === j);
    const tanggal = cari('tanggal'), jam = cari('jam'), proj = cari('project'), prio = cari('prioritas');
    return {
        judul, token: tok,
        date: tanggal ? tanggal.nilai : (jam ? today : ''),
        time: jam ? jam.nilai : '',
        project: proj ? proj.nilai : null,
        quadrant: prio ? prio.nilai : '',
        labels: tok.filter(t => t.jenis === 'label').map(t => t.nilai)
    };
}

// ---------- Kotak Tambah cepat ----------

function openCepat(awal) {
    if (document.getElementById('taskModal').classList.contains('active')) return;
    const input = document.getElementById('cepatInput');
    cpAbaikan = new Set();
    input.value = awal || '';
    cpPerbarui();
    document.getElementById('cepatModal').classList.add('active');
    if (window.innerWidth <= 768) document.getElementById('sidebar').classList.add('collapsed');
    // Fokus langsung (masih dalam ketukan pengguna) supaya keyboard HP ikut terbuka
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
}

function closeCepat() {
    document.getElementById('cepatModal').classList.remove('active');
}

function cpPerbarui() {
    const teks = document.getElementById('cepatInput').value;
    cpHasil = cpUrai(teks, todayISO(), cpAbaikan);
    const r = cpHasil;
    const chip = [];
    const tok = j => r.token.find(t => t.jenis === j);
    const x = (t) => `<button type="button" class="cp-x" onclick="cpBatalkan('${t.jenis}', ${r.token.indexOf(t)})" aria-label="Batalkan ${esc(t.teks)}">✕</button>`;
    const tg = tok('tanggal'), jm = tok('jam'), pj = tok('project'), pr = tok('prioritas');
    if (r.date) chip.push(`<span class="cp-chip cp-tanggal">📅 ${esc(cpLabelTanggal(r.date))}${tg ? x(tg) : ''}</span>`);
    if (jm) chip.push(`<span class="cp-chip cp-jam">⏰ ${baraJamTitik(r.time)}${x(jm)}</span>`);
    if (pj) chip.push(`<span class="cp-chip cp-project"><i style="background: ${esc(pj.warna)}"></i>${esc(pj.label)}${x(pj)}</span>`);
    if (pr) chip.push(`<span class="cp-chip cp-prio prio-${pr.nilai}">⚑ ${PRIORITY_LABEL[pr.nilai].short}${x(pr)}</span>`);
    r.token.filter(t => t.jenis === 'label').forEach(t => chip.push(`<span class="cp-chip"><i style="background: ${esc(t.warna)}"></i>@${esc(t.label)}${x(t)}</span>`));
    // Tombol cepat bila belum ada tanggal
    if (!r.date) {
        chip.push(`<button type="button" class="cp-chip cp-saran" onclick="cpTambahKata('hari ini')">📅 Hari ini</button>`);
        chip.push(`<button type="button" class="cp-chip cp-saran" onclick="cpTambahKata('besok')">Besok</button>`);
    }
    if (!pj && projects.length) {
        projects.slice(0, 4).forEach(p => chip.push(`<button type="button" class="cp-chip cp-saran" onclick="cpTambahKata('#${esc(String(p.name).replace(/\s+/g, '').toLowerCase())}')"><i style="background: ${esc(p.color)}"></i>${esc(p.name)}</button>`));
    }
    document.getElementById('cepatChips').innerHTML = chip.join('');
    const masukInbox = !r.date && !r.project;
    document.getElementById('cepatPetunjuk').textContent = !r.judul ? 'Ketik judul task. Enter untuk simpan, Esc untuk tutup.'
        : masukInbox ? 'Tanpa tanggal & project → masuk 📥 Belum dipilah.'
        : `Masuk ${r.date ? cpLabelTanggal(r.date) : 'Belum selesai (tanpa tanggal)'}.`;
    document.getElementById('cepatSimpanBtn').disabled = !r.judul;
}

function cpLabelTanggal(iso) {
    const today = todayISO();
    if (iso === today) return 'Hari ini';
    if (iso === lpGeser(today, 1)) return 'Besok, ' + fmtHariPendek(iso);
    if (iso === lpGeser(today, 2)) return 'Lusa, ' + fmtHariPendek(iso);
    return fmtHariPendek(iso) + (iso.slice(0, 4) !== today.slice(0, 4) ? ' ' + iso.slice(0, 4) : '');
}

// ✕ di chip: kata itu tetap jadi bagian judul
function cpBatalkan(jenis, i) {
    const t = cpHasil && cpHasil.token[i];
    if (!t) return;
    cpAbaikan.add(jenis + ':' + t.teks.toLowerCase());
    cpPerbarui();
    document.getElementById('cepatInput').focus();
}

function cpTambahKata(kata) {
    const input = document.getElementById('cepatInput');
    input.value = (input.value.replace(/\s+$/, '') + ' ' + kata + ' ').replace(/^\s+/, '');
    cpPerbarui();
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
}

function simpanCepat() {
    const r = cpHasil;
    if (!r || !r.judul) return;
    const inbox = !r.date && !r.project;
    tasks.push({
        id: Date.now(),
        title: r.judul,
        description: '',
        date: r.date,
        time: r.time,
        quadrant: r.quadrant,
        project: r.project,
        labels: r.labels,
        attachment: '',
        status: 'not-started',          // 3.7.1: belum dimulai; dicentang → ditanya Selesai/Mulai
        isInbox: inbox,
        createdAt: new Date().toISOString()
    });
    saveData();
    closeCepat();
    debouncedRender();
    evToast(inbox ? '📥 Disimpan ke Belum dipilah.' : `✓ Disimpan · ${r.date ? cpLabelTanggal(r.date) : 'tanpa tanggal'}${r.time ? ' ' + baraJamTitik(r.time) : ''}`);
}

// Detail…: form lengkap yang sudah terisi (belum tersimpan sampai Save)
function cepatKeDetail() {
    const r = cpHasil || cpUrai(document.getElementById('cepatInput').value, todayISO(), cpAbaikan);
    closeCepat();
    openTaskModal();
    document.getElementById('taskTitle').value = r.judul;
    document.getElementById('taskDate').value = r.date || '';
    document.getElementById('taskTime').value = r.time || '';
    document.getElementById('taskQuadrant').value = r.quadrant || '';
    const sel = document.getElementById('taskProject');
    sel.value = r.project || '';
    sel.dispatchEvent(new Event('change'));           // tampilkan kolom IKI bila project CKP
    r.labels.forEach(id => { const cb = document.querySelector(`input[name="label-${id}"]`); if (cb) cb.checked = true; });
    document.getElementById('taskTime').dispatchEvent(new Event('input'));   // pilihan 🔔 per task
    document.getElementById('taskTime').dispatchEvent(new Event('change'));
    setTimeout(() => document.getElementById('taskTitle').focus(), 50);
}

function setupCepat() {
    const input = document.getElementById('cepatInput');
    if (!input) return;
    input.addEventListener('input', cpPerbarui);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); simpanCepat(); }
        else if (e.key === 'Escape') { e.preventDefault(); closeCepat(); }
    });
}
