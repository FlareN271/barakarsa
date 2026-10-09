-- ============================================================
-- Barakarsa 3.4 — Penjadwal tiap menit (jalankan SETELAH Edge Function terpasang)
--
-- Ganti TEMPEL_RAHASIA_PENJADWAL dengan "Rahasia penjadwal" dari halaman
-- buat-kunci.html — HARUS sama persis dengan secret CRON_SECRET di Edge Function.
-- Jangan simpan file ini kembali ke repo setelah diisi rahasia.
-- ============================================================

-- 1) Ekstensi (biasanya sudah tersedia; aman dijalankan ulang)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) Simpan rahasia penjadwal di Vault (terenkripsi di database)
--    Bila pernah dijalankan dan ingin mengganti rahasianya, hapus dulu:
--      delete from vault.secrets where name = 'barakarsa_cron_secret';
select vault.create_secret('TEMPEL_RAHASIA_PENJADWAL', 'barakarsa_cron_secret');

-- 3) Jadwal: panggil Edge Function "pengingat" setiap menit
select cron.unschedule('barakarsa-pengingat')
where exists (select 1 from cron.job where jobname = 'barakarsa-pengingat');

select cron.schedule(
  'barakarsa-pengingat',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://kvfbauntwcvhacwlikno.supabase.co/functions/v1/pengingat',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'barakarsa_cron_secret')
    ),
    body    := '{"jenis":"cron"}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);

-- ---------- PEMERIKSAAN (tunggu 2–3 menit) ----------
-- a) Jadwal terdaftar & aktif (1 baris, active = true):
--      select jobid, jobname, schedule, active from cron.job where jobname = 'barakarsa-pengingat';
-- b) Penjadwal berjalan (status = succeeded):
--      select status, return_message, start_time from cron.job_run_details
--      where jobid = (select jobid from cron.job where jobname = 'barakarsa-pengingat')
--      order by start_time desc limit 5;
-- c) Edge Function menjawab (status_code = 200, content berisi "ok":true):
--      select status_code, content, created from net._http_response order by created desc limit 5;
--
-- ---------- MEMATIKAN PENJADWAL (bila perlu) ----------
--      select cron.unschedule('barakarsa-pengingat');
