# BARAKARSA — Roadmap

Rencana pengembangan Barakarsa setelah versi live 3.0 (8 Oktober 2026).
Setiap versi dikerjakan di chat terpisah dalam projek ini. Riwayat perubahan ada di `CHANGELOG.md`.

- Aplikasi: https://flaren271.github.io/barakarsa/
- Repo: github.com/flaren271/barakarsa (GitHub Pages, PWA)
- Backend: Supabase (tabel `barakarsa_items`, `barakarsa_settings`, bucket `bukti-dukung`; sejak 3.4 juga `barakarsa_pengingat`, `barakarsa_push_langganan`, `barakarsa_push_log`, Edge Function `pengingat`, penjadwal pg_cron). 3.5 dan 3.7 tidak menambah apa pun di Supabase; 3.6 menambah 3 kolom rekap sore di `barakarsa_pengingat`.
- Peta kode: `ARSITEKTUR.md` di repo (sejak 3.2.1)

---

## Ringkasan versi

| Versi | Nama | Fokus | Status |
|---|---|---|---|
| 3.1 | Rapi & Cepat | Perbaikan yang langsung terasa sehari-hari | ✅ Selesai (8 Okt 2026) |
| 3.2 | Tampilan | Mode terang/gelap, tema Bara | ✅ Selesai (8 Okt 2026) |
| 3.2.1 | Rapikan Kode | Pecah `index.html`, satukan fungsi berlapis, buang kode mati | ✅ Selesai (8 Okt 2026) |
| 3.2.2 | Perbaikan Help | Isi Panduan Singkat tidak meluber keluar kotak | ✅ Selesai (8 Okt 2026) |
| 3.2.3 | Perbaikan Kecil | Tanggal lokal, nomor urutan task, escape teks | ✅ Selesai (8 Okt 2026) |
| 3.3 | CKP Pintar | Seluruh pohon kinerja, pencarian IKI, saran keterangan | ✅ Selesai (8 Okt 2026) |
| 3.4 | Pengingat | Notifikasi push: pengingat task & ringkasan pagi | ✅ Selesai (9 Okt 2026), terpasang & berjalan baik di HP |
| 3.5 | Reporting | Pola task selesai, tepat waktu, lewat tanggal, sebaran project | ✅ Selesai (9 Okt 2026), uji coba di HP berjalan |
| 3.6 | Persona Bara | Maskot Bara, sapaan, perayaan, rekap sore (+ push), dorongan Inbox | ✅ Selesai (12 Okt 2026), menunggu SQL 3.6 & uji di HP |
| 3.6.1 | Nama Panggilan | Nama sapaan Bara bisa diatur (bawaan tanpa nama), tersinkron | ✅ Selesai (12 Okt 2026) |
| 3.7 | Personalisasi | Beranda (sampul, jam, widget, album), menu baru, Tambah cepat, prioritas opsional | ✅ Selesai (12 Okt 2026), menunggu uji di HP |
| 3.7.1 | Centang & kenyamanan | Centang bertanya untuk task belum dimulai, hapus centang ke status sebelumnya, cari di Selesai, Labels di menu utama | ✅ Selesai (12 Okt 2026) |
| 3.7.2 | Cara Kerja | Panduan pemakaian di dalam aplikasi, Stress Test dihapus dari menu | ✅ Selesai (12 Okt 2026) |
| 3.7.3 | Hasil uji coba 3.7 | Temuan Beranda, menu baru, Tambah cepat, pilihan centang di HP asli | 🔜 Bila diperlukan |
| 3.4.x | Pengingat CKP | Kegiatan tanpa bukti dukung menjelang akhir triwulan | Ditunda ke versi lain, target sebelum 31 Des 2026 |
| 4.0 | Teman | Tonggak: persona, personalisasi, AI terasa utuh | Perlu diskusi |

---

## v3.1 — Rapi & Cepat ✅

### Cakupan
1. **Tombol "Pasang aplikasi"** pindah dari pojok kanan bawah ke menu ⋯. Hanya muncul bila browser menawarkan instalasi.
2. **Tombol ➕ melayang** di pojok kanan bawah (khusus HP) untuk tambah task.
3. **Header lebih ringkas** supaya daftar task lebih dominan.
4. **Duplikasi task.**
5. **Tombol akses Naraloka** → https://flaren271.github.io/naraloka/
6. **Edit Project berfungsi** (nama + warna) dan **penanda "Project CKP"**, sehingga CKP tidak lagi bergantung pada nama "ASN".
   - Rename: ASN → **KipApp**, Work → **Kerja** (migrasi otomatis, aman untuk sinkron antar perangkat).
   - Perbaiki bug hapus project: task tidak ikut terlepas karena perbandingan id teks vs angka.
7. **Subjudul CKP di label form**, menggantikan kolom "Uraian versi CKP":
   - Task Title → *Uraian Kegiatan di CKP*
   - Description → *Keterangan/Catatan di CKP*
   - Kolom uraian lama dihapus. Tidak perlu migrasi data (kolom itu tidak pernah diisi). Laporan PDF/Word memakai Task Title.
8. **Badge priority disembunyikan** pada task Completed (data tetap disimpan untuk Reporting).
9. **Aplikasi terbuka lebih cepat di HP:**
   - Service worker: tampilkan dari cache dulu, perbarui di belakang (ganti nama cache).
   - Pustaka Supabase dimuat tanpa menahan tampilan.
   - Shortcut "Tambah task cepat" saat ikon aplikasi ditekan lama → langsung ke kolom input.
