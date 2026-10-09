/* ============================================================
   tampilan.js — menggambar layar

   Menu (Dashboard, Inbox, Today, Upcoming, All Tasks, Completed,
   Labels, Reporting), tampilan List / Board / Kalender, urutkan,
   filter, pencarian, project di sidebar, dan drag & drop urutan.
   Semua perubahan layar lewat render().
   ============================================================ */

// ---------- Status tampilan ----------
let currentView = 'dashboard';
let currentAllDisplayView = 'list';   // All Tasks: list / board / calendar
let currentProjectFilter = null;      // id project yang sedang dilihat (klik di sidebar)
let activeFilters = { status: [], quadrant: [], labels: [] };

const VIEW_TITLES = {
    dashboard: '📊 Dashboard',
    inbox: '📬 Inbox',
    today: '📅 Today',
    upcoming: '📆 Upcoming',
    all: '📚 All Tasks',
    completed: '✅ Completed',
    filters: '🏷️ Labels',
    reporting: '📈 Reporting'
};

const STATUS_EMOJI = { 'not-started': '🟡', 'in-progress': '🔵', 'on-hold': '⏸️', 'completed': '✅', 'cancelled': '❌' };
const STATUS_LABEL = { 'not-started': 'Not Started', 'in-progress': 'In Progress', 'on-hold': 'On Hold', 'completed': 'Completed', 'cancelled': 'Cancelled' };
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// Gabungkan beberapa permintaan render yang beruntun menjadi satu
let renderTimeoutId = null;
function debouncedRender() {
    clearTimeout(renderTimeoutId);
    renderTimeoutId = setTimeout(() => render(), 50);
}

// ---------- Pindah menu ----------

function switchView(view, clearFilters = true) {
    if (view !== 'completed') evMissingOnly = false;
    currentView = view;
    if (clearFilters) {
        currentProjectFilter = null;
        activeFilters = { status: [], quadrant: [], labels: [] };
    }

    document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`.sidebar-item[data-view="${view}"]`).classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById('headerTitle').textContent = VIEW_TITLES[view];
    document.getElementById(view + 'View').style.display = 'block';
    render();

    // Pilihan urutan tidak berguna di Labels dan Reporting
    document.getElementById('sortSelect').style.display = (view === 'filters' || view === 'reporting') ? 'none' : '';
}

function switchAllView(displayView) {
    currentAllDisplayView = displayView;
    document.querySelectorAll('#allViewToggle .view-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`#allViewToggle [data-view="${displayView}"]`).classList.add('active');
    render();
}

// HP: klik di area konten menutup sidebar
function closeSidebarOnMobile() {
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar.classList.contains('collapsed')) sidebar.classList.add('collapsed');
    }
}

// v3.1: klik project selalu menampilkan project itu (dulu klik kedua membatalkan
// filter, sehingga klik ganda terasa "bolak-balik"). Keluar lewat menu Dashboard.
function filterByProject(projectId) {
    currentProjectFilter = projectId;
    switchView('dashboard', false);
}

// ---------- Filter ----------

