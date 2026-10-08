# BARAKARSA — Changelog

Catatan rilis Barakarsa. Versi terbaru di atas.
Rencana versi berikutnya ada di `ROADMAP.md`.

Format setiap rilis: **Baru** (fitur baru), **Diubah** (perilaku yang berubah), **Diperbaiki** (bug).

---

## [3.1] — Rapi & Cepat
*Belum dirilis. Lihat ROADMAP.md.*

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
- Edit Project belum berfungsi (membuka form Create Project).
- CKP mengenali project lewat nama "ASN"; menghapus atau mengganti nama project ini berisiko.
- Waktu penyelesaian task belum dicatat, sehingga "Avg Completion" di Reporting selalu "-".
- Pembukaan aplikasi di HP lambat saat sinyal lemah (service worker network-first).

---

## Riwayat sebelum 3.0 (ringkas)

- **22 Sep 2026 — MVP**: CRUD task, tag ASN/Work/Personal, tampilan Today/Week/All, preview CKP markdown. Versi React diganti Vanilla JS karena masalah CDN.
- **22 Sep 2026 — Fase 2**: tema gelap, label kustom berwarna, matriks Eisenhower, tautan Google Drive.
- **22 Sep 2026 — Fase 3 (iterasi 3–10)**: aksen merah gaya Todoist, sidebar ala Todoist, Projects vs Labels, Dashboard, Completed, edit task, filter project, dialog konfirmasi, Board & Kalender, filter lanjutan, perbaikan di HP (hamburger, lag), global search, export/import.
- **23 Sep 2026 — Live**: hosting GitHub Pages sebagai PWA, sinkron Supabase.
- **Akhir Sep – awal Okt 2026 — Integrasi CKP**: foto bukti dukung, katalog IKI, Hub CKP Triwulan, export PDF/Word/Excel, kalender multi-hari, pengurutan, Eisenhower diganti Priority 1–4.