10. **Catat waktu selesai (`completedAt`)** setiap task jadi Completed, sebagai persiapan Reporting v3.5.
11. Mulai mencatat rilis di `CHANGELOG.md`, dan tampilkan nomor versi di menu Help.

### Diputuskan saat pengerjaan
- Duplikasi task: tanggal, jam, dan status ikut disalin; foto bukti dukung tidak.
- Tombol Naraloka: di menu ⋯ saja.

---

## v3.2 — Tampilan ✅

### Cakupan
- Mode terang dan gelap untuk seluruh aplikasi.
- Tema baru dipilih dari tiga mockup (Dashboard + form task, HP dan desktop):
  - **Bara**: gelap hangat, aksen merah-oranye. ← **dipilih**
  - Kertas: terang, bersih, nuansa Notion.
  - Senja: netral lembut, aksen biru-ungu.
- Tanpa glassmorphism.
- Halaman cetak/PDF CKP tetap putih apa pun temanya.

### Diputuskan saat pengerjaan
- Arah tampilan: **Bara**, dengan huruf Plus Jakarta Sans.
- Mode bawaan: **ikut pengaturan HP/komputer** (Otomatis); bisa diganti manual ke Terang atau Gelap.
- Tombol ganti tema: **di menu ⋯ saja** (bagian "Tampilan").
- Pilihan tema disimpan per perangkat, tidak disinkron.

---

## v3.2.1 — Rapikan Kode ✅

Versi perawatan. **Tidak ada fitur baru dan tidak ada perubahan tampilan**: aplikasi terlihat dan berperilaku persis seperti 3.2. Tujuannya supaya kode mudah dibaca, didokumentasikan, dan aman dikembangkan di v3.3.

### Kondisi sebelum (versi 3.2)
- `index.html` ±6.300 baris (±290 KB): 1.600 baris CSS, HTML, dan 9 blok `<script>` dalam satu file.
- 13 fungsi dibungkus ulang oleh bagian yang ditambahkan belakangan (3 lapis: `openTaskModal`, `editTask`, `createTaskHTML`, `render`, `syncNow`; 2 lapis: `saveTask`, `deleteTask`, `switchView`, `getFilteredTasks`; 1 lapis: `loadData`, `saveData`, `closeTaskModal`, `createBoardCard`).
- CSS bertumpuk per versi yang saling menimpa; 24 aturan `!important`.
- Kode mati: modal "CKP Preview" lama, kalender versi lama, tombol tampilan di header.
- Gaya inline di HTML dan di string JS, komentar campur Inggris–Indonesia.

### Hasil
- `index.html` tinggal ±650 baris (HTML saja). Kode dipecah ke 7 file CSS dan 11 file JS (peta di `ARSITEKTUR.md`). Total ±6.500 baris, ±245 KB (lebih kecil karena aturan tertimpa dan kode mati dibuang).
- Ke-13 fungsi berlapis kini satu fungsi utuh. `saveTask` (form-task.js) langsung menyimpan field form, IKI, rentang tanggal, foto, waktu selesai, dan posisi salinan; `syncNow` (sinkron.js) memuat seluruh putaran sinkron di satu tempat.
- CSS per komponen; `!important` tinggal 2 (keduanya di halaman cetak). Semua warna lewat variabel di `tema.css` (kecuali `cetak.css`). Nama variabel: `--dark-bg` → `--bg`, `--dark-card` → `--surface`, `--dark-hover` → `--hover`, `--accent-red` → `--accent`.
- Elemen yang dulu disisipkan lewat JS (pilihan urutan, status sinkron, kolom IKI, hub CKP, tombol ➕, peringatan bukti dukung) kini langsung ada di HTML.
- Kunci localStorage, IndexedDB, tabel, dan bucket tidak berubah.

### Diputuskan saat pengerjaan
- JS dimuat sebagai skrip biasa dengan `defer` (bukan ES module), sesuai usulan.
- Skrip kecil di `<head>` juga menutup sidebar di HP sebelum halaman digambar, supaya tidak tampak terbuka sekejap saat file JS masih dimuat.
- `sw.js` mengambil file langsung dari server saat memasang cache baru (`cache: 'reload'`), supaya 19 file aset tidak tercampur versi lama dari cache HTTP browser.
- Bug lama yang ditemukan **tidak** diperbaiki di versi ini (aturan "persis seperti 3.2"); dicatat di bawah.

### Cara uji yang dipakai
- 37 keadaan layar (semua menu, List/Board/Kalender, semua modal, hub CKP, pratinjau PDF, sorotan kursor) × desktop/HP × gelap/terang: tangkapan layar 3.2 dan 3.2.1 dibandingkan per piksel — identik (kecuali nomor versi di Help).
- 23 langkah pemakaian (Inbox cepat, tambah/edit/duplikat/hapus task, saran IKI, centang, urutan, project, label, rentang tanggal, filter project, Reporting, urutkan, tombol Q, PDF): isi localStorage dan teks layar sama persis.
- Sinkron dua arah dengan server tiruan: 3.2 ↔ 3.2.1, termasuk edit, hapus (tombstone), dan pengaturan CKP.
- Offline: service worker menyimpan 23 file; aplikasi terbuka tanpa jaringan.

