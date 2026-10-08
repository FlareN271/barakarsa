/* ============================================================
   sinkron.js — sinkronisasi antar perangkat lewat Supabase

   Rancangan: local-first. localStorage tetap sumber utama, jadi
   aplikasi tetap jalan penuh tanpa internet, tanpa login, atau
   kalau server sedang bermasalah. Supabase hanya lapisan
   sinkronisasi di atasnya.

   Tabel `barakarsa_items`: satu baris per task/project/label
   (kolom user_id, id, kind, data, deleted, updated_at).
   Konflik diselesaikan per item: updated_at terbaru menang.
   ============================================================ */

const SUPABASE_URL = 'https://kvfbauntwcvhacwlikno.supabase.co';
const SUPABASE_KEY = 'sb_publishable_KmiEBcLEpbJ7ZIMuB4nsPQ_Hqmj32aL';
const SYNC_TABLE = 'barakarsa_items';
const SYNC_KINDS = ['task', 'project', 'label'];

let sb = null;              // klien Supabase (null sampai pustakanya termuat)
let currentUser = null;
let syncTimer = null;
let syncing = false;
let syncPending = false;

function collectionFor(kind) {
    if (kind === 'task') return tasks;
    if (kind === 'project') return projects;
    return labels;
}

// ---------- Deteksi perubahan ----------
// Salinan setiap item saat terakhir disimpan, untuk mengetahui apa yang
// berubah tanpa harus menyentuh setiap fungsi pengubah data.
let syncSnapshot = { task: {}, project: {}, label: {} };

function fingerprint(item) {
    const copy = { ...item };
    delete copy.updatedAt;
    return JSON.stringify(copy);
}

// Dua perubahan dalam milidetik yang sama akan mendapat cap waktu identik,
// dan yang kedua tidak terlihat "lebih baru" sehingga tidak tersinkron.
// Karena itu setiap cap dari perangkat ini dibuat selalu naik.
let lastStamp = 0;

function stampTime() {
    let now = Date.now();
    if (now <= lastStamp) now = lastStamp + 1;
    lastStamp = now;
    return new Date(now).toISOString();
}

function primeLastStamp() {
    const times = [];
    SYNC_KINDS.forEach(kind => {
        collectionFor(kind).forEach(i => { if (i.updatedAt) times.push(new Date(i.updatedAt).getTime()); });
    });
    tombstones.forEach(t => times.push(new Date(t.updatedAt).getTime()));
    if (times.length) lastStamp = Math.max(lastStamp, Math.max(...times));
}

function initSyncSnapshot() {
    syncSnapshot = { task: {}, project: {}, label: {} };
    SYNC_KINDS.forEach(kind => {
        collectionFor(kind).forEach(item => {
            syncSnapshot[kind][String(item.id)] = fingerprint(item);
        });
    });
}

// Dipanggil dari saveData(). Memberi cap updatedAt pada item yang berubah dan
// mencatat tombstone untuk item yang hilang, supaya penghapusan ikut terkirim
// dan tidak "dihidupkan lagi" oleh perangkat lain.
function stampChanges() {
    SYNC_KINDS.forEach(kind => {
        const arr = collectionFor(kind);
        const present = new Set();

        arr.forEach(item => {
            const key = String(item.id);
            present.add(key);
            const fp = fingerprint(item);
            if (syncSnapshot[kind][key] !== fp) {
                item.updatedAt = stampTime();
                syncSnapshot[kind][key] = fp;
            }
            if (!item.updatedAt) item.updatedAt = stampTime();
        });

        Object.keys(syncSnapshot[kind]).forEach(key => {
            if (!present.has(key)) {
                delete syncSnapshot[kind][key];
                const existing = tombstones.find(t => t.kind === kind && String(t.id) === key);
                if (existing) existing.updatedAt = stampTime();
                else tombstones.push({ kind, id: key, updatedAt: stampTime() });
            }
        });
    });

    // Tombstone lebih dari 90 hari dibuang supaya penyimpanan tetap ringan
    const cutoff = Date.now() - 90 * 86400000;
    tombstones = tombstones.filter(t => new Date(t.updatedAt).getTime() > cutoff);
}

// ---------- Penanda status di header ----------

const SYNC_STATES = {
    offline:   { icon: '○', text: 'Lokal',         color: 'var(--text-secondary)' },
    signedout: { icon: '○', text: 'Belum masuk',   color: 'var(--text-secondary)' },
    syncing:   { icon: '◍', text: 'Menyinkron…',   color: 'var(--warn)' },
    synced:    { icon: '●', text: 'Tersinkron',    color: 'var(--status-done)' },
    error:     { icon: '▲', text: 'Gagal sinkron', color: 'var(--accent)' }
};

function setSyncStatus(state, detail) {
    const el = document.getElementById('syncStatus');
    if (!el || el.hidden) return;
    const config = SYNC_STATES[state] || { icon: '○', text: '', color: 'var(--text-secondary)' };
    el.style.color = config.color;
    el.textContent = `${config.icon} ${config.text}`;
    el.title = detail || config.text;
}

