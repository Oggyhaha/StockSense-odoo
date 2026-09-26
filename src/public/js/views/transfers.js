/**
 * Internal Transfers View (Relocate Stock Between Warehouses & Locations)
 */
const TransfersView = {
    status: '',
    warehouseId: '',
    search: '',

    async render(container) {
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <h1 style="font-size:1.6rem; font-weight:800; margin-bottom:0.25rem;">Internal Transfers</h1>
                    <p style="font-size:0.85rem; color:var(--text-secondary);">Move stock between warehouses, racks, and production zones. Every movement is logged in the stock ledger.</p>
                </div>
                <button class="btn btn-primary" id="btn-create-transfer">
                    ${Icons.plus} New Transfer
                </button>
            </div>

            <div class="card" style="margin-bottom:1.25rem; padding:1rem;">
                <div class="filter-bar" style="margin:0;">
                    <div class="search-input-wrapper">
                        <span class="search-icon-inside">${Icons.search}</span>
                        <input type="text" id="trf-search-input" class="form-control" placeholder="Search by transfer # or reason..." value="${this.search}">
                    </div>
                    <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
                        <select id="trf-wh-select" class="form-control" style="width:180px;">
                            <option value="">All Warehouses</option>
                        </select>
                        <select id="trf-status-select" class="form-control" style="width:160px;">
                            <option value="">All Statuses</option>
                            <option value="DRAFT">Draft</option>
                            <option value="IN_TRANSIT">In-Transit</option>
                            <option value="DONE">Completed</option>
                            <option value="CANCELED">Canceled</option>
                        </select>
                        <button class="btn btn-secondary" id="trf-btn-refresh">${Icons.refresh}</button>
                    </div>
                </div>
            </div>

            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Transfer Number</th>
                            <th>Source</th>
                            <th>Destination</th>
                            <th>Status</th>
                            <th>Items / Units</th>
                            <th>Reason</th>
                            <th style="text-align:right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="transfers-table-body">
                        <tr><td colspan="7" style="text-align:center; padding:2rem;">Loading transfers...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        await this.loadWarehousesFilter();
        await this.loadTransfers();

        let searchTimeout;
        document.getElementById('trf-search-input').oninput = (e) => {
            clearTimeout(searchTimeout);
            this.search = e.target.value;
            searchTimeout = setTimeout(() => this.loadTransfers(), 300);
        };
        document.getElementById('trf-wh-select').onchange = (e) => { this.warehouseId = e.target.value; this.loadTransfers(); };
        document.getElementById('trf-status-select').onchange = (e) => { this.status = e.target.value; this.loadTransfers(); };
        document.getElementById('trf-btn-refresh').onclick = () => this.loadTransfers();
        document.getElementById('btn-create-transfer').onclick = () => this.showCreateTransferModal();
    },

    async loadWarehousesFilter() {
        try {
            const warehouses = await API.getWarehouses();
            const select = document.getElementById('trf-wh-select');
            warehouses.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.id;
                opt.textContent = w.name;
                select.appendChild(opt);
            });
        } catch (e) { /* silently fail filter */ }
    },

    async loadTransfers() {
        const tbody = document.getElementById('transfers-table-body');
        try {
            const res = await API.getTransfers({ search: this.search, warehouseId: this.warehouseId, status: this.status, limit: 100 });

            if (!res.items || res.items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2.5rem; color:var(--text-muted);">No internal transfers found.</td></tr>`;
                return;
            }

            tbody.innerHTML = res.items.map(t => {
                const badgeClass = `badge-${t.status.toLowerCase().replace('_', '-')}`;
                return `
                    <tr style="cursor:pointer;" onclick="TransfersView.showTransferDetailModal('${t.id}')">
                        <td><strong style="color:var(--primary-hover); font-family:var(--font-mono);">${t.transfer_number}</strong></td>
                        <td>
                            <div style="font-weight:600; color:var(--text-primary);">${t.source_warehouse_name}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">${t.source_location_name}</div>
                        </td>
                        <td>
                            <div style="font-weight:600; color:var(--text-primary);">${t.destination_warehouse_name}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">${t.destination_location_name}</div>
                        </td>
                        <td><span class="badge ${badgeClass}"><span class="badge-dot"></span> ${t.status}</span></td>
                        <td>
                            <strong style="color:white;">${t.item_count}</strong> items
                            <span style="font-size:0.75rem; color:var(--text-muted);"> / ${t.total_quantity} units</span>
                        </td>
                        <td style="font-size:0.8rem; color:var(--text-secondary); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                            ${t.reason || '-'}
                        </td>
                        <td style="text-align:right;" onclick="event.stopPropagation()">
                            <button class="btn btn-secondary btn-sm" onclick="TransfersView.showTransferDetailModal('${t.id}')">View / Process</button>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--danger);">Error: ${err.message}</td></tr>`;
        }
    },

    async showTransferDetailModal(transferId) {
        try {
            const t = await API.getTransfer(transferId);
            const isDone = t.status === 'DONE';
            const isCanceled = t.status === 'CANCELED';

            Modal.open({
                title: `Transfer: ${t.transfer_number}`,
                size: 'lg',
                content: `
                    <div class="workflow-stepper">
                        <div class="step-item ${['DRAFT','WAITING','IN_TRANSIT','DONE'].includes(t.status) ? 'active' : ''} ${['IN_TRANSIT','DONE'].includes(t.status) ? 'completed' : ''}">
                            <div class="step-circle">1</div><span>Created</span>
                        </div>
                        <div style="flex:1; height:2px; background:var(--border-subtle); margin:0 0.5rem;"></div>
                        <div class="step-item ${['IN_TRANSIT','DONE'].includes(t.status) ? 'active' : ''} ${isDone ? 'completed' : ''}">
                            <div class="step-circle">2</div><span>In Transit</span>
                        </div>
                        <div style="flex:1; height:2px; background:var(--border-subtle); margin:0 0.5rem;"></div>
                        <div class="step-item ${isDone ? 'completed' : ''}">
                            <div class="step-circle">3</div><span>Received (Done)</span>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr auto 1fr; gap:1rem; padding:1.25rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); margin-bottom:1.5rem; align-items:center;">
                        <div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Source Location</div>
                            <div style="font-weight:700; color:var(--danger); font-size:0.95rem;">${t.source_warehouse_name}</div>
                            <div style="font-size:0.8rem; color:var(--text-secondary);">${t.source_location_name} (${t.source_location_code})</div>
                        </div>
                        <div style="font-size:1.5rem; color:var(--primary);">→</div>
                        <div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Destination Location</div>
                            <div style="font-weight:700; color:var(--success); font-size:0.95rem;">${t.destination_warehouse_name}</div>
                            <div style="font-size:0.8rem; color:var(--text-secondary);">${t.destination_location_name} (${t.destination_location_code})</div>
                        </div>
                    </div>

                    ${t.reason ? `<div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1rem; padding:0.5rem 0.75rem; background:var(--bg-input); border-radius:var(--radius-sm); font-style:italic;">"${t.reason}"</div>` : ''}

                    <h4 style="margin-bottom:0.75rem; font-size:0.95rem;">Transfer Items</h4>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Transfer Qty</th>
                                    <th>Source Available</th>
                                    <th>Dest. Current</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${t.items.map(item => `
                                    <tr>
                                        <td>
                                            <div style="font-weight:600; color:var(--text-primary);">${item.product_name}</div>
                                            <div style="font-size:0.7rem; color:var(--text-muted); font-family:var(--font-mono);">${item.product_sku}</div>
                                        </td>
                                        <td><strong style="color:var(--warning); font-size:1.05rem;">${item.quantity} ${item.uom_symbol}</strong></td>
                                        <td style="color:${item.source_available_stock >= item.quantity ? 'var(--success)' : 'var(--danger)'}; font-weight:600;">${item.source_available_stock} ${item.uom_symbol}</td>
                                        <td style="color:var(--text-secondary);">${item.dest_current_stock} ${item.uom_symbol}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    ${isDone ? `
                        <div style="padding:0.85rem; background:var(--success-light); border:1px solid var(--success-border); border-radius:var(--radius-md); margin-top:1.25rem; display:flex; align-items:center; gap:0.75rem;">
                            <div style="color:var(--success);">${Icons.check}</div>
                            <div style="font-size:0.85rem; color:white;"><strong>Transfer Complete:</strong> Stock relocated and two-sided ledger entries recorded. Total stock is unchanged, only location distribution is updated.</div>
                        </div>
                    ` : ''}
                `,
                footer: `
                    <button class="btn btn-secondary" onclick="Modal.close()">Close</button>
                    ${!isDone && !isCanceled ? `
                        <button class="btn btn-danger" id="btn-cancel-trf">Cancel Transfer</button>
                        ${t.status === 'DRAFT' ? `<button class="btn btn-secondary" id="btn-transit-trf">Mark In-Transit</button>` : ''}
                        <button class="btn btn-success" id="btn-validate-trf">${Icons.check} Complete Transfer</button>
                    ` : ''}
                `,
                onOpen: () => {
                    const btnTransit = document.getElementById('btn-transit-trf');
                    if (btnTransit) {
                        btnTransit.onclick = async () => {
                            try { await API.updateTransferStatus(t.id, 'IN_TRANSIT'); Toast.success('Transfer marked as In-Transit'); Modal.close(); TransfersView.showTransferDetailModal(t.id); } catch (e) { Toast.error(e.message); }
                        };
                    }
                    const btnValidate = document.getElementById('btn-validate-trf');
                    if (btnValidate) {
                        btnValidate.onclick = async () => {
                            if (!confirm(`Complete transfer ${t.transfer_number}? Stock will be atomically relocated and two ledger entries per item will be created.`)) return;
                            try {
                                btnValidate.disabled = true; btnValidate.innerHTML = 'Relocating Stock...';
                                await API.validateTransfer(t.id);
                                Toast.success(`Transfer ${t.transfer_number} completed!`);
                                Modal.close(); TransfersView.loadTransfers();
                            } catch (err) { Toast.error(err.message); btnValidate.disabled = false; btnValidate.innerHTML = 'Complete Transfer'; }
                        };
                    }
                    const btnCancel = document.getElementById('btn-cancel-trf');
                    if (btnCancel) {
                        btnCancel.onclick = async () => {
                            if (!confirm(`Cancel transfer ${t.transfer_number}?`)) return;
                            try { await API.cancelTransfer(t.id); Toast.warning('Transfer canceled'); Modal.close(); TransfersView.loadTransfers(); } catch (e) { Toast.error(e.message); }
                        };
                    }
                }
            });
        } catch (e) { Toast.error('Failed to load transfer: ' + e.message); }
    },

    async showCreateTransferModal() {
        try {
            const [warehouses, products] = await Promise.all([API.getWarehouses(), API.getProducts({ limit: 200 })]);

            Modal.open({
                title: 'Create Internal Stock Transfer',
                size: 'lg',
                content: `
                    <form id="form-create-transfer">
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; margin-bottom:1rem;">
                            <div style="padding:1rem; background:hsla(351,85%,60%,0.08); border:1px solid var(--danger-border); border-radius:var(--radius-md);">
                                <div style="font-size:0.75rem; font-weight:700; color:var(--danger); text-transform:uppercase; margin-bottom:0.75rem;">📤 Source (From)</div>
                                <div class="form-group">
                                    <label class="form-label">Warehouse</label>
                                    <select id="ct-src-wh" class="form-control">${warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}</select>
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Location</label>
                                    <select id="ct-src-loc" class="form-control"></select>
                                </div>
                            </div>
                            <div style="padding:1rem; background:hsla(152,69%,45%,0.08); border:1px solid var(--success-border); border-radius:var(--radius-md);">
                                <div style="font-size:0.75rem; font-weight:700; color:var(--success); text-transform:uppercase; margin-bottom:0.75rem;">📥 Destination (To)</div>
                                <div class="form-group">
                                    <label class="form-label">Warehouse</label>
                                    <select id="ct-dst-wh" class="form-control">${warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}</select>
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Location</label>
                                    <select id="ct-dst-loc" class="form-control"></select>
                                </div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Reason for Transfer</label>
                            <input type="text" id="ct-reason" class="form-control" placeholder="e.g. Replenish production line feed store">
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:center; margin:1rem 0 0.5rem 0;">
                            <h4 style="font-size:0.95rem; margin:0;">Products to Relocate</h4>
                            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-transfer-item">${Icons.plus} Add Product</button>
                        </div>
                        <div class="table-container" style="margin-bottom:1rem;">
                            <table class="data-table line-items-table">
                                <thead><tr><th style="width:55%;">Product</th><th>Quantity</th><th style="width:40px;"></th></tr></thead>
                                <tbody id="transfer-items-tbody"></tbody>
                            </table>
                        </div>
                    </form>
                `,
                footer: `
                    <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    <button class="btn btn-primary" id="btn-submit-transfer">Create Transfer</button>
                `,
                onOpen: async () => {
                    const srcWhSel = document.getElementById('ct-src-wh');
                    const srcLocSel = document.getElementById('ct-src-loc');
                    const dstWhSel = document.getElementById('ct-dst-wh');
                    const dstLocSel = document.getElementById('ct-dst-loc');
                    const tbody = document.getElementById('transfer-items-tbody');

                    const loadLocs = async (whId, select) => {
                        const locs = await API.getLocations(whId);
                        select.innerHTML = locs.map(l => `<option value="${l.id}">${l.name} (${l.code})</option>`).join('');
                    };

                    if (warehouses.length > 0) { await loadLocs(warehouses[0].id, srcLocSel); await loadLocs(warehouses[0].id, dstLocSel); }
                    srcWhSel.onchange = (e) => loadLocs(e.target.value, srcLocSel);
                    dstWhSel.onchange = (e) => loadLocs(e.target.value, dstLocSel);

                    const addRow = () => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td><select class="form-control item-product">${products.items.map(p => `<option value="${p.id}">${p.name} (${p.sku})</option>`).join('')}</select></td>
                            <td><input type="number" step="0.01" class="form-control item-qty" value="5" min="0.01"></td>
                            <td><button type="button" class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="this.closest('tr').remove()">&times;</button></td>
                        `;
                        tbody.appendChild(tr);
                    };
                    addRow();
                    document.getElementById('btn-add-transfer-item').onclick = addRow;

                    document.getElementById('btn-submit-transfer').onclick = async () => {
                        const reason = document.getElementById('ct-reason').value;
                        const rows = tbody.querySelectorAll('tr');
                        const items = [];
                        rows.forEach(r => {
                            const pId = r.querySelector('.item-product').value;
                            const qty = parseFloat(r.querySelector('.item-qty').value) || 0;
                            if (pId && qty > 0) items.push({ product_id: pId, quantity: qty });
                        });
                        if (items.length === 0) return Toast.error('Add at least one product to transfer');
                        if (srcLocSel.value === dstLocSel.value) return Toast.error('Source and destination locations must be different');

                        try {
                            const res = await API.createTransfer({
                                source_warehouse_id: srcWhSel.value, source_location_id: srcLocSel.value,
                                destination_warehouse_id: dstWhSel.value, destination_location_id: dstLocSel.value,
                                reason, items
                            });
                            Toast.success(`Transfer ${res.transfer_number} created!`);
                            Modal.close(); TransfersView.loadTransfers();
                        } catch (e) { Toast.error(e.message); }
                    };
                }
            });
        } catch (e) { Toast.error('Failed to prepare transfer form: ' + e.message); }
    }
};

window.TransfersView = TransfersView;
