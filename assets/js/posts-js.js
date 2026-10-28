// ==========================================
// 1. GLOBAL UTILITIES, TRANSLATIONS & TOAST
// ==========================================
const translations = {
    id: {
        visit_site: "Kunjungi Situs",
        purge_cache: "Purge Cache",
        posts_title: "Posts",
        posts_desc: "Kelola artikel blog, ubah Judul, SEO, dan kategori.",
        btn_newpost: "Add New",
        bulk_selected: "terpilih",
        bulk_choose: "-- Aksi Massal --",
        bulk_publish: "Publish",
        bulk_draft: "Ubah ke Draft",
        bulk_category: "Ubah Kategori",
        bulk_delete: "Hapus",
        bulk_apply: "Terapkan",
        loading_posts: "Memuat daftar artikel...",
        seo_settings: "SEO & Meta Settings",
        seo_keyword: "Focus Keyword",
        seo_ogimage: "OG Image",
        seo_metadesc: "Meta Description",
        publish_sched: "Simpan & Penjadwalan",
        label_sched: "Jadwal Rilis Otomatis (Opsional)",
        btn_draft: "Draft",
        btn_publish: "Simpan Postingan",
        th_category: "Kategori",
        th_slug: "Slug"
    },
    en: {
        visit_site: "Visit Site",
        purge_cache: "Purge Cache",
        posts_title: "Posts",
        posts_desc: "Manage blog posts and articles efficiently.",
        btn_newpost: "Add New",
        bulk_selected: "selected",
        bulk_choose: "-- Bulk Actions --",
        bulk_publish: "Publish",
        bulk_draft: "Change to Draft",
        bulk_category: "Change Category",
        bulk_delete: "Delete",
        bulk_apply: "Apply",
        loading_posts: "Loading posts list...",
        seo_settings: "SEO & Meta Settings",
        seo_keyword: "Focus Keyword",
        seo_ogimage: "OG Image",
        seo_metadesc: "Meta Description",
        publish_sched: "Save & Scheduling",
        label_sched: "Automatic Release Schedule",
        btn_draft: "Draft",
        btn_publish: "Save Post",
        th_category: "Category",
        th_slug: "Slug"
    }
};

window.renderDynamicVariables = function(text) {
    if (!text) return '';
    const now = new Date();
    const currentYear = String(now.getFullYear());
    const currentMonth = now.toLocaleString('en-US', { month: 'long' });
    const currentMonthNum = String(now.getMonth() + 1).padStart(2, '0');

    return text
        .replace(/\{\{(CURRENT_YEAR|current_year|YEAR)\}\}/g, currentYear)
        .replace(/\{\{(CURRENT_MONTH|current_month|MONTH)\}\}/g, currentMonth)
        .replace(/\{\{(CURRENT_MONTH_NUM|current_month_num)\}\}/g, currentMonthNum);
};

window.updateDynamicPreview = function(inputId, previewId) {
    const inputEl = document.getElementById(inputId);
    const previewEl = document.getElementById(previewId);
    if (!inputEl || !previewEl) return;

    const val = inputEl.value || '';
    if (val.includes('{{')) {
        previewEl.innerText = 'Preview: ' + window.renderDynamicVariables(val);
        previewEl.classList.remove('d-none');
    } else {
        previewEl.classList.add('d-none');
    }
};

// Real-time character counter for Title, Meta Description
window.updateCharCounters = function() {
    // Title Counter (Max 70)
    const titleEl = document.getElementById('inpGitHubPostTitle');
    const titleCounter = document.getElementById('titleCharCount');
    if (titleEl && titleCounter) {
        const len = titleEl.value.length;
        titleCounter.innerText = `${len} / 70 chars`;
        titleCounter.className = len > 70 ? 'text-danger fw-bold' : (len >= 50 ? 'text-success fw-bold' : 'text-muted fw-semibold');
    }

    // Meta Description Counter (Max 160)
    const descEl = document.getElementById('inpGitHubPostDesc');
    const descCounter = document.getElementById('descCharCount');
    if (descEl && descCounter) {
        const len = descEl.value.length;
        descCounter.innerText = `${len} / 160 chars`;
        descCounter.className = len > 160 ? 'text-danger fw-bold' : (len >= 130 ? 'text-success fw-bold' : 'text-muted fw-semibold');
    }
};

function setupTinyMceCounter(editor) {
    let counterContainer = document.getElementById('tinymceCharCount');
    if (!counterContainer) {
        counterContainer = document.createElement('div');
        counterContainer.id = 'tinymceCharCount';
        counterContainer.className = 'text-end text-muted mt-1 px-1';
        counterContainer.style.cssText = 'font-size: 11px; font-weight: 500;';
        const editorContainer = editor.getElement().parentNode;
        if (editorContainer) editorContainer.appendChild(counterContainer);
    }

    const updateContentCount = () => {
        const rawText = editor.getContent({ format: 'text' }).trim();
        const charCount = rawText.length;
        const wordCount = rawText ? rawText.split(/\s+/).length : 0;
        
        counterContainer.innerHTML = `Words: <strong>${wordCount}</strong> | Characters: <strong>${charCount}</strong>`;
    };

    editor.on('keyup change SetContent input', updateContentCount);
    updateContentCount();
}

