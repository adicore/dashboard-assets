// assets/security-guard.js
(function verifyModuleSecurity() {
  const currentHost = window.location.hostname.toLowerCase();
  const lockedDomain = "__LOCKED_DOMAIN__"; // Placeholder untuk dynamic rewrite dari Worker Klien

  // Bypass untuk lingkungan development lokal
  if (currentHost === "localhost" || currentHost === "127.0.0.1") return;

  // 1. VALIDASI DYNAMIC DOMAIN LOCK
  if (lockedDomain !== "__LOCKED_DOMAIN__" && !lockedDomain.includes(currentHost) && !currentHost.includes(lockedDomain)) {
    blockUI("🚨 403 DOMAIN LOCK VIOLATION: Skrip ini dikunci khusus untuk domain resmi.");
    throw new Error("Domain lock mismatch.");
  }

  // 2. VALIDASI JWT LISENSI LENGKAP
  const authToken = window.__CMS_AUTH__;
  if (!authToken) {
    blockUI("🚨 403 LICENSE ERROR: Token lisensi CMS tidak ditemukan.");
    throw new Error("Missing auth token.");
  }

  try {
    // Decode Payload JWT tanpa hit network/API (Base64 URL Safe -> JSON)
    const base64 = authToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);

    // Cek kesesuaian domain utama atau daftar exempt domains dari isi payload JWT
    const isDomainMatch = payload.domain && currentHost.includes(payload.domain.toLowerCase());
    const isExemptMatch = (payload.exempt_domains || []).some(ex => currentHost.includes(ex.toLowerCase()));

    if (!isDomainMatch && !isExemptMatch) {
      blockUI("🚨 403 LICENSE EXPIRED OR INVALID: Akses domain tidak diizinkan.");
      throw new Error("Invalid license payload.");
    }
  } catch (e) {
    blockUI("🚨 403 LICENSE ERROR: Format token lisensi tidak valid.");
    throw new Error("Token verification error.");
  }

  // Helper fungsi untuk memblokir seluruh tampilan antarmuka (UI) jika verifikasi gagal
  function blockUI(msg) {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#ef4444;font-family:sans-serif;text-align:center;padding:20px;">
          <div>
            <h2 style="margin:0;font-size:24px;">${msg}</h2>
          </div>
        </div>`;
    });
  }
})();