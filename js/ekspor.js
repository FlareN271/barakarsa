/* ============================================================
   ekspor.js — keluar-masuk data

   1) Backup: export JSON/CSV, import JSON (ganti atau gabung).
   2) Stress test (uji performa dengan task percobaan).
   3) Laporan CKP: Excel rekap, PDF per IKI (halaman cetak putih,
      lihat css/cetak.css), dan dokumen Word (.docx).
   Pustaka Excel dan Word dimuat dari CDN hanya saat dipakai.
   ============================================================ */

// ---------- Backup: export & import ----------

function deliverExport(content, filename, mimeType, formatLabel) {
    // Coba unduh biasa dulu
    let downloadWorked = false;
    try {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        downloadWorked = true;
    } catch (err) {
        downloadWorked = false;
    }

    // Panel cadangan selalu ditampilkan: di sebagian browser/pratinjau unduhan
    // di atas diam-diam tidak terjadi, jadi pengguna perlu jalan manual.
    showExportFallback(content, filename, formatLabel, downloadWorked);
}

function showExportFallback(content, filename, formatLabel, downloadWorked) {
    document.getElementById('exportFilename').textContent = filename;
    document.getElementById('exportFormatLabel').textContent = formatLabel;
    document.getElementById('exportContent').value = content;
    document.getElementById('exportNote').textContent = downloadWorked
        ? 'Kalau file tidak muncul di folder Download, browser memblokir unduhan otomatis. Salin teks di bawah dan simpan sendiri sebagai file.'
        : 'Unduhan otomatis diblokir browser. Salin teks di bawah dan simpan sendiri sebagai file.';
    document.getElementById('exportModal').classList.add('active');
}

function closeExportModal() {
    document.getElementById('exportModal').classList.remove('active');
}

function copyExportContent() {
    const textarea = document.getElementById('exportContent');
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    try {
        document.execCommand('copy');
        alert('✅ Tersalin. Tempel ke Notepad / TextEdit, lalu simpan dengan nama file di atas.');
    } catch (err) {
        alert('Silakan pilih semua teks di kotak lalu tekan Ctrl+C.');
    }
}

function buildCSV() {
    let csv = 'Title,Description,Date,Time,Project,Status,Priority,Labels,Attachment\n';

    const escape = (val) => {
        if (!val) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    };

    tasks.forEach(task => {
        const project = projects.find(p => p.id == task.project)?.name || '';
        const labels_str = task.labels.map(lid => labels.find(l => l.id === lid)?.name || '').join(';');
        csv += `${escape(task.title)},${escape(task.description)},${escape(task.date || '')},${escape(task.time || '')},${escape(project)},${escape(task.status)},${escape(PRIORITY_LABEL[task.quadrant] ? PRIORITY_LABEL[task.quadrant].long : '')},${escape(labels_str)},${escape(task.attachment)}\n`;
    });

    return csv;
}

function exportToJSON() {
    const data = { tasks, projects, labels, exportDate: new Date().toISOString() };
    const json = JSON.stringify(data, null, 2);
    const filename = `barakarsa-backup-${new Date().toISOString().split('T')[0]}.json`;
    deliverExport(json, filename, 'application/json', 'JSON');
}

function exportToCSV() {
    const csv = buildCSV();
    const filename = `barakarsa-backup-${new Date().toISOString().split('T')[0]}.csv`;
    deliverExport(csv, filename, 'text/csv', 'CSV');
}

function openPasteImportModal() {
    document.getElementById('pasteImportContent').value = '';
    document.getElementById('pasteImportModal').classList.add('active');
}

function closePasteImportModal() {
    document.getElementById('pasteImportModal').classList.remove('active');
}

function importFromPaste() {
    const content = document.getElementById('pasteImportContent').value.trim();
    if (!content) {
        alert('Kotak masih kosong. Tempel isi backup JSON dulu.');
        return;
    }
    applyImport(content);
}

