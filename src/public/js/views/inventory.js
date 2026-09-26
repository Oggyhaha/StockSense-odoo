/**
 * Inventory View (Stock Balances Matrix & Immutable Stock Ledger)
 */
const InventoryView = {
    activeTab: 'balances',
    balancesFilters: { warehouseId: '', locationId: '', categoryId: '', search: '', status: '' },
    ledgerFilters: { productId: '', warehouseId: '', locationId: '', movementType: '', referenceType: '', search: '' },

    async render(container) {
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <h1 style="font-size:1.6rem; font-weight:800; margin-bottom:0.25rem;">Inventory & Stock Ledger</h1>
                    <p style="font-size:0.85rem; color:var(--text-secondary);">Real-time stock balances across all locations and the immutable audit trail of every movement.</p>
                </div>
                <button class="btn btn-primary" id="btn-export-inventory">
                    ${Icons.plus} Export CSV
                </button>
            </div>

            <!-- Tab Navigation -->
            <div style="display:flex; gap:0.25rem; margin-bottom:1.5rem; background:var(--bg-surface-elevated); padding:0.25rem; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
                <button class="tab-btn ${this.activeTab === 'balances' ? 'active' : ''}" data-tab="balances" style="flex:1; padding:0.6rem 1rem; border:none; background:transparent; color:var(--text-secondary); font-weight:600; border-radius:var(--radius-sm); cursor:pointer; transition:all var(--transition-fast);">
                    ${Icons.warehouses} Stock Balances
                </button>
                <button class="tab-btn ${this.activeTab === 'ledger' ? 'active' : ''}" data-tab="ledger" style="flex:1; padding:0.6rem 1rem; border:none; background:transparent; color:var(--text-secondary); font-weight:600; border-radius:var(--radius-sm); cursor:pointer; transition:all var(--transition-fast);">
                    ${Icons.ledger} Stock Ledger
                </button>
            </div>

            <div id="inventory-tab-content">
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
        const container = document.getElementById('inventory-tab-content');
        if (this.activeTab === 'balances') {
            await this.renderBalancesTab(container);
        } else {
            await this.renderLedgerTab(container);
        }
    },

    async renderBalancesTab(container) {
        container.innerHTML = `
            <!-- Filters -->
            <div class="card" style="margin-bottom:1.25rem; padding:1rem;">
                <div class="filter-bar" style="margin:0; flex-wrap:wrap;">
                    <div class="search-input-wrapper" style="min-width:200px;">
                        <span class="search-icon-inside">${Icons.search}</span>
                        <input type="text" id="inv-search-input" class="form-control" placeholder="Search product, SKU, warehouse, location..." value="${this.balancesFilters.search}">
                    </div>

                    <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
                        <select id="inv-wh-select" class="form-control" style="width:180px;">
                            <option value="">All Warehouses</option>
                        </select>
                        <select id="inv-loc-select" class="form-control" style="width:180px;">
                            <option value="">All Locations</option>
                        </select>
                        <select id="inv-cat-select" class="form-control" style="width:180px;">
                            <option value="">All Categories</option>
                        </select>
                        <select id="inv-status-select" class="form-control" style="width:160px;">
                            <option value="">All Stock Status</option>
                            <option value="low_stock">⚠️ Low Stock</option>
                            <option value="out_of_stock">⛔ Out of Stock</option>
                            <option value="in_stock">✅ In Stock</option>
                        </select>
                        <button class="btn btn-secondary" id="inv-btn-refresh">${Icons.refresh}</button>
                    </div>
                </div>
            </div>

            <!-- Balances Table -->
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Category</th>
                            <th>Warehouse</th>
                            <th>Location</th>
                            <th>Location Type</th>
                            <th>Current Qty</th>
                            <th>Reserved</th>
                            <th>Available</th>
                            <th>Min Level</th>
                            <th>Valuation</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="balances-table-body">
                        <tr><td colspan="12" style="text-align:center; padding:2rem;">Loading stock balances...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div id="balances-pagination" style="display:flex; justify-content:center; align-items:center; gap:1rem; margin-top:1rem; padding:1rem;"></div>
        `;

        await this.loadBalancesFilters();
        await this.loadBalances();

        let searchTimeout;
        document.getElementById('inv-search-input').oninput = (e) => {
            clearTimeout(searchTimeout);
            this.balancesFilters.search = e.target.value;
            searchTimeout = setTimeout(() => this.loadBalances(), 300);
        };

        document.getElementById('inv-wh-select').onchange = async (e) => {
            this.balancesFilters.warehouseId = e.target.value;
            await this.loadLocationsFilter(e.target.value);
            this.loadBalances();
        };

        document.getElementById('inv-loc-select').onchange = (e) => {
            this.balancesFilters.locationId = e.target.value;
            this.loadBalances();
        };

        document.getElementById('inv-cat-select').onchange = (e) => {
            this.balancesFilters.categoryId = e.target.value;
            this.loadBalances();
        };

        document.getElementById('inv-status-select').onchange = (e) => {
            this.balancesFilters.status = e.target.value;
            this.loadBalances();
        };

        document.getElementById('inv-btn-refresh').onclick = () => this.loadBalances();
    },

    async loadBalancesFilters() {
        try {
            const [warehouses, categories] = await Promise.all([
                API.getWarehouses(),
                API.getCategories()
            ]);

            const whSelect = document.getElementById('inv-wh-select');
            warehouses.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.id;
                opt.textContent = w.name;
                if (w.id === this.balancesFilters.warehouseId) opt.selected = true;
                whSelect.appendChild(opt);
            });

            const catSelect = document.getElementById('inv-cat-select');
            categories.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name;
                if (c.id === this.balancesFilters.categoryId) opt.selected = true;
                catSelect.appendChild(opt);
            });

            // Load locations for first warehouse if no filter
            if (warehouses.length > 0 && !this.balancesFilters.warehouseId) {
                await this.loadLocationsFilter(warehouses[0].id);
            }
        } catch (e) {
            console.error('Failed to load inventory filters:', e);
        }
    },

    async loadLocationsFilter(warehouseId) {
        if (!warehouseId) {
            document.getElementById('inv-loc-select').innerHTML = '<option value="">All Locations</option>';
            return;
        }
        try {
            const locs = await API.getLocations(warehouseId);
            const select = document.getElementById('inv-loc-select');
            select.innerHTML = '<option value="">All Locations</option>';
            locs.forEach(l => {
                const opt = document.createElement('option');
                opt.value = l.id;
                opt.textContent = `${l.name} (${l.code})`;
                if (l.id === this.balancesFilters.locationId) opt.selected = true;
                select.appendChild(opt);
            });
        } catch (e) {
            console.error('Failed to load locations:', e);
        }
    },

    async loadBalances(page = 1) {
        const tbody = document.getElementById('balances-table-body');
        try {
            const params = {
                ...this.balancesFilters,
                page,
                limit: 50
            };
            const res = await API.getBalances(params);

            if (!res.items || res.items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:2.5rem; color:var(--text-muted);">No stock balances found matching your criteria.</td></tr>`;
                this.renderPagination('balances-pagination', res.page, res.total, res.limit, (p) => this.loadBalances(p));
                return;
            }

            tbody.innerHTML = res.items.map(b => {
                const available = b.available_quantity;
                const minLevel = b.min_stock_level || 0;
                let statusBadge = '<span class="badge badge-done"><span class="badge-dot"></span> In Stock</span>';
                if (available <= 0) {
                    statusBadge = '<span class="badge badge-canceled"><span class="badge-dot"></span> Out of Stock</span>';
                } else if (available <= minLevel) {
                    statusBadge = '<span class="badge badge-picking"><span class="badge-dot"></span> Low Stock</span>';
                }

                return `
                    <tr>
                        <td>
                            <div style="font-weight:600; color:var(--text-primary);">${b.product_name}</div>
                        </td>
                        <td><span style="font-family:var(--font-mono); color:var(--primary-hover);">${b.product_sku}</span></td>
                        <td><span style="font-size:0.8rem; font-weight:600; color:var(--text-secondary);">${b.category_name}</span></td>
                        <td><strong style="color:var(--text-primary);">${b.warehouse_name}</strong></td>
                        <td>${b.location_name}</td>
                        <td><span class="badge badge-ready">${b.location_type}</span></td>
                        <td><strong style="font-size:1.05rem; color:${available <= 0 ? 'var(--danger)' : (available <= minLevel ? 'var(--warning)' : 'white')}">${b.quantity} ${b.uom_symbol}</strong></td>
                        <td style="color:var(--text-muted);">${b.reserved_quantity} ${b.uom_symbol}</td>
                        <td><strong style="color:var(--success); font-size:1.05rem;">${available} ${b.uom_symbol}</strong></td>
                        <td style="color:var(--text-muted);">${minLevel} ${b.uom_symbol}</td>
                        <td style="font-weight:600; color:var(--secondary);">$${(b.total_valuation || 0).toFixed(2)}</td>
                        <td>${statusBadge}</td>
                    </tr>
                `;
            }).join('');

            this.renderPagination('balances-pagination', res.page, res.total, res.limit, (p) => this.loadBalances(p));
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:2rem; color:var(--danger);">Error loading balances: ${err.message}</td></tr>`;
        }
    },

    async renderLedgerTab(container) {
        container.innerHTML = `
            <!-- Filters -->
            <div class="card" style="margin-bottom:1.25rem; padding:1rem;">
                <div class="filter-bar" style="margin:0; flex-wrap:wrap;">
                    <div class="search-input-wrapper" style="min-width:200px;">
                        <span class="search-icon-inside">${Icons.search}</span>
                        <input type="text" id="led-search-input" class="form-control" placeholder="Search product, SKU, reason, reference..." value="${this.ledgerFilters.search}">
                    </div>

                    <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
                        <select id="led-wh-select" class="form-control" style="width:160px;">
                            <option value="">All Warehouses</option>
                        </select>
                        <select id="led-type-select" class="form-control" style="width:160px;">
                            <option value="">All Movement Types</option>
                            <option value="RECEIPT">Receipt</option>
                            <option value="DELIVERY">Delivery</option>
                            <option value="INTERNAL_TRANSFER">Transfer</option>
                            <option value="ADJUSTMENT">Adjustment</option>
                            <option value="OPENING_BALANCE">Opening Balance</option>
                        </select>
                        <select id="led-ref-select" class="form-control" style="width:160px;">
                            <option value="">All Ref Types</option>
                            <option value="RECEIPT">Receipt</option>
                            <option value="DELIVERY">Delivery</option>
                            <option value="TRANSFER_OUT">Transfer Out</option>
                            <option value="TRANSFER_IN">Transfer In</option>
                            <option value="STOCK_ADJUSTMENT">Adjustment</option>
                            <option value="OPENING">Opening</option>
                        </select>
                        <button class="btn btn-secondary" id="led-btn-refresh">${Icons.refresh}</button>
                    </div>
                </div>
            </div>

            <!-- Ledger Table -->
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Product</th>
                            <th>Movement</th>
                            <th>Qty Change</th>
                            <th>Prev → New</th>
                            <th>Warehouse</th>
                            <th>Source → Destination</th>
                            <th>Reference</th>
                            <th>Reason</th>
                            <th>Actor</th>
                        </tr>
                    </thead>
                    <tbody id="ledger-table-body">
                        <tr><td colspan="10" style="text-align:center; padding:2rem;">Loading stock ledger...</td></tr>
                    </tbody>
                </table>
            </div>

            <div id="ledger-pagination" style="display:flex; justify-content:center; align-items:center; gap:1rem; margin-top:1rem; padding:1rem;"></div>
        `;

        await this.loadLedgerFilters();
        await this.loadLedger();

        let searchTimeout;
        document.getElementById('led-search-input').oninput = (e) => {
            clearTimeout(searchTimeout);
            this.ledgerFilters.search = e.target.value;
            searchTimeout = setTimeout(() => this.loadLedger(), 300);
        };

        document.getElementById('led-wh-select').onchange = (e) => {
            this.ledgerFilters.warehouseId = e.target.value;
            this.loadLedger();
        };

        document.getElementById('led-type-select').onchange = (e) => {
            this.ledgerFilters.movementType = e.target.value;
            this.loadLedger();
        };

        document.getElementById('led-ref-select').onchange = (e) => {
            this.ledgerFilters.referenceType = e.target.value;
            this.loadLedger();
        };

        document.getElementById('led-btn-refresh').onclick = () => this.loadLedger();
    },

    async loadLedgerFilters() {
        try {
            const warehouses = await API.getWarehouses();
            const select = document.getElementById('led-wh-select');
            warehouses.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.id;
                opt.textContent = w.name;
                if (w.id === this.ledgerFilters.warehouseId) opt.selected = true;
                select.appendChild(opt);
            });
        } catch (e) {
            console.error('Failed to load ledger filters:', e);
        }
    },

    async loadLedger(page = 1) {
        const tbody = document.getElementById('ledger-table-body');
        try {
            const params = {
                ...this.ledgerFilters,
                page,
                limit: 50
            };
            const res = await API.getLedger(params);

            if (!res.items || res.items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:2.5rem; color:var(--text-muted);">No ledger entries found.</td></tr>`;
                this.renderPagination('ledger-pagination', res.page, res.total, res.limit, (p) => this.loadLedger(p));
                return;
            }

            const typeMap = {
                RECEIPT: { label: 'RECEIPT', class: 'activity-badge-receipt' },
                DELIVERY: { label: 'DELIVERY', class: 'activity-badge-delivery' },
                INTERNAL_TRANSFER: { label: 'TRANSFER', class: 'activity-badge-transfer' },
                ADJUSTMENT: { label: 'ADJUSTMENT', class: 'activity-badge-adj' },
                OPENING_BALANCE: { label: 'OPENING', class: 'activity-badge-receipt' }
            };

            tbody.innerHTML = res.items.map(l => {
                const cfg = typeMap[l.movement_type] || { label: l.movement_type, class: 'activity-badge-receipt' };
                const qtyColor = l.quantity > 0 ? 'var(--success)' : 'var(--danger)';
                const qtySign = l.quantity > 0 ? '+' : '';
                return `
                    <tr>
                        <td style="font-size:0.75rem; white-space:nowrap;">${new Date(l.created_at).toLocaleDateString()} ${new Date(l.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</td>
                        <td>
                            <div style="font-weight:600; color:var(--text-primary);">${l.product_name}</div>
                            <div style="font-size:0.7rem; color:var(--text-muted); font-family:var(--font-mono);">${l.product_sku}</div>
                        </td>
                        <td><span class="badge badge-ready" style="background:var(--bg-surface-elevated);">${l.movement_type}</span></td>
                        <td><strong style="color:${qtyColor}; font-size:1rem;">${qtySign}${l.quantity} ${l.uom_symbol}</strong></td>
                        <td style="font-size:0.85rem; font-family:var(--font-mono);">${l.previous_quantity} → ${l.new_quantity}</td>
                        <td>${l.warehouse_name}</td>
                        <td style="font-size:0.75rem;">
                            ${l.source_location_name || '—'} ${l.source_location_name && l.destination_location_name ? '→' : ''} ${l.destination_location_name || '—'}
                        </td>
                        <td style="font-family:var(--font-mono); font-size:0.75rem;">${l.reference_type} #${l.reference_id?.slice(-8)}</td>
                        <td style="font-size:0.75rem; color:var(--text-secondary); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.reason || '-'}</td>
                        <td style="font-size:0.75rem;">${l.performed_by_name || 'System'}</td>
                    </tr>
                `;
            }).join('');

            this.renderPagination('ledger-pagination', res.page, res.total, res.limit, (p) => this.loadLedger(p));
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:2rem; color:var(--danger);">Error loading ledger: ${err.message}</td></tr>`;
        }
    },

    renderPagination(containerId, currentPage, totalItems, limit, onPageChange) {
        const container = document.getElementById(containerId);
        const totalPages = Math.ceil(totalItems / limit);
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = `<span style="font-size:0.8rem; color:var(--text-secondary);">Page ${currentPage} of ${totalPages} (${totalItems} items)</span>`;
        html += `<div style="display:flex; gap:0.25rem;">`;

        if (currentPage > 1) {
            html += `<button class="btn btn-secondary btn-sm" onclick="${onPageChange.name}(${currentPage - 1})">${Icons.check} Prev</button>`;
        }

        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        for (let p = startPage; p <= endPage; p++) {
            html += `<button class="btn ${p === currentPage ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="${onPageChange.name}(${p})">${p}</button>`;
        }

        if (currentPage < totalPages) {
            html += `<button class="btn btn-secondary btn-sm" onclick="${onPageChange.name}(${currentPage + 1})">Next ${Icons.check}</button>`;
        }

        html += `</div>`;
        container.innerHTML = html;
    }
};

window.InventoryView = InventoryView;