function toggleFilterPanel(panelName) {
    const panel = document.getElementById(panelName + 'FilterPanel');
    if (panel.style.display === 'none') {
        renderFilterPanel(panelName);
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}

function renderFilterPanel(panelName) {
    const panelContent = document.getElementById(panelName + 'FilterPanel');
    const opt = (type, value, text) =>
        `<div class="filter-option ${activeFilters[type].includes(value) ? 'active' : ''}" onclick="toggleFilter('${type}', ${typeof value === 'number' ? value : `'${value}'`})">${text}</div>`;
    panelContent.innerHTML = `
        <div class="filter-section">
            <div class="filter-section-title">Status</div>
            <div class="filter-options">
                ${opt('status', 'not-started', '🟡 Not Started')}
                ${opt('status', 'in-progress', '🔵 In Progress')}
                ${opt('status', 'on-hold', '⏸️ On Hold')}
                ${opt('status', 'cancelled', '❌ Cancelled')}
            </div>
        </div>
        <div class="filter-section">
            <div class="filter-section-title">Priority</div>
            <div class="filter-options">
                ${opt('quadrant', 'do', '🔴 Priority 1')}
                ${opt('quadrant', 'schedule', '🟠 Priority 2')}
                ${opt('quadrant', 'delegate', '🔵 Priority 3')}
                ${opt('quadrant', 'eliminate', '⚪ Priority 4')}
            </div>
        </div>
        ${labels.length > 0 ? `
        <div class="filter-section">
            <div class="filter-section-title">Labels</div>
            <div class="filter-options">
                ${labels.map(label => opt('labels', label.id, esc(label.name))).join('')}
            </div>
        </div>` : ''}
    `;
}

function toggleFilter(filterType, value) {
    const index = activeFilters[filterType].indexOf(value);
    if (index > -1) activeFilters[filterType].splice(index, 1);
    else activeFilters[filterType].push(value);
    render();
}

// Terapkan filter project, status, priority, label, "tanpa bukti dukung",
// lalu urutan yang dipilih.
function getFilteredTasks(taskList) {
    let filtered = taskList;
    if (currentProjectFilter !== null) filtered = filtered.filter(t => t.project == currentProjectFilter);
    if (activeFilters.status.length) filtered = filtered.filter(t => activeFilters.status.includes(t.status));
    if (activeFilters.quadrant.length) filtered = filtered.filter(t => activeFilters.quadrant.includes(t.quadrant));
    if (activeFilters.labels.length) filtered = filtered.filter(t => t.labels.some(l => activeFilters.labels.includes(l)));
    if (evMissingOnly && currentView === 'completed') filtered = filtered.filter(evIsMissing);
    return sortMode === 'manual' ? filtered : sortTaskList(filtered);
}

// ---------- Urutkan ----------
// 'manual' = urutan drag & drop (field order). Pilihan disimpan per perangkat.
let sortMode = localStorage.getItem('barakarsa_sort') || 'manual';
const Q_RANK = { do: 0, schedule: 1, delegate: 2, eliminate: 3 };
const S_RANK = { 'in-progress': 0, 'not-started': 1, 'on-hold': 2, 'completed': 3, 'cancelled': 4 };

const byDateAsc = (a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '');
};

function sortTaskList(list) {
    const arr = list.slice();
    if (sortMode === 'date-asc') arr.sort(byDateAsc);
    else if (sortMode === 'date-desc') arr.sort((a, b) => (!a.date ? 1 : !b.date ? -1 : -byDateAsc(a, b)));
    else if (sortMode === 'name') arr.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'id', { sensitivity: 'base', numeric: true }));
    else if (sortMode === 'priority') arr.sort((a, b) => ((Q_RANK[a.quadrant] ?? 9) - (Q_RANK[b.quadrant] ?? 9)) || byDateAsc(a, b));
    else if (sortMode === 'status') arr.sort((a, b) => ((S_RANK[a.status] ?? 9) - (S_RANK[b.status] ?? 9)) || byDateAsc(a, b));
    return arr;
}

function setSortMode(mode) {
    sortMode = mode;
    localStorage.setItem('barakarsa_sort', mode);
    document.body.classList.toggle('is-sorted', mode !== 'manual');
    render();
}

function setupSortSelect() {
    const sel = document.getElementById('sortSelect');
    sel.value = sortMode;
    sel.onchange = () => setSortMode(sel.value);
    document.body.classList.toggle('is-sorted', sortMode !== 'manual');
}

// ---------- Pencarian ----------

function performSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const results = tasks.filter(t =>
        t.status !== 'completed' && (
            t.title.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query)
        )
    );
    renderTaskList(document.getElementById('allList'), results, currentAllDisplayView);
}

