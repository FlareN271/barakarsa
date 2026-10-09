# Barakarsa 3.4 — Panduan Pasang Pengingat

Urutan: **A. aplikasi → B. Supabase (5 langkah) → C. aktifkan di tiap perangkat → D. checklist uji di HP asli.**
Setiap langkah punya **✅ Cek** supaya ketahuan berhasil sebelum lanjut.

> Aplikasi 3.4 aman dipasang lebih dulu. Sebelum Supabase selesai disiapkan, panel 🔔 hanya menampilkan
> pesan seperti *"Edge Function belum dipasang"*; fitur lain berjalan seperti biasa. Perangkat 3.3/3.2.3 tetap sinkron.

---

## A. Pasang aplikasi (GitHub)

1. Unggah ke repo `flaren271/barakarsa` (timpa yang lama):
   - berubah: `index.html`, `sw.js`, `ARSITEKTUR.md`, `js/main.js`, `js/sinkron.js`, `js/form-task.js`, `js/pwa.js`
   - baru: `js/pengingat.js`, `css/pengingat.css`, **`icon-badge.png`** (wajib, karena service worker gagal memasang cache bila file ini tidak ada), folder `supabase/`
   - `icon-192.png`, `icon-512.png`, `manifest.json` tidak berubah (biarkan yang ada di repo).
2. Tunggu 1–2 menit, lalu buka aplikasi dan ketuk **Muat ulang** bila muncul "Versi baru tersedia".

✅ **Cek:** menu ⋯ → Help & resources → paling bawah tertulis **Barakarsa versi 3.4**, dan menu ⋯ punya bagian **Pengingat → 🔔 Pengaturan pengingat**.

> Folder `supabase/` aman di repo publik: isinya hanya kode dan tempat isian (*placeholder*), tanpa rahasia.
> **Jangan** meng-commit `02-penjadwal.sql` setelah diisi rahasia.

---

## B. Supabase

Buka https://supabase.com/dashboard → proyek Barakarsa (`kvfbauntwcvhacwlikno`).

### B1. Tabel baru (SQL Editor)

1. Menu kiri **SQL Editor** → **New query**.
2. Tempel seluruh isi `supabase/01-tabel-pengingat.sql` → **Run**.

✅ **Cek:**
- Muncul *Success. No rows returned*.
- Jalankan query pemeriksaan di bagian bawah file (hapus tanda `--` di depannya). Hasilnya **3 baris** (`barakarsa_pengingat`, `barakarsa_push_langganan`, `barakarsa_push_log`), semuanya `rls = true`.
- **Table Editor** menampilkan ketiga tabel itu. `barakarsa_items` & `barakarsa_settings` tetap utuh.

File ini aman dijalankan ulang. Tabel lama hanya mendapat satu *index* baru untuk mempercepat pencarian task per tanggal; datanya tidak berubah.

### B2. Buat kunci

