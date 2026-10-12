# BARAKARSA — Arsitektur

Peta kode Barakarsa mulai versi 3.2.1 (diperbarui untuk 3.7). Tanpa alat build: semua file langsung disajikan GitHub Pages.
Rencana versi ada di `ROADMAP.md`, riwayat di `CHANGELOG.md`.

## Peta file

```
index.html        HTML saja + skrip kecil di <head> (tema & sidebar HP sebelum halaman digambar)
manifest.json     PWA: nama, ikon, warna, shortcut "Tambah task cepat"
sw.js             service worker: cache dulu, perbarui di belakang, kabar versi baru,
                  notifikasi pengingat (push) dan klik notifikasi (3.4)
icon-192.png, icon-512.png
icon-badge.png    ikon kecil putih-transparan di bilah status Android (3.4)
maskot/           8 pose Bara, .webp transparan 256 px (3.6): bara-{pagi,siap,semangat,rayakan,
                  berpikir,waktu,ups,santai}.webp — semuanya terdaftar di ASSETS sw.js
sampul/           4 sampul Beranda pixel-art 320×80 (3.7): sampul-{pagi,siang,sore,malam}.png,
                  ditampilkan dengan image-rendering: pixelated; terdaftar di ASSETS sw.js

css/              dimuat berurutan; urutan ini penting
  tema.css        SEMUA warna: variabel gelap (:root) dan terang ([data-theme="light"])
  dasar.css       reset, tata letak, sidebar, header, menu ⋯
  komponen.css    statistik, kartu task, badge, tombol, form, modal, toast, tombol ➕
  tampilan.css    Board, Kalender
  ckp.css         foto bukti dukung, IKI di form, hub CKP Triwulan
  pengingat.css   panel 🔔 Pengingat, pilihan 🔔 di form task (3.4)
  laporan.css     menu Reporting (3.5)
  bara.css        Persona Bara: kartu, chip & ajakan memilah, jejak, Bara bersorak, animasi (3.6)
  beranda.css     Beranda: sampul, widget, Atur Beranda, foto album; kelompok Belum selesai,
                  tombol pilah, sidebar bawah, bilah bawah HP (3.7)
  cepat.css       Tambah cepat: kotak satu baris + chip, bilah ⚡ di Belum selesai (3.7)
  panduan.css     📖 Cara Kerja: bagian yang bisa dilipat, baris berlabel (3.7.2)
  cetak.css       halaman Laporan PDF CKP — selalu putih, tidak memakai variabel tema
  hp.css          layar ≤768px (paling akhir supaya menang atas aturan dasar)

js/               skrip biasa dengan defer (bukan ES module), dijalankan berurutan
  data.js         data task/project/label, muat & simpan, migrasi 3.1, waktu selesai, utilitas
  sinkron.js      Supabase: login, sinkron per item, tombstone
  tema.js         mode terang/gelap
  tampilan.js     render(), menu, Belum selesai berkelompok, Board, Kalender, filter, urutkan,
                  pencarian, drag & drop, tombol pilah, angka lewat tanggal
  form-task.js    form task: buka, edit, simpan, duplikat, hapus; centang; dialog konfirmasi
  project-label.js project & label
  bukti.js        foto: kompres, IndexedDB, antrean unggah, peringatan "belum ada bukti"
  ckp.js          katalog IKI, pemilih & pencarian IKI, saran IKI, saran keterangan, hub CKP Triwulan, foto solusi
  ekspor.js       backup JSON/CSV, import, stress test, Excel/PDF/Word CKP
  pengingat.js    pengingat: langganan push, pengaturan (sinkron), panel, 🔔 per task (3.4)
  laporan.js      menu Reporting: rentang, angka utama, grafik task selesai, project, lewat tanggal (3.5)
  bara.js         Persona Bara: kalimat & pose, kartu Beranda, jejak + Batal, Bara bersorak,
                  ajakan memilah, percik, pergantian waktu (3.6)
  beranda.js      Beranda: sampul, widget Hari ini/Jam/Kalender/7 hari/CKP/Kutipan/Album,
                  Atur Beranda, IndexedDB barakarsa_beranda (3.7)
  cepat.js        Tambah cepat: pengurai satu kalimat (cpUrai), kotak, simpan, Detail… (3.7)
  panduan.js      📖 Cara Kerja Barakarsa: isi panduan (panduanHTML), buka/tutup, tampil sekali
                  untuk pengguna baru (3.7.2)
  pwa.js          daftar service worker, "Pasang aplikasi", kabar versi baru, ?quick=1, ?task=, ?view=today
  main.js         menu ⋯, event umum, urutan inisialisasi
```

