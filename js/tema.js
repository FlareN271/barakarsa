/* ============================================================
   tema.js — mode terang / gelap

   Pilihan: auto (ikut perangkat, bawaan) / light / dark.
   Disimpan per perangkat di localStorage `barakarsa_theme`
   (tidak disinkron). Tema pertama kali dipasang oleh skrip kecil
   di <head> index.html supaya tidak berkedip; file ini menjaga
   pilihan di menu ⋯ dan mengikuti perubahan mode perangkat.
   Halaman cetak CKP (#ckpPrint) tidak memakai variabel tema.
   ============================================================ */

const THEME_KEY = 'barakarsa_theme';
const THEME_META = {
    light: { bar: '#fbf7f4', ios: 'default' },
    dark:  { bar: '#16110e', ios: 'black-translucent' }
};
const themeMedia = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

function getThemePref() {
    try {
        const v = localStorage.getItem(THEME_KEY);
        return v === 'light' || v === 'dark' ? v : 'auto';
    } catch (e) { return 'auto'; }
}

function resolveTheme(pref) {
    if (pref === 'light' || pref === 'dark') return pref;
    return themeMedia && themeMedia.matches ? 'light' : 'dark';
}

function applyTheme() {
    const pref = getThemePref();
    const theme = resolveTheme(pref);
    document.documentElement.setAttribute('data-theme', theme);
    const bar = document.querySelector('meta[name="theme-color"]');
    if (bar) bar.setAttribute('content', THEME_META[theme].bar);
    const ios = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (ios) ios.setAttribute('content', THEME_META[theme].ios);
    document.querySelectorAll('.theme-option').forEach(el => {
        el.classList.toggle('is-current', el.dataset.themePref === pref);
    });
}

function setThemePref(pref) {
    try {
        if (pref === 'light' || pref === 'dark') localStorage.setItem(THEME_KEY, pref);
        else localStorage.removeItem(THEME_KEY);
    } catch (e) { /* mode privat: tetap berlaku sampai halaman ditutup */ }
    applyTheme();
    const label = { auto: 'Otomatis (ikut perangkat)', light: 'Terang', dark: 'Gelap' }[getThemePref()] || 'Otomatis';
    evToast('Tampilan: ' + label);
}

// Mode Otomatis: ikut berubah saat HP/komputer berganti gelap/terang
function setupTheme() {
    if (themeMedia) {
        const onSystemChange = () => { if (getThemePref() === 'auto') applyTheme(); };
        if (themeMedia.addEventListener) themeMedia.addEventListener('change', onSystemChange);
        else if (themeMedia.addListener) themeMedia.addListener(onSystemChange);
    }
    applyTheme();
}