// ---------- Masuk / daftar / keluar ----------

function openAuthModal() {
    document.getElementById('authModal').classList.add('active');
    document.getElementById('authError').textContent = '';
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
}

function authFields() {
    return {
        email: document.getElementById('authEmail').value.trim(),
        password: document.getElementById('authPassword').value
    };
}

function showAuthError(text) {
    document.getElementById('authError').textContent = text;
}

// Setelah berhasil masuk atau mendaftar dengan sesi aktif
function onSignedIn(user) {
    currentUser = user;
    closeAuthModal();
    updateAuthUI();
    syncNow(true);
}

async function doSignIn() {
    const { email, password } = authFields();
    if (!email || !password) { showAuthError('Email dan password harus diisi.'); return; }

    setAuthBusy(true);
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    setAuthBusy(false);

    if (error) { showAuthError(translateAuthError(error.message)); return; }
    onSignedIn(data.user);
}

async function doSignUp() {
    const { email, password } = authFields();
    if (!email || password.length < 6) { showAuthError('Email wajib diisi dan password minimal 6 karakter.'); return; }

    setAuthBusy(true);
    const { data, error } = await sb.auth.signUp({ email, password });
    setAuthBusy(false);

    if (error) { showAuthError(translateAuthError(error.message)); return; }
    if (!data.session) { showAuthError('Akun dibuat. Cek email untuk konfirmasi, lalu masuk.'); return; }
    onSignedIn(data.user);
}

async function doSignOut() {
    if (!confirm('Keluar dari akun? Task tetap tersimpan di perangkat ini, tapi berhenti sinkron.')) return;
    await sb.auth.signOut();
    currentUser = null;
    updateAuthUI();
    closeToolsMenu();
}

function setAuthBusy(busy) {
    document.getElementById('authSignIn').disabled = busy;
    document.getElementById('authSignUp').disabled = busy;
    document.getElementById('authSignIn').textContent = busy ? 'Memproses…' : 'Masuk';
}

function translateAuthError(msg) {
    const m = (msg || '').toLowerCase();
    if (m.includes('invalid login')) return 'Email atau password salah.';
    if (m.includes('already registered')) return 'Email ini sudah terdaftar. Silakan masuk.';
    if (m.includes('password')) return 'Password minimal 6 karakter.';
    if (m.includes('email')) return 'Format email tidak valid.';
    if (m.includes('fetch') || m.includes('network')) return 'Tidak ada koneksi ke server.';
    return msg;
}

function updateAuthUI() {
    const item = document.getElementById('authMenuItem');
    if (item) {
        item.textContent = currentUser
            ? `🚪 Keluar (${currentUser.email})`
            : '🔑 Masuk untuk sinkron';
    }
    if (!currentUser) setSyncStatus('signedout', 'Klik untuk masuk dan menyinkronkan antar perangkat');
}

// ---------- Mesin sinkron ----------

function scheduleSync() {
    if (!currentUser || !sb) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncNow(), 1500);
}

// Satu putaran sinkron lengkap. Setelah task/project/label, sekaligus:
// antrean foto bukti dukung, pengaturan CKP, serta migrasi dan nomor urutan
// untuk data yang baru datang dari perangkat lama.
async function syncNow(showBusy) {
    await syncItems(showBusy);
    evProcessQueue();
    ckpSyncSettings();
    const migrated = migrate31();
    if (migrated || hasMissingOrder()) { saveData(); debouncedRender(); }
}

