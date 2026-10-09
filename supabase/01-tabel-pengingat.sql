-- ============================================================
-- Barakarsa 3.4 — Pengingat: tabel baru (jalankan SEKALI di SQL Editor)
--
-- Hanya MENAMBAH tiga tabel. Tabel lama (barakarsa_items,
-- barakarsa_settings) dan bucket bukti-dukung tidak disentuh.
-- Aman dijalankan ulang (memakai "if not exists" / "drop policy if exists").
-- ============================================================

-- 1) Pengaturan pengingat: satu baris per akun, disinkron ke semua perangkat
create table if not exists public.barakarsa_pengingat (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  task_on     boolean     not null default true,
  task_menit  integer     not null default 5,          -- menit sebelum jam task (0 = saat waktunya)
  pagi_on     boolean     not null default true,
  pagi_jam    text        not null default '07:30',    -- HH:MM waktu lokal
  pagi_hari   integer[]   not null default '{0,1,2,3,4,5,6}',  -- 0 = Minggu … 6 = Sabtu
  zona        text        not null default 'Asia/Makassar',
  updated_at  timestamptz not null default now()
);

alter table public.barakarsa_pengingat enable row level security;

drop policy if exists "pengingat milik sendiri - baca"  on public.barakarsa_pengingat;
drop policy if exists "pengingat milik sendiri - tambah" on public.barakarsa_pengingat;
drop policy if exists "pengingat milik sendiri - ubah"  on public.barakarsa_pengingat;
create policy "pengingat milik sendiri - baca"   on public.barakarsa_pengingat for select to authenticated using (auth.uid() = user_id);
create policy "pengingat milik sendiri - tambah" on public.barakarsa_pengingat for insert to authenticated with check (auth.uid() = user_id);
create policy "pengingat milik sendiri - ubah"   on public.barakarsa_pengingat for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.barakarsa_pengingat to authenticated;
grant all on public.barakarsa_pengingat to service_role;

-- 2) Perangkat yang menerima notifikasi (langganan Web Push)
--    Didaftarkan lewat Edge Function; aplikasi hanya bisa membaca & menghapus miliknya.
create table if not exists public.barakarsa_push_langganan (
  endpoint     text primary key,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  p256dh       text        not null,
  auth         text        not null,
  perangkat    text,
  dibuat       timestamptz not null default now(),
  terakhir_ok  timestamptz,
  gagal        integer     not null default 0
);
create index if not exists barakarsa_push_langganan_user on public.barakarsa_push_langganan (user_id);

alter table public.barakarsa_push_langganan enable row level security;

drop policy if exists "langganan milik sendiri - baca"  on public.barakarsa_push_langganan;
drop policy if exists "langganan milik sendiri - hapus" on public.barakarsa_push_langganan;
create policy "langganan milik sendiri - baca"  on public.barakarsa_push_langganan for select to authenticated using (auth.uid() = user_id);
create policy "langganan milik sendiri - hapus" on public.barakarsa_push_langganan for delete to authenticated using (auth.uid() = user_id);

grant select, delete on public.barakarsa_push_langganan to authenticated;
grant all on public.barakarsa_push_langganan to service_role;

-- 3) Catatan pesan yang sudah terkirim (supaya tidak dobel). Hanya untuk server.
create table if not exists public.barakarsa_push_log (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  kunci       text        not null,       -- t:{task}:{tanggal}T{jam}:{menit}  atau  p:{tanggal}
  dikirim_at  timestamptz not null default now(),
  primary key (user_id, kunci)
);

alter table public.barakarsa_push_log enable row level security;   -- tanpa policy = aplikasi tidak bisa membaca/menulis
grant all on public.barakarsa_push_log to service_role;

-- 4) Index untuk pencarian task per tanggal oleh Edge Function (tabel lama, hanya index; data tidak berubah)
create index if not exists barakarsa_items_tanggal_task
  on public.barakarsa_items (user_id, ((data ->> 'date')))
  where kind = 'task' and deleted = false;

-- ---------- PEMERIKSAAN (jalankan setelah di atas) ----------
-- Harus muncul 3 baris, semuanya rls = true:
--   select relname as tabel, relrowsecurity as rls
--   from pg_class where relname in ('barakarsa_pengingat','barakarsa_push_langganan','barakarsa_push_log');
