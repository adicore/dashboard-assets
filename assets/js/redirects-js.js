// assets/js/redirects-js.js

// ==========================================
// 1. GLOBAL UTILITIES, TRANSLATIONS & TOAST
// ==========================================
const translations = {
    id: {
        visit_site: "Kunjungi Situs",
        purge_cache: "Purge Cache",
        redirects_title: "Pengelola URL Redirects & 404 Monitor",
        redirects_desc: "Atur pengalihan URL (301/302) secara visual dan terintegrasi Cloudflare Edge API.",
        btn_saveredirects: "Simpan Perubahan Redirects"
    },
    en: {
        visit_site: "Visit Site",
        purge_cache: "Purge Cache",
        redirects_title: "URL Redirects & 404 Monitor",
        redirects_desc: "Configure URL forwarding (301/302) integrated with Cloudflare Edge API.",
        btn_saveredirects: "Save Redirects"
    }
};

function changeLanguage(lang) {
    localStorage.setItem('dashboard_lang', lang);
    const langSel = document.getElementById('langSelector');
    if (langSel) langSel.value = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.innerText = translations[lang][key];
        }
    });
}

function showToast(message, type = 'success') {
    const toastEl = document.getElementById('liveToast');
    const toastBody = document.getElementById('toastMessage');
    if (!toastEl || !toastBody) return;

    let iconClass = type === 'success' ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-warning';
    if (type === 'danger') iconClass = 'bi-x-circle-fill text-danger';
    
    toastBody.innerHTML = `<i class="bi ${iconClass} me-2"></i> ${message}`;
    toastEl.className = `toast align-items-center text-white ${type === 'danger' ? 'bg-danger' : 'bg-dark'} border-0 shadow-lg`;
    
    new bootstrap.Toast(toastEl, { delay: 3000 }).show();
}

async function purgeCloudflareCache() {
    if (!confirm("Are you sure you want to clear all Cloudflare cache?")) return;
    
    const btn = event ? event.currentTarget : null;
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Cleaning...`;
        btn.disabled = true;
    }

    try {
        const res = await fetch('/api/cloudflare/purge-cache', { method: 'POST' });
        if (res.ok) {
            showToast("Cloudflare cache successfully cleared (Purged)!");
        } else {
            const errText = await res.text();
            showToast("Failed to clear cache: " + errText, "danger");
        }
    } catch (err) {
        showToast("A network error occurred: " + err.message, "danger");
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

function toggleSidebar() {
    if (window.innerWidth > 768) document.body.classList.toggle('sidebar-collapsed');
    else document.body.classList.toggle('sidebar-mobile-open');
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==========================================
// 2. PROFILE & TOPBAR INITIALIZATION
// ==========================================
async function initUserProfileTopbar() {
    try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
            const user = await res.json();
            if (user.name && document.getElementById('topbarUsername')) {
                document.getElementById('topbarUsername').innerText = user.name;
            }
            if (user.avatar && user.avatar.trim() !== '' && document.getElementById('topbarUserAvatar')) {
                document.getElementById('topbarUserAvatar').src = user.avatar;
            }
            if (user.role) document.body.setAttribute('data-role', user.role);
            if (user.email) document.body.setAttribute('data-email', user.email);
        }
    } catch(e) {}
}

async function updateVisitSiteLink() {
    try {
        const res = await fetch('/api/kv?key=global:settings');
        if (res.ok) {
            const txt = await res.text();
            if (txt) {
                const data = JSON.parse(txt);
                const visitLink = document.getElementById('visitSiteLink');
                if (visitLink && data.site_url) {
                    visitLink.href = data.site_url.trim();
                }
            }
        }
    } catch (e) {
        console.error("Failed to load global settings:", e);
    }
}

// ==========================================
// 3. REDIRECT SPECIFIC FUNCTIONS (DUAL STORAGE D1 + CLOUDFLARE)
// ==========================================

async function loadRedirectsData() {
    const tbody = document.getElementById('redirectTableBody');
    const rawEditor = document.getElementById('inpRedirectsContent');

    if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Loading data from Database D1...</td></tr>';

    try {
        const res = await fetch('/api/redirects');
        if (res.ok) {
            const data = await res.json();
            let rawLines = '';

            if (Array.isArray(data) && data.length > 0) {
                let rows = '';
                data.forEach(item => {
                    rawLines += `${item.source_url} ${item.target_url} ${item.status_code || 301}\n`;
                    rows += `<tr>
                        <td class="ps-4 fw-semibold text-danger">${escapeHtml(item.source_url)}</td>
                        <td><i class="bi bi-arrow-right text-muted me-2"></i><span class="text-success">${escapeHtml(item.target_url)}</span></td>
                        <td><span class="badge bg-primary bg-opacity-10 text-primary border border-primary">${item.status_code || 301}</span></td>
                        <td class="text-end pe-4">
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteRedirectRule(${item.id})" title="Delete Rule">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>`;
                });
                if (tbody) tbody.innerHTML = rows;
            } else {
                if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">There are no redirect rules stored yet.</td></tr>';
            }

            if (rawEditor) rawEditor.value = rawLines.trim();
        } else {
            if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger">Failed to load redirect rules.</td></tr>';
        }
    } catch(e) {
        console.error("Failed to load redirects:", e);
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger">Error connecting to server.</td></tr>';
    }
}

