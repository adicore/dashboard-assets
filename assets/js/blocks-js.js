/**
 * assets/js/blocks-js.js
 * Frontend JavaScript untuk Management Library Block CMS
 */

// ==========================================
// TRANSLATIONS COLLECTION
// ==========================================
const translations = {
    id: {
        visit_site: "Kunjungi Situs",
        purge_cache: "Purge Cache",
        blocks_title: "Library Blok (Reusable Components)",
        cara_penggunaan: "Cara Penggunaan",
        btn_addblock: "Tambah Blok Baru",
        btn_cancel: "Batal",
        btn_saveblock: "Simpan Blok",
        btn_addrow: "Tambah Baris Item Baru",
        btn_savedata: "Simpan Data",
        modal_addblock_title: "Buat Komponen Blok Baru",
        label_blockid: "ID Unik Blok"
    },
    en: {
        visit_site: "Visit Site",
        purge_cache: "Purge Cache",
        blocks_title: "Block Library",
        cara_penggunaan: "Usage Guide",
        btn_addblock: "Add New Block",
        btn_cancel: "Cancel",
        btn_saveblock: "Save Block",
        btn_addrow: "Add New Item Row",
        btn_savedata: "Save Data",
        modal_addblock_title: "Create New Block Component",
        label_blockid: "Unique Block ID"
    }
};

// ==========================================
// GLOBAL & UI FUNCTIONS
// ==========================================
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
    if (type === 'info') iconClass = 'bi-info-circle-fill text-info';
    if (type === 'danger') iconClass = 'bi-x-circle-fill text-danger';
    
    toastBody.innerHTML = `<i class="bi ${iconClass} me-2"></i> ${message}`;
    toastEl.className = `toast align-items-center text-white ${type === 'danger' ? 'bg-danger' : 'bg-dark'} border-0 shadow-lg`;
    
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
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
    try {
        const res = await fetch('/api/cloudflare/purge-cache', { method: 'POST' });
        if (res.ok) showToast("Cloudflare cache successfully cleared!");
        else showToast("Failed to clear cache.", "danger");
    } catch (err) {
        showToast("A network error occurred.", "danger");
    }
}

function setButtonLoading(btn, isLoading, loadingText = 'Saving...') {
    if (!btn) return;
    if (isLoading) {
        btn.dataset.originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${loadingText}`;
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

async function loadTopbarProfile() {
    try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
            const user = await res.json();
            if (user.name && document.getElementById('topbarUsername')) document.getElementById('topbarUsername').innerText = user.name;
            if (user.avatar && document.getElementById('topbarUserAvatar')) document.getElementById('topbarUserAvatar').src = user.avatar;
        }
    } catch(e) {}
}

// ==========================================
// BLOCK LIBRARY (CORE)
// ==========================================
window.availableBlocksList = [];

window.loadBlocks = async function() {
    const container = document.getElementById('blocksContainer');
    if (!container) return;

    container.innerHTML = '<div class="col-12 text-center py-4 text-muted fst-italic">Loading block list...</div>';

    try {
        const res = await fetch('/api/blocks/list');
        const blocks = await res.json();
        window.availableBlocksList = blocks;

        if (!blocks || blocks.length === 0) {
            container.innerHTML = '<div class="col-12 text-muted small p-4 bg-white border rounded text-center">No block components have been created yet. Click "Add New Block" to get started.</div>';
            return;
        }

        let finalHtml = `
<div class="col-12">
    <div class="table-responsive bg-white rounded shadow-sm border border-light">
        <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
                <tr>
                    <th scope="col" class="py-3 px-4">Block Name</th>
                    <th scope="col" class="py-3">Shortcode</th>
                    <th scope="col" class="py-3 text-end px-4">Action</th>
                </tr>
            </thead>
            <tbody>
                `;

        blocks.forEach(bId => {
            finalHtml += `
                <tr>
                    <td class="px-4 py-3">
                        <div class="d-flex align-items-center">
                            <i class="bi bi-puzzle text-success me-3 fs-5"></i>
                            <h6 class="mb-0 fw-bold text-dark">${bId}</h6>
                        </div>
                    </td>
                    <td class="py-3">
                        <span class="badge bg-light text-dark border user-select-all" style="font-family: monospace; font-size: 0.85rem;">
                            {{BLOCK:${bId}}}
                        </span>
                    </td>
                    <td class="text-end px-4 py-3">
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="openEditor('block:${bId}', 'Block: ${bId}')" title="Edit HTML">
                                <i class="bi bi-code-slash"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="openDynamicBlockModal('${bId}')" title="Edit Repeater">
                                <i class="bi bi-list-nested"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="renameBlock('${bId}')" title="Rename">
                                <i class="bi bi-pencil-square"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteBlock('${bId}')" title="Delete">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
        });

        finalHtml += `
            </tbody>
        </table>
    </div>
</div>`;

        container.innerHTML = finalHtml;

    } catch (err) {
        container.innerHTML = '<div class="col-12 text-danger small p-3 bg-white border rounded">Failed to load block list.</div>';
    }
};

