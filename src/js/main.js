// ======= KONFIGURASI API PUSAT =======
const API_BASE_URL = window.location.origin;
// =====================================

window.clientDataStore = {};
window.auditDataStore = {};
let currentTemplateAssets = {};
let editingAssetKey = null;
let massUpdatePollInterval = null;
let fetchedClientsList = [];
let fetchedTemplatesList = [];
let fetchedAuditLogsList = [];
let remotePermissionGroups = [];
let currentSavedPermissionIds = [];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const savedPwd = localStorage.getItem('pusat_api_password');
    if (savedPwd) {
        document.getElementById('globalPassword').value = savedPwd;
    }
    document.getElementById('globalPassword').addEventListener('input', (e) => {
        localStorage.setItem('pusat_api_password', e.target.value);
    });
    fetchClients();
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    }
});

window.onclick = function(event) {
    if (event.target && event.target.className === 'modal') {
        event.target.style.display = "none";
    }
};

// --- NAVIGATION & UI HELPERS ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;

    if (window.innerWidth <= 992) {
        sidebar.classList.toggle('mobile-open');
        if (overlay) overlay.classList.toggle('active');
    } else {
        sidebar.classList.toggle('collapsed');
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar a').forEach(el => el.classList.remove('active'));
    
    const targetSection = document.getElementById('section-' + tabId);
    const targetTab = document.getElementById('tab-' + tabId);
    if (targetSection) targetSection.classList.add('active');
    if (targetTab) targetTab.classList.add('active');

    // Auto-close drawer sidebar di layar ponsel
    if (window.innerWidth <= 992) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('mobile-open');
        if (overlay) overlay.classList.remove('active');
    }

    if (tabId === 'dashboard') fetchClients();
    if (tabId === 'templates') fetchTemplates();
    if (tabId === 'audit') fetchAuditLogs();
}

