// ==========================================
// 1. GLOBAL UTILITIES & TRANSLATIONS
// ==========================================
const translations = {
    id: {
        visit_site: "Kunjungi Situs",
        purge_cache: "Purge Cache"
    },
    en: {
        visit_site: "Visit Site",
        purge_cache: "Purge Cache"
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
// 3. DISQUS COMMENT MODERATION FEATURE
// ==========================================
async function loadDisqusPosts() {
    const statusEl = document.getElementById('disqusStatusFilter');
    const tbody = document.getElementById('disqusPostsTableBody');
    if (!statusEl || !tbody) return;
    
    const status = statusEl.value;
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">Loading comments...</td></tr>`;
    
    try {
        const res = await fetch(`/api/disqus/posts?status=${status}`);
        const posts = await res.json();
        
        if (!posts || posts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No comments found.</td></tr>`;
            return;
        }
        
        tbody.innerHTML = posts.map(p => `
            <tr>
                <td class="ps-3 fw-bold">${p.author.name}</td>
                <td style="max-width: 400px;" class="text-truncate">${p.message}</td>
                <td>${new Date(p.createdAt).toLocaleDateString()}</td>
                <td class="text-end pe-3">
                    ${status !== 'approved' ? `<button class="btn btn-sm btn-success me-1 py-0 px-2" style="font-size:11px;" onclick="moderateDisqus('${p.id}', 'approve')"><i class="bi bi-check"></i> Approve</button>` : ''}
                    ${status !== 'spam' ? `<button class="btn btn-sm btn-warning me-1 py-0 px-2" style="font-size:11px;" onclick="moderateDisqus('${p.id}', 'spam')"><i class="bi bi-exclamation-triangle"></i> Spam</button>` : ''}
                    <button class="btn btn-sm btn-danger py-0 px-2" style="font-size:11px;" onclick="moderateDisqus('${p.id}', 'delete')"><i class="bi bi-trash"></i> Delete</button>
                </td>
            </tr>
        `).join('');
    } catch(err) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger">Failed to load Disqus data.</td></tr>`;
    }
}

async function moderateDisqus(postId, action) {
    if (!confirm(`Are you sure you want to perform the "${action}" action on this comment?`)) return;
    try {
        const res = await fetch('/api/disqus/moderate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId, action })
        });
        if (res.ok) {
            showToast("Disqus moderation action successfully processed!");
            loadDisqusPosts();
        } else {
            showToast("Failed to process moderation action.", "danger");
        }
    } catch(err) {
        showToast("A network error occurred.", "danger");
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
// 4. MAIN DISQUS PAGE INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    const defaultLang = localStorage.getItem('dashboard_lang') || 'en';
    changeLanguage(defaultLang);
    initUserProfileTopbar();
    loadDisqusPosts();
    updateVisitSiteLink();
});