// Pencarian di sidebar: mencari di semua task (termasuk yang selesai), hasil di All Tasks
function performGlobalSearch(query) {
    if (query === '') {
        switchView('all');
        return;
    }
    const results = tasks.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
    );
    switchView('all');
    renderTaskList(document.getElementById('allList'), results, currentAllDisplayView);
}

// ---------- Kartu task (List) ----------

// Teks dari pengguna (judul, description, nama project/label) selalu lewat esc(),
// supaya karakter seperti < > & tampil apa adanya, bukan dibaca sebagai HTML.
function createTaskHTML(task) {
    const prio = PRIORITY_LABEL[task.quadrant];
    const project = task.project ? projects.find(p => p.id == task.project) : null;

    let dateStr = '';
    if (task.date) {
        dateStr = fmtPendek(task.date);
        if (task.dateEnd && task.dateEnd > task.date) dateStr += '–' + fmtPendek(task.dateEnd);
    }
    const timeStr = task.time ? ` ${task.time}` : '';

    // Badge IKI hanya untuk task CKP, dan hanya bila katalog IKI sudah diimpor
    let ikiBadge = '';
    if (isCkpTask(task) && ckpAllEntries().length) {
        const e = ckpEntry(task.iki);
        ikiBadge = e ? `<span class="badge iki-badge" title="${esc(e.iki_anggota)}">🎯 ${esc(e.short)}</span>`
                     : '<span class="badge ev-missing" title="Pilih IKI supaya masuk CKP">🎯 IKI?</span>';
    }

    return `
        <div class="task-item ${task.status === 'completed' ? 'completed' : ''}" data-task-id="${task.id}" draggable="false">
            <span class="drag-handle" title="Tahan dan geser untuk mengubah urutan">⠿</span>
            <input type="checkbox" class="task-checkbox" ${task.status === 'completed' ? 'checked' : ''} onchange="toggleStatus(${task.id})">
            <div class="task-content">
                <div class="task-title" onclick="editTask(${task.id})">${esc(task.title)}</div>
                ${task.description ? `<div class="task-description">${esc(task.description)}</div>` : ''}
                <div class="task-meta">${ikiBadge}${evBadgeHTML(task)}
                    ${project ? `<span class="badge"><span class="badge-dot" style="background: ${esc(project.color)};"></span>${esc(project.name)}</span>` : ''}
                    ${task.labels.map(lid => {
                        const label = labels.find(l => l.id === lid);
                        return `<span class="badge" style="border-color: ${esc(label.color)};"><span class="badge-dot" style="background: ${esc(label.color)};"></span>${esc(label.name)}</span>`;
                    }).join('')}
                    ${prio && task.status !== 'completed' ? `<span class="badge prio-badge prio-${task.quadrant}" title="${prio.long}">⚑ ${prio.short}</span>` : ''}
                    <span class="badge">${STATUS_EMOJI[task.status]} ${STATUS_LABEL[task.status]}</span>
                    ${dateStr ? `<span class="badge">📅 ${dateStr}${timeStr}</span>` : ''}
                    ${task.attachment ? `<span class="badge">🔗 Link</span>` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="btn btn-secondary btn-sm" title="Duplikat task" onclick="duplicateTask(${task.id})">⧉</button>
                <button class="btn btn-danger btn-sm" title="Hapus task" onclick="confirmDeleteTask(${task.id})">🗑️</button>
            </div>
        </div>
    `;
}

const ADD_TASK_INLINE = '<div class="add-task-inline" onclick="openTaskModal()">➕ Add new task</div>';

function emptyState(icon, text, buttonText) {
    return `<div class="empty-state"><div class="empty-icon">${icon}</div><p>${text}</p>` +
        (buttonText ? `<button class="btn btn-primary" onclick="openTaskModal()">${buttonText}</button>` : '') + '</div>';
}

