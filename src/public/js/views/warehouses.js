/**
 * Warehouses & Locations View
 */
const WarehousesView = {
    async render(container) {
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <h1 style="font-size:1.6rem; font-weight:800; margin-bottom:0.25rem;">Warehouses & Locations</h1>
                    <p style="font-size:0.85rem; color:var(--text-secondary);">Manage warehouse facilities and their hierarchical location structures.</p>
                </div>
                <button class="btn btn-primary" id="btn-create-warehouse">
                    ${Icons.plus} New Warehouse
                </button>
            </div>

            <div id="warehouses-content">
                Loading warehouses...
            </div>
        `;

        await this.loadWarehouses();
        document.getElementById('btn-create-warehouse').onclick = () => this.showCreateWarehouseModal();
    },

    async loadWarehouses() {
        const container = document.getElementById('warehouses-content');
        try {
            const warehouses = await API.getWarehouses();
            if (!warehouses || warehouses.length === 0) {
                container.innerHTML = `
                    <div class="card" style="padding:3rem; text-align:center; color:var(--text-muted);">
                        ${Icons.warehouses}
                        <div style="margin-top:1rem; font-weight:600; color:var(--text-primary);">No Warehouses Configured</div>
                        <div style="font-size:0.85rem; margin-top:0.5rem;">Create your first warehouse to start organizing inventory.</div>
                    </div>
                `;
                return;
            }

            container.innerHTML = warehouses.map(w => `
                <div class="card" style="margin-bottom:1.5rem;">
                    <div class="card-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <div style="display:flex; align-items:center; gap:0.75rem;">
                                <h3 style="font-size:1.1rem; font-weight:700; margin:0;">${w.name}</h3>
                                <span class="badge badge-ready" style="font-family:var(--font-mono);">${w.code}</span>
                                ${w.is_active ? '<span class="badge badge-done" style="font-size:0.7rem;">Active</span>' : '<span class="badge badge-canceled" style="font-size:0.7rem;">Inactive</span>'}
                            </div>
                            <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.25rem;">${w.address || 'No address provided'}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">Contact: ${w.contact_person || '-'} | ${w.contact_number || '-'}</div>
                        </div>
                        <div style="display:flex; gap:0.5rem;">
                            <button class="btn btn-secondary btn-sm" onclick="WarehousesView.showWarehouseDetail('${w.id}')">${Icons.warehouses} View Details</button>
                            <button class="btn btn-secondary btn-sm" onclick="WarehousesView.showEditWarehouseModal('${w.id}')">${Icons.plus} Add Location</button>
                        </div>
                    </div>
                    <div class="card-body" style="padding:0 1.5rem 1.5rem;">
                        <div style="display:flex; gap:1.5rem; margin-bottom:1rem; padding-bottom:1rem; border-bottom:1px solid var(--border-subtle);">
                            <div style="text-align:center; padding:1rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); flex:1;">
                                <div style="font-size:1.5rem; font-weight:800; color:var(--primary-hover);">${w.totalStockQuantity?.toLocaleString() || 0}</div>
                                <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Total Units</div>
                            </div>
                            <div style="text-align:center; padding:1rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); flex:1;">
                                <div style="font-size:1.5rem; font-weight:800; color:var(--secondary);">${w.location_count || 0}</div>
                                <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Locations</div>
                            </div>
                            <div style="text-align:center; padding:1rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); flex:1;">
                                <div style="font-size:1.5rem; font-weight:800; color:var(--success);">${w.distinct_products || 0}</div>
                                <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Active SKUs</div>
                            </div>
                        </div>
                        <button class="btn btn-secondary" style="width:100%;" onclick="WarehousesView.showWarehouseDetail('${w.id}')">
                            ${Icons.plus} View All Locations & Stock
                        </button>
                    </div>
                </div>
            `).join('');
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
                            <div><div style="font-size:0.7rem; color:var(--text-muted);">Address</div><div>${w.address || '-'}</div></div>
                            <div><div style="font-size:0.7rem; color:var(--text-muted);">Contact Person</div><div>${w.contact_person || '-'}</div></div>
                            <div><div style="font-size:0.7rem; color:var(--text-muted);">Contact Number</div><div>${w.contact_number || '-'}</div></div>
                            <div><div style="font-size:0.7rem; color:var(--text-muted);">Status</div><div><span class="badge ${w.is_active ? 'badge-done' : 'badge-canceled'}">${w.is_active ? 'Active' : 'Inactive'}</span></div></div>
                        </div>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                        <h4 style="margin:0;">Locations (${w.locations?.length || 0})</h4>
                        <button class="btn btn-secondary btn-sm" onclick="WarehousesView.showCreateLocationModal('${w.id}')">${Icons.plus} Add Location</button>
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
                                    <th>Distinct Products</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${w.locations?.length > 0 ? w.locations.map(l => `
                                    <tr style="cursor:pointer;" onclick="WarehousesView.showLocationStock('${l.id}')">
                                        <td><strong>${l.name}</strong></td>
                                        <td><span style="font-family:var(--font-mono);">${l.code}</span></td>
                                        <td><span class="badge badge-ready">${l.location_type}</span></td>
                                        <td style="font-size:0.8rem; color:var(--text-secondary);">${l.parent_location_name || '—'}</td>
                                        <td><span class="badge ${l.is_active ? 'badge-done' : 'badge-canceled'}">${l.is_active ? 'Active' : 'Inactive'}</span></td>
                                        <td><strong style="color:var(--success);">${l.current_stock || 0} units</strong></td>
                                        <td>${l.distinct_products || 0}</td>
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
                        WarehousesView.loadWarehouses();
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
                            WarehousesView.loadWarehouses();
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
                        WarehousesView.showWarehouseDetail(warehouseId);
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
                                        <td><span style="font-family:var(--font-mono); color:var(--primary-hover);">${b.product_sku}</span></td>
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
    }
};

window.WarehousesView = WarehousesView;