// ==========================================
// 1. GLOBAL UTILITIES, TRANSLATIONS & TOAST
// ==========================================
const translations = {
    id: {
        visit_site: "Kunjungi Situs",
        purge_cache: "Purge Cache",
        media_title: "Media Library (Galeri Gambar)",
        btn_uploadfile: "Unggah Berkas Baru",
        loading_gallery: "Memuat galeri gambar..."
    },
    en: {
        visit_site: "Visit Site",
        purge_cache: "Purge Cache",
        media_title: "Media Library",
        btn_uploadfile: "Upload New File",
        loading_gallery: "Loading gallery..."
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

function toggleSidebar() {
    if (window.innerWidth > 768) document.body.classList.toggle('sidebar-collapsed');
    else document.body.classList.toggle('sidebar-mobile-open');
}

// ==========================================
// 2. PROFILE, TOPBAR INITIALIZATION & STORAGE
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

async function loadStoragePreference() {
    try {
        const res = await fetch('/api/kv?key=global:settings');
        if (res.ok) {
            const txt = await res.text();
            if (txt) {
                const settings = JSON.parse(txt);
                const defaultStorage = settings.default_storage || 'github';
                
                const headerActions = document.getElementById('mediaGalleryHeaderActions');
                if (headerActions) {
                    const storageDropdownHtml = `
                        <select id="galleryStorageProvider" class="form-select form-select-sm border-secondary fw-semibold bg-light me-2" style="width: auto;">
                            <option value="github" ${defaultStorage === 'github' ? 'selected' : ''}>Store in: GitHub Repo</option>
                            <option value="imgbb" ${defaultStorage === 'imgbb' ? 'selected' : ''}>Store in: ImgBB Cloud</option>
                        </select>
                    `;
                    headerActions.insertAdjacentHTML('afterbegin', storageDropdownHtml);
                }
            }
        }
    } catch(e) { console.error("Failed to load storage preferences:", e); }
}

// ==========================================
// 3. Image Compression & Gallery Core
// ==========================================
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
                            resolve({ filename: file.name, content: readerOriginal.result.split(',')[1] });
                        };
                        readerOriginal.readAsDataURL(file);
                        return;
                    }

                    const readerBase64 = new FileReader();
                    readerBase64.onloadend = () => {
                        const originalName = file.name.includes('.') ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;
                        resolve({ filename: `${originalName}.avif`, content: readerBase64.result.split(',')[1] });
                    };
                    readerBase64.readAsDataURL(blob);

                } catch (error) {
                    console.error("Compression failed, using original file:", error);
                    const readerFallback = new FileReader();
                    readerFallback.onloadend = () => { resolve({ filename: file.name, content: readerFallback.result.split(',')[1] }); };
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

// COMBINING GITHUB & EXTERNAL DATABASE
async function loadImagesGallery() {
    const container = document.getElementById('galleryContainer');
    if (!container) return;
    container.innerHTML = '<div class="col-12 text-muted small fst-italic">Loading combined image gallery...</div>';
    
    try {
        // Fetch GitHub and D1 (External) data in parallel
        const [githubRes, externalRes, settingsRes] = await Promise.all([
            fetch('/api/github/tree?prefix=docs/'),
            fetch('/api/media/external'),
            fetch('/api/kv?key=global:settings')
        ]);
        
        const ghFiles = githubRes.ok ? await githubRes.json() : [];
        const extFiles = externalRes.ok ? await externalRes.json() : [];
        
        let settings = JSON.parse(await settingsRes.text() || "{}");
        let baseUrl = settings.site_url ? settings.site_url.trim().replace(/\/+$/, '') : "";
        
        const visitLink = document.getElementById('visitSiteLink');
        if (visitLink && settings.site_url) visitLink.href = baseUrl;
        
        const userRole = (document.body.getAttribute('data-role') || 'administrator').toLowerCase();
        
        // Combine all images into a single uniform array
        let allImages = [];
        
        // 1. Extract images from GitHub (Regex PERBAIKAN: /\\.(jpg|jpeg|png|webp|gif|svg|avif)$/i)
        const ghImages = Array.isArray(ghFiles) ? ghFiles.filter(f => f && f.path && /\.(jpg|jpeg|png|webp|gif|svg|avif)$/i.test(f.path)) : [];
        
        ghImages.forEach(img => {
            const cleanPath = img.path.replace(/^docs\//, '');
            const filename = img.path.split('/').pop();
            
            allImages.push({
                url: baseUrl ? `${baseUrl}/${cleanPath}` : `/${cleanPath}`,
                path: img.path,
                name: filename,
                sha: img.sha || ('gh-' + Math.random().toString(36).substring(2, 9)),
                isExternal: false,
                provider: 'github',
                sortTime: 0 // GitHub tree API has no date, place at bottom
            });
        });
        
        // 2. Extract images from External Database (ImgBB, etc.)
        if (Array.isArray(extFiles)) {
            extFiles.forEach(ext => {
                allImages.push({
                    url: ext.url,
                    path: ext.url, // Delete path is its URL
                    name: ext.file_name || ext.url.split('/').pop(),
                    sha: 'ext-' + ext.id,
                    isExternal: true,
                    provider: ext.provider || 'cloud',
                    sortTime: ext.created_at ? new Date(ext.created_at).getTime() : Date.now()
                });
            });
        }
        
        // Sort (Prioritize newly uploaded external images)
        allImages.sort((a, b) => b.sortTime - a.sortTime);

        container.innerHTML = "";
        
        if (allImages.length === 0) {
            container.innerHTML = '<div class="col-12 text-muted small fst-italic">No images found.</div>';
            return;
        }
        
        allImages.forEach(img => {
            let deleteBtnHtml = (userRole === 'administrator') ? `<button class="btn btn-outline-danger btn-sm w-100 py-1" onclick="deleteGitHubFile('${img.path}', ${img.isExternal})"><i class="bi bi-trash me-1"></i>Delete</button>` : '';
            
            // Visual badge to differentiate storage origin
            let providerBadge = img.isExternal 
                ? `<span class="badge bg-primary text-white mb-2 shadow-sm" style="font-size:0.65rem;">${(img.provider || 'EXTERNAL').toUpperCase()} CLOUD</span>`
                : `<span class="badge bg-dark text-white mb-2 shadow-sm" style="font-size:0.65rem;">GITHUB REPO</span>`;
            
            container.innerHTML += `
            <div class="col-md-4 col-lg-3">
                <div class="wp-card bg-white h-100 overflow-hidden d-flex flex-column justify-content-between position-relative">
                    <div class="bg-light p-2 text-center border-bottom" style="height: 150px; display: flex; align-items: center; justify-content: center;">
                        <img src="${img.url}" alt="${img.name}" style="max-height: 100%; max-width: 100%; object-fit: contain;" class="rounded" loading="lazy">
                    </div>
                    <div class="p-3">
                        ${providerBadge}
                        <h6 class="fw-bold small text-truncate mb-2 text-dark" title="${img.name}">${img.name}</h6>
                        <div class="input-group input-group-sm mb-2">
                            <input type="text" class="form-control form-control-sm bg-light font-monospace" value="${img.url}" readonly id="imgurl-${img.sha}">
                            <button class="btn btn-outline-secondary btn-sm" type="button" onclick="navigator.clipboard.writeText(document.getElementById('imgurl-${img.sha}').value); showToast('Image URL copied to clipboard!');"><i class="bi bi-clipboard"></i></button>
                        </div>
                        ${deleteBtnHtml}
                    </div>
                </div>
            </div>`;
        });
    } catch(e) {
        console.error("Gallery Error:", e);
        container.innerHTML = '<div class="col-12 text-danger small">Failed to load combined image gallery.</div>';
    }
}

async function uploadGalleryImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const storageProvider = document.getElementById('galleryStorageProvider')?.value || 'github';
    showToast(`Compressing & Uploading Image to ${storageProvider === 'imgbb' ? 'ImgBB' : 'GitHub'}...`, "info");
    
    try {
        const compressed = await compressAndConvertImage(file);
        const res = await fetch('/api/github/upload-image', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                filename: Date.now() + '-' + compressed.filename, 
                content: compressed.content,
                storage_provider: storageProvider 
            })
        });
        
        if (res.ok) {
            showToast(`Image successfully uploaded to ${storageProvider === 'imgbb' ? 'ImgBB' : 'GitHub'}!`);
            // Reload gallery because ImgBB images are now automatically logged in database!
            loadImagesGallery();
        } else {
            throw new Error(await res.text());
        }
    } catch(err) {
        showToast("Failed to upload image: " + err.message, "danger");
    } finally {
        e.target.value = '';
    }
}

async function deleteGitHubFile(path, isExternal = false) {
    let confirmMsg = isExternal 
        ? `Are you sure you want to remove this external image from the gallery tracker? (Note: It will only be removed from this dashboard database, not from the external provider's server).` 
        : `Are you sure you want to delete the file ${path} from GitHub?`;
        
    if (!confirm(confirmMsg)) return;
    
    try {
        const res = await fetch('/api/github/delete', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ path })
        });
        if (res.ok) {
            showToast("File successfully removed!");
            loadImagesGallery();
        } else {
            throw new Error(await res.text());
        }
    } catch(e) {
        showToast("Failed to delete file.", "danger");
    }
}

// ==========================================
// 4. PAGE INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    const defaultLang = localStorage.getItem('dashboard_lang') || 'en';
    changeLanguage(defaultLang);
    initUserProfileTopbar();
    loadStoragePreference();
    loadImagesGallery();
});