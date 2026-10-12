/* ============================================================
   form-task.js — tambah, edit, simpan, duplikat, hapus task

   Satu alur utuh untuk form task: field biasa, IKI & rentang
   tanggal (ckp.js), foto bukti dukung (bukti.js), waktu selesai
   (data.js) dan posisi salinan. Juga centang selesai dan dialog
   konfirmasi hapus. Tambah cepat (dulu Inbox cepat) ada di cepat.js sejak 3.7.
   ============================================================ */

let editingTaskId = null;   // id task yang sedang diedit (null = task baru)
let dupSourceId = null;     // id task asal saat form dibuka lewat "Duplikat"

// ---------- Buka & tutup form ----------

function openTaskModal() {
    editingTaskId = null;
    dupSourceId = null;
    document.getElementById('taskForm').reset();
    document.getElementById('taskDetailsForm').reset();
    document.getElementById('taskModalTitle').textContent = '✏️ Add Task';
    document.getElementById('taskStatus').value = 'in-progress';
    document.getElementById('taskQuadrant').value = '';   // 3.7: tanpa prioritas sebagai bawaan
    setDefaultDate();
    tampilkanLinkDrive('');
    renderTaskLabels();
    renderProjectSelect();
    clearTaskLabelSelection();
    document.getElementById('taskModal').classList.add('active');

    evLoad(null);
    ckpLoadTaskForm(null);
    pgMuatForm(null);
    setEditButtonsVisible(false);
}

function editTask(id) {
    dupSourceId = null;
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    editingTaskId = id;
    document.getElementById('taskModalTitle').textContent = '✏️ Edit Task';
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDesc').value = task.description;
    document.getElementById('taskDate').value = task.date;
    document.getElementById('taskTime').value = task.time;
    document.getElementById('taskQuadrant').value = prioAktif(task.quadrant) ? task.quadrant : '';
    renderProjectSelect(); // isi opsi dulu, supaya nilai project tidak hilang saat edit pertama setelah halaman dibuka
    document.getElementById('taskProject').value = task.project || '';
    document.getElementById('taskStatus').value = task.status;
    document.getElementById('taskAttachment').value = task.attachment || '';
    tampilkanLinkDrive(task.attachment);

    renderTaskLabels();
    task.labels.forEach(lid => {
        const checkbox = document.querySelector(`input[name="label-${lid}"]`);
        if (checkbox) checkbox.checked = true;
    });

    document.getElementById('taskModal').classList.add('active');

    evLoad(task);
    ckpLoadTaskForm(task);
    pgMuatForm(task);
    setEditButtonsVisible(true);
}

// Kolom Google Drive Link (3.7): hanya untuk task yang sudah punya link.
// Foto bukti dukung menggantikannya; link lama tetap bisa dibuka atau dihapus.
function tampilkanLinkDrive(link) {
    document.getElementById('attachmentGroup').hidden = !String(link || '').trim();
}

// Tombol Hapus & Duplikat di footer hanya untuk task yang sudah ada
function setEditButtonsVisible(visible) {
    document.getElementById('taskDupBtn').style.display = visible ? '' : 'none';
    document.getElementById('taskDelBtn').style.display = visible ? '' : 'none';
}

function closeTaskModal() {
    evDiscard(); // foto baru yang belum disimpan dibuang
    document.getElementById('taskModal').classList.remove('active');
}

function closeTaskModalOnOverlay(event) {
    if (event.target.id === 'taskModal') closeTaskModal();
}

function setDefaultDate() {
    document.getElementById('taskDate').value = todayISO();
}

function renderTaskLabels() {
    document.getElementById('taskLabelsForm').innerHTML = labels.map(label => `
        <label class="label-checkbox">
            <input type="checkbox" name="label-${label.id}" value="${label.id}">
            <span class="label-checkbox-dot" style="background: ${esc(label.color)};"></span>
            ${esc(label.name)}
        </label>
    `).join('');
}

function clearTaskLabelSelection() {
    document.querySelectorAll('input[name^="label-"]').forEach(el => el.checked = false);
}

function renderProjectSelect() {
    const select = document.getElementById('taskProject');
    const currentValue = select.value;
    select.innerHTML = '<option value="">No Project</option>' + projects.map(p =>
        `<option value="${p.id}">${esc(p.name)}</option>`
    ).join('');
    select.value = currentValue;
}

// ---------- Simpan ----------

