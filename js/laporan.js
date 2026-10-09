/* ============================================================
   laporan.js — menu Reporting (3.5)

   Semua angka dihitung dari `tasks` di perangkat (local-first, jalan
   offline). Tidak ada field task, tabel, atau data tersinkron baru;
   hanya pilihan rentang yang diingat per perangkat (localStorage
   barakarsa_laporan).

   Sumber angka:
     task selesai   status 'completed'; tanggal selesai = completedAt (lokal),
                    atau dateEnd/date bila completedAt kosong (selesai sebelum 3.1)
     tepat waktu    hanya task dengan completedAt dan tanggal:
                    tanggal selesai ≤ (dateEnd || date)
     hari aktif     hari (sampai hari ini) yang punya minimal satu task selesai
     lewat tanggal  belum Completed/Cancelled dan (dateEnd || date) < hari ini
   ============================================================ */

const LP_KUNCI = 'barakarsa_laporan';
const LP_RENTANG = [['minggu', 'Minggu ini'], ['bulan', 'Bulan ini'], ['triwulan', 'Triwulan ini']];
const LP_HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const LP_BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

let lpRentang = (() => {
    try {
        const v = localStorage.getItem(LP_KUNCI);
        return LP_RENTANG.some(r => r[0] === v) ? v : 'minggu';
    } catch (e) { return 'minggu'; }
})();

function lpPilih(r) {
    lpRentang = r;
    try { localStorage.setItem(LP_KUNCI, r); } catch (e) { /* abaikan */ }
    lpRender();
}

// ---------- Tanggal ----------

const lpD = iso => new Date(iso + 'T00:00:00');
const lpIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const lpIsoLokal = waktu => lpIso(new Date(waktu));   // ISO waktu (UTC) → tanggal lokal
function lpGeser(iso, n) { const d = lpD(iso); d.setDate(d.getDate() + n); return lpIso(d); }
const lpSelisih = (a, b) => Math.round((lpD(b) - lpD(a)) / 86400000);
const lpMin = (a, b) => a < b ? a : b;
const lpPendek = iso => { const d = lpD(iso); return `${d.getDate()} ${LP_BULAN_PENDEK[d.getMonth()]}`; };
const lpTenggat = t => t.dateEnd && t.date && t.dateEnd > t.date ? t.dateEnd : t.date;

// Periode berjalan, kotak-kotak grafiknya, dan periode pembanding
// (periode lalu sampai titik yang sama, supaya pertengahan periode adil).
function lpPeriode(rentang, today) {
    const t = lpD(today);
    let mulai, akhir, judul, lalu, laluLabel, bins = [];

    if (rentang === 'minggu') {
        mulai = lpGeser(today, -t.getDay());
        akhir = lpGeser(mulai, 6);
        judul = fmtRentang(mulai, akhir);
        for (let i = 0; i < 7; i++) {
            const a = lpGeser(mulai, i);
            bins.push({ a, b: a, label: `${LP_HARI[i]} ${lpD(a).getDate()}`, utama: true });
        }
        lalu = { mulai: lpGeser(mulai, -7), sampai: lpGeser(today, -7) };
        laluLabel = t.getDay() === 0 ? 'Minggu pekan lalu' : `${LP_HARI[0]}–${LP_HARI[t.getDay()]} pekan lalu`;
    } else if (rentang === 'bulan') {
        mulai = lpIso(new Date(t.getFullYear(), t.getMonth(), 1));
        akhir = lpIso(new Date(t.getFullYear(), t.getMonth() + 1, 0));
        judul = `${MONTH_NAMES[t.getMonth()]} ${t.getFullYear()}`;
        for (let a = mulai; a <= akhir; a = lpGeser(a, 1)) {
            const n = lpD(a).getDate();
            bins.push({ a, b: a, label: String(n), utama: n === 1 || n % 5 === 0 });
        }
        const lm = lpIso(new Date(t.getFullYear(), t.getMonth() - 1, 1));
        const la = lpIso(new Date(t.getFullYear(), t.getMonth(), 0));
        lalu = { mulai: lm, sampai: lpMin(lpGeser(lm, lpSelisih(mulai, today)), la) };
        laluLabel = `${lpD(lalu.mulai).getDate()}–${lpD(lalu.sampai).getDate()} ${MONTH_NAMES[lpD(lm).getMonth()]}`;
    } else {
        const q = Math.floor(t.getMonth() / 3);
        mulai = lpIso(new Date(t.getFullYear(), q * 3, 1));
        akhir = lpIso(new Date(t.getFullYear(), q * 3 + 3, 0));
        judul = `Triwulan ${ROMAWI[q + 1]} ${t.getFullYear()}`;
        // Per minggu (Minggu–Sabtu), dipotong di awal dan akhir triwulan
        let a = mulai, i = 0;
        while (a <= akhir) {
            const b = lpMin(lpGeser(a, 6 - lpD(a).getDay()), akhir);
            const d = lpD(a);
            const awalBulan = i === 0 || d.getDate() <= 7 && lpD(bins[i - 1].a).getMonth() !== d.getMonth();
            bins.push({ a, b, label: awalBulan ? lpPendek(a) : String(d.getDate()), utama: true });
            a = lpGeser(b, 1); i++;
        }
        const lm = lpIso(new Date(t.getFullYear(), q * 3 - 3, 1));
        const la = lpIso(new Date(t.getFullYear(), q * 3, 0));
        lalu = { mulai: lm, sampai: lpMin(lpGeser(lm, lpSelisih(mulai, today)), la) };
        laluLabel = `TW ${ROMAWI[(q + 3) % 4 + 1]} (${lpPendek(lalu.mulai)}–${lpPendek(lalu.sampai)})`;
    }
    return { mulai, akhir, kini: lpMin(today, akhir), today, judul, bins, lalu, laluLabel };
}

