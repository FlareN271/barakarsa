// ============================================================
// Edge Function "pengingat" — Barakarsa 3.4
//
// Dipanggil dua cara:
//   1) Penjadwal (pg_cron) tiap menit, dengan header x-cron-secret.
//      Membaca task yang sudah tersinkron di barakarsa_items, lalu
//      mengirim pengingat task dan ringkasan pagi lewat Web Push.
//   2) Aplikasi (pengguna yang sudah masuk), dengan token login:
//      info (kunci publik), daftar / lepas perangkat, kirim notifikasi uji.
//
// Rahasia (Dashboard → Edge Functions → Secrets), TIDAK PERNAH di repo:
//   VAPID_PUBLIC_KEY   kunci publik VAPID (base64url, 65 byte)
//   VAPID_PRIVATE_KEY  kunci privat VAPID (base64url, 32 byte)
//   VAPID_SUBJECT      mailto:alamat-email-anda
//   CRON_SECRET        teks acak; sama dengan yang disimpan di Vault untuk penjadwal
//   SB_SECRET_KEY      (opsional) secret key proyek, hanya bila SUPABASE_SERVICE_ROLE_KEY tidak tersedia
//
// Web Push ditulis langsung dengan WebCrypto (RFC 8291 aes128gcm + RFC 8292 VAPID),
// tanpa pustaka tambahan.
// ============================================================

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

const VERSI = '3.4';
const env = (k: string) => (Deno.env.get(k) || '').trim();

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jawab(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// ---------- Byte ----------
// Bytes = Uint8Array berbasis ArrayBuffer biasa (diterima WebCrypto & fetch di semua versi TypeScript)
const bytesBaru = (n: number) => new Uint8Array(n);
type Bytes = ReturnType<typeof bytesBaru>;

// ---------- base64url ----------
function b64uKeBytes(s: string): Bytes {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b.length % 4 ? '='.repeat(4 - (b.length % 4)) : '';
  const bin = atob(b + pad);
  const out = bytesBaru(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesKeB64u(u: Bytes): string {
  let s = '';
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function gabung(...bagian: Bytes[]): Bytes {
  const n = bagian.reduce((a, b) => a + b.length, 0);
  const out = bytesBaru(n);
  let i = 0;
  for (const b of bagian) { out.set(b, i); i += b.length; }
  return out;
}
const teks = (s: string): Bytes => { const e = new TextEncoder().encode(s); const o = bytesBaru(e.length); o.set(e); return o; };

// ---------- VAPID (RFC 8292) ----------
let kunciVapidCache: CryptoKey | null = null;

async function kunciVapid(): Promise<CryptoKey> {
  if (kunciVapidCache) return kunciVapidCache;
  const pub = b64uKeBytes(env('VAPID_PUBLIC_KEY'));
  if (pub.length !== 65 || pub[0] !== 4) throw new Error('VAPID_PUBLIC_KEY tidak valid');
  const jwk = {
    kty: 'EC', crv: 'P-256', ext: true,
    x: bytesKeB64u(pub.slice(1, 33)),
    y: bytesKeB64u(pub.slice(33, 65)),
    d: env('VAPID_PRIVATE_KEY'),
  };
  kunciVapidCache = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  return kunciVapidCache;
}

async function headerVapid(endpoint: string): Promise<string> {
  const aud = new URL(endpoint).origin;
  const kepala = bytesKeB64u(teks(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const isi = bytesKeB64u(teks(JSON.stringify({
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: env('VAPID_SUBJECT') || 'mailto:barakarsa@example.com',
  })));
  const ttd = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, await kunciVapid(), teks(kepala + '.' + isi)));
  return `vapid t=${kepala}.${isi}.${bytesKeB64u(ttd)}, k=${env('VAPID_PUBLIC_KEY')}`;
}

// ---------- Enkripsi isi pesan (RFC 8291, aes128gcm) ----------
async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, panjang: number): Promise<Bytes> {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, panjang * 8));
}

export async function enkripsi(payload: Bytes, p256dh: string, auth: string): Promise<Bytes> {
  const uaPub = b64uKeBytes(p256dh);
  const rahasiaAuth = b64uKeBytes(auth);
  const sementara = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', sementara.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, sementara.privateKey, 256));

  const ikm = await hkdf(rahasiaAuth, ecdh, gabung(teks('WebPush: info\0'), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, teks('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, teks('Content-Encoding: nonce\0'), 12);

  const kunci = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const sandi = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce }, kunci, gabung(payload, new Uint8Array([2]))));

  const rs = new Uint8Array([0, 0, 0x10, 0]); // ukuran rekaman 4096
  return gabung(salt, rs, new Uint8Array([asPub.length]), asPub, sandi);
}

type Langganan = { endpoint: string; user_id: string; p256dh: string; auth: string; perangkat?: string };
type Pesan = { judul: string; isi: string; tag: string; url: string; jenis: string };

// Kirim satu pesan ke satu perangkat. Mengembalikan kode status layanan push.
async function kirimPush(s: Langganan, pesan: Pesan, ttlDetik: number, mendesak: boolean): Promise<number> {
  const body = await enkripsi(teks(JSON.stringify({ ...pesan, waktu: Date.now() })), s.p256dh, s.auth);
  const res = await fetch(s.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await headerVapid(s.endpoint),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(Math.max(60, Math.round(ttlDetik))),
      Urgency: mendesak ? 'high' : 'normal',
    },
    body,
  });
  await res.body?.cancel();
  return res.status;
}

