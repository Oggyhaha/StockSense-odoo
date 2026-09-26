/**
 * Settings View (Organization Profile, Inventory Policy, User Management)
 */
const SettingsView = {
    activeTab: 'organization',
    orgSettings: null,
    inventorySettings: null,

    async render(container) {
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <h1 style="font-size:1.6rem; font-weight:800; margin-bottom:0.25rem;">Settings</h1>
                    <p style="font-size:0.85rem; color:var(--text-secondary);">Configure organization profile, inventory policies, and system preferences.</p>
                </div>
            </div>

            <!-- Tab Navigation -->
            <div style="display:flex; gap:0.25rem; margin-bottom:1.5rem; background:var(--bg-surface-elevated); padding:0.25rem; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
                <button class="tab-btn ${this.activeTab === 'organization' ? 'active' : ''}" data-tab="organization" style="flex:1; padding:0.6rem 1rem; border:none; background:transparent; color:var(--text-secondary); font-weight:600; border-radius:var(--radius-sm); cursor:pointer; transition:all var(--transition-fast);">
                    ${Icons.settings} Organization
                </button>
                <button class="tab-btn ${this.activeTab === 'inventory' ? 'active' : ''}" data-tab="inventory" style="flex:1; padding:0.6rem 1rem; border:none; background:transparent; color:var(--text-secondary); font-weight:600; border-radius:var(--radius-sm); cursor:pointer; transition:all var(--transition-fast);">
                    ${Icons.warehouses} Inventory Policy
                </button>
                <button class="tab-btn ${this.activeTab === 'users' ? 'active' : ''}" data-tab="users" style="flex:1; padding:0.6rem 1rem; border:none; background:transparent; color:var(--text-secondary); font-weight:600; border-radius:var(--radius-sm); cursor:pointer; transition:all var(--transition-fast);">
                    ${Icons.profile} Users & Roles
                </button>
            </div>

            <div id="settings-tab-content">
                <!-- Tab content rendered dynamically -->
            </div>
        `;

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = (e) => {
                this.activeTab = e.currentTarget.dataset.tab;
                this.renderTabContent();
            };
        });

        await this.renderTabContent();
    },

    async renderTabContent() {
        const container = document.getElementById('settings-tab-content');
        if (this.activeTab === 'organization') {
            await this.renderOrganizationTab(container);
        } else if (this.activeTab === 'inventory') {
            await this.renderInventoryTab(container);
        } else if (this.activeTab === 'users') {
            await this.renderUsersTab(container);
        }
    },

    async renderOrganizationTab(container) {
        try {
            const org = await API.getOrgSettings();
            this.orgSettings = org;

            container.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3 style="font-size:1rem; font-weight:700;">Organization Profile</h3>
                    </div>
                    <div class="card-body">
                        <form id="form-org-settings">
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                                <div class="form-group">
                                    <label class="form-label">Organization Name *</label>
                                    <input type="text" id="org-name" class="form-control" value="${org.name || ''}" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Organization Code</label>
                                    <input type="text" id="org-code" class="form-control" value="${org.code || ''}" readonly style="background:var(--bg-input); color:var(--text-muted);">
                                    <div style="font-size:0.7rem; color:var(--text-muted);">Code is immutable after creation</div>
                                </div>
                            </div>

                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                                <div class="form-group">
                                    <label class="form-label">Currency</label>
                                    <select id="org-currency" class="form-control">
                                        <option value="USD" ${org.currency === 'USD' ? 'selected' : ''}>USD - US Dollar</option>
                                        <option value="EUR" ${org.currency === 'EUR' ? 'selected' : ''}>EUR - Euro</option>
                                        <option value="GBP" ${org.currency === 'GBP' ? 'selected' : ''}>GBP - British Pound</option>
                                        <option value="CAD" ${org.currency === 'CAD' ? 'selected' : ''}>CAD - Canadian Dollar</option>
                                        <option value="AUD" ${org.currency === 'AUD' ? 'selected' : ''}>AUD - Australian Dollar</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Timezone</label>
                                    <select id="org-timezone" class="form-control">
                                        <option value="America/New_York" ${org.timezone === 'America/New_York' ? 'selected' : ''}>America/New_York (EST/EDT)</option>
                                        <option value="America/Chicago" ${org.timezone === 'America/Chicago' ? 'selected' : ''}>America/Chicago (CST/CDT)</option>
                                        <option value="America/Denver" ${org.timezone === 'America/Denver' ? 'selected' : ''}>America/Denver (MST/MDT)</option>
                                        <option value="America/Los_Angeles" ${org.timezone === 'America/Los_Angeles' ? 'selected' : ''}>America/Los_Angeles (PST/PDT)</option>
                                        <option value="Europe/London" ${org.timezone === 'Europe/London' ? 'selected' : ''}>Europe/London (GMT/BST)</option>
                                        <option value="Europe/Paris" ${org.timezone === 'Europe/Paris' ? 'selected' : ''}>Europe/Paris (CET/CEST)</option>
                                        <option value="Asia/Tokyo" ${org.timezone === 'Asia/Tokyo' ? 'selected' : ''}>Asia/Tokyo (JST)</option>
                                        <option value="Asia/Shanghai" ${org.timezone === 'Asia/Shanghai' ? 'selected' : ''}>Asia/Shanghai (CST)</option>
                                        <option value="UTC" ${org.timezone === 'UTC' ? 'selected' : ''}>UTC</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-group" style="margin-top:1.5rem; padding-top:1rem; border-top:1px solid var(--border-subtle);">
                                <label class="form-label">Logo URL (Optional)</label>
                                <input type="url" id="org-logo" class="form-control" value="${org.logo_url || ''}" placeholder="https://example.com/logo.svg">
                            </div>

                            <div style="display:flex; gap:0.75rem; margin-top:1rem;">
                                <button type="submit" class="btn btn-primary">${Icons.check} Save Organization Settings</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Organization Info -->
                <div class="card" style="margin-top:1.5rem;">
                    <div class="card-header">
                        <h3 style="font-size:1rem; font-weight:700;">Organization Information</h3>
                    </div>
                    <div class="card-body">
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem;">
                            <div style="padding:1rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md);">
                                <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Organization ID</div>
                                <div style="font-family:var(--font-mono); font-size:0.85rem; color:var(--text-primary);">${org.id}</div>
                            </div>
                            <div style="padding:1rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md);">
                                <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Created</div>
                                <div style="font-size:0.85rem; color:var(--text-primary);">${new Date(org.created_at).toLocaleDateString()}</div>
                            </div>
                            <div style="padding:1rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md);">
                                <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Last Updated</div>
                                <div style="font-size:0.85rem; color:var(--text-primary);">${new Date(org.updated_at).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('form-org-settings').onsubmit = async (e) => {
                e.preventDefault();
                try {
                    const data = {
                        name: document.getElementById('org-name').value,
                        currency: document.getElementById('org-currency').value,
                        timezone: document.getElementById('org-timezone').value,
                        logo_url: document.getElementById('org-logo').value
                    };
                    await API.updateOrgSettings(data);
                    Toast.success('Organization settings saved');
                    this.renderOrganizationTab(container);
                } catch (e) {
                    Toast.error(e.message);
                }
            };
        } catch (e) {
            container.innerHTML = `<div class="card" style="padding:2rem; text-align:center; color:var(--danger);">Failed to load organization settings: ${e.message}</div>`;
        }
    },

    async renderInventoryTab(container) {
        try {
            const inv = await API.getInventorySettings();
            this.inventorySettings = inv;

            container.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3 style="font-size:1rem; font-weight:700;">Inventory Policy</h3>
                    </div>
                    <div class="card-body">
                        <form id="form-inv-settings">
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem;">
                                <div style="padding:1.5rem; background:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
                                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem;">
                                        <div>
                                            <div style="font-weight:700; color:var(--text-primary);">Allow Negative Stock</div>
                                            <div style="font-size:0.8rem; color:var(--text-muted);">Permit stock levels to go below zero during dispatch</div>
                                        </div>
                                        <label class="toggle-switch">
                                            <input type="checkbox" id="inv-allow-negative" ${inv.allow_negative_stock ? 'checked' : ''}>
                                            <span class="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <div style="font-size:0.75rem; color:var(--text-muted); padding-top:1rem; border-top:1px solid var(--border-subtle);">
                                        <strong>Warning:</strong> Enabling this allows dispatching more stock than physically available. Use only if you have reconciliation processes to handle negative balances.
                                    </div>
                                </div>

                                <div style="padding:1.5rem; background:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
                                    <div>
                                        <div style="font-weight:700; color:var(--text-primary); margin-bottom:0.5rem;">Adjustment Approval Threshold</div>
                                        <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">Auto-require manager approval when adjustment valuation impact exceeds this amount (USD)</div>
                                        <div style="display:flex; align-items:center; gap:0.75rem;">
                                            <span style="font-size:1.25rem; font-weight:700; color:var(--primary-hover);">$</span>
                                            <input type="number" step="0.01" min="0" id="inv-threshold" class="form-control" value="${inv.adjustment_approval_threshold || 500}" style="width:140px;">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style="margin-top:1.5rem; padding:1.5rem; background:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
                                <div style="font-weight:700; color:var(--text-primary); margin-bottom:0.75rem;">Default Units of Measure</div>
                                <div style="font-size:0.85rem; color:var(--text-secondary);">Manage UoMs from the Products page (Categories & UoM buttons)</div>
                            </div>

                            <div style="display:flex; gap:0.75rem; margin-top:1.5rem;">
                                <button type="submit" class="btn btn-primary">${Icons.check} Save Inventory Policy</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Current Stock Valuation Summary -->
                <div class="card" style="margin-top:1.5rem;">
                    <div class="card-header">
                        <h3 style="font-size:1rem; font-weight:700;">Current Stock Valuation Summary</h3>
                    </div>
                    <div class="card-body" id="valuation-summary">
                        Loading...
                    </div>
                </div>
            `;

            document.getElementById('form-inv-settings').onsubmit = async (e) => {
                e.preventDefault();
                try {
                    const data = {
                        allow_negative_stock: document.getElementById('inv-allow-negative').checked,
                        adjustment_approval_threshold: parseFloat(document.getElementById('inv-threshold').value) || 0
                    };
                    await API.updateInventorySettings(data);
                    Toast.success('Inventory policy updated');
                    this.renderInventoryTab(container);
                } catch (e) {
                    Toast.error(e.message);
                }
            };

            // Load valuation summary
            this.loadValuationSummary();
        } catch (e) {
            container.innerHTML = `<div class="card" style="padding:2rem; text-align:center; color:var(--danger);">Failed to load inventory settings: ${e.message}</div>`;
        }
    },

    async loadValuationSummary() {
        const container = document.getElementById('valuation-summary');
        try {
            // Get stock summary from dashboard
            const summary = await API.getDashboardSummary({});
            container.innerHTML = `
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:1rem;">
                    <div style="padding:1rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); text-align:center;">
                        <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Total Products</div>
                        <div style="font-size:1.75rem; font-weight:800; color:white;">${summary.totalProducts.toLocaleString()}</div>
                    </div>
                    <div style="padding:1rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); text-align:center;">
                        <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Total Units in Stock</div>
                        <div style="font-size:1.75rem; font-weight:800; color:var(--success);">${summary.totalStockQuantity.toLocaleString()}</div>
                    </div>
                    <div style="padding:1rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); text-align:center;">
                        <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Total Stock Value</div>
                        <div style="font-size:1.75rem; font-weight:800; color:var(--secondary);">$${summary.totalStockValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    </div>
                    <div style="padding:1rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); text-align:center;">
                        <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Low Stock Items</div>
                        <div style="font-size:1.75rem; font-weight:800; color:var(--warning);">${summary.lowStockCount}</div>
                    </div>
                </div>
            `;
        } catch (e) {
            container.innerHTML = `<div style="color:var(--text-muted);">Unable to load valuation: ${e.message}</div>`;
        }
    },

    async renderUsersTab(container) {
        // This would require a users API endpoint - for now show info
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 style="font-size:1rem; font-weight:700;">User Management</h3>
                </div>
                <div class="card-body">
                    <div style="padding:2rem; text-align:center; color:var(--text-secondary);">
                        ${Icons.profile}
                        <div style="margin-top:1rem; font-weight:600; color:var(--text-primary);">User Management Module</div>
                        <div style="font-size:0.85rem; margin-top:0.5rem;">User management functionality requires additional API endpoints for listing, creating, and assigning roles to users within the organization.</div>
                        <div style="margin-top:1.5rem; font-size:0.75rem; color:var(--text-muted);">
                            Current user: ${State.user?.name} (${State.user?.role})
                        </div>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top:1.5rem;">
                <div class="card-header">
                    <h3 style="font-size:1rem; font-weight:700;">Role Definitions</h3>
                </div>
                <div class="card-body">
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1rem;">
                        <div class="tree-node" style="border-left:4px solid var(--danger);">
                            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
                                <span style="font-size:1.25rem;">👑</span>
                                <strong>ADMIN</strong>
                            </div>
                            <div style="font-size:0.8rem; color:var(--text-secondary);">Full system access including organization settings, user management, and all inventory operations.</div>
                        </div>
                        <div class="tree-node" style="border-left:4px solid var(--success);">
                            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
                                <span style="font-size:1.25rem;">📦</span>
                                <strong>INVENTORY_MANAGER</strong>
                            </div>
                            <div style="font-size:0.8rem; color:var(--text-secondary);">Manage products, validate receipts/deliveries/transfers, approve adjustments, view all reports.</div>
                        </div>
                        <div class="tree-node" style="border-left:4px solid var(--warning);">
                            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
                                <span style="font-size:1.25rem;">👷</span>
                                <strong>WAREHOUSE_STAFF</strong>
                            </div>
                            <div style="font-size:0.8rem; color:var(--text-secondary);">Execute picking, packing, create receipts/deliveries/transfers/adjustments, view assigned tasks.</div>
                        </div>
                        <div class="tree-node" style="border-left:4px solid var(--info);">
                            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
                                <span style="font-size:1.25rem;">👁️</span>
                                <strong>VIEWER</strong>
                            </div>
                            <div style="font-size:0.8rem; color:var(--text-secondary);">Read-only access to dashboards, product catalog, stock balances, and ledger.</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};

window.SettingsView = SettingsView;