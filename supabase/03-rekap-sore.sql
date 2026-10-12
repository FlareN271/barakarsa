-- ============================================================
-- Barakarsa 3.6 — Rekap sore: tambah 3 kolom (jalankan SEKALI di SQL Editor)
--
-- Hanya MENAMBAH kolom di tabel pengaturan pengingat. Data lama, tabel lain,
-- penjadwal, dan pengingat 3.4 tidak disentuh. Aman dijalankan ulang.
-- Nilai bawaan: rekap sore aktif, pukul 15.55, Senin–Jumat.
-- ============================================================

alter table public.barakarsa_pengingat
  add column if not exists sore_on   boolean   not null default true,
  add column if not exists sore_jam  text      not null default '15:55',              -- HH:MM waktu lokal
  add column if not exists sore_hari integer[] not null default '{1,2,3,4,5}';      -- 0 = Minggu … 6 = Sabtu

-- Supaya aplikasi langsung mengenal kolom baru (tanpa menunggu cache skema)
notify pgrst, 'reload schema';

-- Periksa: harus tampil sore_on = true, sore_jam = 15:55, sore_hari = {1,2,3,4,5}
select user_id, sore_on, sore_jam, sore_hari from public.barakarsa_pengingat;
