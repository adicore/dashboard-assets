// ==========================================
// 1. GLOBAL UTILITIES & TRANSLATIONS
// ==========================================
const translations = { id: { visit_site: "Kunjungi Situs", purge_cache: "Purge Cache" }, en: { visit_site: "Visit Site", purge_cache: "Purge Cache" } };

function changeLanguage(lang) {
    localStorage.setItem('dashboard_lang', lang);
    const langSel = document.getElementById('langSelector');
    if (langSel) langSel.value = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) el.innerText = translations[lang][key];
    });
}

function showToast(message, type = 'success') {
    const toastEl = document.getElementById('liveToast');
    const toastBody = document.getElementById('toastMessage');
    let iconClass = type === 'success' ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-warning';
    if (type === 'danger') iconClass = 'bi-x-circle-fill text-danger';
    if (type === 'info') iconClass = 'bi-info-circle-fill text-info';
    
    toastBody.innerHTML = `<i class="bi ${iconClass} me-2"></i> ${message}`;
    toastEl.className = `toast align-items-center text-white ${type === 'danger' ? 'bg-danger' : 'bg-dark'} border-0 shadow-lg`;
    new bootstrap.Toast(toastEl, { delay: 3000 }).show();
}

async function purgeCloudflareCache() {
    if (!confirm("Are you sure you want to clear all Cloudflare cache?")) return;
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Cleaning...`;
    btn.disabled = true;

    try {
        const res = await fetch('/api/cloudflare/purge-cache', { method: 'POST' });
        if (res.ok) showToast("Cloudflare cache successfully cleared (Purged)!");
        else showToast("Failed to clear cache: " + await res.text(), "danger");
    } catch (err) { showToast("A network error occurred: " + err.message, "danger");
    } finally { btn.innerHTML = originalText; btn.disabled = false; }
}

function toggleSidebar() {
    if (window.innerWidth > 768) document.body.classList.toggle('sidebar-collapsed');
    else document.body.classList.toggle('sidebar-mobile-open');
}

async function initUserProfileTopbar() {
    try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
            const user = await res.json();
            if (user.name && document.getElementById('topbarUsername')) document.getElementById('topbarUsername').innerText = user.name;
            if (user.avatar && user.avatar.trim() !== '' && document.getElementById('topbarUserAvatar')) document.getElementById('topbarUserAvatar').src = user.avatar;
            if (user.role) document.body.setAttribute('data-role', user.role);
            if (user.email) document.body.setAttribute('data-email', user.email);
        }
    } catch(e) {}
}

// ==========================================
// 2. MINIFY & FORMAT HELPER
// ==========================================
function minifyHTMLClient(html) {
    if (!html) return "";
    return html.replace(/<!--[\s\S]*?-->/gis, (match) => {
        return (match.includes('LOOP') || match.includes('IF_HAS_CHILDREN') || match.includes('END_IF')) ? match : '';
    }).replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim();
}

function formatBytes(bytes) {
    if (bytes === 0 || bytes === undefined || bytes === null || isNaN(bytes)) return '-';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

window.fileMetaData = {};
window.fetch = async function() {
    let resource = arguments[0];
    let config = arguments[1];
    let urlString = typeof resource === 'string' ? resource : (resource instanceof Request ? resource.url : '');

    if (config && config.method === 'POST' && typeof config.body === 'string') {
        try {
            const parsedBody = JSON.parse(config.body);
            if (urlString.includes('/api/github/save') && parsedBody.content && parsedBody.path && parsedBody.path.endsWith('.html')) {
                parsedBody.content = minifyHTMLClient(parsedBody.content);
                config.body = JSON.stringify(parsedBody);
            }
        } catch(e) {}
    }

    const response = await originalFetch.apply(this, arguments);

    if (urlString.includes('/api/github/tree')) {
        try {
            const clone = response.clone();
            clone.json().then(data => {
                if (Array.isArray(data)) data.forEach(f => { window.fileMetaData[f.path] = f; });
            }).catch(e=>{});
        } catch(err) {}
    }
    return response;
};

// ==========================================
// 3. FILE MANAGER LOGIC (DOCS/ ISOLATION)
// ==========================================
let cachedFilesList = [];
let currentFileManagerPath = "";

async function loadGitHubFiles() {
    const tbody = document.getElementById('fileManagerTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted fst-italic">Loading files list...</td></tr>';
    
    try {
        const res = await fetch('/api/github/tree');
        const allFiles = await res.json();
        
        // SECURITY ISOLATION: Only store and display files inside docs/ folder
        cachedFilesList = allFiles.filter(f => f.path.startsWith('docs/'));
        currentFileManagerPath = "";
        
        // Reset Select All checkbox
        const selectAllCb = document.getElementById('selectAllFiles');
        if(selectAllCb) selectAllCb.checked = false;
        updateBulkDeleteButton();
        
        renderFileManagerView(cachedFilesList);
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load file system.</td></tr>';
    }
}

function renderFileManagerView(files, searchQuery = "") {
    const tbody = document.getElementById('fileManagerTableBody');
    const breadcrumbEl = document.getElementById('fileManagerBreadcrumb');
    const backBtn = document.getElementById('fileManagerBackBtn');
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    if (currentFileManagerPath === "") {
        if (breadcrumbEl) breadcrumbEl.innerHTML = `<i class="bi bi-folder2-open text-warning fs-5"></i> <span class="text-dark fw-bold">htdocs (Root)</span>`;
        if (backBtn) backBtn.classList.add('d-none');
    } else {
        if (breadcrumbEl) breadcrumbEl.innerHTML = `<i class="bi bi-folder2-open text-warning fs-5"></i> <span style="cursor: pointer;" onclick="navigateToFolder('')" class="text-primary">htdocs</span> / <span class="fw-bold text-dark">${currentFileManagerPath}</span>`;
        if (backBtn) backBtn.classList.remove('d-none');
    }

    const basePrefix = 'docs/';
    let foldersSet = new Set();
    let directFiles = [];
    const query = searchQuery.toLowerCase().trim();

    files.forEach(f => {
        if (query) {
            if (f.path.toLowerCase().includes(query)) directFiles.push(f);
            return;
        }

        const prefix = currentFileManagerPath ? basePrefix + currentFileManagerPath + "/" : basePrefix;

        if (f.path.startsWith(prefix)) {
            let relativePath = f.path.substring(prefix.length);
            if (relativePath.includes('/')) {
                let subFolder = relativePath.split('/')[0];
                foldersSet.add(subFolder);
            } else {
                directFiles.push(f);
            }
        }
    });

    let hasContent = false;

    foldersSet.forEach(folderName => {
        hasContent = true;
        tbody.innerHTML += `
        <tr class="hover-bg" style="cursor: pointer;" onclick="navigateToFolder('${currentFileManagerPath ? currentFileManagerPath + '/' + folderName : folderName}')">
            <td class="text-center"><input type="checkbox" class="form-check-input" disabled title="Folders cannot be mass deleted"></td>
            <td class="ps-3 fw-bold text-dark">
                <i class="bi bi-folder-fill text-warning fs-5 me-2 align-middle"></i>
                <span class="font-monospace text-primary">${folderName}/</span>
            </td>
            <td class="text-center"><span class="badge bg-warning text-dark text-uppercase" style="font-size: 10px;">Folder</span></td>
            <td class="text-center"><span class="text-muted small">System Directory</span></td>
            <td class="text-end pe-3" onclick="event.stopPropagation()">
                <span class="small text-muted fst-italic"><i class="bi bi-chevron-right"></i> Open</span>
            </td>
        </tr>`;
    });

    directFiles.forEach(f => {
        hasContent = true;
        const ext = f.path.split('.').pop().toLowerCase();
        let iconClass = 'bi-file-earmark text-secondary';
        let badgeBg = 'bg-secondary';
        
        if(['html', 'htm'].includes(ext)) { iconClass = 'bi-file-earmark-code text-danger'; badgeBg = 'bg-danger'; }
        else if(['css'].includes(ext)) { iconClass = 'bi-filetype-css text-primary'; badgeBg = 'bg-primary'; }
        else if(['js'].includes(ext)) { iconClass = 'bi-filetype-js text-warning'; badgeBg = 'bg-warning text-dark'; }
        else if(['json'].includes(ext)) { iconClass = 'bi-filetype-json text-success'; badgeBg = 'bg-success'; }
        else if(['pdf'].includes(ext)) { iconClass = 'bi-file-earmark-pdf text-danger'; badgeBg = 'bg-danger'; }
        else if(['jpg','png','webp','svg'].includes(ext)) { iconClass = 'bi-file-earmark-image text-info'; badgeBg = 'bg-info'; }

        // Remove "docs/" from name display
        const prefixLength = currentFileManagerPath ? (basePrefix + currentFileManagerPath + "/").length : basePrefix.length;
        const displayName = f.path.substring(prefixLength);
        const safePath = f.path.replace(/'/g, "\\'");
        const meta = window.fileMetaData[f.path] || {};
        const sizeFmt = formatBytes(meta.size);

        tbody.innerHTML += `
        <tr>
            <td class="text-center"><input type="checkbox" class="form-check-input file-checkbox" value="${safePath}" onchange="updateBulkDeleteButton()"></td>
            <td class="ps-3 fw-bold text-dark">
                <i class="bi ${iconClass} fs-5 me-2 align-middle"></i>
                <span class="font-monospace text-dark">${displayName}</span>
            </td>
            <td class="text-center"><span class="badge bg-light text-dark border font-monospace">${sizeFmt}</span></td>
            <td class="text-center"><small class="text-muted fst-italic">via GitHub API</small></td>
            <td class="text-end pe-3">
                <div class="d-flex gap-1 justify-content-end">
                    <button class="btn btn-sm wp-btn-secondary px-2 py-1" title="Edit File" onclick="openGitHubFileEditor('${safePath}', 'File: ${safePath}')">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger px-2 py-1" title="Delete File" onclick="deleteGitHubFile('${safePath}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    });

    if (!hasContent) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted fst-italic">This folder is empty.</td></tr>';
    }
}