function applyImport(content) {
    let data;
    try {
        data = JSON.parse(content);
    } catch (error) {
        alert('Isi backup tidak bisa dibaca. Pastikan yang ditempel adalah file JSON hasil export BARAKARSA, bukan CSV.');
        return;
    }

    if (!data.tasks || !Array.isArray(data.tasks)) {
        alert('Format backup tidak dikenali. File ini sepertinya bukan hasil export BARAKARSA.');
        return;
    }

    const replace = confirm(
        'OK = Ganti semua data dengan isi backup\n' +
        'Cancel = Gabungkan backup ke data yang ada sekarang'
    );

    if (replace) {
        tasks = data.tasks || [];
        projects = data.projects || [];
        labels = data.labels || [];
    } else {
        const existingIds = new Set(tasks.map(t => t.id));
        const incoming = data.tasks.filter(t => !existingIds.has(t.id));
        tasks = [...tasks, ...incoming];
        projects = [...new Map([...projects, ...(data.projects || [])].map(p => [p.id, p])).values()];
        labels = [...new Map([...labels, ...(data.labels || [])].map(l => [l.id, l])).values()];
    }

    saveData();
    render();
    closePasteImportModal();
    alert('\u2705 Backup berhasil diimport. Total ' + tasks.length + ' task sekarang.');
}

function importFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.csv')) {
        alert('CSV hanya untuk dibaca di Excel. Untuk mengembalikan data, gunakan file JSON.');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => applyImport(e.target.result);
    reader.onerror = () => alert('Gagal membaca file.');
    reader.readAsText(file);
    event.target.value = '';
}

// ---------- Stress test ----------

function openStressTestModal() {
    document.getElementById('stressResults').style.display = 'none';
    document.getElementById('stressTestModal').classList.add('active');
}

function closeStressTestModal() {
    document.getElementById('stressTestModal').classList.remove('active');
}

function runStressTest() {
    const count = parseInt(document.getElementById('stressCount').value);

    // Cadangkan data asli dulu (hanya bila belum ada cadangan)
    if (!localStorage.getItem('barakarsa_stress_backup')) {
        localStorage.setItem('barakarsa_stress_backup', JSON.stringify({ tasks, projects, labels }));
    }

    const quadrants = ['do', 'schedule', 'delegate', 'eliminate'];
    const statuses = ['not-started', 'in-progress', 'on-hold', 'completed'];
    const projectIds = projects.length ? projects.map(p => p.id) : [null];

    const genStart = performance.now();
    for (let i = 1; i <= count; i++) {
        tasks.push({
            id: Date.now() + i,
            title: `[TEST] Task percobaan ${i}`,
            description: `Deskripsi task percobaan nomor ${i} untuk uji performa aplikasi.`,
            date: new Date(Date.now() + (i % 60) * 86400000).toISOString().split('T')[0],
            time: '',
            quadrant: quadrants[i % 4],
            project: projectIds[i % projectIds.length],
            labels: [],
            attachment: '',
            status: statuses[i % 4],
            isInbox: false,
            isStressTest: true,
            createdAt: new Date().toISOString()
        });
    }
    const genTime = performance.now() - genStart;

    const saveStart = performance.now();
    saveData();
    const saveTime = performance.now() - saveStart;

    const renderStart = performance.now();
    render();
    const renderTime = performance.now() - renderStart;

    const searchStart = performance.now();
    tasks.filter(t => t.title.toLowerCase().includes('percobaan'));
    const searchTime = performance.now() - searchStart;

    const storageSize = new Blob([localStorage.getItem('barakarsa_v6') || '']).size;

    const verdict = (ms, good, ok) =>
        ms < good ? '🟢 Cepat' : ms < ok ? '🟡 Masih wajar' : '🔴 Lambat';

    document.getElementById('stressResults').style.display = 'block';
    document.getElementById('stressResults').innerHTML = `
        <strong>Hasil Test — ${tasks.length} task total</strong><br><br>
        Membuat ${count} task: <strong>${genTime.toFixed(0)} ms</strong> ${verdict(genTime, 100, 500)}<br>
        Menyimpan ke localStorage: <strong>${saveTime.toFixed(0)} ms</strong> ${verdict(saveTime, 50, 200)}<br>
        Menggambar ulang layar: <strong>${renderTime.toFixed(0)} ms</strong> ${verdict(renderTime, 300, 1000)}<br>
        Pencarian: <strong>${searchTime.toFixed(1)} ms</strong> ${verdict(searchTime, 50, 150)}<br>
        Ukuran data tersimpan: <strong>${(storageSize / 1024).toFixed(1)} KB</strong> ${storageSize < 2000000 ? '🟢 Aman' : '🔴 Mendekati batas'}<br><br>
        <span class="stress-hint">Sekarang coba scroll, buka menu project, dan tambah task baru untuk merasakan responsnya. Kalau sudah, klik tombol merah di bawah untuk mengembalikan data asli.</span>
    `;
}