supabase/         TIDAK dimuat aplikasi; berkas untuk dipasang sendiri di Supabase (3.4)
  01-tabel-pengingat.sql        3 tabel baru + RLS
  02-penjadwal.sql              pg_cron tiap menit → Edge Function (rahasia diisi saat dijalankan)
  03-rekap-sore.sql             3 kolom rekap sore di barakarsa_pengingat (3.6)
  functions/pengingat/index.ts  Edge Function: penjadwal (pengingat task, ringkasan pagi, rekap sore),
                                info, daftar/lepas perangkat, uji
  buat-kunci.html               pembuat kunci VAPID & rahasia penjadwal (di browser)
  PANDUAN-PASANG-3.4.md         langkah pemasangan & pemeriksaan pengingat
  PANDUAN-PASANG-3.6.md         langkah tambahan untuk rekap sore

Karena bukan module, semua fungsi dan variabel tingkat atas berbagi satu ruang global.
Itu yang membuat `onclick="saveTask(event)"` di HTML tetap bekerja. Konsekuensinya: nama
tingkat atas harus unik di seluruh file. Urutan file hanya penting untuk kode yang langsung
jalan saat dimuat; pemanggilan fungsi antarfile terjadi setelah semua file termuat.

## Urutan mulai

1. `<head>`: skrip kecil memasang `data-theme` (dan `data-sidebar-awal` di HP) sebelum halaman digambar.
2. Setelah HTML terbaca, file `js/` dijalankan berurutan. `main.js` memasang tema, PWA, event foto, pengingat, Bara, Beranda (jam), Tambah cepat, tombol Q, dan resize.
3. `DOMContentLoaded` (main.js): tutup sidebar di HP → `loadData()` → `setupEventListeners()` → `render()` (Beranda) → shortcut `?quick=1`.
4. `load`: `setupBeranda` memuat sampul unggahan & foto album dari IndexedDB lalu menggambar ulang Beranda (gambar tidak menahan tampilan pertama).
5. `load` + 50 ms: `initSync()` memuat pustaka Supabase dari CDN, memeriksa sesi, lalu sinkron.

## Penyimpanan

