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
// 1.B USERS STORAGE PREFERENCE (Granular)
// ==========================================
let currentUserStorageProvider = 'github';

async function loadUserStoragePreference() {
    try {
        const res = await fetch('/api/kv?key=global:settings');
        if (res.ok) {
            const txt = await res.text();
            if (txt) {
                const settings = JSON.parse(txt);
                // Retrieve specific user storage preferences, with fallback to default_storage or github
                currentUserStorageProvider = settings.storage_provider_users || settings.default_storage || 'github';
            }
        }
    } catch(e) {}
}

// 7. Image Compression & Conversion to AVIF
async function compressAndConvertImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = async () => {
                try {
                    // Dynamically import library directly from CDN inside the function
                    const { encode } = await import('https://esm.sh/@jsquash/avif');

                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Limit max width so the file becomes very small (tens of KB)
                    const maxWidth = 900; 
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Get raw pixel data from canvas
                    const imageData = ctx.getImageData(0, 0, width, height);

                    // Compress to AVIF format using WebAssembly from CDN
                    const avifBuffer = await encode(imageData, { quality: 60 });
                    const blob = new Blob([avifBuffer], { type: 'image/avif' });

                    // Safety Check: If compressed result is larger than original file, use original file
                    if (blob.size >= file.size) {
                        const readerOriginal = new FileReader();
                        readerOriginal.onloadend = () => {
                            const base64Data = readerOriginal.result.split(',')[1];
                            resolve({ filename: file.name, content: base64Data });
                        };
                        readerOriginal.readAsDataURL(file);
                        return;
                    }

                    // Convert Blob to Base64 to send to GitHub API
                    const readerBase64 = new FileReader();
                    readerBase64.onloadend = () => {
                        const base64Data = readerBase64.result.split(',')[1];
                        const originalName = file.name.includes('.') ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;
                        resolve({ filename: `${originalName}.avif`, content: base64Data });
                    };
                    readerBase64.readAsDataURL(blob);

                } catch (error) {
                    console.error("Dynamic AVIF compression failed, using original file:", error);
                    // Emergency fallback if failed
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

// ==========================================
// 2. PROFILE, AVATAR & PASSWORD (UPDATED)
// ==========================================
async function initUserProfileTopbar() {
    try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
            const user = await res.json();
            if (user.name && document.getElementById('topbarUsername')) document.getElementById('topbarUsername').innerText = user.name;
            if (user.avatar && user.avatar.trim() !== '' && document.getElementById('topbarUserAvatar')) document.getElementById('topbarUserAvatar').src = user.avatar;
            
            if (user.role) {
                document.body.setAttribute('data-role', user.role);
                if (user.role.toLowerCase() !== 'administrator') {
                    const btnAddUser = document.getElementById('btnAddUser'); if (btnAddUser) btnAddUser.style.display = 'none';
                    const usersSubTab = document.getElementById('usersSubTab'); if (usersSubTab) usersSubTab.style.display = 'none';
                    const subtabList = document.getElementById('subtab-list'); if (subtabList) subtabList.remove();
                    const subtabProfile = document.getElementById('subtab-profile'); if (subtabProfile) subtabProfile.classList.add('show', 'active');
                }
            }

            if (user.email) document.body.setAttribute('data-email', user.email);
            
            const emailInp = document.getElementById('profileEmailInput'); if (emailInp) emailInp.value = user.email || '';
            const nameInp = document.getElementById('profileNameInput'); if (nameInp) nameInp.value = user.name || '';
            const avatarInp = document.getElementById('inpAvatar'); if (avatarInp) avatarInp.value = user.avatar || '';

            // --- Parsing JSON ---
            let socialObj = { website: "", twitter: "", linkedin: "", facebook: "", instagram: "", about: "" };
            if (user.social_media) {
                try {
                    const parsed = JSON.parse(user.social_media);
                    socialObj = { ...socialObj, ...parsed };
                } catch (e) {
                    socialObj.website = user.social_media;
                }
            }

            // Set values to HTML inputs
            const inpWebsite = document.getElementById('profileSocialInput'); if (inpWebsite) inpWebsite.value = socialObj.website || '';
            const inpTwitter = document.getElementById('profileTwitterInput'); if (inpTwitter) inpTwitter.value = socialObj.twitter || '';
            const inpLinkedin = document.getElementById('profileLinkedinInput'); if (inpLinkedin) inpLinkedin.value = socialObj.linkedin || '';
            const inpFacebook = document.getElementById('profileFacebookInput'); if (inpFacebook) inpFacebook.value = socialObj.facebook || '';
            const inpInstagram = document.getElementById('profileInstagramInput'); if (inpInstagram) inpInstagram.value = socialObj.instagram || '';
            const inpAbout = document.getElementById('profileAboutInput'); if (inpAbout) inpAbout.value = socialObj.about || '';
        }
    } catch(e) {}
}

