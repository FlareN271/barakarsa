/* ============================================================
   project-label.js — Project (folder, satu per task) dan
   Label (penanda, banyak per task)

   Catatan id: task.project tersimpan sebagai teks (dari <select>),
   sedangkan id project berupa angka — bandingkan dengan ==.
   ============================================================ */

let editingProjectId = null;          // null = membuat project baru
let currentContextProjectId = null;   // project yang menu ⋯-nya sedang terbuka

// Kotak pilihan warna di form project dan form label
function setupColorPickers() {
    ['projectColorPicker', 'labelColorPicker'].forEach(id => {
        const picker = document.getElementById(id);
        picker.innerHTML = '';
        colorPalette.forEach(color => {
            const div = document.createElement('div');
            div.className = 'color-option';
            div.style.backgroundColor = color;
            div.dataset.color = color;
            div.onclick = () => {
                picker.parentElement.querySelectorAll('.color-option').forEach(e => e.classList.remove('selected'));
                div.classList.add('selected');
            };
            picker.appendChild(div);
        });
    });
}

function clearColorSelection(pickerId) {
    document.getElementById(pickerId).querySelectorAll('.color-option').forEach(e => e.classList.remove('selected'));
}

// ---------- Project ----------

function showProjectMenu(projectId, event) {
    event.stopPropagation();
    currentContextProjectId = projectId;
    const menu = document.getElementById('projectMenu');
    const rect = event.target.getBoundingClientRect();
    menu.style.display = 'block';
    menu.style.position = 'fixed';
    menu.style.top = (rect.bottom + 5) + 'px';
    menu.style.left = rect.left + 'px';
}

function hideProjectMenu() {
    document.getElementById('projectMenu').style.display = 'none';
}

function openProjectModal() {
    editingProjectId = null;
    document.getElementById('projectModalTitle').textContent = 'Create Project';
    document.getElementById('projectSubmitBtn').textContent = 'Create';
    document.querySelector('#projectModal form').reset();
    clearColorSelection('projectColorPicker');
    document.getElementById('projectModal').classList.add('active');
}

function closeProjectModal() {
    document.getElementById('projectModal').classList.remove('active');
}

function editProject(id) {
    hideProjectMenu();
    const project = projects.find(p => p.id == id);
    if (!project) return;
    openProjectModal();
    editingProjectId = project.id;
    document.getElementById('projectModalTitle').textContent = 'Edit Project';
    document.getElementById('projectSubmitBtn').textContent = '💾 Save';
    document.getElementById('projectName').value = project.name || '';
    document.getElementById('projectCkp').checked = !!project.ckp;

    // Tandai warna project saat ini (bandingkan dalam format yang sama dari browser)
    const norm = c => { const d = document.createElement('div'); d.style.backgroundColor = c; return d.style.backgroundColor; };
    const target = norm(project.color);
    document.getElementById('projectColorPicker').querySelectorAll('.color-option').forEach(el => {
        el.classList.toggle('selected', norm(el.dataset.color || el.style.backgroundColor) === target);
    });
}

function saveProject(e) {
    e.preventDefault();

    const name = document.getElementById('projectName').value.trim();
    if (!name) return;

    const picked = document.getElementById('projectColorPicker').querySelector('.color-option.selected');
    const pickedColor = picked ? (picked.dataset.color || picked.style.backgroundColor) : null;
    const ckp = document.getElementById('projectCkp').checked;

    if (editingProjectId !== null) {
        projects = projects.map(p => p.id == editingProjectId
            ? { ...p, name, color: pickedColor || p.color, ckp }
            : p);
        editingProjectId = null;
    } else {
        projects.push({ id: nextProjectId++, name, color: pickedColor || '#10b981', ckp, mig31: true });
    }

    saveData();
    closeProjectModal();
    debouncedRender();
}

function confirmDeleteProject(id) {
    hideProjectMenu();
    const p = projects.find(x => x.id == id);
    const n = tasks.filter(t => t.project == id).length;
    openConfirmDialog('project', id, `Hapus project "${p ? p.name : ''}"?` +
        (n ? ` ${n} task di dalamnya tetap ada, hanya dilepas dari project.` : '') +
        (p && p.ckp ? ' Task-task itu juga tidak lagi masuk CKP.' : ''));
}

function deleteProject(id) {
    projects = projects.filter(p => p.id != id);
    tasks = tasks.map(t => t.project == id ? { ...t, project: null } : t);
    if (currentProjectFilter == id) currentProjectFilter = null;
    saveData();
    debouncedRender();
}

// ---------- Label ----------

function openLabelModal() {
    document.querySelector('#labelModal form').reset();
    clearColorSelection('labelColorPicker');
    document.getElementById('labelModal').classList.add('active');
}

function closeLabelModal() {
    document.getElementById('labelModal').classList.remove('active');
}

function saveLabel(e) {
    e.preventDefault();

    const name = document.getElementById('labelName').value.trim();
    if (!name) return;

    const color = document.getElementById('labelColorPicker').querySelector('.color-option.selected')?.style.backgroundColor || '#10b981';

    labels.push({ id: nextLabelId++, name, color });
    saveData();
    closeLabelModal();
    debouncedRender();
}

function confirmDeleteLabel(id) {
    openConfirmDialog('label', id, 'Are you sure you want to delete this label?');
}

function deleteLabel(id) {
    labels = labels.filter(l => l.id !== id);
    tasks = tasks.map(t => ({ ...t, labels: t.labels.filter(lid => lid !== id) }));
    saveData();
    debouncedRender();
}