function saveTask(e) {
    if (e) e.preventDefault();
    if (evBusy > 0) {
        evToast('Tunggu sebentar, foto masih diproses…');
        return;
    }

    const title = document.getElementById('taskTitle').value.trim();
    if (!title) return;

    const before = editingTaskId ? tasks.find(t => t.id === editingTaskId) : null;
    const selectedLabels = Array.from(document.querySelectorAll('input[name^="label-"]:checked'))
        .map(el => parseInt(el.value));

    // Field yang tidak ada di form (order, photos, completedAt, updatedAt, …)
    // dibawa dari task lama. completedAt diurus trackCompletion() saat saveData().
    const task = {
        ...(before || {}),
        id: editingTaskId || Date.now(),
        title,
        description: document.getElementById('taskDesc').value,
        date: document.getElementById('taskDate').value,
        time: document.getElementById('taskTime').value,
        quadrant: document.getElementById('taskQuadrant').value,
        project: document.getElementById('taskProject').value || null,
        labels: selectedLabels,
        attachment: document.getElementById('taskAttachment').value,
        status: document.getElementById('taskStatus').value,
        isInbox: false,
        createdAt: before ? before.createdAt : new Date().toISOString()
    };
    // Status sebelum Completed, untuk hapus centang (3.7.1)
    if (task.status === 'completed') {
        if (before && before.status !== 'completed') task.statusLama = before.status;
    } else {
        delete task.statusLama;
    }
    ckpApplyToTask(task);                              // IKI & "Sampai tanggal"
    pgTerapkanKeTask(task);                            // 🔔 pengingat per task (3.4)
    evCommit(task, before ? evPhotos(before) : []);    // foto bukti dukung

    const posisi = before ? baraCatatPosisi(before.id) : null;   // tempat jejak Bara (3.6)
    const isCopy = !before && dupSourceId !== null;
    const src = isCopy ? tasks.find(t => t.id === dupSourceId) : null;
    if (before) {
        tasks = tasks.map(t => t.id === editingTaskId ? task : t);
    } else if (src) {
        placeCopyBelow(task, src);
    } else {
        tasks.push(task);
    }
    dupSourceId = null;

    saveData();
    closeTaskModal();
    // Bara: task yang disunting menjadi Completed ikut dirayakan
    if (before && baraSetelahUbah(task.id, before.status, posisi)) setTimeout(debouncedRender, 280);
    else debouncedRender();
    evProcessQueue();
    if (isCopy) evToast('Salinan task dibuat.');
}

// Salinan diletakkan tepat di bawah task aslinya
function placeCopyBelow(copy, src) {
    const idx = tasks.indexOf(src);
    const next = tasks[idx + 1];
    tasks.splice(idx + 1, 0, copy);
    if (typeof src.order === 'number') {
        copy.order = (next && typeof next.order === 'number') ? (src.order + next.order) / 2 : src.order + 1000;
    }
    copy.isInbox = !!src.isInbox;
    if (copy.status === 'completed' && src.status === 'completed' && src.completedAt !== undefined) {
        copy.completedAt = src.completedAt;
    }
}

// ---------- Duplikat ----------
// Salinan dibuka di form dulu; baru tercipta saat Save.
// Ikut disalin: judul, description, project, label, priority, IKI,
// tanggal, jam, pengingat, rentang tanggal, status, link. Foto tidak ikut.
function duplicateTask(id) {
    const src = tasks.find(t => t.id === id);
    if (!src) return;
    if (document.getElementById('taskModal').classList.contains('active')) closeTaskModal();

    openTaskModal();
    dupSourceId = src.id;
    document.getElementById('taskModalTitle').textContent = '⧉ Duplikat Task';
    document.getElementById('taskTitle').value = src.title || '';
    document.getElementById('taskDesc').value = src.description || '';
    document.getElementById('taskDate').value = src.date || '';
    document.getElementById('taskTime').value = src.time || '';
    document.getElementById('taskQuadrant').value = prioAktif(src.quadrant) ? src.quadrant : '';
    document.getElementById('taskProject').value = src.project || '';
    document.getElementById('taskStatus').value = src.status || 'in-progress';
    document.getElementById('taskAttachment').value = src.attachment || '';
    tampilkanLinkDrive(src.attachment);
    clearTaskLabelSelection();
    (src.labels || []).forEach(lid => {
        const cb = document.querySelector(`input[name="label-${lid}"]`);
        if (cb) cb.checked = true;
    });
    ckpLoadTaskForm(src); // IKI, rentang tanggal, tampilan khusus project CKP
    pgMuatForm(src);      // 🔔 pengingat per task ikut disalin
    evToast('Salinan belum tersimpan. Ubah seperlunya lalu Save. Foto tidak ikut disalin.');
}

// ---------- Hapus ----------

function confirmDeleteTask(id) {
    openConfirmDialog('task', id, 'Are you sure you want to delete this task?');
}

// Dari tombol Hapus di form edit
function deleteTaskFromModal() {
    if (!editingTaskId) return;
    const t = tasks.find(x => x.id === editingTaskId);
    const photos = t && Array.isArray(t.photos) ? t.photos.length : 0;
    openConfirmDialog('task', editingTaskId,
        'Hapus task ini?' + (photos ? ` ${photos} foto bukti dukungnya juga ikut terhapus.` : ''));
}

// Menghapus task beserta foto bukti dukungnya (lokal dan di server)
function deleteTask(id) {
    const photos = evPhotos(tasks.find(t => t.id === id));
    tasks = tasks.filter(t => t.id !== id);
    saveData();
    debouncedRender();

    if (photos.length) {
        evTrash(photos.map(p => p.path));
        photos.forEach(p => evForgetLocal(p.id));
        evProcessQueue();
    }

    // Dihapus dari form edit: tutup form-nya
    if (editingTaskId === id && document.getElementById('taskModal').classList.contains('active')) {
        closeTaskModal();
        evToast('Task dihapus.');
    }
}