function renderTaskList(container, taskList, displayView = 'list') {
    if (taskList.length === 0) {
        container.innerHTML = emptyState('📝', 'No tasks', '➕ Create first task');
        return;
    }
    if (displayView === 'board') renderBoardView(container, taskList);
    else if (displayView === 'calendar') renderCalendarView(container, taskList);
    else container.innerHTML = taskList.map(createTaskHTML).join('') + ADD_TASK_INLINE;
}

// ---------- Board (per status, dengan pilihan bulan) ----------

let boardMonthFilter = 'all';   // 'all' atau 'YYYY-MM'

function setBoardPeriod(value) {
    boardMonthFilter = value;
    render();
}

function changeBoardMonth(delta) {
    if (boardMonthFilter === 'all') return;
    let [y, m] = boardMonthFilter.split('-').map(Number);
    m += delta;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    boardMonthFilter = `${y}-${String(m).padStart(2, '0')}`;
    render();
}

function createBoardCard(task) {
    const n = evPhotos(task).length;
    const evMark = n ? `<span title="${n} foto bukti dukung">📷${n}</span>`
        : (evIsMissing(task) ? '<span title="Bukti belum ada">⚠️</span>' : '');
    return `
        <div class="board-card">
            <div class="board-card-title" onclick="editTask(${task.id})">${esc(task.title)}</div>
            <div class="board-card-meta">${evMark}
                ${task.labels.map(lid => {
                    const label = labels.find(l => l.id === lid);
                    return `<span class="board-card-dot" style="background: ${esc(label.color)};"></span>`;
                }).join('')}
                ${task.attachment ? '<span>🔗</span>' : ''}
            </div>
        </div>
    `;
}

function renderBoardView(container, taskList) {
    const scoped = boardMonthFilter === 'all'
        ? taskList
        : taskList.filter(t => t.date && t.date.startsWith(boardMonthFilter));

    const statusGroups = {};
    Object.keys(STATUS_LABEL).forEach(s => { statusGroups[s] = []; });
    scoped.forEach(task => { if (statusGroups[task.status]) statusGroups[task.status].push(task); });

    // Pilihan bulan: bulan yang punya task, ditambah bulan ini
    const monthsWithTasks = [...new Set(taskList.filter(t => t.date).map(t => t.date.slice(0, 7)))];
    const nowKey = todayISO().slice(0, 7);
    if (!monthsWithTasks.includes(nowKey)) monthsWithTasks.push(nowKey);
    monthsWithTasks.sort();

    const options = [`<option value="all"${boardMonthFilter === 'all' ? ' selected' : ''}>Semua periode</option>`]
        .concat(monthsWithTasks.map(key => {
            const [y, m] = key.split('-');
            return `<option value="${key}"${boardMonthFilter === key ? ' selected' : ''}>${MONTH_NAMES[parseInt(m) - 1]} ${y}</option>`;
        })).join('');

    const navClass = 'calendar-nav-btn' + (boardMonthFilter === 'all' ? ' is-disabled' : '');

    let html = `
        <div class="board-period">
            <button class="${navClass}" onclick="changeBoardMonth(-1)" title="Bulan sebelumnya">‹</button>
            <select onchange="setBoardPeriod(this.value)">${options}</select>
            <button class="${navClass}" onclick="changeBoardMonth(1)" title="Bulan berikutnya">›</button>
            <span class="board-period-count">${scoped.length} task ditampilkan</span>
        </div>
        <div class="board-container">`;
    Object.entries(statusGroups).forEach(([status, list]) => {
        html += `
            <div class="board-column">
                <div class="board-title">${STATUS_EMOJI[status]} ${STATUS_LABEL[status]} (${list.length})</div>
                <div class="board-tasks">${list.map(createBoardCard).join('')}</div>
            </div>`;
    });
    container.innerHTML = html + '</div>';
}

// ---------- Kalender bulanan (task multi-hari ditampilkan sebagai bilah) ----------