window.setupDynamicPreviewListeners = function() {
    const titleInput = document.getElementById('inpGitHubPostTitle');
    const descInput = document.getElementById('inpGitHubPostDesc');

    if (titleInput && !titleInput.dataset.previewBound) {
        titleInput.dataset.previewBound = "true";
        titleInput.addEventListener('input', () => {
            window.updateDynamicPreview('inpGitHubPostTitle', 'titlePreviewHelper');
            window.updateCharCounters();
        });
        titleInput.addEventListener('change', () => {
            window.updateDynamicPreview('inpGitHubPostTitle', 'titlePreviewHelper');
            window.updateCharCounters();
        });
    }

    if (descInput && !descInput.dataset.previewBound) {
        descInput.dataset.previewBound = "true";
        descInput.addEventListener('input', () => {
            window.updateDynamicPreview('inpGitHubPostDesc', 'descPreviewHelper');
            window.updateCharCounters();
        });
        descInput.addEventListener('change', () => {
            window.updateDynamicPreview('inpGitHubPostDesc', 'descPreviewHelper');
            window.updateCharCounters();
        });
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
    if (!confirm("Clear all Cloudflare cache?")) return;
    try {
        const res = await fetch('/api/cloudflare/purge-cache', { method: 'POST' });
        if (res.ok) showToast("Cloudflare cache successfully purged!");
        else showToast("Failed to purge cache.", "danger");
    } catch (err) {
        showToast("Network error occurred.", "danger");
    }
}

function toggleSidebar() {
    if (window.innerWidth > 768) document.body.classList.toggle('sidebar-collapsed');
    else document.body.classList.toggle('sidebar-mobile-open');
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

// ==========================================
// STATUS BADGES RENDER HELPERS
// ==========================================
function renderPostStatusIcon(status) {
    const st = (status || 'published').toLowerCase();
    if (st === 'published') {
        return `<span class="badge bg-success p-2 rounded-2 d-inline-flex align-items-center justify-content-center" style="width: 28px; height: 28px;" data-bs-toggle="tooltip" title="Published"><i class="bi bi-upload text-white fs-7"></i></span>`;
    } else if (st === 'draft') {
        return `<span class="badge bg-warning p-2 rounded-2 d-inline-flex align-items-center justify-content-center" style="width: 28px; height: 28px;" data-bs-toggle="tooltip" title="Draft"><i class="bi bi-pencil-square text-dark fs-7"></i></span>`;
    } else if (st === 'scheduled') {
        return `<span class="badge bg-info p-2 rounded-2 d-inline-flex align-items-center justify-content-center" style="width: 28px; height: 28px;" data-bs-toggle="tooltip" title="Scheduled"><i class="bi bi-clock-history text-white fs-7"></i></span>`;
    } else if (st === 'trash') {
        return `<span class="badge bg-secondary p-2 rounded-2 d-inline-flex align-items-center justify-content-center" style="width: 28px; height: 28px;" data-bs-toggle="tooltip" title="Trash"><i class="bi bi-trash text-white fs-7"></i></span>`;
    }
    return `<span class="badge bg-secondary p-2 rounded-2 d-inline-flex align-items-center justify-content-center" style="width: 28px; height: 28px;" data-bs-toggle="tooltip" title="${st}"><i class="bi bi-question-circle text-white fs-7"></i></span>`;
}

function renderPostIndexIcon(isIndexed) {
    if (isIndexed) {
        return `<span class="badge bg-success p-2 rounded-2 d-inline-flex align-items-center justify-content-center" style="width: 28px; height: 28px;" data-bs-toggle="tooltip" title="Article Indexed"><i class="bi bi-google text-white fs-7"></i></span>`;
    } else {
        return `<span class="badge bg-secondary p-2 rounded-2 d-inline-flex align-items-center justify-content-center" style="width: 28px; height: 28px;" data-bs-toggle="tooltip" title="Article Not Indexed"><i class="bi bi-dash-circle text-white fs-7"></i></span>`;
    }
}

// ==========================================
// 1.B POSTS STORAGE PREFERENCE
// ==========================================
let currentPostStorageProvider = 'github';

async function loadPostStoragePreference() {
    try {
        const res = await fetch('/api/kv?key=global:settings');
        if (res.ok) {
            const txt = await res.text();
            if (txt) {
                const settings = JSON.parse(txt);
                currentPostStorageProvider = settings.storage_provider_posts || settings.default_storage || 'github';
            }
        }
    } catch(e) {}
}

// ==========================================
// IMAGE COMPRESSION & CONVERSION TO AVIF
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
                    console.error("Dynamic AVIF compression failed, using original file:", error);
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

// ==========================================
// EXPAND / COLLAPSE SYSTEM (TAGS & CATEGORIES)
// ==========================================
let isTagsExpanded = false;
window.toggleTagsExpand = function() {
    const container = document.getElementById('tags-container');
    const btn = document.getElementById('btnToggleTags');
    if (!container || !btn) return;

    isTagsExpanded = !isTagsExpanded;
    if (isTagsExpanded) {
        container.style.maxHeight = '500px';
        container.style.overflowY = 'auto';
        btn.innerHTML = '<i class="bi bi-chevron-up me-1"></i> Collapse';
    } else {
        container.style.maxHeight = '130px';
        container.style.overflowY = 'hidden';
        btn.innerHTML = '<i class="bi bi-chevron-down me-1"></i> Expand';
    }
};

let isCategoryExpanded = false;
window.toggleCategoryExpand = function() {
    const container = document.getElementById('category-container');
    const btn = document.getElementById('btnToggleCategory');
    if (!container || !btn) return;

    isCategoryExpanded = !isCategoryExpanded;
    if (isCategoryExpanded) {
        container.style.maxHeight = '400px';
        container.style.overflowY = 'auto';
        btn.innerHTML = '<i class="bi bi-chevron-up me-1"></i> Collapse';
    } else {
        container.style.maxHeight = '90px';
        container.style.overflowY = 'hidden';
        btn.innerHTML = '<i class="bi bi-chevron-down me-1"></i> Expand';
    }
};

// ==========================================
// TAGS / CHIPS INPUT SYSTEM
// ==========================================
let postTagsArray = [];

window.renderTagsUI = function() {
    const tagsContainer = document.getElementById('tags-container');
    const tagInputField = document.getElementById('tag-input-field');
    const hiddenTagsInput = document.getElementById('inpPostTags');
    
    if (!tagsContainer || !tagInputField || !hiddenTagsInput) return;

    document.querySelectorAll('.tag-chip').forEach(el => el.remove());
    
    postTagsArray.forEach((tag, index) => {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag-chip';
        tagEl.innerHTML = `${tag} <span class="close-btn" data-index="${index}">&#x2715;</span>`;
        tagsContainer.insertBefore(tagEl, tagInputField);
    });

    hiddenTagsInput.value = postTagsArray.join(', ');
};

window.syncTagsToUI = function() {
    const hiddenTagsInput = document.getElementById('inpPostTags');
    if (hiddenTagsInput && hiddenTagsInput.value.trim() !== "") {
        postTagsArray = hiddenTagsInput.value.split(',').map(tag => tag.trim()).filter(Boolean);
    } else {
        postTagsArray = [];
    }
    renderTagsUI();
};

// ==========================================
// CATEGORY CHIPS SYSTEM
// ==========================================
let postCategoriesArray = [];

window.removeCategoryChip = function(e) {
    if (e) e.stopPropagation();
    postCategoriesArray = [];
    const hiddenInput = document.getElementById('inpGitHubPostCategory');
    if (hiddenInput) hiddenInput.value = '';
    renderCategoriesUI();
};

window.renderCategoriesUI = function() {
    const container = document.getElementById('category-container');
    const inputField = document.getElementById('category-input-field');
    const hiddenInput = document.getElementById('inpGitHubPostCategory');

    if (!container || !hiddenInput) return;

    container.querySelectorAll('.category-chip').forEach(el => el.remove());

    let cat = (postCategoriesArray.length > 0 && postCategoriesArray[0]) 
        ? String(postCategoriesArray[0]).trim() 
        : String(hiddenInput.value || '').trim();

    if (cat && cat !== '') {
        postCategoriesArray = [cat];
        hiddenInput.value = cat;

        const chip = document.createElement('span');
        chip.className = 'tag-chip category-chip badge bg-light text-dark border py-2 px-3 text-decoration-none hover-bg-primary hover-text-white';
        chip.style.cssText = 'display: inline-flex !important; align-items: center; gap: 6px; padding: 5px 10px; font-size: 12px; font-weight: 500; border-radius: 4px;';
        chip.innerHTML = `${cat} <span class="close-btn" style="cursor:pointer; font-weight:bold; margin-left:4px;" onclick="window.removeCategoryChip(event)">&#x2715;</span>`;

        if (inputField && inputField.parentNode === container) {
            container.insertBefore(chip, inputField);
        } else {
            container.appendChild(chip);
        }
    } else {
        hiddenInput.value = '';
        postCategoriesArray = [];
    }
};

window.syncCategoriesToUI = function() {
    const hiddenInput = document.getElementById('inpGitHubPostCategory');
    if (hiddenInput && hiddenInput.value.trim() !== '') {
        let rawVal = hiddenInput.value.trim();
        if (rawVal.includes(',')) rawVal = rawVal.split(',')[0].trim();
        postCategoriesArray = [rawVal].filter(Boolean);
    } else {
        postCategoriesArray = [];
    }
    renderCategoriesUI();
};

function parseCategoryFromResponse(postData) {
    if (!postData) return "General";
    const raw = postData.category || postData.categories || postData.post_category || postData.cat || "General";
    if (Array.isArray(raw)) return raw.length > 0 ? String(raw[0]).trim() : "General";
    if (typeof raw === 'object' && raw !== null) return raw.name || raw.title || raw.slug || "General";
    if (typeof raw === 'string' && raw.trim() !== '') return raw.split(',')[0].trim();
    return "General";
}

window.generateAiCategory = async function() {
    const rawTitle = document.getElementById('inpGitHubPostTitle')?.value.trim();
    if (!rawTitle) return showToast("Please enter the post title first.", "warning");
    const title = window.renderDynamicVariables(rawTitle);

    showToast("Analyzing category with AI...", "warning");
    try {
        let categoryName = "";
        
        try {
            const resCat = await fetch('/api/ai/category', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: title })
            });
            if (resCat.ok) {
                const dataCat = await resCat.json();
                categoryName = dataCat.category || dataCat.name || "";
            }
        } catch(e) {}

        if (!categoryName) {
            const resKw = await fetch('/api/ai/keywords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: title })
            });
            if (resKw.ok) {
                const dataKw = await resKw.json();
                if (dataKw.keywords) {
                    categoryName = dataKw.keywords.split(',')[0].trim();
                }
            }
        }

        if (categoryName) {
            let cleanCat = categoryName.replace(/^["']|["']\$/g, '').trim();
            if (cleanCat.split(' ').length > 3) {
                cleanCat = cleanCat.split(' ').slice(0, 2).join(' ');
            }
            cleanCat = cleanCat.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());

            postCategoriesArray = [cleanCat];
            const hiddenCat = document.getElementById('inpGitHubPostCategory');
            if (hiddenCat) hiddenCat.value = cleanCat;

            const catInputField = document.getElementById('category-input-field');
            if (catInputField) catInputField.value = '';

            renderCategoriesUI();
            showToast("Automatic category successfully generated!");
        } else {
            showToast("Failed to generate category from AI.", "warning");
        }
    } catch (err) {
        showToast("Failed to generate category: " + err.message, "danger");
    }
};

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
// 3. OG IMAGE UPLOAD FEATURE
// ==========================================
function setupOgImageUploads() {
    document.querySelectorAll('input[type="text"], input:not([type])').forEach(input => {
        if (input.dataset.ogUploadInitialized || input.id === 'apiBlogId' || input.id === 'apiKeyBlogger') return;
        const container = input.closest('.mb-3, .mb-4, .form-group, div');
        if (!container) return;
        
        const textContent = container.textContent || '';
        const isOgField = textContent.includes('OG Image') || textContent.includes('Fallback Default OG Image') || 
                          (input.id && input.id.toLowerCase().includes('og')) || 
                          (input.name && input.name.toLowerCase().includes('og'));
                          
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
            btn.innerHTML = '<i class="bi bi-cloud-upload me-1"></i> Upload Image';
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
                                storage_provider: currentPostStorageProvider 
                            })
                        });
                        
                        if (res.ok) {
                            const data = await res.json();
                            input.value = data.url;
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            showToast(`Image successfully uploaded to ${currentPostStorageProvider === 'imgbb' ? 'ImgBB' : 'GitHub'}!`);
                        } else {
                            showToast('Upload failed: ' + await res.text(), 'danger');
                        }
                    } catch (err) { 
                        showToast('An error occurred: ' + err.message, 'danger'); 
                    } finally {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="bi bi-cloud-upload me-1"></i> Upload Image';
                        fileInput.value = '';
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    });
}
setInterval(setupOgImageUploads, 1000);

// ==========================================
// 4. POST MANAGEMENT
// ==========================================
let currentPostPage = 1;
let currentPostStatusFilter = 'all';
let currentSortColumn = 'created_at';
let currentSortOrder = 'DESC';
let currentBylineFilter = '';
let currentDateType = 'created';
let currentDateRange = '';
const itemsPerPage = 50;
let currentPostContent = "";