1. Buka `https://flaren271.github.io/barakarsa/supabase/buat-kunci.html` (atau buka file itu langsung dari komputer) di Chrome/Edge.
2. Klik **Buat kunci**. Muncul 4 nilai: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`.
3. Biarkan halaman tetap terbuka sampai B3 dan B5 selesai. Kunci tidak disimpan di mana pun; kalau halaman tertutup, buat ulang saja (selama belum ada perangkat yang diaktifkan).

### B3. Secrets Edge Function

**Edge Functions** → **Secrets** (di beberapa tampilan: *Project Settings → Edge Functions → Secrets*). Tambahkan 4 secret:

| Name | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | dari B2 |
| `VAPID_PRIVATE_KEY` | dari B2 (**rahasia**) |
| `VAPID_SUBJECT` | `mailto:` + email Anda, mis. `mailto:nama@gmail.com` |
| `CRON_SECRET` | dari B2 (**rahasia**) |

Klik **Save**. `SUPABASE_URL` dan kunci server sudah disediakan Supabase secara otomatis, jadi tidak perlu ditambahkan.

✅ **Cek:** keempat nama itu tampil di daftar Secrets (nilainya tersamar).

### B4. Edge Function `pengingat`

1. **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Nama fungsi: **`pengingat`** (huruf kecil, persis).
3. Hapus contoh kode, tempel seluruh isi `supabase/functions/pengingat/index.ts` → **Deploy function**.
4. Buka fungsi `pengingat` → **Details** (atau *Settings*) → matikan **Verify JWT** / *Enforce JWT verification* → **Save**.
   Fungsi ini memeriksa sendiri: penjadwal lewat `CRON_SECRET`, aplikasi lewat token login.
   Kalau tetap menyala, penjadwal akan ditolak (401).

✅ **Cek:** di halaman fungsi, buka **Test** (atau *Invoke*). Method `POST`, body:
```json
{ "jenis": "info" }
```
Hasilnya harus `"siap": { "vapid": true, "cron": true, "server": true }`.
- `vapid: false`: secret VAPID belum tersimpan atau namanya salah ketik (ulangi B3, lalu Deploy ulang).
- `server: false`: buka *Project Settings → API Keys*, salin **secret key** (`sb_secret_…`), lalu tambahkan secret `SB_SECRET_KEY` berisi nilai itu.

### B5. Penjadwal tiap menit (SQL Editor)

1. **SQL Editor** → **New query**. Tempel isi `supabase/02-penjadwal.sql`.
2. Ganti `TEMPEL_RAHASIA_PENJADWAL` dengan nilai **CRON_SECRET** dari B2 (harus sama persis dengan secret di B3).
3. **Run**. Setelah itu, tutup query **tanpa menyimpannya ke repo**.

✅ **Cek** (tunggu 2–3 menit, jalankan di SQL Editor):
```sql
select status, return_message, start_time from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'barakarsa-pengingat')
order by start_time desc limit 5;
```
Statusnya **`succeeded`**. Lalu periksa jawaban fungsi:
```sql
select status_code, content, created from net._http_response order by created desc limit 5;
```
`status_code = 200` dan `content` berisi `"ok":true`.
- `401` + "Rahasia penjadwal salah": CRON_SECRET di Vault ≠ di Secrets. Jalankan `delete from vault.secrets where name = 'barakarsa_cron_secret';`, lalu ulangi B5.
- `401` tanpa kata "Rahasia": Verify JWT masih menyala (B4 langkah 4).
- `404`: nama fungsi bukan `pengingat`.

Mematikan penjadwal kapan saja: `select cron.unschedule('barakarsa-pengingat');`

---

## C. Aktifkan di setiap perangkat

Lakukan di **HP Android (aplikasi terpasang)**, **Edge laptop**, dan **Chrome laptop**:

1. Pastikan sudah masuk akun (status header ● Tersinkron).
2. Menu ⋯ → **🔔 Pengaturan pengingat** → **🔔 Aktifkan di perangkat ini** → pilih **Izinkan**.
3. Ketuk **🧪 Kirim notifikasi uji ke perangkat ini**.

✅ **Cek:** notifikasi "🧪 Notifikasi uji Barakarsa" muncul. Di daftar **Perangkat yang menerima**, tiap perangkat muncul satu kali.
Di **Table Editor → barakarsa_push_langganan** ada satu baris per perangkat.

Pengaturan (5 menit sebelumnya, ringkasan 07.30, tiap hari) cukup diubah di satu perangkat; perubahan ikut ke semua perangkat.

---

## D. Checklist uji di HP asli & laptop

**Notifikasi task**
- [ ] Buat task hari ini dengan jam ±10 menit lagi → 5 menit sebelumnya muncul "⏰ jam · judul", isi "5 menit lagi · project · Pn".
- [ ] Muncul juga saat aplikasi **ditutup penuh** (geser keluar dari daftar aplikasi terbaru).
- [ ] Muncul di Edge **dan** Chrome laptop pada waktu yang sama.
- [ ] Task dengan 🔔 **Saat waktunya** muncul tepat di jamnya; **Tanpa pengingat** tidak muncul.
- [ ] Task Completed/Cancelled sebelum waktunya tidak muncul; task On Hold tetap muncul.
- [ ] Ubah jam task setelah pengingat terkirim → muncul lagi untuk jam baru.
- [ ] Ketuk notifikasi: aplikasi terbuka langsung di form task itu (saat aplikasi tertutup **dan** saat sedang terbuka).

**Ringkasan pagi**
- [ ] Pukul 07.30 muncul "☀️ N task hari ini · Hari, tanggal" di HP dan laptop; isinya sama dengan Today (tanpa Completed/Cancelled).
- [ ] Ketuk → aplikasi terbuka di Today.
- [ ] Sementara ubah jam ringkasan ke 2 menit lagi untuk uji cepat, lalu kembalikan ke 07.30.

**Izin & keadaan khusus**
- [ ] Di satu browser, tolak izin → panel menampilkan "Notifikasi diblokir" + cara membukanya; aplikasi tetap normal.
- [ ] Buka lagi izinnya (ikon 🔒 → Notifikasi → Izinkan) → Aktifkan berhasil.
- [ ] Mode pesawat di HP saat pengingat jatuh tempo, nyalakan lagi dalam ±30 menit → notifikasi menyusul.
- [ ] Laptop: tutup semua jendela Edge → pengingat tetap muncul bila Edge diizinkan berjalan di latar belakang
      (Edge → Settings → System and performance → *Continue running background extensions and apps when Microsoft Edge is closed*).
- [ ] **Matikan di perangkat ini** → perangkat hilang dari daftar dan tidak menerima notifikasi lagi.
- [ ] Android: bila sering terlambat, atur baterai aplikasi Barakarsa/Chrome ke *Tidak dibatasi*.

**Tampilan** (HP + laptop, gelap + terang)
- [ ] Panel 🔔 tidak ada teks meluber/terpotong; tombol ✕ tidak menimpa sakelar saat panel digulir.
- [ ] Form task: baris 🔔 hanya muncul setelah Time diisi.

**Sinkron dengan perangkat lama**
- [ ] Task dengan pilihan 🔔 disunting dari perangkat yang masih 3.3 → pilihan 🔔 tetap ada setelah sinkron.