### Temuan selama perombakan (diperbaiki di 3.2.3)
Perilaku lama yang dipertahankan apa adanya di 3.2.1, lalu dibereskan di 3.2.3:
1. **Tanggal "hari ini" memakai UTC.** Today, Upcoming, angka di sidebar, dan tanggal bawaan form task memakai tanggal UTC. Di WITA, antara pukul 00.00–07.59 aplikasi masih menganggap hari kemarin (task baru otomatis bertanggal kemarin). Kalender dan CKP sudah memakai tanggal lokal.
2. **Task baru tidak diberi nomor urutan (`order`).** Berlaku untuk form task dan Inbox cepat. Saat aplikasi dibuka berikutnya, semua task dinomori ulang di perangkat itu saja (tidak tersinkron), dan menyeret task yang belum bernomor bisa menghasilkan urutan tidak valid.
3. **Judul dan description task tidak di-escape** di kartu task dan Board, sehingga teks seperti `<b>` tampil sebagai HTML.

### Di luar cakupan
- Fitur baru, perubahan tampilan, atau perubahan struktur data.
- Alat build (bundler, framework), TypeScript, tes otomatis permanen di repo.

## v3.2.2 — Perbaikan Help ✅
- Dilaporkan setelah 3.2.1 dipasang: isi Panduan Singkat (Help) meluber keluar kotak. Bug sudah ada sejak 3.2, sehingga tidak tertangkap oleh uji "3.2.1 harus sama persis dengan 3.2".
- Perbaikan: isi kotak satu kolom bisa digulir; tombol ✕ tetap di tempat.
- Pelajaran untuk uji berikutnya: selain membandingkan dengan versi lama, periksa juga apakah ada isi yang keluar dari kotaknya.

## v3.2.3 — Perbaikan Kecil ✅
Diputuskan: tiga temuan 3.2.1 dibereskan dulu sebagai rilis kecil, supaya 3.3 bisa fokus ke CKP.
- Semua "hari ini" memakai tanggal lokal (`todayISO()`); `todayUTC()` dihapus.
- Task baru langsung diberi nomor urutan saat disimpan (`fillMissingOrder()` di `saveData()`); task lama tanpa nomor diberi nomor sesuai posisinya dan ikut tersinkron.
- Judul, description, nama project, dan nama label selalu lewat `esc()` sebelum masuk HTML.

## v3.3 — CKP Pintar ✅

### Cakupan
1. Impor **seluruh** pohon kinerja, bukan hanya penugasan atas nama sendiri.
2. Pencarian IKI di form task, plus penanda IKI yang sering dipakai.
3. Saran description untuk task KipApp (tanpa AI), dari description task sebelumnya pada IKI yang sama.

### Hasil
- Katalog: 18 IKI penugasan (`entries`, identik dengan 3.2.3) + 35 IKI Anggota tim lain (`lain`, `milik: false`). Total 53.
- Form task: daftar pilihan IKI diganti tombol pemilih + panel cari yang terbuka di dalam form (bukan melayang). Urutan: 🕘 Terakhir dipakai (3) → 🙋 Penugasanku → 📚 IKI lain (tertutup sampai diketuk/dicari).
- 💡 Saran keterangan di bawah Description: riwayat description pada IKI yang sama, atau 🧩 kalimat dasar (judul + RK) bila belum ada riwayat.
- Hub CKP: IKI tim lain hanya tampil bila ada task-nya pada triwulan itu.
- Tidak ada file, kunci penyimpanan, atau baris pengaturan baru.

### Diputuskan saat pengerjaan
- **IKI pegawai lain bisa dipilih**, dengan label *bukan penugasanmu*, peringatan untuk memastikan IKI ada di SKP/KipApp, dan hanya muncul di hub bila ada task-nya.
- **Hanya IKI Anggota.** IKI Ketua Tim/PJ tidak diikutkan (pemakaian pribadi).
- **Format impor: JSON saja.** Format katalog .xlsx (sheet IKI + Penugasan, untuk tahun depan atau pegawai lain) ditunda.
- **Favorit diganti "3 terakhir dipakai"**, dihitung dari task sehingga otomatis sama di semua perangkat.
- **Saran keterangan dari riwayat**, bukan dari rincian: contoh keterangan CKP Naufal berupa kalimat lengkap ("Melaksanakan tugas sebagai petugas Pelayanan Statistik Terpadu (PST) harian dengan …"), sedangkan rincian di pohon kinerja kebanyakan satu-dua kata. Rincian tetap dipakai untuk pencarian dan 💡 saran IKI.
- Klik saran keterangan: Description kosong → diisi; sudah berisi → ditambah di baris baru. 🧩 kalimat dasar hanya saat Description kosong.
- Urutan form di HP tidak diubah (IKI tetap di bawah foto); saran keterangan muncul begitu IKI dipilih.
- Katalog tetap disimpan di `entries` (penugasan) supaya perangkat 3.2.3 tidak menampilkan 53 kartu di hub.

### Cara uji yang dipakai
- Katalog dari file yang sama dibandingkan dengan pembuat katalog 3.2.3: 18 entri identik.
- 42 langkah pemakaian otomatis di browser (impor, cari, keyboard, pilih IKI lain, simpan, duplikat, hub, PDF, saran).
- Sinkron dua arah 3.2.3 ↔ 3.3 dengan server Supabase tiruan.
- 17 keadaan layar × desktop/HP × gelap/terang dibandingkan per piksel dengan 3.2.3 (uji kontrol 3.2.3 vs 3.2.3 dipakai untuk menyaring derau di pojok header); hanya form task CKP dan Help yang berbeda. Pemeriksaan luberan/terpotong pada form task dan hub.
- Beban: 3.000 task, CPU diperlambat 4×.