async function initPostsModule() {
    await loadPostStoragePreference(); 
    await loadPostCounts();
    await loadAndRenderPosts();
    await loadAnalyticsSummary();
    
    const postModalEl = document.getElementById('createPostModal');
    if (postModalEl) {
        postModalEl.addEventListener('shown.bs.modal', function () {
            const isEdit = document.getElementById('inpPostIsEdit')?.value === "true";
            if (!isEdit) {
                initPostTinyMce(currentPostContent);
            }
            renderCategoriesUI();
            window.setupDynamicPreviewListeners();
            window.updateDynamicPreview('inpGitHubPostTitle', 'titlePreviewHelper');
            window.updateDynamicPreview('inpGitHubPostDesc', 'descPreviewHelper');
            window.updateCharCounters();
        });

        postModalEl.addEventListener('hidden.bs.modal', function () {
            if (window.location.search.includes('edit=')) {
                window.history.pushState({}, '', window.location.pathname);
            }
            if (window.tinymce && tinymce.get('inpGitHubPostContent')) {
                tinymce.get('inpGitHubPostContent').remove();
            }
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const editSlug = urlParams.get('edit');
    if (editSlug) {
        openPostEditor(editSlug);
    }
}

async function loadPostCounts() {
    try {
        const res = await fetch('/api/posts/counts');
        if (res.ok) {
            const counts = await res.json();
            if (document.getElementById('countAll')) document.getElementById('countAll').innerText = counts.all || 0;
            if (document.getElementById('countTrash')) document.getElementById('countTrash').innerText = counts.trash || 0;
        }
    } catch(e) {}
}

window.filterPostsByStatus = function(status, event) {
    if (event) event.preventDefault();
    currentPostStatusFilter = status;
    currentPostPage = 1;

    document.querySelectorAll('#postStatusTabs .emdash-tab-btn').forEach(el => el.classList.remove('active', 'text-dark', 'fw-bold'));
    document.querySelectorAll('#postStatusTabs .emdash-tab-btn').forEach(el => el.classList.add('text-muted'));
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active', 'fw-bold');
        event.currentTarget.classList.remove('text-muted');
    }

    loadAndRenderPosts();
};

window.filterPostsByDropdownStatus = function(status, labelText, event) {
    if (event) event.preventDefault();
    currentPostStatusFilter = status;
    currentPostPage = 1;
    
    const btnDropdown = document.getElementById('dropdownStatusBtn');
    if (btnDropdown) btnDropdown.innerHTML = labelText;

    loadAndRenderPosts();
};

window.filterPostsByByline = function(byline, labelText, event) {
    if (event) event.preventDefault();
    currentBylineFilter = byline;
    currentPostPage = 1;

    const btnDropdown = document.getElementById('dropdownBylinesBtn');
    if (btnDropdown) btnDropdown.innerHTML = labelText;

    loadAndRenderPosts();
};

window.changeDateTypeFilter = function(type, labelText, event) {
    if (event) event.preventDefault();
    currentDateType = type;

    const btnDropdown = document.getElementById('dropdownDateTypeBtn');
    if (btnDropdown) btnDropdown.innerHTML = labelText;

    loadAndRenderPosts();
};

window.applyDateRangeFilter = function(rangeValue) {
    currentDateRange = rangeValue;
    currentPostPage = 1;
    loadAndRenderPosts();
};

window.sortPostsByColumn = function(column) {
    if (currentSortColumn === column) {
        currentSortOrder = currentSortOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
        currentSortColumn = column;
        currentSortOrder = 'ASC';
    }
    
    document.querySelectorAll('th[onclick^="sortPostsByColumn"]').forEach(th => {
        const icon = th.querySelector('i');
        if (icon) {
            icon.className = "bi bi-chevron-expand small text-muted";
        }
    });

    const activeTh = document.querySelector(`th[onclick="sortPostsByColumn('${column}')"]`);
    if (activeTh) {
        const activeIcon = activeTh.querySelector('i');
        if (activeIcon) {
            activeIcon.className = currentSortOrder === 'ASC' ? "bi bi-chevron-up small text-primary fw-bold" : "bi bi-chevron-down small text-primary fw-bold";
        }
    }

    loadAndRenderPosts();
};

window.loadServerPostPage = function(page) {
    if (page < 1) return;
    currentPostPage = page;
    loadAndRenderPosts();
};

window.updateBulkActionOptions = function() {
    const selectEl = document.getElementById('bulkActionSelect');
    if (!selectEl) return;
    
    const isTrashView = currentPostStatusFilter === 'trash';
    const options = selectEl.querySelectorAll('option');
    
    const trashOnlyActions = ['restore_draft', 'restore_published', 'delete_permanent'];
    const regularActions = ['publish', 'draft', 'category', 'google_index', 'trash'];
    
    options.forEach(opt => {
        const val = opt.value;
        if (!val) return; 
        
        if (isTrashView) {
            if (trashOnlyActions.includes(val)) {
                opt.style.display = '';
                opt.hidden = false;
                opt.disabled = false;
            } else if (regularActions.includes(val)) {
                opt.style.display = 'none';
                opt.hidden = true;
                opt.disabled = true;
            }
        } else {
            if (trashOnlyActions.includes(val)) {
                opt.style.display = 'none';
                opt.hidden = true;
                opt.disabled = true;
            } else if (regularActions.includes(val)) {
                opt.style.display = '';
                opt.hidden = false;
                opt.disabled = false;
            }
        }
    });
    
    selectEl.value = ''; 
    if (typeof toggleBulkActionInput === 'function') toggleBulkActionInput();
};

async function loadAndRenderPosts() {
    const tbody = document.getElementById('githubPostsTableBody');
    if (!tbody) return;

    if (typeof updateBulkActionOptions === 'function') {
        updateBulkActionOptions();
    }

    try {
        let queryParams = new URLSearchParams({
            max: itemsPerPage,
            page: currentPostPage,
            status: currentPostStatusFilter,
            sort: currentSortColumn,
            order: currentSortOrder
        });

        if (currentBylineFilter) queryParams.append('byline', currentBylineFilter);
        if (currentDateRange) {
            queryParams.append('date_type', currentDateType);
            queryParams.append('date_range', currentDateRange);
        }

        const res = await fetch(`/api/posts/list?${queryParams.toString()}`);
        if (res.ok) {
            const posts = await res.json();
            tbody.innerHTML = '';
            
            if (!posts || posts.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No posts found.</td></tr>';
            } else {
                posts.forEach(post => {
                    const tr = document.createElement('tr');
                    const postStatus = (post.status === 'published' || !post.status) ? 'published' : post.status;
                    const statusBadgeHtml = renderPostStatusIcon(postStatus);
                    
                    const pubDate = post.created_at ? new Date(post.created_at).toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'}) : '-';
                    const rawSiteUrl = document.getElementById('inpSiteUrl')?.value || window.location.origin;
                    const publicDomain = rawSiteUrl.replace('admin.', '').replace(/\/\$/, '');
                    const liveUrl = `${publicDomain}/post/${post.slug}`;
                    const safeTitle = (post.title || '').replace(/'/g, "\\'");

                    const isIndexed = post.is_indexed === true || post.isIndexed === true;
                    const indexBadgeHtml = renderPostIndexIcon(isIndexed);

                    const isTrashView = currentPostStatusFilter === 'trash';
                    let actionButtons = '';

                    if (isTrashView) {
                        actionButtons = `
                            <button class="btn btn-sm btn-outline-success py-0 px-2 me-1" onclick="restorePostFromTrash('${post.slug}', 'draft')" title="Restore to Draft">
                                <i class="bi bi-arrow-counterclockwise"></i> Draft
                            </button>
                            <button class="btn btn-sm btn-outline-primary py-0 px-2 me-1" onclick="restorePostFromTrash('${post.slug}', 'published')" title="Publish Directly">
                                <i class="bi bi-upload"></i> Publish
                            </button>
                            <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deletePostPermanently('${post.slug}')" title="Permanent Delete">
                                <i class="bi bi-trash-fill"></i>
                            </button>
                        `;
                    } else {
                        actionButtons = `
                            <button class="emdash-action-btn" onclick="manualSendToGoogleIndex('${liveUrl}', '${post.slug}')" title="Send to Google Index"><i class="bi bi-google"></i></button>
                            <a href="${liveUrl}" target="_blank" class="emdash-action-btn" title="View"><i class="bi bi-eye"></i></a>
                            <a class="a2a_dd emdash-action-btn text-primary" href="https://www.addtoany.com/share" data-a2a-url="${liveUrl}" data-a2a-title="${safeTitle}" title="Share"><i class="bi bi-share"></i></a>
                            <button class="emdash-action-btn" onclick="openPostEditor('${post.slug}')" title="Edit"><i class="bi bi-pencil"></i></button>
                            <button class="emdash-action-btn text-danger" onclick="moveToTrashPost('${post.slug}')" title="Move to Trash"><i class="bi bi-trash"></i></button>
                        `;
                    }

                    const rawCat = parseCategoryFromResponse(post);

                    tr.innerHTML = `
                        <td class="ps-3" style="width: 40px;"><input type="checkbox" class="post-checkbox form-check-input" value="${post.slug}" data-url="${liveUrl}" onchange="updateBulkActionBar()"></td>
                        <td>
                            <div class="fw-semibold text-dark" style="font-size: 13px; line-height: 1.4;">${window.renderDynamicVariables(post.title || 'Untitled')}</div>
                            <span class="badge bg-light text-secondary border mt-1" style="font-size:9px;">${rawCat}</span>
                        </td>
                        <td class="text-center" style="width: 70px;">${statusBadgeHtml}</td>
                        <td style="width: 100px;"><small class="text-muted" style="font-size: 11px;">${pubDate}</small></td>
                        <td class="text-center" style="width: 70px;">${indexBadgeHtml}</td>
                        <td class="text-center" style="width: 60px;"><span class="badge bg-light text-dark border">${post.views || 0}</span></td>
                        <td class="text-center" style="width: 60px;"><span class="badge bg-light text-dark border">${post.comments || 0}</span></td>
                        <td class="text-end pe-3" style="width: 200px; white-space: nowrap;">
                            ${actionButtons}
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                setTimeout(ensureAddToAnyScript, 100);
            }
            renderPaginationUI(posts.length);
        }
    } catch (e) {}
}

window.moveToTrashPost = async function(slug) {
    if (!confirm(`Move post "${slug}" to Trash?`)) return;
    
    try {
        const res = await fetch('/api/posts/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'trash', slugs: [slug] })
        });

        if (res.ok) {
            showToast("Post successfully moved to Trash.");
            document.querySelectorAll('.sync-pending-indicator, #syncPendingDot, [data-sync-indicator]').forEach(el => el.classList.remove('d-none'));
            localStorage.setItem('sync_pending', 'true');

            loadAndRenderPosts();
            loadPostCounts();
        } else {
            throw new Error(await res.text());
        }
    } catch (err) {
        showToast("Failed to move to trash: " + err.message, "danger");
    }
};

window.restorePostFromTrash = async function(slug, targetStatus = 'draft') {
    try {
        const res = await fetch('/api/posts/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: targetStatus, slugs: [slug] })
        });

        if (res.ok) {
            showToast(`Post successfully restored to status: ${targetStatus}`);
            document.querySelectorAll('.sync-pending-indicator, #syncPendingDot, [data-sync-indicator]').forEach(el => el.classList.remove('d-none'));
            localStorage.setItem('sync_pending', 'true');

            loadAndRenderPosts();
            loadPostCounts();
        } else {
            throw new Error(await res.text());
        }
    } catch (err) {
        showToast("Failed to restore: " + err.message, "danger");
    }
};

window.deletePostPermanently = async function(slug) {
    if (!confirm(`WARNING: The post "${slug}" will be permanently deleted and cannot be restored. Continue?`)) return;

    const bulkModal = new bootstrap.Modal(document.getElementById('bulkProcessModal'));
    document.getElementById('bulkProcessTitle').innerText = "Deleting Permanently...";
    bulkModal.show();

    try {
        const res = await fetch('/api/github/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: `docs/post/${slug}.html`, permanent: true, slug: slug })
        });

        bulkModal.hide();

        if (res.ok) {
            showToast("Post successfully deleted permanently!");
            document.querySelectorAll('.sync-pending-indicator, #syncPendingDot, [data-sync-indicator]').forEach(el => el.classList.remove('d-none'));
            localStorage.setItem('sync_pending', 'true');

            loadAndRenderPosts();
            loadPostCounts();
        } else {
            throw new Error(await res.text());
        }
    } catch (err) {
        bulkModal.hide();
        showToast("Failed to delete permanently: " + err.message, "danger");
    }
};

window.deletePostItem = async function(slug) {
    moveToTrashPost(slug);
};

window.toggleSelectAllPosts = function(master) {
    document.querySelectorAll('.post-checkbox').forEach(cb => cb.checked = master.checked);
    updateBulkActionBar();
};

window.updateBulkActionBar = function() {
    const count = document.querySelectorAll('.post-checkbox:checked').length;
    const bar = document.getElementById('bulkActionBar');
    if (!bar) return;
    
    const countEl = document.getElementById('selectedCount');
    if (countEl) countEl.innerText = count;
    
    if (count > 0) {
        bar.classList.remove('d-none');
        bar.style.display = 'flex';
    } else {
        bar.classList.add('d-none');
        bar.style.display = 'none';
        const selAll = document.getElementById('selectAllPosts'); 
        if (selAll) selAll.checked = false;
    }
};

window.toggleBulkActionInput = function() {
    const val = document.getElementById('bulkActionSelect').value;
    const inp = document.getElementById('bulkCategoryInput');
    if (!inp) return;
    if (val === 'category') inp.classList.remove('d-none'); else inp.classList.add('d-none');
};

window.executeBulkAction = async function() {
    const selectEl = document.getElementById('bulkActionSelect');
    const actionVal = selectEl ? selectEl.value : '';
    const checkedBoxes = document.querySelectorAll('.post-checkbox:checked');
    if (!actionVal) return showToast("Please select a bulk action first!", "warning");
    if (checkedBoxes.length === 0) return;

    if (actionVal === 'google_index') {
        const itemsToProcess = Array.from(checkedBoxes).map(cb => ({
            slug: cb.value,
            url: cb.getAttribute('data-url')
        }));
        await executeBulkGoogleIndex(itemsToProcess);
        return;
    }

    const slugs = Array.from(checkedBoxes).map(cb => cb.value);
    const category = document.getElementById('bulkCategoryInput')?.value.trim() || '';
    
    if (!confirm(`Run action '${actionVal}' on ${slugs.length} selected posts? \n(Changes will be saved to database pending deployment)`)) return;

    const btnExecute = document.getElementById('btnExecuteBulkAction');
    let originalBtnHtml = '';
    if (btnExecute) {
        originalBtnHtml = btnExecute.innerHTML;
        btnExecute.disabled = true;
        btnExecute.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Processing...`;
    }

    const bulkModal = new bootstrap.Modal(document.getElementById('bulkProcessModal'));
    const modalTitleEl = document.getElementById('bulkProcessTitle');
    if (modalTitleEl) modalTitleEl.innerText = `Processing Bulk Action (0/${slugs.length})...`;
    bulkModal.show();

    const CHUNK_SIZE = 5; 
    let processedCount = 0;

    try {
        for (let i = 0; i < slugs.length; i += CHUNK_SIZE) {
            const chunkSlugs = slugs.slice(i, i + CHUNK_SIZE);
            
            if (modalTitleEl) {
                modalTitleEl.innerText = `Processing Bulk Action (${Math.min(i + CHUNK_SIZE, slugs.length)}/${slugs.length})...`;
            }

            let endpoint = '/api/posts/action';
            let payload = { action: actionVal, slugs: chunkSlugs, category };

            if (actionVal === 'delete_permanent') {
                endpoint = '/api/github/delete-bulk';
                payload = { slugs: chunkSlugs, permanent: true };
            } else if (actionVal === 'restore_draft') {
                payload = { action: 'draft', slugs: chunkSlugs };
            } else if (actionVal === 'restore_published') {
                payload = { action: 'published', slugs: chunkSlugs };
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                throw new Error(await res.text());
            }

            processedCount += chunkSlugs.length;
        }
        
        bulkModal.hide();
        showToast('Bulk action successfully executed! Click Sync & Deploy to push live.');
        
        document.querySelectorAll('.sync-pending-indicator, #syncPendingDot, [data-sync-indicator]').forEach(el => el.classList.remove('d-none'));
        localStorage.setItem('sync_pending', 'true');
        
        if (btnExecute) {
            btnExecute.disabled = false;
            btnExecute.innerHTML = originalBtnHtml;
        }
        
        if (selectEl) selectEl.value = '';
        const selAll = document.getElementById('selectAllPosts'); 
        if (selAll) selAll.checked = false;
        document.querySelectorAll('.post-checkbox').forEach(cb => cb.checked = false);
        updateBulkActionBar();
        
        setTimeout(() => {
            window.location.reload();
        }, 1500);

    } catch(err) {
        bulkModal.hide();
        showToast(`Failed after processing ${processedCount} item(s): ` + err.message, 'danger');
        if (btnExecute) {
            btnExecute.disabled = false;
            btnExecute.innerHTML = originalBtnHtml;
        }
    }
};

function renderPaginationUI(fetchedCount) {
    const container = document.getElementById('serverPostsPaginationControls');
    if (!container) return;
    const hasNext = fetchedCount === itemsPerPage;
    container.innerHTML = `
        <div class="text-muted small">Page ${currentPostPage} (Max.${itemsPerPage} per page)</div>
        <div class="d-flex align-items-center">
            <button class="btn btn-sm btn-outline-secondary me-2" ${currentPostPage === 1 ? 'disabled' : ''} onclick="loadServerPostPage(${currentPostPage - 1})"><i class="bi bi-chevron-left"></i> Prev</button>
            <span class="mx-2 fw-bold text-dark">${currentPostPage}</span>
            <button class="btn btn-sm btn-outline-secondary ms-2" ${!hasNext ? 'disabled' : ''} onclick="loadServerPostPage(${currentPostPage + 1})">Next <i class="bi bi-chevron-right"></i></button>
        </div>
    `;
}

window.openNewPostModal = function() {
    const postModalEl = document.getElementById('createPostModal');
    if (!postModalEl) return;

    document.getElementById('postModalTitle').innerHTML = "Write New Post";
    document.getElementById('inpPostIsEdit').value = "false";
    document.getElementById('inpGitHubPostTitle').value = "";
    
    const slugInput = document.getElementById('inpGitHubPostSlug');
    if (slugInput) {
        slugInput.value = "";
        slugInput.disabled = false;
    }
    
    postCategoriesArray = [];
    const hiddenCat = document.getElementById('inpGitHubPostCategory');
    if (hiddenCat) hiddenCat.value = "";
    const catInput = document.getElementById('category-input-field');
    if (catInput) catInput.value = "";
    renderCategoriesUI();

    document.getElementById('inpPostOgImage').value = "";
    document.getElementById('inpGitHubPostDesc').value = "";
    document.getElementById('inpPostScheduledAt').value = "";
    
    document.getElementById('inpPostTags').value = "";
    if (typeof window.syncTagsToUI === 'function') window.syncTagsToUI();

    document.getElementById('inpPostNoIndex').checked = false;
    document.getElementById('inpPostNoFollow').checked = false;
    currentPostContent = "";

    const statusAlert = document.getElementById('currentPostStatusAlert');
    if(statusAlert) statusAlert.classList.add('d-none');

    window.updateDynamicPreview('inpGitHubPostTitle', 'titlePreviewHelper');
    window.updateDynamicPreview('inpGitHubPostDesc', 'descPreviewHelper');
    window.updateCharCounters();

    const bsModal = bootstrap.Modal.getOrCreateInstance(postModalEl);
    bsModal.show();
};

window.openPostEditor = async function(slug) {
    const newUrl = `${window.location.pathname}?edit=${slug}`;
    window.history.pushState({ slug }, '', newUrl);

    const postModalEl = document.getElementById('createPostModal');
    const bsModal = bootstrap.Modal.getOrCreateInstance(postModalEl);
    bsModal.show();

    postCategoriesArray = [];
    const hiddenCat = document.getElementById('inpGitHubPostCategory');
    if (hiddenCat) hiddenCat.value = "";
    const catInputField = document.getElementById('category-input-field');
    if (catInputField) catInputField.value = "";
    renderCategoriesUI();

    try {
        const res = await fetch('/api/posts/detail?slug=' + slug);
        if (!res.ok) throw new Error("Post not found or access denied.");
        const post = await res.json();

        document.getElementById('postModalTitle').innerHTML = `Edit Post: ${post.title || slug}`;
        document.getElementById('inpPostIsEdit').value = "true";
        document.getElementById('inpGitHubPostTitle').value = post.title || "";
        document.getElementById('inpGitHubPostSlug').value = post.slug || slug;
        document.getElementById('inpGitHubPostSlug').disabled = true;

        const finalCat = parseCategoryFromResponse(post);
        postCategoriesArray = [finalCat];
        if (hiddenCat) hiddenCat.value = finalCat;

        renderCategoriesUI();

        setTimeout(() => {
            renderCategoriesUI();
        }, 300);

        document.getElementById('inpPostOgImage').value = post.og_image || "";
        document.getElementById('inpGitHubPostDesc').value = post.description || "";
        document.getElementById('inpPostScheduledAt').value = post.scheduled_at || "";
        
        document.getElementById('inpPostTags').value = post.tags || "";
        if (typeof window.syncTagsToUI === 'function') window.syncTagsToUI();

        document.getElementById('inpPostNoIndex').checked = (post.robots || "").includes("noindex");
        document.getElementById('inpPostNoFollow').checked = (post.robots || "").includes("nofollow");
        currentPostContent = post.content || "";

        window.updateDynamicPreview('inpGitHubPostTitle', 'titlePreviewHelper');
        window.updateDynamicPreview('inpGitHubPostDesc', 'descPreviewHelper');
        window.updateCharCounters();

        const currentStatus = post.status || 'published';
        const statusAlert = document.getElementById('currentPostStatusAlert');
        const statusTextEl = document.getElementById('currentPostStatusText');
        
        if(statusAlert && statusTextEl) {
            statusAlert.classList.remove('d-none');
            statusTextEl.innerText = currentStatus;
            
            if (currentStatus === 'draft') {
                statusTextEl.className = 'fw-bold text-uppercase text-warning';
            } else if (currentStatus === 'published') {
                statusTextEl.className = 'fw-bold text-uppercase text-success';
            } else {
                statusTextEl.className = 'fw-bold text-uppercase text-info';
            }
        }

        setTimeout(() => {
            initPostTinyMce(currentPostContent);
        }, 200);
    } catch(e) {
        showToast("Failed to load post details: " + e.message, "danger");
    }
};

function initPostTinyMce(initialContent = "") {
    if (window.tinymce && tinymce.get('inpGitHubPostContent')) {
        tinymce.get('inpGitHubPostContent').remove();
    }
    
    if (!window.tinymce) return;

    tinymce.init({
        selector: '#inpGitHubPostContent',
        height: 550,
        menubar: true,
        plugins: 'code link image lists table searchreplace fullscreen',
        toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | bullist numlist | link image | code fullscreen',
        image_advtab: true,
        image_title: true,
        automatic_uploads: true,
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
                        storage_provider: currentPostStorageProvider
                    })
                });
                
                if (res.ok) {
                    const data = await res.json();
                    resolve(data.url);
                } else {
                    reject('Failed to upload image to ' + currentPostStorageProvider);
                }
            } catch(e) {
                reject('Error: ' + e.message);
            }
        }),
        setup: function(editor) {
            editor.on('init', function() {
                editor.setContent(initialContent);
                setupTinyMceCounter(editor);
                window.updateCharCounters();
            });
        }
    });
}

