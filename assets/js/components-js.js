// ==========================================
// COMPONENTS MODULE - WP-CMS Dashboard (Real-time Dual Storage Update & Central Distribution)
// ==========================================

function showToast(message, type = 'success') {
    const toastEl = document.getElementById('liveToast');
    const toastBody = document.getElementById('toastMessage');
    if (!toastEl || !toastBody) return;
    
    let iconClass = type === 'success' ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-warning';
    if (type === 'info') iconClass = 'bi-info-circle-fill text-info';
    
    toastBody.innerHTML = `<i class="bi ${iconClass} me-2"></i> ${message}`;
    toastEl.className = `toast align-items-center text-white ${type === 'danger' ? 'bg-danger' : 'bg-dark'} border-0 shadow-lg`;
    
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
}

async function setButtonLoading(btn, isLoading, loadingText = 'Saving...') {
    if (!btn) return;
    if (isLoading) {
        btn.dataset.originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${loadingText}`;
    } else {
        btn.innerHTML = `<i class="bi bi-check2 me-1"></i> Success!`;
        btn.classList.add('btn-success');
        btn.classList.remove('wp-btn-primary', 'btn-outline-primary');
        setTimeout(() => {
            btn.innerHTML = btn.dataset.originalHtml || 'Save';
            btn.disabled = false;
            btn.classList.remove('btn-success');
            btn.classList.add('wp-btn-primary');
        }, 1200);
    }
}

function clientSideMinify(html) {
    if (!html) return "";
    return html
        .replace(/<!--[\s\S]*?-->/gis, (match) => {
            return (match.includes('LOOP') || match.includes('IF_HAS_CHILDREN') || match.includes('END_IF')) ? match : '';
        })
        .replace(/\>[^\Sr\n]+/g, '>')
        .replace(/[^\Sr\n]+\</g, '<')
        .replace(/[\r\n]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function toggleSidebar() {
    if (window.innerWidth > 768) {
        document.body.classList.toggle('sidebar-collapsed');
    } else {
        document.body.classList.toggle('sidebar-mobile-open');
    }
}

async function purgeCloudflareCache() {
    if (!confirm("Are you sure you want to clear all Cloudflare cache?")) return;
    
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Cleaning...`;
    btn.disabled = true;

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
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

const translations = {
    id: {
        visit_site: "Kunjungi Situs",
        purge_cache: "Purge Cache",
        logout_btn: "Logout",
        components_title: "Struktur Kerangka Induk & Global",
        comp_layoutdefault: "Cangkang Utama (Halaman Statis)",
        comp_layoutdefault_desc: "Kerangka master HTML untuk halaman statis.",
        comp_layoutpost: "Cangkang Khusus Artikel (Layout Post)",
        comp_layoutpost_desc: "Kerangka master HTML khusus postingan blog.",
        comp_topbar_desc: "Baris atas navigasi.",
        comp_nav_desc: "Menu utama situs.",
        comp_footer_desc: "Bagian bawah.",
        comp_modals_desc: "Kotak dialog, popup, atau modal global website.",
        btn_cancel: "Batal",
        btn_save: "Simpan",
        btn_browse_templates: "Katalog Template Pusat"
    },
    en: {
        visit_site: "Visit Site",
        purge_cache: "Purge Cache",
        logout_btn: "Logout",
        components_title: "Parent & Global Framework Structure",
        comp_layoutdefault: "Main Shell (Static Pages)",
        comp_layoutdefault_desc: "Master HTML skeleton for static pages.",
        comp_layoutpost: "Post Shell (Layout Post)",
        comp_layoutpost_desc: "Master HTML skeleton specifically for blog posts.",
        comp_topbar_desc: "Navigation top bar.",
        comp_nav_desc: "Main site menu.",
        comp_footer_desc: "Bottom section.",
        comp_modals_desc: "Dialog boxes, popups, or global modals.",
        btn_cancel: "Cancel",
        btn_save: "Save",
        btn_browse_templates: "Browse Template Catalog"
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

// ==========================================
// CENTRAL TEMPLATE DISTRIBUTION LOGIC
// ==========================================

async function checkTemplateStatusAndNotifications() {
    try {
        const res = await fetch('/api/client/template-status');
        if (!res.ok) return;

        const data = await res.json();
        const notificationContainer = document.getElementById('templateNotificationContainer');

        if (!notificationContainer) return;

        if (!data.active_id) {
            notificationContainer.innerHTML = `
                <div class="alert alert-warning border-0 shadow-sm d-flex justify-content-between align-items-center rounded-3 p-3 mb-0">
                    <div>
                        <strong class="text-dark"><i class="bi bi-exclamation-triangle-fill text-warning me-2"></i> No Template Installed Yet</strong>
                        <div class="small text-muted">Select and apply an initial layout template from the central server for your site.</div>
                    </div>
                    <button class="btn btn-primary btn-sm px-3 fw-semibold" onclick="openTemplateCatalogModal()">
                        <i class="bi bi-palette me-1"></i> Select Template
                    </button>
                </div>
            `;
            return;
        }

        if (data.has_update) {
            notificationContainer.innerHTML = `
                <div class="alert alert-info border-0 shadow-sm d-flex justify-content-between align-items-center rounded-3 p-3 mb-0">
                    <div>
                        <strong class="text-primary"><i class="bi bi-arrow-up-circle-fill me-2"></i> Template Update Available!</strong>
                        <div class="small text-muted">
                            Active template: <code>v${data.active_version}</code> &rarr; Latest version on central server: <code>v${data.latest_version}</code>
                        </div>
                    </div>
                    <button class="btn btn-success btn-sm px-3 fw-semibold" onclick="executeTemplateUpdate('${data.active_id}')">
                        <i class="bi bi-download me-1"></i> Update Now
                    </button>
                </div>
            `;
        } else {
            notificationContainer.innerHTML = '';
        }
    } catch (e) {
        console.error("Failed to check template status:", e);
    }
}

async function openTemplateCatalogModal() {
    const modalEl = document.getElementById('templateCatalogModal');
    const catalogGrid = document.getElementById('templateCatalogGrid');
    if (!modalEl || !catalogGrid) return;

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    
    catalogGrid.innerHTML = '<div class="col-12 text-center py-4"><span class="spinner-border spinner-border-sm me-2"></span>Loading template catalog from central server...</div>';
    modal.show();

    try {
        const res = await fetch('/api/client/template-catalog');
        const templates = await res.json();

        if (!templates || templates.length === 0) {
            catalogGrid.innerHTML = '<div class="col-12 text-center py-4 text-muted">No templates available on the central server.</div>';
            return;
        }

        catalogGrid.innerHTML = templates.map(tpl => `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 border-0 shadow-sm rounded-3 overflow-hidden">
                    <img src="${tpl.preview_img || '/assets/img/template-placeholder.jpg'}" class="card-img-top" style="height:160px; object-fit:cover;" alt="${tpl.name}">
                    <div class="card-body p-3 d-flex flex-column justify-content-between">
                        <div>
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <h6 class="fw-bold mb-0 text-dark">${tpl.name}</h6>
                                <span class="badge ${tpl.is_free ? 'bg-success' : 'bg-warning text-dark'}" style="font-size:10px;">${tpl.is_free ? 'FREE' : 'PRO'}</span>
                            </div>
                            <div class="small text-muted mb-2">Version: <code>v${tpl.version}</code></div>
                            <p class="text-secondary small mb-3" style="font-size: 11px; line-height: 1.4;">${tpl.description || 'No description provided.'}</p>
                        </div>
                        <button class="btn btn-primary btn-sm w-100 fw-semibold" onclick="applyChosenTemplate('${tpl.id}', '${tpl.name}')">
                            <i class="bi bi-check-circle me-1"></i> Choose Template
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        catalogGrid.innerHTML = `<div class="col-12 text-center text-danger py-4">Error: ${e.message}</div>`;
    }
}

async function applyChosenTemplate(templateId, templateName) {
    if (!confirm(`Apply template "${templateName}" to your site?`)) return;

    showToast("Downloading and applying template to KV & GitHub...", "info");
    try {
        const res = await fetch('/api/client/apply-template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ template_id: templateId })
        });

        if (res.ok) {
            showToast(`Template "${templateName}" successfully applied!`);
            const modalEl = document.getElementById('templateCatalogModal');
            if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
            setTimeout(() => location.reload(), 1200);
        } else {
            throw new Error(await res.text());
        }
    } catch (e) {
        showToast("Failed to apply template: " + e.message, "danger");
    }
}

async function executeTemplateUpdate(templateId) {
    if (!confirm("Update template to the latest version? Local layout & component files will be synced from the central server.")) return;

    showToast("Downloading template update...", "info");
    try {
        const res = await fetch('/api/client/update-template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ template_id: templateId })
        });

        if (res.ok) {
            showToast("Template update successfully applied!");
            setTimeout(() => location.reload(), 1200);
        } else {
            throw new Error(await res.text());
        }
    } catch (e) {
        showToast("Failed to update template: " + e.message, "danger");
    }
}

// ==========================================
// TEMPLATE ASSETS MANAGEMENT (CSS, JS & BINARY FONTS/IMAGES)
// ==========================================

async function loadTemplateAssetsList() {
    const tbody = document.getElementById('assetsListBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3"><span class="spinner-border spinner-border-sm me-2"></span>Loading asset list...</td></tr>';

    try {
        const res = await fetch('/api/kv?key=global:assets_list');
        let assets = [];
        if (res.ok) {
            const txt = await res.text();
            if (txt) {
                try { assets = JSON.parse(txt); } catch(e){}
            }
        }

        if (!Array.isArray(assets) || assets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">No static asset files yet. Click "Add New Asset File" to add one.</td></tr>';
            return;
        }

        tbody.innerHTML = assets.map(filePath => {
            const ext = filePath.split('.').pop().toLowerCase();
            let badgeClass = 'bg-secondary';
            if (ext === 'css') badgeClass = 'bg-primary';
            else if (ext === 'js') badgeClass = 'bg-warning text-dark';
            else if (['woff', 'woff2', 'ttf', 'eot', 'otf'].includes(ext)) badgeClass = 'bg-info text-dark';
            else if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'ico'].includes(ext)) badgeClass = 'bg-success';

            return `
                <tr>
                    <td><code>${filePath}</code></td>
                    <td><span class="badge ${badgeClass}">${ext.toUpperCase()}</span></td>
                    <td class="text-end">
                        <button type="button" class="btn btn-sm btn-outline-primary me-1" onclick="openEditor('asset:${filePath}', 'Asset: ${filePath}')">
                            <i class="bi bi-pencil me-1"></i> Edit Code
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteAssetFile('${filePath}')">
                            <i class="bi bi-trash me-1"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-3">Failed to load assets: ${e.message}</td></tr>`;
    }
}

function openAddAssetModal() {
    document.getElementById('newAssetPath').value = '';
    document.getElementById('newAssetContent').value = '';
    document.getElementById('newAssetFileUpload').value = '';
    const modalEl = document.getElementById('addAssetModal');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function handleClientAssetUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('newAssetPath').value = file.name;
    const isBinary = /\.(woff|woff2|ttf|eot|otf|png|jpg|jpeg|webp|gif|ico)\$/i.test(file.name);
    const reader = new FileReader();

    if (isBinary) {
        reader.onload = function(evt) {
            const base64Data = evt.target.result.split(',')[1];
            document.getElementById('newAssetContent').value = base64Data;
        };
        reader.readAsDataURL(file);
    } else {
        reader.onload = function(evt) {
            document.getElementById('newAssetContent').value = evt.target.result;
        };
        reader.readAsText(file);
    }
}

async function saveNewAssetFile() {
    const pathInput = document.getElementById('newAssetPath');
    const contentInput = document.getElementById('newAssetContent');
    if (!pathInput || !contentInput) return;

    const rawPath = pathInput.value.trim().replace(/^\/+/, '');
    const content = contentInput.value;

    if (!rawPath) {
        showToast("File Path is required!", "danger");
        return;
    }

    showToast("Saving asset file...", "info");

    try {
        const kvKey = `asset:${rawPath}`;
        const res = await fetch('/api/kv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: kvKey, content })
        });

        if (res.ok) {
            showToast(`Asset "${rawPath}" successfully saved!`);
            const modalEl = document.getElementById('addAssetModal');
            if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
            pathInput.value = '';
            contentInput.value = '';
            document.getElementById('newAssetFileUpload').value = '';
            loadTemplateAssetsList();
        } else {
            throw new Error(await res.text());
        }
    } catch(e) {
        showToast("Failed to save asset: " + e.message, "danger");
    }
}

async function deleteAssetFile(filePath) {
    if (!confirm(`Are you sure you want to delete the asset file '${filePath}'?`)) return;

    showToast(`Deleting ${filePath}...`, "info");
    try {
        const res = await fetch('/api/kv', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: `asset:${filePath}` })
        });

        if (res.ok) {
            showToast(`Asset '${filePath}' successfully deleted!`);
            loadTemplateAssetsList();
        } else {
            throw new Error(await res.text());
        }
    } catch(e) {
        showToast("Failed to delete asset: " + e.message, "danger");
    }
}

// ==========================================
// MENU MANAGEMENT & REPEATER EXTENSIONS
// ==========================================
let currentMenuKey = "";

window.openMenuManagerExtended = async function(menuKey, menuTitle) {
    currentMenuKey = menuKey;
    document.getElementById('currentDynamicBlockId').value = menuKey;
    document.getElementById('dynamicBlockModalTitle').innerHTML = `<i class="bi bi-list-ul me-2 text-primary"></i>Manage Repeater &amp; Dropdown: ${menuTitle}`;
    
    const container = document.getElementById('repeaterRowsContainer');
    if (container) container.innerHTML = '<div class="text-muted small fst-italic">Loading menu...</div>';
    
    const alertBox = document.getElementById('repeaterAlert');
    if (alertBox) alertBox.classList.add('d-none');
    
    const modalEl = document.getElementById('dynamicBlockModal');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
    
    try {
        const res = await fetch('/api/kv?key=' + encodeURIComponent(menuKey));
        let items = [];
        if (res.ok) {
            const txt = await res.text();
            if (txt) items = JSON.parse(txt);
        }
        renderExtendedMenuRows(items);
    } catch (e) {
        renderExtendedMenuRows([]);
    }
};

function renderExtendedMenuRows(items) {
    const container = document.getElementById('repeaterRowsContainer');
    if (!container) return;
    container.innerHTML = "";
    if (!items || items.length === 0) {
        container.innerHTML = '<div class="text-muted small fst-italic p-3 bg-white border rounded">No menu links yet. Click the button below to add.</div>';
        return;
    }
    items.forEach((item, index) => {
        let childrenHtml = '';
        if (Array.isArray(item.children)) {
            item.children.forEach((sub) => {
                childrenHtml += `
                <div class="sub-row input-group input-group-sm mb-2">
                    <span class="input-group-text bg-light">Sub</span>
                    <input type="text" class="form-control sub-title" value="${sub.title || ''}" placeholder="Sub-Menu Title">
                    <input type="text" class="form-control sub-url" value="${sub.url || ''}" placeholder="/sub-url">
                    <button type="button" class="btn btn-outline-danger" onclick="this.closest('.sub-row').remove()"><i class="bi bi-x"></i></button>
                </div>`;
            });
        }

        container.insertAdjacentHTML('beforeend', `
        <div class="repeater-row wp-card p-3 bg-white border position-relative mb-3" data-index="${index}">
            <button type="button" class="btn-close position-absolute top-0 end-0 m-3" aria-label="Close" onclick="this.closest('.repeater-row').remove()"></button>
            <h6 class="fw-bold text-secondary small mb-3">Main Link #${index + 1}</h6>
            <div class="row g-3 mb-3">
                <div class="col-md-6"><label class="form-label small fw-semibold">Link Text (Label)</label><input type="text" class="form-control form-control-sm r-title" value="${item.title || ''}" placeholder="Example: Destinations"></div>
                <div class="col-md-6"><label class="form-label small fw-semibold">Target URL (Link)</label><input type="text" class="form-control form-control-sm r-url" value="${item.url || ''}" placeholder="Example: # or /destinations"></div>
            </div>
            <div class="border-top pt-2">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="small fw-bold text-muted"><i class="bi bi-arrow-return-right me-1"></i> Sub-Menu / Dropdown Items (Optional)</span>
                    <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2" style="font-size:11px;" onclick="addSubMenuRow(this)">+ Add Sub-Menu</button>
                </div>
                <div class="sub-menu-container">${childrenHtml}</div>
            </div>
        </div>`);
    });
}

function addSubMenuRow(btn) {
    const row = btn.closest('.repeater-row');
    const subContainer = row.querySelector('.sub-menu-container');
    subContainer.insertAdjacentHTML('beforeend', `
    <div class="sub-row input-group input-group-sm mb-2">
        <span class="input-group-text bg-light">Sub</span>
        <input type="text" class="form-control sub-title" placeholder="Sub-Menu Title">
        <input type="text" class="form-control sub-url" placeholder="/sub-url">
        <button type="button" class="btn btn-outline-danger" onclick="this.closest('.sub-row').remove()"><i class="bi bi-x"></i></button>
    </div>`);
}

function addRepeaterRow() {
    const container = document.getElementById('repeaterRowsContainer');
    if (!container) return;

    const existingRows = container.querySelectorAll('.repeater-row');
    let savedItems = [];
    existingRows.forEach(row => {
        const title = row.querySelector('.r-title') ? row.querySelector('.r-title').value : '';
        const url = row.querySelector('.r-url') ? row.querySelector('.r-url').value : '';
        let children = [];
        row.querySelectorAll('.sub-row').forEach(sub => {
            const subTitle = sub.querySelector('.sub-title') ? sub.querySelector('.sub-title').value : '';
            const subUrl = sub.querySelector('.sub-url') ? sub.querySelector('.sub-url').value : '';
            children.push({ title: subTitle, url: subUrl });
        });
        savedItems.push({ title, url, children });
    });

    savedItems.push({ title: '', url: '', children: [] });
    renderExtendedMenuRows(savedItems);
}

async function saveDynamicBlockData() {
    const rows = document.querySelectorAll('.repeater-row');
    let items = [];
    rows.forEach(row => {
        const title = row.querySelector('.r-title').value.trim();
        const url = row.querySelector('.r-url').value.trim();
        let children = [];
        row.querySelectorAll('.sub-row').forEach(sub => {
            const subTitle = sub.querySelector('.sub-title').value.trim();
            const subUrl = sub.querySelector('.sub-url').value.trim();
            if (subTitle || subUrl) {
                children.push({ title: subTitle, url: subUrl });
            }
        });
        if (title || url) {
            items.push({ title, url, children });
        }
    });
    
    const alertBox = document.getElementById('repeaterAlert');
    if (alertBox) {
        alertBox.className = "alert alert-info py-1 px-3 mb-0 small";
        alertBox.innerText = "Saving menu...";
        alertBox.classList.remove('d-none');
    }
    
    try {
        const res = await fetch('/api/kv', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ key: currentMenuKey, content: JSON.stringify(items) })
        });
        if (res.ok) {
            if (alertBox) {
                alertBox.className = "alert alert-success py-1 px-3 mb-0 small";
                alertBox.innerText = "Navigation menu successfully saved!";
            }
            showToast("Navigation menu successfully saved!");
            setTimeout(() => bootstrap.Modal.getInstance(document.getElementById('dynamicBlockModal')).hide(), 1000);
        } else {
            throw new Error();
        }
    } catch(e) {
        if (alertBox) {
            alertBox.className = "alert alert-danger py-1 px-3 mb-0 small";
            alertBox.innerText = "Failed to save menu!";
        }
        showToast("Failed to save menu!", "danger");
    }
}