let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();
let calLastList = [];   // task yang terakhir digambar, untuk daftar "+n lagi"

function changeCalendarMonth(delta) {
    calendarMonth += delta;
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
    if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
    render();
}

function jumpCalendarToToday() {
    const now = new Date();
    calendarYear = now.getFullYear();
    calendarMonth = now.getMonth();
    render();
}

function calJump(value) {
    if (!value) return;
    const [y, m] = value.split('-').map(Number);
    calendarYear = y;
    calendarMonth = m - 1;
    render();
}

function calIso(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function calNewTask(dateIso) {
    openTaskModal();
    document.getElementById('taskDate').value = dateIso;
}

function calTasksOn(dateIso) {
    return calLastList.filter(t => t.date && t.date <= dateIso && ((t.dateEnd && t.dateEnd > t.date) ? t.dateEnd : t.date) >= dateIso);
}

function calShowDay(dateIso) {
    const items = calTasksOn(dateIso);
    const box = document.createElement('div');
    box.className = 'cal2-pop-wrap';
    box.onclick = (ev) => { if (ev.target === box) box.remove(); };
    box.innerHTML = `<div class="cal2-pop">
        <div class="cal2-pop-head"><strong>${esc(fmtTanggal(dateIso))}</strong><button class="modal-close" onclick="this.closest('.cal2-pop-wrap').remove()">✕</button></div>
        ${items.map(t => `<div class="cal2-pop-item ${t.status === 'completed' ? 'done' : ''}" onclick="this.closest('.cal2-pop-wrap').remove(); editTask(${t.id})">${esc(t.title)}</div>`).join('')}
        <button class="btn btn-secondary btn-sm cal2-pop-add" onclick="this.closest('.cal2-pop-wrap').remove(); calNewTask('${dateIso}')">➕ Task di tanggal ini</button>
    </div>`;
    document.body.appendChild(box);
}

function renderCalendarView(container, taskList) {
    // Di "All Tasks", kalender juga menampilkan task yang sudah selesai (tampil pudar)
    const list = currentView === 'all' ? getFilteredTasks(tasks.slice()) : taskList;
    calLastList = list;
    const y = calendarYear, m = calendarMonth;
    const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
    const gridStart = new Date(y, m, 1 - first.getDay());
    const gridEnd = new Date(y, m, last.getDate() + (6 - last.getDay()));
    const todayS = todayISO();
    const maxLanes = window.innerWidth < 600 ? 2 : 3;
    const monthLong = first.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const monthShort = d => d.toLocaleDateString('id-ID', { month: 'short' });
    const events = list.filter(t => t.date).map(t => ({ t, s: t.date, e: (t.dateEnd && t.dateEnd > t.date) ? t.dateEnd : t.date }));

    let html = `<div class="cal2">
        <div class="cal2-head">
            <div class="cal2-title">${monthLong.charAt(0).toUpperCase() + monthLong.slice(1)}</div>
            <div class="cal2-nav">
                <input type="month" class="cal2-jump" value="${y}-${String(m + 1).padStart(2, '0')}" onchange="calJump(this.value)" title="Lompat ke bulan">
                <button class="calendar-nav-btn" onclick="changeCalendarMonth(-1)" title="Bulan sebelumnya">‹</button>
                <button class="calendar-nav-btn" onclick="jumpCalendarToToday()">Hari ini</button>
                <button class="calendar-nav-btn" onclick="changeCalendarMonth(1)" title="Bulan berikutnya">›</button>
            </div>
        </div>
        <div class="cal2-dow">${['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => `<div>${d}</div>`).join('')}</div>`;

    for (let ws = new Date(gridStart); ws <= gridEnd; ws = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 7)) {
        const days = [0, 1, 2, 3, 4, 5, 6].map(i => new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + i));
        const iso = days.map(calIso);
        const wS = iso[0], wE = iso[6];

        // Task yang menyentuh minggu ini; c0..c1 = kolom awal..akhir di minggu ini.
        // Yang terpanjang ditempatkan dulu, lalu dibagi ke jalur yang masih kosong.
        const evs = events.filter(ev => ev.s <= wE && ev.e >= wS)
            .map(ev => ({ ...ev, c0: ev.s < wS ? 0 : iso.indexOf(ev.s), c1: ev.e > wE ? 6 : iso.indexOf(ev.e) }))
            .sort((a, b) => (b.c1 - b.c0) - (a.c1 - a.c0) || a.c0 - b.c0 ||
                (a.t.status === 'completed') - (b.t.status === 'completed') || (a.t.time || '').localeCompare(b.t.time || ''));
        const lanes = [];
        const hidden = [0, 0, 0, 0, 0, 0, 0];
        const placed = [];
        evs.forEach(ev => {
            let lane = 0;
            while (lanes[lane] && lanes[lane].some(c => c >= ev.c0 && c <= ev.c1)) lane++;
            if (lane >= maxLanes) { for (let c = ev.c0; c <= ev.c1; c++) hidden[c]++; return; }
            lanes[lane] = lanes[lane] || [];
            for (let c = ev.c0; c <= ev.c1; c++) lanes[lane].push(c);
            placed.push({ ...ev, lane });
        });

        html += `<div class="cal2-week" style="grid-template-rows: 30px repeat(${maxLanes}, var(--cal-lane)) 20px 1fr;">`;
        days.forEach((d, i) => {
            const other = d.getMonth() !== m;
            const weekend = i === 0 || i === 6;
            const label = d.getDate() === 1 ? `${d.getDate()} ${monthShort(d)}` : d.getDate();
            html += `<div class="cal2-day ${other ? 'other' : ''} ${weekend ? 'weekend' : ''} ${iso[i] === todayS ? 'today' : ''}"
                style="grid-column:${i + 1}; grid-row:1 / -1;" onclick="calNewTask('${iso[i]}')" title="Klik untuk menambah task">
                <span class="cal2-num">${label}</span></div>`;
        });
        placed.forEach(ev => {
            const t = ev.t;
            const proj = projects.find(p => p.id == t.project);
            const contL = ev.s < wS, contR = ev.e > wE;
            html += `<div class="cal2-ev ${t.status === 'completed' ? 'done' : ''} ${contL ? 'cont-l' : ''} ${contR ? 'cont-r' : ''}"
                style="grid-column:${ev.c0 + 1} / ${ev.c1 + 2}; grid-row:${ev.lane + 2}; --pc:${proj ? proj.color : 'var(--no-project)'};"
                onclick="event.stopPropagation(); editTask(${t.id})" title="${esc(t.title)}${t.time ? ' · ' + t.time : ''}">${t.time && ev.c0 === ev.c1 ? `<span class="cal2-time">${esc(t.time)}</span>` : ''}${esc(t.title)}</div>`;
        });
        hidden.forEach((cnt, c) => {
            if (cnt) html += `<div class="cal2-more" style="grid-column:${c + 1}; grid-row:${maxLanes + 2};"
                onclick="event.stopPropagation(); calShowDay('${iso[c]}')">+${cnt} lagi</div>`;
        });
        html += `</div>`;
    }
    container.innerHTML = html + `</div>`;
}