async function manualSendToGoogleIndex(postUrl, slug) {
    if (!confirm(`Send this URL to Google Indexing API?\n${postUrl}`)) return;
    showToast("Sending signal to Google Index...", "warning");

    try {
        const res = await fetch('/api/seo/index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: postUrl, slug: slug })
        });
        const json = await res.json();

        if (res.ok && json.success) {
            showToast("Success! Post successfully submitted to Google Index.");
            loadAndRenderPosts(); 
        } else {
            throw new Error(json.error || json.message || "Failed to contact Google Indexing API");
        }
    } catch (err) {
        showToast("Error: " + err.message, "danger");
    }
}

async function executeBulkGoogleIndex(itemsArray) {
    const MAX_DAILY_QUOTA = 200; 
    
    if (itemsArray.length > MAX_DAILY_QUOTA) {
        alert(`Warning: Google limits daily quota to approximately ${MAX_DAILY_QUOTA} URLs. You selected ${itemsArray.length} URLs.`);
    }

    if (!confirm(`About to send ${itemsArray.length} selected posts to Google Index sequentially. Continue?`)) return;

    let successCount = 0;
    const bulkModal = new bootstrap.Modal(document.getElementById('bulkProcessModal'));
    document.getElementById('bulkProcessTitle').innerText = "Sending to Google Index...";
    bulkModal.show();

    for (const item of itemsArray) {
        try {
            const res = await fetch('/api/seo/index', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: item.url, slug: item.slug })
            });
            const json = await res.json();
            if (res.ok && json.success) successCount++;
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (e) {
            console.error("Failed to index:", item.url);
        }
    }

    bulkModal.hide();
    alert(`Completed! Successfully sent ${successCount} out of ${itemsArray.length} posts to Google Index.`);
    window.location.reload();
}

window.toggleAiGeneratorPanel = function() {
    const panel = document.getElementById('aiGeneratorPanel');
    if (panel) {
        panel.classList.toggle('d-none');
    }
};