| Tempat | Kunci / nama | Isi |
|---|---|---|
| localStorage | `barakarsa_v6` | `{ tasks, projects, labels, nextProjectId, nextLabelId, tombstones }` — sumber utama |
| localStorage | `barakarsa_ckp_v1` | pengaturan CKP: `katalog`, `profil`, `catatan` (masing-masing `{ data, updatedAt }`); bentuk katalog di bawah |
| localStorage | `barakarsa_theme` | `light` / `dark` (kosong = otomatis); per perangkat |
| localStorage | `barakarsa_sort` | pilihan urutan; per perangkat |
| localStorage | `barakarsa_photo_trash` | path foto yang menunggu dihapus dari server |
| localStorage | `barakarsa_mig31_ckp`, `barakarsa_mig31_done` | penanda migrasi 3.1 sudah jalan |
| localStorage | `barakarsa_stress_backup` | cadangan sementara selama stress test |
| localStorage | `barakarsa_laporan` | rentang Reporting terakhir (`minggu`/`bulan`/`triwulan`); per perangkat (3.5) |
| localStorage | `barakarsa_pengingat` | per perangkat (3.4): `{ uid, atur: { data, updatedAt }, endpoint, vapid, terdaftar }` |
| localStorage | `barakarsa_beranda` | per perangkat (3.7), tidak tersinkron: `{ sampul: 'waktu'\|'pagi'\|'siang'\|'sore'\|'malam'\|'unggah', posisi, jam: 'analog'\|'digital', detik, widget: { hariini, jam, kalender, pekan, ckp, kutipan, album }, album: [{ id, dibuat }] }` |
| IndexedDB | `barakarsa_beranda` (`gambar`) | per perangkat (3.7): `sampul` dan `album:{id}` (Blob JPEG). Terpisah dari foto bukti dukung |
| localStorage | `barakarsa_panduan` | per perangkat (3.7.2): `'1'` = Cara Kerja sudah pernah dibuka (tidak tampil otomatis lagi) |
| localStorage | `barakarsa_bara` | per perangkat (3.6): `{ akhir: [3 kalimat perayaan terakhir], inboxTutup: 'YYYY-MM-DD', tuntas: 'YYYY-MM-DD', profil: { data: { nama }, updatedAt } }` (profil sejak 3.6.1, tersinkron) |
| IndexedDB | `barakarsa_photos` (`blobs`, `thumbs`) | foto bukti dukung penuh yang belum terunggah, thumbnail |
| Supabase | tabel `barakarsa_items` | satu baris per task/project/label: `user_id, id, kind, data, deleted, updated_at` |
| Supabase | tabel `barakarsa_settings` | satu baris per bagian: `user_id, id, data, updated_at`; id `katalog`/`profil`/`catatan` (CKP) dan sejak 3.6.1 `bara` (`{ nama }`, nama panggilan) |
| Supabase | tabel `barakarsa_pengingat` (3.4) | satu baris per akun: `task_on, task_menit, pagi_on, pagi_jam, pagi_hari, zona, updated_at`; sejak 3.6 juga `sore_on, sore_jam, sore_hari` (bawaan true, '15:55', {1..5}) |
| Supabase | tabel `barakarsa_push_langganan` (3.4) | satu baris per perangkat: `endpoint, user_id, p256dh, auth, perangkat, dibuat, terakhir_ok, gagal`; ditulis hanya oleh Edge Function |
| Supabase | tabel `barakarsa_push_log` (3.4) | `user_id, kunci, dikirim_at` — pesan yang sudah terkirim (anti-dobel); hanya server |
| Supabase | bucket `bukti-dukung` (privat) | `{user}/{taskId}/{fotoId}.jpg`, foto solusi di `{user}/ckp/{periode}/{iki}/…` |

Bentuk task (field yang dipakai):
`id, title, description, date, dateEnd, time, quadrant (do/schedule/delegate = P1–P3; kosong atau eliminate = tanpa prioritas sejak 3.7), project (teks id), labels (angka id), attachment, status, isInbox, createdAt, completedAt, order, iki, photos[], ingat, updatedAt`.
`isInbox: true` = 📥 Belum dipilah (dulu Inbox): diisi Tambah cepat bila tanpa tanggal dan project; jadi `false` saat disimpan dari form atau dipilah (`pilahKe`).
`statusLama` (3.7.1): status sebelum task dicentang/disimpan Completed; hanya ada selama Completed, dibuang saat centang dihapus (`toggleStatus`) atau ↶ Batal (`baraBatal`). Hapus centang → `statusLama` bila valid, selain itu In Progress.
`attachment` (Google Drive link) tidak lagi ditampilkan di form kecuali sudah terisi (3.7); tetap dibawa, ditampilkan sebagai badge 🔗, dan ikut ekspor CSV.
`ingat` (3.4): menit sebelum jam task; tidak ada = ikut bawaan, `0` = saat waktunya, `-1` = tanpa pengingat.
Versi lama tidak mengenalnya tetapi tidak membuangnya (`saveTask` membawa field lama dengan `...task lama`).

Bentuk katalog IKI (`katalog.data`, sejak 3.3):
`{ entries, lain, source, importedAt }`
- `entries` — IKI penugasanmu. Dibaca juga oleh versi ≤3.2.3, jadi **jangan diisi IKI tim lain**
  (versi lama akan menampilkan semuanya di hub). Cara membuat id-nya tidak boleh diubah:
  `hashId(norm(kegiatan) + '|' + norm(iki))`; id ini yang tersimpan di `task.iki`.
- `lain` — IKI Anggota tim lain dari pohon kinerja yang sama, dengan `milik: false`.
  Tidak ada = katalog dibuat versi lama (pemilih IKI menyarankan impor ulang).
- Akses lewat `ckpCatalog()` (penugasan), `ckpCatalogLain()`, `ckpAllEntries()`, `ckpEntry(id)` (keduanya),
  `ckpIsLain(e)`. Nilai turunan (kata kunci saran, teks pencarian) disimpan di `WeakMap`, **bukan**
  sebagai properti entri, supaya tidak ikut tertulis ke localStorage dan tersinkron.