window.createNewBlock = async function() {
    const btn = document.getElementById('btnSaveNewBlock');
    setButtonLoading(btn, true, "Creating Block...");
    const bId = document.getElementById('inpNewBlockId').value.trim().toLowerCase().replace(/[^a-z0-9-]/g,'-');
    
    if(!bId) {
        setButtonLoading(btn, false);
        return showToast("Invalid Block ID!", "warning");
    }
    
    try {
        await fetch('/api/blocks/save-html', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ blockId: bId, html: '<div class="container py-4">\n    <h3>' + bId + '</h3>\n</div>' })
        });
        setButtonLoading(btn, false);
        showToast("New block component successfully created in blocks/ folder on GitHub!");
        bootstrap.Modal.getInstance(document.getElementById('addBlockModal')).hide();
        loadBlocks();
    } catch(e) {
        setButtonLoading(btn, false);
        showToast("Failed to create new block.", "danger");
    }
};

window.deleteBlock = async function(bId) {
    if(!confirm(`Are you sure you want to delete block "${bId}"?`)) return;
    const bulkModal = new bootstrap.Modal(document.getElementById('bulkProcessModal'));
    document.getElementById('bulkProcessTitle').innerText = "Deleting Block...";
    bulkModal.show();
    
    try {
        const res = await fetch('/api/blocks/delete', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ blockId: bId })
        });
        bulkModal.hide();
        if (res.ok) {
            showToast("Block successfully deleted from blocks/ and repeater/ folders!");
            loadBlocks();
        } else {
            showToast("Failed to delete block.", "danger");
        }
    } catch(e) {
        bulkModal.hide();
        showToast("Failed to delete block.", "danger");
    }
};

window.renameBlock = async function(oldId) {
    const newId = prompt(`Enter new ID/Name for block "${oldId}":`, oldId);
    if (!newId || newId.trim() === oldId) return;
    
    const cleanNewId = newId.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!cleanNewId) return showToast("Invalid block ID!", "warning");

    const bulkModal = new bootstrap.Modal(document.getElementById('bulkProcessModal'));
    document.getElementById('bulkProcessTitle').innerText = "Renaming Block...";
    bulkModal.show();

    try {
        const res = await fetch('/api/blocks/rename', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ oldId, newId: cleanNewId })
        });
        bulkModal.hide();
        
        if (res.ok) {
            showToast("Block name successfully changed on GitHub!");
            loadBlocks();
        } else {
            showToast("Failed to change block name.", "danger");
        }
    } catch(e) {
        bulkModal.hide();
        showToast("A network error occurred.", "danger");
    }
};

