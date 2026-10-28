// ==========================================
// ACTIVITIES MODULE - WP-CMS Dashboard
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

// 3. Sidebar Toggle (Mobile / Desktop)
function toggleSidebar() {
    if (window.innerWidth > 768) {
        document.body.classList.toggle('sidebar-collapsed');
    } else {
        document.body.classList.toggle('sidebar-mobile-open');
    }
}

// 4. Localization Dictionary & Language Switcher
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

// 6. Load User Profile Info & Audit Trail Activities Data
async function loadActivitiesData() {
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
        const actRes = await fetch('/api/activities');
        if (actRes.ok) {
            const acts = await actRes.json();
            const actContainer = document.getElementById('activity-list-container');
            
            if (actContainer) {
                actContainer.innerHTML = '';
                if (!acts || acts.length === 0) {
                    actContainer.innerHTML = '<div class="text-muted text-center py-4" style="margin-left: 2rem;">No recent activity recorded.</div>';
                } else {
                    acts.forEach((a, index) => {
                        const timeStr = new Date(a.created_at || Date.now()).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
                        });
                        
                        let nodeClass = "node-purple";
                        let badgeClass = "badge-purple";
                        
                        const type = (a.action_type || '').toLowerCase();
                        if (type.includes('delete') || type.includes('remove') || type.includes('error')) {
                            nodeClass = "node-red";
                            badgeClass = "badge-red";
                        } else if (type.includes('update') || type.includes('edit')) {
                            nodeClass = "node-yellow";
                            badgeClass = "badge-yellow";
                        } else if (type.includes('create') || type.includes('success') || type.includes('login')) {
                            nodeClass = "node-green";
                            badgeClass = "badge-green";
                        }

                        actContainer.innerHTML += `
                            <div class="timeline-item">
                                <div class="timeline-node ${nodeClass}"></div>
                                <!-- CHANGE: text-dark and text-secondary -->
                                <div class="mb-1 text-dark fw-bold">
                                    <span class="text-secondary fw-normal">${a.description || 'The system makes changes'}</span>
                                    <span class="badge ${badgeClass} ms-2 fw-medium px-2 py-1">${a.action_type || 'SYSTEM'}</span>
                                </div>
                                <div class="small d-flex justify-content-between pe-4" style="color: #64748b;">
                                    <span>${timeStr} • <span style="color: #a78bfa;">by ${a.user_email || 'system'}</span></span>
                                </div>
                            </div>
                        `;
                    });
                }
            }
        }
    } catch(e) {
        const actContainer = document.getElementById('activity-list-container');
        if (actContainer) {
            actContainer.innerHTML = '<div class="text-danger text-center py-4" style="margin-left: 2rem;">Failed to load server activity data.</div>';
        }
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
    loadActivitiesData();
    updateVisitSiteLink();
});