window.runAiContentGeneration = async function() {
    const promptInput = document.getElementById('aiPromptInput');
    const rawPrompt = promptInput ? promptInput.value.trim() : "";
    if (!rawPrompt) {
        showToast("Please enter a topic or prompt.", "warning");
        return;
    }

    const prompt = window.renderDynamicVariables(rawPrompt);
    const statusEl = document.getElementById('aiGenStatus');
    const btnEl = document.getElementById('btnRunAiGenerate');
    if (statusEl) statusEl.classList.remove('d-none');
    if (btnEl) btnEl.disabled = true;

    try {
        const res = await fetch('/api/ai/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        
        if (!res.ok) throw new Error("Failed to generate content from AI.");
        
        const data = await res.json();
        const generatedHtml = data.content || "";
        
        if (window.tinymce && tinymce.get('inpGitHubPostContent')) {
            tinymce.get('inpGitHubPostContent').setContent(generatedHtml);
            showToast("AI content successfully inserted into editor!");
        } else {
            const textarea = document.getElementById('inpGitHubPostContent');
            if (textarea) {
                textarea.value = generatedHtml;
                showToast("AI content successfully inserted into editor!");
            }
        }
        toggleAiGeneratorPanel();
        if (promptInput) promptInput.value = "";
    } catch (err) {
        showToast("Error: " + err.message, "danger");
    } finally {
        if (statusEl) statusEl.classList.add('d-none');
        if (btnEl) btnEl.disabled = false;
    }
};

window.generateAiKeywords = async function() {
    const rawTitle = document.getElementById('inpGitHubPostTitle').value.trim();
    if (!rawTitle) {
        showToast("Please enter the post title first to generate keywords.", "warning");
        return;
    }
    const title = window.renderDynamicVariables(rawTitle);

    showToast("AI is researching LSI & Keywords...", "warning");
    try {
        const res = await fetch('/api/ai/keywords', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: title })
        });
        if (!res.ok) throw new Error("Failed to fetch keywords from AI.");
        const data = await res.json();
        
        const focusInput = document.getElementById('inpPostFocusKeyword');
        const tagsInput = document.getElementById('inpPostTags');
        if (focusInput && data.keywords) {
            const firstKw = data.keywords.split(',')[0].trim();
            focusInput.value = firstKw;
        }
        if (tagsInput && data.keywords) {
            tagsInput.value = data.keywords;
            if (typeof window.syncTagsToUI === 'function') window.syncTagsToUI();
        }
        showToast("Keywords & LSI successfully updated!");
    } catch(err) {
        showToast("Error: " + err.message, "danger");
    }
};

window.generateAiMetaDescription = async function() {
    const rawContent = window.tinymce && tinymce.get('inpGitHubPostContent') 
        ? tinymce.get('inpGitHubPostContent').getContent() 
        : document.getElementById('inpGitHubPostContent').value;
        
    if (!rawContent) {
        showToast("Post content is still empty.", "warning");
        return;
    }

    const content = window.renderDynamicVariables(rawContent);

    showToast("AI is generating Meta Description...", "warning");
    try {
        const res = await fetch('/api/ai/meta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: content })
        });
        if (!res.ok) throw new Error("Failed to generate Meta Description.");
        const data = await res.json();
        
        const metaDescInput = document.getElementById('inpGitHubPostDesc');
        if (metaDescInput && data.description) {
            let cleanDesc = data.description.replace(/^["']|["']$/g, '').trim();
            if (cleanDesc.length > 160) cleanDesc = cleanDesc.substring(0, 157) + '...';
            metaDescInput.value = cleanDesc;
            window.updateDynamicPreview('inpGitHubPostDesc', 'descPreviewHelper');
            window.updateCharCounters();
            showToast("Meta Description successfully generated!");
        }
    } catch(err) {
        showToast("Error: " + err.message, "danger");
    }
};

window.generateAiOutline = async function() {
    const rawTitle = document.getElementById('inpGitHubPostTitle').value.trim();
    if (!rawTitle) {
        showToast("Please enter the post title first to create an outline.", "warning");
        return;
    }
    const title = window.renderDynamicVariables(rawTitle);

    showToast("AI is building the outline structure...", "warning");
    try {
        const res = await fetch('/api/ai/outline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: title })
        });
        if (!res.ok) throw new Error("Failed to create outline.");
        const data = await res.json();
        
        if (data.outline) {
            if (window.tinymce && tinymce.get('inpGitHubPostContent')) {
                const current = tinymce.get('inpGitHubPostContent').getContent();
                tinymce.get('inpGitHubPostContent').setContent(data.outline + "<br>" + current);
            } else {
                const textarea = document.getElementById('inpGitHubPostContent');
                textarea.value = data.outline + "\n" + textarea.value;
            }
            showToast("Outline structure successfully inserted!");
        }
    } catch(err) {
        showToast("Error: " + err.message, "danger");
    }
};

window.suggestInternalLinks = async function() {
    const rawContent = window.tinymce && tinymce.get('inpGitHubPostContent') 
        ? tinymce.get('inpGitHubPostContent').getContent() 
        : document.getElementById('inpGitHubPostContent').value;
        
    if (!rawContent) {
        showToast("Post content is empty for analysis.", "warning");
        return;
    }
    const content = window.renderDynamicVariables(rawContent);

    showToast("AI is analyzing internal links...", "warning");
    try {
        const res = await fetch('/api/ai/internal-links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: content })
        });
        if (!res.ok) throw new Error("Failed to fetch internal link suggestions.");
        const data = await res.json();
        
        if (data.links) {
            const editor = window.tinymce && tinymce.get('inpGitHubPostContent');
            const linkBlockHtml = `<div class="my-3 p-3 bg-light border-start border-4 border-primary rounded"><strong>Related Articles:</strong><br>${data.links}</div>`;

            if (editor) {
                let currentHtml = editor.getContent();
                const paragraphs = currentHtml.split('</p>');
                
                if (paragraphs.length > 2) {
                    const middleIndex = Math.floor(paragraphs.length / 2);
                    paragraphs.splice(middleIndex, 0, linkBlockHtml);
                    editor.setContent(paragraphs.join('</p>'));
                } else {
                    editor.setContent(currentHtml + "<br>" + linkBlockHtml);
                }
            } else {
                const textarea = document.getElementById('inpGitHubPostContent');
                textarea.value += "\n" + linkBlockHtml;
            }
            showToast("Internal link suggestions successfully inserted in middle content!");
        }
    } catch(err) {
        showToast("Error: " + err.message, "danger");
    }
};

// ==========================================
// STORAGE / PUBLISH POST EDITOR UTILITIES
// ==========================================
window.savePostAsDraft = function() {
    saveNewGitHubPost('draft');
};

window.publishPostDirect = function() {
    saveNewGitHubPost('published');
};

window.saveNewGitHubPost = async function(targetStatus = 'draft') {
    const status = targetStatus; 
    const title = document.getElementById('inpGitHubPostTitle').value.trim();
    if (!title) {
        showToast("Post title is required.", "warning");
        return;
    }

    const catInput = document.getElementById('category-input-field');
    if (catInput && catInput.value.trim() !== '') {
        const val = catInput.value.trim().replace(/,/g, '');
        if (val) {
            postCategoriesArray = [val];
            catInput.value = '';
        }
    }

    const tagInput = document.getElementById('tag-input-field');
    if (tagInput && tagInput.value.trim() !== '') {
        const val = tagInput.value.trim().replace(/,/g, '');
        if (val && !postTagsArray.includes(val)) {
            postTagsArray.push(val);
            if (typeof renderTagsUI === 'function') renderTagsUI();
            tagInput.value = '';
        }
    }

    let category = "General";
    if (postCategoriesArray.length > 0 && postCategoriesArray[0].trim() !== '') {
        category = postCategoriesArray[0].trim();
    } else {
        category = document.getElementById('inpGitHubPostCategory')?.value.trim() || "General";
    }

    if (category.includes(',')) category = category.split(',')[0].trim();
    if (!category) category = "General";

    document.getElementById('inpGitHubPostCategory').value = category;

    const slug = document.getElementById('inpGitHubPostSlug').value.trim();
    const rawContent = tinymce.get('inpGitHubPostContent') ? tinymce.get('inpGitHubPostContent').getContent() : document.getElementById('inpGitHubPostContent').value;
    const content = clientSideMinify(rawContent);

    const schema = document.getElementById('inpPostSchemaJson')?.value || "";
    const description = document.getElementById('inpGitHubPostDesc').value.trim();
    let ogImage = document.getElementById('inpPostOgImage').value.trim();

    if (!ogImage && content.includes('<img')) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const firstImg = tempDiv.querySelector('img');
        if (firstImg && firstImg.src) {
            ogImage = firstImg.src;
            document.getElementById('inpPostOgImage').value = ogImage; 
        }
    }
    const scheduledAt = document.getElementById('inpPostScheduledAt').value;
    const tags = document.getElementById('inpPostTags').value.trim();
    const robots = (document.getElementById('inpPostNoIndex').checked ? "noindex" : "index") + ", " + (document.getElementById('inpPostNoFollow').checked ? "nofollow" : "follow");
    
    const userRole = document.body.getAttribute('data-role') || 'administrator';
    const userEmail = document.body.getAttribute('data-email') || '';
    
    const bulkModal = new bootstrap.Modal(document.getElementById('bulkProcessModal'));
    document.getElementById('bulkProcessTitle').innerText = status === 'published' ? "Publishing directly to GitHub..." : "Saving to Database...";
    bulkModal.show();

    try {
        const res = await fetch('/api/publish-post', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ title, slug, category, description, ogImage, robots, content, status, scheduledAt, tags, author_email: userEmail, author_role: userRole, schema })
        });
        
        if (res.ok) {
            bulkModal.hide();
            if (status === 'published') {
                showToast("Article successfully published directly to GitHub!");
            } else {
                showToast("Article successfully saved to Database as Draft!");
                document.querySelectorAll('.sync-pending-indicator, #syncPendingDot, [data-sync-indicator]').forEach(el => el.classList.remove('d-none'));
                localStorage.setItem('sync_pending', 'true');
            }
            
            const postModalEl = document.getElementById('createPostModal');
            if (postModalEl) {
                const bsModal = bootstrap.Modal.getInstance(postModalEl);
                if (bsModal) bsModal.hide();
            }

            loadAndRenderPosts();
            loadPostCounts();
        } else {
            throw new Error(await res.text());
        }
    } catch(err) {
        bulkModal.hide();
        showToast("Failed to save post: " + err.message, "danger");
    }
};