function switchModalTab(panelId) {
    document.querySelectorAll('.modal-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    
    if (window.event && window.event.target) {
        window.event.target.classList.add('active');
    }
    const targetPanel = document.getElementById(panelId);
    if (targetPanel) targetPanel.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (input) input.type = input.type === 'password' ? 'text' : 'password';
}

function getPassword() {
    const pwd = document.getElementById('globalPassword').value;
    if (!pwd) alert("Silakan isi Sandi API Admin terlebih dahulu.");
    return pwd;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// --- TOKEN SCOPES MODAL ---
async function openTokenScopeModal() {
    const pwd = getPassword();
    if (!pwd) return;

    document.getElementById('tokenScopeModal').style.display = 'block';
    document.getElementById('scopeUpdateAlert').style.display = 'none';
    const container = document.getElementById('scopeChecklistContainer');
    container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">⏳ Menghubungi Cloudflare API & Memuat Scope Tersimpan...</div>';

    try {
        const res = await fetch(`${API_BASE_URL}/api/get-permission-groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: pwd })
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Gagal menarik data dari Cloudflare");

        remotePermissionGroups = data.result || [];
        currentSavedPermissionIds = data.active_saved_ids || [];

        renderScopeChecklist(remotePermissionGroups);
    } catch (err) {
        container.innerHTML = `<div style="color: var(--danger); padding: 10px; text-align: center;">❌ Gagal memuat data: ${escapeHtml(err.message)}</div>`;
    }
}

function renderScopeChecklist(items) {
    const container = document.getElementById('scopeChecklistContainer');
    container.innerHTML = '';

    if (!items || items.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 10px;">Tidak ada permission group yang cocok.</div>';
        return;
    }

    items.forEach(item => {
        const label = document.createElement('label');
        label.style.cssText = 'display: flex; align-items: center; justify-content: space-between; font-size: 12px; cursor: pointer; padding: 6px 8px; border-bottom: 1px solid #eee; background: #fff; border-radius: 4px; margin: 0;';
        
        const isChecked = currentSavedPermissionIds.includes(item.id);
        
        label.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" class="scope-checkbox" value="${item.id}" ${isChecked ? 'checked' : ''} onchange="updateSelectedScopeCount()">
                <div>
                    <strong>${escapeHtml(item.name)}</strong><br>
                    <small style="color: var(--text-muted); font-family: monospace; font-size: 10.5px;">${item.id}</small>
                </div>
            </div>
            <span class="badge" style="background: #f1f5f9; color: var(--text-main); font-size: 10px;">${escapeHtml(item.scopes ? item.scopes.join(', ') : 'Account')}</span>
        `;
        container.appendChild(label);
    });
    updateSelectedScopeCount();
}

function filterRemoteScopes() {
    const query = (document.getElementById('scopeSearchInput').value || '').toLowerCase();
    const filtered = remotePermissionGroups.filter(g => 
        (g.name && g.name.toLowerCase().includes(query)) ||
        (g.id && g.id.toLowerCase().includes(query))
    );
    renderScopeChecklist(filtered);
}

function selectAllScopes(checked) {
    document.querySelectorAll('.scope-checkbox').forEach(cb => cb.checked = checked);
    updateSelectedScopeCount();
}

function updateSelectedScopeCount() {
    const checkedCount = document.querySelectorAll('.scope-checkbox:checked').length;
    document.getElementById('selectedScopeCount').textContent = `${checkedCount} Izin Dicentang`;
}

async function executeMassScopeUpdate() {
    const pwd = getPassword();
    if (!pwd) return;

    const selectedIds = Array.from(document.querySelectorAll('.scope-checkbox:checked')).map(cb => cb.value);
    if (selectedIds.length === 0) {
        alert("Pilih minimal satu permission group!");
        return;
    }

    if (!confirm(`Terapkan ${selectedIds.length} scope izin yang dicentang ke SELURUH KLIEN AKTIF secara massal?`)) return;

    const btn = document.getElementById('btnApplyScopeMass');
    const alertBox = document.getElementById('scopeUpdateAlert');
    btn.disabled = true;
    alertBox.className = 'alert info';
    alertBox.textContent = 'Memproses pembaruan scope token massal ke Cloudflare API... Mohon tunggu.';

    try {
        const res = await fetch(`${API_BASE_URL}/api/mass-update-token-scopes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminPassword: pwd,
                permission_group_ids: selectedIds
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal eksekusi update scope.");

        alertBox.className = 'alert success';
        alertBox.textContent = `✅ SELESAI:\n${data.message}\n\nHasil Rinci:\n` + JSON.stringify(data.results, null, 2);
        fetchClients();
    } catch (err) {
        alertBox.className = 'alert error';
        alertBox.textContent = `GAGAL: ${err.message}`;
    } finally {
        btn.disabled = false;
    }
}

// --- CLIENT MONITORING ---
async function fetchClients() {
    const pwd = getPassword();
    if (!pwd) return;

    const tbody = document.getElementById('clientsBody');
    const alertBox = document.getElementById('tableAlert');
    
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Sedang memuat data...</td></tr>';
    alertBox.style.display = 'none';

    try {
        const res = await fetch(`${API_BASE_URL}/api/get-clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: pwd })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Gagal mengambil data klien.");

        fetchedClientsList = data.data || [];
        updateQuickStats(fetchedClientsList);
        renderClientsTable(fetchedClientsList);
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color:var(--danger);">Gagal memuat data. Periksa sandi API admin Anda.</td></tr>';
        alertBox.className = 'alert error';
        alertBox.textContent = e.message;
    }
}

function updateQuickStats(clients) {
    document.getElementById('statTotalClients').textContent = clients.length;
    const activeCount = clients.filter(c => (c.account_status || '').toLowerCase() === 'active').length;
    const deployingCount = clients.filter(c => (c.account_status || '').toLowerCase() === 'deploying').length;
    const suspiciousCount = clients.filter(c => (c.account_status || '').toLowerCase() === 'suspicious_domain').length;
    
    document.getElementById('statActiveClients').textContent = activeCount;
    document.getElementById('statDeployingClients').textContent = deployingCount;
    document.getElementById('statSuspiciousClients').textContent = suspiciousCount;
}

function renderClientsTable(clients) {
    const tbody = document.getElementById('clientsBody');
    tbody.innerHTML = '';

    if (!clients || clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Tidak ada klien yang cocok.</td></tr>';
        return;
    }

    clients.forEach(client => {
        window.clientDataStore[client.worker_name] = client.settings;
        
        const domainLink = client.domain ? `<a href="https://${client.domain}" target="_blank" style="color:var(--info); font-weight:600; text-decoration:none;">${client.domain}</a>` : '-';
        const clientStatus = (client.account_status || 'active').toLowerCase();
        let badgeClass = 'badge-active';
        let badgeLabel = clientStatus;

        if (clientStatus === 'deploying') {
            badgeClass = 'badge-deploying';
        } else if (clientStatus === 'suspicious_domain') {
            badgeClass = 'badge-suspicious';
            badgeLabel = '🚨 SUSPICIOUS';
        }

        let usageHtml = '<span style="color:var(--text-muted); font-size:11px;">Belum diaudit</span>';
        let parsedSettings = {};
        try { parsedSettings = JSON.parse(client.settings || "{}"); } catch(e){}

        if (parsedSettings.usage_stats) {
            const stats = parsedSettings.usage_stats;
            const workerCpu = stats.worker ? `${stats.worker.cpu_avg_ms || 0}ms` : '-';
            const kvReads = stats.kv ? `${stats.kv.reads_24h || 0}` : '0';
            const kvWrites = stats.kv ? `${stats.kv.writes_24h || 0}` : '0';
            const ghMins = stats.github ? `${stats.github.minutes_used || 0}m` : '-';

            usageHtml = `
                <div style="font-size:11px; line-height:1.4;">
                    ⚡ <b>CPU:</b> ${workerCpu}<br>
                    📦 <b>KV:</b> ${kvReads}R / ${kvWrites}W<br>
                    🐙 <b>GH:</b> ${ghMins}
                </div>
            `;
        }

        const inspectBtn = (clientStatus === 'suspicious_domain') 
            ? `<button class="btn btn-warning btn-full" onclick="inspectClientAudit('${client.worker_name}')">🔍 Cek Mismatch</button>` 
            : '';

        const adminBtn = client.domain 
            ? `<a href="https://admin.${client.domain}" target="_blank" class="btn btn-outline btn-full">🔗 Buka Admin</a>` 
            : '';

        const actionGrid = `
            <div class="btn-action-grid">
                ${inspectBtn}
                ${adminBtn}
                <button class="btn btn-outline" onclick="showSettingsModal('${client.worker_name}')">⚙️ Config</button>
                <button class="btn btn-outline" onclick="openEditCredentialsModal('${client.worker_name}')">🔑 Pass/PAT</button>
                <button class="btn btn-success btn-full" onclick="syncIndividualClient('${client.worker_name}')">🔄 Sync Client</button>
                <button class="btn btn-danger btn-full" onclick="deleteClientCompletely('${client.worker_name}')">💣 Nuke / Delete</button>
            </div>
        `;

        const row = document.createElement('tr');
        if (clientStatus === 'suspicious_domain') {
            row.style.backgroundColor = '#fff1f2';
        }

        row.innerHTML = `
            <td><strong>#${client.id}</strong></td>
            <td>
                <strong style="font-size:13px;">${escapeHtml(client.name)}</strong><br>
                <small style="color:var(--text-muted); font-size:11px;">${escapeHtml(client.email)}</small>
            </td>
            <td>
                <code>${escapeHtml(client.worker_name)}</code><br>
                <span style="font-size:10.5px; color:var(--text-muted);">${escapeHtml(client.dashboard_version || 'v1_blog')}</span>
            </td>
            <td>${domainLink}</td>
            <td>${usageHtml}</td>
            <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
            <td>${actionGrid}</td>
        `;
        tbody.appendChild(row);
    });
}

function filterClientsTable() {
    const query = document.getElementById('clientSearchInput').value.toLowerCase();
    const filtered = fetchedClientsList.filter(c => 
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.worker_name && c.worker_name.toLowerCase().includes(query)) ||
        (c.domain && c.domain.toLowerCase().includes(query))
    );
    renderClientsTable(filtered);
}