async function saveInlineProfile(event) {
    event.preventDefault();
    const socialData = {
        website: document.getElementById('profileSocialInput')?.value.trim() || "",
        twitter: document.getElementById('profileTwitterInput')?.value.trim() || "",
        linkedin: document.getElementById('profileLinkedinInput')?.value.trim() || "",
        facebook: document.getElementById('profileFacebookInput')?.value.trim() || "",
        instagram: document.getElementById('profileInstagramInput')?.value.trim() || "",
        about: document.getElementById('profileAboutInput')?.value.trim() || "" // Extract Bio to JSON
    };

    const data = {
        name: document.getElementById('profileNameInput')?.value.trim() || '',
        avatar: document.getElementById('inpAvatar')?.value.trim() || '',
        social_media: JSON.stringify(socialData) 
    };

    try {
        const res = await fetch('/api/user/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
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

async function uploadAvatarFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    showToast("Compressing & Uploading Avatar...", "info");
    try {
        const compressed = await compressAndConvertImage(file);
        const res = await fetch('/api/github/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: Date.now() + '-' + compressed.filename,
                content: compressed.content,
                storage_provider: currentUserStorageProvider // Using specific Users storage
            })
        });

        if (res.ok) {
            const data = await res.json();
            const avatarInput = document.getElementById('inpAvatar');
            if (avatarInput) {
                avatarInput.value = data.url;
                avatarInput.dispatchEvent(new Event('input'));
            }
            showToast(`Avatar successfully compressed to AVIF and uploaded to ${currentUserStorageProvider === 'imgbb' ? 'ImgBB' : 'GitHub'}!`);
        } else {
            const errText = await res.text();
            showToast('Failed to upload image: ' + errText, 'danger');
        }
    } catch (err) {
        showToast('Error uploading image: ' + err.message, 'danger');
    }
}

async function updateProfilePassword() {
    const currentPassword = document.getElementById('inpCurrentPassword').value.trim();
    const newPassword = document.getElementById('inpNewPassword').value.trim();

    if (!currentPassword || !newPassword) {
        showToast("All password fields are mandatory!", "warning");
        return;
    }

    if (newPassword.length < 6) {
        showToast("The new password must be at least 6 characters long!", "warning");
        return;
    }

    try {
        const response = await fetch('/api/security/update-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showToast("Password successfully updated!", "success");
            document.getElementById('inpCurrentPassword').value = '';
            document.getElementById('inpNewPassword').value = '';
        } else {
            throw new Error(result.error || "Failed to update password.");
        }
    } catch (error) {
        showToast(error.message, "danger");
    }
}