// Kirim ke semua perangkat milik pengguna; langganan yang mati (404/410) dihapus.
async function kirimKeSemua(db: SupabaseClient, subs: Langganan[], pesan: Pesan, ttl: number, mendesak: boolean) {
  const hasil: { perangkat?: string; status: number }[] = [];
  for (const s of subs) {
    let status = 0;
    try { status = await kirimPush(s, pesan, ttl, mendesak); } catch (_e) { status = 0; }
    hasil.push({ perangkat: s.perangkat, status });
    if (status === 404 || status === 410) {
      await db.from('barakarsa_push_langganan').delete().eq('endpoint', s.endpoint);
    } else if (status >= 200 && status < 300) {
      await db.from('barakarsa_push_langganan').update({ terakhir_ok: new Date().toISOString(), gagal: 0 }).eq('endpoint', s.endpoint);
    } else {
      await db.from('barakarsa_push_langganan').update({ gagal: ((s as any).gagal || 0) + 1 }).eq('endpoint', s.endpoint);
    }
  }
  return hasil;
}

// ---------- Waktu "dinding" di zona pengguna ----------
// Dihitung dalam menit, supaya tanggal + jam task (waktu lokal tanpa zona)
// bisa langsung dibandingkan dengan "sekarang" di zona yang sama.
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export function sekarangDi(zona: string, now = new Date()) {
  let z = zona;
  try { new Intl.DateTimeFormat('en-US', { timeZone: z }); } catch (_e) { z = 'Asia/Makassar'; }
  const p: Record<string, string> = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone: z, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short',
  }).formatToParts(now).forEach((x) => { p[x.type] = x.value; });
  const tanggal = `${p.year}-${p.month}-${p.day}`;
  const jam = `${p.hour}:${p.minute}`;
  return { tanggal, jam, menit: menitDinding(tanggal, jam)!, hari: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
}

export function menitDinding(tanggal: string, jam: string): number | null {
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tanggal || '');
  const j = /^(\d{1,2}):(\d{2})/.exec(jam || '');
  if (!t || !j) return null;
  return Date.UTC(+t[1], +t[2] - 1, +t[3], +j[1], +j[2]) / 60000;
}

function geserTanggal(tanggal: string, hari: number) {
  const d = new Date(tanggal + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + hari);
  return d.toISOString().slice(0, 10);
}

const jamTitik = (jam: string) => jam.slice(0, 5).replace(':', '.');

function teksSisa(menit: number) {
  if (menit === 0) return 'Sekarang';
  if (menit < 0) return `Mulai ${-menit} menit lalu`;
  if (menit < 60) return `${menit} menit lagi`;
  const j = Math.floor(menit / 60), m = menit % 60;
  return m ? `${j} jam ${m} menit lagi` : `${j} jam lagi`;
}

