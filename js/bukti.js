/* ============================================================
   bukti.js — foto bukti dukung CKP

   Alur: foto ditempel/dipilih → dikompres di browser (maks 1600px,
   JPEG) → disimpan dulu di IndexedDB `barakarsa_photos` perangkat
   ini → diunggah ke Supabase Storage (bucket privat `bukti-dukung`)
   saat login & online. Task hanya menyimpan metadata foto
   (task.photos), jadi localStorage tetap ringan.

   Dipakai juga untuk foto "bukti dukung pelaksanaan solusi" di
   hub CKP (lihat ckp.js).
   ============================================================ */

const EVIDENCE_BUCKET = 'bukti-dukung';
const PHOTO_MAX_EDGE = 1600;
const PHOTO_QUALITY = 0.75;
const THUMB_EDGE = 320;

// ---------- IndexedDB: blob foto yang belum terunggah + thumbnail ----------
const photoDB = (() => {
    let dbp = null;
    function open() {
        if (dbp) return dbp;
        dbp = new Promise((resolve, reject) => {
            const req = indexedDB.open('barakarsa_photos', 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                db.createObjectStore('blobs');
                db.createObjectStore('thumbs');
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        return dbp;
    }
    async function run(store, mode, fn) {
        const db = await open();
        return new Promise((resolve, reject) => {
            const t = db.transaction(store, mode);
            const req = fn(t.objectStore(store));
            t.oncomplete = () => resolve(req ? req.result : undefined);
            t.onerror = () => reject(t.error);
            t.onabort = () => reject(t.error);
        });
    }
    return {
        put: (store, key, val) => run(store, 'readwrite', s => s.put(val, key)),
        get: (store, key) => run(store, 'readonly', s => s.get(key)),
        del: (store, key) => run(store, 'readwrite', s => s.delete(key))
    };
})();

const evUrls = new Map();   // id foto → URL tampilan (blob: / signed URL)

async function evForgetLocal(photoId) {
    await photoDB.del('blobs', photoId).catch(() => {});
    await photoDB.del('thumbs', photoId).catch(() => {});
    const url = evUrls.get(photoId);
    if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    evUrls.delete(photoId);
}

// ---------- Kompresi ----------
async function evLoadBitmap(file) {
    if ('createImageBitmap' in window) {
        try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* cadangan di bawah */ }
    }
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gambar tidak bisa dibaca')); };
        img.src = url;
    });
}