function restoreFromStressTest() {
    const backup = localStorage.getItem('barakarsa_stress_backup');

    if (backup) {
        const data = JSON.parse(backup);
        tasks = data.tasks || [];
        projects = data.projects || [];
        labels = data.labels || [];
        localStorage.removeItem('barakarsa_stress_backup');
    } else {
        // Tidak ada cadangan: cukup buang task percobaan
        tasks = tasks.filter(t => !t.isStressTest);
    }

    saveData();
    render();
    document.getElementById('stressResults').style.display = 'none';
    alert('✅ Task percobaan dihapus. Data asli sudah kembali.');
}

// ---------- Laporan CKP ----------

// Tinggi minimum baris tabel identitas, persis template CKP (satuan dxa; 1440 = 1 inci)
const CKP_IDENT_ROW_H = [651, 702, 698, 694, 834, 563, 699, 694, 704, 700, 838, 836];


function ckpSolusiCellHTML(n) {
    const text = n.buktiSolusi ? `<div>${esc(n.buktiSolusi)}</div>` : '';
    const imgs = (n.buktiSolusiFoto || []).map(p => `<img data-photo="${p.id}" alt="">`).join('');
    return (imgs + text) || '-';
}

// ---------- Excel rekap CKP ----------
function ckpLoadXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = resolve;
        s.onerror = () => reject(new Error('Pustaka Excel gagal dimuat — cek koneksi internet.'));
        document.head.appendChild(s);
    });
}

async function ckpExportExcel() {
    try {
        evToast('Menyiapkan Excel…');
        await ckpLoadXLSX();
        const peg = ckpPegawai();
        const { start, end, m0, last } = quarterRange(ckpYear, ckpQ);
        const bulan = s => s.charAt(0) + s.slice(1).toLowerCase();
        const periode = `1 ${bulan(BULAN_ID[m0])} - ${last} ${bulan(BULAN_ID[m0 + 2])} (Triwulan ${ROMAWI[ckpQ]})`;
        const d0 = new Date(start + 'T00:00:00'), d1 = new Date(end + 'T00:00:00');
        const rows = ckpCatalog().filter(e => ckpTasksFor(e.id).length).map(e => {
            const n = ckpNote(ckpYear, ckpQ, e.id);
            return [d0, d1, '', '', e.rk_ringkas || e.rk_anggota, e.rk_anggota, 100, e.iki_anggota, n.link || '', 'Ya'];
        });
        const aoa = [
            ['Pegawai', peg.idPegawai ? `[${peg.idPegawai}] ${peg.nama}` : peg.nama],
            ['Tahun', String(ckpYear)],
            ['Periode SKP', periode],
            ['Wilayah', peg.wilayah],
            ['Unit Kerja', peg.unit],
            [],
            ['Tanggal Mulai', 'Tanggal Selesai', 'Jam Mulai', 'Jam Selesai', 'Rencana Kinerja', 'Kegiatan', 'Progres (%)', 'Capaian', 'Data Dukung', 'Capaian SKP'],
            ...rows
        ];
        const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true, dateNF: 'dd-mm-yyyy' });
        ws['!cols'] = [12, 12, 9, 9, 48, 48, 10, 60, 40, 11].map(w => ({ wch: w }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'CKP');
        XLSX.writeFile(wb, `CKP_TW${ckpQ}_${ckpYear}.xlsx`);
        const noLink = rows.filter(r => !r[8]).length;
        evToast(noLink ? `Excel tersimpan. ${noLink} baris belum ada Link Data Dukung (isi lewat ✏️ Atur).` : 'Excel tersimpan.');
    } catch (err) {
        evToast('Export Excel gagal: ' + err.message);
    }
}

// ---------- Laporan PDF (halaman cetak) ----------
let ckpPrintUrls = [];
let ckpPrevTitle = null;

