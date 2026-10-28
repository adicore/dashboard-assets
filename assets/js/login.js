document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. Navigation & UI Logic
    // ==========================================
    const loginView = document.getElementById('loginView');
    const forgotView = document.getElementById('forgotView');
    const step1Form = document.getElementById('step-1-form');
    const step2Form = document.getElementById('step-2-form');
    const errDiv = document.getElementById('loginErrorMessage');

    document.getElementById('toForgotBtn').addEventListener('click', (e) => { 
        e.preventDefault(); 
        loginView.classList.add('d-none'); 
        forgotView.classList.remove('d-none'); 
    });

    document.getElementById('backToLoginBtn').addEventListener('click', (e) => { 
        e.preventDefault(); 
        forgotView.classList.add('d-none'); 
        loginView.classList.remove('d-none'); 
    });

    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    togglePassword.addEventListener('click', function () {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('bi-eye');
        this.classList.toggle('bi-eye-slash');
    });

    // ==========================================
    // 2. Remember Me Logic
    // ==========================================
    const emailInput = document.getElementById('email');
    const rememberCheckbox = document.getElementById('rememberMe');
    const savedEmail = localStorage.getItem('rememberedEmail');
    
    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberCheckbox.checked = true;
    }

    // Temporary memory variables for Step 2
    let tempEmail = "";
    let tempPassword = "";

    // ==========================================
    // 3. STEP 1: LOGIN (EMAIL, PASSWORD, ALTCHA CAPTCHA)
    // ==========================================
    step1Form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errDiv.classList.add('d-none');

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const altchaPayload = document.querySelector('[name="altcha"]')?.value;

        if (!altchaPayload) {
            errDiv.textContent = "Please complete the security check (Captcha).";
            errDiv.classList.remove('d-none');
            return;
        }

        if (rememberCheckbox.checked) {
            localStorage.setItem('rememberedEmail', email);
        } else {
            localStorage.removeItem('rememberedEmail');
        }

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: email, 
                    password: password, 
                    altchaPayload: altchaPayload,
                    step: 1 
                })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Login failed. Please check your credentials.');

            if (data.require_2fa) {
                tempEmail = email;
                tempPassword = password;
                
                step1Form.classList.add('d-none');
                step2Form.classList.remove('d-none');
                return;
            }

            processLoginSuccess(data.token);

        } catch (err) {
            errDiv.textContent = err.message;
            errDiv.classList.remove('d-none');
        }
    });

    // ==========================================
    // 4. STEP 2: 2FA VERIFICATION
    // ==========================================
    step2Form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errDiv.classList.add('d-none');
        
        const totpCode = document.getElementById('totpCode').value.trim();

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: tempEmail, 
                    password: tempPassword, 
                    totp_code: totpCode, 
                    step: 2 
                })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Invalid 2FA code.');

            processLoginSuccess(data.token);

        } catch (err) {
            errDiv.textContent = err.message;
            errDiv.classList.remove('d-none');
            document.getElementById('totpCode').value = '';
        }
    });

    document.getElementById('cancel2FABtn').addEventListener('click', () => {
        tempEmail = ""; tempPassword = "";
        document.getElementById('totpCode').value = '';
        errDiv.classList.add('d-none');
        
        step2Form.classList.add('d-none');
        step1Form.classList.remove('d-none');
    });

    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================
    function processLoginSuccess(token) {
        localStorage.setItem('jwt_token', token);
        const isSecure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `session_token=${token}; path=/; max-age=86400; SameSite=Lax${isSecure}`;
        window.location.href = '/overview'; 
    }

    // ==========================================
    // 5. FORGOT / RESET PASSWORD LOGIC
    // ==========================================
    let resetStep = 1;
    document.getElementById('forgotForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errForgotDiv = document.getElementById('forgotErrorMessage');
        const succForgotDiv = document.getElementById('forgotSuccessMessage');
        errForgotDiv.classList.add('d-none');
        succForgotDiv.classList.add('d-none');

        const emailForgot = document.getElementById('forgotEmail').value.trim();

        if (resetStep === 1) {
            try {
                const res = await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailForgot })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to send request.');

                succForgotDiv.textContent = data.message || "A verification code has been sent to your email.";
                succForgotDiv.classList.remove('d-none');
                
                document.getElementById('resetFields').classList.remove('d-none');
                document.getElementById('forgotEmail').setAttribute('readonly', true);
                document.getElementById('forgotSubmitBtn').textContent = "Save New Password";
                resetStep = 2;
            } catch (err) {
                errForgotDiv.textContent = err.message;
                errForgotDiv.classList.remove('d-none');
            }
        } else {
            const code = document.getElementById('resetCode').value.trim();
            const newPassword = document.getElementById('newPassword').value.trim();

            try {
                const res = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailForgot, code, newPassword })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to reset password. The code might be invalid.');

                succForgotDiv.textContent = "Password successfully changed! Please log in again.";
                succForgotDiv.classList.remove('d-none');
                
                setTimeout(() => { window.location.reload(); }, 2000);
            } catch (err) {
                errForgotDiv.textContent = err.message;
                errForgotDiv.classList.remove('d-none');
            }
        }
    });
});

// ==========================================
// INSTANT DEMO FUNCTION
// ==========================================
async function startDemo(btnElement) {
    const originalText = btnElement.innerHTML;
    btnElement.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Setting up the Sandbox...';
    btnElement.disabled = true;
    
    try {
        const res = await fetch('/api/demo/create', { method: 'POST' });
        const data = await res.json();
        
        if (data.success) {
            if (data.token) {
                localStorage.setItem('jwt_token', data.token); 
                const isSecure = window.location.protocol === 'https:' ? '; Secure' : '';
                document.cookie = `session_token=${data.token}; path=/; max-age=7200; SameSite=Lax${isSecure}`;
            }
            window.location.href = data.redirect || '/overview';
        } else {
            alert('Failed to set up demo account: ' + (data.error || 'A system error occurred.'));
            btnElement.innerHTML = originalText;
            btnElement.disabled = false;
        }
    } catch (err) {
        alert('Failed to connect to server. Please try again later.');
        btnElement.innerHTML = originalText;
        btnElement.disabled = false;
    }
}