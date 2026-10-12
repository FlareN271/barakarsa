# BARAKARSA — Changelog

Catatan rilis Barakarsa. Versi terbaru di atas.
Rencana versi berikutnya ada di `ROADMAP.md`.

Format setiap rilis: **Baru** (fitur baru), **Diubah** (perilaku yang berubah), **Diperbaiki** (bug). Versi perawatan boleh memakai **Dibuang** dan **Diuji**.

---

## [3.7.2] — Cara Kerja (12 Oktober 2026)

File yang berubah: `index.html`, `sw.js` (cache `barakarsa-v3.7.2`), `js/main.js` (nomor versi, menu ⋯), `css/hp.css`, `ARSITEKTUR.md`, `CHANGELOG.md`, `ROADMAP.md`.
File baru: `js/panduan.js`, `css/panduan.css`.
Supabase: tidak ada perubahan.

### Baru
- **📖 Cara Kerja Barakarsa** di dalam aplikasi: pegangan, ritme harian (pagi, saat ada tugas, setiap beres, sore, malam), Jumat sore, akhir bulan & triwulan, kebiasaan mengisi task, contekan Tambah cepat, dan tanda bahaya. Bagian bisa dilipat; jam pagi dan sore mengikuti pengaturan 🔔. Ada tombol *⚡ Coba Tambah cepat*.
- Dibuka dari **⋯ → Lainnya → 📖 Cara kerja Barakarsa** dan tombol di atas Help. Di perangkat yang belum punya task (pengguna baru), panduan tampil **sekali** saat aplikasi pertama dibuka.

### Diubah
- **🧪 Stress Test** dihapus dari menu ⋯ (alat uji pengembangan, tidak dipakai sehari-hari). Kodenya tetap ada dan bisa dibuka lewat konsol browser (`openStressTestModal()`) bila suatu saat diperlukan.

### Catatan kompatibilitas
- Satu kunci localStorage per perangkat: `barakarsa_panduan` (`'1'` = panduan sudah pernah dibuka). Tidak ada perubahan data task atau sinkron.

### Diuji
- 36 pemeriksaan × desktop/HP × gelap/terang: panduan tampil sekali untuk pengguna baru dan tidak muncul lagi; tidak muncul sendiri bila sudah ada task; Stress Test hilang dari menu; tombol di Help; jam ikut pengaturan; semua bagian dibuka tanpa luberan; tombol Coba Tambah cepat; tanpa error.
- Uji alur 3.7 (104) dan 3.7.1 (92) tetap lulus.

---

## [3.7.1] — Centang & kenyamanan (12 Oktober 2026)

File yang berubah: `index.html`, `sw.js` (cache `barakarsa-v3.7.1`), `js/main.js` (nomor versi), `js/form-task.js`, `js/cepat.js`, `js/bara.js`, `js/tampilan.js`, `css/komponen.css`, `css/beranda.css`, `ARSITEKTUR.md`, `CHANGELOG.md`, `ROADMAP.md`.
Supabase: tidak ada perubahan.

### Baru
- **Mencentang task Not Started, On Hold, atau Cancelled** memunculkan pilihan kecil di dekat kotak centang: **✓ Selesai** atau **▶ Mulai kerjakan** (*Kerjakan lagi* untuk On Hold/Cancelled). Esc atau ketuk di luar = batal. Task In Progress tetap langsung selesai dengan satu centang. Berlaku di Belum selesai, kotak Hari ini, dan Selesai.
- **Hapus centang** mengembalikan task ke **status sebelum dicentang** (Not Started tetap Not Started, On Hold tetap On Hold). Task yang selesai sebelum 3.7.1 kembali ke In Progress seperti dulu.
- **🔍 Cari di menu Selesai** (judul dan description).

### Diubah
- Task dari **Tambah cepat** kini berstatus **Not Started** (sebelumnya In Progress). Masuk 📥 Belum dipilah bila tanpa tanggal dan project, seperti 3.7.
- **Description di kartu task lebih kecil** (0,8 rem; judul tetap 1,05 rem), supaya judul dan description mudah dibedakan.
- **Labels** pindah ke menu utama sidebar, tepat di bawah Reporting (sebelumnya di dasar sidebar, perlu menggulir bila project banyak).
- Menyimpan task menjadi Completed dari form juga mencatat status sebelumnya.

### Catatan kompatibilitas
- Satu field task baru, **`statusLama`**: status sebelum dicentang, hanya ada selama task Completed (dibuang saat centang dihapus atau ↶ Batal). Perangkat lama membawanya apa adanya (`...task lama`) dan tetap sinkron; di perangkat lama, hapus centang tetap mengembalikan ke In Progress.

### Diuji
- 92 pemeriksaan 3.7.1 × desktop/HP × gelap/terang: Tambah cepat → Not Started; pilihan muncul, kotak centang kembali kosong, pilihan selalu di dalam layar, Esc; Mulai kerjakan tanpa perayaan; Selesai + perayaan + ↶ Batal; In Progress langsung; On Hold "Kerjakan lagi"; hapus centang kembali ke On Hold / In Progress / task lama; form → Completed; kotak Hari ini di Beranda; cari di Selesai (ada hasil / tanpa hasil); ukuran description; urutan sidebar; tanpa luberan dan error.
- 104 langkah uji alur 3.7 tetap lulus.
- Tangkapan layar 3.7 vs 3.7.1: Reporting, Labels, Kalender, Board, hub CKP, panel 🔔, Nama panggilan, form task identik per piksel; Selesai berbeda karena kotak cari baru.

---

## [3.7] — Personalisasi (12 Oktober 2026)

File yang berubah: `index.html`, `sw.js` (cache `barakarsa-v3.7`), `manifest.json` (teks shortcut), `js/main.js` (nomor versi, menu), `js/tampilan.js`, `js/form-task.js`, `js/pwa.js`, `js/bara.js`, `js/pengingat.js` (dua kalimat panel), `css/komponen.css`, `css/bara.css`, `css/hp.css`, `ARSITEKTUR.md`, `CHANGELOG.md`, `ROADMAP.md`.
File baru: `js/beranda.js`, `js/cepat.js`, `css/beranda.css`, `css/cepat.css`, folder `sampul/` (4 sampul pixel-art, ±3 KB per gambar).
Supabase: **tidak ada perubahan**. Edge Function tidak perlu dipasang ulang.

### Baru
- **🏠 Beranda** menggantikan Dashboard, sebagai tempat memulai hari:
  - **Sampul** di atas (gaya Notion). Bawaan: 4 sampul pixel-art yang berganti mengikuti waktu (pagi, siang, sore, malam). Bisa juga dikunci ke satu suasana, atau **unggah foto sendiri** (dikompres ke sisi terpanjang 1920 px, ±150–300 KB; posisi foto bisa digeser).
  - **Kartu Bara** tetap paling atas. Bara menyembul dari tepi bawah sampul.
  - **☀️ Hari ini**: task bertanggal hari ini dalam cincin *"1 dari 3 beres"*, bisa dicentang langsung (jejak hijau + ↶ Batal tetap ada), *＋ Tambah untuk hari ini*, dan *✓ n dicentang hari ini ▾*. Mulai jam rekap sore, kotak ini menjadi **🌇 Rekap hari ini**, dan Bara bersorak di sini saat semua beres.
  - **🕰️ Jam** analog (atau digital), dengan zona waktu (WIB/WITA/WIT) dan tanggal. Jarum detik bisa dimatikan.
  - **📅 Kalender kecil**: titik di tanggal yang ada task-nya. Ketuk tanggal untuk melihat daftarnya, ketuk judul bulan untuk membuka menu Kalender.
  - **🔥 7 hari terakhir**: jumlah task selesai dan batang per hari, plus *"Aktif n dari 7 hari"*.
  - **🎯 CKP Triwulan**: IKI yang sudah ada kegiatannya (atau jumlah kegiatan CKP bila katalog belum diimpor), sisa hari triwulan, dan chip *📷 belum ada bukti* / *🎯 belum ada IKI*.
  - **💬 Kutipan** yang berganti tiap hari (peribahasa dan kalimat Bara, tanpa internet); ↻ untuk kutipan lain.
  - **🖼️ Album**: sampai 12 foto (dikompres 1280 px). Foto utama berganti tiap hari; ketuk untuk memperbesar, geser, atau hapus.