async function ckpPhotoUrls(photos) {
    const out = new Map();
    const needRemote = [];
    for (const p of photos) {
        const blob = await photoDB.get('blobs', p.id).catch(() => null);
        if (blob) { const u = URL.createObjectURL(blob); ckpPrintUrls.push(u); out.set(p.id, u); continue; }
        if (p.path) needRemote.push(p);
    }
    if (needRemote.length && sb && currentUser) {
        const { data } = await sb.storage.from(EVIDENCE_BUCKET).createSignedUrls(needRemote.map(p => p.path), 3600);
        (data || []).forEach((d, i) => { if (d && d.signedUrl) out.set(needRemote[i].id, d.signedUrl); });
    }
    for (const p of photos) {
        if (out.has(p.id)) continue;
        const thumb = await photoDB.get('thumbs', p.id).catch(() => null);
        if (thumb) { const u = URL.createObjectURL(thumb); ckpPrintUrls.push(u); out.set(p.id, u); }
    }
    return out;
}

async function ckpOpenReport(entryId) {
    const e = ckpEntry(entryId);
    if (!e) return;
    const list = ckpTasksFor(entryId);
    const peg = ckpPegawai();
    const h = ckpHeader(e);
    const n = ckpNote(ckpYear, ckpQ, entryId);
    const { m0 } = quarterRange(ckpYear, ckpQ);
    const tglLapor = n.tanggal || todayISO();

    ckpClosePrint();
    const root = document.createElement('div');
    root.id = 'ckpPrint';
    root.innerHTML = `<div class="ckp-toolbar">
            <button class="btn btn-primary btn-sm" id="ckpPrintBtn" onclick="ckpDoPrint()" disabled>🖨️ Simpan PDF / Cetak</button>
            <button class="btn btn-secondary btn-sm" onclick="ckpExportWord('${entryId}')">📄 Unduh Word</button>
            <button class="btn btn-secondary btn-sm" onclick="ckpClosePrint()">Tutup</button>
            <span id="ckpPrintStatus">Memuat foto…</span>
        </div>
        <div class="ckp-sheet ckp-cover">
            <div class="ckp-title">
                <div>LAPORAN SASARAN KINERJA PEGAWAI (SKP)</div>
                <div>TRIWULAN ${ROMAWI[ckpQ]} ${ckpYear} – ${esc(h.peranLabel)}</div>
                <div>&nbsp;</div>
                <div>${esc(h.judul)}</div>
            </div>
            <table class="ckp-ident">${[
                ['NAMA', peg.nama], ['NIP', peg.nip], ['PANGKAT/GOLONGAN', peg.pangkat], ['JABATAN', peg.jabatan],
                ['TUJUAN', h.tujuan], ['TIM KERJA', h.timKerja],
                ['SASARAN KINERJA KEPALA', h.sasaranKepala], ['INDIKATOR KINERJA KEPALA', h.indikatorKepala],
                ['SASARAN KINERJA KETUA TIM', h.sasaranKetua], ['INDIKATOR KINERJA KETUA TIM', h.indikatorKetua],
                ['SASARAN KINERJA ANGGOTA TIM', h.sasaranAnggota], ['INDIKATOR KINERJA ANGGOTA TIM', h.indikatorAnggota]
            ].map(([l, v], i) => `<tr style="height:${(CKP_IDENT_ROW_H[i] / 1440).toFixed(3)}in"><td class="lbl">${l}</td><td class="sep">:</td><td class="val">${esc(v)}</td></tr>`).join('')}</table>
        </div>
        <div class="ckp-sheet ckp-land">
            <table class="ckp-main">
                <colgroup><col style="width:3.8%"><col style="width:24.23%"><col style="width:15.5%"><col style="width:29.57%"><col style="width:26.9%"></colgroup>
                <thead>
                    <tr><th colspan="5" class="fill" style="text-align:left;">BULAN : ${BULAN_ID[m0]} s.d ${BULAN_ID[m0 + 2]} ${ckpYear}</th></tr>
                    <tr class="fill"><th>No.</th><th>Uraian Kegiatan</th><th>Tanggal Pelaksanaan</th><th>Dokumentasi/ bukti dukung</th><th>Keterangan/catatan</th></tr>
                </thead>
                <tbody>${list.length ? list.map((t, i) => `<tr>
                    <td class="no">${i + 1}.</td>
                    <td>${esc(t.title)}</td>
                    <td>${esc(fmtRentang(t.date, t.dateEnd))}</td>
                    <td>${evPhotos(t).map(p => `<img data-photo="${p.id}" alt="">`).join('') || '<span class="nophoto">(belum ada foto)</span>'}</td>
                    <td>${esc(t.description || '')}</td></tr>`).join('')
                    : '<tr><td class="no">-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>'}</tbody>
            </table>
            <table class="ckp-kendala">
                <colgroup><col style="width:37.9%"><col style="width:31.6%"><col style="width:30.5%"></colgroup>
                <tr class="fill"><th>Kendala</th><th>Solusi</th><th>Bukti Dukung Pelaksanaan Solusi</th></tr>
                <tr><td>${esc(n.kendala || '-')}</td><td>${esc(n.solusi || '-')}</td><td>${ckpSolusiCellHTML(n)}</td></tr>
            </table>
            <table class="ckp-ttd"><tr>
                <td>Mengetahui,<br>Ketua Tim,<div class="space"></div>${esc(h.ketuaNama)}<br>NIP. ${esc(h.ketuaNip)}</td>
                <td>${esc(peg.kota)}, ${esc(fmtTanggal(tglLapor))}<br>Pegawai Yang Melaporkan,<div class="space"></div>${esc(peg.nama)}<br>NIP. ${esc(peg.nip)}</td>
            </tr></table>
        </div>`;
    document.body.appendChild(root);
    document.body.classList.add('ckp-printing');

    ckpPrevTitle = document.title;
    document.title = `CKP TW${ckpQ} ${ckpYear} - ${e.short}`.replace(/[\\/:*?"<>|]/g, '-');

    // Muat foto
    const photos = list.flatMap(t => evPhotos(t)).concat(n.buktiSolusiFoto || []);
    const status = document.getElementById('ckpPrintStatus');
    try {
        const urls = await ckpPhotoUrls(photos);
        const imgs = Array.from(root.querySelectorAll('img[data-photo]'));
        let done = 0, missing = 0;
        await Promise.all(imgs.map(img => new Promise(resolve => {
            const url = urls.get(img.dataset.photo);
            const finish = (ok) => { done++; if (!ok) missing++; status.textContent = `Memuat foto ${done}/${imgs.length}…`; resolve(); };
            if (!url) {
                const span = document.createElement('span');
                span.className = 'nophoto';
                span.textContent = '(foto belum tersedia di perangkat ini — login & sinkron dulu)';
                img.replaceWith(span);
                return finish(false);
            }
            const timer = setTimeout(() => finish(false), 20000);
            img.onload = () => { clearTimeout(timer); finish(true); };
            img.onerror = () => { clearTimeout(timer); finish(false); };
            img.src = url;
        })));
        status.textContent = missing ? `Siap — ${missing} foto tidak bisa dimuat.` : `Siap. Pilih "Simpan sebagai PDF" di jendela cetak dan pastikan "Grafik latar belakang" aktif.`;
    } catch (err) {
        status.textContent = 'Sebagian foto gagal dimuat: ' + err.message;
    }
    const btn = document.getElementById('ckpPrintBtn');
    if (btn) btn.disabled = false;
}

function ckpDoPrint() { window.print(); }

function ckpClosePrint() {
    const root = document.getElementById('ckpPrint');
    if (root) root.remove();
    document.body.classList.remove('ckp-printing');
    ckpPrintUrls.forEach(u => URL.revokeObjectURL(u));
    ckpPrintUrls = [];
    if (ckpPrevTitle !== null) { document.title = ckpPrevTitle; ckpPrevTitle = null; }
}

// ---------- Laporan Word (.docx) ----------
function ckpLoadDocx() {
    if (window.docx) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/docx@9.6.1/dist/index.iife.js';
        s.onload = resolve;
        s.onerror = () => reject(new Error('Pustaka Word gagal dimuat — cek koneksi internet.'));
        document.head.appendChild(s);
    });
}