async function syncItems(showBusy) {
    if (!sb || !currentUser) return;
    if (!navigator.onLine) { setSyncStatus('offline', 'Tidak ada koneksi — perubahan disimpan lokal'); return; }

    if (syncing) { syncPending = true; return; }
    syncing = true;
    if (showBusy) setSyncStatus('syncing');

    try {
        const { data: rows, error } = await sb.from(SYNC_TABLE).select('*');
        if (error) throw error;

        const remote = new Map();
        (rows || []).forEach(r => remote.set(r.kind + ':' + r.id, r));

        const toPush = [];
        let localChanged = false;

        // 1) Item lokal yang belum ada atau lebih baru dari server → kirim
        SYNC_KINDS.forEach(kind => {
            collectionFor(kind).forEach(item => {
                const key = kind + ':' + item.id;
                const r = remote.get(key);
                const localTime = new Date(item.updatedAt || 0).getTime();
                if (!r || localTime > new Date(r.updated_at).getTime()) toPush.push(rowFor(kind, item));
                remote.delete(key);
            });
        });

        // 2) Penghapusan lokal → kirim sebagai baris deleted
        tombstones.forEach(t => {
            const key = t.kind + ':' + t.id;
            const r = remote.get(key);
            const tombTime = new Date(t.updatedAt).getTime();

            let shouldPush;
            if (!r) {
                shouldPush = true;
            } else if (r.deleted) {
                // Sudah terhapus di server — hanya kirim bila punya kita lebih baru
                shouldPush = tombTime > new Date(r.updated_at).getTime();
            } else {
                // Masih hidup di server. Kirim penghapusan, kecuali perangkat lain
                // membuatnya lagi SETELAH kita menghapusnya.
                shouldPush = tombTime >= new Date(r.updated_at).getTime();
            }

            if (shouldPush) {
                toPush.push({ id: String(t.id), kind: t.kind, data: {}, deleted: true, updated_at: t.updatedAt });
            }
            remote.delete(key);
        });

        // 3) Baris server yang lebih baru atau belum dikenal → pakai di sini
        (rows || []).forEach(r => {
            const arr = collectionFor(r.kind);
            const idx = arr.findIndex(i => String(i.id) === String(r.id));
            const remoteTime = new Date(r.updated_at).getTime();

            if (r.deleted) {
                if (idx !== -1 && remoteTime >= new Date(arr[idx].updatedAt || 0).getTime()) {
                    arr.splice(idx, 1);
                    localChanged = true;
                }
                return;
            }

            if (idx === -1) {
                const tomb = tombstones.find(t => t.kind === r.kind && String(t.id) === String(r.id));
                if (tomb && new Date(tomb.updatedAt).getTime() >= remoteTime) return;
                arr.push({ ...r.data, id: castId(r.id), updatedAt: r.updated_at });
                localChanged = true;
            } else if (remoteTime > new Date(arr[idx].updatedAt || 0).getTime()) {
                arr[idx] = { ...r.data, id: castId(r.id), updatedAt: r.updated_at };
                localChanged = true;
            }
        });

        if (toPush.length) {
            const { error: pushErr } = await sb.from(SYNC_TABLE).upsert(toPush, { onConflict: 'user_id,id' });
            if (pushErr) throw pushErr;
        }

        if (localChanged) {
            normalizeOrder();
            keepIdCountersAhead();
            initSyncSnapshot();
            primeLastStamp();
            writeStore();
            render();
        }

        setSyncStatus('synced', 'Terakhir sinkron ' + new Date().toLocaleTimeString('id-ID'));
    } catch (err) {
        console.error('Sync gagal:', err);
        const msg = (err && err.message) || 'penyebab tidak diketahui';
        setSyncStatus('error', 'Gagal sinkron: ' + msg + '. Data aman di perangkat ini.');
    } finally {
        syncing = false;
        if (syncPending) { syncPending = false; setTimeout(() => syncNow(), 500); }
    }
}

function rowFor(kind, item) {
    const data = { ...item };
    delete data.updatedAt;
    return {
        id: String(item.id),
        kind,
        data,
        deleted: false,
        updated_at: item.updatedAt || new Date().toISOString()
    };
}

// Id berupa angka di perangkat, tetapi teks di database
function castId(id) {
    const n = Number(id);
    return Number.isFinite(n) && String(n) === String(id) ? n : id;
}

// Setelah menerima item dari perangkat lain, pastikan item baru di sini
// tidak memakai id yang sudah ada.
function keepIdCountersAhead() {
    projects.forEach(p => { if (typeof p.id === 'number' && p.id >= nextProjectId) nextProjectId = p.id + 1; });
    labels.forEach(l => { if (typeof l.id === 'number' && l.id >= nextLabelId) nextLabelId = l.id + 1; });
}

// ---------- Mulai ----------

// Pustaka Supabase dimuat setelah aplikasi tampil (tidak menahan layar pertama)
function loadSupabaseLib() {
    if (window.supabase) return Promise.resolve();
    return new Promise(resolve => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        s.async = true;
        const timer = setTimeout(resolve, 20000);
        s.onload = () => { clearTimeout(timer); resolve(); };
        s.onerror = () => { clearTimeout(timer); resolve(); };
        document.head.appendChild(s);
    });
}

// Dipanggil sesaat setelah halaman selesai dimuat (lihat main.js)
async function initSync() {
    const status = document.getElementById('syncStatus');
    status.hidden = false;
    status.onclick = () => { if (currentUser) syncNow(true); else openAuthModal(); };
    setSyncStatus('syncing', 'Memuat pustaka sinkronisasi…');
    await loadSupabaseLib();

    if (typeof window.supabase === 'undefined') {
        setSyncStatus('offline', 'Pustaka sinkronisasi gagal dimuat — aplikasi tetap jalan secara lokal');
        return;
    }

    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data } = await sb.auth.getSession();
    currentUser = data.session ? data.session.user : null;
    updateAuthUI();

    if (currentUser) syncNow(true);

    sb.auth.onAuthStateChange((event, session) => {
        currentUser = session ? session.user : null;
        updateAuthUI();
    });

    // Sinkron ulang saat kembali ke aplikasi, saat online lagi, dan tiap menit
    window.addEventListener('online', () => syncNow(true));
    window.addEventListener('offline', () => setSyncStatus('offline', 'Tidak ada koneksi'));
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) syncNow();
    });
    setInterval(() => { if (!document.hidden) syncNow(); }, 60000);
}