### Catatan untuk versi berikutnya
- Bila suatu saat pegawai lain ikut memakai Barakarsa atau pohon kinerja 2027 terbit: pertimbangkan impor format .xlsx (contoh katalog sudah ada, pustaka XLSX sudah dimuat untuk ekspor).
- v3.5 Reporting bisa memakai "IKI tim lain" sebagai indikator kerja lintas tim.
- Hal yang dipantau selama uji coba 3.3 (belum ada temuan per 9 Okt 2026): 🧩 kalimat dasar yang kaku untuk IKI tertentu; "Terakhir dipakai" ikut naik saat task lama disunting (mis. tambah foto) walau IKI-nya tidak dipilih ulang — perilaku ini memang mengikuti `updatedAt` task; urutan saran keterangan.

## v3.4 — Pengingat ✅

### Cakupan (dipilih dari usulan)
1. ✅ **Pengingat per task**: bawaan 5 menit sebelumnya, bisa dipilih per task (saat waktunya, 5/10/15/30 menit, 1 jam, tanpa pengingat).
2. ✅ **Ringkasan pagi**: pukul 07.30 setiap hari (jam dan hari bisa diubah).
3. ⏸️ **Pengingat CKP** menjelang akhir triwulan: ditunda (lihat v3.4.x).

### Rancangan
- Server membaca task yang **sudah tersinkron** di `barakarsa_items`. pg_cron memanggil Edge Function `pengingat` tiap menit, lalu Edge Function mengirim Web Push ke semua perangkat yang diaktifkan.
- Tiga tabel baru dengan RLS: pengaturan per akun (disinkron), langganan per perangkat (hanya ditulis Edge Function), dan log anti-dobel (hanya server).
- Rahasia (kunci VAPID privat, rahasia penjadwal) hanya di Supabase Secrets/Vault. Kunci publik diambil aplikasi dari Edge Function, jadi tidak ada kunci yang ditulis di kode.
- Web Push ditulis langsung dengan WebCrypto di Edge Function (tanpa pustaka), sehingga bisa diuji di Deno.

### Diputuskan saat pengerjaan
- Perangkat: Android (aplikasi terpasang), laptop Edge dan Chrome. **Semua perangkat** menerima kedua jenis notifikasi, termasuk ringkasan pagi di laptop.
- Task tanpa jam: hanya lewat ringkasan pagi.
- Ringkasan pagi = **Today saja** (task bertanggal hari ini), tanpa task beberapa hari yang sedang berjalan dan tanpa baris "terlambat".
- Yang dilewati hanya **Completed dan Cancelled**; On Hold dan Not Started tetap diingatkan.
- **Tanpa tombol Tunda** di notifikasi.
- Pengaturan di menu ⋯ → 🔔 Pengaturan pengingat (letak mengikuti usulan; dinilai lagi setelah dipakai). Pilihan 🔔 per task di bawah kolom Time, hanya tampil bila jam diisi.
- Izin ditolak: tidak ada yang dikirim ke server; panel menjelaskan cara membuka izin; aplikasi tetap normal.
- Batas waktu: pengingat task sampai 10 menit setelah jamnya (TTL layanan push sampai jam + 30 menit); ringkasan pagi sampai 4 jam setelah jamnya.
- Judul panel menempel di atas saat digulir, supaya tombol ✕ tidak menimpa sakelar.

### Cara uji yang dipakai
- Edge Function dijalankan di Deno: 33 uji unit (enkripsi diverifikasi pustaka independen, jendela waktu, status, ringkasan).
- SQL + RLS di PostgreSQL tiruan (PGlite), dijalankan dua kali.
- 60 pemeriksaan ujung-ke-ujung di Chromium: Supabase tiruan + Edge Function asli + layanan push tiruan (verifikasi VAPID & dekripsi) → `ServiceWorker.deliverPushMessage` → notifikasi tampil; izin ditolak; offline; sinkron dua arah dengan 3.3.
- Tangkapan layar 3.3 vs 3.4 (13 keadaan × desktop/HP × gelap/terang) + uji kontrol 3.3 vs 3.3; panel baru diperiksa dari luberan.
- **Belum**: layanan push sungguhan dan Supabase asli. Checklist ada di `supabase/PANDUAN-PASANG-3.4.md` bagian D.

### Catatan untuk versi berikutnya
- Bila ternyata dibutuhkan: tombol "Tunda 10 menit", pengingat untuk task beberapa hari yang sedang berjalan, atau pilihan per perangkat (mis. laptop hanya pengingat task). Infrastrukturnya sudah ada (log, langganan per perangkat).
- iPhone: aplikasi harus dipasang ke Home Screen dulu (iOS 16.4+).

## v3.4.x — Pengingat CKP (ditunda ke versi lain)
Target: bisa dipakai **sebelum akhir Triwulan IV (31 Desember 2026)**.
- Menjelang akhir triwulan: kegiatan KipApp yang belum ada bukti dukung (dan/atau belum dipilih IKI).
- Tinggal menambah satu jenis pesan di Edge Function `pengingat` dan satu bagian di panel 🔔. Tabel dan penjadwal yang ada bisa dipakai ulang.
- Pertanyaan terbuka: berapa hari sebelum akhir triwulan, seberapa sering, dan apa saja isinya.


## v3.5 — Reporting ✅

### Pertanyaan yang ingin dijawab
*"Bagaimana pola saya bekerja tiap hari? Terkadang saya merasa bekerja tetapi tidak efisien — apakah itu hanya perasaan, atau memang tidak produktif?"*
Dipakai untuk evaluasi pribadi; dibuka di laptop dan HP; tidak perlu diunduh/dicetak. Menu Reporting lama diganti seluruhnya.