- "Terakhir dipakai" dihitung dari task (`updatedAt` terbaru), tidak disimpan dan tidak disinkron.

## Alur data: localStorage → Supabase

```
pengguna mengubah sesuatu
  → saveData()                         data.js
      trackCompletion()                isi/hapus completedAt
      fillMissingOrder()               beri nomor urutan pada task yang belum punya
      stampChanges()                   sinkron.js: bandingkan dengan snapshot,
                                       beri updatedAt baru, catat tombstone bila hilang
      writeStore()                     localStorage barakarsa_v6
      scheduleSync()                   1,5 detik kemudian → syncNow()

syncNow()                              sinkron.js
  syncItems()   ambil semua baris → kirim yang lokal lebih baru / tombstone →
                pakai baris server yang lebih baru → simpan & render bila ada yang datang
  evProcessQueue()                     bukti.js: hapus foto terbuang, unggah foto tertunda
  ckpSyncSettings()                    ckp.js: katalog/profil/catatan, updatedAt terbaru menang
  migrate31(), nomor urutan            data dari perangkat lama ikut dimigrasi & dinomori
```

`syncNow()` juga jalan saat aplikasi kembali dibuka, saat online lagi, dan tiap 60 detik.
Konflik diselesaikan per item: `updated_at` terbaru menang. Tombstone disimpan 90 hari.

## Alur "simpan task"

```
klik Save / Enter di judul
  → saveTask(e)                                     form-task.js
      tolak bila foto masih diproses (evBusy)
      task = { ...task lama, field dari form, isInbox: false, createdAt }
      ckpApplyToTask(task)                          IKI + "Sampai tanggal" (hanya bila setelah tanggal)
      evCommit(task, foto lama)                     foto draft → task.photos, foto terbuang → antrean hapus
      edit: ganti di tempat | salinan: placeCopyBelow() | baru: taruh di akhir
      saveData()                                    (lihat alur di atas; completedAt diurus di sini)
      closeTaskModal()                              evDiscard(): foto baru yang belum disimpan dibuang
      debouncedRender()
      evProcessQueue()                              mulai unggah foto
```

`editTask(id)` dan `openTaskModal()` mengisi form, lalu `evLoad()` (foto) dan `ckpLoadTaskForm()`
(IKI, rentang tanggal, subjudul CKP).

## Kolom IKI dan saran di form task (3.3)

```
#taskIki (input hidden)            nilai IKI terpilih; dibaca ckpApplyToTask() saat Save
#ikiPick → ckpTogglePicker()       buka/tutup panel; di desktop kotak cari langsung fokus
  ckpRenderIkiList()               tanpa kata cari: 🕘 Terakhir dipakai (3) → 🙋 Penugasanku → 📚 IKI lain (tertutup)
                                   dengan kata cari: ckpSearch() — semua kata harus cocok di salah satu bidang
                                   (nama, kegiatan, tim, kode IK, teks IKI, rincian, RK, ketua tim)
  #ikiSearch keydown               ↑/↓ sorot, Enter pilih (tidak menyimpan form), Esc tutup
ckpPickIki(id) → ckpOnIkiChange()  tombol, teks IKI, peringatan "bukan penugasanmu", 💡 saran IKI, saran keterangan
ckpUpdateDescSuggest()             #descSuggest: description task lain dengan IKI sama (judul mirip → sering → terbaru),
                                   atau 🧩 kalimat dasar (judul + RK) bila belum ada riwayat dan Description kosong
ckpApplyDesc(i)                    Description kosong → diisi; sudah berisi → ditambah di baris baru
``` `duplicateTask(id)` membuka form kosong, mengisinya dari task
asal, dan menandai `dupSourceId` supaya salinan diletakkan tepat di bawah aslinya saat Save.

## Alur pengingat (3.4)

