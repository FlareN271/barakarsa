/* ============================================================
   panduan.js — 📖 Cara Kerja Barakarsa (sejak 3.7.2)

   Panduan pemakaian di dalam aplikasi: pegangan, ritme harian,
   Jumat sore, akhir bulan/triwulan, kebiasaan mengisi task,
   contekan Tambah cepat, dan tanda bahaya. Isinya sama dengan
   dokumen "Cara Kerja dengan Barakarsa".

   Dibuka dari: ⋯ → Lainnya → 📖 Cara kerja Barakarsa, tombol di
   Help, dan otomatis sekali di perangkat yang belum punya task
   (pengguna baru). Jam ringkasan pagi & rekap sore dibaca dari
   pengaturan pengingat (pgAtur), jadi teksnya ikut berubah.

   Satu kunci per perangkat: barakarsa_panduan = '1' (sudah pernah dibuka).
   ============================================================ */

const PANDUAN_KEY = 'barakarsa_panduan';

function openPanduan(bagian) {
    document.getElementById('panduanIsi').innerHTML = panduanHTML();
    document.getElementById('panduanModal').classList.add('active');
    try { localStorage.setItem(PANDUAN_KEY, '1'); } catch (e) { /* abaikan */ }
    const body = document.querySelector('#panduanModal .modal-body');
    if (body) body.scrollTop = 0;
    if (bagian) {
        const el = document.getElementById('pd-' + bagian);
        if (el) { el.open = true; el.scrollIntoView({ block: 'start' }); }
    }
}

function closePanduan() {
    document.getElementById('panduanModal').classList.remove('active');
}

// Pengguna baru (belum ada task, belum pernah membuka panduan): tampilkan sekali
function panduanPertamaKali() {
    let sudah = false;
    try { sudah = localStorage.getItem(PANDUAN_KEY) === '1'; } catch (e) { sudah = true; }
    if (sudah || tasks.length) return;
    if (new URLSearchParams(location.search).has('quick')) return;
    setTimeout(() => openPanduan(), 400);
}