// ---------- Sidebar: project & angka ----------

function renderProjects() {
    document.getElementById('projectsList').innerHTML = projects.map(project => {
        const count = tasks.filter(t => t.project == project.id).length;
        return `
            <div class="project-item ${currentProjectFilter == project.id ? 'active' : ''}" onclick="filterByProject(${project.id})" style="--pc: ${esc(project.color)};">
                <span class="project-dot" style="background: ${esc(project.color)};"></span>
                <span class="project-name">${esc(project.name)}</span>
                ${project.ckp ? '<span class="project-ckp-tag" title="Project CKP">CKP</span>' : ''}
                <span class="project-count">${count}</span>
                <button class="project-menu-btn" onclick="showProjectMenu(${project.id}, event)">⋯</button>
            </div>
        `;
    }).join('');
}

function updateStats() {
    document.getElementById('statTotal').textContent = tasks.length;
    document.getElementById('statActive').textContent = tasks.filter(t => t.status !== 'completed').length;
    document.getElementById('statCompleted').textContent = tasks.filter(t => t.status === 'completed').length;
    document.getElementById('statDo').textContent = tasks.filter(t => t.quadrant === 'do' && t.status !== 'completed').length;
}

function updateSidebarCounts() {
    const today = todayISO();
    document.getElementById('inboxCount').textContent = tasks.filter(t => t.isInbox && t.status !== 'completed').length;
    document.getElementById('todayCount').textContent = tasks.filter(t => t.date === today && t.status !== 'completed').length;
    document.getElementById('allCount').textContent = tasks.filter(t => t.status !== 'completed').length;
    document.getElementById('completedCount').textContent = tasks.filter(t => t.status === 'completed').length;
}