// ==========================================
// DYNAMIC BLOCK REPEATER DATA
// ==========================================
window.openDynamicBlockModal = async function(blockId) {
    document.getElementById('currentDynamicBlockId').value = blockId;
    document.getElementById('dynamicBlockModalTitle').innerHTML = `<i class="bi bi-list-nested me-2 text-success"></i>Edit Repeater Data: ${blockId}`;
    
    const container = document.getElementById('repeaterRowsContainer');
    if (container) container.innerHTML = '<div class="text-muted small fst-italic">Loading data...</div>';
    
    const alertBox = document.getElementById('repeaterAlert');
    if (alertBox) alertBox.classList.add('d-none');
    
    bootstrap.Modal.getOrCreateInstance(document.getElementById('dynamicBlockModal')).show();

    try {
        const res = await fetch('/api/block-data?id=' + encodeURIComponent(blockId));
        let items = []; 
        if (res.ok) {
            const txt = await res.text(); 
            if (txt) items = JSON.parse(txt);
        }
        renderRepeaterRows(items);
    } catch(e) {
        renderRepeaterRows([]);
    }
};

window.renderRepeaterRows = function(items) {
    const container = document.getElementById('repeaterRowsContainer');
    if (!container) return;
    container.innerHTML = "";
    
    if(!items || items.length === 0){
        container.innerHTML='<div class="text-muted small fst-italic p-3 bg-white border rounded">No repeater items yet.</div>';
        return;
    }
    
    items.forEach((item, index) => {
        container.innerHTML += `
        <div class="repeater-row wp-card p-3 bg-white border position-relative mb-3 rounded">
            <button type="button" class="btn-close position-absolute top-0 end-0 m-3" onclick="this.closest('.repeater-row').remove()"></button>
            <h6 class="fw-bold text-secondary small mb-3">Item #${index+1}</h6>
            <div class="row g-3">
                <div class="col-md-3"><label class="form-label small fw-semibold">Title</label><input type="text" class="form-control form-control-sm r-title" value="${item.title || ''}"></div>
                <div class="col-md-3"><label class="form-label small fw-semibold">Subtitle</label><input type="text" class="form-control form-control-sm r-subtitle" value="${item.subtitle || ''}"></div>
                <div class="col-md-3"><label class="form-label small fw-semibold">Link URL</label><input type="text" class="form-control form-control-sm r-url" value="${item.url || ''}"></div>
                <div class="col-md-3"><label class="form-label small fw-semibold">Background Color</label><input type="text" class="form-control form-control-sm r-color" value="${item.color || '#e6f4a3'}" placeholder="#e6f4a3"></div>
                <div class="col-md-12"><label class="form-label small fw-semibold">Image URL / HTML Icon / SVG Code</label><input type="text" class="form-control form-control-sm r-image" value="${item.image || ''}"></div>
                <div class="col-12"><label class="form-label small fw-semibold">Description</label><textarea class="form-control form-control-sm r-desc" rows="2">${item.description||''}</textarea></div>
            </div>
        </div>`;
    });
};

window.addRepeaterRow = function() {
    const container = document.getElementById('repeaterRowsContainer');
    if (!container) return;
    if(container.querySelector('.text-muted')) container.innerHTML = "";
    
    container.insertAdjacentHTML('beforeend', `
    <div class="repeater-row wp-card p-3 bg-white border position-relative mb-3 rounded">
        <button type="button" class="btn-close position-absolute top-0 end-0 m-3" onclick="this.closest('.repeater-row').remove()"></button>
        <h6 class="fw-bold text-secondary small mb-3">New Item</h6>
        <div class="row g-3">
            <div class="col-md-3"><label class="form-label small fw-semibold">Title</label><input type="text" class="form-control form-control-sm r-title"></div>
            <div class="col-md-3"><label class="form-label small fw-semibold">Subtitle</label><input type="text" class="form-control form-control-sm r-subtitle"></div>
            <div class="col-md-3"><label class="form-label small fw-semibold">Link URL</label><input type="text" class="form-control form-control-sm r-url"></div>
            <div class="col-md-3"><label class="form-label small fw-semibold">Background Color</label><input type="text" class="form-control form-control-sm r-color" value="#e6f4a3"></div>
            <div class="col-md-12"><label class="form-label small fw-semibold">Image URL / HTML Icon / SVG Code</label><input type="text" class="form-control form-control-sm r-image"></div>
            <div class="col-12"><label class="form-label small fw-semibold">Description</label><textarea class="form-control form-control-sm r-desc" rows="2"></textarea></div>
        </div>
    </div>`);
};

