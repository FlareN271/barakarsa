# BARAKARSA — Changelog

Catatan rilis Barakarsa. Versi terbaru di atas.
Rencana versi berikutnya ada di `ROADMAP.md`.

Format setiap rilis: **Baru** (fitur baru), **Diubah** (perilaku yang berubah), **Diperbaiki** (bug).

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