// ---------- Kumpulkan data ----------

// Tanggal selesai dan kelasnya: on (tepat waktu), late, nodl (tanpa tanggal), unk (waktu selesai tidak tercatat)
function lpSelesai(t) {
    const tenggat = lpTenggat(t);
    if (!t.completedAt) return tenggat ? { tgl: tenggat, kelas: 'unk' } : null;
    const tgl = lpIsoLokal(t.completedAt);
    if (!tenggat) return { tgl, kelas: 'nodl' };
    return { tgl, kelas: tgl <= tenggat ? 'on' : 'late' };
}

function lpKumpulkan(P) {
    const D = { selesai: [], selesaiLalu: 0, tanpaTanggal: 0, lewat: [] };
    const dalam = h => h >= P.mulai && h <= P.kini;
    const dalamLalu = h => h >= P.lalu.mulai && h <= P.lalu.sampai;
    tasks.forEach(t => {
        if (t.status === 'completed') {
            const s = lpSelesai(t);
            if (!s) D.tanpaTanggal++;
            else if (dalam(s.tgl)) D.selesai.push({ t, ...s });
            else if (dalamLalu(s.tgl)) D.selesaiLalu++;
        } else if (t.status !== 'cancelled') {
            const tenggat = lpTenggat(t);
            if (tenggat && tenggat < P.today) D.lewat.push({ t, tenggat });
        }
    });
    return D;
}

// ---------- Gambar ----------

function lpRender() {
    const box = document.getElementById('laporanIsi');
    if (!box) return;
    const P = lpPeriode(lpRentang, todayISO());
    const D = lpKumpulkan(P);
    box.innerHTML = `
        <div class="lp-atas">
            <div class="lp-seg" role="tablist" aria-label="Rentang laporan">
                ${LP_RENTANG.map(([k, l]) => `<button type="button" role="tab" aria-selected="${k === lpRentang}" onclick="lpPilih('${k}')">${l}</button>`).join('')}
            </div>
            <div class="lp-judul">${esc(P.judul)}</div>
        </div>
        ${lpAngka(P, D)}
        ${lpKartuSelesai(P, D)}
        <div class="lp-dua">
            ${lpKartuProject(D)}
            ${lpKartuLewat(D)}
        </div>`;
}

function lpBanding(kini, lalu, label) {
    const beda = kini - lalu;
    if (!beda) return `sama dengan ${esc(label)}`;
    return `<span class="${beda > 0 ? 'lp-naik' : 'lp-turun'}">${beda > 0 ? '▲' : '▼'} ${Math.abs(beda)}</span> dari ${esc(label)}`;
}

