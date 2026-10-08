/* ============================================================
   main.js — titik awal aplikasi

   Dimuat paling akhir. Berisi menu ⋯, pemasangan event umum,
   dan urutan inisialisasi:
     1) saat skrip jalan  : tema, PWA, event global
     2) DOMContentLoaded  : muat data → event → gambar layar
     3) load (+50 ms)     : sinkron Supabase (tidak menahan tampilan)
   ============================================================ */

const APP_VERSION = '3.2.3';
const NARALOKA_URL = 'https://flaren271.github.io/naraloka/';

// ---------- Menu ⋯ ----------

function toggleToolsMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('toolsMenu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function closeToolsMenu() {
    document.getElementById('toolsMenu').style.display = 'none';
}

function toolsAction(action) {
    closeToolsMenu();
    if (action === 'ckp') openCkpHub();
    else if (action === 'json') exportToJSON();
    else if (action === 'csv') exportToCSV();
    else if (action === 'import') openPasteImportModal();
    else if (action === 'stress') openStressTestModal();
    else if (action === 'help') openHelpModal();
    else if (action.indexOf('theme-') === 0) setThemePref(action.slice(6));
    else if (action === 'naraloka') window.open(NARALOKA_URL, '_blank', 'noopener');
    else if (action === 'install') promptInstall();
    else if (action === 'auth') { currentUser ? doSignOut() : openAuthModal(); }
}

function openHelpModal() {
    document.getElementById('helpModal').classList.add('active');
}

function closeHelpModal() {
    document.getElementById('helpModal').classList.remove('active');
}

// ---------- Event umum ----------

function setupEventListeners() {
    const sidebar = document.getElementById('sidebar');
    document.getElementById('toggleSidebar').onclick = () => sidebar.classList.toggle('collapsed');
    document.getElementById('hamburgerBtn').onclick = (e) => {
        e.stopPropagation(); // jangan sampai ikut menutup sidebar lewat klik di area konten
        sidebar.classList.toggle('collapsed');
    };

    document.getElementById('sidebarAddTaskBtn').onclick = () => openTaskModal();
    document.getElementById('addLabelBtn').onclick = () => openLabelModal();
    document.getElementById('addProjectBtn').onclick = () => openProjectModal();
    document.getElementById('toolsMenuBtn').onclick = (e) => toggleToolsMenu(e);
    document.getElementById('importFile').onchange = (e) => importFromFile(e);
    document.getElementById('quickAddBtn').onclick = () => addQuickTask();
    document.getElementById('quickInput').onkeypress = (e) => {
        if (e.key === 'Enter') addQuickTask();
    };

    document.getElementById('globalSearchInput').addEventListener('input', (e) => {
        performGlobalSearch(e.target.value.trim().toLowerCase());
    });
    document.getElementById('searchInput').addEventListener('input', () => performSearch());
    document.getElementById('allFilterBtn').addEventListener('click', () => toggleFilterPanel('all'));
    document.getElementById('todayFilterBtn').addEventListener('click', () => toggleFilterPanel('today'));

    // Klik di luar menu menutup menu ⋯ dan menu project
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#projectMenu') && !e.target.closest('.project-menu-btn')) hideProjectMenu();
        if (!e.target.closest('#toolsMenu') && !e.target.closest('#toolsMenuBtn')) closeToolsMenu();
    });

    // HP: tutup sidebar setelah memilih menu atau project
    sidebar.addEventListener('click', (e) => {
        if (window.innerWidth > 768) return;
        if (e.target.closest('.sidebar-item, .project-item')) sidebar.classList.add('collapsed');
    });

    setupSortSelect();
    setupIkiField();
    setupColorPickers();
}

// ---------- Saat skrip jalan ----------

setupTheme();
setupPwa();
setupBukti();

// Pintasan keyboard: Q = tambah task (seperti Todoist); Esc = tutup pratinjau PDF CKP
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('ckpPrint')) { ckpClosePrint(); return; }
    if (e.key !== 'q' && e.key !== 'Q') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const a = document.activeElement;
    if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return;
    if (document.querySelector('.modal.active') || document.getElementById('ckpPrint')) return;
    e.preventDefault();
    openTaskModal();
    setTimeout(() => document.getElementById('taskTitle').focus(), 50);
});

// Kalender memakai 2 atau 3 jalur task tergantung lebar layar (batas 600px)
window.addEventListener('resize', (() => {
    let t = null, lastW = window.innerWidth;
    return () => {
        clearTimeout(t);
        t = setTimeout(() => {
            if ((lastW < 600) !== (window.innerWidth < 600)) render();
            lastW = window.innerWidth;
        }, 200);
    };
})());

// ---------- Saat HTML siap ----------

window.addEventListener('DOMContentLoaded', () => {
    // Di HP, buka aplikasi langsung ke daftar task (sidebar tertutup).
    // Skrip di <head> sudah menyembunyikannya sebelum halaman digambar.
    if (window.innerWidth <= 768) document.getElementById('sidebar').classList.add('collapsed');
    document.documentElement.removeAttribute('data-sidebar-awal');

    document.getElementById('appVersionLabel').textContent = APP_VERSION;

    loadData();
    setupEventListeners();
    setDefaultDate();
    render();
    handleLaunchParams();
});

// ---------- Setelah semua termuat ----------

window.addEventListener('load', () => setTimeout(initSync, 50));