// ==========================================
// 3. 2FA SECURITY (TWO-FACTOR AUTHENTICATION)
// ==========================================
function init2FA() {
    const token = localStorage.getItem('jwt_token') || '';
    if (!token) return;

    const btnEnable2FA = document.getElementById('btnEnable2FA');
    const qrContainer = document.getElementById('qrContainer');
    const qrImage = document.getElementById('qrImage');
    const secretText = document.getElementById('secretText');
    const btnConfirm2FA = document.getElementById('btnConfirm2FA');
    const verifyCode = document.getElementById('verifyCode');
    const statusBadge = document.getElementById('statusBadge');
    const message = document.getElementById('message');

    if (!btnEnable2FA || !statusBadge) return;

    async function checkStatus() {
        try {
            const res = await fetch('/api/2fa/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.is_2fa_enabled) {
                statusBadge.textContent = "Status: 2FA Enabled 🔒";
                statusBadge.className = "badge bg-success";
                btnEnable2FA.innerHTML = '<i class="bi bi-shield-x me-1"></i> Disable 2FA';
                btnEnable2FA.className = "btn btn-sm btn-danger fw-medium px-4";
                btnEnable2FA.setAttribute('data-action', 'disable');
            } else {
                statusBadge.textContent = "Status: 2FA Disabled ⚠️";
                statusBadge.className = "badge bg-warning text-dark";
                btnEnable2FA.innerHTML = '<i class="bi bi-qr-code-scan me-1"></i> Enable 2FA Now';
                btnEnable2FA.className = "btn btn-sm btn-success fw-medium px-4";
                btnEnable2FA.setAttribute('data-action', 'enable');
            }
        } catch (err) {
            console.error("Failed to load 2FA status", err);
        }
    }
    
    checkStatus();

    btnEnable2FA.addEventListener('click', async () => {
        message.classList.add('d-none');
        const action = btnEnable2FA.getAttribute('data-action');

        if (action === 'disable') {
            if(!confirm("Are you sure you want to disable 2FA from this account?")) return;
            try {
                const res = await fetch('/api/2fa/disable', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if(res.ok) {
                    showToast("2FA successfully disabled.", "success");
                    checkStatus();
                } else {
                    throw new Error("Failed to disable 2FA. Please contact the administrator.");
                }
            } catch(err) {
                message.textContent = err.message;
                message.className = "mt-3 small text-danger";
                message.classList.remove('d-none');
            }
            return;
        }

        try {
            const res = await fetch('/api/2fa/setup', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create 2FA QR code.");

            qrImage.src = data.qr_url; 
            secretText.textContent = data.secret;
            qrContainer.classList.remove('d-none');
        } catch (err) {
            message.textContent = err.message;
            message.className = "mt-3 small text-danger";
            message.classList.remove('d-none');
        }
    });

    btnConfirm2FA.addEventListener('click', async () => {
        const code = verifyCode.value.trim();
        if (!code) {
            message.textContent = "Please enter the 6-digit code from your Authenticator app!";
            message.className = "mt-3 small text-danger alert alert-danger p-2";
            message.classList.remove('d-none');
            return;
        }

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
            if (!res.ok) throw new Error(data.error || "Invalid or expired verification code.");

            message.textContent = "Success! 2FA has been enabled on your account.";
            message.className = "mt-3 small text-success fw-bold alert alert-success p-2";
            message.classList.remove('d-none');
            qrContainer.classList.add('d-none');
            verifyCode.value = ''; 
            checkStatus();
            showToast("2FA successfully enabled!", "success");
        } catch (err) {
            message.textContent = err.message;
            message.className = "mt-3 small text-danger alert alert-danger p-2";
            message.classList.remove('d-none');
        }
    });
}

// ==========================================
// 4. USER MANAGEMENT (USERS & ROLES)
// ==========================================
async function loadUsersList() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">Loading user list...</td></tr>';

    try {
        const res = await fetch('/api/users/list');
        if (res.ok) {
            const users = await res.json();
            tbody.innerHTML = '';
            if (!users || users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">No users found.</td></tr>';
                return;
            }

            users.forEach(u => {
                const safeEmail = (u.email || '').replace(/'/g, "\\'");
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="ps-3 fw-semibold text-dark"><i class="bi bi-envelope text-primary me-2"></i>${u.email || '-'}</td>
                    <td class="text-dark">${u.name || '-'}</td>
                    <td><span class="badge ${u.role === 'administrator' ? 'bg-danger' : (u.role === 'editor' ? 'bg-primary' : 'bg-secondary')} text-capitalize">${u.role || 'subscriber'}</span></td>
                    <td class="text-end pe-3">
                        <button class="btn btn-sm btn-outline-secondary px-2 py-1 me-1" onclick="openUserModal('${safeEmail}')" title="Edit"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger px-2 py-1" onclick="deleteUserItem('${safeEmail}')" title="Delete"><i class="bi bi-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">Failed to load user list.</td></tr>';
    }
}

function openUserModal(email = '') {
    document.getElementById('inpUserIsEdit').value = email ? "true" : "false";
    document.getElementById('inpUserEmail').value = email;
    document.getElementById('inpUserEmail').disabled = !!email;
    document.getElementById('inpUserName').value = "";
    document.getElementById('inpUserRole').value = "editor";
    document.getElementById('inpUserAvatar').value = "";
    
    if (email) {
        fetch('/api/users/list').then(r => r.json()).then(users => {
            const u = users.find(x => x.email === email);
            if (u) {
                document.getElementById('inpUserName').value = u.name || "";
                document.getElementById('inpUserRole').value = u.role || "editor";
                document.getElementById('inpUserAvatar').value = u.avatar || "";
            }
        });
    }
    new bootstrap.Modal(document.getElementById('userModal')).show();
}

async function saveUser() {
    const email = document.getElementById('inpUserEmail').value.trim();
    const name = document.getElementById('inpUserName').value.trim();
    const role = document.getElementById('inpUserRole').value;
    const avatar = document.getElementById('inpUserAvatar').value.trim();

    if (!email || !email.includes('@')) {
        showToast("Please enter a valid email address!", "warning");
        return;
    }

    try {
        const res = await fetch('/api/users/save', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, name, role, avatar })
        });
        if (res.ok) {
            showToast("User successfully saved!");
            bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
            loadUsersList();
        } else {
            throw new Error(await res.text());
        }
    } catch(err) {
        showToast("Failed to save user: " + err.message, "danger");
    }
}

async function deleteUserItem(email) {
    if (!confirm(`Are you sure you want to delete the user ${email}?`)) return;
    try {
        const res = await fetch('/api/users/delete', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email })
        });
        if (res.ok) {
            showToast("User successfully deleted!");
            loadUsersList();
        } else {
            throw new Error(await res.text());
        }
    } catch(err) {
        showToast("Failed to delete user: " + err.message, "danger");
    }
}