### Cakupan (dipilih dari usulan)
1. ✅ Jumlah task selesai + perbandingan periode lalu.
2. ✅ Tren selesai per hari/minggu (pola harian).
3. ✅ Lewat tanggal.
4. ✅ Sebaran per project.
5. ✅ Tepat waktu %.
6. ✅ Hari aktif (pengganti angka jam kerja).
- ⏸️ Timer ▶/⏹ + perkiraan waktu: sempat dibangun dan lulus uji, lalu ditunda atas permintaan — terlalu berat mengubah kebiasaan sekaligus. Tanpa catatan waktu, laporan menunjukkan *apa* dan *kapan* selesai, belum *berapa lama* dikerjakan.
- ⏸️ Sebaran per IKI.
- ❌ Komposisi prioritas (task baru otomatis P4), hari paling produktif (butuh data berbulan-bulan), streak (cocok untuk 4.0 Teman), kesiapan CKP (sudah ada di hub CKP), tombol ke periode lalu.

### Diputuskan saat pengerjaan
- Rentang: Minggu ini (Min–Sab) / Bulan ini / Triwulan ini. Grafik per hari, kecuali Triwulan per minggu. Rentang terakhir diingat per perangkat (`barakarsa_laporan`).
- Pembanding = periode lalu **sampai titik yang sama**, supaya pertengahan periode tidak terlihat "turun".
- Task selesai sebelum 3.1 (`completedAt` null): tanggal task dipakai sebagai perkiraan, tidak dinilai tepat waktu. Task beberapa hari dihitung 1. Tepat waktu memakai tanggal saja.
- Reporting tidak mengikuti filter header. Grafik tanpa pustaka (HTML/CSS), warna dari `tema.css`.

### Checklist uji di HP asli
1. Menu ⋯ → Help menampilkan versi 3.5 di HP dan laptop.
2. Reporting: ganti Minggu/Bulan/Triwulan; pilihan tetap sama setelah aplikasi ditutup dan dibuka lagi.
3. Centang satu task hari ini → angka Task selesai dan batang hari ini bertambah.
4. Ketuk kartu *Lewat tanggal* → turun ke daftar; ketuk task → form terbuka.
5. Angka cocok dengan perasaanmu tentang minggu ini? (catat bila ada yang terasa janggal).

### Catatan untuk versi berikutnya
- Laporan makin bermakna setelah beberapa minggu, karena `completedAt` baru tercatat sejak 8 Okt 2026.
- Bila nanti ingin mengukur efisiensi (berapa lama dikerjakan), rancangan timer yang sempat dibangun di 3.5 (satu timer berjalan, bilah ⏱, tanya bila >3 jam, field `perkiraan` dan `sesi`) bisa dibangun ulang. Pilihan yang lebih ringan untuk memulai: hanya *perkiraan waktu* di form (tanpa timer), atau timer hanya untuk task KipApp.
- Kandidat lain: sebaran per IKI, ringkasan mingguan di ringkasan pagi Senin.


## v3.6 — Persona Bara ✅

Bagian pertama tema "Teman", dipecah dari v4.0 supaya bisa dicoba satu per satu.
Penomoran: fitur baru yang tidak mengganggu data dan perangkat lama → rilis minor (3.6), bukan 4.0.

### Cakupan (semua usulan dipilih)
1. ✅ **Sapaan sesuai waktu** di kartu Bara (Dashboard dan Today).
2. ✅ **Perayaan saat task dicentang**: kalimat + animasi ringan, ↶ Batal; Bara bersorak saat semua task Today beres.
3. ✅ **Rekap sore** di aplikasi dan sebagai notifikasi push (Edge Function 3.4).
4. ✅ **Dorongan Inbox** mulai 5 task belum dipilah.

### Diputuskan saat pengerjaan
- Rancangan dibahas dulu lewat halaman mockup (8 tangkapan layar dari aplikasi 3.5 + demo animasi + 4 konsep maskot SVG).
- **Wujud Bara: maskot buatan Naufal** (penyihir api bertopi, 8 pose), menggantikan keempat konsep usulan. Pose: pagi (sapaan pagi), siap (siang/sore), semangat (task dicentang, rekap tanpa sisa), rayakan (semua beres), berpikir (Today kosong, Inbox menumpuk), waktu (rekap masih ada sisa), ups (↶ Batal), santai (malam). Disimpan sebagai `.webp` transparan 256 px (±15–21 KB per pose).
- Nada **santai-akrab**, panggilan **Nopal**.
- Perayaan: **kalimat + animasi ringan** (setelah mencoba demo). Animasi mati bila perangkat diatur *kurangi gerakan*.
- **↶ Batal** di baris jejak: ya.
- Rekap sore: **15.55, Senin–Jumat**; jam dan hari bisa diubah di panel 🔔 (tersinkron). Rekap di aplikasi mengikuti jam & hari yang sama; notifikasinya bisa dimatikan sendiri.
- Persona **tidak bisa dimatikan** (ciri khas Barakarsa). Chip Inbox di Dashboard bisa ditutup ✕ untuk hari itu.
- Ketuk Bara → kalimat lain: ya.
- Daftar rekap (*Lihat rekap ▾*) hanya di Today; Dashboard cukup kalimatnya, supaya kartu di HP tidak terlalu tinggi.
- Di Today saat semua beres, kartu cukup menyapa ("5 dari 5 beres — semua sudah dicentang"); perayaan besarnya ada di Bara bersorak di bawahnya, supaya kata "tuntas" tidak berulang.
- Notifikasi rekap tidak dikirim bila hari itu tidak ada task Today dan tidak ada yang dicentang. Diklaim sekali per hari pada menit pertama, jadi task yang ditambah belakangan tidak memicu rekap terlambat.

