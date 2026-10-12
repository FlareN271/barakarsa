# Barakarsa 3.6 — Panduan Pasang Persona Bara & Rekap Sore

Urutan: **A. aplikasi → B. Supabase (2 langkah) → C. periksa panel 🔔 → D. checklist uji di HP asli.**
Setiap langkah punya **✅ Cek** supaya ketahuan berhasil sebelum lanjut.

> Sapaan, perayaan, rekap di aplikasi, dan dorongan Inbox langsung jalan setelah langkah A.
> Langkah B hanya untuk **notifikasi** rekap sore. Urutan A/B bebas: aplikasi 3.6 tetap menyimpan pengaturan
> walau SQL belum dijalankan, dan Edge Function 3.6 tetap mengirim pengingat task & ringkasan pagi walau
> kolom rekap belum ada. Perangkat yang masih 3.5/3.4 tetap sinkron.

---

## A. Pasang aplikasi (GitHub)

1. Unggah ke repo `flaren271/barakarsa` (timpa yang lama):
   - berubah: `index.html`, `sw.js`, `CHANGELOG.md`, `ROADMAP.md`, `ARSITEKTUR.md`,
     `js/main.js`, `js/tampilan.js`, `js/form-task.js`, `js/pwa.js`, `js/pengingat.js`,
     `css/tema.css`, `css/hp.css`, `css/pengingat.css`, `supabase/functions/pengingat/index.ts`
   - baru: `js/bara.js`, `css/bara.css`, **folder `maskot/` (8 file `.webp`, wajib: service worker gagal
     memasang cache bila satu saja tidak ada)**, `supabase/03-rekap-sore.sql`, `supabase/PANDUAN-PASANG-3.6.md`
   - file lain tidak berubah.
2. Tunggu 1–2 menit, buka aplikasi, ketuk **Muat ulang** bila muncul "Versi baru tersedia".

✅ **Cek:** menu ⋯ → Help & resources → paling bawah tertulis **Barakarsa versi 3.6**, dan Dashboard diawali kartu Bara
bergambar maskot.

---

## B. Supabase

Buka https://supabase.com/dashboard → proyek Barakarsa (`kvfbauntwcvhacwlikno`).

### B1. Tiga kolom rekap sore (SQL Editor)

1. **SQL Editor** → **New query**.
2. Tempel seluruh isi `supabase/03-rekap-sore.sql` → **Run**.

✅ **Cek:** hasil di bawah menampilkan baris akunmu dengan `sore_on = true`, `sore_jam = 15:55`, `sore_hari = {1,2,3,4,5}`.
Aman dijalankan ulang.

### B2. Pasang ulang Edge Function `pengingat`

1. **Edge Functions** → buka fungsi **`pengingat`** → tab **Code**.
2. Hapus seluruh isi, tempel seluruh isi `supabase/functions/pengingat/index.ts` versi 3.6 → **Deploy** (*Deploy updates*).
3. Pastikan **Verify JWT** tetap **mati** (Details/Settings) seperti di 3.4.
   Secrets (`VAPID_*`, `CRON_SECRET`) dan penjadwal tidak perlu diubah.

✅ **Cek:** tab **Test**/*Invoke*, method `POST`, body:
```json
{ "jenis": "info" }
```
Hasilnya `"versi": "3.6"` dan `"siap": { "vapid": true, "cron": true, "server": true }`.

---

## C. Periksa panel 🔔

Di HP atau laptop: ⋯ → **🔔 Pengaturan pengingat** → bagian baru **🌇 Rekap sore** (sakelar, Jam 15:55, hari Sen–Jum).

✅ **Cek:** tidak ada kotak kuning *"Notifikasi rekap sore belum aktif di server"*. Bila masih ada, tutup panel, tunggu
beberapa detik (aplikasi sinkron ulang), lalu buka lagi. Bila tetap ada, ulangi B1.

**Uji tanpa menunggu 15.55:** ubah Jam rekap menjadi 2–3 menit dari sekarang (pastikan hari ini tercentang), tunggu
notifikasi **🌇 Rekap sore** muncul (perlu ada task Today atau task yang sudah dicentang hari ini), lalu kembalikan Jam ke **15:55**. Rekap hanya dikirim sekali per hari, jadi
setelah uji ini notifikasi 15.55 hari itu tidak dikirim lagi.

---

## D. Checklist uji di HP asli & laptop

1. Help menampilkan **3.6**; kartu Bara bergambar maskot muncul di Dashboard dan Today, juga saat mode pesawat.
2. Pagi/siang/sore/malam: sapaan dan pose berganti (lihat sekilas di jam berbeda; berganti sendiri tanpa memuat ulang).
3. Centang task **In Progress** → kartu task bergeser keluar, percik bara, baris hijau berisi kalimat Bara di tempat task tadi.
   Ketuk **↶ Batal** → task kembali dengan status semula.
4. Centang semua task Today → **Bara bersorak** menggantikan "No tasks for today".
5. Inbox ≥ 5 → chip kuning di kartu Dashboard; ketuk → Inbox; ✕ → hilang sampai besok. Di Inbox ada baris ajakan memilah.
6. Ketuk Bara → kalimat berganti dan Bara melompat.
7. Senin–Jumat mulai 15.55 → kartu jadi **Rekap sore**; di Today ketuk **Lihat rekap ▾** → daftar beres & tersisa.
8. Pukul 15.55 notifikasi **🌇 Rekap sore** muncul di HP & laptop; diketuk (aplikasi tertutup maupun terbuka)
   → Today dengan rekap terbuka.
9. Perangkat yang masih 3.5 (bila ada): tetap sinkron; mengubah ringkasan pagi dari sana tidak mengubah jam rekap sore.
10. HP diatur *kurangi animasi* (Android: Setelan → Aksesibilitas → Hapus animasi): centang task → hanya kalimat, tanpa percik.

Catat yang terasa janggal (kalimat, pose, waktu rekap, terlalu sering/jarang) untuk 3.6.x.