// ==========================================
// CODEMIRROR EDITOR & DUAL STORAGE
// ==========================================
window.openEditor = async function(key, title) {
    document.getElementById('currentEditKey').value = key;
    document.getElementById('currentIsGitHubFile').value = "false";
    document.getElementById('editorOverlayTitle').innerHTML = `Edit: ${title}`;
    
    let mode = 'htmlmixed';
    if (key.includes(':css') || key.endsWith('.css')) mode = 'css';
    if (key.includes(':js') || key.endsWith('.js')) mode = 'javascript';
    if (key.endsWith('.json')) mode = 'application/json';
    
    const overlay = document.getElementById('customEditorOverlay');
    if (overlay) overlay.style.display = 'flex';
    
    const ed = document.getElementById('htmlEditor');
    if (ed) ed.value = "Loading data from server...";
    
    let content = "Failed to load content.";
    try {
        const resRaw = await fetch('/api/kv?key=' + encodeURIComponent(key + ':raw'));
        if (resRaw.ok) {
            const rawTxt = await resRaw.text();
            if (rawTxt) content = rawTxt;
        }
        if (!content || content === "Failed to load content.") {
            const res = await fetch('/api/kv?key=' + encodeURIComponent(key));
            if (res.ok) content = await res.text();
        }
    } catch(e) {
        content = "Failed to load content.";
    }
    
    if (ed) ed.value = content;
    
    setTimeout(() => {
        if (typeof window.initCodeMirrorEditor === 'function') {
            window.initCodeMirrorEditor('#htmlEditor', mode);
        }
    }, 60);
};