const PRIORITY: Record<string, string> = { do: 'P1', schedule: 'P2', delegate: 'P3', eliminate: 'P4' };
const SELESAI = ['completed', 'cancelled'];

// ---------- Aturan pengingat (murni, mudah diuji) ----------
export type Atur = {
  user_id: string; task_on: boolean; task_menit: number;
  pagi_on: boolean; pagi_jam: string; pagi_hari: number[]; zona: string;
};
type Task = { id: string; title?: string; date?: string; time?: string; status?: string; ingat?: number; project?: string | null; quadrant?: string; order?: number };

const JENDELA_SETELAH = 10;      // pengingat masih dikirim sampai 10 menit setelah jam task
const JENDELA_PAGI = 240;        // ringkasan pagi masih dikirim sampai 4 jam setelah jamnya

export function pengingatJatuhTempo(atur: Atur, daftar: Task[], nowMenit: number) {
  if (!atur.task_on) return [];
  const out: { task: Task; menit: number; kunci: string; sisa: number; ttl: number }[] = [];
  for (const t of daftar) {
    if (!t || SELESAI.includes(String(t.status))) continue;
    const w = menitDinding(String(t.date || ''), String(t.time || ''));
    if (w === null) continue;
    const menit = typeof t.ingat === 'number' && Number.isFinite(t.ingat) ? t.ingat : atur.task_menit;
    if (menit < 0) continue;                                   // "Tanpa pengingat"
    const picu = w - menit;
    if (nowMenit < picu || nowMenit > w + JENDELA_SETELAH) continue;
    out.push({
      task: t, menit,
      kunci: `t:${t.id}:${t.date}T${String(t.time).slice(0, 5)}:${menit}`,
      sisa: w - nowMenit,
      ttl: (w + 30 - nowMenit) * 60,
    });
  }
  return out;
}

export function ringkasanJatuhTempo(atur: Atur, now: { tanggal: string; menit: number; hari: number }) {
  if (!atur.pagi_on) return null;
  const hari = Array.isArray(atur.pagi_hari) ? atur.pagi_hari : [0, 1, 2, 3, 4, 5, 6];
  if (!hari.includes(now.hari)) return null;
  const w = menitDinding(now.tanggal, atur.pagi_jam || '07:30');
  if (w === null || now.menit < w || now.menit >= w + JENDELA_PAGI) return null;
  return { kunci: `p:${now.tanggal}`, ttl: (w + JENDELA_PAGI - now.menit) * 60 };
}

// Ringkasan pagi = Today (task bertanggal hari ini), tanpa Completed dan Cancelled.
export function susunRingkasan(daftar: Task[], tanggal: string, hari: number): Pesan {
  const hariIni = daftar
    .filter((t) => t && t.date === tanggal && !SELESAI.includes(String(t.status)))
    .sort((a, b) => {
      const ja = a.time || '', jb = b.time || '';
      if (ja && jb && ja !== jb) return ja < jb ? -1 : 1;
      if (ja && !jb) return -1;
      if (!ja && jb) return 1;
      return (a.order ?? 0) - (b.order ?? 0);
    });
  const [, bln, tgl] = tanggal.split('-').map(Number);
  const label = `${HARI[hari]}, ${tgl} ${BULAN[bln - 1]}`;
  if (!hariIni.length) {
    return { judul: `☀️ Belum ada task hari ini · ${label}`, isi: 'Ketuk untuk membuka Barakarsa.', tag: 'pagi', url: './?view=today', jenis: 'pagi' };
  }
  const MAKS = 6;
  const baris = hariIni.slice(0, MAKS).map((t) => (t.time ? `${jamTitik(t.time)}  ` : '•  ') + (t.title || '(tanpa judul)'));
  if (hariIni.length > MAKS) baris.push(`+ ${hariIni.length - MAKS} task lainnya`);
  return { judul: `☀️ ${hariIni.length} task hari ini · ${label}`, isi: baris.join('\n'), tag: 'pagi', url: './?view=today', jenis: 'pagi' };
}