window.saveDynamicBlockData = async function() {
    const blockId = document.getElementById('currentDynamicBlockId').value;
    const rows = document.querySelectorAll('.repeater-row'); 
    let items = [];
    
    rows.forEach(row => {
        items.push({
            title: row.querySelector('.r-title').value.trim(),
            subtitle: row.querySelector('.r-subtitle').value.trim(),
            url: row.querySelector('.r-url').value.trim(),
            color: row.querySelector('.r-color').value.trim(),
            image: row.querySelector('.r-image').value.trim(),
            description: row.querySelector('.r-desc').value.trim()
        });
    });
    
    const alertBox = document.getElementById('repeaterAlert');
    if(alertBox) {
        alertBox.className = "alert alert-info py-1 px-3 mb-0 small";
        alertBox.innerText = "Saving data to repeater/ folder on GitHub...";
        alertBox.classList.remove('d-none');
    }
    
    try {
        const res = await fetch('/api/block-data', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({blockId, items})
        });
        
        if(res.ok) {
            if(alertBox) {
                alertBox.className = "alert alert-success py-1 px-3 mb-0 small";
                alertBox.innerText = "Repeater data successfully saved to repeater/ on GitHub!";
            }
            showToast("Repeater block data successfully saved to GitHub!");
            setTimeout(() => bootstrap.Modal.getInstance(document.getElementById('dynamicBlockModal')).hide(), 1000);
        } else {
            throw new Error();
        }
    } catch(e) {
        if(alertBox) {
            alertBox.className = "alert alert-danger py-1 px-3 mb-0 small";
            alertBox.innerText = "Failed to save!";
        }
        showToast("Failed to save block data!", "danger");
    }
};

// ==========================================
// CODEMIRROR OVERLAY EDITOR
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
        const res = await fetch('/api/kv?key=' + encodeURIComponent(key));
        if (res.ok) content = await res.text();
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

window.saveEditorDataDualStorage = async function() {
    const btn = document.getElementById('btnSaveEditor');
    setButtonLoading(btn, true, "Saving to GitHub...");
    const key = document.getElementById('currentEditKey').value;
    const content = window.currentCodeMirrorInstance ? window.currentCodeMirrorInstance.getValue() : document.getElementById('htmlEditor').value;
    
    try {
        let res;
        if (key.startsWith('block:')) {
            const blockId = key.replace('block:', '');
            res = await fetch('/api/blocks/save-html', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ blockId, html: content })
            });
        } else {
            res = await fetch('/api/kv', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ key, content })
            });
        }

        if(res.ok){
            setButtonLoading(btn, false);
            showToast("Block HTML successfully saved to blocks/ on GitHub!");
            setTimeout(() => {
                closeCustomEditor();
                loadBlocks();
            }, 1000);
        } else {
            throw new Error();
        }
    } catch(e) {
        setButtonLoading(btn, false);
        showToast("Failed to save block HTML changes.", "danger");
    }
};

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
// INIT ON PAGE LOAD
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    const defaultLang = localStorage.getItem('dashboard_lang') || 'en';
    changeLanguage(defaultLang);
    loadTopbarProfile();
    loadBlocks();
    updateVisitSiteLink();
    document.body.classList.add("tab-ready");
});