// ---------- Reporting ----------
// Sejak 3.5 laporan digambar oleh laporan.js (lpRender).

// ---------- Gambar ulang layar ----------

function render() {
    updateStats();
    const today = todayISO();
    const undone = t => t.status !== 'completed';

    if (currentView === 'dashboard') {
        const list = getFilteredTasks(tasks.filter(undone));
        document.getElementById('dashboardList').innerHTML = list.length
            ? list.map(createTaskHTML).join('') + ADD_TASK_INLINE
            : emptyState('🎉', 'All done! Great job!');
    } else if (currentView === 'inbox') {
        const list = getFilteredTasks(tasks.filter(t => t.isInbox && undone(t)));
        document.getElementById('inboxList').innerHTML = list.length
            ? list.map(createTaskHTML).join('') + ADD_TASK_INLINE
            : emptyState('📬', 'Inbox is empty', '➕ Add first task');
    } else if (currentView === 'today') {
        const list = getFilteredTasks(tasks.filter(t => t.date === today && undone(t)));
        document.getElementById('todayList').innerHTML = list.length
            ? list.map(createTaskHTML).join('') + ADD_TASK_INLINE
            : emptyState('📅', 'No tasks for today', '➕ Add task for today');
    } else if (currentView === 'upcoming') {
        const list = getFilteredTasks(tasks.filter(t => t.date && t.date > today && undone(t)));
        document.getElementById('upcomingList').innerHTML = list.length
            ? list.map(createTaskHTML).join('') + ADD_TASK_INLINE
            : emptyState('📆', 'No upcoming tasks', '➕ Add upcoming task');
    } else if (currentView === 'all') {
        renderTaskList(document.getElementById('allList'), getFilteredTasks(tasks.filter(undone)), currentAllDisplayView);
    } else if (currentView === 'completed') {
        renderTaskList(document.getElementById('completedList'), getFilteredTasks(tasks.filter(t => t.status === 'completed')));
    } else if (currentView === 'filters') {
        document.getElementById('filtersList').innerHTML = labels.length ? labels.map(label => `
            <div class="label-row">
                <div class="label-row-left">
                    <span class="label-row-dot" style="background: ${esc(label.color)};"></span>
                    <span class="label-row-name">${esc(label.name)}</span>
                </div>
                <div class="label-row-right">
                    <span class="label-row-count">${tasks.filter(t => t.labels.includes(label.id)).length}</span>
                    <button class="btn btn-danger btn-sm" onclick="confirmDeleteLabel(${label.id})">🗑️</button>
                </div>
            </div>
        `).join('') : '<div class="empty-state"><p>No labels created yet</p></div>';
    } else if (currentView === 'reporting') {
        lpRender();
    }

    updateSidebarCounts();
    renderProjects();

    // Pasang ulang drag & drop pada kartu task yang baru digambar
    document.querySelectorAll('#dashboardList, #inboxList, #todayList, #upcomingList, #allList, #completedList')
        .forEach(setupDragAndDrop);

    evUpdateBanners();
    ckpRefreshHubIfIdle();

    // Saat melihat satu project: judul header = nama project, dan menu Dashboard
    // tidak tampak aktif (klik Dashboard = keluar dari project)
    if (currentView === 'dashboard') {
        const p = currentProjectFilter != null ? projects.find(x => x.id == currentProjectFilter) : null;
        if (currentProjectFilter != null && !p) currentProjectFilter = null;
        document.getElementById('headerTitle').textContent = p ? '📁 ' + p.name : VIEW_TITLES.dashboard;
        document.querySelector('.sidebar-item[data-view="dashboard"]').classList.toggle('active', !p);
    }
}

