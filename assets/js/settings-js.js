// ==========================================
// SETTINGS MODULE - WP-CMS Dashboard (Full Automation Update)
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

async function setButtonLoading(btn, isLoading, loadingText = 'Saving...') {
    if (!btn) return;
    if (isLoading) {
        btn.dataset.originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${loadingText}`;
    } else {
        btn.innerHTML = `<i class="bi bi-check2 me-1"></i> Success!`;
        btn.classList.add('btn-success');
        btn.classList.remove('wp-btn-primary', 'btn-outline-primary', 'btn-dark', 'btn-secondary');
        setTimeout(() => {
            btn.innerHTML = btn.dataset.originalHtml || 'Save';
            btn.disabled = false;
            btn.classList.remove('btn-success');
            if (btn.id === 'btnSaveHeader') btn.classList.add('btn-secondary');
            else btn.classList.add('wp-btn-primary');
        }, 1200);
    }
}

function clientSideMinify(html) {
    if (!html) return "";
    return html
        .replace(/<!--[\s\S]*?-->/gis, (match) => {
            return (match.includes('LOOP') || match.includes('IF_HAS_CHILDREN') || match.includes('END_IF')) ? match : '';
        })
        .replace(/\>[^\Sr\n]+/g, '>')
        .replace(/[^\Sr\n]+\</g, '<')
        .replace(/[\r\n]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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

const translations = {
    id: {
        visit_site: "Kunjungi Situs",
        purge_cache: "Purge Cache",
        logout_btn: "Logout",
        settings_title: "Configuration & Settings",
        maintenance_mode: "Mode Pemeliharaan (Maintenance Mode)",
        maintenance_desc: "Aktifkan untuk menampilkan halaman perbaikan sementara bagi pengunjung publik.",
        edit_maintenance: "Edit HTML Maintenance",
        label_siteurl: "Domain Website Utama (Base URL)",
        label_sitetitle: "Judul Situs (SEO Global)",
        label_email: "Email Support/Kontak",
        label_logo: "Tautan Logo URL",
        upload_logo: "Upload Logo ke GitHub",
        label_whatsapp: "Nomor WhatsApp (Format: 62812...)",
        label_wamessage: "Template Pesan Default WhatsApp",
        label_metadesc: "Fallback Default Meta Description (SEO Cadangan)",
        label_ogimage: "Fallback Default OG Image URL (Gambar Share Sosmed)",
        label_customheader: "Custom Script Header (Disuntikkan sebelum </head>)",
        label_customfooter: "Custom Script Footer (Disuntikkan sebelum </body>)",
        btn_savesettings: "Simpan Pengaturan Global",
        btn_cancel: "Batal",
        btn_save: "Simpan",
        modal_addfile_title: "Tambah File Baru",
        label_pathfile: "Path File",
        label_content: "Konten"
    },
    en: {
        visit_site: "Visit Site",
        purge_cache: "Purge Cache",
        logout_btn: "Logout",
        settings_title: "Configuration & Settings",
        maintenance_mode: "Maintenance Mode",
        maintenance_desc: "Enable temporary maintenance page.",
        edit_maintenance: "Edit Maintenance HTML",
        label_siteurl: "Main Website Domain (Base URL)",
        label_sitetitle: "Site Title (Global SEO)",
        label_email: "Support/Contact Email",
        label_logo: "Logo URL Link",
        upload_logo: "Upload Logo to GitHub",
        label_whatsapp: "WhatsApp Number",
        label_wamessage: "Default WhatsApp Message",
        label_metadesc: "Fallback Default Meta Description",
        label_ogimage: "Fallback Default OG Image URL",
        label_customheader: "Custom Script Header",
        label_customfooter: "Custom Script Footer",
        btn_savesettings: "Save All Settings",
        btn_cancel: "Cancel",
        btn_save: "Save",
        modal_addfile_title: "Add New File",
        label_pathfile: "File Path",
        label_content: "Content"
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

window.uploadLogoFile = async function(event) {
    const file = event.target.files[0]; 
    if(!file) return;
    const statusEl = document.getElementById('logoUploadStatus');
    if (statusEl) statusEl.innerText = "Compressing & Uploading logo...";
    
    try {
        const compressed = await compressAndConvertImage(file);
        const storageProvider = document.getElementById('inpStorageSettings')?.value || 'github';

        const res = await fetch('/api/github/upload-image', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                filename: 'logo-' + Date.now() + '-' + compressed.filename, 
                content: compressed.content,
                storage_provider: storageProvider 
            })
        });

        if(res.ok){
            const data = await res.json();
            document.getElementById('inpLogoUrl').value = data.url;
            if (statusEl) statusEl.innerHTML = `Use placeholder <code class="text-primary">{{LOGO_URL}}</code> in layout.`;
            showToast("Logo successfully uploaded to " + (storageProvider === 'imgbb' ? "ImgBB" : "GitHub") + "!");
        } else {
            const errText = await res.text();
            if (statusEl) statusEl.innerText = "Upload failed: " + errText;
            showToast("Failed to upload logo: " + errText, "danger");
        }
    } catch(err) {
        if (statusEl) statusEl.innerText = "Upload failed";
        showToast("An error occurred: " + err.message, "danger");
    }
}

window.uploadFaviconFile = async function(event) {
    const file = event.target.files[0]; 
    if(!file) return;
    const statusEl = document.getElementById('faviconUploadStatus');
    if (statusEl) statusEl.innerText = "Compressing & Uploading favicon...";
    
    try {
        const compressed = await compressAndConvertImage(file);
        const storageProvider = document.getElementById('inpStorageSettings')?.value || 'github';

        const res = await fetch('/api/github/upload-image', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                filename: 'favicon-' + Date.now() + '-' + compressed.filename, 
                content: compressed.content,
                storage_provider: storageProvider
            })
        });

        if(res.ok){
            const data = await res.json();
            document.getElementById('inpFaviconUrl').value = data.url;
            if (statusEl) statusEl.innerHTML = `Use placeholder <code class="text-primary">{{FAVICON_URL}}</code> in layout.`;
            showToast("Favicon successfully uploaded to " + (storageProvider === 'imgbb' ? "ImgBB" : "GitHub") + "!");
        } else {
            const errText = await res.text();
            if (statusEl) statusEl.innerText = "Upload failed: " + errText;
            showToast("Failed to upload favicon: " + errText, "danger");
        }
    } catch(err) {
        if (statusEl) statusEl.innerText = "Upload failed";
        showToast("An error occurred: " + err.message, "danger");
    }
}

window.uploadOgImageFile = async function(event) {
    const file = event.target.files[0]; 
    if(!file) return;
    
    try {
        const compressed = await compressAndConvertImage(file);
        const storageProvider = document.getElementById('inpStorageSettings')?.value || 'github';

        const res = await fetch('/api/github/upload-image', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                filename: 'og-' + Date.now() + '-' + compressed.filename, 
                content: compressed.content,
                storage_provider: storageProvider
            })
        });

        if(res.ok){
            const data = await res.json();
            document.getElementById('inpDefaultOgImage').value = data.url;
            showToast("OG Image successfully uploaded to " + (storageProvider === 'imgbb' ? "ImgBB" : "GitHub") + "!");
        } else {
            const errText = await res.text();
            showToast("Failed to upload OG image: " + errText, "danger");
        }
    } catch(err) {
        showToast("An error occurred: " + err.message, "danger");
    }
}

async function loadGlobalSettings() {
    try {
        const res = await fetch('/api/kv?key=global:settings');
        if (res.ok) {
            const txt = await res.text();
            if (!txt) return;
            const data = JSON.parse(txt);
            
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
            const setCheck = (id, val, defaultVal = false) => { 
                const el = document.getElementById(id); 
                if (el) el.checked = (val !== undefined && val !== null) ? (val === true || val === 'on' || val === 1 || val === '1') : defaultVal; 
            };

            setVal('inpSiteUrl', data.site_url);
            const visitLink = document.getElementById('visitSiteLink');
            if (visitLink && data.site_url) visitLink.href = data.site_url;
            
            setVal('inpSiteTitle', data.site_title);
            setVal('inpWaPhone', data.whatsapp_phone || data.whatsapp_number);
            setVal('inpLogoUrl', data.logo_url);
            setVal('inpFaviconUrl', data.favicon_url);
            setCheck('inpMaintenanceMode', data.maintenance_mode);
            setVal('inpSupportEmail', data.support_email);
            setVal('inpWaMessage', data.whatsapp_message);
            
            setVal('inpStorageSettings', data.storage_provider_settings || 'github');
            setVal('inpStoragePosts', data.storage_provider_posts || 'github');
            setVal('inpStoragePages', data.storage_provider_pages || 'github');
            setVal('inpStorageUsers', data.storage_provider_users || 'github');
            
            setVal('inpTimezone', data.timezone || 'Asia/Jakarta');
            setVal('inpDateFormat', data.date_format || 'DD/MM/YYYY');
            
            setCheck('inpPrivacySearchEngine', data.privacy_search_engine, true);
            setCheck('inpForceSSL', data.force_ssl, true);
            setVal('inpIndexLayout', data.index_layout || 'index, follow');
            setVal('inpIndexHome', data.index_home || 'index, follow');
            setVal('inpIndexPost', data.index_post || 'index, follow');
            setVal('inpIndexCategory', data.index_category || 'noindex, follow');
            setVal('inpTitleSeparator', data.title_separator || '-');

            setVal('inpSocialInstagram', data.social_instagram);
            setVal('inpSocialFacebook', data.social_facebook);
            setVal('inpSocialTwitter', data.social_twitter);
            setVal('inpSocialTiktok', data.social_tiktok);
            setVal('inpSocialYoutube', data.social_youtube);
            setVal('inpSocialLinkedin', data.social_linkedin);
            
            setVal('inpDefaultMetaDesc', data.default_meta_desc);
            setVal('inpDefaultOgImage', data.default_og_image);
            setVal('inpGoogleVerify', data.google_verify);
            setVal('inpBingVerify', data.bing_verify);
            setVal('inpYandexVerify', data.yandex_verify);

            setVal('inpCustomHeader', data.custom_header);
            setVal('inpCustomFooter', data.custom_footer);

            const domainInput = document.getElementById('inpGithubDomain');
            if (domainInput && data.site_url) {
                try {
                    const parsedUrl = new URL(data.site_url);
                    domainInput.value = parsedUrl.hostname;
                    domainInput.disabled = true;
                    
                    const btnConnect = document.getElementById('btnConnectDomain');
                    const btnEdit = document.getElementById('btnEditDomain');
                    if (btnConnect) btnConnect.classList.add('d-none');
                    if (btnEdit) btnEdit.classList.remove('d-none');
                } catch(e) {}
            }
        }
    } catch(e) {
        console.error("Failed to load global settings:", e);
    }
}

window.saveSettings = async function() {
    const btn = document.getElementById('btnSaveSettingsTop');
    setButtonLoading(btn, true, "Saving Settings...");
    const data = {
        site_url: document.getElementById('inpSiteUrl')?.value || '',
        site_title: document.getElementById('inpSiteTitle')?.value || '',
        whatsapp_phone: document.getElementById('inpWaPhone')?.value || '',
        logo_url: document.getElementById('inpLogoUrl')?.value || '',
        favicon_url: document.getElementById('inpFaviconUrl')?.value || '',
        maintenance_mode: document.getElementById('inpMaintenanceMode')?.checked || false,
        support_email: document.getElementById('inpSupportEmail')?.value || '',
        whatsapp_message: document.getElementById('inpWaMessage')?.value || '',
        
        storage_provider_settings: document.getElementById('inpStorageSettings')?.value || 'github',
        storage_provider_posts: document.getElementById('inpStoragePosts')?.value || 'github',
        storage_provider_pages: document.getElementById('inpStoragePages')?.value || 'github',
        storage_provider_users: document.getElementById('inpStorageUsers')?.value || 'github',
        
        timezone: document.getElementById('inpTimezone')?.value || 'Asia/Jakarta',
        date_format: document.getElementById('inpDateFormat')?.value || 'DD/MM/YYYY',
        
        privacy_search_engine: document.getElementById('inpPrivacySearchEngine') ? document.getElementById('inpPrivacySearchEngine').checked : true,
        force_ssl: document.getElementById('inpForceSSL') ? document.getElementById('inpForceSSL').checked : true,
        index_layout: document.getElementById('inpIndexLayout')?.value || 'index, follow',
        index_home: document.getElementById('inpIndexHome')?.value || 'index, follow',
        index_post: document.getElementById('inpIndexPost')?.value || 'index, follow',
        index_category: document.getElementById('inpIndexCategory')?.value || 'noindex, follow',
        title_separator: document.getElementById('inpTitleSeparator')?.value || '-',

        social_instagram: document.getElementById('inpSocialInstagram')?.value || '',
        social_facebook: document.getElementById('inpSocialFacebook')?.value || '',
        social_twitter: document.getElementById('inpSocialTwitter')?.value || '',
        social_tiktok: document.getElementById('inpSocialTiktok')?.value || '',
        social_youtube: document.getElementById('inpSocialYoutube')?.value || '',
        social_linkedin: document.getElementById('inpSocialLinkedin')?.value || '',
        
        default_meta_desc: document.getElementById('inpDefaultMetaDesc')?.value || '',
        default_og_image: document.getElementById('inpDefaultOgImage')?.value || '',
        google_verify: document.getElementById('inpGoogleVerify')?.value || '',
        bing_verify: document.getElementById('inpBingVerify')?.value || '',
        yandex_verify: document.getElementById('inpYandexVerify')?.value || '',
        
        custom_header: document.getElementById('inpCustomHeader')?.value || '',
        custom_footer: document.getElementById('inpCustomFooter')?.value || ''
    };
    
    try {
        const res = await fetch('/api/kv', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ key: 'global:settings', content: JSON.stringify(data) })
        });
        if(res.ok) {
            setButtonLoading(btn, false);
            if (data.site_url) {
                const siteLink = document.getElementById('visitSiteLink');
                if (siteLink) siteLink.href = data.site_url.trim();
            }
            showToast("Global settings successfully saved!");
        } else {
            throw new Error();
        }
    } catch(e) {
        setButtonLoading(btn, false);
        showToast("Failed to save global settings.", "danger");
    }
}

// ==========================================
// CLOUDFLARE MANAGEMENT (DNS, SPEED, CACHE, RULES)
// ==========================================

function getCurrentDomainHelper() {
    const siteUrl = document.getElementById('inpSiteUrl')?.value || '';
    if (siteUrl) {
        try { return new URL(siteUrl).hostname; } catch(e) {}
    }
    return window.location.hostname.replace('admin.', '');
}

async function loadDnsRecords() {
    const tbody = document.getElementById("dns-records-list");
    if (!tbody) return;
    const domain = getCurrentDomainHelper();
    
    try {
        const res = await fetch(`/api/cloudflare/dns?domain=${domain}`);
        const data = await res.json();
        
        if (data.success && data.data && data.data.length > 0) {
            tbody.innerHTML = data.data.map(record => `
                <tr>
                    <td><span class="badge bg-secondary">${record.type}</span></td>
                    <td>${record.name}</td>
                    <td class="text-truncate" style="max-width: 180px;" title="${record.content}">${record.content}</td>
                    <td>${record.proxied ? '<i class="bi bi-cloud-fill text-warning"></i> Proxied' : '<i class="bi bi-cloud text-muted"></i> DNS Only'}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editDnsRecord('${record.id}', '${record.type}', '${record.name}', '${record.content}', ${record.proxied})" title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteDnsRecord('${record.id}')" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No DNS records found.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-danger py-3">Failed to load DNS.</td></tr>`;
    }
}