```
Aktifkan (pengingat.js pgAktifkan)
  Notification.requestPermission() → 'denied': panel "diblokir", tidak ada yang dikirim ke server
  Edge Function {jenis:'info'}      → kunci publik VAPID (tidak ditulis di kode)
  pushManager.subscribe()           → Edge Function {jenis:'daftar'} → barakarsa_push_langganan
  pgSyncAtur(true)                  → pastikan baris barakarsa_pengingat ada (bawaan 5 menit, 07.30, tiap hari)

pg_cron tiap menit → POST /functions/v1/pengingat {jenis:'cron'} + header x-cron-secret
  per akun yang punya pengaturan & perangkat:
    task di barakarsa_items dengan data->>date = kemarin/hari ini/besok (zona akun)
    pengingat task: punya tanggal+jam, status bukan completed/cancelled, ingat ≥ 0,
                    sekarang di antara (jam − menit) dan (jam + 10 menit)
    ringkasan pagi: hari dipilih, sekarang di antara jam ringkasan dan +4 jam;
                    isi = task bertanggal hari ini selain completed/cancelled (berjam dulu, lalu urutan)
    klaim kunci di barakarsa_push_log (t:{id}:{tanggal}T{jam}:{menit} / p:{tanggal}) → kirim Web Push
    404/410 dari layanan push → langganan dihapus
sw.js 'push' → showNotification(judul, isi, tag) ; 'notificationclick' → pesan 'barakarsa-buka' ke tab
  yang terbuka, atau buka ./?task=ID / ./?view=today → bukaDariTautan() (pwa.js)
```

- Server hanya membaca task yang **sudah tersinkron**; tidak ada jadwal yang disimpan terpisah.
- Pengaturan pengingat sinkron seperti pengaturan CKP: `updated_at` terbaru menang (`pgSyncAtur`).
- Rahasia (`VAPID_PRIVATE_KEY`, `CRON_SECRET`) hanya di Supabase Secrets/Vault; repo memuat placeholder.
- Web Push ditulis langsung dengan WebCrypto di Edge Function (aes128gcm + VAPID ES256), tanpa pustaka.

## Reporting (3.5)

```
render() → lpRender()          laporan.js, saat menu Reporting aktif (tidak mengikuti filter header)
  lpPeriode(rentang, hari ini)  mulai/akhir, kotak grafik (hari; minggu Min–Sab untuk triwulan),
                                pembanding = periode lalu sampai titik yang sama
  lpKumpulkan(P)                satu putaran atas tasks: task selesai, lewat tanggal
    tanggal selesai             completedAt → tanggal lokal; completedAt null (sebelum 3.1) → dateEnd/date,
                                kelas 'unk' (tidak dinilai tepat waktu); tanpa tanggal juga → tidak dihitung
    tepat waktu                 tanggal selesai ≤ (dateEnd || date); Cancelled tidak dihitung
  lpKartu…                      HTML biasa; batang dengan CSS (tanpa pustaka grafik)
```

## Persona Bara (3.6)

```
render() → baraRender()             bara.js, di akhir render()
  baraKeadaan(now, view)            situasi → { pose, salam, sub, kunci, rekapAda, d }
                                    (tuntas + kotak Hari ini aktif → kartu cukup menyapa; sorak ada di kotak)
    baraData(now)                   hariIni (date = hari ini, bukan Cancelled), sisa, beresToday,
                                    beres (completedAt lokal = hari ini, task apa pun), lewat, besok, inbox, berikut
    urutan situasi                  tuntas → rekap sore (jam rekap … +150 menit) → Today kosong → malam → pagi → siang/sore
    baraPilih(kunci, daftar)        satu variasi per situasi, tetap selama sesi (tidak berganti tiap render)
  #baraDash                         kartu di Beranda (3.7: Today dilebur, #baraToday dihapus)
  #brHariList (beranda.js)          → baraTuntasHTML(d): Bara bersorak bila semua task hari ini beres
  #baraInbox                        ajakan memilah di atas Belum selesai bila Belum dipilah ≥ BARA_INBOX_MIN
  baraPasangJejak()                 baris hijau di tempat task tadi (sebelum task tetangga berikutnya)

toggleStatus(id) / saveTask()       form-task.js
  posisi = baraCatatPosisi(id)      SEBELUM status berubah: menu, id task berikutnya, kotak centang
  saveData()
  baraSetelahUbah(id, statusLama, posisi)
    hanya bila status → completed   kalimat (khusus dulu, lalu acak tanpa 3 terakhir), percik,
                                    jejak 5 detik, tuntas → barakarsa_bara.tuntas (sorak sekali per hari)
    true → kartu diberi .bara-pergi, render ditunda 280 ms
baraBatal()                         status kembali ke statusLama, saveData(), jejak "ups" 2,5 detik
setupBara()                         setInterval 60 detik + visibilitychange → render bila tanda waktu berubah
                                    (tanggal, bagian hari, mulai rekap, akhir kalimat rekap)
```

