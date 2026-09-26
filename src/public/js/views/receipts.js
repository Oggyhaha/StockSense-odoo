/**
 * Receipts View (Incoming Stock from Vendors, Validation Workflow, and Atomic Stock Increases)
 */
const ReceiptsView = {
    status: '',
    warehouseId: '',
    search: '',

    async render(container) {
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <h1 style="font-size:1.6rem; font-weight:800; margin-bottom:0.25rem;">Incoming Receipts</h1>
                    <p style="font-size:0.85rem; color:var(--text-secondary);">Manage vendor shipments, receive quantities into warehouse locations, and validate into stock.</p>
                </div>

                <button class="btn btn-primary" id="btn-create-receipt">
                    ${Icons.plus} New Receipt
                </button>
            </div>

            <!-- Filter Toolbar -->
            <div class="card" style="margin-bottom:1.25rem; padding:1rem;">
                <div class="filter-bar" style="margin:0;">
                    <div class="search-input-wrapper">
                        <span class="search-icon-inside">${Icons.search}</span>
                        <input type="text" id="rec-search-input" class="form-control" placeholder="Search by receipt #, supplier, or PO..." value="${this.search}">
                    </div>

                    <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
                        <select id="rec-wh-select" class="form-control" style="width:180px;">
                            <option value="">All Warehouses</option>
                        </select>

                        <select id="rec-status-select" class="form-control" style="width:160px;">
                            <option value="">All Statuses</option>
                            <option value="DRAFT">Draft</option>
                            <option value="WAITING">Waiting</option>
                            <option value="READY">Ready</option>
                            <option value="DONE">Done (Validated)</option>
                            <option value="CANCELED">Canceled</option>
                        </select>

                        <button class="btn btn-secondary" id="rec-btn-refresh">
                            ${Icons.refresh}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Receipts Table -->
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Receipt Number</th>
                            <th>Supplier / Vendor</th>
                            <th>Destination Warehouse & Bay</th>
                            <th>Status</th>
                            <th>Total Units</th>
                            <th>Received Date</th>
                            <th style="text-align:right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="receipts-table-body">
                        <tr><td colspan="7" style="text-align:center; padding:2rem;">Loading receipts...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        await this.loadWarehousesFilter();
        await this.loadReceipts();

        let searchTimeout;
        document.getElementById('rec-search-input').oninput = (e) => {
            clearTimeout(searchTimeout);
            this.search = e.target.value;
            searchTimeout = setTimeout(() => this.loadReceipts(), 300);
        };

        document.getElementById('rec-wh-select').onchange = (e) => {
            this.warehouseId = e.target.value;
            this.loadReceipts();
        };

        document.getElementById('rec-status-select').onchange = (e) => {
            this.status = e.target.value;
            this.loadReceipts();
        };

        document.getElementById('rec-btn-refresh').onclick = () => this.loadReceipts();
        document.getElementById('btn-create-receipt').onclick = () => this.showCreateReceiptModal();
    },

    async loadWarehousesFilter() {
        try {
            const warehouses = await API.getWarehouses();
            const select = document.getElementById('rec-wh-select');
            warehouses.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.id;
                opt.textContent = w.name;
                if (w.id === this.warehouseId) opt.selected = true;
                select.appendChild(opt);
            });
        } catch (e) {
            console.error('Failed to load warehouses for receipt filter:', e);
        }
    },

    async loadReceipts() {
        const tbody = document.getElementById('receipts-table-body');
        try {
            const res = await API.getReceipts({
                search: this.search,
                warehouseId: this.warehouseId,
                status: this.status,
                limit: 100
            });

            if (!res.items || res.items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2.5rem; color:var(--text-muted);">No receipts found matching your criteria.</td></tr>`;
                return;
            }

            tbody.innerHTML = res.items.map(r => {
                const badgeClass = `badge-${r.status.toLowerCase()}`;
                return `
                    <tr style="cursor:pointer;" onclick="ReceiptsView.showReceiptDetailModal('${r.id}')">
                        <td>
                            <strong style="color:var(--primary-hover); font-family:var(--font-mono); font-size:0.95rem;">${r.receipt_number}</strong>
                            ${r.reference_number ? `<div style="font-size:0.7rem; color:var(--text-muted);">Ref: ${r.reference_number}</div>` : ''}
                        </td>
                        <td>
                            <div style="font-weight:600; color:var(--text-primary);">${r.supplier_name || 'Generic Vendor'}</div>
                            <div style="font-size:0.7rem; color:var(--text-muted);">${r.item_count} line item(s)</div>
                        </td>
                        <td>
                            <div style="font-weight:600; color:var(--text-primary);">${r.warehouse_name}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">${r.location_name}</div>
                        </td>
                        <td>
                            <span class="badge ${badgeClass}"><span class="badge-dot"></span> ${r.status}</span>
                        </td>
                        <td>
                            <strong style="font-size:1rem; color:white;">+${r.total_quantity}</strong>
                        </td>
                        <td style="font-size:0.8rem; color:var(--text-muted);">
                            ${r.received_date ? new Date(r.received_date).toLocaleDateString() : (r.expected_date ? 'Exp: ' + new Date(r.expected_date).toLocaleDateString() : '-')}
                        </td>
                        <td style="text-align:right;" onclick="event.stopPropagation()">
                            <button class="btn btn-secondary btn-sm" onclick="ReceiptsView.showReceiptDetailModal('${r.id}')">
                                View / Process
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--danger);">Error loading receipts: ${err.message}</td></tr>`;
        }
    },

    async showReceiptDetailModal(receiptId) {
        try {
            const r = await API.getReceipt(receiptId);
            const isDone = r.status === 'DONE';
            const isCanceled = r.status === 'CANCELED';

            Modal.open({
                title: `Receipt Details: ${r.receipt_number}`,
                size: 'lg',
                content: `
                    <!-- Stepper Bar -->
                    <div class="workflow-stepper">
                        <div class="step-item ${['DRAFT', 'WAITING', 'READY', 'DONE'].includes(r.status) ? 'active' : ''} ${isDone ? 'completed' : ''}">
                            <div class="step-circle">1</div>
                            <span>Draft</span>
                        </div>
                        <div style="flex:1; height:2px; background:var(--border-subtle); margin:0 0.5rem;"></div>
                        <div class="step-item ${['WAITING', 'READY', 'DONE'].includes(r.status) ? 'active' : ''} ${isDone ? 'completed' : ''}">
                            <div class="step-circle">2</div>
                            <span>Awaiting Delivery</span>
                        </div>
                        <div style="flex:1; height:2px; background:var(--border-subtle); margin:0 0.5rem;"></div>
                        <div class="step-item ${['READY', 'DONE'].includes(r.status) ? 'active' : ''} ${isDone ? 'completed' : ''}">
                            <div class="step-circle">3</div>
                            <span>Ready to Shelve</span>
                        </div>
                        <div style="flex:1; height:2px; background:var(--border-subtle); margin:0 0.5rem;"></div>
                        <div class="step-item ${isDone ? 'completed' : ''}">
                            <div class="step-circle">4</div>
                            <span>Validated (Done)</span>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:1rem; padding:1rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); margin-bottom:1.5rem;">
                        <div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Supplier / Vendor</div>
                            <div style="font-weight:700; color:white; font-size:0.95rem;">${r.supplier_name}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">Ref: ${r.reference_number || 'N/A'}</div>
                        </div>
                        <div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Receiving Bay</div>
                            <div style="font-weight:700; color:white; font-size:0.95rem;">${r.warehouse_name}</div>
                            <div style="font-size:0.75rem; color:var(--primary-hover);">${r.location_name} (${r.location_code})</div>
                        </div>
                        <div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Status & Date</div>
                            <div><span class="badge badge-${r.status.toLowerCase()}">${r.status}</span></div>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">Created: ${new Date(r.created_at).toLocaleDateString()}</div>
                        </div>
                    </div>

                    ${r.notes ? `<div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:1rem; font-style:italic;">"${r.notes}"</div>` : ''}

                    <h4 style="margin-bottom:0.75rem; font-size:0.95rem;">Received Items</h4>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Product Name</th>
                                    <th>SKU</th>
                                    <th>Expected Qty</th>
                                    <th>Received Qty</th>
                                    <th>Location Stock (Current)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${r.items.map(item => `
                                    <tr>
                                        <td><strong>${item.product_name}</strong></td>
                                        <td><span style="font-family:var(--font-mono); color:var(--primary-hover);">${item.product_sku}</span></td>
                                        <td>${item.expected_quantity} ${item.uom_symbol}</td>
                                        <td><strong style="color:var(--success); font-size:1.05rem;">+${item.received_quantity} ${item.uom_symbol}</strong></td>
                                        <td>${item.current_location_stock} ${item.uom_symbol}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    ${isDone ? `
                        <div style="padding:0.85rem; background:var(--success-light); border:1px solid var(--success-border); border-radius:var(--radius-md); margin-top:1.25rem; display:flex; align-items:center; gap:0.75rem;">
                            <div style="color:var(--success);">${Icons.check}</div>
                            <div style="font-size:0.85rem; color:white;">
                                <strong>Receipt Validated into Stock:</strong> All received items have been deposited at <em>${r.location_name}</em> and recorded in the immutable stock ledger.
                            </div>
                        </div>
                    ` : ''}
                `,
                footer: `
                    <button class="btn btn-secondary" onclick="Modal.close()">Close</button>
                    ${!isDone && !isCanceled ? `
                        <button class="btn btn-danger" id="btn-cancel-rec">Cancel Receipt</button>
                        ${r.status === 'DRAFT' ? `<button class="btn btn-secondary" id="btn-ready-rec">Mark as Ready</button>` : ''}
                        <button class="btn btn-success" id="btn-validate-rec">
                            ${Icons.check} Validate Receipt (Stock +)
                        </button>
                    ` : ''}
                `,
                onOpen: () => {
                    const btnValidate = document.getElementById('btn-validate-rec');
                    if (btnValidate) {
                        btnValidate.onclick = async () => {
                            if (!confirm(`Validate receipt ${r.receipt_number}? This will immediately increase stock at ${r.location_name} and write immutable ledger entries.`)) return;

                            try {
                                btnValidate.disabled = true;
                                btnValidate.innerHTML = 'Validating Stock...';
                                await API.validateReceipt(r.id);
                                Toast.success(`Receipt ${r.receipt_number} validated! Stock updated.`);
                                Modal.close();
                                ReceiptsView.loadReceipts();
                            } catch (err) {
                                Toast.error(err.message);
                                btnValidate.disabled = false;
                                btnValidate.innerHTML = 'Validate Receipt (Stock +)';
                            }
                        };
                    }

                    const btnReady = document.getElementById('btn-ready-rec');
                    if (btnReady) {
                        btnReady.onclick = async () => {
                            try {
                                await API.updateReceiptStatus(r.id, 'READY');
                                Toast.success(`Receipt ${r.receipt_number} marked as READY`);
                                Modal.close();
                                ReceiptsView.showReceiptDetailModal(r.id);
                            } catch (err) {
                                Toast.error(err.message);
                            }
                        };
                    }

                    const btnCancel = document.getElementById('btn-cancel-rec');
                    if (btnCancel) {
                        btnCancel.onclick = async () => {
                            if (!confirm(`Are you sure you want to cancel receipt ${r.receipt_number}?`)) return;
                            try {
                                await API.cancelReceipt(r.id);
                                Toast.warning(`Receipt ${r.receipt_number} canceled`);
                                Modal.close();
                                ReceiptsView.loadReceipts();
                            } catch (err) {
                                Toast.error(err.message);
                            }
                        };
                    }
                }
            });
        } catch (e) {
            Toast.error('Failed to load receipt details: ' + e.message);
        }
    },

    async showCreateReceiptModal() {
        try {
            const [warehouses, products] = await Promise.all([
                API.getWarehouses(),
                API.getProducts({ limit: 200 })
            ]);

            Modal.open({
                title: 'Create Incoming Receipt Document',
                size: 'lg',
                content: `
                    <form id="form-create-receipt">
                        <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:1rem;">
                            <div class="form-group">
                                <label class="form-label">Supplier / Vendor Name *</label>
                                <input type="text" id="cr-supplier" class="form-control" placeholder="e.g. Apex Industrial Supplies Ltd." required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">PO / Reference #</label>
                                <input type="text" id="cr-ref" class="form-control" placeholder="e.g. PO-98120">
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:1rem;">
                            <div class="form-group">
                                <label class="form-label">Destination Warehouse *</label>
                                <select id="cr-wh" class="form-control" required>
                                    ${warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Receiving Bay / Location *</label>
                                <select id="cr-loc" class="form-control" required>
                                    <!-- Loaded dynamically -->
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Expected Date</label>
                                <input type="date" id="cr-date" class="form-control">
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Shipment Notes / Carrier Info</label>
                            <input type="text" id="cr-notes" class="form-control" placeholder="e.g. Truck 42, pallets intact">
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:center; margin:1rem 0 0.5rem 0;">
                            <h4 style="font-size:0.95rem; margin:0;">Receipt Line Items</h4>
                            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-receipt-item">
                                ${Icons.plus} Add Product
                            </button>
                        </div>

                        <div class="table-container" style="margin-bottom:1rem;">
                            <table class="data-table line-items-table">
                                <thead>
                                    <tr>
                                        <th style="width:50%;">Product</th>
                                        <th>Received Quantity</th>
                                        <th>Notes</th>
                                        <th style="width:40px;"></th>
                                    </tr>
                                </thead>
                                <tbody id="receipt-items-tbody">
                                    <!-- Dynamic Rows -->
                                </tbody>
                            </table>
                        </div>
                    </form>
                `,
                footer: `
                    <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    <button class="btn btn-primary" id="btn-submit-receipt">Save Draft Receipt</button>
                `,
                onOpen: async () => {
                    const whSelect = document.getElementById('cr-wh');
                    const locSelect = document.getElementById('cr-loc');
                    const tbody = document.getElementById('receipt-items-tbody');

                    const loadLocs = async (whId) => {
                        const locs = await API.getLocations(whId);
                        locSelect.innerHTML = locs.map(l => `<option value="${l.id}">${l.name} (${l.code})</option>`).join('');
                    };

                    if (warehouses.length > 0) {
                        await loadLocs(warehouses[0].id);
                    }
                    whSelect.onchange = (e) => loadLocs(e.target.value);

                    const addRow = () => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>
                                <select class="form-control item-product" required>
                                    ${products.items.map(p => `<option value="${p.id}">${p.name} (${p.sku})</option>`).join('')}
                                </select>
                            </td>
                            <td>
                                <input type="number" step="0.01" class="form-control item-qty" value="10" min="0.01" required>
                            </td>
                            <td>
                                <input type="text" class="form-control item-note" placeholder="Optional note">
                            </td>
                            <td style="text-align:center;">
                                <button type="button" class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="this.closest('tr').remove()">&times;</button>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    };

                    addRow(); // Default first item
                    document.getElementById('btn-add-receipt-item').onclick = addRow;

                    document.getElementById('btn-submit-receipt').onclick = async () => {
                        const supplier_name = document.getElementById('cr-supplier').value;
                        const reference_number = document.getElementById('cr-ref').value;
                        const warehouse_id = whSelect.value;
                        const receiving_location_id = locSelect.value;
                        const expected_date = document.getElementById('cr-date').value;
                        const notes = document.getElementById('cr-notes').value;

                        if (!supplier_name) return Toast.error('Please specify the supplier');

                        const rows = tbody.querySelectorAll('tr');
                        const items = [];
                        rows.forEach(r => {
                            const pId = r.querySelector('.item-product').value;
                            const qty = parseFloat(r.querySelector('.item-qty').value) || 0;
                            const n = r.querySelector('.item-note').value;
                            if (pId && qty > 0) {
                                items.push({ product_id: pId, received_quantity: qty, notes: n });
                            }
                        });

                        if (items.length === 0) return Toast.error('Please add at least one line item with quantity > 0');

                        try {
                            const res = await API.createReceipt({
                                supplier_name, reference_number, warehouse_id,
                                receiving_location_id, expected_date, notes, items
                            });

                            Toast.success(`Receipt ${res.receipt_number} created successfully!`);
                            Modal.close();
                            ReceiptsView.loadReceipts();
                        } catch (e) {
                            Toast.error(e.message);
                        }
                    };
                }
            });
        } catch (e) {
            Toast.error('Failed to prepare receipt creation modal: ' + e.message);
        }
    }
};

window.ReceiptsView = ReceiptsView;