function evDraw(src, maxEdge, quality) {
    const scale = Math.min(1, maxEdge / Math.max(src.width, src.height));
    const w = Math.max(1, Math.round(src.width * scale));
    const h = Math.max(1, Math.round(src.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';            // PNG transparan → latar putih
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(src, 0, 0, w, h);
    return new Promise((resolve, reject) => canvas.toBlob(
        b => b ? resolve({ blob: b, w, h }) : reject(new Error('Kompresi gagal')),
        'image/jpeg', quality
    ));
}

async function evCompress(file) {
    const bmp = await evLoadBitmap(file);
    const full = await evDraw(bmp, PHOTO_MAX_EDGE, PHOTO_QUALITY);
    const thumb = await evDraw(bmp, THUMB_EDGE, 0.7);
    if (bmp.close) bmp.close();
    return { full, thumb };
}

// Kompres lalu simpan ke IndexedDB; mengembalikan metadata foto baru
async function evStorePhoto(file) {
    const { full, thumb } = await evCompress(file);
    const id = evNewId();
    await photoDB.put('blobs', id, full.blob);
    await photoDB.put('thumbs', id, thumb.blob);
    return { id, w: full.w, h: full.h, size: full.blob.size, createdAt: new Date().toISOString(), pending: true };
}

// ---------- Helper umum ----------
function evPhotos(task) { return Array.isArray(task && task.photos) ? task.photos : []; }

// Task CKP yang sudah selesai tapi belum ada foto
function evIsMissing(task) {
    return isCkpTask(task) && task.status === 'completed' && evPhotos(task).length === 0;
}

function evNewId() {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

let evToastTimer = null;
function evToast(msg) {
    let el = document.getElementById('evToast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'evToast';
        el.className = 'ev-toast';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(evToastTimer);
    evToastTimer = setTimeout(() => { el.style.display = 'none'; }, 3500);
}

// Path file yang perlu dihapus dari server (bertahan walau offline)
function evGetTrash() {
    try { return JSON.parse(localStorage.getItem('barakarsa_photo_trash') || '[]'); } catch (e) { return []; }
}
function evTrash(paths) {
    const list = evGetTrash();
    paths.filter(Boolean).forEach(p => { if (!list.includes(p)) list.push(p); });
    localStorage.setItem('barakarsa_photo_trash', JSON.stringify(list));
}

// ---------- Foto di form task (draft sampai Save) ----------
let evDraft = [];               // salinan foto untuk task di form
let evAddedIds = new Set();     // foto yang baru ditambah sejak form dibuka
let evRemoved = [];             // foto lama yang dibuang sejak form dibuka
let evBusy = 0;                 // > 0 selama foto masih dikompres

function evLoad(task) {
    evDraft = evPhotos(task).map(p => ({ ...p }));
    evAddedIds = new Set();
    evRemoved = [];
    evSetStatus('');
    evRenderGrid();
}

function evSetStatus(text) {
    document.getElementById('evStatus').textContent = text;
}

function evRenderGrid() {
    document.getElementById('evGrid').innerHTML = evDraft.map(p => `
        <div class="ev-thumb" data-ev-id="${p.id}" onclick="evOpen('${p.id}')" title="Klik untuk memperbesar">
            <span>📷</span>
            ${p.pending ? '<span class="ev-flag" title="Belum terunggah ke server">⏳</span>' : ''}
            <button type="button" class="ev-del" title="Hapus foto" onclick="event.stopPropagation(); evRemove('${p.id}')">✕</button>
        </div>
    `).join('');
    evDraft.forEach(p => evFillThumb(p));
}

async function evThumbUrl(p) {
    if (evUrls.has(p.id)) return evUrls.get(p.id);
    const thumb = await photoDB.get('thumbs', p.id).catch(() => null);
    if (thumb) {
        const url = URL.createObjectURL(thumb);
        evUrls.set(p.id, url);
        return url;
    }
    // Foto dari perangkat lain: ambil dari server
    if (p.path && sb && currentUser) {
        const { data } = await sb.storage.from(EVIDENCE_BUCKET).createSignedUrl(p.path, 3600);
        if (data && data.signedUrl) {
            evUrls.set(p.id, data.signedUrl);
            return data.signedUrl;
        }
    }
    return null;
}

// Ganti ikon 📷 dengan gambar kecil (dipakai form task dan hub CKP).
// Kotaknya dicari setelah URL siap, karena layar bisa sudah digambar ulang.
async function evFillThumbBox(selector, p) {
    const url = await evThumbUrl(p);
    if (!url) return;
    const box = document.querySelector(selector);
    if (!box || box.querySelector('img')) return;
    const span = box.querySelector('span:not(.ev-flag)');
    if (span) span.remove();
    const img = document.createElement('img');
    img.alt = 'Bukti dukung';
    img.src = url;
    box.prepend(img);
}

function evFillThumb(p) {
    evFillThumbBox(`.ev-thumb[data-ev-id="${p.id}"]`, p);
}

async function evAddFiles(fileList) {
    const files = Array.from(fileList || []).filter(f => f && f.type && f.type.startsWith('image/'));
    if (!files.length) { evToast('File yang dipilih bukan gambar.'); return; }

    evBusy++;
    evSetStatus(`Memproses ${files.length} foto…`);
    let ok = 0;
    for (const file of files) {
        try {
            const photo = await evStorePhoto(file);
            evDraft.push(photo);
            evAddedIds.add(photo.id);
            ok++;
        } catch (err) {
            console.error('Foto gagal diproses:', err);
            evToast('Satu foto gagal diproses: ' + err.message);
        }
    }
    evBusy--;
    evRenderGrid();
    evSetStatus(ok ? `${ok} foto ditambahkan — klik Save untuk menyimpan` : '');
}

function evOnPick(input) {
    evAddFiles(input.files);
    input.value = '';
}

function evRemove(id) {
    const idx = evDraft.findIndex(p => p.id === id);
    if (idx === -1) return;
    const [photo] = evDraft.splice(idx, 1);
    if (evAddedIds.has(id)) {
        evAddedIds.delete(id);
        evForgetLocal(id);
    } else {
        evRemoved.push(photo);
    }
    evRenderGrid();
}

async function evOpen(id) {
    const p = evDraft.find(x => x.id === id);
    if (!p) return;
    let url = null;
    const blob = await photoDB.get('blobs', id).catch(() => null);
    if (blob) url = URL.createObjectURL(blob);
    else if (p.path && sb && currentUser) {
        const { data } = await sb.storage.from(EVIDENCE_BUCKET).createSignedUrl(p.path, 3600);
        url = data && data.signedUrl;
    }
    if (!url) url = await evThumbUrl(p);
    if (!url) { evToast('Foto belum tersedia di perangkat ini.'); return; }

    const box = document.createElement('div');
    box.className = 'ev-lightbox';
    box.innerHTML = `<img src="${url}" alt="Bukti dukung">`;
    box.onclick = () => { box.remove(); if (blob) URL.revokeObjectURL(url); };
    document.body.appendChild(box);
}

// Dipanggil dari saveTask: pasang draft foto ke task
function evCommit(task, previousPhotos) {
    // Kalau sebuah foto selesai terunggah SAAT form terbuka, pakai status terbarunya
    const live = new Map((previousPhotos || []).map(p => [p.id, p]));
    task.photos = evDraft.map(p => {
        const l = live.get(p.id);
        return (l && l.path && !l.pending) ? { ...p, pending: false, path: l.path } : p;
    });
    evRemoved.forEach(p => {
        if (p.path) evTrash([p.path]);
        evForgetLocal(p.id);
    });
    evAddedIds = new Set();
    evRemoved = [];
}

// Form ditutup: buang foto baru yang belum disimpan
function evDiscard() {
    evAddedIds.forEach(id => evForgetLocal(id));
    evAddedIds = new Set();
    evRemoved = [];
    evDraft = [];
}

// ---------- Antrean unggah ----------
let evQueueRunning = false;

async function evProcessQueue() {
    if (evQueueRunning) return;
    if (!sb || !currentUser || !navigator.onLine) return;
    evQueueRunning = true;
    let changed = false;

    try {
        // 1) Hapus file yang sudah dibuang
        const trash = evGetTrash();
        if (trash.length) {
            const { error } = await sb.storage.from(EVIDENCE_BUCKET).remove(trash);
            if (!error) {
                const rest = evGetTrash().filter(p => !trash.includes(p));
                localStorage.setItem('barakarsa_photo_trash', JSON.stringify(rest));
            } else {
                console.warn('Hapus foto di server gagal:', error.message);
            }
        }

        // 2) Unggah foto task yang tertunda
        const jobs = [];
        tasks.forEach(t => evPhotos(t).forEach(p => { if (p.pending) jobs.push({ taskId: t.id, photoId: p.id }); }));

        for (const job of jobs) {
            const blob = await photoDB.get('blobs', job.photoId).catch(() => null);
            if (!blob) continue; // foto dari perangkat lain yang belum sempat terunggah
            const path = `${currentUser.id}/${job.taskId}/${job.photoId}.jpg`;
            const { error } = await sb.storage.from(EVIDENCE_BUCKET)
                .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
            if (error) {
                console.warn('Unggah foto gagal:', error.message);
                evToast('Unggah foto gagal: ' + error.message);
                break; // kemungkinan masalah bucket/izin — jangan diulang terus
            }
            // Cari ulang objeknya: task bisa saja sudah diedit selama unggah
            const task = tasks.find(t => t.id === job.taskId);
            const photo = evPhotos(task).find(p => p.id === job.photoId);
            if (photo) {
                photo.pending = false;
                photo.path = path;
                changed = true;
                await photoDB.del('blobs', job.photoId).catch(() => {}); // thumbnail tetap disimpan
            } else {
                evTrash([path]); // fotonya sudah dihapus selama unggah
            }
        }

        // 3) Foto bukti dukung pelaksanaan solusi (hub CKP)
        await ckpUploadNotePhotos();
    } catch (err) {
        console.error('Antrean foto error:', err);
    } finally {
        evQueueRunning = false;
    }

    if (changed) {
        saveData();
        debouncedRender();
    }
}

// ---------- Peringatan "belum ada bukti" & filter ----------
let evMissingOnly = false;   // Completed: hanya kegiatan CKP tanpa foto

function evShowMissing() {
    switchView('completed');
    evMissingOnly = true;
    render();
}

function evClearFilter() {
    evMissingOnly = false;
    render();
}

function evUpdateBanners() {
    const missing = tasks.filter(evIsMissing).length;

    const banner = document.getElementById('evBanner');
    banner.style.display = missing ? 'flex' : 'none';
    banner.innerHTML = `<span>⚠️ <strong>${missing}</strong> kegiatan CKP sudah selesai tapi belum ada bukti dukung.</span>
        <button class="btn btn-secondary btn-sm" onclick="evShowMissing()">Lihat</button>`;

    const chip = document.getElementById('evChip');
    chip.style.display = evMissingOnly ? 'flex' : 'none';
    chip.innerHTML = `<span>Menampilkan kegiatan CKP tanpa bukti dukung (${missing})</span>
        <button class="btn btn-secondary btn-sm" onclick="evClearFilter()">✕ Tampilkan semua</button>`;
}

// Badge foto di kartu task
function evBadgeHTML(task) {
    const photos = evPhotos(task);
    if (photos.length) {
        const pending = photos.some(p => p.pending);
        return `<span class="badge" title="${pending ? 'Ada foto yang belum terunggah' : 'Bukti dukung tersimpan'}">📷 ${photos.length}${pending ? ' ⏳' : ''}</span>`;
    }
    if (evIsMissing(task)) return '<span class="badge ev-missing">⚠️ Bukti belum ada</span>';
    return '';
}

// ---------- Tempel, seret & lepas ----------
function setupBukti() {
    // Tempel (Ctrl+V) saat form task terbuka
    document.addEventListener('paste', (e) => {
        if (!document.getElementById('taskModal').classList.contains('active')) return;
        const items = Array.from((e.clipboardData && e.clipboardData.items) || []);
        const files = items.filter(i => i.kind === 'file' && i.type.startsWith('image/')).map(i => i.getAsFile()).filter(Boolean);
        if (!files.length) return; // tempel teks biasa tetap jalan
        e.preventDefault();
        evAddFiles(files);
    });

    const drop = document.getElementById('evDrop');
    ['dragenter', 'dragover'].forEach(type => drop.addEventListener(type, (e) => {
        e.preventDefault();
        drop.classList.add('dragover');
    }));
    ['dragleave', 'drop'].forEach(type => drop.addEventListener(type, () => drop.classList.remove('dragover')));
    drop.addEventListener('drop', (e) => {
        e.preventDefault();
        evAddFiles(e.dataTransfer && e.dataTransfer.files);
    });

    window.addEventListener('online', () => evProcessQueue());
}