function initCloudflareManagement() {
    const dnsForm = document.getElementById("cf-dns-form");
    if (dnsForm) {
        dnsForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const recordId = document.getElementById("dns-record-id").value;
            const type = document.getElementById("dns-type").value;
            const name = document.getElementById("dns-name").value;
            const content = document.getElementById("dns-content").value;
            const proxied = document.getElementById("dns-proxied").checked;
            const domain = getCurrentDomainHelper();

            if (!name || !content) {
                showToast("Name and Content are required!", "warning");
                return;
            }

            const method = recordId ? "PUT" : "POST";
            const payload = { domain, type, name, content, proxied, ...(recordId && { record_id: recordId }) };

            try {
                const res = await fetch('/api/cloudflare/dns', {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                
                if (data.success) {
                    showToast(recordId ? "DNS successfully updated!" : "DNS successfully added!");
                    resetDnsForm();
                    loadDnsRecords();
                } else {
                    showToast("Failed to save DNS: " + data.error, "danger");
                }
            } catch(err) {
                showToast("Network error: " + err.message, "danger");
            }
        });
    }

    loadDnsRecords();
    loadCloudflareSettings();
}

window.resetDnsForm = function() {
    document.getElementById("cf-dns-form").reset();
    document.getElementById("dns-record-id").value = "";
    document.getElementById("dnsSubmitBtn").innerHTML = '<i class="bi bi-plus-lg"></i>';
    document.getElementById("dnsCancelBtn").classList.add("d-none");
};

