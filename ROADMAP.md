# BARAKARSA — Roadmap

Rencana pengembangan Barakarsa setelah versi live 3.0 (8 Oktober 2026).
Setiap versi dikerjakan di chat terpisah dalam projek ini. Riwayat perubahan ada di `CHANGELOG.md`.

- Aplikasi: https://flaren271.github.io/barakarsa/
- Repo: github.com/flaren271/barakarsa (GitHub Pages, PWA)
- Backend: Supabase (tabel `barakarsa_items`, `barakarsa_settings`, bucket `bukti-dukung`)

---

## Ringkasan versi

| Versi | Nama | Fokus | Status |
|---|---|---|---|
| 3.1 | Rapi & Cepat | Perbaikan yang langsung terasa sehari-hari | 🔜 Berikutnya |
| 3.2 | Tampilan | Mode terang/gelap, tema baru | Rencana |
| 3.3 | CKP Pintar | Seluruh pohon kinerja, saran description | Rencana |
| 3.4 | Pengingat | Notifikasi push | Perlu diskusi |
| 3.5 | Reporting | Analisis performa | Perlu diskusi |
| 4.0 | Teman | Persona asisten, personalisasi, AI | Perlu diskusi |

---

## v3.1 — Rapi & Cepat 🔜

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
- Isi salinan pada duplikasi task: apakah foto, tanggal, dan status ikut disalin?
- Letak tombol Naraloka: menu ⋯, sidebar, atau keduanya.

---

## v3.2 — Tampilan
- Mode terang dan gelap (ikut pengaturan HP, atau dipilih manual).
- Tiga arah tampilan untuk dipilih lewat mockup:
  - **Bara**: gelap hangat, aksen merah-oranye.
  - **Kertas**: terang, bersih, nuansa Notion.
  - **Senja**: netral lembut, aksen biru-ungu.
- Tanpa glassmorphism (preferensi awal).

## v3.3 — CKP Pintar
- Impor **seluruh** pohon kinerja, bukan hanya penugasan atas nama sendiri.
- Pencarian IKI di form task, plus penanda IKI favorit.
- Saran description untuk task KipApp (tanpa AI): diambil dari rincian kegiatan di pohon kinerja dan description task sebelumnya pada IKI yang sama.

## v3.4 — Pengingat (perlu diskusi)
Usulan jenis notifikasi (push via Supabase Edge Function, tetap muncul walau aplikasi tertutup):
1. Pengingat per task: saat waktunya, atau sekian menit sebelumnya.
2. Ringkasan pagi: daftar task hari ini.
3. Pengingat CKP menjelang akhir triwulan: kegiatan yang belum ada bukti dukung.

Pertanyaan terbuka: jenis mana yang dibutuhkan, dan jam berapa ringkasan pagi.
Catatan: di iPhone, aplikasi harus dipasang ke home screen dulu.

## v3.5 — Reporting (perlu diskusi)
Ide yang bisa dipilih:
- Tren task selesai per minggu.
- Selesai tepat waktu vs terlambat.
- Sebaran kerja per project dan per IKI.
- Komposisi priority dari pekerjaan yang selesai.
- Kesiapan CKP per IKI (persentase yang sudah ada foto).
- Hari/jam paling produktif, streak hari produktif.

Pertanyaan terbuka: pertanyaan apa yang ingin dijawab dari laporan?

## v4.0 — Teman (perlu diskusi)
- Persona asisten (ide: maskot "Bara"): sapaan sesuai waktu, rekap sore, perayaan kecil saat task selesai, dorongan halus saat Inbox menumpuk.
- Personalisasi ala Notion: wallpaper, jam, foto, widget.
- "✨ Bantu tulis" description dengan AI, lewat Supabase Edge Function (kunci API tidak boleh di kode publik).
- Memecah `index.html` menjadi modul (tetap bisa di-hosting di GitHub Pages).

Pertanyaan terbuka: nada asisten santai-akrab atau rapi-profesional?

---

## Catatan arsitektur
- Tetap GitHub Pages + Supabase. Tidak perlu server sendiri; kebutuhan sisi server (push, AI) memakai Supabase Edge Functions.
- Pantau kapasitas di Supabase Dashboard → Organization → Usage. Yang paling cepat tumbuh adalah foto bukti dukung.
