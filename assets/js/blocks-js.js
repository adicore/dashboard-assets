/**
 * assets/js/blocks-js.js
 * Frontend JavaScript untuk Management Library Block CMS
 * Terintegrasi dengan Cloudflare D1 (Metadata) & GitHub Repo (Physical Files)
 * Serta Memiliki Fitur Impor Central Store & Add New Local Block Manual
 */

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

function clientSideMinify(html) {
    if (!html) return "";
    return html
        .replace(/<!--[\s\S]*?-->/gis, (match) => {
            return (match.includes('LOOP') || match.includes('IF_HAS_CHILDREN') || match.includes('END_IF') || match.includes('META_INJECT') || match.includes('POST_DATA')) ? match : '';
        })
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();
}

function clientSideUnminify(htmlContent) {
    if (!htmlContent || typeof htmlContent !== 'string') return "";
    let formatted = '';
    let indent = '';
    let indentTab = '    '; 
    
    htmlContent = htmlContent.replace(/>\s+</g, '>\n<');
    let lines = htmlContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        if (line.match(/^<\/\w/)) {
            if (indent.length >= indentTab.length) {
                indent = indent.substring(indentTab.length);
            }
        }

        formatted += indent + line + '\n';

        if (line.match(/^<([a-zA-Z0-9\-]+)(?![\/:])(?:.|\s)*?>$/)) {
            let matchTag = line.match(/^<([^\s>]+)/);
            if (matchTag) {
                let tagName = matchTag[1].toLowerCase();
                const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'];
                if (!voidElements.includes(tagName) && !line.endsWith('/>')) {
                    indent += indentTab;
                }
            }
        }
    }
    return formatted.trim();
}

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
// BLOCK LIBRARY (CORE) - D1 & GITHUB INTEGRATED
// ==========================================
window.availableBlocksList = [];

