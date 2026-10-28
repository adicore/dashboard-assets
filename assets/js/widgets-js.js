// ==========================================
// WIDGETS & POST ADS MODULE - WP-CMS Dashboard
// ==========================================

let adRulesList = [];

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

// 2. Button Loading Helper
async function setButtonLoading(btn, isLoading, loadingText = 'Saving...') {
    if (!btn) return;
    if (isLoading) {
        btn.dataset.originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${loadingText}`;
    } else {
        btn.innerHTML = `<i class="bi bi-check2 me-1"></i> Success!`;
        btn.classList.add('btn-success');
        btn.classList.remove('wp-btn-primary', 'btn-outline-primary');
        setTimeout(() => {
            btn.innerHTML = btn.dataset.originalHtml || 'Save';
            btn.disabled = false;
            btn.classList.remove('btn-success');
            btn.classList.add('wp-btn-primary');
        }, 1200);
    }
}

// 3. Sidebar Toggle
function toggleSidebar() {
    if (window.innerWidth > 768) {
        document.body.classList.toggle('sidebar-collapsed');
    } else {
        document.body.classList.toggle('sidebar-mobile-open');
    }
}

// 4. Purge Cloudflare Cache
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

// 5. Localization Dictionary & Language Switcher
const translations = {
    id: {
        visit_site: "Kunjungi Situs",
        purge_cache: "Purge Cache",
        logout_btn: "Logout",
        menu_widgets: "Widget & Iklan Post"
    },
    en: {
        visit_site: "Visit Site",
        purge_cache: "Purge Cache",
        logout_btn: "Logout",
        menu_widgets: "Widgets & Post Ads"
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

// 6. User Profile Info Fetch
async function loadUserProfileInfo() {
    try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
            const user = await res.json();
            const emailEl = document.getElementById('adminBarUserEmail');
            if (emailEl) emailEl.innerText = user.email || 'Admin';
            const usernameEl = document.getElementById('topbarUsername');
            if (usernameEl && user.name) usernameEl.innerText = user.name;
            const avatarEl = document.getElementById('topbarUserAvatar');
            if (avatarEl && user.avatar) avatarEl.src = user.avatar;
            document.body.setAttribute('data-role', user.role || 'administrator');
            document.body.setAttribute('data-email', user.email || '');
        }
    } catch(e) {}
}

// 7. Post Widgets Configuration Functions
async function loadPostWidgetsConfig() {
    try {
        const res = await fetch('/api/widgets/post-widgets');
        let txt = "";
        if (res.ok) {
            txt = await res.text();
        } else {
            const kvRes = await fetch('/api/kv?key=global:post_widgets');
            txt = await kvRes.text();
        }

        if (txt) {
            let data = typeof txt === 'string' ? JSON.parse(txt) : txt;
            if (typeof data === 'string') data = JSON.parse(data);

            const adEl = document.getElementById('inpTopPostAd');
            if (adEl) adEl.value = data.top_ad || data.top_post_ad || '';
            
            const container = document.getElementById('sidebarWidgetsContainer');
            if (container) {
                container.innerHTML = '';
                const sidebarList = Array.isArray(data.sidebar) ? data.sidebar : (Array.isArray(data.sidebar_widgets) ? data.sidebar_widgets : []);
                sidebarList.forEach((w, idx) => {
                    container.insertAdjacentHTML('beforeend', generateWidgetRowHtml(w.type || 'ad', w.title || '', w.content || w.code || '', idx));
                });
            }
        }
    } catch(e) {
        console.error("Error loading post widgets:", e);
    }
}

function generateWidgetRowHtml(type = 'ad', title = '', content = '', index = 0) {
    return `
    <div class="widget-row border p-3 rounded bg-light position-relative mb-3">
        <button type="button" class="btn-close position-absolute top-0 end-0 m-3" onclick="this.closest('.widget-row').remove()"></button>
        <div class="row g-3">
            <div class="col-md-4">
                <label class="form-label small fw-semibold">Widget Type</label>
                <select class="form-select form-select-sm w-widget-type">
                    <option value="ad" ${type==='ad'?'selected':''}>Ad Box / Banner</option>
                    <option value="custom_html" ${type==='custom_html'?'selected':''}>Custom HTML / Text</option>
                    <option value="popular_posts" ${type==='popular_posts'?'selected':''}>Popular Posts List</option>
                </select>
            </div>
            <div class="col-md-8">
                <label class="form-label small fw-semibold">Widget Title (Heading)</label>
                <input type="text" class="form-control form-control-sm w-widget-title" value="${title}" placeholder="Example: Sponsored Ad">
            </div>
            <div class="col-12">
                <label class="form-label small fw-semibold">Content / HTML Code (Optional)</label>
                <textarea class="form-control form-control-sm code-editor w-widget-content" rows="3" placeholder="Fill content or ad script...">${content}</textarea>
            </div>
        </div>
    </div>`;
}

window.addSidebarWidgetRow = function() {
    const cont = document.getElementById('sidebarWidgetsContainer');
    if (cont) cont.insertAdjacentHTML('beforeend', generateWidgetRowHtml());
};

window.savePostWidgetsConfig = async function() {
    const btn = event ? event.currentTarget : null;
    if (btn) setButtonLoading(btn, true, "Saving Widgets...");
    
    const top_ad = document.getElementById('inpTopPostAd')?.value || '';
    const rows = document.querySelectorAll('.widget-row');
    let sidebar = [];
    
    rows.forEach(r => {
        sidebar.push({
            type: r.querySelector('.w-widget-type')?.value || 'ad',
            title: r.querySelector('.w-widget-title')?.value || '',
            content: r.querySelector('.w-widget-content')?.value || ''
        });
    });

    const configData = { top_ad, sidebar };

    try {
        let res = await fetch('/api/widgets/post-widgets', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(configData)
        });
        
        if (res.ok) {
            if (btn) setButtonLoading(btn, false);
            showToast("Post widget configuration successfully saved to GitHub & KV!");
        } else {
            throw new Error(await res.text());
        }
    } catch(e) {
        if (btn) setButtonLoading(btn, false);
        showToast("Failed to save widget configuration: " + e.message, "danger");
    }
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
    } catch (e) {
        console.error("Failed to load global settings:", e);
    }
}

// ==========================================
// 8. DYNAMIC MULTI-RULE AD INJECTOR FUNCTIONS
// ==========================================

function generateAdUnitRowHtml(rule = {}, index = 1) {
    const label = rule.label || '';
    const position = rule.position || 'after_p3';
    const target = rule.target || 'all';
    const code = rule.code || '';

    return `
    <div class="dynamic-ad-row p-3 bg-light border rounded-3 position-relative mb-3">
        <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
            <span class="fw-bold small text-dark"><i class="bi bi-badge-ad me-1 text-primary"></i> Ad Unit #${index}</span>
            <button type="button" class="btn btn-sm btn-outline-danger border-0" onclick="removeDynamicAdUnitRow(this)" title="Remove Ad Unit">
                <i class="bi bi-trash"></i>
            </button>
        </div>
        <div class="row g-3">
            <div class="col-md-4">
                <label class="form-label small fw-semibold text-secondary">Ad Label / Name</label>
                <input type="text" class="form-control form-control-sm mb-2 inp-ad-label" value="${label}" placeholder="e.g. In-Article Banner ${index}">
                
                <label class="form-label small fw-semibold text-secondary">Injection Position</label>
                <select class="form-select form-select-sm mb-2 inp-ad-position">
                    <option value="after_p1" ${position==='after_p1'?'selected':''}>After Paragraph 1</option>
                    <option value="after_p2" ${position==='after_p2'?'selected':''}>After Paragraph 2</option>
                    <option value="after_p3" ${position==='after_p3'?'selected':''}>After Paragraph 3</option>
                    <option value="after_p4" ${position==='after_p4'?'selected':''}>After Paragraph 4</option>
                    <option value="after_p5" ${position==='after_p5'?'selected':''}>After Paragraph 5</option>
                    <option value="after_p6" ${position==='after_p6'?'selected':''}>After Paragraph 6</option>
                    <option value="middle" ${position==='middle'?'selected':''}>In the Middle of the Article (50%)</option>
                    <option value="bottom" ${position==='bottom'?'selected':''}>At the End of Article Content</option>
                </select>
                
                <label class="form-label small fw-semibold text-secondary">Target Page</label>
                <select class="form-select form-select-sm inp-ad-target">
                    <option value="all" ${target==='all'?'selected':''}>All Blog Posts</option>
                    <option value="travel" ${target==='travel'?'selected':''}>Travel Category Only</option>
                    <option value="exclude_home" ${target==='exclude_home'?'selected':''}>Except Home Page</option>
                </select>
            </div>
            <div class="col-md-8">
                <label class="form-label small fw-semibold text-secondary">AD / HTML Widget Code</label>
                <textarea class="form-control text-monospace small bg-white border inp-ad-code" rows="7" placeholder="Paste HTML / JS Script here...">${code}</textarea>
            </div>
        </div>
    </div>`;
}

window.addDynamicAdUnitRow = function() {
    const container = document.getElementById('dynamicAdsContainer');
    if (!container) return;
    const currentCount = container.querySelectorAll('.dynamic-ad-row').length + 1;
    container.insertAdjacentHTML('beforeend', generateAdUnitRowHtml({}, currentCount));
};

window.removeDynamicAdUnitRow = function(btn) {
    const row = btn.closest('.dynamic-ad-row');
    if (row) {
        row.remove();
        const rows = document.querySelectorAll('#dynamicAdsContainer .dynamic-ad-row');
        rows.forEach((r, idx) => {
            const badge = r.querySelector('.border-bottom span');
            if (badge) {
                badge.innerHTML = `<i class="bi bi-badge-ad me-1 text-primary"></i> Ad Unit #${idx + 1}`;
            }
        });
    }
};