- Nama panggilan (3.6.1): kalimat memakai `{nama}`; `baraSapa(teks, html)` mengisinya (lewat `esc()` untuk HTML) atau membuang ", {nama}" bila nama kosong. Jangan menulis nama langsung di kalimat. Sinkron: `baraSyncProfil()` dari `syncNow()`.
- Kalimat hanya dari data di perangkat. Sinkron dari perangkat lain **tidak** memicu perayaan (hanya `toggleStatus` dan `saveTask` yang memanggil Bara).
- Jam & hari rekap dibaca dari `pgAtur()` (pengingat.js): `sore_jam`, `sore_hari`. Bawaan di `PENGINGAT_BAWAAN`.
- Semua gerakan lewat kelas CSS di `bara.css` dan dimatikan oleh `prefers-reduced-motion`; `baraGerakBoleh()` juga melewati percik dan penundaan render.
- Rekap sore push: `rekapJatuhTempo` + `susunRekap` di Edge Function. Kunci anti-dobel `s:{tanggal}`, diklaim pada menit pertama; tidak dikirim bila tidak ada apa-apa hari itu. Task yang dicentang hari ini diambil dengan `data->>status = completed` dan `data->>completedAt ≥ sekarang − 26 jam`, lalu disaring per tanggal lokal zona akun. URL `./?view=today&rekap=1` → `baraBukaRekap()` → Beranda (3.7; perangkat 3.5–3.6 membuka Today).
- Wadah jejak per menu: `BARA_DAFTAR_VIEW` (`dashboard` → `brHariList`, `all` → `allList`, `completed` → `completedList`). Baris di kotak Hari ini memakai kelas `task-item` + `data-task-id` + `.task-checkbox`, jadi jejak, percik, dan ↶ Batal bekerja sama seperti di daftar biasa.
- `pgSyncAtur`: bila server belum punya kolom `sore_*` (SQL 3.6 belum dijalankan), `pgKolomSore = false` dan baris disimpan tanpa kolom itu; panel 🔔 memberi tahu.

## Menu & Beranda (3.7)

```
Menu (id internal tetap, supaya kode lama & tautan aman):
  dashboard  🏠 Beranda       brRender() di beranda.js
  all        📋 Belum selesai  renderKelompok() (List) / renderBoardView() (Board) di tampilan.js
  kalender   📅 Kalender       renderCalendarView() — juga task selesai (pudar)
  completed  ✅ Selesai · filters 🏷️ Labels · reporting 📈 Reporting (tidak berubah)
  VIEW_LAMA  today → dashboard, inbox → all, upcoming → all (switchView menerjemahkan)

kelompokTask(t)   batal → dipilah (isInbox) → tanpa (tanpa tanggal) → lewat (tenggat < hari ini)
                  → hariini (date ≤ hari ini) → besok → pekan (≤ +7 hari) → nanti
updateSidebarCounts()  hanya jumlah lewat tanggal (#lewatCount, #lewatCountBawah)
filterByProject(id)    → Belum selesai dengan currentProjectFilter

brRender()        sampul (brGambarSampul) + widget aktif, urutan: jam, hariini, kalender, pekan, ckp, album, kutipan
                  (urutan di HP diatur CSS order di hp.css)
  brHariHTML      baraData(now) dari bara.js; rekap = hari rekap & menit ≥ jam rekap (pgAtur)
  brPekanHTML     lpSelesai() dari laporan.js (tanggal selesai) untuk 7 hari terakhir
  brCkpHTML       triwulan berjalan (quarterRange), ckpCatalog(), isCkpTask, evIsMissing
  brTikJam()      setInterval 1 detik; hanya mengubah atribut jarum & teks jam (tanpa render)
Gambar            evLoadBitmap/evDraw (bukti.js) → Blob JPEG → IndexedDB barakarsa_beranda
                  → URL blob: di brUrl; dimuat saat 'load' (setupBeranda)

cpUrai(teks, hariIni, abaikan)   cepat.js, fungsi murni → { judul, token[], date, time, project, quadrant, labels }
  urutan: tanggal → jam → #project → !prioritas → @label; satu token per jenis (label boleh banyak)
  ✕ chip → jenis:teks masuk cpAbaikan → kata itu tetap jadi judul
simpanCepat()     task baru (status not-started sejak 3.7.1, isInbox bila tanpa tanggal & project) → saveData()

toggleStatus(id, pilihan)   form-task.js, dipanggil kotak centang di semua daftar
  Completed        → status = statusLama (atau in-progress), statusLama dibuang
  In Progress      → completed (+ statusLama), perayaan Bara
  Not Started / On Hold / Cancelled tanpa pilihan → tanyaCentang(id): lapisan .tc-lapis di dekat kotak
                     → pilihCentang('completed' | 'in-progress') → toggleStatus(id, pilihan)
cepatKeDetail()   openTaskModal() lalu isi field + event change/input (kolom IKI, 🔔 per task)
```

