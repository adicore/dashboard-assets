// pages-js.js - Zero KV Version (D1 Database & GitHub Direct Integration)

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
        const res = await fetch('/api/user/profile');
        if (res.ok) {
            const data = await res.json();
            currentPageStorageProvider = data.storage_provider || 'github';
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
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted fst-italic">Loading pages list from D1...</td></tr>';
    
    try {
        const res = await fetch('/api/pages/list');
        if (res.ok) {
            window.allPagesData = await res.json();
            applyPageFiltersAndRender();
        } else { throw new Error(); }
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load pages from D1 database.</td></tr>';
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
    if (!pages.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No static pages found.</td></tr>'; return; }

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
// BULK ACTION EXECUTION
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
            showToast(`The '${action}' bulk action was successfully executed in D1!`);
            await loadStaticPages(); 
            updateBulkPageActionBar();
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

window.executeTrashBulkAction = async function() {
    const action = document.getElementById('bulkTrashActionSelect').value;
    const checkboxes = document.querySelectorAll('.page-checkbox:checked');
    if (!action || checkboxes.length === 0) return;

    if (action === 'delete' && !confirm("Are you sure you want to permanently delete selected pages?")) return;
    
    const btnExecute = document.getElementById('btnExecuteTrashBulkAction');
    setButtonLoading(btnExecute, true, "Processing...");

    const selectedIds = Array.from(checkboxes).map(cb => cb.value);

    try {
        const res = await fetch('/api/pages/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action, ids: selectedIds })
        });

        if (res.ok) {
            showToast(`Trash bulk action '${action}' successfully executed!`);
            await loadStaticPages(); 
            updateBulkPageActionBar();
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

window.performPageAction = async function(pageId, action) {
    if (action === 'delete' && !confirm("Permanently delete this page?")) return;
    if (action === 'trash' && !confirm("Move this page to trash?")) return;

    try {
        const res = await fetch('/api/pages/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action, ids: [pageId] })
        });

        if (res.ok) {
            showToast(`Page action '${action}' successfully executed in D1!`);
            await loadStaticPages();
        } else {
            showToast("Failed to execute page action.", "danger");
        }
    } catch(e) {
        showToast("Error executing page action.", "danger");
    }
};

window.currentPageId = '';
window.currentFilename = '';
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
        openPageManager(pageId, defaultName, defaultFilename);
    } catch (e) {
        showToast("Failed to create new page in D1: " + e.message, "danger");
    }
};

// =============================================================
// 3. OPEN PAGE MANAGER (D1 SQL & GITHUB REPO DIRECT FETCH)
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
    container.innerHTML = '<div class="text-center py-5 text-muted fst-italic">Loading page data from D1 database & GitHub repo...</div>';
    
    const modalEl = document.getElementById('pageEditorModal');
    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    bsModal.show();

    modalEl.addEventListener('hidden.bs.modal', function () {
        if (window.location.search.includes('edit=')) {
            window.history.pushState({}, '', window.location.pathname);
        }
    }, { once: true });

    // AMBIL DATA HANYA DARI ENDPOINT D1 / GITHUB DETAIL (ZERO KV)
    let pageDetail = { name: pageName, filename: fileName, mode: 'tinymce', content: '', seo: '{}', css: '', js: '' };
    try {
        const resDetail = await fetch('/api/pages/detail?id=' + encodeURIComponent(pageId));
        if (resDetail.ok) {
            pageDetail = await resDetail.json();
        }
    } catch(e){}

    let currentEditorMode = forcedMode || pageDetail.mode || 'tinymce';
    let pageContentForTinyMce = pageDetail.content || '';

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
                <div class="col-md-6"><div class="wp-card p-3 bg-white hover-bg border" onclick="openPageCssJsEditor('${pageId}', 'css')" style="cursor:pointer"><h6 class="fw-bold mb-0 small text-primary"><i class="bi bi-filetype-css me-2"></i> Page Custom CSS</h6></div></div>
                <div class="col-md-6"><div class="wp-card p-3 bg-white hover-bg border" onclick="openPageCssJsEditor('${pageId}', 'js')" style="cursor:pointer"><h6 class="fw-bold mb-0 small text-warning"><i class="bi bi-filetype-js me-2"></i> Page Custom JS</h6></div></div>
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
                </div>
                <textarea id="pageTinyMceArea" rows="15" class="form-control">${pageContentForTinyMce}</textarea>
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
                        <i class="bi bi-cloud-upload me-1"></i> Publish to GitHub
                    </button>
                </div>
                <p class="small text-muted mt-2 mb-0" style="font-size: 0.75rem;"><i class="bi bi-info-circle me-1"></i>Directly committed to GitHub repo & D1 SQL database.</p>
            </div>
            <div class="wp-card p-3 bg-white mb-3">
                <h6 class="fw-bold text-dark mb-3 border-bottom pb-2">File Info</h6>
                <div class="small text-muted mb-1">File Name / Slug:</div><div id="sidebarDisplayFilename" class="font-monospace text-dark bg-light p-2 rounded border small mb-2 text-break">${fileName}</div>
                <div class="small text-muted mb-1">Page ID:</div><div id="sidebarDisplayPageId" class="font-monospace text-dark bg-light p-2 rounded border small text-break">${pageId}</div>
            </div>
        </div>
    </div>`;

    setupOgImageUploads();
    if (currentEditorMode === 'tinymce' || currentEditorMode === 'block_library') {
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
// 4. UNIFIED SAVE PAGE (LANGSUNG D1 DATABASE & GITHUB COMMIT)
// =============================================================
window.saveStaticPageUnified = async function(targetStatus = 'draft') {
    const oldPageId = window.currentPageId;
    const titleInput = document.getElementById('modalPageTitleInput-' + oldPageId);
    const slugInput = document.getElementById('modalPageSlugInput-' + oldPageId);
    const btn = targetStatus === 'published' ? document.getElementById('btnPublish') : document.getElementById('btnSaveDraft');

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

    try {
        let rawContent = '';
        if (window.tinymce && tinymce.get('pageTinyMceArea')) {
            rawContent = tinymce.get('pageTinyMceArea').getContent();
        } else {
            const el = document.getElementById('pageTinyMceArea');
            if (el) rawContent = el.value;
        }

        const selectedRadio = document.querySelector(`input[name="editorMode-${oldPageId}"]:checked`);
        const selectedMode = selectedRadio ? selectedRadio.value : 'tinymce';

        const seoData = {
            title: document.getElementById('modalSeoTitle-' + oldPageId)?.value || title,
            description: document.getElementById('modalSeoDesc-' + oldPageId)?.value || '',
            ogImage: document.getElementById('modalSeoImage-' + oldPageId)?.value || '',
            noIndex: document.getElementById('modalSeoNoIndex-' + oldPageId)?.checked || false,
            noFollow: document.getElementById('modalSeoNoFollow-' + oldPageId)?.checked || false
        };

        // Kirim langsung ke Endpoint Backend /api/publish
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

        const pubData = await pubRes.json().catch(() => ({}));

        setButtonLoading(btn, false);
        
        if (pubRes.ok && pubData.publishedToGithub) {
            showToast("Halaman berhasil disimpan ke D1 & dikirim langsung ke Repo GitHub (docs/)!");
        } else if (pubRes.ok) {
            showToast("Tersimpan di Database D1, namun gagal commit ke GitHub.", "warning");
        } else {
            showToast(pubData.message || "Gagal mempublikasikan ke GitHub.", "danger");
        }

        setTimeout(() => {
            const modalEl = document.getElementById('pageEditorModal');
            if(modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
            loadStaticPages();
        }, 1200);
    } catch(e) {
        setButtonLoading(btn, false);
        showToast("Error occurred: " + e.message, "danger");
    }
};

// =============================================================
// 5. SAVE EDITOR MODE (UPDATE LANGSUNG DI D1 DATABASE)
// =============================================================
window.saveEditorMode = async function(pageId, evt) {
    if (evt) evt.preventDefault();
    const btn = evt ? evt.currentTarget : null;
    if (btn) setButtonLoading(btn, true, "Saving Mode...");

    const selectedRadio = document.querySelector(`input[name="editorMode-${pageId}"]:checked`);
    const selected = selectedRadio ? selectedRadio.value : 'tinymce';

    try {
        await fetch('/api/pages/create', { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ 
                id: pageId, 
                name: document.getElementById('modalPageTitleInput-' + pageId)?.value || pageId,
                filename: document.getElementById('modalPageSlugInput-' + pageId)?.value || `${pageId}.html`,
                mode: selected 
            }) 
        });

        showToast("Mode Editor berhasil diperbarui di D1 Database!");

        const pageTitle = document.getElementById('modalPageTitleInput-' + pageId)?.value || 'Page';
        const fileName = document.getElementById('modalPageSlugInput-' + pageId)?.value || 'page.html';

        if (btn) setButtonLoading(btn, false);
        openPageManager(pageId, pageTitle, fileName, selected);
    } catch(e) { 
        if (btn) setButtonLoading(btn, false);
        showToast("Gagal memperbarui mode editor.", "danger"); 
    }
};

// =============================================================
// 6. CUSTOM CSS/JS EDITOR UNTUK PAGE
// =============================================================
window.openPageCssJsEditor = function(pageId, type) {
    const title = type === 'css' ? 'Page Custom CSS' : 'Page Custom JS';
    const initialValue = type === 'css' ? (window._currentPageCss || '') : (window._currentPageJs || '');
    
    document.getElementById('currentEditKey').value = `page_${type}_${pageId}`;
    document.getElementById('currentIsGitHubFile').value = "false";
    document.getElementById('editorOverlayTitle').innerHTML = `Edit: ${title}`;
    
    const overlay = document.getElementById('customEditorOverlay');
    overlay.style.display = 'flex';
    
    const ed = document.getElementById('htmlEditor');
    ed.value = initialValue;
    
    setTimeout(() => {
        if (typeof window.initCodeMirrorEditor === 'function') {
            window.initCodeMirrorEditor('#htmlEditor', type === 'css' ? 'css' : 'javascript');
            if (window.currentCodeMirrorInstance) window.currentCodeMirrorInstance.refresh();
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
    
    if (key.startsWith('page_css_')) {
        window._currentPageCss = rawContent;
    } else if (key.startsWith('page_js_')) {
        window._currentPageJs = rawContent;
    }

    setButtonLoading(btn, false);
    showToast("CSS/JS berhasil disimpan dalam memory halaman!");
    setTimeout(() => { closeCustomEditor(); }, 800);
};

// =============================================================
// 7. GRAPESJS BUILDER INTEGRATION
// =============================================================
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
    const currentLang = localStorage.getItem('dashboard_lang') || 'en';

    iframe.srcdoc = `<!DOCTYPE html>
    <html lang="${currentLang}">
    <head>
        <meta charset="UTF-8">
        <title>GrapesJS Visual Builder</title>
        <link rel="stylesheet" href="https://unpkg.com/grapesjs@0.20.4/dist/css/grapes.min.css">
        <link rel="stylesheet" href="https://unpkg.com/grapesjs-preset-webpage@1.0.2/dist/grapesjs-preset-webpage.min.css">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
        <script src="https://unpkg.com/grapesjs"></script>
        <script src="https://unpkg.com/grapesjs-preset-webpage"></script>
        <script src="https://unpkg.com/grapesjs-blocks-basic"></script>
        <style>
            body, html { margin: 0; height: 100%; overflow: hidden; background: #1e1e1e; font-family: sans-serif; }
            #gjs-header { height: 50px; background: #212529; color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; border-bottom: 1px solid #333; }
            #gjs { height: calc(100vh - 50px); }
            .gjs-btn { padding: 6px 16px; border-radius: 4px; border: none; cursor: pointer; font-weight: bold; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; }
            .btn-success { background: #198754; color: #fff; }
            .btn-outline-light { background: transparent; color: #fff; border: 1px solid #6c757d; }
        </style>
    </head>
    <body>
        <div id="gjs-header">
            <div style="font-weight: bold; display: flex; align-items: center; gap: 8px;"><i class="bi bi-brush text-primary"></i> <span>Builder: ${pageId}</span></div>
            <div>
                <button class="gjs-btn btn-success" id="btnSaveGjs" style="margin-right: 10px;"><i class="bi bi-floppy"></i> Save to GitHub</button>
                <button class="gjs-btn btn-outline-light" id="btnExitGjs"><i class="bi bi-x-lg"></i> Close</button>
            </div>
        </div>
        <div id="gjs"></div>
        <script>
            window.editor = grapesjs.init({
                container: '#gjs',
                height: '100%', width: '100%',
                plugins: ['gjs-preset-webpage', 'gjs-blocks-basic']
            });

            document.getElementById('btnSaveGjs').addEventListener('click', async () => {
                const btnSave = document.getElementById('btnSaveGjs');
                btnSave.innerText = 'Saving...'; btnSave.disabled = true;
                try {
                    const rawHtml = window.editor.getHtml();
                    const cssData = window.editor.getCss();

                    const res = await fetch('/api/publish', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            pageId: '${pageId}',
                            filename: '${pageId}.html',
                            content: rawHtml,
                            mode: 'grapesjs',
                            css: cssData
                        })
                    });

                    if (res.ok) {
                        window.parent.postMessage({ type: 'SHOW_TOAST', message: 'Desain GrapesJS berhasil dipublish ke GitHub & D1!' }, '*');
                    } else {
                        window.parent.postMessage({ type: 'SHOW_TOAST', message: 'Gagal push ke GitHub.', typeToast: 'danger' }, '*');
                    }
                } catch(e) { 
                    window.parent.postMessage({ type: 'SHOW_TOAST', message: 'Error: ' + e.message, typeToast: 'danger' }, '*'); 
                } finally { 
                    btnSave.innerHTML = '<i class="bi bi-floppy"></i> Save to GitHub'; btnSave.disabled = false; 
                }
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
    }
    if (event.data.type === 'CLOSE_GJS') closeGrapesJS();
});

window.closeGrapesJS = function() {
    const wrapper = document.getElementById('gjs-wrapper');
    if (wrapper) wrapper.style.display = 'none';
};

// =============================================================
// DOM INITIALIZER
// =============================================================
document.addEventListener("DOMContentLoaded", async function() {
    const defaultLang = localStorage.getItem('dashboard_lang') || 'en';
    changeLanguage(defaultLang);
    
    await initUserProfileTopbar();
    await loadPageStoragePreference();
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