### Cara uji yang dipakai
- Edge Function di Deno dengan Supabase tiruan + layanan push tiruan (pesan didekripsi): 8 kelompok uji rekap sore, ringkasan pagi 3.4 tetap sama, `deno check` bersih.
- Sinkron pengaturan 3.5/3.6 × server dengan/tanpa kolom sore.
- Tangkapan layar 3.5 vs 3.6: 13 layar yang tidak diubah × desktop/HP × gelap/terang identik per piksel (dengan uji kontrol 3.5 vs 3.5).
- 132 keadaan kartu Bara (11 situasi × 3 menu × desktop/HP × gelap/terang): tanpa luberan/terpotong.
- Langkah pemakaian yang sama di 3.5 dan 3.6 menghasilkan data sama; offline; *kurangi gerakan*.

### Checklist uji di HP asli
1. Menu ⋯ → Help menampilkan versi **3.6**; kartu Bara muncul di Dashboard dan Today dengan gambar maskot (juga saat offline).
2. Pagi/siang/sore/malam: sapaan dan pose berganti (cukup lihat sekilas di jam berbeda).
3. Centang task In Progress → kartu bergeser keluar, percik bara, baris hijau dengan kalimat; ketuk **↶ Batal** → task kembali.
4. Centang semua task Today → Bara bersorak menggantikan "No tasks for today".
5. Inbox ≥ 5 → chip kuning di Dashboard (✕ → hilang sampai besok) dan baris ajakan di Inbox.
6. Senin–Jumat 15.55: kartu berubah jadi rekap; di Today ketuk **Lihat rekap ▾**.
7. Setelah SQL 3.6 + Edge Function dipasang: notifikasi **🌇 Rekap sore** muncul di HP & laptop pukul 15.55; diketuk → Today dengan rekap terbuka.
8. Kalimat terasa pas, tidak mengganggu, tidak terlalu sering berulang? (catat yang janggal).

### Temuan selama pengerjaan (belum diubah)
- **Mencentang task Not Started tidak langsung menyelesaikannya**: centang pertama mengubah status ke *In Progress* (kotak tampak kosong lagi), centang kedua baru *Completed*. Perilaku ini sudah ada sejak sebelum 3.0 (`toggleStatus`) dan tidak diubah di 3.6. Bila memang tidak disengaja, bisa diperbaiki sebagai rilis kecil (centang = langsung Completed). Perayaan Bara hanya muncul saat task benar-benar Completed.

### Catatan untuk versi berikutnya
- Ambang dorongan Inbox (5) dievaluasi setelah dipakai beberapa minggu (`BARA_INBOX_MIN` di `js/bara.js`).
- Ide lanjutan: streak hari produktif (4.0), Bara di ringkasan pagi push, pose tambahan (mis. akhir pekan), kalimat khusus akhir triwulan CKP (bisa bersama 3.4.x).

## v3.6.1 — Nama Panggilan ✅
- Ditanyakan setelah 3.6 dipasang: aplikasi yang dibuka orang lain (tanpa login) ikut menyapa "Nopal".
- Diputuskan: nama diatur di **⋯ → 👤 Nama panggilan**, bawaan kosong (sapaan netral), tersinkron lewat `barakarsa_settings` (baris `bara`).
- Keamanan akun (dibahas bersamaan): matikan pendaftaran akun baru di Supabase (*Authentication → Sign In / Providers → Allow new users to sign up*), dan pastikan RLS aktif di `barakarsa_items`, `barakarsa_settings`, dan bucket `bukti-dukung`.

## v3.7 — Personalisasi ✅

### Latar belakang (temuan Naufal setelah beberapa hari memakai 3.6)
1. Angka Total/Active/Completed/Priority 1 di Dashboard kurang menggambarkan progres; Total yang terus naik menurunkan semangat. Priority terasa wajib padahal jarang perlu.
2. Upcoming jarang dibuka; yang sering dipakai justru Kalender di All Tasks.
3. Today jarang dibuka karena aplikasi selalu terbuka di Dashboard.
4. Ingin daftar task belum selesai terpisah, supaya Dashboard jadi tempat yang menyenangkan, menenangkan, dan nyaman untuk memulai hari.
5. Inbox jarang dipakai: task yang masuk biasanya sudah lengkap, jadi Inbox belum memenuhi tujuannya sebagai entri cepat. Fitur tangkap cepat tetap diinginkan.
6. Kolom Google Drive Link jarang terisi karena foto sudah bisa langsung diunggah.

### Cakupan
- **🏠 Beranda** (pengganti Dashboard): sampul ala Notion, kartu Bara di atas sampul, widget ☀️ Hari ini (jadi rekap sore), 🕰️ Jam analog/digital, 📅 Kalender kecil, 🔥 7 hari terakhir, 🎯 CKP Triwulan, 💬 Kutipan, 🖼️ Album; 🎨 Atur Beranda.
- **Menu baru**: Beranda · 📋 Belum selesai (berkelompok; pengganti All Tasks + Today + Upcoming + Inbox) · 📅 Kalender · Selesai · Reporting; Labels di bawah; bilah bawah di HP.
- **⚡ Tambah cepat** satu kalimat dengan pengenal tanggal/jam/#project/!prioritas/@label.
- Prioritas opsional (bawaan tanpa prioritas), kolom Drive disembunyikan.

