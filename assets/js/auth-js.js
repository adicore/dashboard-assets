// assets/js/auth.js

// 0. PAGE SECURITY: Check token when page is first loaded
const currentPath = window.location.pathname;
const jwtToken = localStorage.getItem('jwt_token');

// If no token exists and not on login page, force redirect to login.html
if (!jwtToken && !currentPath.includes('login.html')) {
    window.location.href = '/login.html';
}

// 1. Global Fetch Interceptor to automatically attach JWT token to all API requests
const originalFetch = window.fetch;

window.fetch = async function(resource, init = {}) {
    const urlString = typeof resource === 'string' ? resource : resource.url;

    // If request points to /api/ endpoint (except public login endpoint)
    if (urlString && urlString.startsWith('/api/') && !urlString.includes('/api/login')) {
        const token = localStorage.getItem('jwt_token');
        
        if (token) {
            init.headers = init.headers || {};
            if (init.headers instanceof Headers) {
                init.headers.set('Authorization', `Bearer ${token}`);
            } else {
                init.headers['Authorization'] = `Bearer ${token}`;
            }
        }
    }

    const response = await originalFetch(resource, init);

    // If session expires or token becomes invalid (Unauthorized 401)
    if (response.status === 401 && !urlString.includes('/api/login')) {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_role');
        window.location.href = '/login.html';
    }

    return response;
};

const allowedPathsForNonAdmin = ['/overview', '/analytics', '/pages', '/posts', '/activities', '/users', '/security'];

// Instant detection from localStorage to prevent menu flickering on page load
const savedRole = localStorage.getItem('user_role');
if (savedRole && savedRole.toLowerCase() !== 'administrator') {
    document.body.classList.add('role-non-admin');
}

async function enforceRoleAccessControl() {
    try {
        const res = await fetch('/api/user/profile');
        if (!res.ok) return;
        const user = await res.json();
        const role = (user.role || '').toLowerCase();

        localStorage.setItem('user_role', role);

        if (role !== 'administrator') {
            document.body.classList.add('role-non-admin');
            
            const isAllowed = allowedPathsForNonAdmin.some(path => currentPath.startsWith(path));
            
            if (!isAllowed) {
                alert("Access denied: This page is restricted to administrators.");
                window.location.href = '/overview';
                return;
            }
            hideUnauthorizedSidebarLinks();
        } else {
            localStorage.removeItem('user_role');
        }
    } catch (e) {
        console.error("Failed to validate role permissions:", e);
    }
}

function hideUnauthorizedSidebarLinks() {
    document.querySelectorAll('.wp-sidebar .nav-link').forEach(link => {
        const href = link.getAttribute('href');
        const isPermitted = allowedPathsForNonAdmin.some(allowed => href === allowed || href.startsWith(allowed));
        if (!isPermitted) link.style.display = 'none';
    });
}

async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
    } catch (err) {
        console.error("Logout error:", err);
    }

    // Clear local storage if any
    localStorage.clear();
    sessionStorage.clear();

    // Force redirect and replace browser history to login page
    window.location.replace('/login');
}

document.addEventListener("DOMContentLoaded", enforceRoleAccessControl);