async function ckpPhotoBlob(p) {
    const blob = await photoDB.get('blobs', p.id).catch(() => null);
    if (blob) return blob;
    if (p.path && sb && currentUser) {
        try {
            const { data } = await sb.storage.from(EVIDENCE_BUCKET).createSignedUrl(p.path, 600);
            if (data && data.signedUrl) {
                const r = await fetch(data.signedUrl);
                if (r.ok) return await r.blob();
            }
        } catch (e) { /* lanjut ke thumbnail */ }
    }
    return await photoDB.get('thumbs', p.id).catch(() => null);
}

async function ckpImageRun(p, maxW, maxH) {
    const blob = await ckpPhotoBlob(p);
    if (!blob) return null;
    let w = p.w, h = p.h;
    if (!w || !h) {
        const bmp = await createImageBitmap(blob);
        w = bmp.width; h = bmp.height;
        if (bmp.close) bmp.close();
    }
    let W = maxW, H = Math.round(maxW * h / w);
    if (H > maxH) { H = maxH; W = Math.round(maxH * w / h); }
    return new docx.ImageRun({ type: 'jpg', data: new Uint8Array(await blob.arrayBuffer()), transformation: { width: W, height: H } });
}

async function ckpExportWord(entryId) {
    const e = ckpEntry(entryId);
    if (!e) return;
    try {
        evToast('Menyiapkan dokumen Word…');
        await ckpLoadDocx();
        const D = window.docx;
        const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType,
                VerticalAlign, ShadingType, BorderStyle, PageOrientation, HeightRule } = D;
        const list = ckpTasksFor(entryId);
        const peg = ckpPegawai();
        const h = ckpHeader(e);
        const n = ckpNote(ckpYear, ckpQ, entryId);
        const { m0 } = quarterRange(ckpYear, ckpQ);
        const FONT = 'Times New Roman';

        const P = (text, o = {}) => new Paragraph({
            alignment: o.align, spacing: { before: 0, after: 0 }, keepNext: o.keepNext,
            children: o.runs || [new TextRun({ text: String(text == null ? '' : text), bold: o.bold, italics: o.italics, font: FONT, size: o.size || 24, color: o.color })]
        });
        const paras = (text, o) => String(text == null || text === '' ? '-' : text).split('\n').map(line => P(line, o));
        const line = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
        const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
        const ALL = { top: line, bottom: line, left: line, right: line };
        const FILL = { fill: 'FBE4D5', type: ShadingType.CLEAR, color: 'auto' };
        const cell = (children, width, o = {}) => new TableCell({
            children, width: { size: width, type: WidthType.DXA },
            borders: o.borders || ALL, shading: o.fill ? FILL : undefined,
            verticalAlign: o.v || VerticalAlign.TOP, columnSpan: o.span,
            margins: { top: 100, bottom: 100, left: 100, right: 100 }
        });
        const table = (widths, rows, o = {}) => new Table({
            width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
            columnWidths: widths, rows, alignment: o.align,
            indent: o.indent ? { size: o.indent, type: WidthType.DXA } : undefined
        });

        // --- Halaman 1 (portrait): judul + identitas
        const identW = [4106, 278, 5909];
        const identRows = [
            ['NAMA', peg.nama], ['NIP', peg.nip], ['PANGKAT/GOLONGAN', peg.pangkat], ['JABATAN', peg.jabatan],
            ['TUJUAN', h.tujuan], ['TIM KERJA', h.timKerja],
            ['SASARAN KINERJA KEPALA', h.sasaranKepala], ['INDIKATOR KINERJA KEPALA', h.indikatorKepala],
            ['SASARAN KINERJA KETUA TIM', h.sasaranKetua], ['INDIKATOR KINERJA KETUA TIM', h.indikatorKetua],
            ['SASARAN KINERJA ANGGOTA TIM', h.sasaranAnggota], ['INDIKATOR KINERJA ANGGOTA TIM', h.indikatorAnggota]
        ].map(([l, v], i) => new TableRow({
            height: { value: CKP_IDENT_ROW_H[i], rule: HeightRule.ATLEAST },
            children: [
                cell([P(l)], identW[0], { v: VerticalAlign.CENTER }),
                cell([P(':', { align: AlignmentType.CENTER })], identW[1], { v: VerticalAlign.CENTER }),
                cell(paras(v || ' '), identW[2], { v: VerticalAlign.CENTER })
            ]
        }));
        const cover = [
            P('LAPORAN SASARAN KINERJA PEGAWAI (SKP)', { bold: true, align: AlignmentType.CENTER }),
            P(`TRIWULAN ${ROMAWI[ckpQ]} ${ckpYear} – ${h.peranLabel}`, { bold: true, align: AlignmentType.CENTER }),
            P(''),
            P(h.judul, { bold: true, align: AlignmentType.CENTER }),
            P(''),
            table(identW, identRows)
        ];

        // --- Halaman 2+ (landscape): tabel kegiatan
        const mainW = [555, 3540, 2265, 4320, 3930];
        const rows = [
            new TableRow({ tableHeader: true, children: [cell([P(`BULAN : ${BULAN_ID[m0]} s.d ${BULAN_ID[m0 + 2]} ${ckpYear}`)], mainW.reduce((a, b) => a + b, 0), { fill: true, span: 5 })] }),
            new TableRow({ tableHeader: true, children: ['No.', 'Uraian Kegiatan', 'Tanggal Pelaksanaan', 'Dokumentasi/ bukti dukung', 'Keterangan/catatan']
                .map((t, i) => cell([P(t, { align: AlignmentType.CENTER })], mainW[i], { fill: true })) })
        ];
        let missing = 0;
        for (let i = 0; i < list.length; i++) {
            const t = list[i];
            const pics = [];
            for (const p of evPhotos(t)) {
                const run = await ckpImageRun(p, 230, 220);
                if (run) pics.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [run] }));
                else missing++;
            }
            rows.push(new TableRow({
                cantSplit: true,
                children: [
                    cell([P(`${i + 1}.`, { align: AlignmentType.CENTER })], mainW[0], { v: VerticalAlign.CENTER }),
                    cell(paras(t.title), mainW[1]),
                    cell([P(fmtRentang(t.date, t.dateEnd))], mainW[2]),
                    cell(pics.length ? pics : [P('-')], mainW[3]),
                    cell(paras(t.description || ''), mainW[4])
                ]
            }));
        }
        if (!list.length) rows.push(new TableRow({ children: mainW.map(w => cell([P('-')], w)) }));

        // Kendala / solusi
        const kW = [5098, 4253, 4111];
        const solusiPics = [];
        for (const p of (n.buktiSolusiFoto || [])) {
            const run = await ckpImageRun(p, 220, 200);
            if (run) solusiPics.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [run] }));
            else missing++;
        }
        const solusiCell = solusiPics.concat(n.buktiSolusi ? paras(n.buktiSolusi) : []);
        const kendala = table(kW, [
            new TableRow({ tableHeader: true, cantSplit: true, children: ['Kendala', 'Solusi', 'Bukti Dukung Pelaksanaan Solusi'].map((t, i) => cell([P(t, { align: AlignmentType.CENTER, keepNext: true })], kW[i], { fill: true })) }),
            new TableRow({ cantSplit: true, height: { value: 860, rule: HeightRule.ATLEAST }, children: [
                cell(paras(n.kendala), kW[0], { v: VerticalAlign.CENTER }),
                cell(paras(n.solusi), kW[1], { v: VerticalAlign.CENTER }),
                cell(solusiCell.length ? solusiCell : [P('-')], kW[2], { v: VerticalAlign.CENTER })
            ] })
        ], { indent: -431 });

        // Tanda tangan
        const tW = [5771, 6278];
        const C = AlignmentType.CENTER;
        const ttd = table(tW, [new TableRow({ cantSplit: true, children: [
            cell([P('Mengetahui,', { align: C }), P('Ketua Tim,', { align: C }), P(''), P(''), P(''), P(''), P(h.ketuaNama, { align: C }), P(`NIP. ${h.ketuaNip || ''}`, { align: C }), P('')], tW[0]),
            cell([P(`${peg.kota}, ${fmtTanggal(n.tanggal || todayISO())}`, { align: C }), P('Pegawai Yang Melaporkan,', { align: C }), P(''), P(''), P(''), P(''), P(peg.nama, { align: C }), P(`NIP. ${peg.nip}`, { align: C }), P('')], tW[1])
        ] })], { indent: 704 });

        const pageMargin = { top: 1440, right: 1440, bottom: 1440, left: 1440 };
        const doc = new Document({
            creator: 'Barakarsa',
            title: `CKP TW${ckpQ} ${ckpYear} - ${e.short}`,
            styles: { default: { document: { run: { font: FONT, size: 24 } } } },
            sections: [
                { properties: { page: { size: { width: 12240, height: 15840 }, margin: pageMargin } }, children: cover },
                { properties: { page: { size: { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE }, margin: pageMargin } },
                  children: [table(mainW, rows, { indent: -572 }), P(''), P(''), kendala, P(''), P(''), ttd] }
            ]
        });
        const blob = await Packer.toBlob(doc);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `CKP TW${ckpQ} ${ckpYear} - ${e.short}.docx`.replace(/[\\/:*?"<>|]/g, '-');
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
        evToast(missing ? `Word tersimpan — ${missing} foto tidak tersedia di perangkat ini (login & sinkron dulu).` : 'Dokumen Word tersimpan.');
    } catch (err) {
        console.error(err);
        evToast('Export Word gagal: ' + err.message);
    }
}
