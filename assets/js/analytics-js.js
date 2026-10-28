// ==========================================
// ANALYTICS MODULE - WP-CMS Dashboard (GA4 Full Integration)
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

// 2. Sidebar Toggle
function toggleSidebar() {
    if (window.innerWidth > 768) {
        document.body.classList.toggle('sidebar-collapsed');
    } else {
        document.body.classList.toggle('sidebar-mobile-open');
    }
}

// 3. Localization Dictionary & Language Switcher
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

// 5. User Profile & Topbar Sync
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

// 6. Detailed GA4 Analytics & Dynamic UI Population
async function loadDetailedAnalytics() {
    try {
        const anRes = await fetch('/api/analytics/detailed');
        if (anRes.ok) {
            const anData = await anRes.json();
            
            // Date format (YYYYMMDD -> DD/MM)
            const formatGA4Date = (dateString) => {
                if(!dateString || dateString.length !== 8) return dateString;
                const month = dateString.substring(4, 6);
                const day = dateString.substring(6, 8);
                return `${day}/${month}`;
            };

            // A. TOP METRIC SUMMARY CARDS
            let totalVisitors = 0;
            let totalPageViews = 0;
            let avgDurationSum = 0;
            let bounceRateSum = 0;

            if (anData.trend && anData.trend.length > 0) {
                anData.trend.forEach(t => {
                    totalVisitors += t.visitors || 0;
                    totalPageViews += t.pageViews || 0;
                    avgDurationSum += parseFloat(t.avgDuration || 0);
                    bounceRateSum += parseFloat(t.bounceRate || 0);
                });

                const count = anData.trend.length;
                const avgDurationSec = Math.round(avgDurationSum / count);
                const minutes = Math.floor(avgDurationSec / 60);
                const seconds = avgDurationSec % 60;
                const avgBounce = (bounceRateSum / count).toFixed(1);

                if(document.getElementById('sum-visitors')) document.getElementById('sum-visitors').innerText = totalVisitors.toLocaleString();
                if(document.getElementById('sum-pageviews')) document.getElementById('sum-pageviews').innerText = totalPageViews.toLocaleString();
                if(document.getElementById('sum-duration')) document.getElementById('sum-duration').innerText = `${minutes}m ${seconds}s`;
                if(document.getElementById('sum-bouncerate')) document.getElementById('sum-bouncerate').innerText = `${avgBounce}%`;
            }

            // Realtime Active Users
            const realtimeVal = anData.realtimeActive || 0;
            if(document.getElementById('sum-realtime')) document.getElementById('sum-realtime').innerText = realtimeVal;
            if(document.getElementById('realtime-big-number')) document.getElementById('realtime-big-number').innerText = realtimeVal;

            // B. MAIN CHART (Line Chart - Traffic Trend)
            const trafficCanvas = document.getElementById('trafficChart');
            if (trafficCanvas && anData.trend && anData.trend.length > 0 && typeof Chart !== 'undefined') {
                const existingTrafficChart = Chart.getChart("trafficChart");
                if (existingTrafficChart) existingTrafficChart.destroy();

                new Chart(trafficCanvas, {
                    type: 'line',
                    data: {
                        labels: anData.trend.map(t => formatGA4Date(t.date)),
                        datasets: [
                            { 
                                label: 'Pageviews', 
                                data: anData.trend.map(t => t.pageViews), 
                                borderColor: '#0d6efd', 
                                backgroundColor: 'rgba(13,110,253,0.1)', 
                                fill: true, 
                                tension: 0.3 
                            },
                            { 
                                label: 'Unique Visitors', 
                                data: anData.trend.map(t => t.visitors), 
                                borderColor: '#198754', 
                                backgroundColor: 'rgba(25,135,84,0.1)', 
                                fill: true, 
                                tension: 0.3 
                            }
                        ]
                    },
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'top' } } 
                    }
                });
            }

            // C. TRAFFIC SOURCES (Doughnut Chart & List)
            const sourceCanvas = document.getElementById('sourceChart');
            if (sourceCanvas && anData.sources && typeof Chart !== 'undefined') {
                const existingSourceChart = Chart.getChart("sourceChart");
                if (existingSourceChart) existingSourceChart.destroy();
                
                const sourceData = anData.sources.length > 0 ? anData.sources : [{source: 'Direct / None', visitors: 1}];

                new Chart(sourceCanvas, {
                    type: 'doughnut',
                    data: {
                        labels: sourceData.map(s => s.source),
                        datasets: [{
                            data: sourceData.map(s => s.visitors),
                            backgroundColor: ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6c757d']
                        }]
                    },
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } } 
                    }
                });
            }

            const sourcesList = document.getElementById('top-sources-list');
            if (sourcesList && anData.sources) {
                sourcesList.innerHTML = '';
                if (anData.sources.length === 0) {
                    sourcesList.innerHTML = '<li class="list-group-item text-muted text-center border-0">No source data available.</li>';
                } else {
                    anData.sources.forEach(item => {
                        sourcesList.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center border-0 px-0 py-1">
                            <span class="text-truncate text-capitalize" style="max-width: 70%;">${item.source || 'Direct'}</span>
                            <span class="fw-bold">${item.visitors} users</span>
                        </li>`;
                    });
                }
            }

            // D. DEVICES (Doughnut Chart & List)
            const deviceCanvas = document.getElementById('deviceChart');
            if (deviceCanvas && anData.devices && typeof Chart !== 'undefined') {
                const existingDeviceChart = Chart.getChart("deviceChart");
                if (existingDeviceChart) existingDeviceChart.destroy();
                
                const deviceData = anData.devices.length > 0 ? anData.devices : [{device: 'Desktop', visitors: 1}];

                new Chart(deviceCanvas, {
                    type: 'doughnut',
                    data: {
                        labels: deviceData.map(d => d.device),
                        datasets: [{
                            data: deviceData.map(d => d.visitors),
                            backgroundColor: ['#0d6efd', '#ffc107', '#198754', '#6c757d']
                        }]
                    },
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } } 
                    }
                });
            }

            const devicesList = document.getElementById('top-devices-list');
            if (devicesList && anData.devices) {
                devicesList.innerHTML = '';
                if (anData.devices.length === 0) {
                    devicesList.innerHTML = '<li class="list-group-item text-muted text-center border-0">No device data available.</li>';
                } else {
                    anData.devices.forEach(item => {
                        devicesList.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center border-0 px-0 py-1">
                            <span class="text-truncate text-capitalize" style="max-width: 70%;">${item.device}</span>
                            <span class="fw-bold">${item.visitors} users</span>
                        </li>`;
                    });
                }
            }

            // E. VISITOR LOCATIONS (Top Countries)
            const countriesList = document.getElementById('top-countries-list');
            if (countriesList && anData.topCountries) {
                countriesList.innerHTML = '';
                if (anData.topCountries.length === 0) {
                    countriesList.innerHTML = '<li class="list-group-item text-muted text-center border-0 py-3">No country data available yet.</li>';
                } else {
                    anData.topCountries.forEach(item => {
                        countriesList.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center border-0 px-0 py-2 border-bottom">
                            <span><i class="bi bi-geo-alt me-1 text-danger"></i> ${item.country || 'Unknown'}</span>
                            <span class="badge bg-success rounded-pill">${item.visitors} users</span>
                        </li>`;
                    });
                }
            }

            // F. POPULAR PAGES (Top Paths Table Body)
            const pathsTableBody = document.getElementById('top-paths-table-body');
            if (pathsTableBody && anData.topPaths) {
                pathsTableBody.innerHTML = '';
                if (anData.topPaths.length === 0) {
                    pathsTableBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">No page data available yet.</td></tr>';
                } else {
                    anData.topPaths.forEach((item, index) => {
                        pathsTableBody.innerHTML += `<tr>
                            <td>${index + 1}</td>
                            <td class="text-truncate" style="max-width: 350px;" title="${item.path}"><code>${item.path}</code></td>
                            <td class="text-end fw-bold text-primary">${item.views.toLocaleString()}</td>
                        </tr>`;
                    });
                }
            }
        }
    } catch(e) {
        console.error("Failed to load GA4 analytics data:", e);
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
                if (visitLink && data.site_url) {
                    visitLink.href = data.site_url.trim();
                }
            }
        }
    } catch (e) {
        console.error("Failed to load global settings:", e);
    }
}

// Function to poll realtime data every 15 seconds
function startRealtimeUpdates() {
    // 15000 milliseconds = 15 seconds. You can adjust as needed (e.g., 30000 for 30 seconds)
    setInterval(async () => {
        try {
            const res = await fetch('/api/analytics/realtime');
            if (res.ok) {
                const data = await res.json();
                const realtimeVal = data.active || 0;
                
                // Simple animation to visually reflect update
                const elBig = document.getElementById('realtime-big-number');
                const elSmall = document.getElementById('sum-realtime');
                
                if (elBig && elBig.innerText != realtimeVal) {
                    elBig.style.opacity = 0.5;
                    setTimeout(() => {
                        elBig.innerText = realtimeVal;
                        elBig.style.opacity = 1;
                    }, 300);
                }
                
                if (elSmall) elSmall.innerText = realtimeVal;
            }
        } catch (e) {
            console.error("Failed to fetch realtime data:", e);
        }
    }, 15000);
}

// 7. Initialization on DOM Load
document.addEventListener("DOMContentLoaded", function() {
    const defaultLang = localStorage.getItem('dashboard_lang') || 'en';
    changeLanguage(defaultLang);
    loadUserProfileInfo();
    loadDetailedAnalytics();
    updateVisitSiteLink();
    startRealtimeUpdates();
});