- Sidebar: Beranda · Belum selesai · Kalender · Selesai · Reporting · Labels, lalu My Projects (Labels di menu utama sejak 3.7.1). Menu Selesai punya kotak cari `#selesaiCari` (dibaca `render()`).
- Prioritas yang ditampilkan: `prioAktif(q)` (tampilan.js). Jangan menampilkan badge untuk `eliminate`.
- Widget Beranda baru: tambahkan ke `BR_WIDGET` dan `BR_BAWAAN.widget`, buat fungsi `br…HTML(now)` yang mengembalikan `<section class="br-w br-w-{k}">`, panggil di `brRender()`, dan hitung dari data di perangkat (tanpa internet).
- Gambar Beranda tidak boleh disimpan di `barakarsa_photos` atau bucket `bukti-dukung`.

## Aturan menambah kode

- Warna baru: tambahkan variabel di `css/tema.css` (versi gelap **dan** terang), lalu pakai `var(--…)`.
- Aturan untuk HP di `css/hp.css`, bukan di file lain.
- File baru di `css/` atau `js/`: daftarkan di `index.html` **dan** di `ASSETS` dalam `sw.js`.
- Setiap rilis: naikkan `CACHE_NAME` di `sw.js` dan `APP_VERSION` di `js/main.js`.
- Jangan ubah kunci localStorage, nama database IndexedDB, tabel, atau bucket tanpa migrasi —
  perangkat dengan versi lama harus tetap bisa sinkron.
- Tanggal "hari ini" selalu `todayISO()` (tanggal lokal). Jangan memakai `new Date().toISOString()` untuk tanggal kalender; itu UTC dan bisa mundur sehari di WITA.
- Teks dari pengguna (judul, description, nama project/label, isi katalog) selalu lewat `esc()` sebelum dimasukkan ke HTML.
- Task baru tidak perlu diberi `order` sendiri: `saveData()` memberi nomor pada task yang belum punya.
- Komentar dan nama baru berbahasa Indonesia.
- Jangan menulis properti turunan (cache) ke objek di `ckpStore`; pakai `WeakMap` (lihat `ckpKwCache`, `ckpSearchCache`).
- Field task baru: pastikan form membawa field lama (`...task lama`) dan duplikat ikut menyalinnya bila perlu (contoh `ingat`: `pgMuatForm`, `pgTerapkanKeTask`).
- Tanggal dari waktu ISO (mis. completedAt) diubah ke tanggal lokal (`lpIsoLokal()` di laporan.js), bukan `.slice(0, 10)`.
- File baru yang diperlukan service worker (mis. `icon-badge.png`, gambar di `maskot/` dan `sampul/`) juga masuk `ASSETS`; satu file hilang membuat cache baru gagal terpasang.
- Teks yang dilihat pengguna memakai nama menu 3.7: Beranda, Belum selesai, Belum dipilah, Hari ini, Kalender, Selesai (bukan Dashboard/Inbox/Today/Upcoming).
- Kalimat Bara baru: tambahkan ke daftar variasi di `bara.js` (bukan di tempat lain), pakai `{n}`-style isian lewat `baraIsi`, dan teks dari pengguna (judul task) lewat `esc()`.
- Kolom baru di `barakarsa_pengingat`: tambahkan ke `PENGINGAT_FIELD` dan `PENGINGAT_BAWAAN`, buat file SQL `add column if not exists … default …`, dan pastikan aplikasi tetap menyimpan bila kolom belum ada (contoh `pgKolomSore`).
