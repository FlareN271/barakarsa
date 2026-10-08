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

// Dibuka lewat shortcut "Tambah task cepat": langsung ke kolom input Inbox
function handleLaunchParams() {
    const params = new URLSearchParams(location.search);
    if (params.get('quick') !== '1') return;
    history.replaceState(null, '', location.pathname);
    switchView('inbox');
    const input = document.getElementById('quickInput');
    if (input) setTimeout(() => input.focus(), 150);
}