window.editDnsRecord = function(id, type, name, content, proxied) {
    document.getElementById("dns-record-id").value = id;
    document.getElementById("dns-type").value = type;
    document.getElementById("dns-name").value = name;
    document.getElementById("dns-content").value = content;
    document.getElementById("dns-proxied").checked = (proxied === "true" || proxied === true);
    
    document.getElementById("dnsSubmitBtn").innerHTML = '<i class="bi bi-check-lg"></i>';
    document.getElementById("dnsCancelBtn").classList.remove("d-none");
    window.scrollTo({ top: document.getElementById("cf-dns-form").offsetTop - 100, behavior: 'smooth' });
};

window.deleteDnsRecord = async function(recordId) {
    if (!confirm("Permanently delete this DNS record?")) return;
    try {
        const res = await fetch('/api/cloudflare/dns', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain: getCurrentDomainHelper(), record_id: recordId })
        });
        const data = await res.json();
        if (data.success) {
            showToast("DNS successfully deleted.");
            loadDnsRecords();
        } else {
            showToast("Failed to delete: " + data.error, "danger");
        }
    } catch (err) {
        showToast("A network error occurred.", "danger");
    }
};

async function loadCloudflareSettings() {
    const domain = getCurrentDomainHelper();
    if (!domain) return;
    
    try {
        const res = await fetch(`/api/cloudflare/settings?domain=${domain}`);
        const data = await res.json();
        
        if (data.success && data.data) {
            data.data.forEach(setting => {
                const elSelect = document.querySelector(`select.cf-setting-select[data-setting="${setting.id}"]`);
                if (elSelect) elSelect.value = setting.value;

                const elToggle = document.querySelector(`input.cf-setting-toggle[data-setting="${setting.id}"]`);
                if (elToggle) {
                    elToggle.checked = (setting.value === "on" || setting.value === true);
                }
            });
        }
    } catch (err) {
        console.error("Failed to sync Cloudflare settings:", err);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('.cf-setting-toggle, .cf-setting-select').forEach(el => {
        el.addEventListener('change', async (e) => {
            const target = e.target;
            const settingName = target.getAttribute('data-setting');
            const domain = getCurrentDomainHelper();
            let settingValue = target.tagName === 'INPUT' && target.type === 'checkbox' ? (target.checked ? "on" : "off") : target.value;

            try {
                const res = await fetch('/api/cloudflare/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ domain, setting_name: settingName, setting_value: settingValue })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`Setting ${settingName} updated!`);
                } else {
                    showToast("Update failed: " + data.error, "danger");
                    if (target.type === 'checkbox') target.checked = !target.checked;
                }
            } catch (err) {
                showToast("Failed to connect to server.", "danger");
                if (target.type === 'checkbox') target.checked = !target.checked;
            }
        });
    });
});

