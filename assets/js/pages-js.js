// ==========================================
// 1. GLOBAL UTILITIES & TRANSLATIONS
// ==========================================
const translations = {
    id: {
        visit_site: "Kunjungi Situs",
        purge_cache: "Purge Cache",
        pages_title: "Daftar Halaman Statis",
        pages_desc: "Kelola semua halaman web statis utama Anda di sini.",
        btn_addpage: "Tambah Halaman Baru",
        th_pagetitle: "Judul Halaman",
        th_filename: "Nama Berkas File",
        th_status: "Status",
        th_action: "Aksi",
        modal_addpage_title: "Tambah Halaman Statis Baru",
        label_pagename: "Nama Halaman",
        label_pageslug: "Nama File URL (Slug)",
        btn_cancel: "Batal",
        btn_savepage: "Simpan Halaman",
        btn_close: "Tutup",
        btn_save: "Simpan"
    },
    en: {
        visit_site: "Visit Site",
        purge_cache: "Purge Cache",
        pages_title: "Static Pages List",
        pages_desc: "Manage all static web pages here.",
        btn_addpage: "Add New Page",
        th_pagetitle: "Page Title",
        th_filename: "File Name",
        th_status: "Status",
        th_action: "Action",
        modal_addpage_title: "Add New Static Page",
        label_pagename: "Page Name",
        label_pageslug: "File URL Name (Slug)",
        btn_cancel: "Cancel",
        btn_savepage: "Save Page",
        btn_close: "Close",
        btn_save: "Save"
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
    let iconClass = type === 'success' ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-warning';
    if (type === 'danger') iconClass = 'bi-x-circle-fill text-danger';
    
    toastBody.innerHTML = `<i class="bi ${iconClass} me-2"></i> ${message}`;
    toastEl.className = `toast align-items-center text-white ${type === 'danger' ? 'bg-danger' : 'bg-dark'} border-0 shadow-lg`;
    
    new bootstrap.Toast(toastEl, { delay: 3000 }).show();
}

async function setButtonLoading(btn, isLoading, loadingText = 'Saving...') {
    if (!btn) return;
    if (isLoading) {
        btn.dataset.originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${loadingText}`;
    } else {
        btn.innerHTML = `<i class="bi bi-check2 me-1"></i> Success!`;
        btn.classList.add('btn-success');
        btn.classList.remove('wp-btn-primary', 'btn-outline-primary', 'btn-primary', 'wp-btn-secondary');
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
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();
}

function generateUniqueFilename(title, existingPages, currentEditId) {
    let slugBase = (title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!slugBase) slugBase = 'page';
    let filename = slugBase + '.html';
    
    let counter = 1;
    let exists = existingPages.some(p => p.filename === filename && p.id !== currentEditId);
    while (exists) {
        counter++;
        filename = `${slugBase}-${counter}.html`;
        exists = existingPages.some(p => p.filename === filename && p.id !== currentEditId);
    }
    return filename;
}

let currentPageStorageProvider = 'github';

async function loadPageStoragePreference() {
    try {
        const res = await fetch('/api/kv?key=global:settings');
        if (res.ok) {
            const txt = await res.text();
            if (txt) {
                const settings = JSON.parse(txt);
                currentPageStorageProvider = settings.storage_provider_pages || settings.default_storage || 'github';
            }
        }
    } catch(e) {}
}

async function compressAndConvertImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = async () => {
                try {
                    const { encode } = await import('https://esm.sh/@jsquash/avif');

                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    const maxWidth = 900; 
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const imageData = ctx.getImageData(0, 0, width, height);
                    const avifBuffer = await encode(imageData, { quality: 60 });
                    const blob = new Blob([avifBuffer], { type: 'image/avif' });

                    if (blob.size >= file.size) {
                        const readerOriginal = new FileReader();
                        readerOriginal.onloadend = () => {
                            const base64Data = readerOriginal.result.split(',')[1];
                            resolve({ filename: file.name, content: base64Data });
                        };
                        readerOriginal.readAsDataURL(file);
                        return;
                    }

                    const readerBase64 = new FileReader();
                    readerBase64.onloadend = () => {
                        const base64Data = readerBase64.result.split(',')[1];
                        const originalName = file.name.includes('.') ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;
                        resolve({ filename: `${originalName}.avif`, content: base64Data });
                    };
                    readerBase64.readAsDataURL(blob);

                } catch (error) {
                    const readerFallback = new FileReader();
                    readerFallback.onloadend = () => {
                        resolve({ filename: file.name, content: readerFallback.result.split(',')[1] });
                    };
                    readerFallback.readAsDataURL(file);
                }
            };
            img.onerror = (err) => reject(err);
            img.src = e.target.result;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
}

function toggleSidebar() {
    if (window.innerWidth > 768) document.body.classList.toggle('sidebar-collapsed');
    else document.body.classList.toggle('sidebar-mobile-open');
}

async function purgeCloudflareCache() {
    if (!confirm("Clear all Cloudflare cache?")) return;
    try {
        const res = await fetch('/api/cloudflare/purge-cache', { method: 'POST' });
        if (res.ok) showToast("Cloudflare cache successfully cleared!");
        else showToast("Failed to clear cache.", "danger");
    } catch (err) {
        showToast("Network error occurred.", "danger");
    }
}

window.openMyProfileTab = function() { window.location.href = '/users#profile'; };

async function initUserProfileTopbar() {
    try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
            const user = await res.json();
            if (user.name && document.getElementById('topbarUsername')) document.getElementById('topbarUsername').innerText = user.name;
            if (user.avatar && user.avatar.trim() !== '' && document.getElementById('topbarUserAvatar')) document.getElementById('topbarUserAvatar').src = user.avatar;
            if (user.role) document.body.setAttribute('data-role', user.role);
            if (user.email) document.body.setAttribute('data-email', user.email);
            return user;
        }
    } catch(e) {}
    return null;
}

function setupOgImageUploads() {
    document.querySelectorAll('input[type="text"], input:not([type])').forEach(input => {
        if (input.dataset.ogUploadInitialized || input.id === 'apiBlogId' || input.id === 'apiKeyBlogger') return;
        const container = input.closest('.mb-3, .mb-4, .form-group, div');
        if (!container) return;
        
        const textContent = container.textContent || '';
        const isOgField = textContent.includes('OG Image') || textContent.includes('Fallback Default OG Image') || 
                          (input.id && input.id.toLowerCase().includes('og')) || (input.name && input.name.toLowerCase().includes('og'));
                          
        if (isOgField && !input.parentNode.classList.contains('input-group')) {
            input.dataset.ogUploadInitialized = "true";
            const parent = input.parentNode;
            const inputGroup = document.createElement('div');
            inputGroup.className = 'input-group';
            parent.replaceChild(inputGroup, input);
            inputGroup.appendChild(input);
            
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-outline-secondary';
            btn.innerHTML = `<i class="bi bi-cloud-upload me-1"></i> Upload Image`;
            inputGroup.appendChild(btn);
            
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*, image/avif, .avif';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
            
            btn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = async function(uploadEvent) {
                    btn.disabled = true;
                    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Uploading...';
                    try {
                        const compressed = await compressAndConvertImage(file);
                        const res = await fetch('/api/github/upload-image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                filename: Date.now() + '-' + compressed.filename, 
                                content: compressed.content,
                                storage_provider: currentPageStorageProvider
                            })
                        });
                        if (res.ok) {
                            const data = await res.json();
                            input.value = data.url;
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            showToast(`Image successfully uploaded to ${currentPageStorageProvider === 'imgbb' ? 'ImgBB' : 'GitHub'}!`);
                        } else {
                            showToast('Upload failed: ' + await res.text(), 'danger');
                        }
                    } catch (err) { 
                        showToast('An error occurred: ' + err.message, 'danger'); 
                    } finally {
                        btn.disabled = false;
                        btn.innerHTML = `<i class="bi bi-cloud-upload me-1"></i> Upload Image`;
                        fileInput.value = '';
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    });
}
setInterval(setupOgImageUploads, 1000);

function ensureAddToAnyScript() {
    if (!document.getElementById('a2a_script')) {
        const script = document.createElement('script');
        script.id = 'a2a_script';
        script.src = 'https://static.addtoany.com/menu/page.js';
        script.async = true;
        document.body.appendChild(script);
    } else if (window.a2a && typeof window.a2a.init_all === 'function') {
        window.a2a.init_all();
    }
}

window.sharePageUrl = function(url, title, event) {
    if (event) event.preventDefault();
    if (window.a2a && typeof window.a2a.showMenu === 'function') {
        window.a2a.showMenu({
            url: url,
            title: title,
            target: event ? event.currentTarget : null
        });
    }
};

// ==========================================
// 2. FILTERING & SORTING LOGIC FOR PAGES
// ==========================================
window.allPagesData = [];
window.currentPageStatus = 'all';
window.currentSortColumn = 'updated_at';
window.currentSortOrder = 'desc';
window.searchPageQuery = '';
window.mainDomain = window.location.origin;

async function loadStaticPages() {
    const tbody = document.getElementById('staticPagesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted fst-italic">Loading pages list...</td></tr>';
    
    try {
        const resSettings = await fetch('/api/kv?key=global:settings');
        if (resSettings.ok) {
            const txt = await resSettings.text();
            if (txt) {
                const settingsData = JSON.parse(txt);
                if (settingsData.site_url) window.mainDomain = settingsData.site_url.trim().replace(/\/+$/, '');
            }
        }
    } catch(e) {}

    try {
        const res = await fetch('/api/pages/list');
        if (res.ok) {
            window.allPagesData = await res.json();
            applyPageFiltersAndRender();
        } else { throw new Error(); }
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load pages.</td></tr>';
    }
}

window.filterPagesByStatus = function(status, e) {
    if(e) {
        document.querySelectorAll('#pageStatusTabs button').forEach(btn => btn.classList.remove('active', 'text-dark'));
        document.querySelectorAll('#pageStatusTabs button').forEach(btn => btn.classList.add('text-muted'));
        e.currentTarget.classList.remove('text-muted');
        e.currentTarget.classList.add('active', 'text-dark');
    }
    window.currentPageStatus = status;
    document.querySelectorAll('.page-checkbox').forEach(cb => cb.checked = false);
    if(document.getElementById('selectAllPages')) document.getElementById('selectAllPages').checked = false;
    updateBulkPageActionBar();
    applyPageFiltersAndRender();
};

window.filterPagesByDropdownStatus = function(status, label) {
    window.currentPageStatus = status;
    applyPageFiltersAndRender();
};

window.filterPagesAjax = function(query) {
    window.searchPageQuery = query;
    applyPageFiltersAndRender();
};

window.changePageSort = function(sortType, label, e) {
    if(e) e.preventDefault();
    document.getElementById('dropdownPageDateTypeBtn').innerHTML = label;
    window.currentSortColumn = sortType === 'created' ? 'created_at' : 'updated_at';
    window.currentSortOrder = 'desc';
    applyPageFiltersAndRender();
};

window.sortPagesByColumn = function(column) {
    if (window.currentSortColumn === column) window.currentSortOrder = window.currentSortOrder === 'asc' ? 'desc' : 'asc';
    else { window.currentSortColumn = column; window.currentSortOrder = 'asc'; }
    applyPageFiltersAndRender();
};

window.toggleSelectAllPages = function(el) {
    const checkboxes = document.querySelectorAll('.page-checkbox');
    checkboxes.forEach(cb => cb.checked = el.checked);
    updateBulkPageActionBar();
};

function updateBulkPageActionBar() {
    const checked = document.querySelectorAll('.page-checkbox:checked').length;
    const isTrashTab = window.currentPageStatus === 'trash';
    
    const barAll = document.getElementById('bulkPageActionBar');
    const barTrash = document.getElementById('bulkTrashActionBar');

    if (isTrashTab) {
        if (barAll) { barAll.classList.add('d-none'); barAll.classList.remove('d-flex'); }
        if (document.getElementById('selectedTrashCount')) document.getElementById('selectedTrashCount').innerText = checked;
        if (barTrash) {
            if (checked > 0) { barTrash.classList.remove('d-none'); barTrash.classList.add('d-flex'); }
            else { barTrash.classList.add('d-none'); barTrash.classList.remove('d-flex'); document.getElementById('selectAllPages').checked = false; }
        }
    } else {
        if (barTrash) { barTrash.classList.add('d-none'); barTrash.classList.remove('d-flex'); }
        if (document.getElementById('selectedPageCount')) document.getElementById('selectedPageCount').innerText = checked;
        if (barAll) {
            if (checked > 0) { barAll.classList.remove('d-none'); barAll.classList.add('d-flex'); }
            else { barAll.classList.add('d-none'); barAll.classList.remove('d-flex'); document.getElementById('selectAllPages').checked = false; }
        }
    }
}

function applyPageFiltersAndRender() {
    let data = [...window.allPagesData];

    if (window.currentPageStatus !== 'all') {
        if (window.currentPageStatus === 'trash') data = data.filter(p => p.status === 'trash');
        else data = data.filter(p => (p.status || 'draft') === window.currentPageStatus);
    } else {
        data = data.filter(p => p.status !== 'trash');
    }

    if (window.searchPageQuery) {
        const q = window.searchPageQuery.toLowerCase();
        data = data.filter(p => (p.name && p.name.toLowerCase().includes(q)) || (p.filename && p.filename.toLowerCase().includes(q)));
    }

    data.sort((a, b) => {
        let valA = a[window.currentSortColumn]; let valB = b[window.currentSortColumn];
        if (window.currentSortColumn === 'updated_at' || window.currentSortColumn === 'created_at') {
            valA = new Date(valA || 0).getTime(); valB = new Date(valB || 0).getTime();
        } else {
            valA = (valA || '').toString().toLowerCase(); valB = (valB || '').toString().toLowerCase();
        }
        if (valA < valB) return window.currentSortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return window.currentSortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const allCount = window.allPagesData.filter(p => p.status !== 'trash').length;
    const trashCount = window.allPagesData.filter(p => p.status === 'trash').length;
    if(document.getElementById('countAllPages')) document.getElementById('countAllPages').innerText = allCount;
    if(document.getElementById('countTrashPages')) document.getElementById('countTrashPages').innerText = trashCount;

    renderPagesTableHtml(data);
}

function renderPagesTableHtml(pages) {
    const tbody = document.getElementById('staticPagesTableBody');
    if (!tbody) return;
    
    const userRole = (document.body.getAttribute('data-role') || 'administrator').toLowerCase();
    const userEmail = document.body.getAttribute('data-email') || '';

    tbody.innerHTML = '';
    if (!pages.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No static pages found based on current filter.</td></tr>'; return; }

    pages.forEach(p => {
        const isOwner = (p.author_email || '') === userEmail;
        const isDefaultPage = ['index'].includes(p.id);
        const pageStatus = p.status || 'draft';
        let statusBadge = '';
        if (pageStatus === 'published') statusBadge = '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Published</span>';
        else if (pageStatus === 'trash') statusBadge = '<span class="badge bg-danger"><i class="bi bi-trash me-1"></i>Trash</span>';
        else statusBadge = '<span class="badge bg-warning text-dark"><i class="bi bi-clock me-1"></i>Draft</span>';

        const safeName = (p.name || '').replace(/'/g, "\\'");
        const canDelete = (userRole === 'administrator' && !isDefaultPage) || (isOwner && !isDefaultPage);
        const pubDate = p.updated_at ? new Date(p.updated_at).toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'}) : '-';
        const fullPageUrl = `${window.mainDomain}/${p.filename}`;

        let actionButtonsHtml = '';
        if (pageStatus === 'trash') {
            actionButtonsHtml = `
                <div class="d-flex justify-content-end align-items-center gap-3">
                    <button type="button" class="btn btn-link text-warning p-0 border-0" onclick="performPageAction('${p.id}', 'draft');" title="Restore to Draft">
                        <i class="bi bi-arrow-counterclockwise fs-6"></i>
                    </button>
                    <button type="button" class="btn btn-link text-success p-0 border-0" onclick="performPageAction('${p.id}', 'publish');" title="Restore to Published">
                        <i class="bi bi-cloud-upload fs-6"></i>
                    </button>
                    ${canDelete ? `
                    <button type="button" class="btn btn-link text-danger p-0 border-0" onclick="performPageAction('${p.id}', 'delete');" title="Delete Permanently">
                        <i class="bi bi-trash fs-6"></i>
                    </button>` : ''}
                </div>
            `;
        } else {
            actionButtonsHtml = `
                <div class="d-flex justify-content-end align-items-center gap-3">
                    <a href="${fullPageUrl}" target="_blank" class="text-secondary p-0" title="View Page">
                        <i class="bi bi-eye fs-6"></i>
                    </a>
                    <a href="https://www.addtoany.com/share" class="a2a_dd text-primary p-0 text-decoration-none" data-a2a-url="${fullPageUrl}" data-a2a-title="${safeName}" title="Share via AddToAny">
                        <i class="bi bi-share fs-6"></i>
                    </a>
                    <button type="button" class="btn btn-link text-primary p-0 border-0" onclick="openPageManager('${p.id}', '${safeName}', '${p.filename}');" title="Edit Page Builder">
                        <i class="bi bi-pencil-square fs-6"></i>
                    </button>
                    ${canDelete ? `
                    <button type="button" class="btn btn-link text-danger p-0 border-0" onclick="performPageAction('${p.id}', 'trash');" title="Move to Trash">
                        <i class="bi bi-trash fs-6"></i>
                    </button>` : ''}
                </div>
            `;
        }

        tbody.innerHTML += `
        <tr>
            <td class="ps-3"><input type="checkbox" class="form-check-input page-checkbox" value="${p.id}" data-filename="${p.filename}" onchange="updateBulkPageActionBar()"></td>
            <td class="fw-bold text-dark">
                <div class="d-flex align-items-center">
                    <i class="bi bi-file-earmark-text text-primary fs-5 me-2"></i>
                    <div>
                        <a href="#" onclick="openPageManager('${p.id}', '${safeName}', '${p.filename}'); return false;" class="text-decoration-none text-dark">${p.name}</a>
                        ${isDefaultPage ? '<span class="badge bg-primary ms-1" style="font-size:10px">System</span>' : ''}
                    </div>
                </div>
            </td>
            <td><a href="${fullPageUrl}" target="_blank" class="text-primary small text-decoration-none"><i class="bi bi-link-45deg"></i> /${p.filename}</a></td>
            <td>${statusBadge}</td>
            <td class="text-muted small">${pubDate}</td>
            <td class="text-end pe-3">
                ${actionButtonsHtml}
            </td>
        </tr>`;
    });
    setTimeout(ensureAddToAnyScript, 100);
}

// -------------------------------------------------------------
// GITHUB DELETE PROMPT FUNCTION
// -------------------------------------------------------------
window.showGithubDeletePrompt = function(deletedFilesArray) {
    if(!deletedFilesArray || deletedFilesArray.length === 0) return;
    
    const listContainer = document.getElementById('githubDeleteFilesList');
    if(listContainer) {
        listContainer.innerHTML = deletedFilesArray.join('<br>');
    }
    
    const modalEl = document.getElementById('githubDeletePromptModal');
    if (!modalEl) return;
    const bsModal = new bootstrap.Modal(modalEl);
    const btnConfirm = document.getElementById('btnConfirmGithubDelete');
    if (!btnConfirm) return;
    
    const newBtn = btnConfirm.cloneNode(true);
    btnConfirm.parentNode.replaceChild(newBtn, btnConfirm);
    
    newBtn.addEventListener('click', async () => {
        setButtonLoading(newBtn, true, "Deleting...");
        try {
            for(let file of deletedFilesArray) {
                await fetch('/api/github/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: file })
                });
            }
            
            showToast("Pages successfully deleted from GitHub!", "success");
            bsModal.hide();
            
            document.querySelectorAll('.sync-pending-indicator, #syncPendingDot, [data-sync-indicator]').forEach(el => el.classList.add('d-none'));
            localStorage.removeItem('sync_pending');
            
            setTimeout(() => { window.location.reload(); }, 1200);
        } catch(e) {
            showToast("An error occurred while contacting GitHub.", "danger");
        } finally {
            setButtonLoading(newBtn, false);
        }
    });
    
    bsModal.show();
};

// -------------------------------------------------------------
// BULK ACTION EXECUTION (ALL TAB)
// -------------------------------------------------------------
window.executePageBulkAction = async function() {
    const action = document.getElementById('bulkPageActionSelect').value;
    const checkboxes = document.querySelectorAll('.page-checkbox:checked');
    if (!action || checkboxes.length === 0) return;

    if (action === 'trash' && !confirm("Are you sure you want to move selected pages to trash?")) return;
    
    const btnExecute = document.getElementById('btnExecutePageBulkAction');
    setButtonLoading(btnExecute, true, "Processing...");

    const selectedIds = Array.from(checkboxes).map(cb => cb.value);

    try {
        const res = await fetch('/api/pages/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action, ids: selectedIds })
        });

        if (res.ok) {
            document.querySelectorAll('.sync-pending-indicator, #syncPendingDot, [data-sync-indicator]').forEach(el => el.classList.remove('d-none'));
            localStorage.setItem('sync_pending', 'true');

            showToast(`The '${action}' bulk action was successfully executed! Click Sync & Deploy in navbar to publish to GitHub.`);
            await loadStaticPages(); 
            updateBulkPageActionBar();

            setTimeout(() => { window.location.reload(); }, 1500);
        } else {
            const errText = await res.text();
            showToast("Failed to execute bulk action: " + errText, "danger");
        }
    } catch(e) {
        showToast("Network error during bulk action.", "danger");
    } finally {
        setButtonLoading(btnExecute, false);
    }
};

// -------------------------------------------------------------
// BULK ACTION EXECUTION (TRASH TAB)
// -------------------------------------------------------------
window.executeTrashBulkAction = async function() {
    const action = document.getElementById('bulkTrashActionSelect').value;
    const checkboxes = document.querySelectorAll('.page-checkbox:checked');
    if (!action || checkboxes.length === 0) return;

    if (action === 'delete' && !confirm("Are you sure you want to permanently delete selected pages?")) return;
    
    const btnExecute = document.getElementById('btnExecuteTrashBulkAction');
    setButtonLoading(btnExecute, true, "Processing...");

    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    let deletedFilesToSync = [];

    try {
        const res = await fetch('/api/pages/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action, ids: selectedIds })
        });

        if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (data.require_sync && data.deleted_files) {
                deletedFilesToSync = data.deleted_files;
            }

            document.querySelectorAll('.sync-pending-indicator, #syncPendingDot, [data-sync-indicator]').forEach(el => el.classList.remove('d-none'));
            localStorage.setItem('sync_pending', 'true');

            if (action === 'publish') {
                showToast("Page successfully restored to Published status! Click Sync & Deploy in navbar to publish to GitHub.");
            } else {
                showToast(`Trash bulk action '${action}' successfully executed!`);
            }

            await loadStaticPages(); 
            updateBulkPageActionBar();

            if (action === 'delete' && deletedFilesToSync.length > 0) {
                showGithubDeletePrompt(deletedFilesToSync);
            } else {
                setTimeout(() => { window.location.reload(); }, 1500);
            }
        } else {
            const errText = await res.text();
            showToast("Failed to execute trash bulk action: " + errText, "danger");
        }
    } catch(e) {
        showToast("Network error during trash bulk action.", "danger");
    } finally {
        setButtonLoading(btnExecute, false);
    }
};

// -------------------------------------------------------------
// INDIVIDUAL PAGE ACTIONS FUNCTION (PUBLISH, DRAFT, TRASH, DELETE)
// -------------------------------------------------------------
window.performPageAction = async function(pageId, action) {
    if (action === 'delete' && !confirm("Permanently delete this page?")) return;
    if (action === 'trash' && !confirm("Move this page to trash?")) return;

    let deletedFilesToSync = [];

    try {
        const res = await fetch('/api/pages/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action, ids: [pageId] })
        });

        if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (data.require_sync && data.deleted_files) {
                deletedFilesToSync = data.deleted_files;
            }

            document.querySelectorAll('.sync-pending-indicator, #syncPendingDot, [data-sync-indicator]').forEach(el => el.classList.remove('d-none'));
            localStorage.setItem('sync_pending', 'true');

            if (action === 'publish') {
                showToast("Page successfully restored to Published! Click Sync & Deploy in navbar to publish to GitHub.");
            } else {
                showToast(`Page action '${action}' successfully executed!`);
            }

            await loadStaticPages();

            if (action === 'delete' && deletedFilesToSync.length > 0) {
                showGithubDeletePrompt(deletedFilesToSync);
            } else {
                setTimeout(() => { window.location.reload(); }, 1500);
            }
        } else {
            showToast("Failed to execute page action.", "danger");
        }
    } catch(e) {
        showToast("Error executing page action.", "danger");
    }
};

window.deleteStaticPage = async function(pageId, fileName) {
    await performPageAction(pageId, 'trash');
};

window.currentPageId = '';
window.currentFilename = '';
window.availableBlocksList = []; 
window._currentPageCss = '';
window._currentPageJs = '';

window.openNewStaticPageEditor = async function() {
    const timestamp = Date.now();
    const pageId = 'page_' + timestamp;
    const defaultName = 'New Untitled Page';
    const defaultFilename = 'page-' + timestamp + '.html';

    try {
        const res = await fetch('/api/pages/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: pageId, name: defaultName, filename: defaultFilename, status: 'draft', mode: 'tinymce' })
        });
        
        if (!res.ok) throw new Error(await res.text());

        await loadStaticPages();
        
        document.querySelectorAll('.sync-pending-indicator, #syncPendingDot, [data-sync-indicator]').forEach(el => el.classList.remove('d-none'));
        localStorage.setItem('sync_pending', 'true');

        openPageManager(pageId, defaultName, defaultFilename);
    } catch (e) {
        showToast("Failed to create new page: " + e.message, "danger");
    }
};

// =============================================================
// OPEN PAGE MANAGER (RETRIEVAL METADATA & KONTEN LANGSUNG DARI D1/GITHUB)
// =============================================================
window.openPageManager = async function(pageId, pageName, fileName, forcedMode = null) {
    if (window.tinymce && tinymce.get('pageTinyMceArea')) {
        tinymce.get('pageTinyMceArea').remove();
    }

    window.currentPageId = pageId;
    window.currentFilename = fileName;

    const newUrl = `${window.location.pathname}?edit=${pageId}`;
    window.history.pushState({ pageId }, '', newUrl);

    document.getElementById('pageEditorModalTitle').innerHTML = `Manage Page: ${pageName}`;
    document.getElementById('pageModalFooterInfo').innerHTML = `File URL: <code class="text-primary font-monospace">${fileName}</code>`;

    const container = document.getElementById('pageEditorModalBodyContent');
    container.innerHTML = '<div class="text-center py-5 text-muted fst-italic">Loading page data from D1 Database...</div>';
    
    const modalEl = document.getElementById('pageEditorModal');
    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    bsModal.show();

    modalEl.addEventListener('hidden.bs.modal', function () {
        if (window.location.search.includes('edit=')) {
            window.history.pushState({}, '', window.location.pathname);
        }
    }, { once: true });

    let pageDetail = { name: pageName, filename: fileName, mode: 'tinymce', content: '', seo: '{}', css: '', js: '' };
    try {
        const resDetail = await fetch('/api/pages/detail?id=' + encodeURIComponent(pageId));
        if (resDetail.ok) {
            pageDetail = await resDetail.json();
        }
    } catch(e){}

    let currentEditorMode = forcedMode || pageDetail.mode || 'tinymce';
    let pageContentForTinyMce = pageDetail.content || '';

    if (!pageContentForTinyMce && currentEditorMode === 'tinymce') {
        try {
            const resContent = await fetch('/api/kv?key=page:' + pageId + ':raw');
            if (resContent.ok) {
                const txt = await resContent.text();
                if (txt && txt !== 'Failed to load.') pageContentForTinyMce = txt;
            }
        } catch(e){}
    }

    let seoData = { title: pageName, description: '', ogImage: '', noIndex: false, noFollow: false };
    try {
        if (pageDetail.seo) {
            const parsed = typeof pageDetail.seo === 'string' ? JSON.parse(pageDetail.seo) : pageDetail.seo;
            seoData = { ...seoData, ...parsed };
        }
    } catch(e){}

    window._currentPageCss = pageDetail.css || '';
    window._currentPageJs = pageDetail.js || '';

    container.innerHTML = `
    <div class="mb-3">
        <label class="form-label fw-bold small text-secondary">Page Title</label>
        <input type="text" id="modalPageTitleInput-${pageId}" class="form-control form-control-lg fw-bold" value="${seoData.title || pageName}" placeholder="Page Title..." oninput="autoUpdateSlugFromTitle('${pageId}')">
    </div>
    <div class="mb-3">
        <label class="form-label fw-bold small text-secondary">Slug / File URL Name (.html)</label>
        <input type="text" id="modalPageSlugInput-${pageId}" class="form-control form-control-sm font-monospace" value="${fileName}" placeholder="filename.html">
    </div>

    <div class="wp-card p-4 bg-white mb-4 border shadow-sm rounded-4">
        <h6 class="fw-bold text-dark mb-3"><i class="bi bi-sliders me-2 text-primary"></i> Page Content Mode</h6>
        <p class="text-muted small mb-3">Choose between TinyMCE Editor, Block Library Layout, or GrapesJS Visual Builder.</p>
        <div class="row g-3">
            <div class="col-md-4">
                <div class="form-check border p-3 rounded-3 h-100 ${currentEditorMode === 'tinymce' ? 'border-warning bg-light' : ''}">
                    <input class="form-check-input" type="radio" name="editorMode-${pageId}" id="modeTinyMce-${pageId}" value="tinymce" ${currentEditorMode === 'tinymce' ? 'checked' : ''}>
                    <label class="form-check-label fw-bold ms-2 text-warning" for="modeTinyMce-${pageId}">Option 1: TinyMCE Editor</label>
                    <p class="small text-muted mt-2 mb-0">Visual rich text editor directly for paragraphs, articles, or concise pages.</p>
                </div>
            </div>
            <div class="col-md-4">
                <div class="form-check border p-3 rounded-3 h-100 ${currentEditorMode === 'block_library' ? 'border-success bg-light' : ''}">
                    <input class="form-check-input" type="radio" name="editorMode-${pageId}" id="modeBlockLib-${pageId}" value="block_library" ${currentEditorMode === 'block_library' ? 'checked' : ''}>
                    <label class="form-check-label fw-bold ms-2 text-success" for="modeBlockLib-${pageId}">Option 2: Block Library</label>
                    <p class="small text-muted mt-2 mb-0">Manage pages using modular section structures and custom blocks from the library.</p>
                </div>
            </div>
            <div class="col-md-4">
                <div class="form-check border p-3 rounded-3 h-100 ${currentEditorMode === 'grapesjs' ? 'border-primary bg-light' : ''}">
                    <input class="form-check-input" type="radio" name="editorMode-${pageId}" id="modeGrapes-${pageId}" value="grapesjs" ${currentEditorMode === 'grapesjs' ? 'checked' : ''}>
                    <label class="form-check-label fw-bold ms-2 text-primary" for="modeGrapes-${pageId}">Option 3: GrapesJS Builder</label>
                    <p class="small text-muted mt-2 mb-0">Pure visual drag & drop using default built-in widgets.</p>
                </div>
            </div>
        </div>
        <button type="button" class="btn btn-sm wp-btn-primary mt-3 px-4" onclick="saveEditorMode('${pageId}', event)"><i class="bi bi-floppy me-1"></i> Save Editor Mode</button>
    </div>

    <div class="row g-4">
        <div class="col-lg-9">
            <div class="row g-3 mb-3">
                <div class="col-md-6"><div class="wp-card p-3 bg-white hover-bg border" onclick="openEditor('page:${pageId}:css', 'Page Custom CSS')" style="cursor:pointer"><h6 class="fw-bold mb-0 small text-primary"><i class="bi bi-filetype-css me-2"></i> Page Custom CSS</h6></div></div>
                <div class="col-md-6"><div class="wp-card p-3 bg-white hover-bg border" onclick="openEditor('page:${pageId}:js', 'Page Custom JS')" style="cursor:pointer"><h6 class="fw-bold mb-0 small text-warning"><i class="bi bi-filetype-js me-2"></i> Page Custom JS</h6></div></div>
            </div>

            ${currentEditorMode === 'tinymce' ? `
            <div class="wp-card p-4 bg-white mb-3 border shadow-sm rounded-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="fw-bold text-dark mb-0"><i class="bi bi-file-richtext text-warning me-2"></i> TinyMCE Rich Text Editor</h5>
                </div>
                <textarea id="pageTinyMceArea" rows="15" class="form-control">${pageContentForTinyMce}</textarea>
            </div>` : currentEditorMode === 'grapesjs' ? `
            <div class="wp-card p-5 bg-white mb-3 text-center border shadow-sm rounded-4">
                <div class="mb-3"><i class="bi bi-magic text-primary" style="font-size: 3.5rem;"></i></div>
                <h4 class="fw-bold text-dark">GrapesJS Visual Builder</h4>
                <p class="text-muted mb-4 mx-auto" style="max-width:500px;">Design pages visually using drag & drop default standard widgets.</p>
                <button id="btnOpenBuilder" class="btn btn-lg wp-btn-primary px-5 py-2 shadow-sm rounded-pill" onclick="openGrapesJSBuilder('${pageId}')">
                    <i class="bi bi-layout-wtf me-2"></i> Open GrapesJS Builder
                </button>
            </div>` : `
            <div class="wp-card p-4 bg-white mb-3 border shadow-sm rounded-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <h4 class="fw-bold text-dark mb-1"><i class="bi bi-layers text-success me-2"></i> Sections &amp; Blocks Layout</h4>
                        <p class="text-muted small mb-0">Manage your page section layout and blocks from the library.</p>
                    </div>
                    <button class="btn btn-sm btn-primary px-3 py-2 shadow-sm" onclick="openAddSectionModal('${pageId}')"><i class="bi bi-plus-lg me-1"></i> Add Section</button>
                </div>
                <hr class="text-muted opacity-25 my-3">
                <div id="sectionsListContainer-${pageId}" class="d-flex flex-column gap-3">
                    <div class="text-center py-3 text-muted small fst-italic">Loading block layout...</div>
                </div>
            </div>`}

            <div class="wp-card p-4 bg-white">
                <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom"><h6 class="fw-bold text-dark mb-0">SEO &amp; Meta Settings</h6></div>
                <div class="row g-3">
                    <div class="col-md-6"><label class="form-label small text-secondary">Meta Title</label><input type="text" id="modalSeoTitle-${pageId}" class="form-control form-control-sm" value="${seoData.title || ''}"></div>
                    <div class="col-md-6"><label class="form-label small text-secondary">OG Image</label><input type="text" id="modalSeoImage-${pageId}" class="form-control form-control-sm" value="${seoData.ogImage || ''}"></div>
                    <div class="col-12"><label class="form-label small text-secondary">Meta Description</label><textarea id="modalSeoDesc-${pageId}" class="form-control form-control-sm" rows="2">${seoData.description||''}</textarea></div>
                    <div class="col-md-6"><div class="form-check mt-2"><input class="form-check-input" type="checkbox" id="modalSeoNoIndex-${pageId}" ${seoData.noIndex?'checked':''}><label class="form-check-label small">No Index</label></div></div>
                    <div class="col-md-6"><div class="form-check mt-2"><input class="form-check-input" type="checkbox" id="modalSeoNoFollow-${pageId}" ${seoData.noFollow?'checked':''}><label class="form-check-label small">No Follow</label></div></div>
                </div>
            </div>
        </div>
        <div class="col-lg-3">
            <div class="wp-card p-3 bg-white mb-3">
                <h6 class="fw-bold text-dark mb-3 border-bottom pb-2">Save Page</h6>
                <div class="d-grid gap-2 mb-2">
                    <button type="button" class="btn btn-sm btn-outline-warning fw-semibold" id="btnSaveDraft" onclick="savePageAsDraft()">
                        <i class="bi bi-file-earmark-lock me-1"></i> Save Draft
                    </button>
                    <button type="button" class="btn btn-sm wp-btn-primary fw-semibold" id="btnPublish" onclick="publishPageDirect()">
                        <i class="bi bi-cloud-upload me-1"></i> Publish
                    </button>
                </div>
                <p class="small text-muted mt-2 mb-0" style="font-size: 0.75rem;"><i class="bi bi-info-circle me-1"></i>Changes will be saved and ready to release via Sync & Deploy.</p>
            </div>
            <div class="wp-card p-3 bg-white mb-3">
                <h6 class="fw-bold text-dark mb-3 border-bottom pb-2">File Info</h6>
                <div class="small text-muted mb-1">File Name / Slug:</div><div id="sidebarDisplayFilename" class="font-monospace text-dark bg-light p-2 rounded border small mb-2 text-break">${fileName}</div>
                <div class="small text-muted mb-1">Page ID:</div><div id="sidebarDisplayPageId" class="font-monospace text-dark bg-light p-2 rounded border small text-break">${pageId}</div>
            </div>
        </div>
    </div>`;

    setupOgImageUploads();
    if (currentEditorMode === 'block_library') {
        loadPageSectionsUI(pageId);
    } else if (currentEditorMode === 'tinymce') {
        setTimeout(() => {
            if (window.tinymce) {
                if (tinymce.get('pageTinyMceArea')) tinymce.get('pageTinyMceArea').remove();
                tinymce.init({
                    selector: '#pageTinyMceArea',
                    height: 500,
                    plugins: 'link image code table lists advlist autolink preview anchor searchreplace visualblocks fullscreen media paste code help wordcount',
                    toolbar: 'undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help | code',
                    menubar: true,
                    images_upload_handler: (blobInfo) => new Promise(async (resolve, reject) => {
                        try {
                            const fakeFile = new File([blobInfo.blob()], blobInfo.filename(), { type: blobInfo.blob().type });
                            const compressed = await compressAndConvertImage(fakeFile);
                            const res = await fetch('/api/github/upload-image', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({ 
                                    filename: Date.now() + '-' + compressed.filename, 
                                    content: compressed.content,
                                    storage_provider: currentPageStorageProvider
                                })
                            });
                            
                            if (res.ok) {
                                const data = await res.json();
                                resolve(data.url);
                            } else {
                                reject('Failed to upload image to ' + currentPageStorageProvider);
                            }
                        } catch(e) {
                            reject('Error: ' + e.message);
                        }
                    })
                });
            }
        }, 200);
    }
};

window.autoUpdateSlugFromTitle = function(pageId) {
    const titleVal = document.getElementById('modalPageTitleInput-' + pageId)?.value || '';
    const slugInput = document.getElementById('modalPageSlugInput-' + pageId);
    if (slugInput) {
        let suggested = titleVal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+\$/g, '') + '.html';
        slugInput.value = suggested;
        const sideEl = document.getElementById('sidebarDisplayFilename');
        if (sideEl) sideEl.innerText = suggested;
        
        const slugBase = suggested.replace('.html', '');
        const idSideEl = document.getElementById('sidebarDisplayPageId');
        if (idSideEl) idSideEl.innerText = slugBase;
    }
};

window.savePageAsDraft = function() {
    saveStaticPageUnified('draft');
};

window.publishPageDirect = function() {
    saveStaticPageUnified('published');
};

// =============================================================
// UNIFIED SAVE PAGE (METADATA D1 & PUSH DISPATCH SINKRONISASI)
// =============================================================
window.saveStaticPageUnified = async function(targetStatus = 'draft') {
    const oldPageId = window.currentPageId;
    const titleInput = document.getElementById('modalPageTitleInput-' + oldPageId) || document.getElementById('inpStaticPageTitle');
    const slugInput = document.getElementById('modalPageSlugInput-' + oldPageId) || document.getElementById('inpStaticPageSlug');
    const btn = targetStatus === 'published' ? (document.getElementById('btnPublish') || document.getElementById('btnSaveStaticPageUnified')) : (document.getElementById('btnSaveDraft') || document.getElementById('btnSaveStaticPageUnified'));

    const title = titleInput ? titleInput.value.trim() : 'Untitled Page';
    const rawSlugInput = slugInput ? slugInput.value.trim() : '';
    
    let filename = generateUniqueFilename(title, window.allPagesData, oldPageId);
    if (rawSlugInput) {
        let cleanRaw = rawSlugInput.toLowerCase().replace(/[^a-z0-9.-]+/g, '');
        if (!cleanRaw.endsWith('.html')) cleanRaw += '.html';
        filename = generateUniqueFilename(cleanRaw.replace('.html', ''), window.allPagesData, oldPageId);
    }

    const newPageId = filename.replace('.html', '');
    window.currentPageId = newPageId;

    if (!oldPageId) return showToast("No active page ID selected.", "danger");
    setButtonLoading(btn, true, targetStatus === 'published' ? "Publishing Page..." : "Saving Draft...");

    const currentStatus = targetStatus;

    try {
        let rawContent = '';
        if (window.tinymce && tinymce.get('pageTinyMceArea')) {
            rawContent = tinymce.get('pageTinyMceArea').getContent();
        } else {
            const el = document.getElementById('pageTinyMceArea') || document.getElementById('inpStaticPageContent');
            if (el) rawContent = el.value;
        }

        const selectedRadio = document.querySelector(`input[name="editorMode-${oldPageId}"]:checked`);
        const selectedMode = selectedRadio ? selectedRadio.value : 'tinymce';

        const seoData = {
            title: document.getElementById('modalPageTitleInput-' + oldPageId)?.value || title,
            description: document.getElementById('modalSeoDesc-' + oldPageId)?.value || '',
            ogImage: document.getElementById('modalSeoImage-' + oldPageId)?.value || '',
            noIndex: document.getElementById('modalSeoNoIndex-' + oldPageId)?.checked || false,
            noFollow: document.getElementById('modalSeoNoFollow-' + oldPageId)?.checked || false
        };

        // Kirim payload lengkap ke backend D1 & GitHub
        const pubRes = await fetch('/api/publish', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                filename: filename, 
                pageId: newPageId, 
                content: rawContent,
                mode: selectedMode,
                name: title,
                seoData: seoData,
                css: window._currentPageCss || '',
                js: window._currentPageJs || ''
            })
        });

        // Simpan status & metadata ke D1 Database
        await fetch('/api/pages/create', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                id: newPageId, 
                name: title, 
                filename: filename, 
                status: currentStatus,
                mode: selectedMode,
                content: rawContent,
                seo: seoData,
                css: window._currentPageCss || '',
                js: window._currentPageJs || ''
            })
        });

        // AKTIFKAN INDIKATOR SYNC PENDING DI TOOLBAR/NAVBAR
        document.querySelectorAll('.sync-pending-indicator, #syncPendingDot, [data-sync-indicator]').forEach(el => el.classList.remove('d-none'));
        localStorage.setItem('sync_pending', 'true');

        setButtonLoading(btn, false);
        
        if (currentStatus === 'published') {
            showToast("Static page successfully marked as Published! Click Sync & Deploy in navbar to publish to GitHub.");
        } else {
            showToast("Static page successfully saved as Draft! Click Sync & Deploy in navbar when you want to publish it.");
        }

        setTimeout(() => {
            const modalEl = document.getElementById('pageEditorModal') || document.getElementById('createStaticPageFullscreenModal');
            if(modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
            loadStaticPages();
        }, 1000);
    } catch(e) {
        setButtonLoading(btn, false);
        showToast("Error occurred: " + e.message, "danger");
    }
};

// =============================================================
// SAVE EDITOR MODE (METADATA D1 + SYNC PENDING TRIGGER)
// =============================================================
window.saveEditorMode = async function(pageId, evt) {
    if (evt) evt.preventDefault();
    const btn = evt ? evt.currentTarget : document.querySelector(`button[onclick*="saveEditorMode('${pageId}')"]`);
    if (btn) setButtonLoading(btn, true, "Saving Mode...");

    const selectedRadio = document.querySelector(`input[name="editorMode-${pageId}"]:checked`);
    const selected = selectedRadio ? selectedRadio.value : 'tinymce';

    let rawContent = '';
    if (window.tinymce && tinymce.get('pageTinyMceArea')) {
        rawContent = tinymce.get('pageTinyMceArea').getContent();
    } else {
        const el = document.getElementById('pageTinyMceArea');
        if (el) rawContent = el.value;
    }

    try {
        await fetch('/api/pages/create', { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ 
                id: pageId, 
                name: document.getElementById('modalPageTitleInput-' + pageId)?.value || pageId,
                filename: document.getElementById('modalPageSlugInput-' + pageId)?.value || `${pageId}.html`,
                mode: selected,
                content: rawContent
            }) 
        });

        showToast("Editor mode successfully saved!");

        const pageTitle = document.getElementById('modalPageTitleInput-' + pageId)?.value || 'Page';
        const fileName = document.getElementById('modalPageSlugInput-' + pageId)?.value || 'page.html';

        if (btn) setButtonLoading(btn, false);

        openPageManager(pageId, pageTitle, fileName, selected);
    } catch(e) { 
        if (btn) setButtonLoading(btn, false);
        showToast("Failed to save editor mode.", "danger"); 
    }
};

// --- SECTIONS & BLOCKS LOGIC ---
async function loadPageSectionsUI(pageId) {
    const container = document.getElementById(`sectionsListContainer-${pageId}`);
    if (!container) return;

    let sections = [];
    try {
        const res = await fetch('/api/kv?key=page:' + pageId + ':sections');
        if (res.ok) {
            const txt = await res.text();
            if (txt) sections = JSON.parse(txt);
        }
    } catch(e) {}

    if (!sections.length) {
        sections = []; 
        await saveSectionsToKv(pageId, sections);
    }
    renderSectionsHtml(pageId, sections);
}

function renderSectionsHtml(pageId, sections) {
    const container = document.getElementById(`sectionsListContainer-${pageId}`);
    if (!container) return;
    container.innerHTML = '';
    
    if (!sections.length) {
        container.innerHTML = '<div class="text-center py-4 text-muted small fst-italic">No sections added yet. Click "+ Add Section" above to start building.</div>';
        return;
    }

    sections.forEach((sec) => {
        const isLibraryBlock = window.availableBlocksList && window.availableBlocksList.includes(sec.id);
        const editKey = isLibraryBlock ? 'block:' + sec.id : 'page:' + pageId + ':section:' + sec.id;

        container.innerHTML += `
        <div class="border p-3 rounded-3 bg-white shadow-sm d-flex justify-content-between align-items-center">
            <div><h6 class="fw-bold text-dark mb-1">${sec.name}</h6><code class="text-muted small font-monospace">ID: ${sec.id} ${isLibraryBlock ? '<span class="badge bg-success ms-1">Library Block</span>' : ''}</code></div>
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-primary px-2 py-1" onclick="openSectionRepeaterModal('${pageId}', '${sec.id}', '${sec.name}')" title="Edit Data Repeater / Items"><i class="bi bi-list-nested me-1"></i> Data Repeater</button>
                <button class="btn btn-sm btn-outline-secondary px-2 py-1" onclick="openEditor('${editKey}', '${sec.name}')" title="Edit HTML"><i class="bi bi-code-slash"></i> Edit HTML</button>
                <button class="btn btn-sm btn-outline-danger px-2 py-1" onclick="deletePageSection('${pageId}', '${sec.id}')" title="Delete Section"><i class="bi bi-trash"></i></button>
            </div>
        </div>`;
    });
}

window.openSectionRepeaterModal = async function(pageId, secId, secName) {
    let modalEl = document.getElementById('sectionRepeaterModal');
    if (modalEl) modalEl.remove();

    let repeaterItems = [
        { title: "Item 1", subtitle: "", url: "", color: "", image: "", description: "First item description..." },
        { title: "Item 2", subtitle: "", url: "#", color: "#e6f4a3", image: "", description: "Second item description..." }
    ];

    try {
        const res = await fetch('/api/kv?key=' + encodeURIComponent('page:' + pageId + ':section:' + secId + ':repeater'));
        if (res.ok) {
            const txt = await res.text();
            if (txt) {
                const parsed = JSON.parse(txt);
                if (Array.isArray(parsed) && parsed.length > 0) repeaterItems = parsed;
            }
        }
    } catch(e) {}

    const div = document.createElement('div');
    div.innerHTML = `
    <div class="modal fade" id="sectionRepeaterModal" tabindex="-1">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content border-0 shadow-lg rounded-3">
                <div class="modal-header bg-dark text-white px-4 py-3">
                    <h5 class="modal-title fw-bold fs-5">Edit Repeater Data: ${secName}</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-4 bg-light">
                    <div id="sectionRepeaterRowsContainer" class="d-flex flex-column gap-3 mb-3"></div>
                    <button type="button" id="btnAddRepeaterRow" class="btn btn-sm btn-outline-primary px-3 fw-semibold"><i class="bi bi-plus-circle me-1"></i> Add New Item Row</button>
                </div>
                <div class="modal-footer bg-white px-4 py-3 border-top d-flex justify-content-between">
                    <button type="button" class="btn wp-btn-secondary px-4" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" id="btnSaveRepeater" class="btn wp-btn-primary px-5">Save Data</button>
                </div>
            </div>
        </div>
    </div>`;
    document.body.appendChild(div);

    window._currentRepeaterItems = repeaterItems;
    const container = document.getElementById('sectionRepeaterRowsContainer');

    function renderRows() {
        container.innerHTML = '';
        if (!Array.isArray(window._currentRepeaterItems) || window._currentRepeaterItems.length === 0) {
            container.innerHTML = '<div class="text-center text-muted small py-3">No repeater items yet. Click Add New Item Row below.</div>'; return;
        }

        window._currentRepeaterItems.forEach((item, index) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'border p-3 rounded-3 bg-white shadow-sm position-relative';
            rowDiv.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="fw-bold small text-dark">Item #${index + 1}</span>
                    <button type="button" class="btn-close btn-remove-row" style="font-size: 0.75rem;" data-index="${index}"></button>
                </div>
                <div class="row g-2 mb-2">
                    <div class="col-md-3"><label class="form-label small text-secondary mb-1">Title</label><input type="text" class="form-control form-control-sm repeater-title" value="${item.title || ''}"></div>
                    <div class="col-md-3"><label class="form-label small text-secondary mb-1">Subtitle</label><input type="text" class="form-control form-control-sm repeater-subtitle" value="${item.subtitle || ''}"></div>
                    <div class="col-md-3"><label class="form-label small text-secondary mb-1">Link URL</label><input type="text" class="form-control form-control-sm repeater-url" value="${item.url || ''}"></div>
                    <div class="col-md-3"><label class="form-label small text-secondary mb-1">Background Color</label><input type="text" class="form-control form-control-sm repeater-color" value="${item.color || ''}"></div>
                </div>
                <div class="mb-2"><label class="form-label small text-secondary mb-1">Image URL / HTML Icon / SVG Code</label><input type="text" class="form-control form-control-sm repeater-image" value="${item.image || ''}"></div>
                <div><label class="form-label small text-secondary mb-1">Description</label><textarea class="form-control form-control-sm repeater-desc" rows="2">${item.description || ''}</textarea></div>
            `;
            container.appendChild(rowDiv);
        });
    }

    function collectInputs() {
        const rows = container.querySelectorAll('.border');
        rows.forEach((row, index) => {
            if (window._currentRepeaterItems && window._currentRepeaterItems[index]) {
                window._currentRepeaterItems[index].title = row.querySelector('.repeater-title')?.value || '';
                window._currentRepeaterItems[index].subtitle = row.querySelector('.repeater-subtitle')?.value || '';
                window._currentRepeaterItems[index].url = row.querySelector('.repeater-url')?.value || '';
                window._currentRepeaterItems[index].color = row.querySelector('.repeater-color')?.value || '';
                window._currentRepeaterItems[index].image = row.querySelector('.repeater-image')?.value || '';
                window._currentRepeaterItems[index].description = row.querySelector('.repeater-desc')?.value || '';
            }
        });
    }

    document.getElementById('btnAddRepeaterRow').addEventListener('click', () => {
        collectInputs();
        if (!Array.isArray(window._currentRepeaterItems)) window._currentRepeaterItems = [];
        window._currentRepeaterItems.push({ title: "New Item", subtitle: "", url: "", color: "", image: "", description: "" });
        renderRows();
    });

    container.addEventListener('click', (e) => {
        const btnRemove = e.target.closest('.btn-remove-row');
        if (btnRemove) {
            const index = parseInt(btnRemove.getAttribute('data-index'));
            collectInputs();
            window._currentRepeaterItems.splice(index, 1);
            renderRows();
        }
    });

    document.getElementById('btnSaveRepeater').addEventListener('click', async () => {
        collectInputs();
        let generatedHtml = '<div class="repeater-container py-3">';
        window._currentRepeaterItems.forEach((item) => {
            let bgStyle = item.color ? `background-color: ${item.color};` : '';
            let imgTag = item.image ? (item.image.trim().startsWith('<svg') || item.image.trim().startsWith('<img') ? item.image : `<img src="${item.image}" alt="" style="max-width:100%; height:auto;" />`) : '';
            let linkOpen = item.url ? `<a href="${item.url}" class="text-decoration-none">` : '';
            let linkClose = item.url ? `</a>` : '';
            generatedHtml += `
            <div class="card mb-3 border shadow-sm p-3" style="${bgStyle}">
                ${imgTag ? `<div class="mb-2">${imgTag}</div>` : ''}
                ${linkOpen}<h5 class="fw-bold mb-1">${item.title || ''}</h5>${linkClose}
                ${item.subtitle ? `<h6 class="text-muted small mb-2">${item.subtitle}</h6>` : ''}
                ${item.description ? `<div class="text-secondary small">${item.description}</div>` : ''}
            </div>`;
        });
        generatedHtml += '</div>';

        try {
            await fetch('/api/kv', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ key: 'page:' + pageId + ':section:' + secId + ':repeater', content: JSON.stringify(window._currentRepeaterItems) }) });
            await fetch('/api/kv', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ key: 'page:' + pageId + ':section:' + secId + ':raw', content: generatedHtml }) });
            await fetch('/api/kv', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ key: 'page:' + pageId + ':section:' + secId, content: clientSideMinify(generatedHtml) }) });

            let sections = [];
            const resSec = await fetch('/api/kv?key=page:' + pageId + ':sections');
            if (resSec.ok) sections = JSON.parse(await resSec.text());
            
            sections = sections.map(s => s.id === secId ? { ...s, content: generatedHtml } : s);
            await saveSectionsToKv(pageId, sections);

            bootstrap.Modal.getInstance(document.getElementById('sectionRepeaterModal')).hide();
            showToast("Repeater data successfully saved locally!");
            
            document.querySelectorAll('.sync-pending-indicator, #syncPendingDot, [data-sync-indicator]').forEach(el => el.classList.remove('d-none'));
            localStorage.setItem('sync_pending', 'true');
            
            loadPageSectionsUI(pageId);
        } catch(e) { showToast("Failed to save repeater data.", "danger"); }
    });

    renderRows();
    new bootstrap.Modal(document.getElementById('sectionRepeaterModal')).show();
};