function panduanHTML() {
    const a = typeof pgAtur === 'function' ? pgAtur() : {};
    const jam = s => String(s || '').slice(0, 5).replace(':', '.');
    const pagi = jam(a.pagi_jam) || '07.30';
    const sore = jam(a.sore_jam) || '15.55';
    const baris = (kiri, isi, kanan) => `<li class="pd-baris"><span class="pd-kiri">${kiri}</span><span class="pd-isi">${isi}</span>${kanan ? `<span class="pd-kanan">${kanan}</span>` : ''}</li>`;
    const bagian = (id, judul, isi, buka) => `<details class="pd-bagian" id="pd-${id}" ${buka ? 'open' : ''}><summary>${judul}</summary><div class="pd-badan">${isi}</div></details>`;

    return `
    <div class="pd-buka">
        <img src="./maskot/bara-siap.webp" alt="" width="72" height="72" decoding="async">
        <div><p class="pd-lead"><b>Bara + karsa: niat yang dijaga tetap menyala.</b></p>
        <p>Kamu tidak perlu membuka Barakarsa seharian. Cukup tiga kebiasaan kecil tiap hari (lihat pagi, catat saat itu juga, rekap sore) dan satu obrolan santai dengan diri sendiri tiap Jumat. Sisanya biar Bara yang ingat.</p></div>
    </div>

    ${bagian('pegangan', '🔥 Pegangan', `<ol class="pd-daftar">
        <li><b>Catat dulu, pikir belakangan.</b> Kepala itu tempat berpikir, bukan gudang. Tugas dari ketua tim, ide kecil, titipan beli tinta: langsung lempar ke ➕. Rapikannya nanti saja.</li>
        <li><b>Beranda untuk bernapas, Belum selesai untuk bekerja.</b> Beranda hanya menampilkan hari ini supaya pagi terasa ringan. Tumpukan lengkapnya ada di 📋 Belum selesai.</li>
        <li><b>Bara kecil yang terus menyala.</b> Lima task beres setiap hari lebih bermakna daripada dua puluh task yang menumpuk lalu bikin ciut.</li>
        <li><b>CKP datang dengan sendirinya.</b> Catat kegiatan KipApp dengan rapi dan foto bukti dukungnya saat itu juga. Di akhir triwulan, CKP tinggal diekspor.</li>
        <li><b>Angka itu cermin, bukan rapor.</b> Hari yang sepi centang tetap hari kerja. Yang dicari polanya, bukan skornya.</li>
    </ol>`, true)}

    ${bagian('harian', '☀️ Sehari bersama Bara', `<ul class="pd-tabel">
        ${baris(`Pagi, ${pagi}`, 'Saat ringkasan pagi masuk, buka Beranda dan lihat kotak Hari ini. Kosongkan 📥 Belum dipilah (beri tanggal atau hapus). Pilih satu yang paling penting, beri P1.', '5 menit')}
        ${baris('Ada tugas baru', 'Tekan ➕ atau Q, ketik satu kalimat, Enter. Tidak usah buka form lengkap.', '10 detik')}
        ${baris('Satu task beres', 'Centang. Kalau task KipApp, foto bukti dukungnya dulu sebelum pindah ke kerjaan lain.', '30 detik')}
        ${baris('Rapat berjam', 'Isi jamnya, biar Barakarsa yang mengingatkan. Task yang tidak terikat jam tidak perlu diberi jam.', '')}
        ${baris(`Sore, ${sore}`, 'Saat rekap sore masuk, lihat Rekap hari ini. Centang yang terlewat. Sisanya geser ke besok, atau On Hold kalau masih menunggu orang lain. Siapkan task untuk besok.', '5 menit')}
        ${baris('Malam & libur', 'Istirahat. Kalau tiba-tiba teringat sesuatu, lempar ke ➕ lalu tutup lagi.', '')}
    </ul>
    <p class="pd-catatan">Takaran yang pas: <b>5–7 task sehari</b> (3–5 kerjaan, 1–2 urusan pribadi). Kalau kotak Hari ini sudah lebih dari 7, geser sebagian ke besok sejak pagi. Jam pagi dan sore bisa diubah di ⋯ → 🔔 Pengaturan pengingat.</p>`)}

    ${bagian('jumat', '📅 Jumat sore: ngobrol dengan diri sendiri', `<p>Seminggu sekali, sekitar 20 menit di laptop, setelah rekap sore Jumat. Kalau terlewat, ganti Senin pagi.</p>
    <ul class="pd-cek">
        <li><b>📈 Reporting → Minggu ini.</b> Lihat yang selesai, tepat waktu, hari aktif, dan sebaran project. Tulis satu kalimat jujur untuk dirimu, misalnya “Rabu habis untuk rapat”.</li>
        <li><b>⚠️ Lewat tanggal jadi nol.</b> Jadwalkan ulang, On Hold, atau Cancelled kalau memang tidak akan dikerjakan. Membatalkan itu jujur, bukan gagal.</li>
        <li><b>📥 Belum dipilah jadi nol.</b> Beri tanggal dan project, atau hapus.</li>
        <li><b>📅 Kalender minggu depan.</b> Sebar task supaya tidak ada hari yang lebih dari 7 task.</li>
        <li><b>🎯 Widget CKP di Beranda.</b> Bereskan chip 📷 belum ada bukti dan 🎯 belum ada IKI selagi masih ingat.</li>
        <li><b>💾 ⋯ → Export JSON</b>, lalu simpan di Drive sebagai cadangan.</li>
    </ul>
    <p class="pd-catatan">Reporting cukup dibuka seminggu sekali. Angka harian terlalu berisik; kotak Hari ini dan 7 hari terakhir di Beranda sudah cukup.</p>`)}

    ${bagian('triwulan', '🎯 Akhir bulan & akhir triwulan', `<p><b>Akhir bulan</b> (tambah 10 menit di Jumat terakhir). Buka Reporting → Bulan ini: project mana yang paling menyita waktu, minggu mana yang paling sepi? Cek di ⋯ → 📋 CKP Triwulan bahwa setiap IKI penugasan sudah punya kegiatan. Butuh suasana baru? Ganti sampul di 🎨 Atur Beranda.</p>
    <p><b>Akhir triwulan</b> (31 Maret, 30 Juni, 30 September, 31 Desember):</p>
    <ol class="pd-daftar">
        <li>Dua minggu sebelumnya, buka CKP Triwulan dan bereskan semua peringatannya: task tanpa IKI, task selesai tanpa foto, task yang belum Completed.</li>
        <li>Rapikan keterangan dengan 💡 saran keterangan, supaya senada dengan triwulan lalu.</li>
        <li>Isi kendala dan solusi per IKI, sekalian foto bukti pelaksanaan solusinya.</li>
        <li>Minggu terakhir: ekspor Excel rekap dan Laporan PDF per IKI, lalu unggah ke KipApp.</li>
        <li>Reporting → Triwulan ini: tulis satu kalimat untuk dirimu di triwulan berikutnya.</li>
    </ol>`)}

    ${bagian('kebiasaan', '✏️ Kebiasaan kecil saat mengisi task', `<ul class="pd-tabel">
        ${baris('Judul', 'Satu tindakan, diawali kata kerja. Untuk KipApp, tulis langsung seperti uraian kegiatan CKP.')}
        ${baris('Tanggal', 'Hari kamu <b>akan mengerjakannya</b>, bukan tenggatnya. Kegiatan berhari-hari pakai <i>Sampai tanggal</i>.')}
        ${baris('Jam', 'Hanya untuk yang benar-benar terikat waktu: rapat, pelatihan, janji.')}
        ${baris('Prioritas', 'Biasanya kosong. P1 cukup satu sehari, P2 untuk tenggat dekat. Kalau semuanya penting, tidak ada yang menonjol.')}
        ${baris('Project', 'KipApp untuk yang masuk CKP, Kerja untuk kantor di luar CKP, Personal untuk urusan sendiri.')}
        ${baris('IKI', 'Pilih saat itu juga untuk task KipApp. Tanpa IKI, kegiatan tidak masuk laporan.')}
        ${baris('Status', 'Task baru otomatis Not Started. Saat dicentang, pilih ▶ Mulai kerjakan atau ✓ Selesai. On Hold kalau menunggu orang lain.')}
        ${baris('Label', 'Opsional, satu atau dua saja.')}
        ${baris('Bukti dukung', 'Foto saat kegiatan selesai, langsung di form task. Foto yang ditunda adalah awal CKP yang telat.')}
    </ul>
    <p class="pd-catatan"><b>Batas aman:</b> Belum dipilah paling banyak 5 (di angka 5 Bara mulai mengingatkan), Lewat tanggal tidak lebih dari seminggu, Hari ini paling banyak 7.</p>`)}

    ${bagian('cepat', '⚡ Contekan Tambah cepat', `<p>Tulis seperti mencatat di kertas, lalu Enter. Tebakan salah? Ketuk ✕ di chip-nya.</p>
    <ul class="pd-tabel">
        ${baris('Tanggal', 'hari ini, besok, lusa, senin…minggu, jumat depan, tgl 15, 15 okt, 15/10', '<i>Validasi Susenas kamis</i>')}
        ${baris('Jam', '13.30, 13:30, jam 9, pukul 9.15', '<i>Rapat besok jam 9</i>')}
        ${baris('Project', '#kip, #kerja, #personal (cukup awal namanya)', '<i>Unggah bukti PST #kip</i>')}
        ${baris('Prioritas', '!1 !2 !3 atau p1 p2 p3', '<i>Kirim laporan besok !1</i>')}
        ${baris('Label', '@nama (awal nama label)', '<i>Cek data @urg</i>')}
        ${baris('Belum tahu', 'tanpa tanggal dan tanpa # → masuk 📥 Belum dipilah', '<i>Baca materi latsar</i>')}
    </ul>
    <p class="pd-catatan">Jam tanpa tanggal dianggap hari ini. <i>Minggu ini</i> dan <i>minggu depan</i> tidak dianggap hari Minggu.</p>
    <p><button type="button" class="btn btn-primary btn-sm" onclick="closePanduan(); openCepat()">⚡ Coba Tambah cepat</button></p>`)}

    ${bagian('berat', '🧯 Kalau mulai terasa berat', `<ul class="pd-tabel">
        ${baris('Lewat tanggal terus bertambah', 'Rencana harian terlalu penuh. Kurangi task per hari; pakai <i>Sampai tanggal</i> untuk kegiatan panjang.')}
        ${baris('Tepat waktu di bawah 60%', 'Tanggal diisi sebagai tenggat. Isi dengan hari kamu akan mengerjakannya.')}
        ${baris('Hari aktif rendah padahal capek', 'Kerja nyata tidak tercatat (rapat, bantu rekan, PST). Catat juga kerjaan dadakan, lalu centang.')}
        ${baris('Belum dipilah selalu > 5', 'Pilah pagi terlewat. Jadikan bagian dari 5 menit pagi.')}
        ${baris('Chip 📷 makin banyak', 'Foto ditunda. Foto dulu, baru centang.')}
        ${baris('Widget tidak pernah dilirik', 'Beranda terlalu ramai. Matikan di 🎨 Atur Beranda.')}
        ${baris('Notifikasi mulai diabaikan', 'Terlalu banyak task berjam. Hapus jam yang tidak perlu.')}
    </ul>`)}

    <p class="pd-tutup">Yang penting bukan seberapa banyak yang dicentang, tapi baranya tetap menyala. 🔥</p>`;
}
