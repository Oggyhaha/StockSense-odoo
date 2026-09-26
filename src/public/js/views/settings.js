/**
 * Settings View (Organization Profile, Inventory Policy, Warehouse, Locations, User Management)
 */
const SettingsView = {
    activeTab: 'organization',
    orgSettings: null,
    inventorySettings: null,
    warehouses: [],
    locations: [],

    async render(container) {
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <h1 style="font-size:1.6rem; font-weight:800; margin-bottom:0.25rem;">Settings</h1>
                    <p style="font-size:0.85rem; color:var(--text-secondary);">Configure organization profile, inventory policies, warehouses, locations, and system preferences.</p>
                </div>
            </div>

            <!-- Tab Navigation -->
            <div style="display:flex; gap:0.25rem; margin-bottom:1.5rem; background:var(--bg-surface-elevated); padding:0.25rem; border-radius:var(--radius-md); border:1px solid var(--border-subtle); flex-wrap:wrap;">
                <button class="tab-btn ${this.activeTab === 'organization' ? 'active' : ''}" data-tab="organization" style="flex:1; padding:0.6rem 1rem; border:none; background:transparent; color:var(--text-secondary); font-weight:600; border-radius:var(--radius-sm); cursor:pointer; transition:all var(--transition-fast);">
                    ${Icons.settings} Organization
                </button>
                <button class="tab-btn ${this.activeTab === 'inventory' ? 'active' : ''}" data-tab="inventory" style="flex:1; padding:0.6rem 1rem; border:none; background:transparent; color:var(--text-secondary); font-weight:600; border-radius:var(--radius-sm); cursor:pointer; transition:all var(--transition-fast);">
                    ${Icons.warehouses} Inventory Policy
                </button>
                <button class="tab-btn ${this.activeTab === 'warehouses' ? 'active' : ''}" data-tab="warehouses" style="flex:1; padding:0.6rem 1rem; border:none; background:transparent; color:var(--text-secondary); font-weight:600; border-radius:var(--radius-sm); cursor:pointer; transition:all var(--transition-fast);">
                    ${Icons.warehouses} Warehouses
                </button>
                <button class="tab-btn ${this.activeTab === 'locations' ? 'active' : ''}" data-tab="locations" style="flex:1; padding:0.6rem 1rem; border:none; background:transparent; color:var(--text-secondary); font-weight:600; border-radius:var(--radius-sm); cursor:pointer; transition:all var(--transition-fast);">
                    ${Icons.warehouses} Locations
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
        } else if (this.activeTab === 'warehouses') {
            await this.renderWarehousesTab(container);
        } else if (this.activeTab === 'locations') {
            await this.renderLocationsTab(container);
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

    async renderWarehousesTab(container) {
        try {
            this.warehouses = await API.getWarehouses();

            container.innerHTML = `
                <div class="card">
                    <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="font-size:1rem; font-weight:700;">Warehouses</h3>
                        <button class="btn btn-primary" id="btn-create-warehouse">
                            ${Icons.plus} New Warehouse
                        </button>
                    </div>
                    <div class="card-body">
                        ${this.warehouses.length === 0 ? `
                            <div class="empty-state">
                                <div class="empty-state-icon">${Icons.warehouses}</div>
                                <div class="empty-state-title">No Warehouses Configured</div>
                                <div class="empty-state-text">Create your first warehouse to start organizing inventory.</div>
                            </div>
                        ` : `
                            <div class="table-container">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Code</th>
                                            <th>Address</th>
                                            <th>Contact</th>
                                            <th>Status</th>
                                            <th>Locations</th>
                                            <th style="text-align:right;">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.warehouses.map(w => `
                                            <tr style="cursor:pointer;" onclick="SettingsView.showWarehouseDetail('${w.id}')">
                                                <td data-label="Name"><strong>${w.name}</strong></td>
                                                <td data-label="Code"><span style="font-family:var(--font-mono); color:var(--primary);">${w.code}</span></td>
                                                <td data-label="Address">${w.address || '—'}</td>
                                                <td data-label="Contact">${w.contact_person || '—'} ${w.contact_number ? `<br><small>${w.contact_number}</small>` : ''}</td>
                                                <td data-label="Status"><span class="badge ${w.is_active ? 'badge-done' : 'badge-canceled'}">${w.is_active ? 'Active' : 'Inactive'}</span></td>
                                                <td data-label="Locations">${w.location_count || 0}</td>
                                                <td data-label="Actions" style="text-align:right;" onclick="event.stopPropagation()">
                                                    <button class="btn btn-secondary btn-sm" onclick="SettingsView.showEditWarehouseModal('${w.id}')">${Icons.plus} Edit</button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        `}
                    </div>
                </div>
            `;

            document.getElementById('btn-create-warehouse').onclick = () => this.showCreateWarehouseModal();
        } catch (e) {
            container.innerHTML = `<div class="card" style="padding:2rem; text-align:center; color:var(--danger);">Failed to load warehouses: ${e.message}</div>`;
        }
    },

    async showWarehouseDetail(warehouseId) {
        try {
            const w = await API.getWarehouse(warehouseId);
            Modal.open({
                title: `${w.name} (${w.code})`,
                size: 'lg',
                content: `
                    <div style="margin-bottom:1.5rem; padding:1rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem;">
                            <div><div style="font-size:0.7rem; color:var(--text-muted);">Address</div><div>${w.address || '—'}</div></div>
                            <div><div style="font-size:0.7rem; color:var(--text-muted);">Contact Person</div><div>${w.contact_person || '—'}</div></div>
                            <div><div style="font-size:0.7rem; color:var(--text-muted);">Contact Number</div><div>${w.contact_number || '—'}</div></div>
                            <div><div style="font-size:0.7rem; color:var(--text-muted);">Status</div><div><span class="badge ${w.is_active ? 'badge-done' : 'badge-canceled'}">${w.is_active ? 'Active' : 'Inactive'}</span></div></div>
                        </div>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <h4 style="margin:0;">Locations (${w.locations?.length || 0})</h4>
                        <button class="btn btn-secondary btn-sm" onclick="SettingsView.showCreateLocationModal('${w.id}')">${Icons.plus} Add Location</button>
                    </div>

                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Location Name</th>
                                    <th>Code</th>
                                    <th>Type</th>
                                    <th>Parent</th>
                                    <th>Status</th>
                                    <th>Current Stock</th>
                                    <th>Products</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${w.locations?.length > 0 ? w.locations.map(l => `
                                    <tr style="cursor:pointer;" onclick="SettingsView.showLocationStock('${l.id}')">
                                        <td data-label="Name"><strong>${l.name}</strong></td>
                                        <td data-label="Code"><span style="font-family:var(--font-mono);">${l.code}</span></td>
                                        <td data-label="Type"><span class="badge badge-ready">${l.location_type}</span></td>
                                        <td data-label="Parent">${l.parent_location_name || '—'}</td>
                                        <td data-label="Status"><span class="badge ${l.is_active ? 'badge-done' : 'badge-canceled'}">${l.is_active ? 'Active' : 'Inactive'}</span></td>
                                        <td data-label="Stock">${l.current_stock || 0}</td>
                                        <td data-label="Products">${l.distinct_products || 0}</td>
                                    </tr>
                                `).join('') : `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">No locations defined yet. Click "Add Location" to create one.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                `,
                footer: `<button class="btn btn-secondary" onclick="Modal.close()">Close</button>`
            });
        } catch (e) {
            Toast.error('Failed to load warehouse details: ' + e.message);
        }
    },

    async showCreateWarehouseModal() {
        Modal.open({
            title: 'Create New Warehouse',
            size: 'md',
            content: `
                <form id="form-create-warehouse">
                    <div class="form-group">
                        <label class="form-label">Warehouse Name *</label>
                        <input type="text" id="cw-name" class="form-control" placeholder="e.g. East Coast Distribution Center" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Warehouse Code * (Unique, e.g. ECD-01)</label>
                        <input type="text" id="cw-code" class="form-control" placeholder="ECD-01" style="font-family:var(--font-mono); text-transform:uppercase;" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Address</label>
                        <textarea id="cw-address" class="form-control" rows="2" placeholder="Full street address, city, state, ZIP"></textarea>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                        <div class="form-group">
                            <label class="form-label">Contact Person</label>
                            <input type="text" id="cw-contact" class="form-control" placeholder="John Doe">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Contact Number</label>
                            <input type="tel" id="cw-phone" class="form-control" placeholder="+1 (555) 123-4567">
                        </div>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                <button class="btn btn-primary" id="btn-save-warehouse">Create Warehouse</button>
            `,
            onOpen: () => {
                document.getElementById('btn-save-warehouse').onclick = async () => {
                    const data = {
                        name: document.getElementById('cw-name').value,
                        code: document.getElementById('cw-code').value.toUpperCase(),
                        address: document.getElementById('cw-address').value,
                        contact_person: document.getElementById('cw-contact').value,
                        contact_number: document.getElementById('cw-phone').value
                    };
                    if (!data.name || !data.code) return Toast.error('Name and code are required');

                    try {
                        await API.createWarehouse(data);
                        Toast.success('Warehouse created with default locations (Receiving, Storage, Dispatch)');
                        Modal.close();
                        SettingsView.renderWarehousesTab(document.getElementById('settings-tab-content'));
                    } catch (e) {
                        Toast.error(e.message);
                    }
                };
            }
        });
    },

    async showEditWarehouseModal(warehouseId) {
        try {
            const w = await API.getWarehouse(warehouseId);
            Modal.open({
                title: `Edit Warehouse: ${w.name}`,
                size: 'md',
                content: `
                    <form id="form-edit-warehouse">
                        <div class="form-group">
                            <label class="form-label">Warehouse Name</label>
                            <input type="text" id="ew-name" class="form-control" value="${w.name}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Address</label>
                            <textarea id="ew-address" class="form-control" rows="2">${w.address || ''}</textarea>
                        </div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                            <div class="form-group">
                                <label class="form-label">Contact Person</label>
                                <input type="text" id="ew-contact" class="form-control" value="${w.contact_person || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Contact Number</label>
                                <input type="tel" id="ew-phone" class="form-control" value="${w.contact_number || ''}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                <input type="checkbox" id="ew-active" ${w.is_active ? 'checked' : ''}> Active
                            </label>
                        </div>
                    </form>
                `,
                footer: `
                    <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    <button class="btn btn-primary" id="btn-save-edit-wh">Save Changes</button>
                `,
                onOpen: () => {
                    document.getElementById('btn-save-edit-wh').onclick = async () => {
                        const data = {
                            name: document.getElementById('ew-name').value,
                            address: document.getElementById('ew-address').value,
                            contact_person: document.getElementById('ew-contact').value,
                            contact_number: document.getElementById('ew-phone').value,
                            is_active: document.getElementById('ew-active').checked
                        };
                        try {
                            await API.updateWarehouse(w.id, data);
                            Toast.success('Warehouse updated');
                            Modal.close();
                            SettingsView.renderWarehousesTab(document.getElementById('settings-tab-content'));
                        } catch (e) {
                            Toast.error(e.message);
                        }
                    };
                }
            });
        } catch (e) {
            Toast.error('Failed to load warehouse: ' + e.message);
        }
    },

    async showCreateLocationModal(warehouseId) {
        Modal.open({
            title: 'Create New Location',
            size: 'md',
            content: `
                <form id="form-create-location">
                    <input type="hidden" id="cl-warehouse" value="${warehouseId}">
                    <div class="form-group">
                        <label class="form-label">Location Name *</label>
                        <input type="text" id="cl-name" class="form-control" placeholder="e.g. High Bay Rack B-02" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Location Code * (Unique within warehouse)</label>
                        <input type="text" id="cl-code" class="form-control" placeholder="RACK-B02" style="font-family:var(--font-mono); text-transform:uppercase;" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Location Type *</label>
                        <select id="cl-type" class="form-control" required>
                            <option value="RECEIVING">Receiving</option>
                            <option value="STORAGE" selected>Storage</option>
                            <option value="PRODUCTION">Production</option>
                            <option value="DISPATCH">Dispatch</option>
                            <option value="INTERNAL">Internal</option>
                            <option value="SCRAP">Scrap/Quarantine</option>
                            <option value="VIRTUAL">Virtual</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Parent Location (Optional - for hierarchy)</label>
                        <select id="cl-parent" class="form-control">
                            <option value="">No Parent (Top Level)</option>
                        </select>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                <button class="btn btn-primary" id="btn-save-location">Create Location</button>
            `,
            onOpen: async () => {
                // Load existing locations for parent selector
                const locs = await API.getLocations(warehouseId);
                const parentSelect = document.getElementById('cl-parent');
                locs.forEach(l => {
                    const opt = document.createElement('option');
                    opt.value = l.id;
                    opt.textContent = `${l.name} (${l.code})`;
                    parentSelect.appendChild(opt);
                });

                document.getElementById('btn-save-location').onclick = async () => {
                    const data = {
                        warehouse_id: warehouseId,
                        name: document.getElementById('cl-name').value,
                        code: document.getElementById('cl-code').value.toUpperCase(),
                        location_type: document.getElementById('cl-type').value,
                        parent_location_id: document.getElementById('cl-parent').value || null
                    };
                    if (!data.name || !data.code) return Toast.error('Name and code are required');

                    try {
                        await API.createLocation(data);
                        Toast.success('Location created');
                        Modal.close();
                        SettingsView.showWarehouseDetail(warehouseId);
                    } catch (e) {
                        Toast.error(e.message);
                    }
                };
            }
        });
    },

    async showLocationStock(locationId) {
        try {
            const balances = await API.getBalances({ locationId, limit: 100 });
            const loc = balances.items[0];
            const locationName = loc ? loc.location_name : 'Location';
            const warehouseName = loc ? loc.warehouse_name : '';

            Modal.open({
                title: `Stock at ${locationName} (${warehouseName})`,
                size: 'lg',
                content: `
                    <div class="table-container" style="max-height:60vh; overflow-y:auto;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>SKU</th>
                                    <th>Category</th>
                                    <th>UoM</th>
                                    <th>Qty on Hand</th>
                                    <th>Reserved</th>
                                    <th>Available</th>
                                    <th>Min Level</th>
                                    <th>Valuation</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${balances.items.length > 0 ? balances.items.map(b => `
                                    <tr>
                                        <td><strong>${b.product_name}</strong></td>
                                        <td><span style="font-family:var(--font-mono); color:var(--primary);">${b.product_sku}</span></td>
                                        <td>${b.category_name}</td>
                                        <td><span class="badge badge-draft">${b.uom_symbol}</span></td>
                                        <td><strong>${b.quantity} ${b.uom_symbol}</strong></td>
                                        <td style="color:var(--text-muted);">${b.reserved_quantity} ${b.uom_symbol}</td>
                                        <td><strong style="color:var(--success);">${b.available_quantity} ${b.uom_symbol}</strong></td>
                                        <td>${b.min_stock_level} ${b.uom_symbol}</td>
                                        <td style="font-weight:600; color:var(--secondary);">$${(b.total_valuation || 0).toFixed(2)}</td>
                                    </tr>
                                `).join('') : `<tr><td colspan="9" style="text-align:center; padding:2rem; color:var(--text-muted);">No stock at this location</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                `,
                footer: `<button class="btn btn-secondary" onclick="Modal.close()">Close</button>`
            });
        } catch (e) {
            Toast.error('Failed to load location stock: ' + e.message);
        }
    },

    async renderLocationsTab(container) {
        try {
            this.locations = [];
            for (const w of await API.getWarehouses()) {
                const locs = await API.getLocations(w.id);
                this.locations.push(...locs.map(l => ({ ...l, warehouse_name: w.name, warehouse_code: w.code })));
            }

            container.innerHTML = `
                <div class="card">
                    <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="font-size:1rem; font-weight:700;">All Locations</h3>
                        <button class="btn btn-primary" id="btn-create-location-global">
                            ${Icons.plus} New Location
                        </button>
                    </div>
                    <div class="card-body">
                        ${this.locations.length === 0 ? `
                            <div class="empty-state">
                                <div class="empty-state-icon">${Icons.warehouses}</div>
                                <div class="empty-state-title">No Locations Defined</div>
                                <div class="empty-state-text">Create locations within warehouses to organize your inventory.</div>
                            </div>
                        ` : `
                            <div class="table-container">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Warehouse</th>
                                            <th>Location Name</th>
                                            <th>Code</th>
                                            <th>Type</th>
                                            <th>Parent</th>
                                            <th>Status</th>
                                            <th>Stock Qty</th>
                                            <th>Products</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.locations.map(l => `
                                            <tr style="cursor:pointer;" onclick="SettingsView.showLocationStock('${l.id}')">
                                                <td data-label="Warehouse">${l.warehouse_name} (${l.warehouse_code})</td>
                                                <td data-label="Name"><strong>${l.name}</strong></td>
                                                <td data-label="Code"><span style="font-family:var(--font-mono);">${l.code}</span></td>
                                                <td data-label="Type"><span class="badge badge-ready">${l.location_type}</span></td>
                                                <td data-label="Parent">${l.parent_location_name || '—'}</td>
                                                <td data-label="Status"><span class="badge ${l.is_active ? 'badge-done' : 'badge-canceled'}">${l.is_active ? 'Active' : 'Inactive'}</span></td>
                                                <td data-label="Stock">${l.current_stock || 0}</td>
                                                <td data-label="Products">${l.distinct_products || 0}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        `}
                    </div>
                </div>
            `;

            document.getElementById('btn-create-location-global').onclick = async () => {
                // Show warehouse selector first
                const warehouses = await API.getWarehouses();
                Modal.open({
                    title: 'Select Warehouse for New Location',
                    content: `
                        <div style="display:flex; flex-direction:column; gap:0.75rem;">
                            ${warehouses.map(w => `
                                <button class="btn btn-secondary" style="justify-content:flex-start; text-align:left;" onclick="Modal.close(); SettingsView.showCreateLocationModal('${w.id}')">
                                    <div style="font-weight:600;">${w.name}</div>
                                    <div style="font-size:0.75rem; color:var(--text-muted);">${w.code}</div>
                                </button>
                            `).join('')}
                        </div>
                    `,
                    footer: ''
                });
            };
        } catch (e) {
            container.innerHTML = `<div class="card" style="padding:2rem; text-align:center; color:var(--danger);">Failed to load locations: ${e.message}</div>`;
        }
    },
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