// ==========================================
// CUSTOM HTTP RESPONSE HEADERS MANAGEMENT
// ==========================================
async function loadCustomHeaders() {
    const tbody = document.getElementById('customHeadersTableBody');
    if (!tbody) return;
    
    try {
        const res = await fetch('/api/headers');
        if (res.ok) {
            const json = await res.json();
            
            if (json.error) {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger">Failed to load data: ${escapeHtml(json.error)}</td></tr>`;
                return;
            }

            const data = Array.isArray(json) ? json : (json.results || json.data || []);
            
            if (Array.isArray(data) && data.length > 0) {
                let rows = '';
                data.forEach(h => {
                    let matchBadge = '<span class="badge bg-success">All Requests</span>';
                    if (h.match_field && h.match_field !== 'all' && h.match_value) {
                        matchBadge = `<span class="badge bg-primary">${escapeHtml(h.match_field)}</span> <code class="text-dark">${escapeHtml(h.match_operator || 'eq')}</code> <span class="badge bg-dark">${escapeHtml(h.match_value)}</span>`;
                    }

                    rows += `<tr>
                        <td class="fw-semibold text-dark">${escapeHtml(h.header_name)}</td>
                        <td>${matchBadge}</td>
                        <td><code class="text-primary">${escapeHtml(h.header_value)}</code></td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteCustomHeader(${h.id})" title="Delete Header">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>`;
                });
                tbody.innerHTML = rows;
            } else {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No custom headers saved yet.</td></tr>';
            }
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger">Failed to load headers from server. Status: ' + res.status + '</td></tr>';
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger">Error loading header data: ' + escapeHtml(e.message) + '</td></tr>';
    }
}

window.saveCustomHeader = async function(event) {
    const nameInput = document.getElementById('inpHeaderName');
    const valueInput = document.getElementById('inpHeaderValue');
    const fieldInput = document.getElementById('inpHeaderMatchField');
    const operatorInput = document.getElementById('inpHeaderMatchOperator');
    const matchValueInput = document.getElementById('inpHeaderMatchValue');
    
    const header_name = nameInput ? nameInput.value.trim() : '';
    const header_value = valueInput ? valueInput.value.trim() : '';
    const match_field = fieldInput ? fieldInput.value : 'all';
    const match_operator = operatorInput ? operatorInput.value : 'eq';
    const match_value = matchValueInput ? matchValueInput.value.trim() : '';
    
    if (!header_name || !header_value) {
        showToast("Header Name and Header Value are required!", "warning");
        return;
    }

    const btn = event.currentTarget;
    setButtonLoading(btn, true, "Saving...");

    try {
        const res = await fetch('/api/headers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                header_name, 
                header_value, 
                operation: 'set',
                match_field,
                match_operator,
                match_value
            })
        });

        if (res.ok) {
            showToast("Custom Header successfully saved and synced to Cloudflare!", "success");
            if (nameInput) nameInput.value = '';
            if (valueInput) valueInput.value = '';
            if (matchValueInput) matchValueInput.value = '';
            loadCustomHeaders();
        } else {
            throw new Error(await res.text());
        }
    } catch(e) {
        showToast("Failed to save header: " + e.message, "danger");
    } finally {
        setButtonLoading(btn, false);
    }
};

