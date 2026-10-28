// ==========================================
// 1. GLOBAL UTILITIES, TRANSLATIONS & TOAST
// ==========================================
const translations = {
    id: {
        visit_site: "Kunjungi Situs",
        purge_cache: "Purge Cache",
        users_title: "Manajemen Pengguna & Peran (Zero Trust Users & Roles)",
        users_desc: "Kelola daftar akaun administrator, editor, author, atau kontributor.",
        btn_adduser: "Tambah Pengguna Baru",
        th_email: "Email",
        th_name: "Nama",
        th_role: "Peran (Role)",
        th_action: "Aksi",
        loading_users: "Memuat daftar pengguna...",
        modal_user_title: "Kelola Pengguna",
        label_user_email: "Email Pengguna (Primary Key / Zero Trust)",
        label_user_name: "Nama Lengkap",
        label_user_role: "Peran (Role)",
        label_user_avatar: "Avatar URL (Optional)",
        btn_cancel: "Batal",
        btn_saveuser: "Simpan Pengguna"
    },
    en: {
        visit_site: "Visit Site",
        purge_cache: "Purge Cache",
        users_title: "User & Role Management (Zero Trust)",
        users_desc: "Manage administrator, editor, author, or contributor accounts.",
        btn_adduser: "Add New User",
        th_email: "Email",
        th_name: "Name",
        th_role: "Role",
        th_action: "Action",
        loading_users: "Loading users list...",
        modal_user_title: "Manage User",
        label_user_email: "User Email (Primary Key / Zero Trust)",
        label_user_name: "Full Name",
        label_user_role: "Role",
        label_user_avatar: "Avatar URL (Optional)",
        btn_cancel: "Cancel",
        btn_saveuser: "Save User"
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
    if (!toastEl || !toastBody) return;
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
            
            if (user.role) {
                document.body.setAttribute('data-role', user.role);

                if (user.role.toLowerCase() !== 'administrator') {
                    const btnAddUser = document.getElementById('btnAddUser');
                    if (btnAddUser) btnAddUser.style.display = 'none';

                    const usersSubTab = document.getElementById('usersSubTab');
                    if (usersSubTab) usersSubTab.style.display = 'none';

                    const subtabList = document.getElementById('subtab-list');
                    if (subtabList) subtabList.remove();

                    const subtabProfile = document.getElementById('subtab-profile');
                    if (subtabProfile) {
                        subtabProfile.classList.add('show', 'active');
                    }
                }
            }

            if (user.email) document.body.setAttribute('data-email', user.email);
            
            const emailInp = document.getElementById('profileEmailInput');
            const nameInp = document.getElementById('profileNameInput');
            const avatarInp = document.getElementById('inpAvatar');
            const socialInp = document.getElementById('profileSocialInput');

            if (emailInp) emailInp.value = user.email || '';
            if (nameInp) nameInp.value = user.name || '';
            if (avatarInp) avatarInp.value = user.avatar || '';
            if (socialInp) socialInp.value = user.social_media || '';
        }
    } catch(e) {}
}

async function saveInlineProfile(event) {
    event.preventDefault();
    const data = {
        name: document.getElementById('profileNameInput')?.value.trim() || '',
        avatar: document.getElementById('inpAvatar')?.value.trim() || '',
        social_media: document.getElementById('profileSocialInput')?.value.trim() || ''
    };

    try {
        const res = await fetch('/api/user/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            showToast("Profile successfully updated!");
            if (data.name && document.getElementById('topbarUsername')) document.getElementById('topbarUsername').innerText = data.name;
            if (data.avatar && document.getElementById('topbarUserAvatar')) document.getElementById('topbarUserAvatar').src = data.avatar;
        } else {
            showToast("Failed to save profile.", "danger");
        }
    } catch(err) {
        showToast("A connection error occurred.", "danger");
    }
}

// ==========================================
// 3. SECURITY & 2FA FEATURES (Safe inside DOMContentLoaded)
// ==========================================
function initSecurityFeatures() {
    const token = localStorage.getItem('jwt_token');
    
    const btnEnable2FA = document.getElementById('btnEnable2FA');
    const qrContainer = document.getElementById('qrContainer');
    const qrImage = document.getElementById('qrImage');
    const secretText = document.getElementById('secretText');
    const btnConfirm2FA = document.getElementById('btnConfirm2FA');
    const verifyCode = document.getElementById('verifyCode');
    const statusBadge = document.getElementById('statusBadge');
    const message = document.getElementById('message');

    // Check 2FA Status Function on page load
    async function checkStatus() {
        if (!statusBadge) return;
        try {
            const res = await fetch('/api/2fa/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.is_2fa_enabled) {
                statusBadge.textContent = "Status: 2FA Enabled 🔒";
                statusBadge.className = "badge bg-success";
                if (btnEnable2FA) {
                    btnEnable2FA.textContent = "Disable 2FA";
                    btnEnable2FA.className = "btn btn-danger fw-medium";
                }
            } else {
                statusBadge.textContent = "Status: 2FA Disabled ⚠️";
                statusBadge.className = "badge bg-warning text-dark";
            }
        } catch (err) {
            console.error("Failed to load 2FA status");
        }
    }
    checkStatus();

    // Request QR Code Setup Button
    if (btnEnable2FA) {
        btnEnable2FA.addEventListener('click', async () => {
            if (message) message.classList.add('d-none');
            try {
                const res = await fetch('/api/2fa/setup', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                if (qrImage) qrImage.src = data.qr_url; 
                if (secretText) secretText.textContent = data.secret;
                if (qrContainer) qrContainer.classList.remove('d-none');
            } catch (err) {
                if (message) {
                    message.textContent = err.message;
                    message.className = "mt-3 small text-danger";
                    message.classList.remove('d-none');
                }
            }
        });
    }

    // Confirm 2FA Code Verification Button
    if (btnConfirm2FA) {
        btnConfirm2FA.addEventListener('click', async () => {
            const code = verifyCode ? verifyCode.value.trim() : '';
            try {
                const res = await fetch('/api/2fa/verify-setup', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ code })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                if (message) {
                    message.textContent = "Success! 2FA has been enabled on your account.";
                    message.className = "mt-3 small text-success fw-bold";
                    message.classList.remove('d-none');
                }
                if (qrContainer) qrContainer.classList.add('d-none');
                checkStatus();
            } catch (err) {
                if (message) {
                    message.textContent = err.message;
                    message.className = "mt-3 small text-danger";
                    message.classList.remove('d-none');
                }
            }
        });
    }

    // Change Password Form
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msgDiv = document.getElementById('passwordMessage');
            if (msgDiv) msgDiv.classList.add('d-none');

            const currentPassword = document.getElementById('currentPassword')?.value.trim() || '';
            const newPassword = document.getElementById('newPassword')?.value.trim() || '';

            try {
                const res = await fetch('/api/user/change-password', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to change password.');

                if (msgDiv) {
                    msgDiv.textContent = "Password successfully updated!";
                    msgDiv.className = "alert alert-success small py-2";
                    msgDiv.classList.remove('d-none');
                }
                changePasswordForm.reset();
            } catch (err) {
                if (msgDiv) {
                    msgDiv.textContent = err.message;
                    msgDiv.className = "alert alert-danger small py-2";
                    msgDiv.classList.remove('d-none');
                }
            }
        });
    }
}

// ==========================================
// 4. PAGE INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    const defaultLang = localStorage.getItem('dashboard_lang') || 'en';
    changeLanguage(defaultLang);
    initUserProfileTopbar();
    updateVisitSiteLink();
    initSecurityFeatures();
});