window.loadBlocks = async function() {
    const container = document.getElementById('blocksContainer');
    if (!container) return;

    container.innerHTML = '<div class="col-12 text-center py-4 text-muted fst-italic"><span class="spinner-border spinner-border-sm me-2"></span>Loading block list from D1...</div>';

    try {
        const res = await fetch('/api/blocks/list');
        const blocks = await res.json();
        window.availableBlocksList = blocks;

        if (!blocks || blocks.length === 0) {
            container.innerHTML = '<div class="col-12 text-muted small p-4 bg-white border rounded text-center">No block components have been created yet. Click "Add New Block" or "Browse Central Catalog" to get started.</div>';
            return;
        }

        let finalHtml = `
<div class="col-12">
    <div class="d-flex justify-content-between align-items-center mb-3">
        <div class="input-group input-group-sm" style="max-width: 320px;">
            <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span>
            <input type="text" id="searchBlockInput" class="form-control border-start-0" placeholder="Filter blocks..." onkeyup="filterBlocksList()">
        </div>
        <span class="badge bg-secondary">${blocks.length} Blocks Available</span>
    </div>
    <div class="table-responsive bg-white rounded shadow-sm border border-light">
        <table class="table table-hover align-middle mb-0" id="blocksTable">
            <thead class="table-light">
                <tr>
                    <th scope="col" class="py-3 px-4">Block Name / ID</th>
                    <th scope="col" class="py-3">Type / Source</th>
                    <th scope="col" class="py-3">Shortcode</th>
                    <th scope="col" class="py-3 text-end px-4">Action</th>
                </tr>
            </thead>
            <tbody>
                `;

        blocks.forEach(b => {
            const bId = typeof b === 'string' ? b : b.id;
            const bName = (typeof b === 'object' && b.name) ? b.name : bId;
            const isCentral = (typeof b === 'object' && b.is_central === 1);

            finalHtml += `
                <tr class="block-row-item" data-block-id="${bId}">
                    <td class="px-4 py-3">
                        <div class="d-flex align-items-center">
                            <i class="bi bi-puzzle text-success me-3 fs-5"></i>
                            <div>
                                <h6 class="mb-0 fw-bold text-dark block-name">${bName}</h6>
                                <code class="small text-muted font-monospace">${bId}</code>
                            </div>
                        </div>
                    </td>
                    <td class="py-3">
                        ${isCentral ? 
                            '<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-cloud-check me-1"></i>Central Import</span>' : 
                            '<span class="badge bg-info-subtle text-info border border-info-subtle"><i class="bi bi-person-check me-1"></i>Custom Local</span>'
                        }
                    </td>
                    <td class="py-3">
                        <span class="badge bg-light text-dark border user-select-all" style="font-family: monospace; font-size: 0.85rem;">
                            {{BLOCK:${bId}}}
                        </span>
                    </td>
                    <td class="text-end px-4 py-3">
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="openEditor('block:${bId}', 'Block: ${bName}')" title="Edit HTML">
                                <i class="bi bi-code-slash me-1"></i> HTML
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="openDynamicBlockModal('${bId}')" title="Edit Repeater">
                                <i class="bi bi-list-nested me-1"></i> Repeater
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
        container.innerHTML = '<div class="col-12 text-danger small p-3 bg-white border rounded">Failed to load block list from D1.</div>';
    }
};

window.filterBlocksList = function() {
    const q = (document.getElementById('searchBlockInput')?.value || '').toLowerCase();
    const rows = document.querySelectorAll('.block-row-item');
    rows.forEach(row => {
        const bId = row.getAttribute('data-block-id') || '';
        if (bId.toLowerCase().includes(q)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
};

// ==========================================
// CENTRAL CATALOG STORE IMPORT
// ==========================================
window.openCentralCatalogModal = async function() {
    const catalogModalEl = document.getElementById('centralCatalogModal');
    if (!catalogModalEl) return;
    
    const modal = bootstrap.Modal.getOrCreateInstance(catalogModalEl);
    modal.show();

    const catalogGrid = document.getElementById('centralCatalogGrid');
    catalogGrid.innerHTML = '<div class="col-12 text-center py-5 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Connecting to Central Store Server...</div>';

    try {
        const res = await fetch('/api/central/blocks/catalog');
        if (!res.ok) throw new Error("Gagal terhubung ke Server Pusat");

        const catalog = await res.json();
        
        // Cek ID mana saja yang sudah diimpor
        const installedIds = (window.availableBlocksList || []).map(b => typeof b === 'string' ? b : b.id);

        if (!catalog || catalog.length === 0) {
            catalogGrid.innerHTML = '<div class="col-12 text-center py-4 text-muted">Belum ada komponen block yang dipublikasikan di Admin Pusat.</div>';
            return;
        }

        let html = '';
        catalog.forEach(item => {
            const isInstalled = installedIds.includes(item.id);

            html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card h-100 border shadow-sm rounded-3 overflow-hidden">
                    <div class="bg-light text-center py-4 border-bottom position-relative">
                        ${item.preview_img ? 
                            `<img src="${item.preview_img}" alt="${item.name}" class="img-fluid" style="max-height: 120px; object-fit: contain;">` : 
                            `<i class="bi bi-puzzle text-primary" style="font-size: 3rem;"></i>`
                        }
                        <span class="badge bg-dark position-absolute top-0 start-0 m-2">${item.category || 'General'}</span>
                    </div>
                    <div class="card-body">
                        <h6 class="fw-bold text-dark mb-1">${item.name || item.id}</h6>
                        <code class="small text-muted font-monospace d-block mb-2">${item.id}</code>
                        <p class="small text-secondary mb-0">${item.description || 'Master block modular siap pakai dari Admin Pusat.'}</p>
                    </div>
                    <div class="card-footer bg-white border-top-0 d-flex justify-content-between align-items-center pb-3">
                        ${isInstalled ? 
                            `<button class="btn btn-sm btn-success w-100" disabled><i class="bi bi-check-circle me-1"></i> Already Installed</button>` : 
                            `<button class="btn btn-sm btn-primary w-100" id="btnImportCentral-${item.id}" onclick="importCentralBlock('${item.id}')">
                                <i class="bi bi-cloud-download me-1"></i> Import Block
                            </button>`
                        }
                    </div>
                </div>
            </div>`;
        });

        catalogGrid.innerHTML = html;
    } catch (err) {
        catalogGrid.innerHTML = `<div class="col-12"><div class="alert alert-danger"><i class="bi bi-exclamation-triangle me-2"></i>${err.message}</div></div>`;
    }
};

window.importCentralBlock = async function(blockId) {
    const btn = document.getElementById(`btnImportCentral-${blockId}`);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Importing...';
    }

    try {
        const res = await fetch('/api/central/blocks/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blockId })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            showToast(`Block "${blockId}" successfully imported to D1 & GitHub!`);
            if (btn) {
                btn.className = 'btn btn-sm btn-success w-100';
                btn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Installed';
            }
            loadBlocks();
        } else {
            throw new Error(data.message || "Failed to import block.");
        }
    } catch (err) {
        showToast("Error importing block: " + err.message, "danger");
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-cloud-download me-1"></i> Import Block';
        }
    }
};

