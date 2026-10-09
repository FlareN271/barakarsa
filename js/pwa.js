/* ============================================================
   pwa.js — aplikasi terpasang (PWA)

   Service worker (sw.js) untuk jalan offline, menu "Pasang
   aplikasi", pemberitahuan versi baru, dan shortcut
   "Tambah task cepat" (tekan lama ikon aplikasi → ?quick=1).
   ============================================================ */

let deferredInstallPrompt = null;

function setupPwa() {
    // file:// dan sebagian sandbox tidak mengizinkan service worker
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .catch(err => console.log('Service worker tidak aktif:', err.message));
        });
    }

    // sw.js mengirim pesan ini bila index.html di server berubah
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (e) => {
            if (e.data && e.data.type === 'barakarsa-updated') showUpdateToast();
            // Notifikasi diketuk saat aplikasi sudah terbuka (3.4)
            if (e.data && e.data.type === 'barakarsa-buka') bukaDariTautan(e.data.url);
        });
    }

    // "Pasang aplikasi" di menu ⋯ hanya muncul bila browser menawarkan instalasi
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        setInstallMenuVisible(true);
    });

    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        setInstallMenuVisible(false);
    });
}

function setInstallMenuVisible(visible) {
    document.getElementById('installMenuItem').style.display = visible ? '' : 'none';
}

async function promptInstall() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    try { await deferredInstallPrompt.userChoice; } catch (err) { /* abaikan */ }
    deferredInstallPrompt = null;
    setInstallMenuVisible(false);
}

function showUpdateToast() {
    if (document.getElementById('updateToast')) return;
    const el = document.createElement('div');
    el.id = 'updateToast';
    el.className = 'update-toast';
    el.innerHTML = '<span>✨ Versi baru Barakarsa tersedia.</span>';
    const reload = document.createElement('button');
    reload.className = 'btn btn-primary btn-sm';
    reload.textContent = 'Muat ulang';
    reload.onclick = () => location.reload();
    const later = document.createElement('button');
    later.className = 'btn btn-secondary btn-sm';
    later.textContent = 'Nanti';
    later.onclick = () => el.remove();
    el.append(reload, later);
    document.body.appendChild(el);
}

// Dibuka lewat shortcut atau notifikasi:
//   ?quick=1   "Tambah task cepat" → kolom input Inbox
//   ?task=ID   pengingat task diketuk → buka task itu (3.4)
//   ?view=today ringkasan pagi diketuk → Today (3.4)
function handleLaunchParams() {
    const params = new URLSearchParams(location.search);
    if (params.get('quick') === '1') {
        history.replaceState(null, '', location.pathname);
        switchView('inbox');
        const input = document.getElementById('quickInput');
        if (input) setTimeout(() => input.focus(), 150);
        return;
    }
    if (params.has('task') || params.has('view')) {
        const url = location.href;
        history.replaceState(null, '', location.pathname);
        bukaDariTautan(url);
    }
}

function bukaDariTautan(url) {
    let params;
    try { params = new URL(url, location.href).searchParams; } catch (e) { return; }
    const id = params.get('task');
    if (id) {
        const task = tasks.find(t => String(t.id) === id);
        if (!task) { switchView('today'); evToast('Task belum ada di perangkat ini. Tunggu sinkron sebentar.'); return; }
        // Jangan menimpa form yang sedang diisi
        if (document.getElementById('taskModal').classList.contains('active')) { evToast('⏰ ' + task.title); return; }
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
        editTask(task.id);
    } else if (params.get('view') === 'today') {
        switchView('today');
    }
}
