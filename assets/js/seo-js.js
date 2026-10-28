// ==========================================
// 1. Core Utilities & UI Handlers
// ==========================================
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

function toggleSidebar() {
    if (window.innerWidth > 768) {
        document.body.classList.toggle('sidebar-collapsed');
    } else {
        document.body.classList.toggle('sidebar-mobile-open');
    }
}

async function purgeCloudflareCache() {
    if (!confirm("Are you sure you want to clear all Cloudflare cache?")) return;
    
    const btn = document.getElementById('purgecache');
    if (!btn) return;
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

// ==========================================
// 2. Translations & Language Selector
// ==========================================
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

// ==========================================
// 3. User Profile Topbar Sync
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
            document.body.setAttribute('data-role', user.role || 'administrator');
            document.body.setAttribute('data-email', user.email || '');
        }
    } catch(e) {}
}

// ==========================================
// 4. SEO Tools Core Functions (GSC, Rank Tracker, Broken Links)
// ==========================================
async function loadGscData() {
    const tbody = document.getElementById('gscTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading data from Google Search Console...</td></tr>`;
    try {
        const res = await fetch('/api/seo/gsc-data', { method: 'POST' });
        const data = await res.json();
        if (data.error) { tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-3">Error: ${data.error}</td></tr>`; return; }
        const rows = data.rows || [];
        if (rows.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No data found.</td></tr>`; return; }
        let html = '';
        rows.forEach(r => {
            html += `<tr><td class="ps-3 fw-medium text-dark">${r.keys[0]}</td><td><a href="${r.keys[1] || '#'}" target="_blank" class="text-decoration-none text-truncate d-inline-block" style="max-width: 300px;">${r.keys[1] || '-'}</a></td><td class="text-center">${r.clicks}</td><td class="text-center">${r.impressions}</td><td class="text-end pe-3 fw-bold text-primary">${Math.round(r.position * 10) / 10}</td></tr>`;
        });
        tbody.innerHTML = html;
    } catch (err) { tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-3">Failed to load data: ${err.message}</td></tr>`; }
}

async function runRankTracker() {
    const inputEl = document.getElementById('trackerKeywordsInput');
    const tbody = document.getElementById('rankTableBody');
    if (!inputEl || !tbody) return;

    const input = inputEl.value;
    if (!input.trim()) { alert("Please enter at least one keyword."); return; }
    const keywords = input.split(',').map(k => k.trim()).filter(Boolean);
    
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Tracking keyword rankings...</td></tr>`;
    try {
        const res = await fetch('/api/seo/rank-tracker', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords }) });
        const data = await res.json();
        if (data.error) { tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-3">Error: ${data.error}</td></tr>`; return; }
        let html = '';
        data.rankings.forEach(item => {
            html += `<tr><td class="ps-3 fw-medium text-dark">${item.keyword}</td><td class="text-center fw-bold ${item.position === 'Not Ranked' ? 'text-muted' : 'text-success'}">${item.position}</td><td class="text-center">${item.clicks}</td><td class="text-end pe-3">${item.impressions}</td></tr>`;
        });
        tbody.innerHTML = html;
    } catch (err) { tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-3">Failed to track: ${err.message}</td></tr>`; }
}

async function runBrokenLinkChecker() {
    const btn = document.getElementById('btnCheckLinks');
    const tbody = document.getElementById('brokenLinksTableBody');
    if (!btn || !tbody) return;

    btn.disabled = true;
    tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Scanning all article links... This process may take time.</td></tr>`;
    try {
        const res = await fetch('/api/seo/check-links', { method: 'POST' });
        const data = await res.json();
        if (data.error) { tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-3">Error: ${data.error}</td></tr>`; btn.disabled = false; return; }
        const broken = data.broken_links || [];
        if (broken.length === 0) { tbody.innerHTML = `<tr><td colspan="3" class="text-center text-success py-3 fw-medium"><i class="bi bi-check-circle me-1"></i> Awesome! No broken links found in your articles.</td></tr>`; btn.disabled = false; return; }
        let html = '';
        broken.forEach(b => {
            html += `<tr><td class="ps-3 fw-medium text-dark"><a href="/post/${b.post_slug}" target="_blank" class="text-decoration-none">${b.post_title}</a></td><td><a href="${b.url}" target="_blank" class="text-danger text-decoration-underline text-truncate d-inline-block" style="max-width: 300px;">${b.url}</a></td><td class="text-end pe-3"><span class="badge bg-danger">${b.status}</span></td></tr>`;
        });
        tbody.innerHTML = html;
    } catch (err) { tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-3">Failed to scan: ${err.message}</td></tr>`; } finally { btn.disabled = false; }
}

// ==========================================
// 5. Page Initialization
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    const defaultLang = localStorage.getItem('dashboard_lang') || 'en';
    document.body.classList.add("tab-ready");
    changeLanguage(defaultLang);
    initUserProfileTopbar();
    loadGscData();
    runRankTracker();
    runBrokenLinkChecker();
});