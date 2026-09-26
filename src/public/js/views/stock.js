/**
 * Stock View (Inventory/Stock Management - On Hand & Free to Use)
 */
const StockView = {
    search: '',
    categoryId: '',
    status: '',
    warehouseId: '',

    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <div>
                    <h1>Stock</h1>
                    <p>View and manage inventory levels across all warehouses and locations.</p>
                </div>
                <button class="btn btn-primary" id="btn-adjust-stock">
                    ${Icons.plus} Adjust Stock
                </button>
            </div>

            <!-- Filter Toolbar -->
            <div class="card" style="margin-bottom:1.25rem; padding:1rem;">
                <div class="filter-bar" style="margin:0;">
                    <div class="search-input-wrapper" style="min-width: 200px;">
                        <span class="search-icon-inside">${Icons.search}</span>
                        <input type="text" id="stock-search-input" class="form-control" placeholder="Search by product, SKU, warehouse, location..." value="${this.search}">
                    </div>

                    <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
                        <select id="stock-wh-select" class="form-control" style="width:180px;">
                            <option value="">All Warehouses</option>
                        </select>
                        <select id="stock-loc-select" class="form-control" style="width:180px;">
                            <option value="">All Locations</option>
                        </select>
                        <select id="stock-cat-select" class="form-control" style="width:180px;">
                            <option value="">All Categories</option>
                        </select>
                        <select id="stock-status-select" class="form-control" style="width:160px;">
                            <option value="">All Status</option>
                            <option value="out_of_stock">⛔ Out of Stock</option>
                            <option value="low_stock">⚠️ Low Stock</option>
                            <option value="in_stock">✅ In Stock</option>
                        </select>

                        <button class="btn btn-secondary" id="stock-btn-refresh">
                            ${Icons.refresh}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Stock Table -->
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Category</th>
                            <th>Warehouse</th>
                            <th>Location</th>
                            <th>On Hand</th>
                            <th>Free to Use</th>
                            <th>Reserved</th>
                            <th>UoM</th>
                            <th>Status</th>
                            <th style="text-align:right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="stock-table-body">
                        <tr><td colspan="11" style="text-align:center; padding:2rem;">Loading stock...</td></tr>
                    </tbody>
                </table>
            </div>

            <div id="stock-pagination" style="display:flex; justify-content:center; align-items:center; gap:1rem; margin-top:1rem; padding:1rem;"></div>
        `;

        await this.loadFilters();
        await this.loadStock();

        let searchTimeout;
        document.getElementById('stock-search-input').oninput = (e) => {
            clearTimeout(searchTimeout);
            this.search = e.target.value;
            searchTimeout = setTimeout(() => this.loadStock(), 300);
        };

        document.getElementById('stock-wh-select').onchange = async (e) => {
            this.warehouseId = e.target.value;
            await this.loadLocationsFilter(e.target.value);
            this.loadStock();
        };

        document.getElementById('stock-loc-select').onchange = (e) => {
            this.locationId = e.target.value;
            this.loadStock();
        };

        document.getElementById('stock-cat-select').onchange = (e) => {
            this.categoryId = e.target.value;
            this.loadStock();
        };

        document.getElementById('stock-status-select').onchange = (e) => {
            this.status = e.target.value;
            this.loadStock();
        };

        document.getElementById('stock-btn-refresh').onclick = () => this.loadStock();
        document.getElementById('btn-adjust-stock').onclick = () => this.showAdjustStockModal();
    },

    async loadFilters() {
        try {
            const [warehouses, categories] = await Promise.all([
                API.getWarehouses(),
                API.getCategories()
            ]);

            const whSelect = document.getElementById('stock-wh-select');
            warehouses.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.id;
                opt.textContent = w.name;
                if (w.id === this.warehouseId) opt.selected = true;
                whSelect.appendChild(opt);
            });

            const catSelect = document.getElementById('stock-cat-select');
            categories.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name;
                if (c.id === this.categoryId) opt.selected = true;
                catSelect.appendChild(opt);
            });

            // Load locations for first warehouse if no filter
            if (warehouses.length > 0 && !this.warehouseId) {
                await this.loadLocationsFilter(warehouses[0].id);
            }
        } catch (e) {
            console.error('Failed to load stock filters:', e);
        }
    },

    async loadLocationsFilter(warehouseId) {
        if (!warehouseId) {
            document.getElementById('stock-loc-select').innerHTML = '<option value="">All Locations</option>';
            return;
        }
        try {
            const locs = await API.getLocations(warehouseId);
            const select = document.getElementById('stock-loc-select');
            select.innerHTML = '<option value="">All Locations</option>';
            locs.forEach(l => {
                const opt = document.createElement('option');
                opt.value = l.id;
                opt.textContent = `${l.name} (${l.code})`;
                if (l.id === this.locationId) opt.selected = true;
                select.appendChild(opt);
            });
        } catch (e) {
            console.error('Failed to load locations:', e);
        }
    },

    async loadStock(page = 1) {
        const tbody = document.getElementById('stock-table-body');
        try {
            const params = {
                search: this.search,
                warehouseId: this.warehouseId,
                locationId: this.locationId,
                categoryId: this.categoryId,
                status: this.status,
                page,
                limit: 50
            };
            const res = await API.getBalances(params);

            if (!res.items || res.items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:2.5rem; color:var(--text-muted);">No stock records found matching your criteria.</td></tr>`;
                this.renderPagination('stock-pagination', res.page, res.total, res.limit, (p) => this.loadStock(p));
                return;
            }

            tbody.innerHTML = res.items.map(b => {
                const available = b.available_quantity;
                const minLevel = b.min_stock_level || 0;
                let statusBadge = '<span class="badge badge-done"><span class="badge-dot"></span> In Stock</span>';
                let rowClass = '';
                if (available <= 0) {
                    statusBadge = '<span class="badge badge-canceled"><span class="badge-dot"></span> Out of Stock</span>';
                    rowClass = 'out-of-stock-row';
                } else if (available <= minLevel) {
                    statusBadge = '<span class="badge badge-waiting"><span class="badge-dot"></span> Low Stock</span>';
                }

                return `
                    <tr class="${rowClass}" style="cursor:pointer;" onclick="StockView.showProductDetail('${b.product_id}')">
                        <td data-label="Product">
                            <div style="font-weight:600; color:var(--text-primary);">${b.product_name}</div>
                        </td>
                        <td data-label="SKU"><span style="font-family:var(--font-mono); color:var(--primary);">${b.product_sku}</span></td>
                        <td data-label="Category">${b.category_name}</td>
                        <td data-label="Warehouse">${b.warehouse_name}</td>
                        <td data-label="Location">${b.location_name}</td>
                        <td data-label="On Hand"><strong style="font-size:1.05rem; color:${available <= 0 ? 'var(--danger)' : (available <= minLevel ? 'var(--warning)' : 'var(--text-primary)')};">${b.quantity} ${b.uom_symbol}</strong></td>
                        <td data-label="Free to Use"><strong style="color:var(--success);">${b.available_quantity} ${b.uom_symbol}</strong></td>
                        <td data-label="Reserved" style="color:var(--text-muted);">${b.reserved_quantity} ${b.uom_symbol}</td>
                        <td data-label="UoM"><span class="badge badge-draft" style="font-family:var(--font-mono);">${b.uom_symbol}</span></td>
                        <td data-label="Status">${statusBadge}</td>
                        <td data-label="Actions" style="text-align:right;" onclick="event.stopPropagation()">
                            <button class="btn btn-secondary btn-sm" onclick="StockView.showAdjustStockModal('${b.id}', '${b.product_id}', '${b.location_id}', ${b.quantity})">
                                ${Icons.plus} Adjust
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            this.renderPagination('stock-pagination', res.page, res.total, res.limit, (p) => this.loadStock(p));
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:2rem; color:var(--danger);">Error loading stock: ${err.message}</td></tr>`;
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
    },

    async showAdjustStockModal(balanceId = null, productId = null, locationId = null, currentQty = 0) {
        try {
            let product = null;
            let location = null;

            if (productId && locationId) {
                [product, location] = await Promise.all([
                    API.getProduct(productId),
                    // We need to get location details - use a simpler approach
                    null
                ]);
            }

            Modal.open({
                title: 'Adjust Stock',
                size: 'md',
                content: `
                    <form id="form-adjust-stock">
                        ${balanceId ? `<input type="hidden" id="adj-balance-id" value="${balanceId}">` : ''}
                        ${productId ? `<input type="hidden" id="adj-product-id" value="${productId}">` : ''}
                        ${locationId ? `<input type="hidden" id="adj-location-id" value="${locationId}">` : ''}

                        ${!productId ? `
                        <div class="form-group">
                            <label class="form-label">Product *</label>
                            <select id="adj-product" class="form-control" required>
                                <option value="">Select product...</option>
                            </select>
                        </div>
                        ` : `
                        <div class="form-group">
                            <label class="form-label">Product</label>
                            <input type="text" class="form-control" value="${product?.name || 'Loading...'}" readonly style="background:var(--bg-surface-hover);">
                        </div>
                        `}

                        ${!locationId ? `
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                            <div class="form-group">
                                <label class="form-label">Warehouse *</label>
                                <select id="adj-warehouse" class="form-control" required>
                                    <option value="">Select warehouse...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Location *</label>
                                <select id="adj-location" class="form-control" required>
                                    <option value="">Select location...</option>
                                </select>
                            </div>
                        </div>
                        ` : `
                        <input type="hidden" id="adj-warehouse" value="">
                        <input type="hidden" id="adj-location" value="">
                        `}

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                            <div class="form-group">
                                <label class="form-label">Current Quantity</label>
                                <input type="number" id="adj-current-qty" class="form-control" value="${currentQty}" readonly style="background:var(--bg-surface-hover);">
                            </div>
                            <div class="form-group">
                                <label class="form-label">New Quantity *</label>
                                <input type="number" step="0.01" id="adj-new-qty" class="form-control" value="${currentQty}" min="0" required>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Reason *</label>
                            <select id="adj-reason" class="form-control" required>
                                <option value="RECEIPT">Received from vendor</option>
                                <option value="ADJUSTMENT">Manual adjustment</option>
                                <option value="COUNTING_ERROR">Counting correction</option>
                                <option value="DAMAGED">Damaged goods</option>
                                <option value="LOST">Lost items</option>
                                <option value="FOUND">Found items</option>
                                <option value="OPENING_BALANCE">Opening balance</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Notes</label>
                            <textarea id="adj-notes" class="form-control" rows="2" placeholder="Additional notes..."></textarea>
                        </div>
                    </form>
                `,
                footer: `
                    <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    <button class="btn btn-primary" id="btn-save-adjust">Save Adjustment</button>
                `,
                onOpen: async () => {
                    const productSelect = document.getElementById('adj-product');
                    const warehouseSelect = document.getElementById('adj-warehouse');
                    const locationSelect = document.getElementById('adj-location');

                    // Load products if needed
                    if (productSelect) {
                        try {
                            const products = await API.getProducts({ limit: 200 });
                            productSelect.innerHTML = '<option value="">Select product...</option>' +
                                products.items.map(p => `<option value="${p.id}" data-uom="${p.uom_symbol}">${p.name} (${p.sku})</option>`).join('');
                        } catch (e) {
                            console.error('Failed to load products:', e);
                        }
                    }

                    // Load warehouses if needed
                    if (warehouseSelect) {
                        try {
                            const warehouses = await API.getWarehouses();
                            warehouseSelect.innerHTML = '<option value="">Select warehouse...</option>' +
                                warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
                        } catch (e) {
                            console.error('Failed to load warehouses:', e);
                        }
                    }

                    // Load locations when warehouse changes
                    if (warehouseSelect) {
                        const loadLocs = async (whId) => {
                            try {
                                const locs = await API.getLocations(whId);
                                locationSelect.innerHTML = locs.map(l => `<option value="${l.id}">${l.name} (${l.code})</option>`).join('');
                            } catch (e) {
                                console.error('Failed to load locations:', e);
                            }
                        };

                        if (warehouses.length > 0) {
                            await loadLocs(warehouses[0].id);
                        }
                        warehouseSelect.onchange = (e) => loadLocs(e.target.value);
                    }

                    document.getElementById('btn-save-adjust').onclick = async () => {
                        const balanceId = document.getElementById('adj-balance-id')?.value;
                        const productId = document.getElementById('adj-product')?.value || document.getElementById('adj-product-id')?.value;
                        const locationId = document.getElementById('adj-location')?.value || document.getElementById('adj-location-id')?.value;
                        const newQty = parseFloat(document.getElementById('adj-new-qty').value) || 0;
                        const reason = document.getElementById('adj-reason').value;
                        const notes = document.getElementById('adj-notes').value;

                        if (!productId || !locationId) return Toast.error('Please select product and location');
                        if (newQty < 0) return Toast.error('Quantity cannot be negative');

                        try {
                            // Create stock adjustment
                            const adjustment = await API.createAdjustment({
                                warehouse_id: document.getElementById('adj-warehouse')?.value || '',
                                location_id: locationId,
                                reason_category: reason,
                                detailed_reason: notes,
                                items: [{
                                    product_id: productId,
                                    counted_quantity: newQty
                                }]
                            });

                            // Auto-approve if small difference
                            if (adjustment.status === 'PENDING_APPROVAL') {
                                await API.approveAdjustment(adjustment.id);
                            }

                            Toast.success('Stock adjusted successfully');
                            Modal.close();
                            StockView.loadStock();
                        } catch (e) {
                            Toast.error(e.message);
                        }
                    };
                }
            });
        } catch (e) {
            Toast.error('Failed to open adjustment modal: ' + e.message);
        }
    },

    async showProductDetail(productId) {
        try {
            const p = await API.getProduct(productId);
            Modal.open({
                title: p.name,
                size: 'lg',
                content: `
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.25rem; flex-wrap:wrap; gap:1rem;">
                        <div>
                            <div style="font-size:0.8rem; color:var(--text-muted); font-family:var(--font-mono); display:flex; gap:0.75rem;">
                                <span>SKU: <strong style="color:var(--primary);">${p.sku}</strong></span>
                                <span>Barcode: <strong>${p.barcode || 'N/A'}</strong></span>
                                <span>Category: <strong>${p.category_name}</strong></span>
                            </div>
                            <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.4rem;">${p.description || 'No extended description provided.'}</p>
                        </div>
                        <div style="display:flex; gap:1rem;">
                            <div style="text-align:right;">
                                <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Total Stock</div>
                                <div style="font-size:1.5rem; font-weight:700; color:var(--text-primary);">${p.total_stock} <span style="font-size:0.85rem; color:var(--text-muted);">${p.uom_symbol}</span></div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Unit Cost</div>
                                <div style="font-size:1.5rem; font-weight:700; color:var(--primary);">$${p.unit_cost.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>

                    <h4 style="margin-bottom:0.75rem; font-size:0.95rem; border-bottom:1px solid var(--border-subtle); padding-bottom:0.5rem;">
                        Location-Wise Stock
                    </h4>

                    <div class="table-container" style="margin-bottom:1.5rem;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Warehouse</th>
                                    <th>Location</th>
                                    <th>Code</th>
                                    <th>Type</th>
                                    <th>On Hand</th>
                                    <th>Available</th>
                                    <th>Reserved</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${p.stockByLocation.length > 0 ? p.stockByLocation.map(loc => `
                                    <tr>
                                        <td><strong>${loc.warehouse_name}</strong></td>
                                        <td>${loc.location_name}</td>
                                        <td><span style="font-family:var(--font-mono);">${loc.location_code}</span></td>
                                        <td><span class="badge badge-ready">${loc.location_type}</span></td>
                                        <td><strong>${loc.quantity} ${p.uom_symbol}</strong></td>
                                        <td><strong style="color:var(--success);">${loc.quantity - loc.reserved_quantity} ${p.uom_symbol}</strong></td>
                                        <td style="color:var(--text-muted);">${loc.reserved_quantity} ${p.uom_symbol}</td>
                                    </tr>
                                `).join('') : `<tr><td colspan="7" style="text-align:center; padding:1rem; color:var(--text-muted);">No stock recorded in any location yet.</td></tr>`}
                            </tbody>
                        </table>
                    </div>

                    <h4 style="margin-bottom:0.75rem; font-size:0.95rem; border-bottom:1px solid var(--border-subtle); padding-bottom:0.5rem;">
                        Recent Stock Ledger
                    </h4>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Change</th>
                                    <th>Balance</th>
                                    <th>Reference</th>
                                    <th>From → To</th>
                                    <th>User</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${p.recentLedger.length > 0 ? p.recentLedger.map(l => `
                                    <tr>
                                        <td style="font-size:0.75rem;">${new Date(l.created_at).toLocaleDateString()} ${new Date(l.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</td>
                                        <td><span class="badge badge-ready">${l.movement_type}</span></td>
                                        <td><strong style="color:${l.quantity > 0 ? 'var(--success)' : 'var(--danger)'};">${l.quantity > 0 ? '+' + l.quantity : l.quantity} ${p.uom_symbol}</strong></td>
                                        <td>${l.new_quantity}</td>
                                        <td style="font-family:var(--font-mono); font-size:0.75rem;">${l.reference_type} #${l.reference_id?.slice(-8)}</td>
                                        <td style="font-size:0.75rem;">${l.source_location_name || '—'} → ${l.destination_location_name || '—'}</td>
                                        <td style="font-size:0.75rem;">${l.performed_by_name || 'System'}</td>
                                    </tr>
                                `).join('') : `<tr><td colspan="7" style="text-align:center; padding:1rem; color:var(--text-muted);">No ledger records for this item.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                `,
                footer: `<button class="btn btn-secondary" onclick="Modal.close()">Close</button>`
            });
        } catch (e) {
            Toast.error('Failed to load product details: ' + e.message);
        }
    }
};

window.StockView = StockView;