// assets/js/main.js

async function loadDraftStats() {
    try {
        const res = await fetch('/api/content/draft-stats');
        if (res.ok) {
            const data = await res.json();
            const badge = document.getElementById('draftBadgeCount');
            const pendingStat = document.getElementById('statPendingUpdates');
            const publishBtn = document.getElementById('btnExecuteBulkPublish');

            const totalPending = data.total || ((data.draft_posts || 0) + (data.draft_pages || 0));

            if (pendingStat) pendingStat.innerText = totalPending;

            if (totalPending > 0) {
                if (badge) {
                    badge.innerText = totalPending;
                    badge.classList.remove('d-none');
                }
                if (publishBtn) publishBtn.disabled = false;
            } else {
                if (badge) badge.classList.add('d-none');
                if (publishBtn) publishBtn.disabled = true;
            }
        }
    } catch (e) {
        console.error("Failed to load pending statistics:", e);
    }
}

// executeBulkPublish function with Interactive Floating Progress Bar
window.executeBulkPublish = async function() {
    if (!confirm("Are you sure you want to push all pending changes to the live site? This will sync data in batches.")) return;

    const btn = document.getElementById('btnExecuteBulkPublish');
    const progressContainer = document.getElementById('syncProgressContainer');
    const progressBar = document.getElementById('syncProgressBar');
    const progressText = document.getElementById('syncProgressText');
    const progressPercent = document.getElementById('syncProgressPercent');
    const pendingCountEl = document.getElementById('statPendingUpdates');
    const badge = document.getElementById('draftBadgeCount');
    
    let totalPending = parseInt(pendingCountEl ? pendingCountEl.innerText : '0') || 0;
    let totalProcessed = 0;
    
    // Lock button & Show Floating Progress Box
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Syncing...';
    }
    
    if (progressContainer) {
        progressContainer.classList.remove('d-none');
        if (progressBar) progressBar.style.width = '5%';
        if (progressPercent) progressPercent.innerText = '5%';
        if (progressText) progressText.innerText = 'Preparing sync environment...';
    }
    
    try {
        // ONLY SEND POSTS AND PAGES CONTENT (LAYOUT & TRASH REMOVED FROM QUEUE)
        const steps = ['posts', 'pages'];
        // INCREASE BATCH LIMIT TO 15 ITEMS PER REQUEST
        const limit = 15; 
        
        for (const step of steps) {
            let hasMore = true;
            let offset = 0;
            
            while (hasMore) {
                if (progressText) progressText.innerText = `Synchronizing batch [${step}]...`;
                
                const res = await fetch('/api/content/bulk-publish', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ step: step, limit: limit, offset: offset })
                });
                
                if (!res.ok) throw new Error(`API Error at step: ${step}`);
                const data = await res.json();
                
                if (data.error) throw new Error(data.error);
                
                hasMore = data.has_more || false;
                offset = data.next_offset || 0;
                
                // Calculate and update visual percentage in real-time
                if (totalPending > 0 && progressBar) {
                    totalProcessed += (data.published_posts || 0) + (data.published_pages || 0);
                    let pct = Math.floor((totalProcessed / totalPending) * 100);
                    if (pct > 95 && hasMore) pct = 95; 
                    if (pct < 10 && totalProcessed > 0) pct = 10; 
                    
                    progressBar.style.width = pct + '%';
                    if (progressPercent) progressPercent.innerText = pct + '%';
                }
            }
        }
        
        // Finalize 100%
        if (progressText) progressText.innerText = 'Finalizing deployment to GitHub & Cloudflare...';
        if (progressBar) progressBar.style.width = '100%';
        if (progressPercent) progressPercent.innerText = '100%';
        
        if (typeof showToast === 'function') {
            showToast(`Successfully pushed all changes to live site!`, 'success');
        } else {
            alert("Successfully pushed all changes to live site!");
        }
        
        loadDraftStats();

        // Hide floating box and AUTOMATICALLY REFRESH PAGE after 2 seconds
        setTimeout(() => {
            if (progressContainer) progressContainer.classList.add('d-none');
            if (btn) {
                btn.innerHTML = '<i class="bi bi-check2-all me-1"></i> Deployed!';
                btn.classList.replace('btn-primary', 'btn-success');
            }
            if (badge) badge.classList.add('d-none');
            if (pendingCountEl) pendingCountEl.innerText = '0';
            
            // Automatic page refresh
            window.location.reload();
        }, 2000);
        
    } catch (err) {
        if (progressText) {
            progressText.innerText = 'Error: ' + err.message;
            progressText.classList.add('text-danger');
        }
        if (progressBar) progressBar.classList.replace('bg-primary', 'bg-danger');
        
        if (btn) {
            btn.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-1"></i> Sync Failed';
            btn.disabled = false;
        }
        
        if (typeof showToast === 'function') {
            showToast(err.message, 'danger');
        }
    }
};

// ============================================================================
// LOGIKA MANAGEMENT DARK MODE (DITAMBAHKAN TANPA KATA KUNCI EXPORT)
// ============================================================================
function initDarkMode() {
    const savedTheme = localStorage.getItem('dashboard_theme') || 
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);
}

function toggleDarkMode() {
    const isDark = document.body.classList.contains('dark-mode');
    const newTheme = isDark ? 'light' : 'dark';
    localStorage.setItem('dashboard_theme', newTheme);
    applyTheme(newTheme);
}

function applyTheme(theme) {
    const icon = document.getElementById('themeToggleIcon');
    const text = document.getElementById('themeToggleText');
    
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        document.documentElement.setAttribute('data-bs-theme', 'dark');
        if (icon) icon.className = 'bi bi-sun-fill text-warning fs-6';
        if (text) text.textContent = 'Light';
    } else {
        document.body.classList.remove('dark-mode');
        document.documentElement.removeAttribute('data-bs-theme');
        if (icon) icon.className = 'bi bi-moon-stars-fill fs-6';
        if (text) text.textContent = 'Dark';
    }
}

// Bind ke window object agar atribut onclick="toggleDarkMode()" pada HTML berfungsi langsung
window.toggleDarkMode = toggleDarkMode;
window.initDarkMode = initDarkMode;

// Jalankan inisialisasi saat DOM siap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initDarkMode();
        loadDraftStats();
        document.body.classList.add("tab-ready");
    });
} else {
    initDarkMode();
    loadDraftStats();
    document.body.classList.add("tab-ready");
}