window.openRevisionsModal = async function() {
    const slug = document.getElementById('inpGitHubPostSlug').value;
    if (!slug) {
        showToast("Post slug is not available or not yet saved.", "warning");
        return;
    }
    const tbody = document.getElementById('revisionsTableBody');
    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">Loading revision history...</td></tr>';
    new bootstrap.Modal(document.getElementById('revisionsModal')).show();
    
    try {
        const res = await fetch('/api/posts/revisions?slug=' + encodeURIComponent(slug));
        if (res.ok) {
            const revisions = await res.json();
            if (!revisions.length) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">No revision history found.</td></tr>';
                return;
            }
            tbody.innerHTML = revisions.map(r => `
                <tr>
                    <td class="ps-3 fw-bold">${new Date(r.timestamp || r.created_at).toLocaleString()}</td>
                    <td><span class="badge bg-secondary">${r.status || 'saved'}</span></td>
                    <td class="text-end pe-3">
                        <button class="btn btn-sm wp-btn-primary px-3" onclick="restoreRevision('${slug}', '${r.id || r.revision_id}')">
                            <i class="bi bi-arrow-counterclockwise me-1"></i> Restore
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Failed to load revisions.</td></tr>';
        }
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Network error occurred.</td></tr>';
    }
};

window.restoreRevision = async function(slug, revisionId) {
    if (!confirm("Restore this revision? Current changes will be overwritten.")) return;
    try {
        const res = await fetch('/api/posts/restore-revision', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ slug, revisionId })
        });
        if (res.ok) {
            showToast("Revision successfully restored!");
            bootstrap.Modal.getInstance(document.getElementById('revisionsModal')).hide();
            openPostEditor(slug);
        } else {
            showToast("Failed to restore revision.", "danger");
        }
    } catch(e) {
        showToast("Network error occurred.", "danger");
    }
};

async function loadAnalyticsSummary() {
    try {
        const res = await fetch('/api/analytics/summary');
        if (res.ok) {
            const data = await res.json();
            if (document.getElementById('statRequests')) document.getElementById('statRequests').innerText = data.requests || 0;
            if (document.getElementById('statPageViews')) document.getElementById('statPageViews').innerText = data.pageViews || 0;
            if (document.getElementById('statUniques')) document.getElementById('statUniques').innerText = data.uniques || 0;
        }
    } catch(e) {}
}

let searchTimer = null;
window.filterPostsAjax = function(keyword) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
        const tbody = document.getElementById('githubPostsTableBody');
        if (!tbody) return;

        const query = keyword.toLowerCase().trim();
        const paginationContainer = document.getElementById('serverPostsPaginationControls');

        if (!query) {
            if (paginationContainer) paginationContainer.style.display = 'flex';
            loadServerPostPage(1);
            return;
        }

        if (paginationContainer) paginationContainer.style.display = 'none';
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted fst-italic">Searching posts...</td></tr>';

        try {
            const rawSiteUrl = document.getElementById('inpSiteUrl')?.value || window.location.origin;
            const publicDomain = rawSiteUrl.replace('admin.', '').replace(/\/\$/, '');
            
            const userRole = document.body.dataset.role || 'author';
            const userEmail = document.body.dataset.email || '';
            
            let fetchUrl = `${publicDomain}/search.json`;
            
            if (userRole !== 'administrator' && userEmail) {
                const authorSlug = userEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-');
                fetchUrl = `${publicDomain}/json/authors/${authorSlug}.json`;
            }

            const res = await fetch(fetchUrl);
            if (res.ok) {
                const searchData = await res.json();
                tbody.innerHTML = '';
                
                const items = Array.isArray(searchData) ? searchData : (searchData.posts || searchData.items || []);

                const filtered = items.filter(p => 
                    (p.title && p.title.toLowerCase().includes(query)) || 
                    (p.category && p.category.toLowerCase().includes(query)) ||
                    (p.url && p.url.toLowerCase().includes(query))
                );

                if (!filtered || filtered.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No matching posts found.</td></tr>';
                    return;
                }

                filtered.forEach(post => {
                    const tr = document.createElement('tr');
                    const postStatus = post.status || 'published';
                    const statusBadgeHtml = renderPostStatusIcon(postStatus);
                    
                    const pubDate = post.created_at || post.date ? new Date(post.created_at || post.date).toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'}) : '-';
                    
                    let slug = post.slug || '';
                    if (!slug && post.url) slug = post.url.split('/').pop().replace('.html', '');

                    const liveUrl = post.url ? (post.url.startsWith('http') ? post.url : `${publicDomain}${post.url}`) : `${publicDomain}/post/${slug}`;
                    const safeTitle = (post.title || '').replace(/'/g, "\\'");
                    
                    const isIndexed = post.is_indexed === true || post.isIndexed === true;
                    const indexBadgeHtml = renderPostIndexIcon(isIndexed);

                    const rawCat = parseCategoryFromResponse(post);

                    tr.innerHTML = `
                        <td class="ps-3" style="width: 40px;"><input type="checkbox" class="post-checkbox form-check-input" value="${slug}" data-url="${liveUrl}" onchange="updateBulkActionBar()"></td>
                        <td>
                            <div class="fw-semibold text-dark" style="font-size: 13px; line-height: 1.4;">${window.renderDynamicVariables(post.title || 'Untitled')}</div>
                            <span class="badge bg-light text-secondary border mt-1" style="font-size:9px;">${rawCat}</span>
                        </td>
                        <td class="text-center" style="width: 70px;">${statusBadgeHtml}</td>
                        <td style="width: 100px;"><small class="text-muted" style="font-size: 11px;">${pubDate}</small></td>
                        <td class="text-center" style="width: 70px;">${indexBadgeHtml}</td>
                        <td class="text-center" style="width: 60px;"><span class="badge bg-light text-dark border">${post.views || 0}</span></td>
                        <td class="text-center" style="width: 60px;"><span class="badge bg-light text-dark border">${post.comments || 0}</span></td>
                        <td class="text-end pe-3" style="width: 180px; white-space: nowrap;">
                            <button class="emdash-action-btn" onclick="manualSendToGoogleIndex('${liveUrl}', '${slug}')" title="Send to Google Index"><i class="bi bi-google"></i></button>
                            <a href="${liveUrl}" target="_blank" class="emdash-action-btn" title="View"><i class="bi bi-eye"></i></a>
                            <a class="a2a_dd emdash-action-btn text-primary" href="https://www.addtoany.com/share" data-a2a-url="${liveUrl}" data-a2a-title="${safeTitle}" title="Share"><i class="bi bi-share"></i></a>
                            <button class="emdash-action-btn" onclick="openPostEditor('${slug}')" title="Edit"><i class="bi bi-pencil"></i></button>
                            <button class="emdash-action-btn text-danger" onclick="deletePostItem('${slug}')" title="Delete"><i class="bi bi-trash"></i></button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                setTimeout(ensureAddToAnyScript, 100);
            } else {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Author archive data is not yet available.</td></tr>';
            }
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">Failed to search data.</td></tr>';
        }
    }, 300);
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
    } catch (e) {}
}

// ==========================================
// INSTANT STOCK IMAGES & INFINITE SCROLL
// ==========================================
let currentStockProvider = 'unsplash';
let stockPage = 1;
let isLoadingStock = false;
let hasMoreStock = true;
let currentStockQuery = '';

function toggleStockImagesPanel() {
    const panel = document.getElementById('stockImagesPanel');
    if (panel) {
        panel.classList.toggle('d-none');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#stockProviderTabs button[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function (event) {
            currentStockProvider = event.target.getAttribute('data-provider');
            const query = document.getElementById('inpStockSearch').value.trim();
            if (query) searchStockImages(true);
        });
    });

    const stockGridEl = document.getElementById('stockImageGrid');
    if (stockGridEl) {
        stockGridEl.addEventListener('scroll', () => {
            if (stockGridEl.scrollTop + stockGridEl.clientHeight >= stockGridEl.scrollHeight - 40) {
                if (!isLoadingStock && hasMoreStock && currentStockQuery) {
                    stockPage++;
                    searchStockImages(false);
                }
            }
        });
    }
});