// ---------- Drag & drop urutan manual ----------

let draggedTaskId = null;

function setupDragAndDrop(container) {
    if (!container) return;

    container.querySelectorAll('.task-item[data-task-id]').forEach(item => {
        const handle = item.querySelector('.drag-handle');
        if (!handle) return;

        // Hanya bisa diseret lewat pegangan ⠿
        handle.addEventListener('mousedown', () => { item.draggable = true; });
        handle.addEventListener('touchstart', () => { item.draggable = true; }, { passive: true });
        item.addEventListener('mouseup', () => { item.draggable = false; });

        item.addEventListener('dragstart', (e) => {
            draggedTaskId = parseInt(item.dataset.taskId);
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            try { e.dataTransfer.setData('text/plain', String(draggedTaskId)); } catch (err) {}
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            item.draggable = false;
            clearDragMarkers(container);
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (parseInt(item.dataset.taskId) === draggedTaskId) return;
            const rect = item.getBoundingClientRect();
            const isTopHalf = (e.clientY - rect.top) < rect.height / 2;
            clearDragMarkers(container);
            item.classList.add(isTopHalf ? 'drag-over-top' : 'drag-over-bottom');
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetId = parseInt(item.dataset.taskId);
            if (draggedTaskId === null || targetId === draggedTaskId) {
                clearDragMarkers(container);
                return;
            }
            const rect = item.getBoundingClientRect();
            const placeBefore = (e.clientY - rect.top) < rect.height / 2;
            reorderTasks(draggedTaskId, targetId, placeBefore);
            clearDragMarkers(container);
            draggedTaskId = null;
        });
    });
}

function clearDragMarkers(container) {
    container.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
        el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
}

function reorderTasks(draggedId, targetId, placeBefore) {
    const fromIndex = tasks.findIndex(t => t.id === draggedId);
    if (fromIndex === -1) return;

    const [moved] = tasks.splice(fromIndex, 1);
    const targetIndex = tasks.findIndex(t => t.id === targetId);
    if (targetIndex === -1) {
        tasks.splice(fromIndex, 0, moved);
        return;
    }

    const insertAt = placeBefore ? targetIndex : targetIndex + 1;
    tasks.splice(insertAt, 0, moved);

    // Beri task yang dipindah nilai order di antara tetangga barunya,
    // supaya hanya satu baris yang perlu dikirim ke server.
    const before = tasks[insertAt - 1];
    const after = tasks[insertAt + 1];

    if (!before && !after) {
        moved.order = 1000;
    } else if (!before) {
        moved.order = after.order - 1000;
    } else if (!after) {
        moved.order = before.order + 1000;
    } else {
        moved.order = (before.order + after.order) / 2;
        // Celah terlalu kecil setelah banyak geser — beri nomor ulang semuanya.
        if (Math.abs(after.order - before.order) < 0.001) {
            tasks.forEach((t, i) => { t.order = (i + 1) * 1000; });
        }
    }

    saveData();
    render();
}