async function saveRedirectRule() {
    let oldPath = document.getElementById('inpOldPath').value.trim();
    const newTarget = document.getElementById('inpNewTarget').value.trim();
    const statusCodeEl = document.getElementById('inpStatusCode');
    const statusCode = statusCodeEl ? statusCodeEl.value : 301;
    const btn = document.getElementById('btnSaveRedirect');

    if (!oldPath || !newTarget) {
        showToast("Source and Target URLs are required!", "warning");
        return;
    }

    if (!oldPath.startsWith('/') && !oldPath.startsWith('http://') && !oldPath.startsWith('https://')) {
        oldPath = '/' + oldPath;
    }

    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
        btn.disabled = true;
    }

    try {
        const res = await fetch('/api/redirects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                source_url: oldPath, 
                target_url: newTarget, 
                status_code: parseInt(statusCode) || 301,
                preserve_query_string: 1
            })
        });

        if (res.ok) {
            showToast("Redirect rule saved and synced to Cloudflare Edge API!", "success");
            const modalEl = document.getElementById('redirectModal');
            if (modalEl) {
                const modalInstance = bootstrap.Modal.getInstance(modalEl);
                if (modalInstance) modalInstance.hide();
            }
            loadRedirectsData();
        } else {
            throw new Error(await res.text());
        }
    } catch(err) {
        showToast("Failed to save redirect rule: " + err.message, 'danger');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

async function deleteRedirectRule(id) {
    if (!confirm("Are you sure you want to delete this redirect rule?")) return;

    try {
        const res = await fetch('/api/redirects', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });

        if (res.ok) {
            showToast("Redirect rule successfully deleted!", "success");
            loadRedirectsData();
        } else {
            throw new Error(await res.text());
        }
    } catch(e) {
        showToast("Failed to delete rule: " + e.message, "danger");
    }
}

async function saveBulkRedirectsFile() {
    const rawContent = document.getElementById('inpRedirectsContent').value.trim();
    const btn = event ? event.currentTarget : null;
    const originalText = btn ? btn.innerHTML : '';

    if (!rawContent) {
        showToast("Redirect editor content is empty!", "warning");
        return;
    }

    if (btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Syncing to Cloudflare...';
        btn.disabled = true;
    }

    const lines = rawContent.split('\n');
    let successCount = 0;

    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
            const source_url = parts[0];
            const target_url = parts[1];
            const status_code = parts[2] ? parseInt(parts[2]) : 301;

            try {
                const res = await fetch('/api/redirects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        source_url,
                        target_url,
                        status_code,
                        preserve_query_string: 1
                    })
                });
                if (res.ok) successCount++;
            } catch(e) {}
        }
    }

    if (btn) {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }

    showToast(`Successfully synced ${successCount} rules to Cloudflare Bulk Redirect List!`, "success");
    loadRedirectsData();
}

// ==========================================
// 4. 404 MONITORING LOGS
// ==========================================

async function load404Logs() {
    const tbody = document.getElementById('log404TableBody');
    if (!tbody) return;

    try {
        const response = await fetch('/api/log-404/list');
        if (response.ok) {
            const logs = await response.json();
            
            if (Array.isArray(logs) && logs.length > 0) {
                let rows = '';
                logs.forEach(log => {
                    const dateObj = new Date(log.last_time);
                    const timeStr = isNaN(dateObj.getTime()) ? log.last_time : dateObj.toLocaleString('en-US');
                    
                    rows += `<tr>
                        <td class="ps-4 fw-semibold text-danger">${escapeHtml(log.url)}</td>
                        <td class="text-center"><span class="badge bg-secondary rounded-pill">${log.count}</span></td>
                        <td><small class="text-muted">${timeStr}</small></td>
                        <td class="text-end pe-4">
                            <button class="btn btn-sm btn-outline-primary" onclick="quickRedirect('${escapeHtml(log.url)}')" title="Create Redirect">
                                <i class="bi bi-arrow-right-circle me-1"></i> Redirect
                            </button>
                        </td>
                    </tr>`;
                });
                tbody.innerHTML = rows;
            } else {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No 404 errors recorded yet.</td></tr>';
            }
        }
    } catch (e) {
        console.error("Failed to load 404 logs:", e);
    }
}

function clear404Logs() {
    if(!confirm("Are you sure you want to clear 404 logs from view?")) return;
    const tbody = document.getElementById('log404TableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">Log 404 cleared from view.</td></tr>';
    showToast("404 logs cleared.", "info");
}

function quickRedirect(oldPath) {
    const modalEl = document.getElementById('redirectModal');
    if (!modalEl) return;
    const modal = new bootstrap.Modal(modalEl);
    document.getElementById('inpOldPath').value = oldPath.replace(/^\//, ''); 
    document.getElementById('inpNewTarget').value = '';
    modal.show();
}

function openRedirectModal() {
    const modalEl = document.getElementById('redirectModal');
    if (!modalEl) return;
    const modal = new bootstrap.Modal(modalEl);
    document.getElementById('inpOldPath').value = '';
    document.getElementById('inpNewTarget').value = '';
    modal.show();
}

// ==========================================
// 5. PAGE INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    const defaultLang = localStorage.getItem('dashboard_lang') || 'en';
    changeLanguage(defaultLang);
    initUserProfileTopbar();
    loadRedirectsData();
    load404Logs();
    updateVisitSiteLink();
});