async function searchStockImages(isNewSearch = true) {
    const queryInput = document.getElementById('inpStockSearch');
    const query = queryInput ? queryInput.value.trim() : '';

    if (isNewSearch) {
        if (!query) return;
        stockPage = 1;
        hasMoreStock = true;
        currentStockQuery = query;
        const gridEl = document.getElementById('stockImageGrid');
        if (gridEl) gridEl.innerHTML = '';
    }

    if (isLoadingStock || !hasMoreStock || !currentStockQuery) return;
    isLoadingStock = true;

    const statusEl = document.getElementById('stockSearchStatus');
    const gridEl = document.getElementById('stockImageGrid');

    if (isNewSearch) {
        statusEl.className = 'alert alert-info small py-1 px-2 mb-3';
        statusEl.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Searching images on ${currentStockProvider}...`;
    } else {
        let loaderEl = document.getElementById('stockInfiniteLoader');
        if (!loaderEl) {
            loaderEl = document.createElement('div');
            loaderEl.id = 'stockInfiniteLoader';
            loaderEl.className = 'col-12 text-center py-2';
            loaderEl.innerHTML = `<span class="spinner-border spinner-border-sm text-primary me-2"></span><small class="text-muted">Loading more images...</small>`;
            gridEl.appendChild(loaderEl);
        }
    }

    try {
        const res = await fetch(`/api/stock-images?provider=${currentStockProvider}&query=${encodeURIComponent(currentStockQuery)}&page=${stockPage}`);
        const json = await res.json();

        const loaderEl = document.getElementById('stockInfiniteLoader');
        if (loaderEl) loaderEl.remove();

        if (!res.ok || !json.success) throw new Error(json.error || "Failed to load images from server");

        if (!json.data || json.data.length === 0) {
            if (isNewSearch) {
                statusEl.className = 'alert alert-warning small py-1 px-2 mb-3';
                statusEl.innerText = "No images found.";
            }
            hasMoreStock = false;
            return;
        }

        statusEl.className = 'd-none';

        json.data.forEach(img => {
            const col = document.createElement('div');
            col.className = 'col-6 col-md-4 col-lg-3';
            const imgTitle = (img.title || img.description || query).replace(/'/g, "\\'");

            col.innerHTML = `
                <div class="card h-100 border-0 shadow-sm overflow-hidden position-relative group-hover">
                    <img src="${img.preview_url}" class="card-img-top" style="height: 120px; object-fit: cover;" alt="${imgTitle}">
                    <div class="card-body p-2 bg-light">
                        <small class="text-muted d-block text-truncate" style="font-size: 10px;">By ${img.author_name || 'Stock'}</small>
                    </div>
                    <div class="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center opacity-0 transition-opacity stock-overlay">
                        <button class="btn btn-sm btn-success" onclick="processAndInsertStockImage('${img.download_url}', '${imgTitle}')">
                            <i class="bi bi-cloud-arrow-down me-1"></i> Insert
                        </button>
                    </div>
                </div>
            `;
            gridEl.appendChild(col);
        });

        if (json.data.length < 10) {
            hasMoreStock = false;
        }

    } catch (err) {
        const loaderEl = document.getElementById('stockInfiniteLoader');
        if (loaderEl) loaderEl.remove();

        if (isNewSearch) {
            statusEl.className = 'alert alert-danger small py-1 px-2 mb-3';
            statusEl.innerText = "Error: " + err.message;
        }
    } finally {
        isLoadingStock = false;
    }
}

async function processAndInsertStockImage(imageUrl, sourceImageTitle = '') {
    if(typeof showToast === 'function') showToast("Processing and downloading image...", "warning");
    
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `stock-${Date.now()}.jpg`, { type: blob.type });

        const compressed = await compressAndConvertImage(file);
        
        const uploadRes = await fetch('/api/github/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                filename: Date.now() + '-' + compressed.filename, 
                content: compressed.content,
                storage_provider: currentPostStorageProvider 
            })
        });

        if (!uploadRes.ok) throw new Error(`Failed to upload image to ${currentPostStorageProvider}`);
        
        const uploadData = await uploadRes.json();
        const finalUrl = uploadData.url;

        const focusKeyword = document.getElementById('inpPostFocusKeyword')?.value.trim();
        const rawPostTitle = document.getElementById('inpGitHubPostTitle')?.value.trim();
        const postTitle = window.renderDynamicVariables(rawPostTitle);

        const imageAlt = focusKeyword || sourceImageTitle || postTitle || "Stock Image";
        const imageTitleAttr = postTitle || sourceImageTitle || focusKeyword || "Stock Image";

        const imgTagHtml = `<img src="${finalUrl}" alt="${imageAlt}" title="${imageTitleAttr}" class="img-fluid" loading="lazy">`;

        if (window.tinymce && tinymce.get('inpGitHubPostContent')) {
            tinymce.get('inpGitHubPostContent').insertContent(imgTagHtml);
        } else {
            const textarea = document.getElementById('inpGitHubPostContent');
            if (textarea) textarea.value += `\n${imgTagHtml}\n`;
        }
        
        if(typeof showToast === 'function') showToast(`Stock image successfully added with Alt & Title attributes!`);
        toggleStockImagesPanel();

    } catch (err) {
        if(typeof showToast === 'function') showToast("Failed to process image: " + err.message, "danger");
        else alert("Error: " + err.message);
    }
}

function toggleAiIdeasPanel() {
    const panel = document.getElementById('aiIdeasPanel');
    if (panel) panel.classList.toggle('d-none');
}

function toggleAiTitlesPanel() {
    const panel = document.getElementById('aiTitlesPanel');
    if (panel) panel.classList.toggle('d-none');
}

async function runAiGenerateIdeas() {
    const keyword = document.getElementById('aiIdeaKeyword').value.trim();
    if (!keyword) return showToast("Please enter a niche or main topic!", "warning");

    const statusEl = document.getElementById('aiIdeasStatus');
    const resultList = document.getElementById('aiIdeasResultList');
    statusEl.classList.remove('d-none');
    resultList.innerHTML = '';

    try {
        const res = await fetch('/api/ai/generate-ideas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: keyword })
        });
        const data = await res.json();
        statusEl.classList.add('d-none');

        if (data.ideas && Array.isArray(data.ideas)) {
            resultList.innerHTML = data.ideas.map(idea => `
                <div class="p-2 bg-white border rounded mb-1 d-flex justify-content-between align-items-center">
                    <span>${idea}</span>
                    <button class="btn btn-sm btn-outline-primary py-0 px-2" style="font-size: 11px;" onclick="sendIdeaToTitle('${idea.replace(/'/g, "\\'")}')">Use for Title</button>
                </div>
            `).join('');
        } else {
            resultList.innerHTML = `<div class="text-muted">Failed to load ideas.</div>`;
        }
    } catch (err) {
        statusEl.classList.add('d-none');
        showToast("Error: " + err.message, "danger");
    }
}

function sendIdeaToTitle(ideaText) {
    document.getElementById('aiTitleInputSeed').value = ideaText;
    toggleAiIdeasPanel();
    toggleAiTitlesPanel();
    showToast("Idea successfully sent to Title Generator!");
}

async function runAiGenerateTitles() {
    const seed = document.getElementById('aiTitleInputSeed').value.trim();
    if (!seed) return showToast("Please enter or paste an article idea first!", "warning");

    const statusEl = document.getElementById('aiTitlesStatus');
    const resultList = document.getElementById('aiTitlesResultList');
    statusEl.classList.remove('d-none');
    resultList.innerHTML = '';

    try {
        const res = await fetch('/api/ai/generate-titles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seed })
        });
        const data = await res.json();
        statusEl.classList.add('d-none');

        if (data.titles && Array.isArray(data.titles)) {
            resultList.innerHTML = data.titles.map(title => `
                <div class="p-2 bg-white border rounded mb-1 d-flex justify-content-between align-items-center">
                    <span class="fw-semibold">${title}</span>
                    <button class="btn btn-sm btn-success py-0 px-2" style="font-size: 11px;" onclick="sendTitleToAiWriter('${title.replace(/'/g, "\\'")}')">Send to AI Writer</button>
                </div>
            `).join('');
        } else {
            resultList.innerHTML = `<div class="text-muted">Failed to generate titles.</div>`;
        }
    } catch (err) {
        statusEl.classList.add('d-none');
        showToast("Error: " + err.message, "danger");
    }
}

function sendTitleToAiWriter(titleText) {
    document.getElementById('inpGitHubPostTitle').value = titleText;
    window.updateDynamicPreview('inpGitHubPostTitle', 'titlePreviewHelper');
    window.updateCharCounters();

    const aiPrompt = document.getElementById('aiPromptInput');
    if (aiPrompt) {
        aiPrompt.value = `Write a comprehensive, engaging SEO article based on this title: "${titleText}"`;
    }

    toggleAiTitlesPanel();
    const aiPanel = document.getElementById('aiGeneratorPanel');
    if (aiPanel && aiPanel.classList.contains('d-none')) {
        aiPanel.classList.remove('d-none');
    }

    showToast("Title successfully applied to Article & AI Writer Input!");
}

async function bulkIndexAllPublished() {
    if (!confirm("This feature will submit all posts with 'published' status to the Google Indexing API.\n\nNote: Google's default quota is 200 requests per day. Continue process?")) {
        return;
    }

    const btn = document.getElementById('btnBulkIndex');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;

    try {
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Fetching posts data...`;
        const res = await fetch('/api/posts/list?status=published&max=200');
        const posts = await res.json();

        if (!posts || posts.length === 0) {
            alert("No published posts found.");
            btn.disabled = false;
            btn.innerHTML = originalHtml;
            return;
        }

        let successCount = 0;
        let failCount = 0;
        let quotaExceeded = false;

        for (let i = 0; i < posts.length; i++) {
            const p = posts[i];
            const targetUrl = `${window.location.origin}/post/${p.slug}`;
            
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Indexing (${i + 1}/${posts.length})...`;

            try {
                const indexRes = await fetch('/api/seo/index', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: targetUrl })
                });

                const data = await indexRes.json();

                if (indexRes.status === 429 || (data.error && data.error.toLowerCase().includes('quota'))) {
                    quotaExceeded = true;
                    alert(`Warning: Google Indexing daily quota reached (429 Too Many Requests) at post #${i + 1}. Process stopped.`);
                    break;
                }

                if (indexRes.ok && data.success) {
                    successCount++;
                } else {
                    failCount++;
                }
                await new Promise(resolve => setTimeout(resolve, 600));

            } catch (err) {
                failCount++;
            }
        }

        alert(`Process Completed!\n- Successfully sent to Google: ${successCount}\n- Failed/Skipped: ${failCount}${quotaExceeded ? '\n(Stopped due to daily quota limit)' : ''}`);

    } catch (err) {
        alert("System error occurred: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

async function runAiSeoScorer() {
    const rawFocusKeyword = document.getElementById('inpPostFocusKeyword')?.value || '';
    
    let rawContent = '';
    if (typeof tinymce !== 'undefined' && tinymce.get('inpGitHubPostContent')) {
        rawContent = tinymce.get('inpGitHubPostContent').getContent();
    } else {
        rawContent = document.getElementById('inpGitHubPostContent')?.value || '';
    }

    const rawTitle = document.getElementById('inpGitHubPostTitle')?.value || '';
    const rawDesc = document.getElementById('inpGitHubPostDesc')?.value || '';

    const focusKeyword = window.renderDynamicVariables(rawFocusKeyword);
    const content = window.renderDynamicVariables(rawContent);
    const title = window.renderDynamicVariables(rawTitle);
    const description = window.renderDynamicVariables(rawDesc);

    const resultBox = document.getElementById('seoScoreResult');
    resultBox.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Analyzing content...`;

    try {
        const res = await fetch('/api/seo/ai-score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, focusKeyword, title, description })
        });
        
        const textResponse = await res.text();
        
        let data;
        try {
            data = JSON.parse(textResponse);
        } catch(e) {
            resultBox.innerHTML = `<span class="text-danger">AI returned non-JSON text: ${textResponse.substring(0,100)}...</span>`;
            return;
        }

        if (data.error) {
            resultBox.innerHTML = `<span class="text-danger fw-bold">Backend Error: ${data.error}</span>`;
            return;
        }

        const scoreVal = data.score ?? data.seo_score ?? data.points ?? "N/A";
        const feedbackArr = data.feedback ?? data.recommendations ?? data.suggestions ?? ["Improve keyword structure."];
        const feedbackList = Array.isArray(feedbackArr) ? feedbackArr.map(f => `<li>${f}</li>`).join('') : `<li>${feedbackArr}</li>`;
        
        if (scoreVal === "N/A") {
             resultBox.innerHTML = `<span class="text-danger">AI failed to provide a numerical score. Original Response: ${JSON.stringify(data).substring(0,100)}</span>`;
             return;
        }

        resultBox.innerHTML = `
            <div class="d-flex align-items-center justify-content-between mb-1">
                <span class="fw-bold">SEO Score:</span>
                <span class="badge bg-${scoreVal > 75 ? 'success' : scoreVal > 50 ? 'warning' : 'danger'} fs-6">${scoreVal}/100</span>
            </div>
            <ul class="ps-3 mb-0 text-muted" style="font-size: 11px;">${feedbackList}</ul>
        `;
    } catch (err) {
        resultBox.innerHTML = `<span class="text-danger">Failed to connect to server: ${err.message}</span>`;
    }
}

// SCHEMA GENERATOR UNIFIED FUNCTION (LD+JSON & HTML NON-MICRODATA)
async function generateSchemaMarkupToEditor() {
    const type = document.getElementById('schemaTypeSelect')?.value || 'FAQPage';
    const rawTitle = document.getElementById('inpGitHubPostTitle')?.value || 'Article';
    const rawDesc = document.getElementById('inpGitHubPostDesc')?.value || '';
    const rawContent = typeof tinymce !== 'undefined' && tinymce.get('inpGitHubPostContent') 
        ? tinymce.get('inpGitHubPostContent').getContent() 
        : document.getElementById('inpGitHubPostContent')?.value || '';

    const title = window.renderDynamicVariables(rawTitle);
    const description = window.renderDynamicVariables(rawDesc);
    const content = window.renderDynamicVariables(rawContent);

    if (typeof showToast === 'function') {
        showToast(`AI is generating ${type} Schema (JSON-LD & HTML)...`, "warning");
    }

    try {
        const res = await fetch('/api/seo/generate-schema', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, title, description, content })
        });
        
        const textResponse = await res.text();
        let data;
        try {
            data = JSON.parse(textResponse);
        } catch(e) {
            if (typeof showToast === 'function') showToast("AI parsing failed: " + textResponse.substring(0, 100), "danger");
            else alert("AI PARSING FAILED:\n" + textResponse.substring(0, 400));
            return;
        }

        if (data.error) {
            if (typeof showToast === 'function') showToast("AI Error: " + data.error, "danger");
            else alert("ERROR FROM AI SERVER:\n" + data.error);
            return;
        }

        // 1. Generate JSON-LD Script
        let schemaObj = data.schema || data.json || data;
        if (typeof schemaObj === 'string') {
            try { schemaObj = JSON.parse(schemaObj); } catch(e) {}
        }
        const jsonString = typeof schemaObj === 'object' ? JSON.stringify(schemaObj, null, 2) : String(schemaObj);
        
        const schemaHiddenInput = document.getElementById('inpPostSchemaJson');
        if (schemaHiddenInput) schemaHiddenInput.value = jsonString;

        const jsonLdScript = `<script type="application/ld+json">\n${jsonString}\n</script>`;

        // 2. Generate HTML Non-Microdata Section
        let htmlSectionMarkup = '';
        if (data.html_schema) {
            htmlSectionMarkup = data.html_schema;
        } else if (data.faq_html) {
            htmlSectionMarkup = data.faq_html;
        } else if (data.html) {
            htmlSectionMarkup = data.html;
        } else {
            if (type === 'FAQPage' || schemaObj['@type'] === 'FAQPage') {
                const items = Array.isArray(schemaObj.mainEntity) ? schemaObj.mainEntity : (schemaObj.mainEntity ? [schemaObj.mainEntity] : []);
                if (items.length > 0) {
                    htmlSectionMarkup = `<section class="faq-section my-4">\n<h2>Frequently Asked Questions</h2>\n<div class="faq-list">\n` +
                        items.map(item => `  <div class="faq-item mb-3 p-3 bg-light border rounded">\n    <h3 class="fw-bold fs-6 mb-1">${item.name || item.question || ''}</h3>\n    <p class="mb-0 small text-secondary">${item.acceptedAnswer ? (item.acceptedAnswer.text || item.acceptedAnswer) : ''}</p>\n  </div>`).join('\n') +
                        `\n</div>\n</section>`;
                } else {
                    htmlSectionMarkup = `<section class="faq-section my-4">\n<h2>Frequently Asked Questions</h2>\n<div class="faq-item mb-3 p-3 bg-light border rounded">\n<h3 class="fw-bold fs-6 mb-1">What is this article about?</h3>\n<p class="mb-0 small text-secondary">This article provides detailed information about ${title || 'the topic'}.</p>\n</div>\n</section>`;
                }
            } else if (type === 'HowTo' || schemaObj['@type'] === 'HowTo') {
                const steps = Array.isArray(schemaObj.step) ? schemaObj.step : [];
                htmlSectionMarkup = `<section class="howto-section my-4">\n<h2>${schemaObj.name || title || 'How To'}</h2>\n` +
                    (schemaObj.description ? `<p>${schemaObj.description}</p>\n` : '') +
                    `<ol class="howto-steps">\n` +
                    steps.map(s => `  <li class="mb-2"><strong>${s.name || ''}</strong>: ${s.text || s.description || ''}</li>`).join('\n') +
                    `\n</ol>\n</section>`;
            } else if (type === 'Review' || schemaObj['@type'] === 'Review') {
                const itemReviewed = schemaObj.itemReviewed?.name || title;
                const rating = schemaObj.reviewRating?.ratingValue || '';
                const author = schemaObj.author?.name || '';
                htmlSectionMarkup = `<section class="review-section my-4 p-3 bg-light border rounded">\n<h2>Review: ${itemReviewed}</h2>\n` +
                    (rating ? `<p><strong>Rating:</strong> ${rating} / 5</p>\n` : '') +
                    (author ? `<p><strong>Author:</strong> ${author}</p>\n` : '') +
                    (schemaObj.reviewBody ? `<p>${schemaObj.reviewBody}</p>\n` : '') +
                    `</section>`;
            } else {
                htmlSectionMarkup = `<section class="schema-html-section my-4">\n<h2>${title}</h2>\n<p>${description}</p>\n</section>`;
            }
        }

        // Gabungkan versi LD+JSON dan HTML non-microdata
        const fullSchemaBlock = `\n<!-- Schema Markup (${type}) -->\n${jsonLdScript}\n${htmlSectionMarkup}`;

        const editor = typeof tinymce !== 'undefined' ? tinymce.get('inpGitHubPostContent') : null;
        let currentContent = editor ? editor.getContent() : (document.getElementById('inpGitHubPostContent')?.value || '');

        if (currentContent.includes('<main>') && currentContent.includes('</main>')) {
            currentContent = currentContent.replace('</main>', `\n${fullSchemaBlock}\n</main>`);
        } else if (currentContent.includes('</main>')) {
            currentContent = currentContent.replace('</main>', `\n${fullSchemaBlock}\n</main>`);
        } else {
            currentContent = `<main>\n${currentContent}\n${fullSchemaBlock}\n</main>`;
        }

        if (editor) {
            editor.setContent(currentContent);
        } else {
            const textarea = document.getElementById('inpGitHubPostContent');
            if (textarea) textarea.value = currentContent;
        }

        if (typeof showToast === 'function') {
            showToast(`Schema ${type} (JSON-LD & HTML) successfully generated and injected before </main>!`);
        } else {
            alert(`Schema ${type} (JSON-LD & HTML) successfully generated and injected before </main>!`);
        }
    } catch (err) {
        if (typeof showToast === 'function') showToast("Fetch error: " + err.message, "danger");
        else alert("Network/Fetch error: " + err.message);
    }
}

function toggleOutboundLinksPanel() {
    const panel = document.getElementById('outboundLinksPanel');
    if (panel) panel.classList.toggle('d-none');
}

async function runSuggestOutboundLinks() {
    const rawFocusKeyword = document.getElementById('inpPostFocusKeyword')?.value || '';
    const rawContent = typeof tinymce !== 'undefined' && tinymce.get('inpGitHubPostContent') ? tinymce.get('inpGitHubPostContent').getContent() : document.getElementById('inpGitHubPostContent')?.value || '';
    
    const focusKeyword = window.renderDynamicVariables(rawFocusKeyword);
    const content = window.renderDynamicVariables(rawContent);

    const statusEl = document.getElementById('outboundLinksStatus');
    const resultListEl = document.getElementById('outboundLinksResultList');

    statusEl.classList.remove('d-none');
    statusEl.innerText = "Analyzing content and searching external references...";
    resultListEl.innerHTML = "";

    try {
        const res = await fetch('/api/seo/outbound-links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, focusKeyword })
        });
        const data = await res.json();
        statusEl.classList.add('d-none');

        let links = Array.isArray(data) ? data : (data.links || data.outbound_links || []);
        
        if (links.length === 0) {
            resultListEl.innerHTML = `<div class="text-muted p-2">No link suggestions generated. Try updating your content.</div>`;
            return;
        }

        let html = '<div class="list-group">';
        links.forEach((item, index) => {
            const safeAnchor = (item.anchor_text || '').replace(/'/g, "&apos;");
            const safeUrl = item.url || '#';
            const safeReason = item.reason || 'Relevant external reference';

            html += `
                <div class="list-group-item list-group-item-action p-2 mb-2 border rounded bg-white">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <strong class="text-primary">${safeAnchor}</strong>
                        <button type="button" class="btn btn-sm btn-outline-success py-0 px-2" style="font-size:11px;" onclick="insertOutboundLink('${safeAnchor}', '${safeUrl}')">
                            <i class="bi bi-plus-lg me-1"></i> Insert Link
                        </button>
                    </div>
                    <div class="text-muted font-monospace text-truncate mb-1" style="font-size: 11px;">${safeUrl}</div>
                    <div class="text-secondary" style="font-size: 11px; font-style: italic;">Reason: ${safeReason}</div>
                </div>
            `;
        });
        html += '</div>';
        resultListEl.innerHTML = html;

    } catch (err) {
        statusEl.classList.add('d-none');
        resultListEl.innerHTML = `<div class="text-danger p-2">Failed to generate outbound links: ${err.message}</div>`;
    }
}

function insertOutboundLink(anchorText, url) {
    const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${anchorText}</a>`;
    
    if (typeof tinymce !== 'undefined' && tinymce.get('inpGitHubPostContent')) {
        tinymce.get('inpGitHubPostContent').execCommand('mceInsertContent', false, linkHtml);
    } else {
        const textarea = document.getElementById('inpGitHubPostContent');
        if (textarea) textarea.value += ` ${linkHtml} `;
    }
    alert(`Successfully inserted link to "${anchorText}"! (Opens in new tab with noopener rel)`);
}

window.autoInjectAiLinks = async function() {
    if (!window.tinymce || !tinymce.get('inpGitHubPostContent')) {
        showToast('Active editor not found.', 'warning');
        return;
    }

    const editor = tinymce.get('inpGitHubPostContent');
    const btn = document.getElementById('btnAiOutboundLinks');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Auto-Injecting...';
    }

    try {
        const plainText = editor.getContent({ format: 'text' });
        let htmlContent = editor.getContent();

        if (plainText.length < 50) {
            showToast('Article is too short for analysis.', 'warning');
            return;
        }

        const res = await fetch('/api/ai/outbound-links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: window.renderDynamicVariables(plainText) })
        });

        const data = await res.json();
        if (data.success && data.links && data.links.length > 0) {
            let count = 0;
            
            data.links.forEach(item => {
                if (item.exact_phrase && item.url) {
                    const escapeRegex = item.exact_phrase.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
                    const searchRegex = new RegExp('(?<!<[^>]*)\\b(' + escapeRegex + ')\\b(?![^c]*>)', 'i');

                    if (searchRegex.test(htmlContent)) {
                        htmlContent = htmlContent.replace(searchRegex, `<a href="${item.url}" target="_blank" rel="noopener noreferrer" class="ai-outbound-link text-primary fw-medium">$1</a>`);
                        count++;
                    }
                }
            });

            editor.setContent(htmlContent);
            
            if (count > 0) {
                showToast(`Success! ${count} links successfully auto-injected.`);
            } else {
                showToast('AI responded successfully, but the phrase was not found in the current HTML structure.', 'warning');
            }
        } else {
            showToast('AI cannot provide suitable recommendations at this time.', 'warning');
        }
    } catch (err) {
        showToast('An error occurred: ' + err.message, 'danger');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-magic me-1"></i> Auto-Inject AI Links';
        }
    }
};