function lpAngka(P, D) {
    const on = D.selesai.filter(s => s.kelas === 'on').length;
    const late = D.selesai.filter(s => s.kelas === 'late').length;
    const nilai = on + late;
    const unk = D.selesai.filter(s => s.kelas === 'unk').length;
    const hariBerjalan = lpSelisih(P.mulai, P.kini) + 1;
    const hariAktif = new Set(D.selesai.map(s => s.tgl)).size;
    const rata = hariAktif ? String(Math.round(D.selesai.length / hariAktif * 10) / 10).replace('.', ',') : '';
    return `<div class="lp-angka">
        <div class="lp-tile">
            <span class="lp-k">Task selesai</span>
            <span class="lp-v">${D.selesai.length}</span>
            <span class="lp-s">${lpBanding(D.selesai.length, D.selesaiLalu, P.laluLabel)}</span>
        </div>
        <div class="lp-tile">
            <span class="lp-k">Hari aktif</span>
            <span class="lp-v">${hariAktif}<small class="lp-v-sub"> / ${hariBerjalan} hari</small></span>
            <span class="lp-s">${hariAktif ? `ada task selesai · rata-rata ${rata} task per hari itu` : 'belum ada task selesai'}</span>
        </div>
        <div class="lp-tile">
            <span class="lp-k">Tepat waktu</span>
            <span class="lp-v">${nilai ? Math.round(on / nilai * 100) + '%' : '–'}</span>
            <span class="lp-s">${nilai ? `${on} dari ${nilai} task bertanggal` : 'belum ada task bertanggal yang bisa dinilai'}${unk ? ` · ${unk} belum bisa dinilai` : ''}</span>
        </div>
        <button type="button" class="lp-tile lp-tile-btn${D.lewat.length ? ' lp-awas' : ''}" onclick="lpKeLewat()">
            <span class="lp-k">Lewat tanggal</span>
            <span class="lp-v">${D.lewat.length}</span>
            <span class="lp-s">${D.lewat.length ? 'belum selesai, tanggalnya sudah lewat ↓' : 'tidak ada yang tertinggal'}</span>
        </button>
    </div>`;
}