// ==========================================
// 5. MAIN PAGE INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", async function() {
    const defaultLang = localStorage.getItem('dashboard_lang') || 'en';
    changeLanguage(defaultLang);
    
    // Initialize Features
    await loadUserStoragePreference();
    initUserProfileTopbar();
    loadUsersList();
    updateVisitSiteLink();
    init2FA();
    
    document.body.classList.add("tab-ready");
    
    // Automatic tab routing if URL contains hash #profile
    if (window.location.hash === '#profile') {
        const profileSubTabEl = document.getElementById('subtab-profile-btn');
        if (profileSubTabEl) new bootstrap.Tab(profileSubTabEl).show();
    }
    
    const bodyElement = document.body;
    
    // Role-based restrictions via JS override
    const userRole = localStorage.getItem('user_role') || '';
    if (userRole.toLowerCase() !== 'administrator') {
        const userListTabNav = document.querySelector('#navTabUserList');
        if (userListTabNav) userListTabNav.style.display = 'none';

        const profileTab = document.querySelector('#navTabProfile');
        if (profileTab) new bootstrap.Tab(profileTab).show();
    }

    // Demo Mode Restrictions
    if (bodyElement && bodyElement.getAttribute('data-email')?.startsWith('demo')) {
        const listBtn = document.querySelector('#subtab-list-btn');
        const profileBtn = document.querySelector('#subtab-profile-btn');
        const listTab = document.querySelector('#subtab-list');
        const profileTab = document.querySelector('#subtab-profile');

        if (listBtn) listBtn.classList.remove('active');
        if (profileBtn) profileBtn.classList.add('active');
        
        if (listTab) {
            listTab.classList.remove('show', 'active');
            listTab.style.display = 'none'; 
        }
        if (profileTab) {
            profileTab.classList.add('show', 'active');
            profileTab.style.display = 'block'; 
        }
    }
});