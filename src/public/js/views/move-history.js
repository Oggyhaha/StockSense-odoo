/**
 * Move History View (Immutable Stock Ledger / Audit Trail)
 */
const MoveHistoryView = {
    filters: {
        search: '',
        warehouseId: '',
        locationId: '',
        productId: '',
        movementType: '',
        referenceType: '',
        dateFrom: '',
        dateTo: ''
    },

    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <div>
                    <h1>Move History</h1>
                    <p>Immutable audit trail of all stock movements across the organization.</p>
                </div>
                <button class="btn btn-secondary" id="btn-export-history">
                    ${Icons.print} Export
                </button>
            </div>

            <!-- Filter Toolbar -->
            <div class="card" style="margin-bottom:1.25rem; padding:1rem;">
                <div class="filter-bar" style="margin:0; flex-wrap:wrap;">
                    <div class="search-input-wrapper" style="min-width: 240px; flex:1;">
                        <span class="search-icon-inside">${Icons.search}</span>
                        <input type="text id="mh-search-input" class="form-control" placeholder="Search by reference, product, SKU, reason..." value="${this.filters.search}">
                    </div>

                    <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
                        <select id="mh-wh-select" class="form-control" style="width:160px;">
                            <option value="">All Warehouses</option>
                        </select>
                        <select id="mh-type-select" class="form-control" style="width:160px;">
                            <option value="">All Types</option>
                            <option value="RECEIPT">Receipt</option>
                            <option value="DELIVERY">Delivery</option>
                            <option value="INTERNAL_TRANSFER">Transfer</option>
                            <option value="ADJUSTMENT">Adjustment</option>
                            <option value="OPENING_BALANCE">Opening Balance</option>
                        </select>
                        <select id="mh-ref-select" class="form-control" style="width:160px;">
                            <option value="">All References</option>
                            <option value="RECEIPT">Receipt</option>
                            <option value="DELIVERY">Delivery</option>
                            <option value="TRANSFER_OUT">Transfer Out</option>
                            <option value="TRANSFER_IN">Transfer In</option>
                            <option value="STOCK_ADJUSTMENT">Stock Adjustment</option>
                            <option value="OPENING">Opening Balance</option>
                        </select>
                        <input type="date" id="mh-date-from" class="form-control" style="width:150px;" value="${this.filters.dateFrom}">
                        <span style="color:var(--text-muted);">to</span>
                        <input type="date" id="mh-date-to" class="form-control" style="width:150px;" value="${this.filters.dateTo}">

                        <button class="btn btn-secondary" id="mh-btn-refresh">
                            ${Icons.refresh}
                        </button>
                        <button class="btn btn-primary" id="mh-btn-clear">
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            <!-- Ledger Table -->
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date & Time</th>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Type</th>
                            <th>Qty Change</th>
                            <th>Prev → New</th>
                            <th>Warehouse</th>
                            <th>From → To</th>
                            <th>Reference</th>
                            <th>Reason</th>
                            <th>User</th>
                        </tr>
                    </thead>
                    <tbody id="history-table-body">
                        <tr><td colspan="11" style="text-align:center; padding:2rem;">Loading move history...</td></tr>
                    </tbody>
                </table>
            </div>

            <div id="history-pagination" style="display:flex; justify-content:center; align-items:center; gap:1rem; margin-top:1rem; padding:1rem;"></div>
        `;

        await this.loadFilters();
        await this.loadHistory();

        let searchTimeout;
        document.getElementById('mh-search-input').oninput = (e) => {
            clearTimeout(searchTimeout);
            this.filters.search = e.target.value;
            searchTimeout = setTimeout(() => this.loadHistory(), 300);
        };

        document.getElementById('mh-wh-select').onchange = (e) => {
            this.filters.warehouseId = e.target.value;
            this.loadHistory();
        };

        document.getElementById('mh-type-select').onchange = (e) => {
            this.filters.movementType = e.target.value;
            this.loadHistory();
        };

        document.getElementById('mh-ref-select').onchange = (e) => {
            this.filters.referenceType = e.target.value;
            this.loadHistory();
        };

        document.getElementById('mh-date-from').onchange = (e) => {
            this.filters.dateFrom = e.target.value;
            this.loadHistory();
        };

        document.getElementById('mh-date-to').onchange = (e) => {
            this.filters.dateTo = e.target.value;
            this.loadHistory();
        };

        document.getElementById('mh-btn-refresh').onclick = () => this.loadHistory();
        document.getElementById('mh-btn-clear').onclick = () => this.clearFilters();
        document.getElementById('btn-export-history').onclick = () => this.exportHistory();
    },

    async loadFilters() {
        try {
            const warehouses = await API.getWarehouses();
            const select = document.getElementById('mh-wh-select');
            warehouses.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.id;
                opt.textContent = w.name;
                if (w.id === this.filters.warehouseId) opt.selected = true;
                select.appendChild(opt);
            });
        } catch (e) {
            console.error('Failed to load history filters:', e);
        }
    },

    clearFilters() {
        this.filters = {
            search: '',
            warehouseId: '',
            locationId: '',
            productId: '',
            movementType: '',
            referenceType: '',
            dateFrom: '',
            dateTo: ''
        };

        document.getElementById('mh-search-input').value = '';
        document.getElementById('mh-wh-select').value = '';
        document.getElementById('mh-type-select').value = '';
        document.getElementById('mh-ref-select').value = '';
        document.getElementById('mh-date-from').value = '';
        document.getElementById('mh-date-to').value = '';

        this.loadHistory();
    },

    async loadHistory(page = 1) {
        const tbody = document.getElementById('history-table-body');
        try {
            const params = {
                search: this.filters.search,
                warehouseId: this.filters.warehouseId,
                movementType: this.filters.movementType,
                referenceType: this.filters.referenceType,
                dateFrom: this.filters.dateFrom,
                dateTo: this.filters.dateTo,
                page,
                limit: 50
            };
            const res = await API.getLedger(params);

            if (!res.items || res.items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:2.5rem; color:var(--text-muted);">No move history records found.</td></tr>`;
                this.renderPagination('history-pagination', res.page, res.total, res.limit, (p) => this.loadHistory(p));
                return;
            }

            const typeMap = {
                RECEIPT: { label: 'RECEIPT', class: 'badge-ready' },
                DELIVERY: { label: 'DELIVERY', class: 'badge-danger' },
                INTERNAL_TRANSFER: { label: 'TRANSFER', class: 'badge-warning' },
                ADJUSTMENT: { label: 'ADJUSTMENT', class: 'badge-info' },
                OPENING_BALANCE: { label: 'OPENING', class: 'badge-ready' }
            };

            const refTypeMap = {
                RECEIPT: 'Receipt',
                DELIVERY: 'Delivery',
                TRANSFER_OUT: 'Transfer Out',
                TRANSFER_IN: 'Transfer In',
                STOCK_ADJUSTMENT: 'Adjustment',
                OPENING: 'Opening'
            };

            tbody.innerHTML = res.items.map(l => {
                const cfg = typeMap[l.movement_type] || { label: l.movement_type, class: 'badge-ready' };
                const qtyColor = l.quantity > 0 ? 'var(--success)' : 'var(--danger)';
                const qtySign = l.quantity > 0 ? '+' : '';
                const refLabel = refTypeMap[l.reference_type] || l.reference_type;

                return `
                    <tr>
                        <td data-label="Date" style="font-size:0.75rem; white-space:nowrap;">${new Date(l.created_at).toLocaleDateString()} ${new Date(l.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</td>
                        <td data-label="Product">
                            <div style="font-weight:600; color:var(--text-primary);">${l.product_name}</div>
                            <div style="font-size:0.7rem; color:var(--text-muted); font-family:var(--font-mono);">${l.product_sku}</div>
                        </td>
                        <td data-label="SKU"><span style="font-family:var(--font-mono); color:var(--primary);">${l.product_sku}</span></td>
                        <td data-label="Type"><span class="badge ${cfg.class}">${cfg.label}</span></td>
                        <td><strong style="color:${qtyColor}; font-size:1rem;">${qtySign}${l.quantity} ${l.uom_symbol}</strong></td>
                        <td style="font-size:0.85rem; font-family:var(--font-mono);">${l.previous_quantity} → ${l.new_quantity}</td>
                        <td>${l.warehouse_name}</td>
                        <td style="font-size:0.75rem;">
                            ${l.source_location_name || '—'} ${l.source_location_name && l.destination_location_name ? '→' : ''} ${l.destination_location_name || '—'}
                        </td>
                        <td style="font-family:var(--font-mono); font-size:0.75rem;">${refLabel} #${l.reference_id?.slice(-8)}</td>
                        <td style="font-size:0.75rem; color:var(--text-secondary); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.reason || '—'}</td>
                        <td style="font-size:0.75rem;">${l.performed_by_name || 'System'}</td>
                    </tr>
                `;
            }).join('');

            this.renderPagination('history-pagination', res.page, res.total, res.limit, (p) => this.loadHistory(p));
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:2rem; color:var(--danger);">Error loading history: ${err.message}</td></tr>`;
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

    exportHistory() {
        Toast.info('Export functionality coming soon');
    }
};

window.MoveHistoryView = MoveHistoryView;