function lpKeLewat() {
    const el = document.getElementById('lpLewat');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Angka sumbu yang rapi: maksimum dibulatkan ke kelipatan langkah
function lpSkala(maks, langkahDasar) {
    const pilihan = langkahDasar.find(s => maks <= s * 4) || langkahDasar[langkahDasar.length - 1];
    return Math.max(pilihan, Math.ceil(maks / pilihan) * pilihan);
}

// Grafik batang bertumpuk. nilai: [[angka per lapis], ...] per kotak; null = belum berjalan
function lpBatang(P, nilai, lapis) {
    const total = nilai.map(v => v ? v.reduce((a, b) => a + b, 0) : 0);
    const maks = lpSkala(Math.max(...total, 1), [1, 2, 5, 10, 20, 50, 100]);
    const garis = (maks % 2 ? [maks, 0] : [maks, maks / 2, 0]).map(v => `<div class="lp-grid" style="top:${(1 - v / maks) * 100}%"><span>${Math.round(v)}</span></div>`).join('');
    const rapat = P.bins.length > 14;
    const batang = P.bins.map((bin, i) => {
        const v = nilai[i];
        const ttl = bin.a === bin.b ? fmtTanggal(bin.a) : fmtRentang(bin.a, bin.b);
        if (!v) return `<div class="lp-bin lp-nanti" title="${ttl}: belum berjalan"></div>`;
        const isi = v.map((n, k) => n ? `<div class="lp-lapis ${lapis[k]}" style="height:${n / maks * 100}%"></div>` : '').join('');
        const t = total[i];
        return `<div class="lp-bin" title="${ttl}: ${t} selesai">${isi}${t && !rapat ? `<span class="lp-tot" style="bottom:calc(${t / maks * 100}% + 2px)">${t}</span>` : ''}</div>`;
    }).join('');
    const xl = P.bins.map(bin => {
        const kini = P.today >= bin.a && P.today <= bin.b;
        return `<span class="${kini ? 'lp-kini' : ''}${bin.utama || kini ? '' : ' lp-minor'}">${esc(bin.label)}</span>`;
    }).join('');
    return `<div class="lp-chart${rapat ? ' lp-rapat' : ''}">${garis}<div class="lp-bars">${batang}</div></div><div class="lp-xl${rapat ? ' lp-rapat' : ''}">${xl}</div>`;
}

// ---------- Task selesai per hari / per minggu ----------

function lpKartuSelesai(P, D) {
    const urut = ['on', 'late', 'nodl', 'unk'];
    const nilai = P.bins.map(bin => {
        if (bin.a > P.today) return null;
        const v = [0, 0, 0, 0];
        D.selesai.forEach(s => { if (s.tgl >= bin.a && s.tgl <= bin.b) v[urut.indexOf(s.kelas)]++; });
        return v;
    });
    const unk = D.selesai.filter(s => s.kelas === 'unk').length;
    const catatan = [];
    if (unk) catatan.push(`▨ ${unk} task selesai sebelum 8 Oktober 2026 (versi 3.1) tidak punya catatan waktu selesai. Tanggal task dipakai sebagai perkiraan, dan task ini tidak dinilai tepat waktu atau terlambat.`);
    if (D.tanpaTanggal) catatan.push(`${D.tanpaTanggal} task lama tanpa tanggal dan tanpa waktu selesai tidak dihitung.`);
    const grafik = D.selesai.length ? lpBatang(P, nilai, ['lp-c-on', 'lp-c-late', 'lp-c-nodl', 'lp-c-unk'])
        : '<div class="lp-kosong">Belum ada task yang selesai di periode ini.</div>';
    return `<section class="lp-card"><h3>Task selesai ${lpRentang === 'triwulan' ? 'per minggu' : 'per hari'}</h3><p class="lp-q">Bagaimana pola saya menyelesaikan pekerjaan, dan apakah tepat waktu?</p>
        <div class="lp-legend"><span><i class="lp-c-on"></i>Tepat waktu</span><span><i class="lp-c-late"></i>Terlambat</span><span><i class="lp-c-nodl"></i>Tanpa tanggal</span><span><i class="lp-c-unk"></i>Waktu selesai tidak tercatat</span></div>
        ${grafik}${catatan.map(c => `<p class="lp-catatan">${esc(c)}</p>`).join('')}</section>`;
}

// ---------- Sebaran per project ----------

function lpKartuProject(D) {
    const per = new Map();
    D.selesai.forEach(s => {
        const p = s.t.project ? projects.find(x => x.id == s.t.project) : null;
        const k = p ? String(p.id) : '';
        if (!per.has(k)) per.set(k, { nama: p ? p.name : 'Tanpa project', warna: p ? p.color : 'var(--text-faint)', n: 0 });
        per.get(k).n++;
    });
    const baris = [...per.values()].sort((a, b) => b.n - a.n);
    if (!baris.length) {
        return `<section class="lp-card"><h3>Sebaran per project</h3><p class="lp-q">Ke mana tenaga saya pergi?</p><div class="lp-kosong">Belum ada task selesai di periode ini.</div></section>`;
    }
    const total = D.selesai.length, maks = baris[0].n;
    return `<section class="lp-card"><h3>Sebaran per project</h3><p class="lp-q">Ke mana tenaga saya pergi? (task selesai)</p>
        <div class="lp-hl">${baris.map(b => `
            <div class="lp-hr">
                <span class="lp-hr-nama"><span class="lp-dot" style="background:${esc(b.warna)}"></span>${esc(b.nama)}</span>
                <span class="lp-hr-angka">${b.n} task · ${Math.round(b.n / total * 100)}%</span>
                <div class="lp-track"><div style="width:${b.n / maks * 100}%;background:${esc(b.warna)}"></div></div>
            </div>`).join('')}</div></section>`;
}

// ---------- Lewat tanggal ----------

function lpKartuLewat(D) {
    const list = D.lewat.slice().sort((a, b) => a.tenggat < b.tenggat ? -1 : 1);
    const tampil = list.slice(0, 8);
    const isi = list.length ? `<div class="lp-daftar">${tampil.map(x => `
        <button type="button" class="lp-baris" onclick="editTask(${x.t.id})">
            <span class="lp-baris-judul">${esc(x.t.title)}</span>
            <span class="lp-baris-ket">${fmtPendek(x.tenggat)} · <span class="lp-turun">${lpSelisih(x.tenggat, todayISO())} hari lalu</span></span>
        </button>`).join('')}</div>${list.length > tampil.length ? `<p class="lp-catatan">dan ${list.length - tampil.length} task lainnya.</p>` : ''}`
        : '<div class="lp-kosong">Tidak ada task yang tertinggal. 👍</div>';
    return `<section class="lp-card" id="lpLewat"><h3>Lewat tanggal</h3><p class="lp-q">Belum selesai, tanggalnya sudah lewat (saat ini)</p>${isi}</section>`;
}
