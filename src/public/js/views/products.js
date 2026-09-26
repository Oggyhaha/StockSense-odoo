/**
 * Products View (Catalog, Location-wise Stock Availability Matrix, New Product Wizard, Categories & UoMs)
 */
const ProductsView = {
    search: '',
    categoryId: '',
    status: '',

    async render(container) {
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <h1 style="font-size:1.6rem; font-weight:800; margin-bottom:0.25rem;">Products & Catalog</h1>
                    <p style="font-size:0.85rem; color:var(--text-secondary);">Manage items, SKU numbers, reorder rules, and stock levels across all locations.</p>
                </div>

                <div style="display:flex; gap:0.75rem; align-items:center;">
                    <button class="btn btn-secondary btn-sm" id="btn-manage-categories">Categories</button>
                    <button class="btn btn-secondary btn-sm" id="btn-manage-uom">Units of Measure</button>
                    <button class="btn btn-primary" id="btn-create-product">
                        ${Icons.plus} New Product
                    </button>
                </div>
            </div>

            <!-- Filter & Search Toolbar -->
            <div class="card" style="margin-bottom:1.25rem; padding:1rem;">
                <div class="filter-bar" style="margin:0;">
                    <div class="search-input-wrapper">
                        <span class="search-icon-inside">${Icons.search}</span>
                        <input type="text" id="prod-search-input" class="form-control" placeholder="Search by SKU, name, or barcode..." value="${this.search}">
                    </div>

                    <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
                        <select id="prod-cat-select" class="form-control" style="width:180px;">
                            <option value="">All Categories</option>
                        </select>

                        <select id="prod-status-select" class="form-control" style="width:160px;">
                            <option value="">All Stock Status</option>
                            <option value="low_stock">⚠️ Low Stock</option>
                            <option value="out_of_stock">⛔ Out of Stock</option>
                            <option value="active">Active Products</option>
                        </select>

                        <button class="btn btn-secondary" id="prod-btn-filter-refresh">
                            ${Icons.refresh}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Products Data Table -->
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Product Details</th>
                            <th>Category</th>
                            <th>UoM</th>
                            <th>Unit Cost</th>
                            <th>Min Level</th>
                            <th>Total Stock</th>
                            <th>Availability Status</th>
                            <th style="text-align:right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="products-table-body">
                        <tr><td colspan="8" style="text-align:center; padding:2rem;">Loading products catalog...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        await this.loadCategoriesFilter();
        await this.loadProducts();

        // Search listener with debounce
        let searchTimeout;
        document.getElementById('prod-search-input').oninput = (e) => {
            clearTimeout(searchTimeout);
            this.search = e.target.value;
            searchTimeout = setTimeout(() => this.loadProducts(), 300);
        };

        document.getElementById('prod-cat-select').onchange = (e) => {
            this.categoryId = e.target.value;
            this.loadProducts();
        };

        document.getElementById('prod-status-select').onchange = (e) => {
            this.status = e.target.value;
            this.loadProducts();
        };

        document.getElementById('prod-btn-filter-refresh').onclick = () => this.loadProducts();

        document.getElementById('btn-create-product').onclick = () => this.showCreateProductModal();
        document.getElementById('btn-manage-categories').onclick = () => this.showCategoriesModal();
        document.getElementById('btn-manage-uom').onclick = () => this.showUomModal();
    },

    async loadCategoriesFilter() {
        try {
            const categories = await API.getCategories();
            const select = document.getElementById('prod-cat-select');
            categories.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name;
                if (c.id === this.categoryId) opt.selected = true;
                select.appendChild(opt);
            });
        } catch (e) {
            console.error('Failed to load categories for filter:', e);
        }
    },

    async loadProducts() {
        const tbody = document.getElementById('products-table-body');
        try {
            const res = await API.getProducts({
                search: this.search,
                categoryId: this.categoryId,
                status: this.status,
                limit: 100
            });

            if (!res.items || res.items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2.5rem; color:var(--text-muted);">No products match your search criteria.</td></tr>`;
                return;
            }

            tbody.innerHTML = res.items.map(p => {
                let statusBadge = '<span class="badge badge-done"><span class="badge-dot"></span> In Stock</span>';
                if (p.current_stock <= 0) {
                    statusBadge = '<span class="badge badge-canceled"><span class="badge-dot"></span> Out of Stock</span>';
                } else if (p.current_stock <= p.min_stock_level) {
                    statusBadge = '<span class="badge badge-picking"><span class="badge-dot"></span> Low Stock</span>';
                }

                return `
                    <tr style="cursor:pointer;" onclick="ProductsView.showProductDetailModal('${p.id}')">
                        <td>
                            <div style="font-weight:700; color:var(--text-primary); font-size:0.9rem;">${p.name}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono); display:flex; gap:0.5rem;">
                                <span>SKU: <strong style="color:var(--primary-hover);">${p.sku}</strong></span>
                                ${p.barcode ? `<span>• Barcode: ${p.barcode}</span>` : ''}
                            </div>
                        </td>
                        <td><span style="font-size:0.8rem; font-weight:600; color:var(--text-secondary);">${p.category_name}</span></td>
                        <td><span class="badge badge-draft" style="font-family:var(--font-mono);">${p.uom_symbol}</span></td>
                        <td style="font-weight:600; color:var(--text-primary);">$${p.unit_cost.toFixed(2)}</td>
                        <td style="color:var(--text-muted);">${p.min_stock_level} ${p.uom_symbol}</td>
                        <td>
                            <strong style="font-size:1.05rem; color:${p.current_stock <= 0 ? 'var(--danger)' : (p.current_stock <= p.min_stock_level ? 'var(--warning)' : 'white')};">
                                ${p.current_stock}
                            </strong>
                            <span style="font-size:0.75rem; color:var(--text-muted);"> ${p.uom_symbol}</span>
                        </td>
                        <td>${statusBadge}</td>
                        <td style="text-align:right;" onclick="event.stopPropagation()">
                            <button class="btn btn-secondary btn-sm" onclick="ProductsView.showProductDetailModal('${p.id}')">
                                View Stock Matrix
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--danger);">Error loading products: ${err.message}</td></tr>`;
        }
    },

    async showProductDetailModal(productId) {
        try {
            const p = await API.getProduct(productId);
            Modal.open({
                title: `${p.name}`,
                size: 'lg',
                content: `
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.25rem; flex-wrap:wrap; gap:1rem;">
                        <div>
                            <div style="font-size:0.8rem; color:var(--text-muted); font-family:var(--font-mono); display:flex; gap:0.75rem;">
                                <span>SKU: <strong style="color:var(--primary-hover);">${p.sku}</strong></span>
                                <span>Barcode: <strong>${p.barcode || 'N/A'}</strong></span>
                                <span>Category: <strong>${p.category_name}</strong></span>
                            </div>
                            <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.4rem;">${p.description || 'No extended description provided.'}</p>
                        </div>
                        <div style="display:flex; gap:1rem;">
                            <div style="text-align:right;">
                                <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Total Stock</div>
                                <div style="font-size:1.6rem; font-weight:800; color:white;">${p.total_stock} <span style="font-size:0.85rem; color:var(--text-muted);">${p.uom_symbol}</span></div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Unit Cost</div>
                                <div style="font-size:1.6rem; font-weight:800; color:var(--primary-hover);">$${p.unit_cost.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>

                    <h4 style="margin-bottom:0.75rem; font-size:0.95rem; border-bottom:1px solid var(--border-subtle); padding-bottom:0.5rem;">
                        Location-Wise Stock Availability Matrix
                    </h4>

                    <div class="table-container" style="margin-bottom:1.5rem;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Warehouse</th>
                                    <th>Location Name</th>
                                    <th>Code</th>
                                    <th>Location Type</th>
                                    <th>Current Quantity</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${p.stockByLocation.length > 0 ? p.stockByLocation.map(loc => `
                                    <tr>
                                        <td><strong>${loc.warehouse_name}</strong></td>
                                        <td>${loc.location_name}</td>
                                        <td><span style="font-family:var(--font-mono);">${loc.location_code}</span></td>
                                        <td><span class="badge badge-ready">${loc.location_type}</span></td>
                                        <td><strong style="color:var(--success); font-size:1rem;">${loc.quantity} ${p.uom_symbol}</strong></td>
                                    </tr>
                                `).join('') : `<tr><td colspan="5" style="text-align:center; padding:1rem; color:var(--text-muted);">No stock recorded in any location yet.</td></tr>`}
                            </tbody>
                        </table>
                    </div>

                    <h4 style="margin-bottom:0.75rem; font-size:0.95rem; border-bottom:1px solid var(--border-subtle); padding-bottom:0.5rem;">
                        Recent Stock Ledger Audit Trail
                    </h4>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Movement Type</th>
                                    <th>Change</th>
                                    <th>Balance</th>
                                    <th>Warehouse / Locations</th>
                                    <th>Actor</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${p.recentLedger.length > 0 ? p.recentLedger.map(l => `
                                    <tr>
                                        <td style="font-size:0.75rem;">${new Date(l.created_at).toLocaleDateString()} ${new Date(l.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</td>
                                        <td><span class="badge badge-ready">${l.movement_type}</span></td>
                                        <td><strong style="color:${l.quantity > 0 ? 'var(--success)' : 'var(--danger)'};">${l.quantity > 0 ? '+' + l.quantity : l.quantity} ${p.uom_symbol}</strong></td>
                                        <td>${l.new_quantity}</td>
                                        <td style="font-size:0.75rem;">${l.warehouse_name} (${l.source_location_name || 'Inbound'} &rarr; ${l.destination_location_name || 'Outbound'})</td>
                                        <td style="font-size:0.75rem;">${l.performed_by_name || 'System'}</td>
                                    </tr>
                                `).join('') : `<tr><td colspan="6" style="text-align:center; padding:1rem; color:var(--text-muted);">No ledger records for this item.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                `,
                footer: `<button class="btn btn-secondary" onclick="Modal.close()">Close</button>`
            });
        } catch (e) {
            Toast.error('Failed to load product details: ' + e.message);
        }
    },

    async showCreateProductModal() {
        try {
            const [categories, uoms, warehouses] = await Promise.all([
                API.getCategories(),
                API.getUoms(),
                API.getWarehouses()
            ]);

            Modal.open({
                title: 'Create New Inventory Product',
                size: 'lg',
                content: `
                    <form id="form-create-prod">
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                            <div class="form-group">
                                <label class="form-label">Product Name *</label>
                                <input type="text" id="cp-name" class="form-control" placeholder="e.g. M12 Structural Hex Bolt" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">SKU / Code * (Unique)</label>
                                <input type="text" id="cp-sku" class="form-control" placeholder="e.g. CMP-BLT-M12" style="font-family:var(--font-mono);" required>
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:1rem;">
                            <div class="form-group">
                                <label class="form-label">Barcode / UPC</label>
                                <input type="text" id="cp-barcode" class="form-control" placeholder="Optional barcode">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Category *</label>
                                <select id="cp-category" class="form-control" required>
                                    ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Unit of Measure *</label>
                                <select id="cp-uom" class="form-control" required>
                                    ${uoms.map(u => `<option value="${u.id}">${u.name} (${u.symbol})</option>`).join('')}
                                </select>
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:1rem;">
                            <div class="form-group">
                                <label class="form-label">Unit Cost ($)</label>
                                <input type="number" step="0.01" id="cp-cost" class="form-control" placeholder="0.00" value="0.00">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Min Stock Level (Alert Threshold)</label>
                                <input type="number" id="cp-min" class="form-control" placeholder="10" value="10">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Reorder Quantity</label>
                                <input type="number" id="cp-reorder" class="form-control" placeholder="25" value="25">
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea id="cp-desc" class="form-control" rows="2" placeholder="Specifications, materials, notes..."></textarea>
                        </div>

                        <!-- Optional Initial Opening Stock -->
                        <div style="padding:1rem; background:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-md); margin-top:0.5rem;">
                            <div style="font-weight:700; font-size:0.85rem; margin-bottom:0.5rem; color:var(--text-primary);">
                                Initial Opening Stock (Optional)
                            </div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:0.75rem;">
                                <div>
                                    <label class="form-label" style="font-size:0.75rem;">Initial Quantity</label>
                                    <input type="number" id="cp-init-qty" class="form-control" placeholder="0" value="0">
                                </div>
                                <div>
                                    <label class="form-label" style="font-size:0.75rem;">Warehouse</label>
                                    <select id="cp-init-wh" class="form-control">
                                        ${warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="form-label" style="font-size:0.75rem;">Location</label>
                                    <select id="cp-init-loc" class="form-control">
                                        <!-- Loaded dynamically -->
                                    </select>
                                </div>
                            </div>
                        </div>
                    </form>
                `,
                footer: `
                    <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    <button class="btn btn-primary" id="btn-save-new-prod">Create Product</button>
                `,
                onOpen: async () => {
                    const whSelect = document.getElementById('cp-init-wh');
                    const locSelect = document.getElementById('cp-init-loc');

                    const loadLocs = async (whId) => {
                        locSelect.innerHTML = '<option>Loading...</option>';
                        const locs = await API.getLocations(whId);
                        locSelect.innerHTML = locs.map(l => `<option value="${l.id}">${l.name} (${l.code})</option>`).join('');
                    };

                    if (warehouses.length > 0) {
                        await loadLocs(warehouses[0].id);
                    }

                    whSelect.onchange = (e) => loadLocs(e.target.value);

                    document.getElementById('btn-save-new-prod').onclick = async () => {
                        const name = document.getElementById('cp-name').value;
                        const sku = document.getElementById('cp-sku').value;
                        const barcode = document.getElementById('cp-barcode').value;
                        const category_id = document.getElementById('cp-category').value;
                        const uom_id = document.getElementById('cp-uom').value;
                        const unit_cost = parseFloat(document.getElementById('cp-cost').value) || 0;
                        const min_stock_level = parseFloat(document.getElementById('cp-min').value) || 0;
                        const reorder_quantity = parseFloat(document.getElementById('cp-reorder').value) || 0;
                        const description = document.getElementById('cp-desc').value;
                        const initial_stock = parseFloat(document.getElementById('cp-init-qty').value) || 0;
                        const initial_warehouse_id = whSelect.value;
                        const initial_location_id = locSelect.value;

                        if (!name || !sku) return Toast.error('Product name and SKU are required');

                        try {
                            await API.createProduct({
                                name, sku, barcode, category_id, uom_id,
                                unit_cost, min_stock_level, reorder_quantity, description,
                                initial_stock, initial_warehouse_id, initial_location_id
                            });

                            Toast.success(`Product ${name} created successfully!`);
                            Modal.close();
                            ProductsView.loadProducts();
                        } catch (err) {
                            Toast.error(err.message);
                        }
                    };
                }
            });
        } catch (e) {
            Toast.error('Failed to prepare product creation form: ' + e.message);
        }
    },

    async showCategoriesModal() {
        try {
            const categories = await API.getCategories();
            Modal.open({
                title: 'Product Categories',
                content: `
                    <div style="display:flex; gap:0.5rem; margin-bottom:1.25rem;">
                        <input type="text" id="new-cat-name" class="form-control" placeholder="New Category Name..." style="flex:1;">
                        <input type="text" id="new-cat-desc" class="form-control" placeholder="Description..." style="flex:1.2;">
                        <button class="btn btn-primary" id="btn-add-cat">Add Category</button>
                    </div>

                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Category Name</th>
                                    <th>Description</th>
                                    <th>Product Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${categories.map(c => `
                                    <tr>
                                        <td><strong>${c.name}</strong></td>
                                        <td>${c.description || '-'}</td>
                                        <td><span class="badge badge-ready">${c.product_count || 0} Products</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `,
                footer: `<button class="btn btn-secondary" onclick="Modal.close()">Close</button>`,
                onOpen: () => {
                    document.getElementById('btn-add-cat').onclick = async () => {
                        const name = document.getElementById('new-cat-name').value;
                        const description = document.getElementById('new-cat-desc').value;
                        if (!name) return Toast.error('Category name is required');

                        try {
                            await API.createCategory({ name, description });
                            Toast.success(`Category '${name}' created`);
                            Modal.close();
                            ProductsView.showCategoriesModal();
                        } catch (e) {
                            Toast.error(e.message);
                        }
                    };
                }
            });
        } catch (e) {
            Toast.error(e.message);
        }
    },

    async showUomModal() {
        try {
            const uoms = await API.getUoms();
            Modal.open({
                title: 'Units of Measure (UoM)',
                content: `
                    <div style="display:flex; gap:0.5rem; margin-bottom:1.25rem;">
                        <input type="text" id="new-uom-name" class="form-control" placeholder="Unit Name (e.g. Liter)" style="flex:1;">
                        <input type="text" id="new-uom-symbol" class="form-control" placeholder="Symbol (e.g. L)" style="width:120px;">
                        <button class="btn btn-primary" id="btn-add-uom">Add UoM</button>
                    </div>

                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Symbol</th>
                                    <th>Default</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${uoms.map(u => `
                                    <tr>
                                        <td><strong>${u.name}</strong></td>
                                        <td><span class="badge badge-draft" style="font-family:var(--font-mono);">${u.symbol}</span></td>
                                        <td>${u.is_default ? '<span class="badge badge-done">Default</span>' : '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `,
                footer: `<button class="btn btn-secondary" onclick="Modal.close()">Close</button>`,
                onOpen: () => {
                    document.getElementById('btn-add-uom').onclick = async () => {
                        const name = document.getElementById('new-uom-name').value;
                        const symbol = document.getElementById('new-uom-symbol').value;
                        if (!name || !symbol) return Toast.error('Name and symbol are required');

                        try {
                            await API.createUom({ name, symbol });
                            Toast.success(`Unit of measure '${name}' created`);
                            Modal.close();
                            ProductsView.showUomModal();
                        } catch (e) {
                            Toast.error(e.message);
                        }
                    };
                }
            });
        } catch (e) {
            Toast.error(e.message);
        }
    }
};

window.ProductsView = ProductsView;