window.deleteCustomHeader = async function(id) {
    if (!confirm("Are you sure you want to delete this HTTP header? The rule will also be deleted from Cloudflare Edge.")) return;

    try {
        const res = await fetch('/api/headers', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });

        if (res.ok) {
            showToast("Header successfully deleted!", "success");
            loadCustomHeaders();
        } else {
            throw new Error(await res.text());
        }
    } catch (e) {
        showToast("Failed to delete header: " + e.message, "danger");
    }
};

async function loadSeoRootFiles() {
    try {
        const resRobots = await fetch('/api/github/file?path=docs/robots.txt');
        if (resRobots.ok) {
            const dataRobots = await resRobots.json();
            const elRobots = document.getElementById('inpRobotsTxt');
            if (elRobots) elRobots.value = dataRobots.content || "";
        }
        
        const resAds = await fetch('/api/github/file?path=docs/ads.txt');
        if (resAds.ok) {
            const dataAds = await resAds.json();
            const elAds = document.getElementById('inpAdsTxt');
            if (elAds) elAds.value = dataAds.content || "";
        }
    } catch(e) {
        console.error("Failed to load root SEO files:", e);
    }
}

window.saveSeoRootFiles = async function(event) {
    const robotsTxt = document.getElementById('inpRobotsTxt')?.value || '';
    const adsTxt = document.getElementById('inpAdsTxt')?.value || '';
    
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;

    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Syncing...';
    btn.disabled = true;

    try {
        const resRobots = await fetch('/api/github/save', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ path: 'docs/robots.txt', content: robotsTxt }) 
        });
        
        const resAds = await fetch('/api/github/save', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ path: 'docs/ads.txt', content: adsTxt })
        });

        if (resRobots.ok && resAds.ok) {
            showToast("Root files (robots.txt & ads.txt) successfully synchronized to GitHub docs/!", "success");
        } else {
            throw new Error("One or both API requests responded with an error.");
        }
    } catch(e) {
        showToast("Failed to synchronize root files. " + e.message, "danger");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

window.enableEditDomain = function(event) {
    const input = document.getElementById('inpGithubDomain');
    const btnConnect = document.getElementById('btnConnectDomain');
    const btnEdit = document.getElementById('btnEditDomain');

    if (input) {
        input.disabled = false;
        input.focus();
    }
    if (btnConnect) {
        btnConnect.innerHTML = `<i class="bi bi-link-45deg me-1"></i> Connect Domain`;
        btnConnect.className = "btn btn-dark fw-semibold";
        btnConnect.disabled = false;
        btnConnect.classList.remove('d-none');
    }
    if (btnEdit) {
        btnEdit.classList.add('d-none');
    }
};

window.connectCustomDomain = async function(event) {
    const domainInput = document.getElementById('inpGithubDomain');
    const domain = domainInput ? domainInput.value.trim().replace(/^https?:\/\//, '') : '';
    
    if (!domain) {
        showToast("Enter the domain name first!", "warning");
        return;
    }

    const btn = event.currentTarget;
    setButtonLoading(btn, true, "Connecting to Cloudflare & DNS...");

    try {
        const res = await fetch('/api/cloudflare/connect-domain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            setButtonLoading(btn, false);
            showToast(`Domain ${domain} successfully connected to Cloudflare Pages & automatic CNAME DNS!`);
            
            domainInput.disabled = true;
            btn.classList.add('d-none');
            
            const btnEdit = document.getElementById('btnEditDomain');
            if (btnEdit) btnEdit.classList.remove('d-none');

            const siteUrlInput = document.getElementById('inpSiteUrl');
            if (siteUrlInput) {
                siteUrlInput.value = `https://${domain}`;
                if (typeof window.saveSettings === 'function') {
                    window.saveSettings();
                }
            }
        } else {
            throw new Error(data.error || "Failed to register domain.");
        }
    } catch (err) {
        setButtonLoading(btn, false);
        showToast("Failed to connect domain: " + err.message, "danger");
    }
};

window.applyGithubSecurity = async function(event) {
    if (!confirm("Are you sure you want to lock this repository? Issues, Wikis, and Projects features will be disabled to prevent spam and the repository will be converted to private.")) return;

    const btn = event.currentTarget;
    setButtonLoading(btn, true, "Securing Repo & Private...");

    try {
        const res = await fetch('/api/github/security', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (res.ok) {
            btn.disabled = true;
            btn.classList.remove('btn-success', 'wp-btn-primary');
            btn.classList.add('btn-secondary', 'opacity-50');
            btn.innerHTML = `<i class="bi bi-shield-fill-check me-2"></i> Maximum Security Applied`;
            
            showToast("Maximum security protection and Private mode successfully applied to the GitHub repository!");
        } else {
            const errText = await res.text();
            throw new Error(errText || "Failed to apply protection.");
        }
    } catch (err) {
        setButtonLoading(btn, false);
        showToast("Failed to secure repository: " + err.message, "danger");
    }
};

window.setupGithubCicd = async function(event) {
    if (!confirm("Do you want to update / enable Cloudflare Pages CI/CD automation using GitHub Actions?")) return;

    const btn = event.currentTarget;
    setButtonLoading(btn, true, "Setting up CI/CD...");

    try {
        const res = await fetch('/api/github/setup-cicd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const data = await res.json();
        if (res.ok && data.success) {
            btn.disabled = true;
            btn.classList.remove('btn-warning', 'btn-outline-warning');
            btn.classList.add('btn-secondary', 'opacity-50', 'text-white');
            btn.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i> CI/CD Pipeline Active`;

            showToast(data.message || "CI/CD automation successfully enabled!");
        } else {
            throw new Error(data.error || "Failed to set up CI/CD automation.");
        }
    } catch (err) {
        setButtonLoading(btn, false);
        showToast("Failed to set up CI/CD: " + err.message, "danger");
    }
};

async function loadEnvVariables() {
    try {
        const res = await fetch('/api/settings/env-list');
        const data = await res.json();

        if (data.success && data.data) {
            document.querySelectorAll('.btn-save-secret').forEach(btn => {
                const secretName = btn.getAttribute('data-secret-name');
                const inputId = btn.getAttribute('data-input-id');
                const input = document.getElementById(inputId);

                if (input && data.data[secretName]) {
                    const val = data.data[secretName];
                    if (val === "********") {
                        input.value = "";
                        input.placeholder = "•••••••••••••••• (Saved/Active)";
                        input.classList.add('border-success');
                    } else {
                        input.value = val;
                        input.classList.add('border-primary');
                    }
                }
            });
        }
    } catch (err) {
        console.error("Failed to sync environment variables:", err);
    }
}

async function initSecretsManager() {
    try {
        const resProfile = await fetch('/api/user/profile');
        if (resProfile.ok) {
            const user = await resProfile.json();
            const userVersion = user.dashboard_version || 'v1_blog';

            document.querySelectorAll('.secret-group').forEach(group => {
                const allowedVersions = group.getAttribute('data-versions');
                if (allowedVersions && allowedVersions !== 'all') {
                    const versionArray = allowedVersions.split(',').map(v => v.trim());
                    if (!versionArray.includes(userVersion)) {
                        group.classList.add('d-none');
                    }
                }
            });

            if (user.role !== 'administrator') {
                document.querySelectorAll('.secret-input').forEach(el => {
                    el.disabled = true;
                    el.placeholder = "Locked (Primary Owner Only)";
                });
                document.querySelectorAll('.btn-save-secret').forEach(el => {
                    el.disabled = true;
                    el.innerHTML = '<i class="bi bi-lock-fill me-1"></i> Locked';
                    el.classList.replace('btn-dark', 'btn-secondary');
                });
            }
        }
    } catch(e) {
        console.error("Failed to verify user profile for secrets manager:", e);
    }

    document.querySelectorAll('.btn-save-secret').forEach(button => {
        button.addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            const secretName = btn.getAttribute('data-secret-name');
            const inputId = btn.getAttribute('data-input-id');
            const secretValue = document.getElementById(inputId).value.trim();

            if (!secretValue) {
                showToast("Value for " + secretName + " cannot be empty!", "warning");
                return;
            }

            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
            btn.disabled = true;

            try {
                const res = await fetch('/api/settings/save-env', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ secretName, secretValue })
                });

                const data = await res.json();
                
                if (res.ok && data.success) {
                    showToast(`Variable ${secretName} successfully deployed to Worker and encrypted!`);
                    document.getElementById(inputId).value = ''; 
                    loadEnvVariables(); 
                } else {
                    throw new Error(data.error || "Failed to save configuration.");
                }
            } catch (err) {
                showToast("Failed to save: " + err.message, "danger");
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    });
}

window.openGitHubFileEditor = async function(path, title) {
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
        let res = await fetch('/api/github/file?path=' + encodeURIComponent(path));
        if (!res.ok && path === 'maintenance.html') {
            res = await fetch('/api/github/file?path=' + encodeURIComponent('docs/maintenance.html'));
            if (res.ok) {
                document.getElementById('currentEditKey').value = 'docs/maintenance.html';
            }
        }
        
        const data = await res.json();
        if (ed) ed.value = data.content || "";
        
        setTimeout(() => {
            if (typeof window.initCodeMirrorEditor === 'function') {
                window.initCodeMirrorEditor('#htmlEditor', mode);
            }
        }, 60);
    } catch (e) {
        if (ed) ed.value = "Failed to load content from GitHub.";
        setTimeout(() => {
            if (typeof window.initCodeMirrorEditor === 'function') {
                window.initCodeMirrorEditor('#htmlEditor', mode);
            }
        }, 60);
    }
};

window.closeCustomEditor = function() {
    const overlay = document.getElementById('customEditorOverlay');
    if (overlay) overlay.style.display = 'none';
    if (window.currentCodeMirrorInstance) {
        window.currentCodeMirrorInstance.toTextArea();
        window.currentCodeMirrorInstance = null;
    }
};

window.saveEditorDataDualStorage = async function() {
    const btn = document.getElementById('btnSaveEditor');
    setButtonLoading(btn, true, "Saving Dual-Storage...");
    const key = document.getElementById('currentEditKey').value;
    
    const rawContent = window.currentCodeMirrorInstance ? window.currentCodeMirrorInstance.getValue() : document.getElementById('htmlEditor').value;
    const isGH = document.getElementById('currentIsGitHubFile').value === "true";
    
    try {
        let res;
        if (isGH) {
            const minifiedContent = clientSideMinify(rawContent);
            res = await fetch('/api/github/save', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ path: key, content: minifiedContent })
            });
        }

        if(res.ok){
            setButtonLoading(btn, false);
            showToast("File changes successfully saved!");
            setTimeout(() => {
                closeCustomEditor();
            }, 1000);
        } else {
            throw new Error();
        }
    } catch(e) {
        setButtonLoading(btn, false);
        showToast("Failed to save file changes.", "danger");
    }
}

async function loadUserProfileInfo() {
    try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
            const user = await res.json();
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
}

document.addEventListener("DOMContentLoaded", async function() {
    const defaultLang = localStorage.getItem('dashboard_lang') || 'en';
    changeLanguage(defaultLang);
    
    await loadGlobalSettings(); 
    initCloudflareManagement();

    loadSeoRootFiles();
    loadCustomHeaders(); 
    loadUserProfileInfo();
    initSecretsManager();
    loadEnvVariables();
    
    document.body.classList.add("tab-ready");
});