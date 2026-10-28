// ==========================================
// 1. GLOBAL UTILITIES & TRANSLATIONS FOR BACKUP.HTML
// ==========================================
const translations = {
    id: {
        visit_site: "Visit Site",
        purge_cache: "Purge Cache",
        backup_title: "Cadangan & Pemulihan Data (Backup & Restore)",
        export_backup: "Ekspor Cadangan (Backup)",
        export_backup_desc: "Unduh seluruh basis data artikel, pengguna, pengaturan global, dan halaman statis.",
        download_json: "Unduh File Backup JSON",
        restore_title: "Pemulihan Data (Restore)",
        restore_desc: "Unggah file JSON cadangan sebelumnya untuk memulihkan database.",
        btn_restore: "Mulai Pemulihan (Restore)",
        import_xml_card: "Impor Konten (XML)",
        import_xml_card_desc: "Migrasikan artikel blog dan halaman statis dari WordPress atau Blogger.",
        btn_open_import: "Buka Menu Impor XML"
    },
    en: {
        visit_site: "Visit Site",
        purge_cache: "Purge Cache",
        backup_title: "Data Recovery & Backup",
        export_backup: "Export Backup",
        export_backup_desc: "Download all article databases, global settings, and static pages.",
        download_json: "Download JSON Backup File",
        restore_title: "Data Recovery (Restore)",
        restore_desc: "Upload previous backup JSON file to restore the database.",
        btn_restore: "Start Restore",
        import_xml_card: "Content Import (XML)",
        import_xml_card_desc: "Bulk migrate blog posts and static pages from WordPress or Blogger.",
        btn_open_import: "Open XML Import Menu"
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
    if (!toastEl || !toastBody) {
        alert(message);
        return;
    }
    let iconClass = type === 'success' ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-warning';
    if (type === 'danger') iconClass = 'bi-x-circle-fill text-danger';
    
    toastBody.innerHTML = `<i class="bi ${iconClass} me-2"></i> ${message}`;
    toastEl.className = `toast align-items-center text-white ${type === 'danger' ? 'bg-danger' : 'bg-dark'} border-0 shadow-lg`;
    
    new bootstrap.Toast(toastEl, { delay: 3000 }).show();
}

function triggerPendingSyncUI() {
    localStorage.setItem('sync_pending', 'true');
    document.querySelectorAll('.sync-pending-indicator, #syncPendingDot, [data-sync-indicator]').forEach(el => {
        el.classList.remove('d-none');
    });
}

async function purgeCloudflareCache() {
    if (!confirm("Clear all Cloudflare cache?")) return;
    try {
        const res = await fetch('/api/cloudflare/purge-cache', { method: 'POST' });
        if (res.ok) showToast("Cloudflare cache cleared successfully!");
        else showToast("Failed to clear cache.", "danger");
    } catch (err) {
        showToast("A network error occurred.", "danger");
    }
}

function toggleSidebar() {
    if (window.innerWidth > 768) document.body.classList.toggle('sidebar-collapsed');
    else document.body.classList.toggle('sidebar-mobile-open');
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

// ==========================================
// 3. BACKUP, RESTORE & IMPORT SPECIFIC FUNCTIONS
// ==========================================
async function executeRestore() {
    const fileInput = document.getElementById('restoreFileInput');
    if (!fileInput.files.length) return showToast("Select a JSON backup file first!", "warning");
    if (!confirm("WARNING: Restore will overwrite all existing data and settings with the backup data. Continue?")) return;

    const bulkModal = new bootstrap.Modal(document.getElementById('bulkProcessModal'));
    document.getElementById('bulkProcessTitle').innerText = "Restoring Data...";
    bulkModal.show();

    const file = fileInput.files[0];
    const text = await file.text();
    try {
        const data = JSON.parse(text);
        const res = await fetch('/api/restore', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        bulkModal.hide();
        if (res.ok) { 
            showToast("Data successfully restored!"); 
            triggerPendingSyncUI();
            setTimeout(() => location.reload(), 1200); 
        } else {
            throw new Error("Failed to restore data.");
        }
    } catch(e) { 
        bulkModal.hide();
        showToast("Invalid JSON file or restore failed!", "danger"); 
    }
}

async function processXMLImport() {
    const fileInput = document.getElementById('importXmlFile');
    const statusEl = document.getElementById('importStatus');
    
    if (!fileInput.files.length) {
        showToast("Select an XML file first!", "warning");
        return;
    }

    statusEl.classList.remove('d-none');
    statusEl.innerHTML = '<span class="text-info"><span class="spinner-border spinner-border-sm me-1"></span> Uploading XML file and triggering GitHub Actions...</span>';

    const file = fileInput.files[0];
    const text = await file.text();

    try {
        // Send raw XML file directly to Worker endpoint
        // Worker will save to imports/blogger.xml and trigger GitHub Actions
        const res = await fetch('/api/blogger/import-xml', {
            method: 'POST',
            headers: { 'Content-Type': 'application/xml' },
            body: text
        });

        const data = await res.json();

        if (res.ok && data.success) {
            triggerPendingSyncUI();
            const modalEl = document.getElementById('importModal');
            if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();

            statusEl.innerHTML = '<span class="text-success fw-bold">XML file successfully uploaded! Import process is running on GitHub Actions.</span>';
            showToast(data.message || "Import processed automatically in the background by GitHub Actions!", "success");
        } else {
            throw new Error(data.error || "Failed to process XML file.");
        }
    } catch(err) {
        statusEl.innerHTML = `<span class="text-danger">Error: ${err.message}</span>`;
        showToast("Import failed: " + err.message, "danger");
    }
}

async function executeBloggerApiImport() {
    const blogIdEl = document.getElementById('apiBlogId');
    const apiKeyEl = document.getElementById('apiKeyBlogger');
    const importTypeEl = document.getElementById('apiImportType');
    const statusEl = document.getElementById('apiImportStatus');

    if (!blogIdEl || !apiKeyEl || !importTypeEl) return;

    const blogId = blogIdEl.value.trim();
    const apiKey = apiKeyEl.value.trim();
    const rawImportType = importTypeEl.value;

    if (!blogId || !apiKey) return alert('Blog ID and API Key are required!');

    const [contentType, targetStatus] = rawImportType.split('_');

    const overlay = document.getElementById('importOverlayLoader');
    if (overlay) {
        document.getElementById('importLoaderTitle').innerText = `Importing ${contentType} (${targetStatus}) from Blogger API v3...`;
        overlay.style.display = 'flex';
    }
    if (statusEl) statusEl.innerHTML = '<span class="text-info">Connecting to Blogger API...</span>';

    let pageToken = null, totalImported = 0;
    try {
        do {
            const res = await fetch('/api/blogger/api-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    blog_id: blogId, 
                    api_key: apiKey, 
                    import_type: contentType, 
                    target_status: targetStatus,
                    saveToDbOnly: true,
                    pageToken: pageToken 
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed to process data from API');

            totalImported += (data.count || 0);
            pageToken = data.nextPageToken;

            if (overlay) document.getElementById('importLoaderTitle').innerText = `Successfully imported ${totalImported} ${contentType} (${targetStatus})...`;
            if (statusEl) statusEl.innerHTML = `<span class="text-info">Total ${totalImported} ${contentType} (${targetStatus}) successfully saved to database.</span>`;

            if (pageToken) await new Promise(r => setTimeout(r, 800));
        } while (pageToken);

        if (overlay) overlay.style.display = 'none';
        
        triggerPendingSyncUI();
        if (statusEl) statusEl.innerHTML = `<span class="text-success fw-bold">Done! Total ${totalImported} ${contentType} (${targetStatus}) successfully saved to database.</span>`;
        
        showToast(`Successfully imported a total of ${totalImported} ${contentType} (${targetStatus}) to the database! Please click Sync & Deploy in the navbar to publish.`);
    } catch (err) {
        if (overlay) overlay.style.display = 'none';
        if (statusEl) statusEl.innerHTML = `<span class="text-danger">Error: ${err.message}</span>`;
        showToast('Import failed: ' + err.message, 'danger');
    }
}

async function executeQueueBulkRender() {
    const statusEl = document.getElementById('queueBulkStatus');
    if (!statusEl) return;
    if (!confirm('Run bulk update for all pages and articles via Cloudflare Queue?')) return;
    statusEl.innerHTML = '<span class="text-info"><span class="spinner-border spinner-border-sm me-1"></span> Sending queue to Cloudflare Queue...</span>';
    try {
        const res = await fetch('/api/bulk-render-queue', { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.success) {
            statusEl.innerHTML = `<span class="text-success fw-bold">Success! ${data.total} items added to Queue.</span>`;
            showToast('Queue successfully sent!');
        } else throw new Error(data.error || 'Failed to send queue');
    } catch(err) {
        statusEl.innerHTML = `<span class="text-danger">Error: ${err.message}</span>`;
        showToast('Failed: ' + err.message, 'danger');
    }
}

async function executeAnalyticsSync() {
    const statusEl = document.getElementById('analyticsSyncStatus');
    if (!statusEl) return;
    statusEl.innerHTML = '<span class="text-info"><span class="spinner-border spinner-border-sm me-1"></span> Syncing statistics from Cloudflare Analytics...</span>';
    try {
        const res = await fetch('/api/analytics/sync-views', { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.success) {
            statusEl.innerHTML = `<span class="text-success fw-bold">Success! ${data.updated} articles updated.</span>`;
            showToast('Views sync successful!');
        } else throw new Error(data.error || 'Sync failed');
    } catch(err) {
        statusEl.innerHTML = `<span class="text-danger">Error: ${err.message}</span>`;
        showToast('Failed: ' + err.message, 'danger');
    }
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
// 4. PAGE INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    const defaultLang = localStorage.getItem('dashboard_lang') || 'en';
    changeLanguage(defaultLang);
    initUserProfileTopbar();
    updateVisitSiteLink();

    if (localStorage.getItem('sync_pending') === 'true') {
        document.querySelectorAll('.sync-pending-indicator, #syncPendingDot, [data-sync-indicator]').forEach(el => {
            el.classList.remove('d-none');
        });
    }
});