function showSettingsModal(workerName) {
    const settingsStr = window.clientDataStore[workerName];
    let parsed = {};
    try { parsed = JSON.parse(settingsStr || "{}"); } catch(e){}
    
    document.getElementById('settingsModalTitle').textContent = `Pengaturan Klien: ${workerName}`;
    document.getElementById('settingsPre').textContent = JSON.stringify(parsed, null, 2);
    document.getElementById('settingsModal').style.display = 'block';
}

function openEditCredentialsModal(workerName) {
    document.getElementById('editWorkerName').value = workerName;
    document.getElementById('editCfToken').value = '';
    document.getElementById('editGithubPat').value = '';
    document.getElementById('editCredAlert').style.display = 'none';
    document.getElementById('editModalTitle').textContent = `Edit Kredensial: ${workerName}`;
    document.getElementById('editCredentialsModal').style.display = 'block';
}

async function submitEditCredentials(e) {
    e.preventDefault();
    const pwd = getPassword();
    if (!pwd) return;

    const workerName = document.getElementById('editWorkerName').value;
    const cfToken = document.getElementById('editCfToken').value;
    const githubPat = document.getElementById('editGithubPat').value;
    const alertBox = document.getElementById('editCredAlert');

    alertBox.className = 'alert info';
    alertBox.textContent = 'Menyimpan kredensial baru...';

    try {
        const res = await fetch(`${API_BASE_URL}/api/update-client-credentials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminPassword: pwd,
                worker_name: workerName,
                cf_token: cfToken,
                github_pat: githubPat
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memperbarui.");

        alertBox.className = 'alert success';
        alertBox.textContent = data.message;
        setTimeout(() => {
            closeModal('editCredentialsModal');
            fetchClients();
        }, 1200);
    } catch (err) {
        alertBox.className = 'alert error';
        alertBox.textContent = err.message;
    }
}

async function syncIndividualClient(workerName) {
    const pwd = getPassword();
    if (!pwd) return;

    if (!confirm(`Jalankan full sinkronisasi ulang untuk '${workerName}'?`)) return;

    const alertBox = document.getElementById('tableAlert');
    alertBox.className = 'alert info';
    alertBox.textContent = `Sedang menyinkronkan ${workerName}...`;
    alertBox.style.display = 'block';

    try {
        const res = await fetch(`${API_BASE_URL}/api/sync-client`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: pwd, worker_name: workerName })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal sinkronisasi");
        
        alertBox.className = 'alert success';
        alertBox.textContent = data.message;
    } catch (err) {
        alertBox.className = 'alert error';
        alertBox.textContent = `Gagal sync ${workerName}: ${err.message}`;
    }
}

async function deleteClientCompletely(workerName) {
    const pwd = getPassword();
    if (!pwd) return;

    const confirmMsg = `⚠️ PERINGATAN HAPUS TOTAL (NUKE)!\n\n` +
        `Anda akan MENGHAPUS TOTAL Seluruh Infrastruktur untuk klien: '${workerName}'\n\n` +
        `Ini akan MENGHAPUS PERMANEN Worker, KV, D1, GitHub Repo, dan DNS.\n` +
        `Ketikkan nama worker '${workerName}' untuk konfirmasi:`;

    const userInput = prompt(confirmMsg);
    if (userInput !== workerName) {
        if (userInput !== null) alert("Konfirmasi batal: Nama worker tidak cocok.");
        return;
    }

    const alertBox = document.getElementById('tableAlert');
    alertBox.className = 'alert info';
    alertBox.textContent = `MENGHAPUS TOTAL seluruh infrastruktur ${workerName}... Mohon tunggu 10-20 detik.`;
    alertBox.style.display = 'block';

    try {
        const res = await fetch(`${API_BASE_URL}/api/delete-client-completely`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: pwd, worker_name: workerName })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Gagal hapus total.");

        let msg = "✅ HASIL NUKE / HAPUS TOTAL:\n" + data.message;
        if (data.details && data.details.length > 0) {
            msg += "\n\nRincian Tindakan:\n- " + data.details.join("\n- ");
        }

        alertBox.className = 'alert success';
        alertBox.textContent = msg;
        fetchClients();
    } catch (err) {
        alertBox.className = 'alert error';
        alertBox.textContent = `GAGAL NUKE KLIEN:\n${err.message}`;
    }
}

async function triggerUsageAudit() {
    const pwd = getPassword();
    if (!pwd) return;

    const btnDash = document.getElementById('btnDashboardUsageAudit');
    const btnSys = document.getElementById('btnSystemUsageAudit');
    const alertBox = document.getElementById('tableAlert') || document.getElementById('systemAlert');

    if (!confirm("Picu audit penggunaan kuota massal (Worker CPU, KV Ops, GH Actions) ke seluruh situs klien?")) return;

    if (btnDash) btnDash.disabled = true;
    if (btnSys) btnSys.disabled = true;

    if (alertBox) {
        alertBox.className = 'alert info';
        alertBox.textContent = '⚡ Memicu audit kuota massal ke GitHub Actions (public-runner)... Mohon tunggu.';
        alertBox.style.display = 'block';
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/trigger-usage-audit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: pwd })
        });

        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Gagal memicu audit kuota.");

        if (alertBox) {
            alertBox.className = 'alert success';
            alertBox.textContent = '✅ ' + data.message + '\nData kuota akan ter-update di tabel secara otomatis setelah runner selesai diproses.';
            alertBox.style.display = 'block';
        }
        
        setTimeout(() => fetchClients(), 4000);
    } catch (err) {
        if (alertBox) {
            alertBox.className = 'alert error';
            alertBox.textContent = '❌ KESALAHAN: ' + err.message;
            alertBox.style.display = 'block';
        }
    } finally {
        if (btnDash) btnDash.disabled = false;
        if (btnSys) btnSys.disabled = false;
    }
}

// --- TEMPLATES MANAGEMENT ---
async function fetchTemplates() {
    const tbody = document.getElementById('templatesBody');
    const alertBox = document.getElementById('templatesAlert');
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Sedang memuat template...</td></tr>';
    alertBox.style.display = 'none';

    try {
        const res = await fetch(`${API_BASE_URL}/v1/templates`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Gagal mengambil daftar template.");

        fetchedTemplatesList = data || [];
        document.getElementById('statTotalTemplates').textContent = fetchedTemplatesList.length;
        renderTemplatesTable(fetchedTemplatesList);
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color:var(--danger);">Gagal memuat katalog template.</td></tr>';
        alertBox.className = 'alert error';
        alertBox.textContent = e.message;
    }
}

function renderTemplatesTable(templates) {
    const tbody = document.getElementById('templatesBody');
    tbody.innerHTML = '';

    if (!templates || templates.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Belum ada template terdaftar.</td></tr>';
        return;
    }

    templates.forEach(tpl => {
        const viewBtn = `<button class="btn btn-outline" style="padding:3px 6px; font-size:11px;" onclick="viewTemplateDetail('${tpl.id}')">🔍 View</button>`;
        const editBtn = `<button class="btn btn-outline" style="padding:3px 6px; font-size:11px;" onclick="editTemplateFromStore('${tpl.id}')">✏️ Edit</button>`;
        const delBtn = `<button class="btn btn-danger" style="padding:3px 6px; font-size:11px;" onclick="deleteTemplate('${tpl.id}')">🗑️</button>`;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><code>${escapeHtml(tpl.id)}</code></td>
            <td>
                <strong>${escapeHtml(tpl.name)}</strong><br>
                <small style="color:var(--text-muted); font-size:11px;">${escapeHtml(tpl.description || '-')}</small>
            </td>
            <td><span class="badge" style="background:#f1f5f9; color:var(--text-main);">${escapeHtml(tpl.version)}</span></td>
            <td>${tpl.is_free ? '<span class="badge badge-active">Gratis</span>' : '<span class="badge badge-deploying">Premium</span>'}</td>
            <td style="font-size:11.5px; color:var(--text-muted);">${escapeHtml(tpl.updated_at || '-')}</td>
            <td style="text-align: center;">
                <div style="display:flex; gap:4px; justify-content:center;">${viewBtn}${editBtn}${delBtn}</div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterTemplatesTable() {
    const query = document.getElementById('templateSearchInput').value.toLowerCase();
    const filtered = fetchedTemplatesList.filter(t => 
        (t.id && t.id.toLowerCase().includes(query)) ||
        (t.name && t.name.toLowerCase().includes(query)) ||
        (t.description && t.description.toLowerCase().includes(query))
    );
    renderTemplatesTable(filtered);
}

async function viewTemplateDetail(templateId) {
    try {
        const res = await fetch(`${API_BASE_URL}/v1/templates/detail/${templateId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal mengambil detail.");

        document.getElementById('templateModalTitle').textContent = `Raw Layout Template: ${data.name} (${data.id})`;
        let layoutObj = data.layout_data;
        try { layoutObj = typeof data.layout_data === 'string' ? JSON.parse(data.layout_data) : data.layout_data; } catch(e){}
        
        document.getElementById('templatePre').textContent = typeof layoutObj === 'object' ? JSON.stringify(layoutObj, null, 2) : layoutObj;
        document.getElementById('templateDetailModal').style.display = 'block';
    } catch (e) {
        alert("Gagal memuat detail: " + e.message);
    }
}

function openAddTemplateModal(tplData = null) {
    document.getElementById('tplFormAlert').style.display = 'none';
    resetAssetInputs();
    
    if (tplData) {
        document.getElementById('tplModalTitle').textContent = `✏️ Edit Template: ${tplData.id}`;
        document.getElementById('tplId').value = tplData.id;
        document.getElementById('tplId').readOnly = true;
        document.getElementById('tplName').value = tplData.name || '';
        document.getElementById('tplDescription').value = tplData.description || '';
        document.getElementById('tplVersion').value = tplData.version || '1.0.0';
        document.getElementById('tplIsFree').value = tplData.is_free ? '1' : '0';
        document.getElementById('tplPreviewImg').value = tplData.preview_img || '';

        let parsed = {};
        try {
            parsed = typeof tplData.layout_data === 'string' ? JSON.parse(tplData.layout_data) : tplData.layout_data;
        } catch(e){}

        const layouts = parsed.layouts || {};
        const components = parsed.components || {};
        const menus = parsed.menus || {};
        currentTemplateAssets = parsed.assets || {};

        document.getElementById('tplLayoutPage').value = layouts.page || '';
        document.getElementById('tplLayoutPost').value = layouts.post || '';
        document.getElementById('tplLayoutArchive').value = layouts.archive || layouts.category || '';
        document.getElementById('tplLayoutDefault').value = layouts.default || '';

        const getCompVal = (keys) => {
            for (let k of keys) {
                if (components[k] !== undefined) return components[k];
            }
            return '';
        };

        document.getElementById('tplCompTopbar').value = getCompVal(['topbar', 'global:topbar', 'global:header:topbar']);
        document.getElementById('tplCompNavHeader').value = getCompVal(['navigation_header', 'navigation', 'nav', 'global:navigation_header', 'global:header:nav']);
        document.getElementById('tplCompFooterWidgets').value = getCompVal(['footer_widgets', 'footer', 'global:footer_widgets', 'global:footer:widgets']);
        document.getElementById('tplCompGlobalModals').value = getCompVal(['global_modals', 'modals', 'global:global_modals', 'global:modals']);
        document.getElementById('tplCompSidebarWidget').value = getCompVal(['sidebar_widgets', 'sidebar', 'global:sidebar_widgets', 'global:post:sidebar-template']);

        document.getElementById('tplMenuPrimary').value = typeof menus.primary_menu === 'string' ? menus.primary_menu : JSON.stringify(menus.primary_menu || [], null, 2);
        document.getElementById('tplMenuFooter').value = typeof menus.footer_links_menu === 'string' ? menus.footer_links_menu : JSON.stringify(menus.footer_links_menu || [], null, 2);
    } else {
        document.getElementById('tplModalTitle').textContent = '➕ Tambah Template Baru';
        document.getElementById('tplId').value = '';
        document.getElementById('tplId').readOnly = false;
        document.getElementById('tplName').value = '';
        document.getElementById('tplDescription').value = '';
        document.getElementById('tplVersion').value = '1.0.0';
        document.getElementById('tplIsFree').value = '1';
        document.getElementById('tplPreviewImg').value = '';
        currentTemplateAssets = {};

        document.getElementById('tplLayoutPage').value = '<!DOCTYPE html>\n<html>\n<head>{{META_TITLE}}</head>\n<body>\n{{BLOCK:navigation_header}}\n<main>{{MAIN_CONTENT}}</main>\n{{BLOCK:footer_widgets}}\n</body>\n</html>';
        document.getElementById('tplLayoutPost').value = '<!DOCTYPE html>\n<html>\n<head>{{META_TITLE}}</head>\n<body>\n{{BLOCK:navigation_header}}\n<article>{{POST_CONTENT}}</article>\n<aside>{{BLOCK:sidebar_widgets}}</aside>\n{{BLOCK:footer_widgets}}\n</body>\n</html>';
        document.getElementById('tplLayoutArchive').value = '<!DOCTYPE html>\n<html>\n<head>{{META_TITLE}}</head>\n<body>\n{{BLOCK:navigation_header}}\n<section>{{CATEGORY_POSTS}}</section>\n{{BLOCK:footer_widgets}}\n</body>\n</html>';
        document.getElementById('tplLayoutDefault').value = '<!DOCTYPE html>\n<html>\n<head>{{META_TITLE}}</head>\n<body>\n{{BLOCK:topbar}}\n{{BLOCK:navigation_header}}\n<main>{{MAIN_CONTENT}}</main>\n{{BLOCK:footer_widgets}}\n{{BLOCK:global_modals}}\n</body>\n</html>';

        document.getElementById('tplCompTopbar').value = '<div class="topbar">Top Bar Info</div>';
        document.getElementById('tplCompNavHeader').value = '<nav class="navbar">{{PRIMARY_MENU}}</nav>';
        document.getElementById('tplCompFooterWidgets').value = '<footer class="footer">{{FOOTER_LINKS_MENU}}</footer>';
        document.getElementById('tplCompGlobalModals').value = '<div class="modal">Modal Content</div>';
        document.getElementById('tplCompSidebarWidget').value = '<div class="sidebar-card">Sidebar Content</div>';

        document.getElementById('tplMenuPrimary').value = '[\n  {"title": "Home", "url": "/"},\n  {"title": "Blog", "url": "/post"}\n]';
        document.getElementById('tplMenuFooter').value = '[\n  {"title": "Privacy Policy", "url": "/privacy"},\n  {"title": "Terms", "url": "/terms"}\n]';
    }
    
    renderAssetsTable();
    document.getElementById('addTemplateModal').style.display = 'block';
}

async function editTemplateFromStore(templateId) {
    try {
        const res = await fetch(`${API_BASE_URL}/v1/templates/detail/${templateId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat template");
        openAddTemplateModal(data);
    } catch (e) {
        alert("Error: " + e.message);
    }
}

async function submitAddTemplate(e) {
    e.preventDefault();
    const pwd = getPassword();
    if (!pwd) return;

    const btn = document.getElementById('btnSaveTpl');
    const alertBox = document.getElementById('tplFormAlert');

    let primaryMenu = [], footerMenu = [];
    try { primaryMenu = JSON.parse(document.getElementById('tplMenuPrimary').value || "[]"); } catch(err) { alert("JSON Primary Menu tidak valid!"); return; }
    try { footerMenu = JSON.parse(document.getElementById('tplMenuFooter').value || "[]"); } catch(err) { alert("JSON Footer Menu tidak valid!"); return; }

    const structuredLayoutData = {
        layouts: {
            page: document.getElementById('tplLayoutPage').value,
            post: document.getElementById('tplLayoutPost').value,
            archive: document.getElementById('tplLayoutArchive').value,
            category: document.getElementById('tplLayoutArchive').value,
            default: document.getElementById('tplLayoutDefault').value
        },
        components: {
            topbar: document.getElementById('tplCompTopbar').value,
            navigation_header: document.getElementById('tplCompNavHeader').value,
            footer_widgets: document.getElementById('tplCompFooterWidgets').value,
            global_modals: document.getElementById('tplCompGlobalModals').value,
            sidebar_widgets: document.getElementById('tplCompSidebarWidget').value
        },
        menus: {
            primary_menu: primaryMenu,
            footer_links_menu: footerMenu
        },
        assets: currentTemplateAssets
    };

    btn.disabled = true;
    btn.textContent = 'Menyimpan ke Dual Storage...';
    alertBox.className = 'alert info';
    alertBox.textContent = 'Proses menyimpan file ke repositori GitHub & metadata ke D1...';

    try {
        const res = await fetch(`${API_BASE_URL}/api/templates/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminPassword: pwd,
                id: document.getElementById('tplId').value.trim(),
                name: document.getElementById('tplName').value.trim(),
                description: document.getElementById('tplDescription').value.trim(),
                version: document.getElementById('tplVersion').value.trim(),
                is_free: document.getElementById('tplIsFree').value === '1',
                preview_img: document.getElementById('tplPreviewImg').value.trim(),
                layout_data: structuredLayoutData
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal menyimpan.");

        alertBox.className = 'alert success';
        alertBox.textContent = data.message;
        setTimeout(() => {
            closeModal('addTemplateModal');
            fetchTemplates();
        }, 1200);
    } catch (err) {
        alertBox.className = 'alert error';
        alertBox.textContent = err.message;
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Simpan Template ke Dual Storage (GitHub + D1 Master)';
    }
}

async function deleteTemplate(templateId) {
    const pwd = getPassword();
    if (!pwd) return;

    if (!confirm(`Hapus template ID '${templateId}'?`)) return;

    const alertBox = document.getElementById('templatesAlert');
    alertBox.className = 'alert info';
    alertBox.textContent = `Menghapus ${templateId}...`;

    try {
        const res = await fetch(`${API_BASE_URL}/api/templates/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: pwd, id: templateId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal menghapus.");

        alertBox.className = 'alert success';
        alertBox.textContent = data.message || "Template berhasil dihapus.";
        fetchTemplates();
    } catch (err) {
        alertBox.className = 'alert error';
        alertBox.textContent = err.message;
    }
}

// Asset Builder Helpers
function handleAssetFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('assetFileName').value = file.name;
    const reader = new FileReader();
    reader.onload = function(evt) {
        document.getElementById('assetFileContent').value = evt.target.result;
    };
    reader.readAsText(file);
}

function addOrUpdateAsset() {
    const fileName = document.getElementById('assetFileName').value.trim();
    const content = document.getElementById('assetFileContent').value;

    if (!fileName) {
        alert("Nama file asset wajib diisi!");
        return;
    }

    if (editingAssetKey && editingAssetKey !== fileName) {
        delete currentTemplateAssets[editingAssetKey];
    }

    currentTemplateAssets[fileName] = content;
    resetAssetInputs();
    renderAssetsTable();
}

function resetAssetInputs() {
    document.getElementById('assetFileName').value = '';
    document.getElementById('assetFileContent').value = '';
    document.getElementById('assetFileUpload').value = '';
    editingAssetKey = null;
    document.getElementById('btnAddAsset').textContent = '➕ Add Asset';
    document.getElementById('btnCancelAssetEdit').style.display = 'none';
}

function editAsset(fileName) {
    editingAssetKey = fileName;
    document.getElementById('assetFileName').value = fileName;
    document.getElementById('assetFileContent').value = currentTemplateAssets[fileName] || '';
    document.getElementById('btnAddAsset').textContent = '💾 Update File';
    document.getElementById('btnCancelAssetEdit').style.display = 'inline-flex';
}

function deleteAsset(fileName) {
    if (confirm(`Hapus file asset '${fileName}'?`)) {
        delete currentTemplateAssets[fileName];
        if (editingAssetKey === fileName) resetAssetInputs();
        renderAssetsTable();
    }
}

function renderAssetsTable() {
    const tbody = document.getElementById('assetsTableBody');
    tbody.innerHTML = '';

    const keys = Object.keys(currentTemplateAssets);
    if (keys.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Belum ada file asset ditambahkan.</td></tr>';
        return;
    }

    keys.forEach(fileName => {
        const contentPreview = (currentTemplateAssets[fileName] || '').substring(0, 50).replace(/\n/g, ' ') + '...';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><code>${escapeHtml(fileName)}</code></td>
            <td><small style="color:var(--text-muted); font-size:11px;">${escapeHtml(contentPreview)}</small></td>
            <td style="text-align: center; white-space: nowrap;">
                <button type="button" onclick="editAsset('${escapeHtml(fileName)}')" class="btn btn-outline" style="padding: 2px 6px; font-size: 10.5px;">✏️ Edit</button>
                <button type="button" onclick="deleteAsset('${escapeHtml(fileName)}')" class="btn btn-danger" style="padding: 2px 6px; font-size: 10.5px;">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// --- AUDIT LOGS & TELEMETRY ---
async function fetchAuditLogs() {
    const pwd = getPassword();
    if (!pwd) return;

    const tbody = document.getElementById('auditBody');
    const alertBox = document.getElementById('auditAlert');
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Sedang memuat log audit...</td></tr>';
    alertBox.style.display = 'none';

    try {
        const res = await fetch(`${API_BASE_URL}/api/get-audit-logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: pwd })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Gagal mengambil log");

        fetchedAuditLogsList = data.data || [];
        renderAuditTable(fetchedAuditLogsList);
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color:var(--danger);">Gagal memuat log audit.</td></tr>';
        alertBox.className = 'alert error';
        alertBox.textContent = e.message;
    }
}

function renderAuditTable(logs) {
    const tbody = document.getElementById('auditBody');
    tbody.innerHTML = '';

    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Tidak ada log audit tercatat.</td></tr>';
        return;
    }

    logs.forEach(log => {
        window.auditDataStore[log.id] = log;
        const dateObj = new Date(log.created_at);
        const formattedDate = dateObj.toLocaleString('id-ID');
        const detailBtn = `<button class="btn btn-outline" style="padding:3px 6px; font-size:11px;" onclick="showAuditModal('${log.id}')">🔍 Lihat Bukti</button>`;
        
        const logStatus = (log.status || 'unread').toLowerCase();
        const keyType = (log.changed_keys || '').toUpperCase();
        
        let rowBg = '';
        let typeBadge = `<code style="color:var(--info);">${escapeHtml(log.changed_keys)}</code>`;

        if (keyType.includes('DOMAIN_MISMATCH') || keyType.includes('ILLEGAL_WORKER')) {
            rowBg = 'background-color: #fff1f2;';
            typeBadge = `<span class="badge badge-suspicious">🚨 ${escapeHtml(log.changed_keys)}</span>`;
        }

        const row = document.createElement('tr');
        if (rowBg) row.style = rowBg;

        row.innerHTML = `
            <td style="font-size:11.5px;">${formattedDate}</td>
            <td><strong>${escapeHtml(log.worker_name)}</strong></td>
            <td><small style="color:${log.client_email === 'UNKNOWN_PIRATE' ? 'var(--danger)' : 'var(--text-muted)'}; font-weight:600; font-size:11px;">${escapeHtml(log.client_email)}</small></td>
            <td>${typeBadge}</td>
            <td><span class="badge ${logStatus === 'unread' ? 'badge-unread' : 'badge-active'}">${logStatus}</span></td>
            <td style="text-align: center;">${detailBtn}</td>
        `;
        tbody.appendChild(row);
    });
}

function filterAuditTable() {
    const query = (document.getElementById('auditSearchInput').value || '').toLowerCase();
    const filtered = fetchedAuditLogsList.filter(l => 
        (l.worker_name && l.worker_name.toLowerCase().includes(query)) ||
        (l.client_email && l.client_email.toLowerCase().includes(query)) ||
        (l.changed_keys && l.changed_keys.toLowerCase().includes(query)) ||
        (l.old_data && l.old_data.toLowerCase().includes(query)) ||
        (l.new_data && l.new_data.toLowerCase().includes(query))
    );
    renderAuditTable(filtered);
}

function showAuditModal(auditId) {
    const log = window.auditDataStore[auditId];
    if (!log) return;
    
    let oldParsed = log.old_data, newParsed = log.new_data;
    try { oldParsed = JSON.parse(log.old_data); } catch(e){}
    try { newParsed = JSON.parse(log.new_data); } catch(e){}

    document.getElementById('diffOld').textContent = typeof oldParsed === 'object' ? JSON.stringify(oldParsed, null, 2) : oldParsed;
    document.getElementById('diffNew').textContent = typeof newParsed === 'object' ? JSON.stringify(newParsed, null, 2) : newParsed;
    document.getElementById('auditModal').style.display = 'block';
}

function inspectClientAudit(workerName) {
    switchTab('audit');
    setTimeout(() => {
        const searchInput = document.getElementById('auditSearchInput');
        if (searchInput) {
            searchInput.value = workerName;
            filterAuditTable();
        }
    }, 250);
}

// --- SYSTEM ACTIONS & RECREATE WORKER ---
document.getElementById('redeployForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const pwd = getPassword();
    if (!pwd) return;

    const btn = document.getElementById('btnRecreate');
    const alertBox = document.getElementById('recreateAlert');
    const workerName = document.getElementById('oldWorker').value.trim();
    const newWorkerName = document.getElementById('newWorker').value.trim();

    btn.disabled = true;
    btn.textContent = 'Memproses...';
    alertBox.className = 'alert info';
    alertBox.textContent = 'Menghapus worker lama & memindahkan konfigurasi... (Mohon tunggu 10-30 detik)';

    try {
        const res = await fetch(`${API_BASE_URL}/api/recreate-worker-name`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: pwd, worker_name: workerName, new_worker_name: newWorkerName })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Gagal reset worker.');

        alertBox.className = 'alert success';
        alertBox.textContent = 'BERHASIL:\n' + data.message;
        document.getElementById('redeployForm').reset();
    } catch (err) {
        alertBox.className = 'alert error';
        alertBox.textContent = 'GAGAL:\n' + err.message;
    } finally {
        btn.disabled = false;
        btn.textContent = '🚀 Eksekusi Recreate Worker';
    }
});