window.insertLinkIntoEditor = function(encodedAnchor, encodedUrl) {
    const anchorText = decodeURIComponent(encodedAnchor);
    const url = decodeURIComponent(encodedUrl);

    if (window.tinymce && tinymce.get('inpGitHubPostContent')) {
        const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${anchorText}</a>`;
        tinymce.get('inpGitHubPostContent').execCommand('mceInsertContent', false, linkHtml);
        
        const modalEl = document.getElementById('aiLinksModal');
        if (modalEl) {
            bootstrap.Modal.getInstance(modalEl).hide();
        }
    } else {
        alert('Active editor not found.');
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const tagsContainer = document.getElementById('tags-container');
    const tagInputField = document.getElementById('tag-input-field');
    
    if (tagsContainer && tagInputField) {
        tagsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-btn')) {
                const indexToRemove = e.target.getAttribute('data-index');
                postTagsArray.splice(indexToRemove, 1);
                renderTagsUI();
            } else {
                tagInputField.focus();
            }
        });

        tagInputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault(); 
                const tagValue = tagInputField.value.trim().replace(/,/g, '');
                
                if (tagValue && !postTagsArray.includes(tagValue)) {
                    postTagsArray.push(tagValue);
                    tagInputField.value = ''; 
                    renderTagsUI();
                } else {
                    tagInputField.value = ''; 
                }
            }
            
            if (e.key === 'Backspace' && tagInputField.value === '' && postTagsArray.length > 0) {
                postTagsArray.pop();
                renderTagsUI();
            }
        });
    }

    const categoryContainer = document.getElementById('category-container');
    const categoryInputField = document.getElementById('category-input-field');

    if (categoryContainer && categoryInputField) {
        categoryContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-btn') && e.target.hasAttribute('data-cat-index')) {
                const idx = e.target.getAttribute('data-cat-index');
                postCategoriesArray.splice(idx, 1);
                renderCategoriesUI();
            } else {
                categoryInputField.focus();
            }
        });

        categoryInputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const val = categoryInputField.value.trim().replace(/,/g, '');
                if (val) {
                    postCategoriesArray = [val];
                    categoryInputField.value = '';
                    renderCategoriesUI();
                } else {
                    categoryInputField.value = '';
                }
            }
            if (e.key === 'Backspace' && categoryInputField.value === '' && postCategoriesArray.length > 0) {
                postCategoriesArray.pop();
                renderCategoriesUI();
            }
        });
    }

    if (localStorage.getItem('sync_pending') === 'true') {
        document.querySelectorAll('.sync-pending-indicator, #syncPendingDot, [data-sync-indicator]').forEach(el => el.classList.remove('d-none'));
    }
});

document.addEventListener("DOMContentLoaded", async function() {
    const defaultLang = localStorage.getItem('dashboard_lang') || 'en';
    changeLanguage(defaultLang);
    
    await loadPostStoragePreference();
    initUserProfileTopbar();
    initPostsModule();
    updateVisitSiteLink();
    window.setupDynamicPreviewListeners();
    window.updateCharCounters();
});

document.addEventListener('focusin', (e) => {
    if (e.target.closest('.tox-tinymce, .tox-window, .tox-dialog, .tox-popup')) {
        e.stopImmediatePropagation();
    }
});