function navigateToFolder(folderPath) {
    currentFileManagerPath = folderPath;
    const searchEl = document.getElementById('fileManagerSearch');
    if (searchEl) searchEl.value = "";
    document.getElementById('selectAllFiles').checked = false;
    updateBulkDeleteButton();
    renderFileManagerView(cachedFilesList);
}

function goBackFolder() {
    if (currentFileManagerPath === "") return;
    let parts = currentFileManagerPath.split('/');
    parts.pop();
    currentFileManagerPath = parts.join('/');
    document.getElementById('selectAllFiles').checked = false;
    updateBulkDeleteButton();
    renderFileManagerView(cachedFilesList);
}

function filterFileManager(keyword) {
    const query = keyword.trim();
    if (query === "") renderFileManagerView(cachedFilesList);
    else renderFileManagerView(cachedFilesList, query);
}

// ==========================================
// 4. BULK ACTION LOGIC (MASS DELETE)
// ==========================================
function toggleSelectAllFiles(checkbox) {
    const checkboxes = document.querySelectorAll('.file-checkbox');
    checkboxes.forEach(cb => cb.checked = checkbox.checked);
    updateBulkDeleteButton();
}

function updateBulkDeleteButton() {
    const checked = document.querySelectorAll('.file-checkbox:checked').length;
    const btn = document.getElementById('btnBulkDelete');
    if (btn) btn.disabled = checked === 0;
}