### Diputuskan saat pengerjaan
- Rancangan dibahas dulu lewat halaman mockup interaktif (laptop/HP, gelap/terang, pagi–malam, sampul/latar penuh).
- **Penataan menu: setuju, dicoba dulu.**
- **Sampul (bukan latar penuh)**: teks tidak pernah berada di atas gambar, jadi tetap terbaca di kedua tema.
- **Gambar disimpan per perangkat** (IndexedDB `barakarsa_beranda`); HP dan laptop bisa beda. **4 sampul pixel-art bawaan** (pagi/siang/sore/malam) ikut aplikasi; bawaan *Ikut waktu*. Tidak memakai Supabase Storage, jadi tidak ada SQL dan kuota tidak terpakai.
- Mengikuti rekomendasi (tidak dijawab terpisah): angka Beranda = Hari ini / 7 hari terakhir / CKP; jam analog bawaan dengan pilihan digital dan sakelar detik; kutipan offline berganti tiap hari; prioritas bawaan kosong dengan badge hanya P1–P3; cuaca tidak dimasukkan (butuh internet).
- Kartu Bara tetap paling atas; pose Bara dipakai di widget Kutipan dan sorak di Hari ini.
- Sidebar hanya menghitung task lewat tanggal; jumlah Completed dihapus.
- Task Tambah cepat berstatus In Progress (sama dengan form), tanpa tanggal & project → Belum dipilah (`isInbox`).
- **Centang task Not Started langsung Completed?** Disetujui arahnya, tetapi **dibahas lagi nanti** (belum diubah di 3.7).

### Cara uji yang dipakai
- Pengurai Tambah cepat: 21 kasus unit (Node).
- 104 langkah pemakaian otomatis di Chromium, desktop dan HP.
- Tangkapan layar 3.6.1 vs 3.7 pada 9 layar yang tidak diubah × desktop/HP × gelap/terang (dengan uji kontrol): identik per piksel kecuali teks panel 🔔 yang memang diganti.
- 37 keadaan (4 waktu × perangkat × tema, menu baru, lebar 900 px): tanpa luberan/terpotong.
- Offline (46 file di cache), data 3.7 dibuka di 3.6.1, kecepatan buka di HP (CPU 4× lebih lambat): setara 3.6.1.

### Checklist uji di HP asli
1. Menu ⋯ → Help menampilkan versi **3.7** di HP dan laptop; aplikasi terbuka di **🏠 Beranda** dengan sampul dan Bara.
2. Lihat Beranda pagi, siang, sore, malam: sampul dan sapaan berganti; jam berjalan dengan zona **WITA**.
3. Centang task di kotak **Hari ini** → baris hijau + **↶ Batal**; semua beres → Bara bersorak di kotak itu.
4. Senin–Jumat ≥ 15.55: kotak berubah jadi **🌇 Rekap hari ini**; notifikasi rekap sore diketuk → Beranda.
5. Ketuk **➕** di bilah bawah, ketik *Rapat besok 13.30 #kerja !1* → chip muncul → Enter. Cek task-nya di **📋 Task** (kelompok Besok). Coba juga tekan lama ikon aplikasi → Tambah cepat.
6. Ketik judul tanpa tanggal/project → masuk **📥 Belum dipilah**; ketuk **📅 Hari ini** di task itu.
7. **📅 Kalender** di bilah bawah; **☰ Lainnya** membuka Selesai, Reporting, project, label.
8. 🎨 Atur Beranda: unggah foto sampul (geser posisinya), tambah 2–3 foto album, ganti jam digital, matikan satu widget. Tutup aplikasi lalu buka lagi: tetap. Laptop tidak ikut berubah (memang per perangkat).
9. Form task: Priority bawaan *Tanpa prioritas*; kolom Google Drive hanya muncul di task lama yang sudah punya link.
10. Perasaan saat membuka aplikasi pagi hari: lebih tenang? Widget mana yang tidak terpakai? Pengurai salah tebak kata apa? (catat untuk 3.7.1)

### Catatan untuk versi berikutnya
- Pengingat task (push, Edge Function 3.4) masih menulis "P4" untuk task lama ber-P4. Bisa dihapus dengan mengubah satu baris (`PRIORITY` tanpa `eliminate`) saat Edge Function dipasang ulang berikutnya (mis. bersama 3.4.x).
- Angka di samping nama project (sidebar) masih menghitung semua task termasuk yang selesai; bisa diganti jumlah yang belum selesai bila terasa mengganggu.
- Kolom Tambah cepat satu baris; kalimat panjang menggulir ke samping. Bila terasa sempit di HP, bisa diganti kotak yang memanjang.
- Ide lanjutan: sinkron sampul/album lewat Supabase Storage (bucket terpisah) bila nanti ingin sama di semua perangkat; pose Bara khusus akhir pekan; widget cuaca (perlu internet, dibahas dulu); streak hari aktif (4.0).

## v3.7.1 — Centang & kenyamanan ✅
Temuan Naufal setelah mencoba 3.7 (12 Okt 2026), dikerjakan hari yang sama:
1. Task Tambah cepat jangan langsung In Progress → kini **Not Started**; Belum dipilah tetap untuk task tanpa tanggal & project (dipilih dari tiga pilihan).
2. **Cari di menu Selesai.**
3. **Description lebih kecil** dari judul.
4. **Labels** pindah ke menu utama (di bawah Reporting).
5. **Centang task Not Started/On Hold/Cancelled → tanya** ✓ Selesai / ▶ Mulai kerjakan (dipilih dari: langsung Completed, tetap dua tahap, tanya). **Hapus centang → status sebelum dicentang** (field `statusLama`).