function pesanTask(t: Task, sisa: number, namaProject: Map<string, string>): Pesan {
  const info = [teksSisa(sisa)];
  const p = t.project != null && t.project !== '' ? namaProject.get(String(t.project)) : '';
  if (p) info.push(p);
  if (t.quadrant && PRIORITY[t.quadrant]) info.push(PRIORITY[t.quadrant]);
  return {
    judul: `⏰ ${jamTitik(String(t.time))} · ${t.title || '(tanpa judul)'}`,
    isi: info.join(' · '),
    tag: `task-${t.id}`,
    url: `./?task=${encodeURIComponent(String(t.id))}`,
    jenis: 'task',
  };
}

// ---------- Basis data ----------
function klienServer(): SupabaseClient {
  const kunci = env('SB_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
  if (!env('SUPABASE_URL') || !kunci) throw new Error('SUPABASE_URL / kunci server tidak tersedia (isi secret SB_SECRET_KEY)');
  return createClient(env('SUPABASE_URL'), kunci, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Tandai pesan sebagai terkirim. true = baru ditandai (boleh dikirim), false = sudah pernah.
async function klaim(db: SupabaseClient, user_id: string, kunci: string): Promise<boolean> {
  const { data, error } = await db.from('barakarsa_push_log')
    .upsert({ user_id, kunci }, { onConflict: 'user_id,kunci', ignoreDuplicates: true })
    .select('kunci');
  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

async function jalankanPenjadwal(db: SupabaseClient, now = new Date()) {
  const { data: semuaAtur, error: e1 } = await db.from('barakarsa_pengingat').select('*');
  if (e1) throw e1;
  const { data: semuaSub, error: e2 } = await db.from('barakarsa_push_langganan').select('*');
  if (e2) throw e2;

  const subPer = new Map<string, Langganan[]>();
  (semuaSub || []).forEach((s: Langganan) => {
    if (!subPer.has(s.user_id)) subPer.set(s.user_id, []);
    subPer.get(s.user_id)!.push(s);
  });

  const laporan: unknown[] = [];
  for (const atur of (semuaAtur || []) as Atur[]) {
    const subs = subPer.get(atur.user_id);
    if (!subs || !subs.length || (!atur.task_on && !atur.pagi_on)) continue;
    const kini = sekarangDi(atur.zona || 'Asia/Makassar', now);

    const tanggalDicari = [geserTanggal(kini.tanggal, -1), kini.tanggal, geserTanggal(kini.tanggal, 1)];
    const { data: baris, error } = await db.from('barakarsa_items')
      .select('id,data')
      .eq('user_id', atur.user_id).eq('kind', 'task').eq('deleted', false)
      .in('data->>date', tanggalDicari);
    if (error) throw error;
    const daftar: Task[] = (baris || []).map((r: { id: string; data: Task }) => ({ ...r.data, id: String(r.id) }));

    // Pengingat per task
    const jatuh = pengingatJatuhTempo(atur, daftar, kini.menit);
    let namaProject = new Map<string, string>();
    if (jatuh.length) {
      const { data: pr } = await db.from('barakarsa_items').select('id,data')
        .eq('user_id', atur.user_id).eq('kind', 'project').eq('deleted', false);
      namaProject = new Map((pr || []).map((r: { id: string; data: { name?: string } }) => [String(r.id), String(r.data?.name || '')]));
    }
    for (const j of jatuh) {
      if (!(await klaim(db, atur.user_id, j.kunci))) continue;
      const hasil = await kirimKeSemua(db, subs, pesanTask(j.task, j.sisa, namaProject), j.ttl, true);
      laporan.push({ kunci: j.kunci, hasil });
    }

    // Ringkasan pagi
    const pagi = ringkasanJatuhTempo(atur, kini);
    if (pagi && (await klaim(db, atur.user_id, pagi.kunci))) {
      const hasil = await kirimKeSemua(db, subs, susunRingkasan(daftar, kini.tanggal, kini.hari), pagi.ttl, false);
      laporan.push({ kunci: pagi.kunci, hasil });
    }
  }

  // Bersihkan catatan lebih dari 30 hari (sekali sejam cukup)
  if (now.getUTCMinutes() === 0) {
    await db.from('barakarsa_push_log').delete().lt('dikirim_at', new Date(now.getTime() - 30 * 86400000).toISOString());
  }
  return laporan;
}

// ---------- Permintaan dari aplikasi ----------
async function penggunaDari(req: Request, db: SupabaseClient) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

function vapidSiap() {
  return !!(env('VAPID_PUBLIC_KEY') && env('VAPID_PRIVATE_KEY'));
}

export async function tangani(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return jawab({ galat: 'Gunakan POST' }, 405);

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch (_e) { body = {}; }
  const jenis = String(body.jenis || '');

  try {
    // Info dasar, tanpa login: dipakai aplikasi dan untuk memeriksa pemasangan
    if (jenis === 'info') {
      return jawab({
        versi: VERSI,
        vapid: env('VAPID_PUBLIC_KEY') || null,
        siap: { vapid: vapidSiap(), cron: !!env('CRON_SECRET'), server: !!(env('SB_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY')) },
      });
    }

    const db = klienServer();

    if (jenis === 'cron') {
      const rahasia = env('CRON_SECRET');
      if (!rahasia || req.headers.get('x-cron-secret') !== rahasia) return jawab({ galat: 'Rahasia penjadwal salah' }, 401);
      if (!vapidSiap()) return jawab({ galat: 'Kunci VAPID belum diisi' }, 500);
      const laporan = await jalankanPenjadwal(db);
      return jawab({ ok: true, terkirim: laporan.length, laporan });
    }

    const user = await penggunaDari(req, db);
    if (!user) return jawab({ galat: 'Belum masuk atau sesi habis. Masuk ulang lalu coba lagi.' }, 401);

    if (jenis === 'daftar') {
      const l = body.langganan || {};
      const keys = l.keys || {};
      if (!/^https:\/\//.test(String(l.endpoint || '')) || !keys.p256dh || !keys.auth) {
        return jawab({ galat: 'Data langganan tidak lengkap' }, 400);
      }
      const { error } = await db.from('barakarsa_push_langganan').upsert({
        endpoint: l.endpoint, user_id: user.id, p256dh: keys.p256dh, auth: keys.auth,
        perangkat: String(body.perangkat || '').slice(0, 60), gagal: 0,
      }, { onConflict: 'endpoint' });
      if (error) throw error;
      return jawab({ ok: true });
    }

    if (jenis === 'lepas') {
      const { error } = await db.from('barakarsa_push_langganan').delete()
        .eq('endpoint', String(body.endpoint || '')).eq('user_id', user.id);
      if (error) throw error;
      return jawab({ ok: true });
    }

    if (jenis === 'uji') {
      if (!vapidSiap()) return jawab({ galat: 'Kunci VAPID belum diisi di Secrets' }, 500);
      let q = db.from('barakarsa_push_langganan').select('*').eq('user_id', user.id);
      if (body.endpoint) q = q.eq('endpoint', String(body.endpoint));
      const { data: subs, error } = await q;
      if (error) throw error;
      if (!subs || !subs.length) return jawab({ galat: 'Perangkat ini belum terdaftar. Aktifkan dulu.' }, 404);
      const hasil = await kirimKeSemua(db, subs as Langganan[], {
        judul: '🧪 Notifikasi uji Barakarsa',
        isi: 'Berhasil! Pengingat akan muncul seperti ini, walau aplikasi ditutup.',
        tag: 'uji', url: './', jenis: 'uji',
      }, 300, true);
      return jawab({ ok: hasil.some((h) => h.status >= 200 && h.status < 300), hasil });
    }

    return jawab({ galat: 'Jenis permintaan tidak dikenal' }, 400);
  } catch (err) {
    const pesan = (err && (err as Error).message) || String(err);
    console.error('pengingat:', pesan);
    return jawab({ galat: pesan }, 500);
  }
}

// Saat diuji (BARAKARSA_UJI=1) modul ini hanya diimpor, server tidak dijalankan
if (Deno.env.get('BARAKARSA_UJI') !== '1') Deno.serve(tangani);