async function bulkDeleteFiles() {
    const checkboxes = document.querySelectorAll('.file-checkbox:checked');
    if (checkboxes.length === 0) return;
    if (!confirm(`This action cannot be undone! Are you sure you want to delete ${checkboxes.length} selected files?`)) return;

    const btn = document.getElementById('btnBulkDelete');
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Deleting...`;
    btn.disabled = true;

    let successCount = 0;
    for (let cb of checkboxes) {
        try {
            const res = await fetch('/api/github/delete', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ path: cb.value })
            });
            if (res.ok) successCount++;
        } catch(e) {}
    }
    
    showToast(`${successCount} files successfully deleted in bulk!`);
    btn.innerHTML = `<i class="bi bi-trash me-1"></i> Bulk Delete`;
    document.getElementById('selectAllFiles').checked = false;
    updateBulkDeleteButton();
    loadGitHubFiles();
}

async function deleteGitHubFile(path) {
    if (!confirm(`Are you sure you want to delete ${path}?`)) return;
    try {
        const res = await fetch('/api/github/delete', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ path })
        });
        if (res.ok) {
            showToast("File successfully deleted!");
            loadGitHubFiles();
        } else {
            throw new Error();
        }
    } catch(e) {
        showToast("Failed to delete file.", "danger");
    }
}

// ==========================================
// 5. CODE EDITOR & NEW FILE
// ==========================================
async function openGitHubFileEditor(path, title) {
    document.getElementById('editorOverlayTitle').innerHTML = `Edit: ${title}`;
    document.getElementById('currentEditKey').value = path;
    document.getElementById('currentIsGitHubFile').value = "true";
    
    let mode = 'htmlmixed';
    if (path.endsWith('.css')) mode = 'css';
    if (path.endsWith('.js')) mode = 'javascript';
    if (path.endsWith('.json')) mode = 'application/json';

    const overlay = document.getElementById('customEditorOverlay');
    if (overlay) overlay.style.display = 'flex';
    
    const ed = document.getElementById('htmlEditor'); 
    if (ed) ed.value = "Loading...";
    
    try {
        const data = await (await fetch('/api/github/file?path=' + encodeURIComponent(path))).json();
        if (ed) ed.value = data.content || "";
        
        setTimeout(() => {
            if (typeof window.initCodeMirrorEditor === 'function') window.initCodeMirrorEditor('#htmlEditor', mode);
        }, 60);
    } catch (e) {
        if (ed) ed.value = "Failed to load content from GitHub.";
        setTimeout(() => {
            if (typeof window.initCodeMirrorEditor === 'function') window.initCodeMirrorEditor('#htmlEditor', mode);
        }, 60);
    }
}

function closeCustomEditor() {
    const overlay = document.getElementById('customEditorOverlay');
    if (overlay) overlay.style.display = 'none';
    if (window.currentCodeMirrorInstance) {
        window.currentCodeMirrorInstance.toTextArea();
        window.currentCodeMirrorInstance = null;
    }
}

async function saveEditorDataDualStorage() {
    const key = document.getElementById('currentEditKey').value;
    const rawContent = window.currentCodeMirrorInstance ? window.currentCodeMirrorInstance.getValue() : document.getElementById('htmlEditor').value;
    
    try {
        const minifiedContent = minifyHTMLClient(rawContent);
        const res = await fetch('/api/github/save', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ path: key, content: minifiedContent })
        });

        if (res.ok) {
            showToast("File changes successfully saved!");
            closeCustomEditor();
            loadGitHubFiles();
        } else { throw new Error(); }
    } catch(e) { showToast("Failed to save file changes.", "danger"); }
}

async function saveNewRawFile() {
    let pathInput = document.getElementById('inpNewRawPath').value.trim();
    const content = document.getElementById('inpNewRawContent').value;
    if (!pathInput) return showToast("File path cannot be empty!", "warning");
    
    // Automatically direct and lock to docs/ folder
    let fullPath = pathInput;
    if (!fullPath.startsWith('docs/')) {
        fullPath = (currentFileManagerPath ? 'docs/' + currentFileManagerPath + '/' : 'docs/') + pathInput;
    }
    
    try {
        await fetch('/api/github/save', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ path: fullPath, content })
        });
        showToast("New file successfully saved!");
        const modalEl = document.getElementById('createRawFileModal');
        if (modalEl) bootstrap.Modal.getInstance(modalEl).hide();
        loadGitHubFiles();
    } catch(e) {
        showToast("Failed to save new file.", "danger");
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
                if (visitLink && data.site_url) visitLink.href = data.site_url.trim();
            }
        }
    } catch (e) {}
}

// ==========================================
// 6. SECURE FILE UPLOAD
// ==========================================
function openUploadModal() {
    const role = document.body.getAttribute('data-role');
    if (role !== 'administrator') {
        showToast("Forbidden: Only Administrators are allowed to access the Upload feature.", "danger");
        return;
    }
    
    document.getElementById('inpUploadFile').value = '';
    document.getElementById('uploadProgress').classList.add('d-none');
    
    // Location Hint
    const loc = currentFileManagerPath ? `docs/${currentFileManagerPath}/` : 'docs/';
    document.getElementById('uploadPathHint').innerHTML = `File will be uploaded to: <b class="text-primary">${loc}</b>`;
    
    const modal = new bootstrap.Modal(document.getElementById('uploadFileModal'));
    modal.show();
}

async function processFileUpload() {
    const fileInput = document.getElementById('inpUploadFile');
    if (!fileInput.files || fileInput.files.length === 0) return showToast("Please select a file first!", "warning");
    
    const file = fileInput.files[0];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    // Safe Extensions Whitelist
    const allowedText = ['.html', '.css', '.js', '.json', '.txt', '.xml'];
    const allowedBinary = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif', '.ico', '.pdf'];
    
    if (!allowedText.includes(ext) && !allowedBinary.includes(ext)) {
        return showToast("File format is not allowed for system security!", "danger");
    }

    const btn = document.getElementById('btnStartUpload');
    const progress = document.getElementById('uploadProgress');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Uploading...';
    progress.classList.remove('d-none');

    // Lock placement in docs/ folder
    const destPath = (currentFileManagerPath ? 'docs/' + currentFileManagerPath + '/' : 'docs/') + file.name;

    try {
        if (allowedText.includes(ext)) {
            // If text file, read as string and send via GitHub Save Text
            const reader = new FileReader();
            reader.onload = async function(e) {
                const content = e.target.result;
                const res = await fetch('/api/github/save', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ path: destPath, content: content, message: "Upload file " + file.name })
                });
                finalizeUpload(res);
            };
            reader.readAsText(file);
        } else {
            // If binary file (image, pdf), read as Base64
            const reader = new FileReader();
            reader.onload = async function(e) {
                const content = e.target.result; 
                const res = await fetch('/api/github/upload-image', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ filename: destPath, content: content, storage_provider: 'github' })
                });
                finalizeUpload(res);
            };
            reader.readAsDataURL(file);
        }
    } catch(e) {
        showToast("A network error occurred", "danger");
        resetUploadBtn();
    }
}

async function finalizeUpload(res) {
    if (res.ok) {
        showToast("File successfully uploaded!");
        bootstrap.Modal.getInstance(document.getElementById('uploadFileModal')).hide();
        loadGitHubFiles();
    } else {
        showToast("Failed to upload file: " + await res.text(), "danger");
    }
    resetUploadBtn();
}

function resetUploadBtn() {
    const btn = document.getElementById('btnStartUpload');
    btn.disabled = false;
    btn.innerHTML = 'Upload File';
    document.getElementById('uploadProgress').classList.add('d-none');
}


// ==========================================
// 7. PAGE INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    const defaultLang = localStorage.getItem('dashboard_lang') || 'en';
    changeLanguage(defaultLang);
    initUserProfileTopbar();
    loadGitHubFiles();
    updateVisitSiteLink();
});