window.loadDynamicInjector = async function() {
    const container = document.getElementById('dynamicAdsContainer');
    if (!container) return;

    try {
        const response = await fetch('/api/widgets/dynamic-ad');
        if (response.ok) {
            const data = await response.json();
            const enableEl = document.getElementById('enableDynamicAds');
            if (enableEl) enableEl.checked = data.enable_global !== false && data.enabled !== false;

            const rules = Array.isArray(data.rules) ? data.rules : (Array.isArray(data.units) ? data.units : []);
            if (rules.length > 0) {
                container.innerHTML = '';
                rules.forEach((rule, idx) => {
                    container.insertAdjacentHTML('beforeend', generateAdUnitRowHtml(rule, idx + 1));
                });
            }
        }
    } catch(e) {
        console.error("Failed to load ad rules:", e);
    }
};

window.saveDynamicInjector = async function(event) {
    if (event) event.preventDefault();
    const btn = event ? event.currentTarget : null;
    const originalText = btn ? btn.innerHTML : '';
    const enableGlobal = document.getElementById('enableDynamicAds')?.checked ?? true;

    if (btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving Injection Rules...';
        btn.disabled = true;
    }

    const rows = document.querySelectorAll('#dynamicAdsContainer .dynamic-ad-row');
    const rules = [];
    rows.forEach((row) => {
        rules.push({
            label: row.querySelector('.inp-ad-label')?.value || '',
            position: row.querySelector('.inp-ad-position')?.value || 'after_p3',
            target: row.querySelector('.inp-ad-target')?.value || 'all',
            code: row.querySelector('.inp-ad-code')?.value || ''
        });
    });

    try {
        const payload = {
            enable_global: enableGlobal,
            rules: rules
        };

        const res = await fetch('/api/widgets/dynamic-ad', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload) 
        });
        
        if (res.ok) {
            showToast("Ad injection rules saved successfully!", "success");
        } else {
            const err = await res.text();
            throw new Error(err);
        }
    } catch(e) {
        showToast("Failed to save injection rules: " + e.message, "danger");
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
};

// 9. Page Initialization
document.addEventListener("DOMContentLoaded", function() {
    const defaultLang = localStorage.getItem('dashboard_lang') || 'en';
    changeLanguage(defaultLang);
    loadUserProfileInfo();
    loadPostWidgetsConfig();
    updateVisitSiteLink();
    document.body.classList.add("tab-ready");
    window.loadDynamicInjector();
});