### Checklist uji di HP asli
1. Help menampilkan 3.7.1.
2. Tambah cepat *Beli tinta* → muncul di Belum dipilah sebagai Not Started; centang → pilihan muncul di dekat kotak; ✓ Selesai → baris hijau + ↶ Batal.
3. Centang task In Progress → langsung selesai tanpa pilihan.
4. Di ✅ Selesai: cari judul task, lalu hapus centangnya → kembali ke status semula.
5. Description di kartu task terlihat lebih kecil dari judul; 🏷️ Labels ada di bawah Reporting.

## v3.7.2 — Cara Kerja ✅
- Naufal meminta panduan pemakaian (kapan mencatat, kapan meninjau, perlu Reporting tiap minggu atau tidak). Disusun sebagai dokumen *Cara Kerja dengan Barakarsa* (nada santai-akrab, sejalan dengan Bara), lalu dimasukkan ke aplikasi supaya orang baru langsung terarah.
- Isi: pegangan, ritme harian (ringkasan pagi 5 menit, tangkap 10 detik, centang + foto, rekap sore 5 menit), Jumat sore 20 menit (Reporting, Lewat tanggal & Belum dipilah jadi nol, kalender minggu depan, CKP, backup), akhir bulan & triwulan, kebiasaan mengisi task, contekan Tambah cepat, tanda bahaya.
- Stress Test dihapus dari menu ⋯ (kode tetap ada).
- Bila isi panduan berubah (mis. fitur baru), perbarui `js/panduan.js` dan dokumen Cara Kerja bersamaan.

## v3.7.3 — Hasil uji coba 3.7 (bila diperlukan)
- Temuan uji coba Beranda, menu baru, Tambah cepat, dan pilihan centang di HP asli.
- Kandidat dari catatan 3.7: angka di samping nama project, kotak Tambah cepat yang memanjang di HP, "P4" di notifikasi pengingat task (Edge Function).

## v4.0 — Teman (perlu diskusi)
Disimpan sebagai **tonggak**: dipakai saat tema "Teman" terasa utuh (persona 3.6 + personalisasi 3.7 + AI), atau bila ada perubahan yang mewajibkan semua perangkat diperbarui (mis. bentuk data/sinkron berubah).
- Persona Bara → selesai di 3.6; personalisasi → selesai di 3.7 (Beranda, sampul, widget, album per perangkat). Streak hari produktif (ditunda dari 3.5) bisa menyusul di sini.
- "✨ Bantu tulis" description dengan AI, lewat Supabase Edge Function (kunci API tidak boleh di kode publik). Bisa melanjutkan saran keterangan 3.3 (riwayat + kalimat dasar) menjadi kalimat yang lebih luwes.
- (Opsional) Pindah dari skrip biasa ke ES module. File sudah terpecah sejak 3.2.1; yang tersisa adalah mengganti `onclick="..."` di HTML dengan event listener.


## Ide yang ditunda
- Impor katalog IKI format .xlsx (sheet IKI + Penugasan + Padanan; contoh sudah dibuat). Berguna untuk pohon kinerja tahun depan atau bila pegawai lain ikut memakai Barakarsa.
- IKI Ketua Tim/PJ sebagai pilihan di task.
- Tombol "Tunda" di notifikasi pengingat (3.4).
- Sebaran kerja (jam dan task) per IKI di Reporting (3.5).
- Timer ▶/⏹ dan perkiraan waktu (dibangun di 3.5, ditunda): untuk mengukur berapa lama pekerjaan dikerjakan.

---

## Catatan arsitektur
- Tetap GitHub Pages + Supabase. Tidak perlu server sendiri; kebutuhan sisi server (push, AI) memakai Supabase Edge Functions.
- Pantau kapasitas di Supabase Dashboard → Organization → Usage. Yang paling cepat tumbuh adalah foto bukti dukung. Penjadwal pengingat memanggil Edge Function ±43.200 kali per bulan.
- Tema memakai variabel CSS di `css/tema.css`: `:root` (gelap) dan `:root[data-theme="light"]` (terang). Warna baru ditambahkan di sana untuk kedua mode, lalu dipakai lewat `var(--…)`.
- Peta file, alur data, dan aturan menambah kode ada di `ARSITEKTUR.md` di repo. File baru di `css/` atau `js/` wajib didaftarkan juga di `ASSETS` dalam `sw.js`, dan `CACHE_NAME` dinaikkan setiap rilis.
- Katalog IKI: `entries` = penugasan (dibaca versi lama), `lain` = IKI tim lain (sejak 3.3). Rincian di `ARSITEKTUR.md`.
- Pengingat (sejak 3.4): berkas Supabase ada di folder `supabase/` di repo (tanpa rahasia), dan langkah pemasangannya di `supabase/PANDUAN-PASANG-3.4.md`.
- Reporting (sejak 3.5): dihitung di perangkat dari task yang ada (`js/laporan.js`), tanpa data baru. Alurnya di `ARSITEKTUR.md`.
- Persona Bara (sejak 3.6): `js/bara.js` + `css/bara.css` + gambar di `maskot/`. Kalimat dari data di perangkat; rekap sore push lewat Edge Function `pengingat` (kolom `sore_*`). Langkah pasang di `supabase/PANDUAN-PASANG-3.6.md`.
- Beranda & menu (sejak 3.7): `js/beranda.js` + `css/beranda.css` + `sampul/`; Tambah cepat di `js/cepat.js` + `css/cepat.css`. Gambar Beranda per perangkat di IndexedDB `barakarsa_beranda` (terpisah dari foto bukti dukung). Id menu internal tetap (`dashboard` = Beranda, `all` = Belum selesai).
