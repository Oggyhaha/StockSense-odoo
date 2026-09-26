/**
 * Auth View (Login, Registration, OTP Reset, 1-Click Demo Accounts)
 */
const AuthView = {
    render() {
        const root = document.getElementById('app');
        root.innerHTML = `
            <div class="auth-wrapper">
                <div class="auth-hero-side">
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <div class="brand-icon-svg">${Icons.logo}</div>
                        <h2 style="font-size:1.4rem; font-weight:800; color:white;">StockSense</h2>
                        <span class="brand-badge">Enterprise IMS</span>
                    </div>

                    <div>
                        <div style="display:inline-block; font-size:0.75rem; font-weight:700; color:var(--primary-hover); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.75rem;">
                            Production-Grade Multi-Warehouse Architecture
                        </div>
                        <h1 style="font-size:2.5rem; font-weight:800; line-height:1.15; margin-bottom:1.25rem;">
                            Total Visibility.<br/>
                            Zero Discrepancies.<br/>
                            <span style="background: linear-gradient(135deg, var(--primary), #38bdf8); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">
                                Immutable Stock Ledger.
                            </span>
                        </h1>
                        <p style="font-size:1.05rem; line-height:1.6; max-width:480px; color:var(--text-secondary);">
                            Digitize receipts, delivery orders, internal relocations, and physical cycle count reconciliations across multiple warehouses with real-time ACID integrity.
                        </p>
                    </div>

                    <div style="display:flex; gap:1.75rem; border-top:1px solid var(--border-subtle); padding-top:1.5rem;">
                        <div>
                            <div style="font-size:1.25rem; font-weight:800; color:white;">100%</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">Audited Movements</div>
                        </div>
                        <div>
                            <div style="font-size:1.25rem; font-weight:800; color:var(--success);">ACID</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">Transactional Stock</div>
                        </div>
                        <div>
                            <div style="font-size:1.25rem; font-weight:800; color:var(--primary-hover);">RBAC</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">Role Governance</div>
                        </div>
                    </div>
                </div>

                <div class="auth-form-side">
                    <div class="auth-card" id="auth-card-content">
                        <!-- Login Form Loaded by Default -->
                    </div>
                </div>
            </div>
        `;

        this.renderLoginForm();
    },

    renderLoginForm() {
        const container = document.getElementById('auth-card-content');
        container.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem;">
                <h2 class="auth-title" style="margin:0;">Welcome Back</h2>
                <span class="badge badge-ready">Secure Sign-In</span>
            </div>
            <p class="auth-subtitle">Enter your organization credentials to access the inventory console.</p>

            <form id="login-form">
                <div class="form-group">
                    <label class="form-label">Email Address</label>
                    <input type="email" id="login-email" class="form-control" placeholder="name@company.com" required value="admin@stocksense.io">
                </div>

                <div class="form-group">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <label class="form-label">Password</label>
                        <a href="javascript:void(0)" id="link-forgot-pw" style="font-size:0.75rem;">Forgot password?</a>
                    </div>
                    <input type="password" id="login-password" class="form-control" placeholder="••••••••••••" required value="Password123!">
                </div>

                <button type="submit" class="btn btn-primary" style="width:100%; margin-top:0.5rem;" id="login-submit-btn">
                    Sign In to StockSense
                </button>
            </form>

            <div style="text-align:center; margin-top:1.25rem; font-size:0.8rem; color:var(--text-secondary);">
                Don't have an organization account?
                <a href="javascript:void(0)" id="link-show-register" style="font-weight:600;">Register New Org</a>
            </div>

            <!-- 1-Click Demo Accounts for Hackathon Judges -->
            <div class="demo-credentials-box">
                <div class="demo-title">
                    <span>⚡ Hackathon 1-Click Demo Access</span>
                    <span style="font-size:0.65rem; color:var(--text-muted);">Click to log in</span>
                </div>
                <div class="demo-buttons-grid">
                    <button class="demo-btn" data-email="admin@stocksense.io" data-pass="Password123!">
                        <div style="color:var(--primary-hover); font-weight:700;">👑 Admin</div>
                        <div style="font-size:0.65rem; color:var(--text-muted);">Full system control</div>
                    </button>
                    <button class="demo-btn" data-email="manager@stocksense.io" data-pass="Password123!">
                        <div style="color:var(--success); font-weight:700;">📦 Manager</div>
                        <div style="font-size:0.65rem; color:var(--text-muted);">Stock validation</div>
                    </button>
                    <button class="demo-btn" data-email="staff@stocksense.io" data-pass="Password123!">
                        <div style="color:var(--warning); font-weight:700;">👷 Staff</div>
                        <div style="font-size:0.65rem; color:var(--text-muted);">Picking & moves</div>
                    </button>
                    <button class="demo-btn" data-email="viewer@stocksense.io" data-pass="Password123!">
                        <div style="color:var(--info); font-weight:700;">👁️ Viewer</div>
                        <div style="font-size:0.65rem; color:var(--text-muted);">Read-only reports</div>
                    </button>
                </div>
            </div>
        `;

        document.getElementById('login-form').onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const btn = document.getElementById('login-submit-btn');

            try {
                btn.disabled = true;
                btn.innerHTML = 'Authenticating...';
                const result = await API.login({ email, password });
                State.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
                State.setUser(result.user);
                Toast.success(`Welcome back, ${result.user.name}!`);
                window.location.hash = '#dashboard';
            } catch (err) {
                Toast.error(err.message);
                btn.disabled = false;
                btn.innerHTML = 'Sign In to StockSense';
            }
        };

        // Quick click buttons
        document.querySelectorAll('.demo-btn').forEach(btn => {
            btn.onclick = () => {
                document.getElementById('login-email').value = btn.dataset.email;
                document.getElementById('login-password').value = btn.dataset.pass;
                document.getElementById('login-submit-btn').click();
            };
        });

        document.getElementById('link-show-register').onclick = () => this.renderRegisterForm();
        document.getElementById('link-forgot-pw').onclick = () => this.showForgotPasswordModal();
    },

    renderRegisterForm() {
        const container = document.getElementById('auth-card-content');
        container.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem;">
                <h2 class="auth-title" style="margin:0;">Register Organization</h2>
                <span class="badge badge-ready">New Tenant</span>
            </div>
            <p class="auth-subtitle">Create a brand new tenant organization with isolated stock ledgers.</p>

            <form id="register-form">
                <div class="form-group">
                    <label class="form-label">Full Name</label>
                    <input type="text" id="reg-name" class="form-control" placeholder="e.g. John Doe" required>
                </div>

                <div class="form-group">
                    <label class="form-label">Organization Name</label>
                    <input type="text" id="reg-org" class="form-control" placeholder="e.g. Nexus Industrial Supply" required>
                </div>

                <div class="form-group">
                    <label class="form-label">Work Email</label>
                    <input type="email" id="reg-email" class="form-control" placeholder="john@nexus.com" required>
                </div>

                <div class="form-group">
                    <label class="form-label">Password (min 8 chars)</label>
                    <input type="password" id="reg-password" class="form-control" placeholder="••••••••••••" minlength="8" required>
                </div>

                <button type="submit" class="btn btn-primary" style="width:100%; margin-top:0.5rem;" id="reg-submit-btn">
                    Create Organization Account
                </button>
            </form>

            <div style="text-align:center; margin-top:1.25rem; font-size:0.8rem; color:var(--text-secondary);">
                Already have an account?
                <a href="javascript:void(0)" id="link-show-login" style="font-weight:600;">Back to Sign In</a>
            </div>
        `;

        document.getElementById('register-form').onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const organizationName = document.getElementById('reg-org').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const btn = document.getElementById('reg-submit-btn');

            try {
                btn.disabled = true;
                btn.innerHTML = 'Creating Tenant Organization...';
                const result = await API.register({ name, organizationName, email, password });
                State.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
                State.setUser(result.user);
                Toast.success(`Organization ${organizationName} created successfully!`);
                window.location.hash = '#dashboard';
            } catch (err) {
                Toast.error(err.message);
                btn.disabled = false;
                btn.innerHTML = 'Create Organization Account';
            }
        };

        document.getElementById('link-show-login').onclick = () => this.renderLoginForm();
    },

    showForgotPasswordModal() {
        Modal.open({
            title: 'Reset Password (OTP Verification)',
            content: `
                <div id="otp-step-1">
                    <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1rem;">
                        Enter your registered email address. We'll generate a secure 6-digit OTP code with 10-minute validity.
                    </p>
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <input type="email" id="reset-email" class="form-control" placeholder="name@company.com" value="manager@stocksense.io">
                    </div>
                </div>

                <div id="otp-step-2" style="display:none;">
                    <div id="otp-demo-banner" style="padding:0.75rem; background:var(--primary-light); border:1px solid var(--primary-border); border-radius:var(--radius-md); margin-bottom:1rem;">
                        <div style="font-size:0.75rem; font-weight:700; color:var(--primary-hover);">🔐 Instant Demo OTP Code Generated:</div>
                        <div id="otp-display-code" style="font-size:1.5rem; font-weight:800; letter-spacing:0.2em; color:white; font-family:var(--font-mono); margin:0.35rem 0;"></div>
                        <div style="font-size:0.7rem; color:var(--text-secondary);">In development mode, OTP is shown here for testing. In production, this is emailed via SMTP.</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Enter 6-Digit OTP</label>
                        <input type="text" id="reset-otp-input" class="form-control" placeholder="123456" maxlength="6">
                    </div>

                    <div class="form-group">
                        <label class="form-label">New Password</label>
                        <input type="password" id="reset-new-password" class="form-control" placeholder="At least 8 characters">
                    </div>
                </div>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                <button class="btn btn-primary" id="btn-otp-action">Send OTP Code</button>
            `,
            onOpen: () => {
                let currentEmail = '';
                const btnAction = document.getElementById('btn-otp-action');

                btnAction.onclick = async () => {
                    const step1 = document.getElementById('otp-step-1');
                    const step2 = document.getElementById('otp-step-2');

                    if (step1.style.display !== 'none') {
                        currentEmail = document.getElementById('reset-email').value;
                        if (!currentEmail) return Toast.error('Please enter your email');

                        try {
                            btnAction.disabled = true;
                            btnAction.innerHTML = 'Sending...';
                            const res = await API.forgotPassword(currentEmail);
                            step1.style.display = 'none';
                            step2.style.display = 'block';

                            if (res.demoOtp) {
                                document.getElementById('otp-display-code').innerText = res.demoOtp;
                                document.getElementById('reset-otp-input').value = res.demoOtp;
                            }

                            btnAction.disabled = false;
                            btnAction.innerHTML = 'Verify & Set Password';
                            Toast.success('OTP generated successfully!');
                        } catch (err) {
                            Toast.error(err.message);
                            btnAction.disabled = false;
                            btnAction.innerHTML = 'Send OTP Code';
                        }
                    } else {
                        // Step 2: Reset
                        const otp = document.getElementById('reset-otp-input').value;
                        const newPassword = document.getElementById('reset-new-password').value;

                        if (!otp || !newPassword) return Toast.error('Please enter the OTP and your new password');

                        try {
                            btnAction.disabled = true;
                            btnAction.innerHTML = 'Resetting Password...';
                            await API.resetPassword(currentEmail, otp, newPassword);
                            Toast.success('Password reset successfully! Please log in with your new password.');
                            Modal.close();
                        } catch (err) {
                            Toast.error(err.message);
                            btnAction.disabled = false;
                            btnAction.innerHTML = 'Verify & Set Password';
                        }
                    }
                };
            }
        });
    }
};

window.AuthView = AuthView;
