// ==========================================
// OVERVIEW MODULE - WP-CMS Dashboard
// ==========================================

// 1. Toast Notification Helper
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

// 2. Logout Handler

// 3. Sidebar Mobile/Desktop Toggle
function toggleSidebar() {
    if (window.innerWidth > 768) {
        document.body.classList.toggle('sidebar-collapsed');
    } else {
        document.body.classList.toggle('sidebar-mobile-open');
    }
}

// 4. Localization Dictionary & Change Language
const translations = {
    id: {
        visit_site: "Kunjungi Situs",
        purge_cache: "Purge Cache",
        logout_btn: "Logout"
    },
    en: {
        visit_site: "Visit Site",
        purge_cache: "Purge Cache",
        logout_btn: "Logout"
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

// 5. Purge Cloudflare Cache
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

// 6. Load Topbar User Info & Overview Statistics Cards
async function loadOverviewData() {
    try {
        // Load User Profile Info for Topbar
        const profileRes = await fetch('/api/user/profile');
        if (profileRes.ok) {
            const user = await profileRes.json();
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

    try {
        // Load Post Counts (Published & Drafts)
        const countRes = await fetch('/api/posts/counts');
        if (countRes.ok) {
            const counts = await countRes.json();
            const totalPostsEl = document.getElementById('stat-total-posts');
            const draftsEl = document.getElementById('stat-drafts');
            if (totalPostsEl) totalPostsEl.innerText = counts.published || 0;
            if (draftsEl) draftsEl.innerText = counts.draft || 0;
        }

        // Load Users Count
        const usersRes = await fetch('/api/users/list');
        if (usersRes.ok) {
            const users = await usersRes.json();
            const usersEl = document.getElementById('stat-users');
            if (usersEl) usersEl.innerText = users.length || 1;
        }

        // Load Analytics Summary (Pageviews Today)
        const summaryRes = await fetch('/api/analytics/summary');
        if (summaryRes.ok) {
            const sumData = await summaryRes.json();
            const pageviewsEl = document.getElementById('stat-pageviews');
            if (pageviewsEl) pageviewsEl.innerText = sumData.pageViews || 0;
        }
    } catch(e) {
        console.error("Failed to load overview analytics data:", e);
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

// 7. Initialization on DOMContentLoaded
document.addEventListener("DOMContentLoaded", function() {
    const defaultLang = localStorage.getItem('dashboard_lang') || 'en';
    changeLanguage(defaultLang);
    loadOverviewData();
    updateVisitSiteLink();
});