// ==========================================
// ADD NEW LOCAL CUSTOM BLOCK (MANUAL)
// ==========================================
window.createNewBlock = async function() {
    const btn = document.getElementById('btnSaveNewBlock');
    setButtonLoading(btn, true, "Creating Block...");
    const inpId = document.getElementById('inpNewBlockId');
    const inpName = document.getElementById('inpNewBlockName');
    const inpCat = document.getElementById('inpNewBlockCategory');
    
    const bId = inpId ? inpId.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') : '';
    const bName = inpName ? inpName.value.trim() : bId;
    const bCat = inpCat ? inpCat.value : 'general';

    if (!bId) {
        setButtonLoading(btn, false);
        return showToast("Unique Block ID is required!", "warning");
    }

    const initialHtml = clientSideMinify(`<div class="container py-4">\n    <h3>${bName}</h3>\n</div>`);

    try {
        const res = await fetch('/api/blocks/create', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ 
                blockId: bId, 
                name: bName, 
                category: bCat, 
                html: initialHtml 
            })
        });

        setButtonLoading(btn, false);
        if (res.ok) {
            showToast("Custom block successfully created in D1 & GitHub!");
            const modalEl = document.getElementById('addBlockModal');
            if (modalEl) {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }
            if (inpId) inpId.value = '';
            if (inpName) inpName.value = '';
            loadBlocks();
        } else {
            showToast("Failed to create new block.", "danger");
        }
    } catch(e) {
        setButtonLoading(btn, false);
        showToast("Failed to create new block.", "danger");
    }
};

window.deleteBlock = async function(bId) {
    if (!confirm(`Are you sure you want to delete block "${bId}"? This will delete record from D1 and GitHub files.`)) return;
    const bulkModalEl = document.getElementById('bulkProcessModal');
    let bulkModal = null;
    if (bulkModalEl) {
        bulkModal = new bootstrap.Modal(bulkModalEl);
        const titleEl = document.getElementById('bulkProcessTitle');
        if (titleEl) titleEl.innerText = "Deleting Block from D1 & GitHub...";
        bulkModal.show();
    }
    
    try {
        const res = await fetch('/api/blocks/delete', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ blockId: bId })
        });
        if (bulkModal) bulkModal.hide();
        if (res.ok) {
            showToast("Block successfully deleted from D1 and GitHub!");
            loadBlocks();
        } else {
            showToast("Failed to delete block.", "danger");
        }
    } catch(e) {
        if (bulkModal) bulkModal.hide();
        showToast("Failed to delete block.", "danger");
    }
};

window.renameBlock = async function(oldId) {
    const newId = prompt(`Enter new ID for block "${oldId}":`, oldId);
    if (!newId || newId.trim() === oldId) return;
    
    const cleanNewId = newId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!cleanNewId) return showToast("Invalid block ID!", "warning");

    const bulkModalEl = document.getElementById('bulkProcessModal');
    let bulkModal = null;
    if (bulkModalEl) {
        bulkModal = new bootstrap.Modal(bulkModalEl);
        const titleEl = document.getElementById('bulkProcessTitle');
        if (titleEl) titleEl.innerText = "Renaming Block on D1 & GitHub...";
        bulkModal.show();
    }

    try {
        const res = await fetch('/api/blocks/rename', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ oldId, newId: cleanNewId })
        });
        if (bulkModal) bulkModal.hide();
        
        if (res.ok) {
            showToast("Block name successfully updated on D1 and GitHub!");
            loadBlocks();
        } else {
            showToast("Failed to rename block.", "danger");
        }
    } catch(e) {
        if (bulkModal) bulkModal.hide();
        showToast("A network error occurred.", "danger");
    }
};