async function triggerMassUpdate() {
    const pwd = getPassword();
    if (!pwd) return;

    const btn = document.getElementById('btnMassUpdate');
    const progressBox = document.getElementById('massUpdateProgressBox');
    const statusText = document.getElementById('massUpdateStatusText');
    const detailText = document.getElementById('massUpdateDetailText');
    const spinner = document.getElementById('massUpdateSpinner');
    const githubLink = document.getElementById('massUpdateGithubLink');

    if (!confirm("Jalankan Mass-Update ke seluruh situs klien?")) return;

    btn.disabled = true;
    progressBox.style.display = 'block';
    spinner.style.display = 'block';
    statusText.innerText = "Memicu Workflow GitHub Actions...";
    detailText.innerText = "Mengirim sinyal pemicu...";
    githubLink.style.display = 'none';

    try {
        const res = await fetch(`${API_BASE_URL}/api/mass-update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: pwd })
        });

        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Gagal memicu Mass-Update.");

        statusText.innerText = "Mass-Update Terpemicu!";
        detailText.innerText = "Menunggu antrean runner GitHub Actions...";

        if (massUpdatePollInterval) clearInterval(massUpdatePollInterval);

        massUpdatePollInterval = setInterval(async () => {
            try {
                const statusRes = await fetch(`${API_BASE_URL}/api/mass-update-status`);
                const statusData = await statusRes.json();

                if (statusData.html_url) {
                    githubLink.href = statusData.html_url;
                    githubLink.style.display = 'inline-block';
                }

                if (statusData.status === 'queued' || statusData.status === 'in_progress') {
                    statusText.innerText = `Update Sedang Berjalan (Run #${statusData.run_number || ''})...`;
                    detailText.innerText = "Sistem sedang mengompilasi dan mendorong kode ke worker seluruh klien...";
                } else if (statusData.status === 'completed') {
                    clearInterval(massUpdatePollInterval);
                    btn.disabled = false;
                    spinner.style.display = 'none';

                    if (statusData.conclusion === 'success') {
                        statusText.innerText = "✅ Mass-Update Selesai!";
                        detailText.innerText = "Seluruh website klien berhasil diperbarui ke versi terbaru.";
                        fetchClients();
                    } else {
                        statusText.innerText = `❌ Mass-Update Gagal (${statusData.conclusion || 'Error'})`;
                        detailText.innerText = "Buka log GitHub di bawah untuk melihat error.";
                    }
                }
            } catch (pollErr) {
                console.warn("Polling error:", pollErr.message);
            }
        }, 4000);

    } catch (err) {
        btn.disabled = false;
        spinner.style.display = 'none';
        statusText.innerText = "❌ Gagal Memulai Mass-Update";
        detailText.innerText = err.message;
    }
}

async function executeSystemAction(endpoint, actionName, btnId) {
    const pwd = getPassword();
    if (!pwd) return;

    const alertBox = document.getElementById('systemAlert');
    const btn = document.getElementById(btnId);
    const originalText = btn.textContent;

    btn.disabled = true;
    btn.textContent = `Mengeksekusi ${actionName}...`;
    
    alertBox.className = 'alert info';
    alertBox.textContent = `Menjalankan ${actionName}... Mohon tunggu.`;

    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ adminPassword: pwd })
        });
        
        const data = await res.json();

        if (!res.ok) {
            alertBox.className = 'alert error';
            alertBox.textContent = `GAGAL (${res.status}):\n${data.error || JSON.stringify(data)}`;
        } else {
            alertBox.className = 'alert success';
            let finalMessage = data.message || `Berhasil memproses ${actionName}.`;
            if (data.failed_details && data.failed_details.length > 0) {
                finalMessage += "\n\nDaftar Klien yang Gagal Purge:\n" + JSON.stringify(data.failed_details, null, 2);
            }
            alertBox.textContent = finalMessage;
        }
    } catch (err) {
        alertBox.className = 'alert error';
        alertBox.textContent = `KESALAHAN JARINGAN:\n${err.message}`;
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}