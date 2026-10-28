// ==========================================
// 1. GLOBAL UTILITIES, TRANSLATIONS & TOAST
// ==========================================
const translations = {
    id: {
        visit_site: "Kunjungi Situs",
        purge_cache: "Purge Cache",
        categories_title: "Manajemen Kategori Terpusat",
        categories_desc: "Lihat ringkasan kategori artikel dan ubah nama kategori.",
        th_catname: "Nama Kategori",
        th_catcount: "Jumlah Artikel",
        th_renameaction: "Aksi Ubah Nama",
        loading_categories: "Memuat kategori..."
    },
    en: {
        visit_site: "Visit Site",
        purge_cache: "Purge Cache",
        categories_title: "Centralized Category Management",
        categories_desc: "View category summaries and rename categories.",
        th_catname: "Category Name",
        th_catcount: "Article Count",
        th_renameaction: "Rename Action",
        loading_categories: "Loading categories..."
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
// 3. CATEGORIES SPECIFIC FUNCTIONS
// ==========================================
async function loadCategories() {
    const tbody = document.getElementById('categoriesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">Loading categories...</td></tr>';
    try {
        const res = await fetch('/api/categories');
        const cats = await res.json();
        tbody.innerHTML = "";
        if (!cats.length) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">No categories found.</td></tr>';
            return;
        }
        cats.forEach(c => {
            const safeCat = (c.category || 'General').replace(/'/g, "\\'");
            tbody.innerHTML += `
            <tr>
                <td class="ps-3 fw-bold text-dark"><i class="bi bi-tag text-primary me-2"></i> ${c.category || 'General'}</td>
                <td><span class="badge bg-light text-secondary border">${c.count} Articles</span></td>
                <td class="text-end pe-3">
                    <button class="btn btn-sm wp-btn-secondary px-3" onclick="renameCategory('${safeCat}')"><i class="bi bi-pencil me-1"></i> Rename</button>
                </td>
            </tr>`;
        });
    } catch(e) { 
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Failed to load categories.</td></tr>'; 
    }
}

async function renameCategory(oldCategory) {
    const newCat = prompt(`Enter a new name for category "${oldCategory}":`, oldCategory);
    if (!newCat || newCat.trim() === oldCategory) return;
    
    try {
        const res = await fetch('/api/categories/rename', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ oldCategory, newCategory: newCat.trim() })
        });
        if (res.ok) { 
            showToast("Category successfully renamed!"); 
            loadCategories(); 
        } else {
            throw new Error("Failed to rename category.");
        }
    } catch(err) {
        showToast(err.message, 'danger');
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
                
                // Update Visit Site element href using site_url from global:settings
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
    loadCategories();
    updateVisitSiteLink();
});