async function saveSectionsToKv(pageId, sections) {
    await fetch('/api/kv', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ key: 'page:' + pageId + ':sections', content: JSON.stringify(sections) }) });
    const combinedHtml = sections.map(s => s.content).join('\n');
    await fetch('/api/kv', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ key: 'page:' + pageId + ':content', content: clientSideMinify(combinedHtml) }) });
    
    // Simpan sec_list ke D1 Database
    await fetch('/api/pages/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id: pageId, name: window.currentPageId || pageId, filename: window.currentFilename || `${pageId}.html`, sec_list: sections })
    });
}

window.openAddSectionModal = async function(pageId) {
    const existingModal = document.getElementById('addSectionModal');
    if (existingModal) existingModal.remove();

    const div = document.createElement('div');
    div.innerHTML = `
    <div class="modal fade" id="addSectionModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header"><h5 class="modal-title fw-bold">Add Section</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                <div class="modal-body">
                    <div class="list-group mb-3" id="addSectionBlankContainer"><button type="button" class="list-group-item list-group-item-action fw-bold text-primary" onclick="createBlankSectionItem('${pageId}')"><i class="bi bi-plus-circle me-2"></i> + Create Blank Section</button></div>
                    <h6 class="fw-bold small text-muted mb-2">Select from Block Library:</h6>
                    <div class="list-group" id="libraryBlocksSelectList" style="max-height: 250px; overflow-y: auto;">
                        <div class="text-center py-2 text-muted small">Loading block list...</div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    document.body.appendChild(div);
    
    const listContainer = document.getElementById('libraryBlocksSelectList');
    if (listContainer) {
        listContainer.innerHTML = '';
        if (window.availableBlocksList && window.availableBlocksList.length > 0) {
            window.availableBlocksList.forEach(bId => {
                listContainer.innerHTML += `<div class="list-group-item d-flex justify-content-between align-items-center"><span class="font-monospace small">${bId}</span><button class="btn btn-sm btn-primary px-3" onclick="addSectionFromLibrary('${pageId}', '${bId}')">Select</button></div>`;
            });
        } else listContainer.innerHTML = '<div class="text-center py-2 text-muted small fst-italic">No blocks found in library.</div>';
    }
    new bootstrap.Modal(document.getElementById('addSectionModal')).show();
};

window.createBlankSectionItem = async function(pageId) {
    const name = prompt("Enter new section name:", "Custom Section");
    if (!name) return;
    const secId = 'sec_' + Date.now();
    let sections = [];
    try { const res = await fetch('/api/kv?key=page:' + pageId + ':sections'); if (res.ok) sections = JSON.parse(await res.text()); } catch(e) {}
    sections.push({ id: secId, name: name, content: `<div><h3>${name}</h3><p>Section content...</p></div>` });
    await saveSectionsToKv(pageId, sections);
    bootstrap.Modal.getInstance(document.getElementById('addSectionModal')).hide();
    loadPageSectionsUI(pageId);
    
    document.querySelectorAll('.sync-pending-indicator, #syncPendingDot, [data-sync-indicator]').forEach(el => el.classList.remove('d-none'));
    localStorage.setItem('sync_pending', 'true');
    
    showToast("New section successfully added!");
};

window.addSectionFromLibrary = async function(pageId, blockId) {
    let blockContent = '';
    const keysToTry = [
        'block:' + blockId + ':raw',
        'block:' + blockId,
        'block:' + blockId + ':content'
    ];
    
    for (let k of keysToTry) {
        try {
            const res = await fetch('/api/kv?key=' + encodeURIComponent(k));
            if (res.ok) {
                const txt = await res.text();
                if (txt && txt.trim() !== '' && txt !== 'Failed to load.') {
                    blockContent = txt;
                    break;
                }
            }
        } catch(e) {}
    }

    const secId = blockId; 
    try {
        await fetch('/api/kv', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ key: 'page:' + pageId + ':section:' + secId + ':raw', content: blockContent }) });
        await fetch('/api/kv', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ key: 'page:' + pageId + ':section:' + secId, content: clientSideMinify(blockContent) }) });
    } catch(e) {}

    let sections = [];
    try { const res = await fetch('/api/kv?key=page:' + pageId + ':sections'); if (res.ok) { const txt = await res.text(); if (txt) sections = JSON.parse(txt); } } catch(e) {}

    const existingIndex = sections.findIndex(s => s.id === secId);
    if (existingIndex >= 0) sections[existingIndex].content = blockContent || '';
    else sections.push({ id: secId, name: blockId, content: blockContent || '' });

    await saveSectionsToKv(pageId, sections);
    const modalEl = document.getElementById('addSectionModal');
    if (modalEl) { const bsModal = bootstrap.Modal.getInstance(modalEl); if (bsModal) bsModal.hide(); }
    loadPageSectionsUI(pageId);
    
    document.querySelectorAll('.sync-pending-indicator, #syncPendingDot, [data-sync-indicator]').forEach(el => el.classList.remove('d-none'));
    localStorage.setItem('sync_pending', 'true');
    
    showToast(`Block ${blockId} successfully loaded into section!`);
};

window.deletePageSection = async function(pageId, secId) {
    if (!confirm("Delete this section from the page?")) return;
    let sections = [];
    try { const res = await fetch('/api/kv?key=page:' + pageId + ':sections'); if (res.ok) sections = JSON.parse(await res.text()); } catch(e) {}
    sections = sections.filter(s => s.id !== secId);
    await saveSectionsToKv(pageId, sections);
    loadPageSectionsUI(pageId);
    
    document.querySelectorAll('.sync-pending-indicator, #syncPendingDot, [data-sync-indicator]').forEach(el => el.classList.remove('d-none'));
    localStorage.setItem('sync_pending', 'true');
    
    showToast("Section successfully deleted.");
};

// --- GRAPESJS BUILDER ---
window.openGrapesJSBuilder = async function(pageId) {
    const btn = document.getElementById('btnOpenBuilder');
    if (btn) setButtonLoading(btn, true, "Loading Builder...");

    let gjsWrapper = document.getElementById('gjs-wrapper');
    if (!gjsWrapper) {
        gjsWrapper = document.createElement('div');
        gjsWrapper.id = 'gjs-wrapper';
        gjsWrapper.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; z-index:99999; background:#fff; display:flex; flex-direction:column;';
        
        const iframe = document.createElement('iframe');
        iframe.id = 'gjs-iframe';
        iframe.style.cssText = 'width:100%; height:100%; border:none;';
        gjsWrapper.appendChild(iframe);
        document.body.appendChild(gjsWrapper);
    }
    
    gjsWrapper.style.display = 'flex';
    const iframe = document.getElementById('gjs-iframe');

    let initialProjectData = {};
    try {
        const res = await fetch('/api/kv?key=page:' + pageId + ':builder_json');
        if (res.ok) {
            const text = await res.text();
            const trimmed = text ? text.trim() : "";
            if (trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['))) initialProjectData = JSON.parse(trimmed);
        }
    } catch(e) {}

    const currentLang = localStorage.getItem('dashboard_lang') || 'en';

    iframe.srcdoc = `<!DOCTYPE html>
    <html lang="${currentLang}">
    <head>
        <meta charset="UTF-8">
        <title>GrapesJS Full Professional Builder</title>
        <link rel="stylesheet" href="https://unpkg.com/grapesjs@0.20.4/dist/css/grapes.min.css">
        <link rel="stylesheet" href="https://unpkg.com/grapesjs-preset-webpage@1.0.2/dist/grapesjs-preset-webpage.min.css">
        <link rel="stylesheet" href="https://unpkg.com/grapesjs-tooltip@0.1.5/dist/grapesjs-tooltip.min.css">
        <link rel="stylesheet" href="https://uicdn.toast.com/tui-image-editor/latest/tui-image-editor.css">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
        <script src="https://unpkg.com/grapesjs"></script>
        <script src="https://unpkg.com/grapesjs-preset-webpage"></script>
        <script src="https://unpkg.com/grapesjs-blocks-basic"></script>
        <script src="https://unpkg.com/grapesjs-plugin-forms"></script>
        <script src="https://unpkg.com/grapesjs-component-countdown"></script>
        <script src="https://unpkg.com/grapesjs-plugin-export"></script>
        <script src="https://unpkg.com/grapesjs-tabs"></script>
        <script src="https://unpkg.com/grapesjs-custom-code"></script>
        <script src="https://unpkg.com/grapesjs-touch"></script>
        <script src="https://unpkg.com/grapesjs-parser-postcss"></script>
        <script src="https://unpkg.com/grapesjs-tooltip"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"></script>
        <script src="https://uicdn.toast.com/tui.code-snippet/v1.5.2/tui-code-snippet.min.js"></script>
        <script src="https://uicdn.toast.com/tui-color-picker/v2.2.7/tui-color-picker.min.js"></script>
        <script src="https://uicdn.toast.com/tui-image-editor/v3.15.2/tui-image-editor.js"></script>
        <script src="https://unpkg.com/grapesjs-tui-image-editor"></script>
        <script src="https://unpkg.com/grapesjs-typed"></script>
        <script src="https://unpkg.com/grapesjs-style-bg"></script>
        <style>
            body, html { margin: 0; height: 100%; overflow: hidden; background: #1e1e1e; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            #gjs-header { height: 50px; background: #212529; color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; border-bottom: 1px solid #333; }
            #gjs { height: calc(100vh - 50px); }
            .gjs-btn { padding: 6px 16px; border-radius: 4px; border: none; cursor: pointer; font-weight: bold; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; }
            .btn-success { background: #198754; color: #fff; }
            .btn-success:hover { background: #157347; }
            .btn-outline-light { background: transparent; color: #fff; border: 1px solid #6c757d; }
            .btn-outline-light:hover { background: #343a40; }
        </style>
    </head>
    <body>
        <div id="gjs-header">
            <div style="font-weight: bold; display: flex; align-items: center; gap: 8px;"><i class="bi bi-brush text-primary"></i> <span>Layout Editor: ${pageId}</span></div>
            <div>
                <button class="gjs-btn btn-success" id="btnSaveGjs" style="margin-right: 10px;"><i class="bi bi-floppy"></i> Save Design</button>
                <button class="gjs-btn btn-outline-light" id="btnExitGjs"><i class="bi bi-x-lg"></i> Close Editor</button>
            </div>
        </div>
        <div id="gjs"></div>
        <script>
            const initialData = ${JSON.stringify(initialProjectData)};
            window.editor = grapesjs.init({
                container: '#gjs',
                height: '100%', width: '100%',
                parser: { parserCss: typeof grapesjsParserPostcss !== 'undefined' ? grapesjsParserPostcss : null },
                plugins: ['gjs-preset-webpage', 'gjs-blocks-basic', 'gjs-plugin-forms', 'grapesjs-component-countdown', 'gjs-plugin-export', 'grapesjs-tabs', 'grapesjs-custom-code', 'grapesjs-touch', 'grapesjs-tooltip', 'grapesjs-tui-image-editor', 'grapesjs-typed', 'grapesjs-style-bg'],
                pluginsOpts: {
                    'gjs-preset-webpage': { blocksBasicOpts: { flexGrid: true } },
                    'gjs-blocks-basic': { flexGrid: true },
                    'grapesjs-tui-image-editor': { config: { includeUI: { theme: { 'common.bi.image': '', 'common.bisize.width': '0px', 'common.bisize.height': '0px' } } } }
                }
            });
            if (initialData && Object.keys(initialData).length > 0) window.editor.loadProjectData(initialData);

            document.getElementById('btnSaveGjs').addEventListener('click', async () => {
                const btnSave = document.getElementById('btnSaveGjs');
                btnSave.innerText = 'Saving...'; btnSave.disabled = true;
                try {
                    const projectData = window.editor.getProjectData();
                    const rawHtml = window.editor.getHtml();
                    const cssData = window.editor.getCss();
                    const minifiedHtml = rawHtml.replace(/<!--[\s\S]*?-->/gis, (m) => (m.includes('LOOP') || m.includes('IF_HAS_CHILDREN')) ? m : '').replace(/[\r\n]+/g, '').replace(/\s+/g, ' ').trim();

                    await fetch('/api/publish', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            pageId: '${pageId}',
                            filename: '${pageId}.html',
                            content: minifiedHtml,
                            mode: 'grapesjs',
                            css: cssData
                        })
                    });

                    await fetch('/api/kv', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ key: 'page:${pageId}:builder_json', content: JSON.stringify(projectData) }) });

                    window.parent.postMessage({ type: 'SHOW_TOAST', message: 'GrapesJS design successfully saved locally!' }, '*');
                } catch(e) { window.parent.postMessage({ type: 'SHOW_TOAST', message: 'Failed to save GrapesJS design.', typeToast: 'danger' }, '*'); } 
                finally { btnSave.innerHTML = '<i class="bi bi-floppy"></i> Save Design'; btnSave.disabled = false; }
            });
            document.getElementById('btnExitGjs').addEventListener('click', () => { window.parent.postMessage({ type: 'CLOSE_GJS' }, '*'); });
        </script>
    </body>
    </html>`;

    if (btn) setButtonLoading(btn, false);
};

window.addEventListener('message', function(event) {
    if (!event.data) return;
    if (event.data.type === 'SHOW_TOAST') {
        showToast(event.data.message, event.data.typeToast || 'success');
        
        if(event.data.message.toLowerCase().includes('saved locally') || event.data.message.toLowerCase().includes('saved')) {
            document.querySelectorAll('.sync-pending-indicator, #syncPendingDot, [data-sync-indicator]').forEach(el => el.classList.remove('d-none'));
            localStorage.setItem('sync_pending', 'true');
        }
    }
    if (event.data.type === 'CLOSE_GJS') closeGrapesJS();
});

window.closeGrapesJS = function() {
    const wrapper = document.getElementById('gjs-wrapper');
    if (wrapper) wrapper.style.display = 'none';
};

window.openEditor = async function(key, title) {
    if (window.currentCodeMirrorInstance) {
        try { window.currentCodeMirrorInstance.toTextArea(); } catch(e) {}
        window.currentCodeMirrorInstance = null;
    }

    document.getElementById('currentEditKey').value = key;
    document.getElementById('currentIsGitHubFile').value = "false";
    document.getElementById('editorOverlayTitle').innerHTML = `Edit: ${title}`;
    
    let mode = 'htmlmixed';
    if (key.includes(':css')) mode = 'css';
    if (key.includes(':js')) mode = 'javascript';
    
    const overlay = document.getElementById('customEditorOverlay');
    overlay.style.display = 'flex';
    
    const ed = document.getElementById('htmlEditor');
    ed.value = "Loading data...";
    
    let content = "Failed to load.";
    if (key.includes(':css') && window._currentPageCss) {
        content = window._currentPageCss;
    } else if (key.includes(':js') && window._currentPageJs) {
        content = window._currentPageJs;
    } else {
        try {
            const resRaw = await fetch('/api/kv?key=' + encodeURIComponent(key + ':raw'));
            if (resRaw.ok) {
                const rawTxt = await resRaw.text();
                if (rawTxt) content = rawTxt;
            }
            if (content === "Failed to load.") {
                const res = await fetch('/api/kv?key=' + encodeURIComponent(key));
                if (res.ok) content = await res.text();
            }
        } catch(e) {}
    }
    
    ed.value = content;
    
    setTimeout(() => {
        if (typeof window.initCodeMirrorEditor === 'function') {
            window.initCodeMirrorEditor('#htmlEditor', mode);
            setTimeout(() => {
                if (window.currentCodeMirrorInstance) window.currentCodeMirrorInstance.refresh();
            }, 50);
        }
    }, 100);
};

window.closeCustomEditor = function() {
    document.getElementById('customEditorOverlay').style.display = 'none';
    if (window.currentCodeMirrorInstance) {
        try { window.currentCodeMirrorInstance.toTextArea(); } catch(e) {}
        window.currentCodeMirrorInstance = null;
    }
};

window.saveEditorDataDualStorage = async function() {
    const btn = document.getElementById('btnSaveEditor');
    setButtonLoading(btn, true, "Saving...");
    const key = document.getElementById('currentEditKey').value;
    const rawContent = window.currentCodeMirrorInstance ? window.currentCodeMirrorInstance.getValue() : document.getElementById('htmlEditor').value;
    
    if (key.includes(':css')) {
        window._currentPageCss = rawContent;
    } else if (key.includes(':js')) {
        window._currentPageJs = rawContent;
    }

    try {
        await fetch('/api/kv', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ key: key + ':raw', content: rawContent }) });
        const res = await fetch('/api/kv', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ key, content: clientSideMinify(rawContent) }) });
        
        if (key.includes(':section:')) {
            const parts = key.split(':');
            const pageId = parts[1];
            const secId = parts[3];
            try {
                const resSec = await fetch('/api/kv?key=page:' + pageId + ':sections');
                if (resSec.ok) {
                    let sections = JSON.parse(await resSec.text());
                    sections = sections.map(s => s.id === secId ? { ...s, content: rawContent } : s);
                    await saveSectionsToKv(pageId, sections);
                }
            } catch(e) {}
        }

        if (key.startsWith('block:') && window.currentPageId) {
            const blockId = key.split(':')[1];
            try {
                const resSec = await fetch('/api/kv?key=page:' + window.currentPageId + ':sections');
                if (resSec.ok) {
                    let sections = JSON.parse(await resSec.text());
                    let updated = false;
                    sections = sections.map(s => {
                        if (s.id === blockId) {
                            updated = true;
                            return { ...s, content: rawContent };
                        }
                        return s;
                    });
                    if (updated) {
                        await saveSectionsToKv(window.currentPageId, sections);
                    }
                }
            } catch(e) {}
        }

        setButtonLoading(btn, false);
        if(res.ok || window.currentPageId){
            document.querySelectorAll('.sync-pending-indicator, #syncPendingDot, [data-sync-indicator]').forEach(el => el.classList.remove('d-none'));
            localStorage.setItem('sync_pending', 'true');

            showToast("Changes successfully saved!");
            setTimeout(() => { 
                closeCustomEditor(); 
                loadStaticPages(); 
                if (window.currentPageId) loadPageSectionsUI(window.currentPageId); 
            }, 1000);
        } else throw new Error();
    } catch(e) {
        setButtonLoading(btn, false);
        showToast("Failed to save changes.", "danger");
    }
};

document.addEventListener("DOMContentLoaded", async function() {
    if (localStorage.getItem('sync_pending') === 'true') {
        document.querySelectorAll('.sync-pending-indicator, #syncPendingDot, [data-sync-indicator]').forEach(el => el.classList.remove('d-none'));
    }

    const defaultLang = localStorage.getItem('dashboard_lang') || 'en';
    changeLanguage(defaultLang);
    
    await initUserProfileTopbar();
    await loadPageStoragePreference();
    
    try {
        const blockRes = await fetch('/api/blocks/list');
        window.availableBlocksList = await blockRes.json();
    } catch (e) { window.availableBlocksList = []; }

    await loadStaticPages();

    const urlParams = new URLSearchParams(window.location.search);
    const editPageId = urlParams.get('edit');
    if (editPageId) {
        try {
            const targetPage = window.allPagesData.find(p => p.id === editPageId);
            if (targetPage) openPageManager(targetPage.id, targetPage.name, targetPage.filename);
            else openPageManager(editPageId, editPageId, editPageId + '.html');
        } catch (err) {}
    }

    document.addEventListener('focusin', (e) => {
        if (e.target.closest('.tox-tinymce, .tox-window, .tox-dialog, .tox-popup, .CodeMirror, #customEditorOverlay')) {
            e.stopImmediatePropagation();
        }
    });
});