- **🎨 Atur Beranda** (tombol di sampul, atau ⋯ → Tampilan): pilih sampul, gaya jam, detik, dan nyala/mati tiap widget.
- **📋 Belum selesai**: semua task yang belum dicentang, dikelompokkan menjadi 📥 Belum dipilah · ⚠️ Lewat tanggal · Hari ini · Besok · 7 hari ke depan · Nanti · Tanpa tanggal · ❌ Dibatalkan. List/Board, cari, filter, urutkan, dan seret urutan tetap ada. Task Belum dipilah punya tombol **📅 Hari ini · Besok · Lengkapi…**.
- **⚡ Tambah cepat** (pengganti Inbox cepat): satu kalimat, misalnya *Rapat SE2026 besok 13.30 #kerja !1*. Yang dikenali: tanggal (hari ini, besok, lusa, nama hari, *jumat depan*, *tgl 15*, *15 okt*, *15/10*), jam (*13.30*, *jam 9*, *pukul 9.15*), *#project*, prioritas *!1–!3* atau *p1–p3*, dan *@label*. Hasilnya tampil sebagai chip; ✕ membatalkan tebakan yang salah. Enter menyimpan; **Detail…** membuka form lengkap yang sudah terisi. Dibuka dari tombol Tambah task, ➕, tombol **Q**, bilah ⚡ di Belum selesai, *＋ Tambah untuk hari ini*, dan tekan lama ikon aplikasi.
- **📅 Kalender** jadi menu sendiri (sebelumnya tombol di All Tasks).
- **HP: bilah bawah** Beranda · Task · ➕ · Kalender · ☰ Lainnya (Lainnya membuka sidebar: Selesai, Reporting, project, label, dst.).

### Diubah
- **Sidebar**: Beranda · Belum selesai · Kalender · Selesai · Reporting, lalu My Projects; Labels pindah ke bawah. **Inbox, Today, dan Upcoming dilebur**: isinya kini ada di Belum selesai dan kotak Hari ini.
- **Angka Total / Active / Completed / Priority 1 dihapus.** Pengganti di Beranda hanya memakai angka yang bisa "habis" (hari ini) atau hanya bertambah karena kerja (7 hari terakhir, CKP). Sidebar hanya menghitung task **lewat tanggal** (kuning); jumlah di menu Completed dihapus.
- **Prioritas**: bawaan form kini **— Tanpa prioritas**; pilihan P1–P3. Badge ⚑ hanya untuk P1–P3. Task lama ber-P4 diperlakukan sebagai tanpa prioritas (datanya tidak diubah sampai task itu disimpan lagi). Filter *Priority 4* menjadi *Tanpa prioritas*.
- **Google Drive Link** hilang dari form, kecuali task lama yang sudah punya link (tetap bisa dibuka, diubah, atau dihapus). Badge 🔗 dan ekspor CSV tetap.
- Klik project di sidebar membuka **Belum selesai** khusus project itu (sebelumnya Dashboard).
- Task dari Tambah cepat berstatus **In Progress** (sama dengan bawaan form), jadi satu centang langsung menyelesaikannya. Task Not Started lama masih perlu dua centang (lihat ROADMAP, ditunda untuk dibahas).
- Notifikasi ringkasan pagi dan rekap sore (`?view=today`) membuka **Beranda**; shortcut ikon aplikasi (`?quick=1`) membuka **Tambah cepat**.
- Chip Bara di Beranda: *"📥 n belum dipilah →"* (membuka Belum selesai). Ajakan memilah tampil di atas Belum selesai. Kalimat yang menyebut "Today" atau "Inbox" disesuaikan.
- Peringatan *"n kegiatan CKP selesai tanpa bukti dukung"* pindah dari Dashboard ke atas Belum selesai (dan chip di widget CKP).
- Panel 🔔: "Daftar task Today" → "Daftar task hari ini"; rekap sore menyebut kotak Hari ini.

### Dibuang
- Kartu statistik Dashboard, kolom Inbox cepat, tombol *Lihat rekap ▾* di Today (CSS dan JS-nya ikut dihapus).

### Catatan kompatibilitas
- **Tidak ada field task, tabel, bucket, atau baris pengaturan baru.** Data task dari Tambah cepat memakai bentuk yang sama dengan form (`isInbox` tetap dipakai untuk Belum dipilah).
- Perangkat 3.6.1 tetap sinkron: task dari 3.7 muncul di Inbox/Today/Upcoming-nya seperti biasa; task tanpa prioritas dibuka sebagai P4 di form lama.
- Sampul unggahan, album, dan pengaturan Beranda **hanya di perangkat ini** (IndexedDB `barakarsa_beranda`, localStorage `barakarsa_beranda`), tidak tersinkron dan tidak memakai kuota Supabase. Foto bukti dukung tetap di `barakarsa_photos` / bucket `bukti-dukung`, tidak tercampur.
- Bila data situs dihapus browser, sampul kembali ke bawaan dan album kosong; data task tidak terpengaruh.

