# BARAKARSA — Changelog

Catatan rilis Barakarsa. Versi terbaru di atas.
Rencana versi berikutnya ada di `ROADMAP.md`.

Format setiap rilis: **Baru** (fitur baru), **Diubah** (perilaku yang berubah), **Diperbaiki** (bug). Versi perawatan boleh memakai **Dibuang** dan **Diuji**.

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