// ---------- Centang selesai ----------

// Centang (3.7.1):
//   In Progress           → langsung Completed
//   Not Started / On Hold / Cancelled → tanya dulu: ✓ Selesai atau ▶ Mulai kerjakan
//   Completed (hapus centang) → kembali ke status sebelum dicentang (task.statusLama),
//                           atau In Progress bila tidak tercatat (task dari versi lama)
const STATUS_TANYA = ['not-started', 'on-hold', 'cancelled'];
const STATUS_BOLEH_KEMBALI = ['not-started', 'in-progress', 'on-hold', 'cancelled'];

function toggleStatus(id, pilihan) {
    const lama = tasks.find(t => t.id === id);
    if (!lama) return;
    const sebelum = lama.status;

    if (sebelum === 'completed') {
        const kembali = STATUS_BOLEH_KEMBALI.includes(lama.statusLama) ? lama.statusLama : 'in-progress';
        tasks = tasks.map(t => {
            if (t.id !== id) return t;
            const { statusLama, ...sisa } = t;
            return { ...sisa, status: kembali };
        });
        saveData();
        debouncedRender();
        return;
    }

    if (!pilihan && STATUS_TANYA.includes(sebelum)) { tanyaCentang(id); return; }

    const baru = pilihan || 'completed';
    if (baru === sebelum) { debouncedRender(); return; }
    const posisi = baraCatatPosisi(id);                 // tempat jejak Bara (3.6)
    tasks = tasks.map(t => t.id === id
        ? (baru === 'completed' ? { ...t, status: baru, statusLama: sebelum } : { ...t, status: baru })
        : t);
    saveData();
    // Bara: perayaan bila task jadi Completed; kartu digeser keluar dulu (±0,3 detik)
    if (baraSetelahUbah(id, sebelum, posisi)) setTimeout(debouncedRender, 280);
    else debouncedRender();
}

// ---------- Pilihan saat mencentang task yang belum dimulai (3.7.1) ----------

let tanyaCentangId = null;

function tanyaCentang(id) {
    tutupTanyaCentang();
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    // Kotak centang dikembalikan dulu (statusnya belum berubah)
    const kotak = Array.from(document.querySelectorAll(`.task-item[data-task-id="${id}"] .task-checkbox`))
        .find(el => el.offsetParent !== null);
    if (kotak) kotak.checked = false;
    tanyaCentangId = id;

    const ket = { 'not-started': 'Belum dimulai', 'on-hold': 'Sedang ditunda', 'cancelled': 'Dibatalkan' }[task.status] || '';
    const lapis = document.createElement('div');
    lapis.className = 'tc-lapis';
    lapis.onclick = (e) => { if (e.target === lapis) tutupTanyaCentang(); };
    lapis.innerHTML = `<div class="tc-kotak" role="dialog" aria-modal="true" aria-label="Tandai task">
        <div class="tc-ket">${esc(ket)} · <span class="tc-judul">${esc(task.title)}</span></div>
        <div class="tc-tombol">
            <button type="button" class="btn btn-primary btn-sm" onclick="pilihCentang('completed')">✓ Selesai</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="pilihCentang('in-progress')">▶ ${task.status === 'not-started' ? 'Mulai kerjakan' : 'Kerjakan lagi'}</button>
        </div></div>`;
    document.body.appendChild(lapis);

    // Letakkan di dekat kotak centang (di bawahnya; di atasnya bila tidak muat)
    const el = lapis.querySelector('.tc-kotak');
    const r = kotak ? kotak.getBoundingClientRect() : { left: innerWidth / 2 - 130, bottom: innerHeight / 2, top: innerHeight / 2 };
    const w = el.offsetWidth, h = el.offsetHeight;
    const x = Math.max(8, Math.min(r.left - 8, innerWidth - w - 8));
    let y = r.bottom + 6;
    if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 6);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.querySelector('button').focus();
}

function pilihCentang(status) {
    const id = tanyaCentangId;
    tutupTanyaCentang();
    if (id != null) toggleStatus(id, status);
}

function tutupTanyaCentang() {
    tanyaCentangId = null;
    document.querySelectorAll('.tc-lapis').forEach(el => el.remove());
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tanyaCentangId != null) tutupTanyaCentang();
});

// ---------- Dialog konfirmasi hapus (task, project, label) ----------

let pendingDeleteType = null;
let pendingDeleteId = null;

function openConfirmDialog(type, id, message) {
    pendingDeleteType = type;
    pendingDeleteId = id;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmButton').textContent =
        type === 'task' ? '🗑️ Delete Task' : type === 'label' ? '🗑️ Delete Label' : '🗑️ Delete Project';
    document.getElementById('confirmModal').classList.add('active');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
    pendingDeleteType = null;
    pendingDeleteId = null;
}

function confirmDelete() {
    if (pendingDeleteType === 'task') deleteTask(pendingDeleteId);
    else if (pendingDeleteType === 'project') deleteProject(pendingDeleteId);
    else if (pendingDeleteType === 'label') deleteLabel(pendingDeleteId);
    closeConfirmModal();
}