### Diuji
- **Pengurai Tambah cepat**: 21 kasus (besok/lusa, nama hari, *jumat depan*, *minggu ini* tidak dianggap hari Minggu, *tgl 3* yang sudah lewat → bulan depan, *5 jan* → tahun depan, *15/10*, jam bebas/`jam 9`/`pukul`, versi *3.6* tidak dianggap jam, #project/@label tidak dikenal dibiarkan, ✕ chip).
- **104 langkah pemakaian** di Chromium (desktop dan HP): centang di Hari ini → jejak + Batal; semua beres → Bara bersorak tanpa dobel di kartu; Tambah cepat (Q / ➕), chip, Enter, Belum dipilah, ✕, Esc, Detail… (kolom IKI & 🔔 ikut tampil); form: prioritas kosong, P4 lama, Drive link; kelompok Belum selesai, tombol pilah, cari, Board, jejak; project → Belum selesai; Kalender; tautan lama `today`/`inbox`/`?view=today&rekap=1`/`?quick=1`; Atur Beranda (jam digital, widget mati, unggah sampul 4000×2500 → <400 KB, album 3 foto, perbesar, hapus 2× ketuk); muat ulang (sampul, album, pengaturan tetap); IndexedDB bukti dukung tidak tersentuh; ☰ Lainnya di HP. Tanpa error JavaScript.
- **Tampilan 3.6.1 vs 3.7** pada layar yang tidak diubah (Reporting, Selesai, Labels, Board, hub CKP, panel 🔔, Nama panggilan, form task kiri) × desktop/HP × gelap/terang: **identik per piksel**, kecuali dua kalimat panel 🔔 yang memang diganti. Kalender: ukuran baris sama persis; selisih 1–2 px karena kini berada di menu sendiri (posisi sub-piksel). Uji kontrol 3.6.1 vs 3.6.1 untuk menyaring derau.
- **37 keadaan** Beranda pagi/siang/sore/malam, Belum selesai, Tambah cepat, Atur Beranda, Kalender × desktop/HP × gelap/terang, plus lebar 900 px: tanpa isi yang meluber, terpotong, atau halaman melebar.
- **Offline**: 46 file (termasuk 4 sampul dan file baru) tersimpan di cache; Beranda, maskot, dan sampul tampil tanpa jaringan; Tambah cepat menyimpan.
- **Kecocokan**: data 3.7 dibuka di 3.6.1 tanpa error (semua menu lama).
- **Kecepatan buka di HP** (CPU diperlambat 4×, 340 task, median 5 kali): tampilan pertama 3.6.1 312 ms, 3.7 332 ms. Gambar unggahan dimuat setelah tampilan pertama.
- Belum diuji di HP asli.

---

## [3.6.1] — Nama Panggilan (12 Oktober 2026)

File yang berubah: `index.html`, `sw.js` (cache `barakarsa-v3.6.1`), `js/main.js` (nomor versi, menu), `js/bara.js`, `js/sinkron.js`, `css/bara.css`, `ARSITEKTUR.md`, `CHANGELOG.md`, `ROADMAP.md`.
Supabase: tidak ada perubahan (nama memakai tabel `barakarsa_settings` yang sudah ada).

### Baru
- **⋯ → 👤 Nama panggilan**: nama yang dipakai Bara untuk menyapa, maksimal 20 huruf, dengan contoh sapaan langsung di kotak isian. **Kosongkan** → sapaan tanpa nama.
- Nama **tersinkron** ke perangkat lain setelah masuk akun (baris `id = 'bara'` di `barakarsa_settings`; yang terakhir diubah menang).

### Diubah
- Bila pendaftaran akun baru dimatikan di Supabase, tombol *Daftar akun baru* kini menampilkan "Pendaftaran akun baru sedang ditutup." (sebelumnya pesan Inggris dari server).
- **Bawaan kini tanpa nama.** Sebelumnya "Nopal" tertulis tetap di kode, sehingga siapa pun yang membuka Barakarsa disapa "Nopal". Kini sapaan netral ("Pagi!", "Selamat sore 🌇", "Gas terus!") sampai nama diisi. Di perangkatmu, isi sekali saja; perangkat lain mengikuti setelah sinkron.

### Catatan kompatibilitas
- Perangkat 3.6 dan lebih lama mengabaikan baris `bara` di `barakarsa_settings` (hanya membaca katalog, profil, catatan), jadi tetap sinkron seperti biasa. Perangkat 3.6 tetap menyapa "Nopal" sampai diperbarui.

### Diuji
- Tanpa nama, isi nama (spasi dirapikan), muat ulang, kosongkan, nama berisi `<b>` (tampil apa adanya), sinkron tarik/kirim dengan server tiruan; perayaan, Batal, dan offline tetap jalan.

---

## [3.6] — Persona Bara (12 Oktober 2026)

File yang berubah: `index.html`, `sw.js` (cache `barakarsa-v3.6`), `js/main.js` (nomor versi), `js/tampilan.js`, `js/form-task.js`, `js/pwa.js`, `js/pengingat.js`, `css/tema.css`, `css/hp.css`, `css/pengingat.css`, `supabase/functions/pengingat/index.ts`, `ARSITEKTUR.md`.
File baru: `js/bara.js`, `css/bara.css`, folder `maskot/` (8 pose, `.webp`), `supabase/03-rekap-sore.sql`, `supabase/PANDUAN-PASANG-3.6.md`.
Supabase: 3 kolom baru di `barakarsa_pengingat` (`sore_on`, `sore_jam`, `sore_hari`) dan Edge Function `pengingat` dipasang ulang. Tidak ada tabel baru.

### Baru
- **Bara, maskot Barakarsa** (gambar buatan Naufal, 8 pose: pagi, siap, semangat, rayakan, berpikir, waktu, ups, santai). Pose dipilih sesuai keadaan.
- **Kartu Bara di Dashboard dan Today**: sapaan sesuai waktu (pagi 04.00–10.59, siang 11.00–14.59, sore 15.00–18.29, malam 18.30–03.59) dan keadaan hari ini, mis. *"Pagi, Nopal! — 4 task hari ini, pertama jam 09.00"* atau *"2 dari 5 beres. Sisa 3, pelan-pelan aja."* Today kosong: menyarankan Inbox atau task lewat tanggal. Malam: menutup hari, tidak menyuruh lanjut kerja. Kalimat berganti sendiri saat pergantian waktu tanpa perlu membuka ulang aplikasi.
- **Perayaan saat task dicentang**: kartu task bergeser keluar, percik bara naik dari kotak centang, lalu di tempatnya muncul baris hijau berisi kalimat Bara selama ±5 detik. Kalimat khusus didahulukan bila cocok: task KipApp tanpa foto (*"Jangan lupa foto bukti dukungnya 📷"*), task lewat tanggal, P1, tinggal satu, 3 centang dalam 10 detik, dan malam hari.
- **↶ Batal** di baris hijau mengembalikan task ke status sebelumnya (salah ketuk).
- **Semua task Today beres**: Bara bersorak menggantikan "No tasks for today", dengan jumlah task dan jam centang terakhir. Animasi soraknya sekali per hari per perangkat.
- **Rekap sore** mulai **15.55, Senin–Jumat** (jam dan hari bisa diubah): kartu Bara berisi *"Rekap sore: 3 beres ✓ · 2 tersisa"*; di Today ketuk **Lihat rekap ▾** untuk daftar yang beres hari ini (termasuk task lama yang baru dicentang) dan yang masih tersisa.
- **🌇 Notifikasi rekap sore** dari Edge Function 3.4, misalnya *"🌇 Rekap sore · 3 beres, 2 tersisa"* dengan daftar yang tersisa. Diketuk → Today dengan rekap terbuka. Tidak dikirim bila hari itu tidak ada task Today dan tidak ada yang dicentang. Diatur di ⋯ → 🔔 Pengaturan pengingat, bagian baru **🌇 Rekap sore** (sakelar, jam, hari; tersinkron ke semua perangkat).
- **Dorongan Inbox** saat ≥ 5 task belum dipilah: chip *"📬 Inbox: 6 menunggu dipilah →"* di kartu Dashboard (✕ menyembunyikannya sampai besok) dan satu baris ajakan di atas daftar Inbox.
- **Ketuk Bara** → kalimat lain dan Bara melompat.
- Panduan Singkat (Help) menjelaskan Bara.

### Diubah
- Dashboard dan Today diawali kartu Bara (±90 px di desktop, ±75 px di HP). Saat melihat satu project, kartu tidak tampil.
- Mencentang task (dan menyimpan task menjadi Completed dari form) menunggu ±0,3 detik sebelum daftar digambar ulang, untuk animasi keluar. Data tersimpan seketika.

### Aturan (diputuskan saat diskusi)
- Nada santai-akrab, panggilan **Nopal**. Persona selalu aktif (tidak ada sakelar), karena dimaksudkan sebagai ciri khas Barakarsa. Yang bisa dimatikan hanya notifikasi rekap sore.
- Perayaan memakai kalimat **dan** animasi ringan (tanpa suara, tanpa konfeti satu layar, ±1 detik). Bila perangkat diatur *kurangi gerakan*, yang tampil hanya kalimat.
- Kalimat dari data di perangkat (tanpa AI, jalan offline). Sapaan tetap sama selama sesi untuk situasi yang sama; kalimat perayaan tidak mengulang 3 kalimat terakhir.
- Hitungan Bara: *task hari ini* = bertanggal hari ini selain Cancelled; *beres hari ini* = dicentang hari ini apa pun tanggal task-nya.
- Dorongan Inbox mulai 5 task (satu konstanta `BARA_INBOX_MIN`, mudah diubah).

### Catatan kompatibilitas
- Tidak ada field task, tabel, atau bucket baru. Satu kunci localStorage baru per perangkat: `barakarsa_bara` (3 kalimat terakhir, tanggal chip Inbox ditutup, tanggal perayaan besar).
- Perangkat 3.4/3.5 tetap sinkron. Saat menyimpan pengaturan pengingat, mereka hanya mengirim kolom yang mereka kenal, jadi pengaturan rekap sore tidak tertimpa. Notifikasi rekap sore yang diketuk di perangkat 3.5 membuka Today biasa.
- Aplikasi 3.6 aman dipasang sebelum SQL 3.6 dijalankan: rekap di aplikasi tetap jalan, pengaturan lain tetap tersimpan (kolom sore dilewati), dan panel 🔔 memberi tahu langkah yang kurang. Edge Function 3.6 juga aman dipasang sebelum SQL: rekap sore dilewati, pengingat task dan ringkasan pagi tetap jalan.
- Reporting 3.5 tidak diubah.

### Diuji
- **Edge Function di Deno** dengan Supabase tiruan dan layanan push tiruan (pesan didekripsi): rekap tepat 15.55 WITA dan tidak dobel; 15.54, lewat 2 jam, Sabtu, dan sakelar mati tidak mengirim; jam/hari lain dari pengaturan; task lama yang dicentang hari ini ikut, yang dicentang 23.30 kemarin tidak; hari kosong tidak dikirim dan task yang ditambah belakangan tidak memicu rekap terlambat; kolom belum ada → pengingat task tetap jalan; ringkasan pagi 3.4 tidak berubah. Pemeriksaan tipe (`deno check`) bersih.
- **Sinkron pengaturan pengingat** 3.5 dan 3.6 × server dengan/tanpa kolom sore: tidak ada yang tertimpa; 3.6 menyimpan ulang tanpa kolom sore bila kolomnya belum ada.
- **Tampilan 3.5 vs 3.6** di 13 layar yang tidak diubah (Inbox < 5, Upcoming, All Tasks List/Board/Kalender, Completed, Labels, Reporting, form task baru/edit, menu ⋯, Help bagian atas, hub CKP) × desktop/HP × gelap/terang: **identik per piksel** (selain derau di tombol ⋯ dan tepi gulir yang juga muncul di uji kontrol 3.5 vs 3.5).
- **Kartu Bara** di 11 keadaan (06.30, 12.10, 15.20, 16.10, 16.10 rekap terbuka, 19.30, Today kosong, tuntas siang/malam, Sabtu, judul panjang + 46 Inbox) × Dashboard/Today/Inbox × desktop/HP × gelap/terang = 132 keadaan: tidak ada isi yang meluber, terpotong, atau membuat halaman melebar; tanpa error JavaScript.
- Langkah pemakaian yang sama di 3.5 dan 3.6 (centang, centang task Not Started, form → Completed, buka lagi di Completed, Inbox cepat, duplikat): data tersimpan sama.
- Centang → jejak → ↶ Batal (status kembali, `completedAt` terhapus); centang semua Today → Bara bersorak; pergantian 10.59 → 11.00 dan 15.54 → 15.55 tanpa memuat ulang; *kurangi gerakan* tanpa percik; offline: 38 file termasuk 8 pose maskot tersimpan di cache dan aplikasi terbuka tanpa jaringan.
- Belum diuji di HP asli dan dengan Supabase/layanan push sungguhan (checklist di `supabase/PANDUAN-PASANG-3.6.md` bagian D).

---

## [3.5] — Reporting (9 Oktober 2026)

File yang berubah: `index.html`, `sw.js` (cache `barakarsa-v3.5`), `js/main.js` (nomor versi), `js/tampilan.js`, `css/tampilan.css`, `css/hp.css`, `ARSITEKTUR.md`.
File baru: `js/laporan.js`, `css/laporan.css`.
Supabase: tidak ada perubahan.

### Baru
- **Reporting baru** dengan pilihan **Minggu ini / Bulan ini / Triwulan ini** (pilihan terakhir diingat per perangkat):
  1. **Angka utama**: Task selesai (dibanding periode lalu *pada titik yang sama*, mis. Min–Jum pekan lalu), Hari aktif (hari yang ada task selesai, dan rata-rata task per hari itu), Tepat waktu %, dan Lewat tanggal (diketuk → daftar).
  2. **Task selesai per hari** (per minggu untuk Triwulan): tepat waktu, terlambat, tanpa tanggal, dan waktu selesai tidak tercatat (arsir).
  3. **Sebaran per project** (jumlah dan persentase task selesai).
  4. **Lewat tanggal**: task belum selesai yang tanggalnya sudah lewat, terlama dulu (diketuk → form task).
- Panduan Singkat (Help) menjelaskan Reporting.

### Diubah
- **Menu Reporting lama diganti seluruhnya** (Completion Rate, This Week Done, Prioritas Terbanyak, Avg Completion). Reporting tidak lagi mengikuti filter header.

### Aturan hitung (diputuskan saat diskusi)
- Task selesai masuk periode menurut `completedAt` (tanggal lokal). Task yang selesai sebelum 3.1 (`completedAt` kosong) memakai tanggalnya sebagai perkiraan dan **tidak dinilai** tepat waktu/terlambat; yang juga tanpa tanggal tidak dihitung (disebut di catatan).
- Tepat waktu = tanggal selesai ≤ "Sampai tanggal" (atau Date bila tidak ada). Jam task tidak dipakai. Cancelled tidak dihitung di mana pun.
- Task beberapa hari dihitung 1 task.

### Tidak dipakai (diputuskan saat diskusi)
- **Timer ▶/⏹ dan perkiraan waktu** sempat dibangun lalu **ditunda**: mengubah kebiasaan dari jarang mencatat menjadi menekan timer di setiap kegiatan dirasa terlalu berat untuk saat ini.
- Sebaran per IKI (ditunda), komposisi prioritas, hari paling produktif, streak, kesiapan CKP (sudah ada di hub CKP), dan tombol ke periode lalu.

### Catatan kompatibilitas
- Tidak ada field task, tabel, atau bucket baru. Satu kunci localStorage baru per perangkat: `barakarsa_laporan` (rentang terakhir). Perangkat 3.4 dan 3.3 tetap sinkron seperti biasa; pengingat 3.4 tidak terpengaruh.

### Diuji
- Tangkapan layar 3.4 vs 3.5 di 15 keadaan × desktop/HP × gelap/terang: semua layar selain Reporting **identik per piksel** (Dashboard, Inbox, Today, Upcoming, All Tasks List/Board/Kalender, Completed, Labels, form task baru/edit, menu ⋯, Help bagian atas, hub CKP).
- Reporting di 3 rentang × desktop/HP × gelap/terang: tidak ada isi yang meluber atau keluar layar, tanpa error JavaScript.
- Belum diuji di HP asli (checklist di ROADMAP v3.5).

---

## [3.4] — Pengingat (9 Oktober 2026)

File yang berubah: `index.html`, `sw.js` (cache `barakarsa-v3.4`), `js/main.js` (nomor versi, menu), `js/sinkron.js`, `js/form-task.js`, `js/pwa.js`, `ARSITEKTUR.md`.
File baru: `js/pengingat.js`, `css/pengingat.css`, `icon-badge.png`, folder `supabase/` (`01-tabel-pengingat.sql`, `02-penjadwal.sql`, `functions/pengingat/index.ts`, `buat-kunci.html`, `PANDUAN-PASANG-3.4.md`).
Supabase: 3 tabel baru (`barakarsa_pengingat`, `barakarsa_push_langganan`, `barakarsa_push_log`, semuanya dengan RLS), Edge Function `pengingat`, dan penjadwal pg_cron tiap menit.

### Baru
- **Notifikasi push yang tetap muncul walau aplikasi ditutup**, dikirim server (Supabase Edge Function yang dipanggil penjadwal tiap menit) ke HP Android dan browser laptop (Edge/Chrome).
- **⏰ Pengingat per task**: task bertanggal dan berjam diingatkan **5 menit sebelumnya** (bawaan). Pilihan per task lewat 🔔 di bawah kolom Time: *Ikuti bawaan*, *Saat waktunya*, 5/10/15/30 menit, 1 jam, atau *Tanpa pengingat*. Baris 🔔 hanya muncul setelah Time diisi. Isi notifikasi: "⏰ 09.30 · judul" dan "5 menit lagi · project · P2".
- **☀️ Ringkasan pagi** pukul **07.30 setiap hari**, berisi task Today (yang berjam dulu, lalu yang tanpa jam; maksimal 6 baris + "N task lainnya"). Task tanpa jam hanya diingatkan lewat ringkasan ini.
- **Panel ⋯ → 🔔 Pengaturan pengingat**: status perangkat ini (Aktif / Belum aktif / Diblokir / Belum masuk / tidak didukung), sakelar pengingat task dan ringkasan pagi, menit bawaan, jam dan hari ringkasan, daftar **Perangkat yang menerima** (bisa dilepas dengan ✕), **Matikan di perangkat ini**, dan **🧪 Kirim notifikasi uji**.
- Pengaturan pengingat **tersinkron ke semua perangkat** (cukup diubah sekali); aktivasi dilakukan per perangkat.
- Mengetuk notifikasi membuka aplikasi langsung di **form task itu** (pengingat task) atau di **Today** (ringkasan pagi), baik aplikasi sedang tertutup maupun terbuka.
- Ikon kecil Barakarsa di bilah status Android (`icon-badge.png`).
- Panduan Singkat (Help) menjelaskan Pengingat.

### Aturan pengiriman (diputuskan saat diskusi)
- Yang **tidak** diingatkan hanya task **Completed** dan **Cancelled**. Not Started, In Progress, dan On Hold tetap diingatkan, termasuk di ringkasan pagi. Ringkasan pagi = Today tanpa Cancelled.
- Ringkasan pagi dikirim ke **semua perangkat**, termasuk laptop.
- **Tanpa tombol Tunda**: notifikasi hanya bisa diketuk untuk membuka aplikasi.
- Pengingat CKP (bukti dukung menjelang akhir triwulan) **ditunda**.
- Batas waktu pesan: pengingat task masih dikirim sampai 10 menit setelah jamnya, dan layanan push menahannya bila perangkat offline sampai 30 menit setelah jam task. Ringkasan pagi dikirim sampai 4 jam setelah jamnya.
- Jam task diubah setelah pengingat terkirim → pengingat untuk jam baru tetap dikirim. Penjadwal yang terpanggil dua kali tidak mengirim pesan dobel.

### Keamanan & data
- **Rahasia tidak ada di repo.** Kunci VAPID privat dan rahasia penjadwal hanya di Supabase Secrets/Vault; kunci publik VAPID diambil aplikasi dari Edge Function. `buat-kunci.html` membuat kunci di browser tanpa mengirimnya ke mana pun.
- Langganan perangkat hanya ditulis lewat Edge Function; aplikasi hanya bisa membaca dan melepas perangkat miliknya. Catatan pesan terkirim hanya bisa diakses server.
- Server membaca task yang **sudah tersinkron** di `barakarsa_items`; tidak ada jadwal yang disimpan terpisah.
- Izin notifikasi ditolak: tidak ada yang dikirim ke server; panel menjelaskan cara membuka izin; aplikasi tetap berjalan normal.

### Diperbaiki
- Service worker tidak lagi menyajikan aplikasi untuk alamat di folder `supabase/`, sehingga halaman pembuat kunci bisa dibuka.

### Catatan kompatibilitas
- Kunci localStorage lama, IndexedDB, tabel `barakarsa_items`/`barakarsa_settings`, dan bucket tidak berubah. Ada satu kunci localStorage baru per perangkat (`barakarsa_pengingat`) dan satu *index* baru di `barakarsa_items` (data tidak berubah).
- Task kini bisa membawa field `ingat`. Perangkat 3.3 dan 3.2.3 tetap sinkron dan **tidak menghapus** field ini saat task disunting atau dicentang dari sana.
- Pengingat bergantung pada sinkron: task yang dibuat atau diselesaikan saat offline baru diperhitungkan setelah tersinkron.
- Laptop: notifikasi muncul selama Edge/Chrome berjalan (termasuk berjalan di latar belakang). iPhone: aplikasi harus dipasang ke Home Screen dulu.
- Aplikasi 3.4 aman dipasang sebelum Supabase disiapkan; panel 🔔 menampilkan pesan yang jelas sampai Edge Function terpasang.

### Diuji
- **Edge Function di Deno** (runtime yang sama dengan Supabase), 33 uji unit: enkripsi aes128gcm didekripsi pustaka independen (`http_ece`, yang dipakai `web-push`); waktu WITA; jendela pengingat (09.24 belum, 09.25 kirim, 09.41 lewat); lintas tengah malam; ingat 0/60/−1; status; isi dan urutan ringkasan; hari yang dipilih.
- **SQL di PostgreSQL tiruan**: dijalankan dua kali tetap aman; RLS menolak aplikasi menulis langganan, membaca log, atau menulis pengaturan akun lain.
- **60 pemeriksaan ujung-ke-ujung di Chromium** dengan Supabase tiruan, Edge Function asli, dan layanan push tiruan yang memverifikasi tanda tangan VAPID dan mendekripsi pesan, lalu meneruskannya ke service worker. Yang diperiksa: aktifkan, notifikasi uji, pengingat dan ringkasan dari penjadwal, tidak dobel, rahasia salah ditolak, jam diubah, klik notifikasi (aplikasi terbuka/tertutup), langganan 410 dibersihkan, sakelar/hari tersinkron, matikan/aktifkan lagi, izin ditolak, browser tanpa push, belum masuk, Edge Function belum dipasang, offline, dan sinkron dua arah dengan 3.3 (field `ingat` utuh).
- Tangkapan layar 3.3 vs 3.4 di 13 keadaan × desktop/HP × gelap/terang: identik, kecuali menu ⋯, Help, dan form task berjam (memang berubah). Selisih lain paling besar 2/255 di sudut kotak, sama dengan uji kontrol 3.3 vs 3.3. Panel 🔔 diperiksa dalam 4 keadaan × desktop/HP × gelap/terang tanpa luberan; judul panel menempel di atas saat digulir supaya ✕ tidak menimpa sakelar.
- Belum diuji dengan layanan push sungguhan (Google/Microsoft) dan Supabase asli. Bagian ini ada di checklist `PANDUAN-PASANG-3.4.md` bagian D.

---

## [3.3] — CKP Pintar (8 Oktober 2026)

File yang berubah: `index.html`, `js/ckp.js`, `js/tampilan.js`, `js/ekspor.js`, `js/main.js` (nomor versi), `css/ckp.css`, `css/hp.css`, `sw.js` (cache `barakarsa-v3.3`), `ARSITEKTUR.md`. Tidak ada file baru.

### Baru
- **Seluruh pohon kinerja diimpor.** Impor `pohon_kinerja_*.json` kini memuat 53 IKI Anggota: 18 penugasanmu dan 35 IKI tim lain. IKI penugasanmu tetap sama persis (id, nama, isi), jadi IKI yang sudah terpasang di task tetap terbaca.
- **Pemilih IKI dengan pencarian** menggantikan daftar pilihan di form task. Ketuk kolom IKI, lalu ketik apa saja: nama kegiatan, tim, kode IK, teks IKI, rincian, atau nama ketua tim. Beberapa kata dipakai bersama (mis. `iii.1.1 bmn`). Kata yang cocok disorot, dan potongan teks IKI/rincian ditampilkan bila kecocokannya di sana. Di desktop: ↑/↓ untuk menyorot, Enter untuk memilih, Esc untuk menutup.
- **🕘 Terakhir dipakai**: tiga IKI dari task yang terakhir diubah tampil paling atas, disusul 🙋 Penugasanku, lalu 📚 IKI lain (tertutup sampai diketuk atau dicari). Dihitung langsung dari task, jadi sama di semua perangkat tanpa penyimpanan tambahan.
- **IKI tim lain bisa dipilih** dengan tiga pengaman: label *bukan penugasanmu* di daftar, peringatan untuk memastikan IKI itu ada di SKP/KipApp-mu, dan di CKP Triwulan IKI tim lain hanya muncul bila ada task-nya pada triwulan itu (lengkap dengan PDF, Word, dan baris Excel rekap).
- **💡 Saran keterangan** di bawah Description, muncul setelah IKI dipilih: description dari task sebelumnya dengan IKI yang sama (maksimal 3; judul yang mirip didahulukan, lalu yang paling sering dipakai, lalu yang terbaru). Klik saran: Description kosong → diisi; sudah berisi → ditambah di baris baru. Saran yang sudah ada di Description disembunyikan.
- **🧩 Kalimat dasar** bila IKI itu belum punya riwayat description dan Description masih kosong: "*{judul} untuk mendukung {rencana kinerja}.*", misalnya "Menjadi petugas PST harian untuk mendukung terlaksananya kegiatan pelayanan statistik terpadu yang sesuai SOP." Tanpa AI.
- Tombol "✕ Kosongkan pilihan IKI" di daftar.

### Diubah
- Rincian Neraca Produksi dan Neraca Pengeluaran kini dipasangkan ke masing-masing IKI (sebelumnya keempat rincian digabung).
- Nama pendek untuk kegiatan dengan beberapa IKI lebih jelas, mis. "TPSS · Rekomendasi" dan "Layanan BMN dan Persediaan · Kondisi BMN" (bukan angka urut). Nama IKI penugasanmu tidak berubah.
- Hub CKP → 📚 Katalog IKI menyebut jumlah IKI penugasan + IKI tim lain, dan menyarankan impor ulang bila katalog masih dari versi lama.
- Panduan Singkat (Help) → CKP menjelaskan pemilih IKI dan saran keterangan.
- Kata kunci saran IKI tidak lagi ikut tersimpan di localStorage (sebelumnya menempel di data katalog).

### Tidak dipakai (diputuskan saat diskusi)
- IKI favorit (☆/★) diganti 🕘 Terakhir dipakai.
- Rincian kegiatan sebagai saran keterangan: rincian di pohon kinerja kebanyakan satu-dua kata (mis. "Rapat", "SAKERNAS"), sedangkan keterangan CKP berupa kalimat lengkap. Rincian tetap dipakai untuk pencarian dan 💡 saran IKI.
- IKI Ketua Tim/PJ dan impor format .xlsx (cukup IKI Anggota dan JSON untuk pemakaian pribadi).

### Catatan kompatibilitas
- Kunci localStorage, tabel `barakarsa_items`/`barakarsa_settings`, dan bucket tidak berubah; tidak ada baris pengaturan baru.
- Perangkat yang masih 3.2.3 tetap sinkron. Di sana katalog terbaca 18 IKI seperti biasa; task ber-IKI tim lain tampil sebagai "(IKI lama, tidak ada di katalog)" dan terhitung "belum dipilih IKI", tetapi IKI-nya **tidak hilang** walau task itu disunting dan disimpan dari 3.2.3.
- Bila pohon kinerja diimpor ulang dari perangkat 3.2.3, katalog kembali berisi penugasan saja di semua perangkat. Impor ulang sekali dari perangkat 3.3 untuk memulihkan IKI tim lain.

### Diuji
- Katalog dari file yang sama: 18 IKI penugasan identik dengan hasil 3.2.3; 53 id unik.
- 42 langkah pemakaian (impor, cari, keyboard, pilih IKI lain, simpan, duplikat, hub, PDF, saran keterangan, 💡 saran IKI, Enter di judul).
- Sinkron dua arah 3.2.3 ↔ 3.3 dengan server tiruan (task, katalog, suntingan dari perangkat lama, impor ulang dari perangkat lama).
- Tangkapan layar 3.2.3 vs 3.3 di 17 keadaan × desktop/HP × gelap/terang: identik per piksel, kecuali form task CKP dan Help (memang berubah). Tidak ada isi yang meluber atau terpotong di form task dan hub.
- Beban dengan 3.000 task, CPU diperlambat 4× (setara HP): pencarian IKI 0,2 ms, membuka daftar IKI 6 ms, saran keterangan 2 ms; menggambar daftar task tidak berubah. Katalog di penyimpanan 18 → 53 KB; kode aplikasi +22 KB.

---

## [3.2.3] — Perbaikan Tanggal, Urutan, dan Teks (8 Oktober 2026)

File yang berubah: `js/data.js`, `js/tampilan.js`, `js/form-task.js`, `js/sinkron.js`, `js/ekspor.js`, `js/main.js` (nomor versi), `sw.js` (cache `barakarsa-v3.2.3`), `ARSITEKTUR.md`.

Tiga temuan dari 3.2.1 dibereskan sebelum 3.3.

### Diperbaiki
- **"Hari ini" kini memakai tanggal lokal (WITA), bukan UTC.** Sebelumnya, antara pukul 00.00–07.59 WITA task baru otomatis bertanggal kemarin, Today masih menampilkan task kemarin, dan task hari ini malah masuk Upcoming. Yang ikut diperbaiki: tanggal bawaan form task, Today, angka Today di sidebar, Upcoming, bulan bawaan di Board, "This Week Done" di Reporting (kini dihitung dari tanggal Minggu awal pekan), dan tanggal di nama file backup.
- **Setiap task kini punya nomor urutan.** Task baru (form, Inbox cepat, duplikat, impor, stress test) langsung diberi nomor saat disimpan. Task lama yang belum bernomor diberi nomor sesuai posisinya sekarang, jadi urutan manual tidak bergeser, lalu ikut tersinkron. Aplikasi tidak lagi menomori ulang semua task setiap kali dibuka, sehingga urutan sama di semua perangkat.
- **Teks dari pengguna tampil apa adanya.** Judul dan description task, nama project, dan nama label tidak lagi dibaca sebagai HTML. Contoh: judul `<b>tebal</b>` kini tampil persis begitu, dan teks berisi kode tidak bisa lagi menjalankan apa pun.

### Catatan
- Task yang dibuat di perangkat yang masih 3.2.2 atau lebih lama otomatis diberi nomor urutan oleh perangkat 3.2.3 saat sinkron.
- Tampilan tidak berubah (dibandingkan per piksel dengan 3.2 di desktop dan HP).

---

## [3.2.2] — Perbaikan Help (8 Oktober 2026)

File yang berubah: `css/komponen.css`, `js/main.js` (nomor versi), `sw.js` (cache `barakarsa-v3.2.2`).

### Diperbaiki
- **Panduan Singkat (Help) tidak lagi meluber keluar kotak.** Isinya lebih panjang dari tinggi layar, sehingga teks bagian bawah tumpah ke luar kotak dan menimpa daftar task. Kini isi kotak bisa digulir, tombol ✕ tetap terlihat, dan nomor versi di paling bawah terbaca. Bug ini sudah ada sejak 3.2 (dilaporkan setelah 3.2.1 dipasang).
- Perbaikan yang sama berlaku untuk semua kotak satu kolom (Project, Label, Masuk, Backup, Import, Stress Test) bila isinya lebih tinggi dari layar. Tampilan kotak-kotak itu dalam keadaan biasa tidak berubah.

---

## [3.2.1] — Rapikan Kode (8 Oktober 2026)

File yang berubah: `index.html`, `sw.js`. File baru: folder `css/` (7 file), folder `js/` (11 file), `ARSITEKTUR.md`. `manifest.json` tidak berubah.

Versi perawatan: **tidak ada fitur baru dan tampilan tidak berubah.** Data, kunci penyimpanan, tabel, dan bucket Supabase sama; perangkat yang masih 3.2 tetap bisa sinkron dengan yang sudah 3.2.1.

### Diubah
- **`index.html` dipecah.** Isinya kini HTML saja (±650 baris, dari ±6.300). Gaya ada di `css/` (tema, dasar, komponen, tampilan, ckp, cetak, hp) dan kode di `js/` (data, sinkron, tema, tampilan, form-task, project-label, bukti, ckp, ekspor, pwa, main). Peta lengkapnya di `ARSITEKTUR.md`.
- **Fungsi berlapis disatukan.** 13 fungsi yang dulu dibungkus ulang oleh bagian-bagian berikutnya kini masing-masing satu fungsi utuh, misalnya `saveTask` (field form, IKI, rentang tanggal, foto, waktu selesai, posisi salinan) dan `syncNow` (task/project/label, antrean foto, pengaturan CKP, migrasi).
- **CSS disusun per komponen**, bukan per versi. Aturan yang tertimpa dibuang; `!important` dari 24 menjadi 2 (halaman cetak). Semua warna lewat variabel di `css/tema.css`; nama variabel dibuat netral (`--bg`, `--surface`, `--hover`, `--accent`).
- Gaya inline di HTML dan di kode dipindah ke kelas CSS. Pilihan urutan, status sinkron, kolom IKI, hub CKP, tombol ➕, dan peringatan bukti dukung kini langsung ada di HTML, tidak lagi disisipkan lewat JS.
- Komentar diseragamkan berbahasa Indonesia.
- Di HP, sidebar sudah tertutup sejak sebelum halaman digambar (dipasang skrip kecil di `<head>`), sama seperti sebelumnya.
- Service worker: cache `barakarsa-v3.2.1` berisi semua file baru supaya tetap jalan offline, dan file diambil langsung dari server saat cache dipasang.
- Nomor versi di Help: 3.2.1.

### Dibuang (kode mati)
- Modal "CKP Preview" lama (`openCKPModal`, `generateCKP`, `copyCKP`).
- Kalender versi lama beserta navigasi tahunnya, dan gaya `.calendar-*` yang tidak terpakai.
- Tombol tampilan di header (`#viewToggle`, `switchDisplayView`) yang selalu tersembunyi.
- Gaya kolom "Uraian versi CKP" (`.task-subtitle*`) dan `.sidebar-footer`.

### Diuji
- Tangkapan layar 3.2 vs 3.2.1 di 37 keadaan × desktop/HP × gelap/terang: identik per piksel.
- 23 langkah pemakaian menghasilkan data dan teks layar yang sama persis dengan 3.2.
- Sinkron dua arah 3.2 ↔ 3.2.1 (tambah, edit, hapus, pengaturan CKP) dan mode offline.

### Catatan
- Tiga perilaku lama ditemukan dan sengaja belum diubah (tanggal "hari ini" memakai UTC, task baru tanpa nomor urutan, judul task tidak di-escape). Rinciannya di `ROADMAP.md` → v3.2.1 → Temuan.

---

## [3.2] — Tampilan (8 Oktober 2026)

File yang berubah: `index.html`, `sw.js`, `manifest.json`.

Arah tampilan dipilih lewat mockup: **Bara** (gelap hangat, aksen merah-oranye). Kertas dan Senja tidak dipakai.

### Baru
- **Mode terang dan gelap.** Pilihan di menu ⋯ → **Tampilan**: *Otomatis (ikut perangkat)*, *Terang*, *Gelap*. Pilihan aktif diberi tanda ✓.
- **Bawaan: Otomatis.** Aplikasi mengikuti mode gelap/terang HP atau komputer, dan ikut berganti saat pengaturan perangkat berubah tanpa perlu dimuat ulang. Browser yang tidak memberi tahu modenya tetap gelap seperti sebelumnya.
- Pilihan tema **disimpan per perangkat** (localStorage `barakarsa_theme`), tidak ikut sinkron, supaya HP dan komputer bisa berbeda.
- Tema dipasang sebelum halaman digambar, jadi tidak ada kedipan gelap→terang saat aplikasi dibuka.
- Warna bilah status/browser (`theme-color`) mengikuti tema yang aktif.
- Panduan Singkat (Help) menjelaskan menu Tampilan.

### Diubah
- **Palet Bara** menggantikan palet abu-abu lama: latar cokelat-gelap hangat (gelap) atau krem lembut (terang), aksen merah-oranye. Merah aksen di mode gelap sedikit digelapkan supaya teks putih di tombol tetap terbaca.
- **Huruf Plus Jakarta Sans** untuk seluruh aplikasi. Dimuat tanpa menahan tampilan; saat offline atau sinyal lemah, aplikasi memakai font sistem.
- **Sidebar**: menu aktif kini disorot lembut (latar oranye pucat) alih-alih blok merah penuh; angka di samping menu berwarna netral.
- **Kartu statistik Dashboard**: angka berwarna teks biasa, hanya *Priority 1* yang memakai warna aksen.
- **Badge di kartu task**: project dan label ditandai titik warna (teks tetap netral) supaya terbaca di kedua mode; label juga diberi garis tepi berwarna. Badge priority P1–P4 memakai warna yang disesuaikan per mode.
- Tombol duplikat dan hapus di kartu task dibuat lebih tenang; warna merah hanya muncul saat tombol hapus disorot.
- Panel kanan form task, header, peringatan CKP, saran IKI, tag CKP, kalender, dan status sinkron kini mengikuti tema (sebelumnya sebagian warnanya tertulis tetap untuk latar gelap).
- `manifest.json`: warna latar dan tema PWA → `#16110e` (layar pembuka aplikasi terpasang).
- Service worker: cache `barakarsa-v3.2`, supaya versi baru langsung terpakai.

### Tetap
- **Halaman cetak/PDF CKP selalu putih** apa pun temanya (tidak memakai variabel tema). Dokumen Word dan Excel tidak terpengaruh.
- Tanpa glassmorphism.

### Catatan
- Di iPhone yang memasang aplikasi ke home screen, warna teks bilah status ditentukan saat aplikasi dibuka. Bila mode diganti saat aplikasi terbuka, bilah status baru menyesuaikan setelah aplikasi ditutup dan dibuka lagi.

---

## [3.1] — Rapi & Cepat (8 Oktober 2026)

File yang berubah: `index.html`, `sw.js`, `manifest.json`.

### Baru
- **Duplikasi task**: tombol ⧉ di setiap task dan tombol "⧉ Duplikat" di form edit. Salinan dibuka di form dulu dan baru tercipta saat Save, lalu diletakkan tepat di bawah task aslinya. Yang ikut disalin: judul, description, project, label, priority, IKI, tanggal, jam, rentang tanggal, status, dan link Drive. Foto bukti dukung tidak ikut.
- **Tombol ➕ melayang** di pojok kanan bawah untuk menambah task: bulat di HP, berbentuk "+ Add task" di desktop.
- **Pintasan keyboard Q** (desktop) untuk membuka form tambah task, seperti Todoist.
- **Tombol Hapus di form edit task**, dengan konfirmasi.
- **Buka Naraloka ↗** di menu ⋯ → Lainnya (https://flaren271.github.io/naraloka/, tab baru).
- **Edit Project**: ubah nama, warna, dan penanda **Project CKP**. Project CKP diberi tag "CKP" di sidebar.
- **Shortcut "Tambah task cepat"**: tekan lama ikon aplikasi (Android/Chrome) → langsung ke kolom input Inbox.
- **Catat waktu selesai (`completedAt`)** setiap task menjadi Completed; dihapus lagi bila task dibuka kembali. Edit task yang sudah selesai tidak mengubah waktu selesainya. "Avg Completion" di Reporting kini terisi dari data ini.
- **Pemberitahuan versi baru**: bila ada pembaruan di server, muncul tombol "Muat ulang".
- Nomor versi tampil di menu ⋯ → Help & resources.

### Diubah
- **Project ASN → KipApp** (ditandai Project CKP) dan **Work → Kerja**, migrasi otomatis. Setiap project hanya dimigrasi sekali, jadi nama yang kemudian diubah sendiri tidak akan ditimpa, termasuk saat sinkron dari perangkat lain.
- **CKP mengikuti penanda Project CKP**, tidak lagi bergantung pada nama "ASN". Teks peringatan CKP memakai kata "CKP".
- **Kolom "Uraian versi CKP" dihapus.** Sebagai gantinya, label form diberi subjudul abu-abu (tampil saat project CKP dipilih): Task Title → *Uraian Kegiatan di CKP*, Description → *Keterangan/Catatan di CKP*. Laporan PDF dan Word memakai Task Title.
- **Badge priority disembunyikan** pada task Completed (datanya tetap disimpan).
- **"Pasang aplikasi"** pindah dari tombol melayang ke menu ⋯ → Lainnya, dan hanya muncul bila browser menawarkan instalasi.
- **Header lebih ringkas** di desktop dan HP. Di HP, kartu statistik Dashboard dibuat satu baris, task lebih rapat, dan aplikasi dibuka dengan sidebar tertutup.
- **Aplikasi terbuka lebih cepat**: service worker kini menampilkan dari cache dulu lalu memperbarui di belakang (cache `barakarsa-v3.1`), dan pustaka Supabase dimuat setelah tampilan siap.
- Tombol ⋯ di samping nama project selalu terlihat di HP (sebelumnya hanya saat hover).
- **Tombol form task** (Hapus, Duplikat, Cancel, Save) dipindah ke footer selebar form, tidak lagi berdesakan di kolom kanan. Di HP footer tetap menempel di bawah saat form digulir.
- **Klik project di sidebar** selalu menampilkan project itu, project yang dipilih disorot, dan judul header menjadi nama project. Klik Dashboard untuk kembali ke semua task. Di HP, sidebar menutup sendiri setelah memilih menu atau project.

### Diperbaiki
- Menghapus project kini benar-benar melepas task-nya (sebelumnya gagal karena id teks vs angka).
- Edit Project membuka form berisi data project, bukan form Create Project kosong.
- Menghapus label lewat dialog konfirmasi kini berfungsi (sebelumnya tombol konfirmasi tidak melakukan apa-apa).
- Klik project dua kali tidak lagi "bolak-balik" (klik kedua dulu membatalkan filter project).

### Catatan
- Task yang sudah Completed sebelum 3.1 dicatat dengan waktu selesai "tidak diketahui" (`null`), supaya tidak terhitung seolah selesai hari ini.
- Shortcut ikon belum didukung iPhone (keterbatasan iOS).

---

## [3.0] — Baseline live (status per 8 Oktober 2026)

Versi yang sedang berjalan di https://flaren271.github.io/barakarsa/, dicatat sebagai titik awal penomoran versi.

### Platform
- PWA di GitHub Pages: `index.html`, `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`. Bisa dipasang di home screen dan jalan offline.
- Penyimpanan local-first: localStorage (`barakarsa_v6`) sebagai sumber utama.
- Sinkron antar perangkat lewat Supabase (tabel `barakarsa_items`): login email + password, konflik diselesaikan per item dengan `updated_at` terbaru, penghapusan memakai tombstone.

### Task
- Inbox (tangkap cepat, judul saja), Dashboard, Today, Upcoming, All Tasks, Completed.
- Projects (satu per task) dan Labels (banyak per task), warna bisa dipilih.
- Priority 1–4 (bawaan task baru: Priority 4).
- Lima status: Not Started, In Progress, On Hold, Completed, Cancelled.
- Tanggal, jam, dan rentang tanggal ("Sampai tanggal") untuk kegiatan beberapa hari.
- Tampilan List, Board (per status, filter per bulan), dan Kalender bulanan dengan task multi-hari.
- Urutkan: manual (drag & drop), tanggal, nama, prioritas, status.
- Pencarian global di sidebar, filter status/priority/label.
- Backup: export JSON/CSV, import JSON (ganti atau gabung). Stress test.

### Integrasi CKP
- **Bukti dukung foto**: tempel (Ctrl+V), seret, pilih file, atau kamera. Dikompres di browser (JPEG maks 1600px), disimpan di IndexedDB, lalu diunggah ke Supabase Storage (bucket privat `bukti-dukung`). Penanda task KipApp selesai yang belum ada foto.
- **Katalog IKI** dari file `pohon_kinerja_*.json` (hanya penugasan atas nama pengguna), disinkronkan lewat tabel `barakarsa_settings`. Saran IKI otomatis dari judul task.
- **Hub CKP Triwulan** (menu ⋯): daftar IKI per triwulan, peringatan task tanpa IKI/foto, profil pegawai, header laporan per IKI, kendala/solusi/bukti solusi per triwulan.
- **Export**: Laporan PDF per IKI (cetak dari browser, sesuai template CKP), dokumen Word (.docx), dan Excel rekap CKP.

### Batasan yang diketahui
- Edit Project belum berfungsi (membuka form Create Project). *(diperbaiki di 3.1)*
- CKP mengenali project lewat nama "ASN"; menghapus atau mengganti nama project ini berisiko. *(diperbaiki di 3.1)*
- Waktu penyelesaian task belum dicatat, sehingga "Avg Completion" di Reporting selalu "-". *(diperbaiki di 3.1)*
- Pembukaan aplikasi di HP lambat saat sinyal lemah (service worker network-first). *(diperbaiki di 3.1)*

---

## Riwayat sebelum 3.0 (ringkas)

- **22 Sep 2026 — MVP**: CRUD task, tag ASN/Work/Personal, tampilan Today/Week/All, preview CKP markdown. Versi React diganti Vanilla JS karena masalah CDN.
- **22 Sep 2026 — Fase 2**: tema gelap, label kustom berwarna, matriks Eisenhower, tautan Google Drive.
- **22 Sep 2026 — Fase 3 (iterasi 3–10)**: aksen merah gaya Todoist, sidebar ala Todoist, Projects vs Labels, Dashboard, Completed, edit task, filter project, dialog konfirmasi, Board & Kalender, filter lanjutan, perbaikan di HP (hamburger, lag), global search, export/import.
- **23 Sep 2026 — Live**: hosting GitHub Pages sebagai PWA, sinkron Supabase.
- **Akhir Sep – awal Okt 2026 — Integrasi CKP**: foto bukti dukung, katalog IKI, Hub CKP Triwulan, export PDF/Word/Excel, kalender multi-hari, pengurutan, Eisenhower diganti Priority 1–4.