window.closeCustomEditor = function() {
    const overlay = document.getElementById('customEditorOverlay');
    if (overlay) overlay.style.display = 'none';
    if (window.currentCodeMirrorInstance) {
        window.currentCodeMirrorInstance.toTextArea();
        window.currentCodeMirrorInstance = null;
    }
};

async function saveEditorDataDualStorage() {
    const btn = document.getElementById('btnSaveEditor');
    setButtonLoading(btn, true, "Saving...");
    const key = document.getElementById('currentEditKey').value;
    
    const rawContent = window.currentCodeMirrorInstance ? window.currentCodeMirrorInstance.getValue() : document.getElementById('htmlEditor').value;
    const isGH = document.getElementById('currentIsGitHubFile').value === "true";
    
    try {
        let res;
        if (isGH) {
            const minifiedContent = clientSideMinify(rawContent);
            res = await fetch('/api/github/save', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ path: key, content: minifiedContent })
            });
        } else {
            await fetch('/api/kv', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ key: key + ':raw', content: rawContent })
            });

            const minifiedContent = key.startsWith('asset:') ? rawContent : clientSideMinify(rawContent);
            res = await fetch('/api/kv', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ key, content: minifiedContent })
            });
        }

        if(res.ok){
            setButtonLoading(btn, false);
            showToast("Template changes successfully saved and synced!");
            setTimeout(() => {
                closeCustomEditor();
                if (key.startsWith('asset:')) loadTemplateAssetsList();
            }, 1000);
        } else {
            throw new Error();
        }
    } catch(e) {
        setButtonLoading(btn, false);
        showToast("Failed to save template changes.", "danger");
    }
}

async function loadUserProfileInfo() {
    try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
            const user = await res.json();
            if (user.name && document.getElementById('topbarUsername')) {
                document.getElementById('topbarUsername').innerText = user.name;
            }
            if (user.avatar && document.getElementById('topbarUserAvatar')) {
                document.getElementById('topbarUserAvatar').src = user.avatar;
            }
            if (user.site_url && document.getElementById('visitSiteLink')) {
                document.getElementById('visitSiteLink').href = user.site_url;
            }
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

// Initialization on DOM load
document.addEventListener("DOMContentLoaded", function() {
    const defaultLang = localStorage.getItem('dashboard_lang') || 'en';
    changeLanguage(defaultLang);
    loadUserProfileInfo();
    updateVisitSiteLink();
    checkTemplateStatusAndNotifications();
    loadTemplateAssetsList();
});