// ==========================================
// DYNAMIC BLOCK REPEATER DATA
// ==========================================
window.openDynamicBlockModal = async function(blockId) {
    const blockIdEl = document.getElementById('currentDynamicBlockId');
    if (blockIdEl) blockIdEl.value = blockId;
    const titleEl = document.getElementById('dynamicBlockModalTitle');
    if (titleEl) titleEl.innerHTML = `<i class="bi bi-list-nested me-2 text-success"></i>Edit Repeater Data: ${blockId}`;
    
    const container = document.getElementById('repeaterRowsContainer');
    if (container) container.innerHTML = '<div class="text-muted small fst-italic p-3"><span class="spinner-border spinner-border-sm me-2"></span>Loading repeater data...</div>';
    
    const alertBox = document.getElementById('repeaterAlert');
    if (alertBox) alertBox.classList.add('d-none');
    
    const modalEl = document.getElementById('dynamicBlockModal');
    if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();

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
        container.innerHTML = '<div class="text-muted small fst-italic p-3 bg-white border rounded">No repeater items yet. Click "Add New Item Row" to create one.</div>';
        return;
    }
    
    items.forEach((item, index) => {
        container.innerHTML += `
        <div class="repeater-row wp-card p-3 bg-white border position-relative mb-3 rounded shadow-sm">
            <button type="button" class="btn-close position-absolute top-0 end-0 m-3" onclick="this.closest('.repeater-row').remove()"></button>
            <h6 class="fw-bold text-secondary small mb-3"><i class="bi bi-layers me-1 text-primary"></i> Item #${index+1}</h6>
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
    
    const count = container.querySelectorAll('.repeater-row').length + 1;
    container.insertAdjacentHTML('beforeend', `
    <div class="repeater-row wp-card p-3 bg-white border position-relative mb-3 rounded shadow-sm">
        <button type="button" class="btn-close position-absolute top-0 end-0 m-3" onclick="this.closest('.repeater-row').remove()"></button>
        <h6 class="fw-bold text-secondary small mb-3"><i class="bi bi-layers me-1 text-primary"></i> Item #${count}</h6>
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
    const blockIdEl = document.getElementById('currentDynamicBlockId');
    const blockId = blockIdEl ? blockIdEl.value : '';
    const rows = document.querySelectorAll('.repeater-row'); 
    let items = [];
    
    rows.forEach(row => {
        const titleInp = row.querySelector('.r-title');
        const subInp = row.querySelector('.r-subtitle');
        const urlInp = row.querySelector('.r-url');
        const colInp = row.querySelector('.r-color');
        const imgInp = row.querySelector('.r-image');
        const descInp = row.querySelector('.r-desc');

        items.push({
            title: titleInp ? titleInp.value.trim() : '',
            subtitle: subInp ? subInp.value.trim() : '',
            url: urlInp ? urlInp.value.trim() : '',
            color: colInp ? colInp.value.trim() : '',
            image: imgInp ? imgInp.value.trim() : '',
            description: descInp ? descInp.value.trim() : ''
        });
    });
    
    const alertBox = document.getElementById('repeaterAlert');
    if(alertBox) {
        alertBox.className = "alert alert-info py-1 px-3 mb-0 small";
        alertBox.innerText = "Saving repeater JSON to GitHub and updating D1...";
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
                alertBox.innerText = "Repeater data saved!";
            }
            showToast("Repeater block data successfully saved to GitHub!");
            setTimeout(() => {
                const modalEl = document.getElementById('dynamicBlockModal');
                if (modalEl) {
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                }
            }, 1000);
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
    const editKeyEl = document.getElementById('currentEditKey');
    if (editKeyEl) editKeyEl.value = key;
    const isGhEl = document.getElementById('currentIsGitHubFile');
    if (isGhEl) isGhEl.value = "false";
    const overlayTitleEl = document.getElementById('editorOverlayTitle');
    if (overlayTitleEl) overlayTitleEl.innerHTML = `Edit: ${title}`;
    
    let mode = 'htmlmixed';
    if (key.includes(':css') || key.endsWith('.css')) mode = 'css';
    if (key.includes(':js') || key.endsWith('.js')) mode = 'javascript';
    if (key.endsWith('.json')) mode = 'application/json';
    
    const overlay = document.getElementById('customEditorOverlay');
    if (overlay) overlay.style.display = 'flex';
    
    const ed = document.getElementById('htmlEditor');
    if (ed) ed.value = "Loading data from server...";
    
    let content = "Failed to load content.";
    const blockId = key.replace('block:', '');

    try {
        const res = await fetch('/api/blocks/detail?id=' + encodeURIComponent(blockId));
        if (res.ok) {
            const data = await res.json();
            content = data.html || "";
        }
    } catch(e) {
        content = "Failed to load content.";
    }
    
    if (mode === 'htmlmixed' && content && content !== "Failed to load content.") {
        content = clientSideUnminify(content);
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
    const editKeyEl = document.getElementById('currentEditKey');
    const key = editKeyEl ? editKeyEl.value : '';
    const rawContent = window.currentCodeMirrorInstance ? window.currentCodeMirrorInstance.getValue() : (document.getElementById('htmlEditor')?.value || '');
    
    const minifiedContent = key.startsWith('block:') ? clientSideMinify(rawContent) : rawContent;

    try {
        let res;
        if (key.startsWith('block:')) {
            const blockId = key.replace('block:', '');
            res = await fetch('/api/blocks/save-html', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ blockId, html: minifiedContent })
            });
        } else {
            res = await fetch('/api/kv', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ key, content: minifiedContent })
            });
        }

        if(res.ok){
            setButtonLoading(btn, false);
            showToast("Block HTML successfully minified and saved to GitHub!");
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