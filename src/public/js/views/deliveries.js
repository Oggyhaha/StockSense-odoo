/**
 * Deliveries View (Outgoing Customer Shipments, Picking, Packing, & Stock Deduction)
 */
const DeliveriesView = {
    status: '',
    warehouseId: '',
    search: '',

    async render(container) {
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <h1 style="font-size:1.6rem; font-weight:800; margin-bottom:0.25rem;">Delivery Orders (Outbound)</h1>
                    <p style="font-size:0.85rem; color:var(--text-secondary);">Fulfill customer orders, execute picking and packing workflows, and decrement inventory upon dispatch.</p>
                </div>

                <button class="btn btn-primary" id="btn-create-delivery">
                    ${Icons.plus} New Delivery Order
                </button>
            </div>

            <!-- Toolbar Filter -->
            <div class="card" style="margin-bottom:1.25rem; padding:1rem;">
                <div class="filter-bar" style="margin:0;">
                    <div class="search-input-wrapper">
                        <span class="search-icon-inside">${Icons.search}</span>
                        <input type="text" id="del-search-input" class="form-control" placeholder="Search by delivery #, customer, or SO..." value="${this.search}">
                    </div>

                    <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
                        <select id="del-wh-select" class="form-control" style="width:180px;">
                            <option value="">All Warehouses</option>
                        </select>

                        <select id="del-status-select" class="form-control" style="width:160px;">
                            <option value="">All Statuses</option>
                            <option value="DRAFT">Draft</option>
                            <option value="PICKING">Picking</option>
                            <option value="PACKED">Packed</option>
                            <option value="DONE">Done (Shipped)</option>
                            <option value="CANCELED">Canceled</option>
                        </select>

                        <button class="btn btn-secondary" id="del-btn-refresh">
                            ${Icons.refresh}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Deliveries Table -->
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Delivery Number</th>
                            <th>Customer / Recipient</th>
                            <th>Dispatch Bay</th>
                            <th>Status</th>
                            <th>Ordered Qty</th>
                            <th>Picked / Packed</th>
                            <th>Scheduled Date</th>
                            <th style="text-align:right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="deliveries-table-body">
                        <tr><td colspan="8" style="text-align:center; padding:2rem;">Loading deliveries...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        await this.loadWarehousesFilter();
        await this.loadDeliveries();

        let searchTimeout;
        document.getElementById('del-search-input').oninput = (e) => {
            clearTimeout(searchTimeout);
            this.search = e.target.value;
            searchTimeout = setTimeout(() => this.loadDeliveries(), 300);
        };

        document.getElementById('del-wh-select').onchange = (e) => {
            this.warehouseId = e.target.value;
            this.loadDeliveries();
        };

        document.getElementById('del-status-select').onchange = (e) => {
            this.status = e.target.value;
            this.loadDeliveries();
        };

        document.getElementById('del-btn-refresh').onclick = () => this.loadDeliveries();
        document.getElementById('btn-create-delivery').onclick = () => this.showCreateDeliveryModal();
    },

    async loadWarehousesFilter() {
        try {
            const warehouses = await API.getWarehouses();
            const select = document.getElementById('del-wh-select');
            warehouses.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.id;
                opt.textContent = w.name;
                if (w.id === this.warehouseId) opt.selected = true;
                select.appendChild(opt);
            });
        } catch (e) {
            console.error('Failed to load warehouses for deliveries filter:', e);
        }
    },

    async loadDeliveries() {
        const tbody = document.getElementById('deliveries-table-body');
        try {
            const res = await API.getDeliveries({
                search: this.search,
                warehouseId: this.warehouseId,
                status: this.status,
                limit: 100
            });

            if (!res.items || res.items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2.5rem; color:var(--text-muted);">No delivery orders found.</td></tr>`;
                return;
            }

            tbody.innerHTML = res.items.map(d => {
                const badgeClass = `badge-${d.status.toLowerCase().replace('_', '-')}`;
                return `
                    <tr style="cursor:pointer;" onclick="DeliveriesView.showDeliveryDetailModal('${d.id}')">
                        <td>
                            <strong style="color:var(--primary-hover); font-family:var(--font-mono); font-size:0.95rem;">${d.delivery_number}</strong>
                            ${d.reference_number ? `<div style="font-size:0.7rem; color:var(--text-muted);">SO: ${d.reference_number}</div>` : ''}
                        </td>
                        <td>
                            <div style="font-weight:600; color:var(--text-primary);">${d.customer_name || 'Customer Shipment'}</div>
                            <div style="font-size:0.7rem; color:var(--text-muted);">${d.item_count} line item(s)</div>
                        </td>
                        <td>
                            <div style="font-weight:600; color:var(--text-primary);">${d.warehouse_name}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">${d.location_name}</div>
                        </td>
                        <td>
                            <span class="badge ${badgeClass}"><span class="badge-dot"></span> ${d.status}</span>
                        </td>
                        <td>
                            <strong style="font-size:1rem; color:white;">${d.total_ordered_quantity}</strong>
                        </td>
                        <td>
                            <span style="font-size:0.85rem; color:var(--warning); font-weight:600;">${d.total_picked_quantity}</span>
                            <span style="font-size:0.75rem; color:var(--text-muted);"> / ${d.total_ordered_quantity}</span>
                        </td>
                        <td style="font-size:0.8rem; color:var(--text-muted);">
                            ${d.shipped_date ? 'Shipped: ' + new Date(d.shipped_date).toLocaleDateString() : (d.scheduled_date ? 'Sched: ' + new Date(d.scheduled_date).toLocaleDateString() : '-')}
                        </td>
                        <td style="text-align:right;" onclick="event.stopPropagation()">
                            <button class="btn btn-secondary btn-sm" onclick="DeliveriesView.showDeliveryDetailModal('${d.id}')">
                                Pick / Ship
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--danger);">Error loading delivery orders: ${err.message}</td></tr>`;
        }
    },

    async showDeliveryDetailModal(deliveryId) {
        try {
            const d = await API.getDelivery(deliveryId);
            const isDone = d.status === 'DONE';
            const isCanceled = d.status === 'CANCELED';

            Modal.open({
                title: `Delivery Order: ${d.delivery_number}`,
                size: 'lg',
                content: `
                    <!-- Stepper -->
                    <div class="workflow-stepper">
                        <div class="step-item ${['DRAFT', 'PICKING', 'PACKED', 'DONE'].includes(d.status) ? 'active' : ''} ${['PICKING', 'PACKED', 'DONE'].includes(d.status) ? 'completed' : ''}">
                            <div class="step-circle">1</div>
                            <span>Order Created</span>
                        </div>
                        <div style="flex:1; height:2px; background:var(--border-subtle); margin:0 0.5rem;"></div>
                        <div class="step-item ${['PICKING', 'PACKED', 'DONE'].includes(d.status) ? 'active' : ''} ${['PACKED', 'DONE'].includes(d.status) ? 'completed' : ''}">
                            <div class="step-circle">2</div>
                            <span>Picking Stock</span>
                        </div>
                        <div style="flex:1; height:2px; background:var(--border-subtle); margin:0 0.5rem;"></div>
                        <div class="step-item ${['PACKED', 'DONE'].includes(d.status) ? 'active' : ''} ${isDone ? 'completed' : ''}">
                            <div class="step-circle">3</div>
                            <span>Packed & Staged</span>
                        </div>
                        <div style="flex:1; height:2px; background:var(--border-subtle); margin:0 0.5rem;"></div>
                        <div class="step-item ${isDone ? 'completed' : ''}">
                            <div class="step-circle">4</div>
                            <span>Dispatched (Done)</span>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:1rem; padding:1rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); margin-bottom:1.5rem;">
                        <div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Customer / Destination</div>
                            <div style="font-weight:700; color:white; font-size:0.95rem;">${d.customer_name}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">Ref: ${d.reference_number || 'None'}</div>
                        </div>
                        <div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Source Dispatch Location</div>
                            <div style="font-weight:700; color:white; font-size:0.95rem;">${d.warehouse_name}</div>
                            <div style="font-size:0.75rem; color:var(--primary-hover);">${d.location_name} (${d.location_code})</div>
                        </div>
                        <div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Status & Scheduled Date</div>
                            <div><span class="badge badge-${d.status.toLowerCase().replace('_', '-')}">${d.status}</span></div>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">
                                ${d.scheduled_date ? 'Target: ' + new Date(d.scheduled_date).toLocaleDateString() : 'Immediate fulfillment'}
                            </div>
                        </div>
                    </div>

                    <h4 style="margin-bottom:0.75rem; font-size:0.95rem;">Items to Pick & Dispatch</h4>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Product Name</th>
                                    <th>Ordered</th>
                                    <th>Picked</th>
                                    <th>Packed</th>
                                    <th>Location Available Stock</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${d.items.map(item => `
                                    <tr>
                                        <td>
                                            <div style="font-weight:600; color:var(--text-primary);">${item.product_name}</div>
                                            <div style="font-size:0.7rem; color:var(--text-muted); font-family:var(--font-mono);">${item.product_sku}</div>
                                        </td>
                                        <td><strong style="color:white; font-size:1rem;">${item.ordered_quantity} ${item.uom_symbol}</strong></td>
                                        <td><span style="color:var(--warning); font-weight:700;">${item.picked_quantity} ${item.uom_symbol}</span></td>
                                        <td><span style="color:var(--info); font-weight:700;">${item.packed_quantity} ${item.uom_symbol}</span></td>
                                        <td>
                                            <strong style="color:${item.current_available_stock >= item.ordered_quantity ? 'var(--success)' : 'var(--danger)'};">
                                                ${item.current_available_stock} ${item.uom_symbol}
                                            </strong>
                                            ${item.current_available_stock < item.ordered_quantity ? '<span style="font-size:0.65rem; color:var(--danger); margin-left:0.25rem;">(Low!)</span>' : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    ${isDone ? `
                        <div style="padding:0.85rem; background:var(--success-light); border:1px solid var(--success-border); border-radius:var(--radius-md); margin-top:1.25rem; display:flex; align-items:center; gap:0.75rem;">
                            <div style="color:var(--success);">${Icons.check}</div>
                            <div style="font-size:0.85rem; color:white;">
                                <strong>Order Shipped:</strong> Goods have left the warehouse. Stock balances were decremented and audit log recorded in the stock ledger.
                            </div>
                        </div>
                    ` : ''}
                `,
                footer: `
                    <button class="btn btn-secondary" onclick="Modal.close()">Close</button>
                    ${!isDone && !isCanceled ? `
                        <button class="btn btn-danger" id="btn-cancel-del">Cancel Order</button>
                        ${d.status === 'DRAFT' ? `
                            <button class="btn btn-secondary" id="btn-pick-all">
                                📦 Auto-Pick Items
                            </button>
                        ` : ''}
                        ${['DRAFT', 'PICKING'].includes(d.status) ? `
                            <button class="btn btn-secondary" id="btn-pack-all">
                                🏷️ Pack Items
                            </button>
                        ` : ''}
                        <button class="btn btn-primary" id="btn-validate-del">
                            🚚 Validate & Dispatch (Stock -)
                        </button>
                    ` : ''}
                `,
                onOpen: () => {
                    const btnPick = document.getElementById('btn-pick-all');
                    if (btnPick) {
                        btnPick.onclick = async () => {
                            try {
                                await API.pickDelivery(d.id);
                                Toast.success('All items picked from racks');
                                Modal.close();
                                DeliveriesView.showDeliveryDetailModal(d.id);
                            } catch (e) {
                                Toast.error(e.message);
                            }
                        };
                    }

                    const btnPack = document.getElementById('btn-pack-all');
                    if (btnPack) {
                        btnPack.onclick = async () => {
                            try {
                                await API.packDelivery(d.id);
                                Toast.success('Items packed and staged for shipping');
                                Modal.close();
                                DeliveriesView.showDeliveryDetailModal(d.id);
                            } catch (e) {
                                Toast.error(e.message);
                            }
                        };
                    }

                    const btnValidate = document.getElementById('btn-validate-del');
                    if (btnValidate) {
                        btnValidate.onclick = async () => {
                            if (!confirm(`Dispatch delivery order ${d.delivery_number}? This will permanently deduct stock from ${d.location_name} and write immutable ledger entries.`)) return;

                            try {
                                btnValidate.disabled = true;
                                btnValidate.innerHTML = 'Fulfilling & Deducting Stock...';
                                await API.validateDelivery(d.id);
                                Toast.success(`Delivery ${d.delivery_number} shipped! Stock decremented.`);
                                Modal.close();
                                DeliveriesView.loadDeliveries();
                            } catch (err) {
                                Toast.error(err.message);
                                btnValidate.disabled = false;
                                btnValidate.innerHTML = '🚚 Validate & Dispatch (Stock -)';
                            }
                        };
                    }

                    const btnCancel = document.getElementById('btn-cancel-del');
                    if (btnCancel) {
                        btnCancel.onclick = async () => {
                            if (!confirm(`Cancel delivery order ${d.delivery_number}?`)) return;
                            try {
                                await API.cancelDelivery(d.id);
                                Toast.warning(`Delivery ${d.delivery_number} canceled`);
                                Modal.close();
                                DeliveriesView.loadDeliveries();
                            } catch (e) {
                                Toast.error(e.message);
                            }
                        };
                    }
                }
            });
        } catch (e) {
            Toast.error('Failed to load delivery details: ' + e.message);
        }
    },

    async showCreateDeliveryModal() {
        try {
            const [warehouses, products] = await Promise.all([
                API.getWarehouses(),
                API.getProducts({ limit: 200 })
            ]);

            Modal.open({
                title: 'Create Outgoing Delivery Order',
                size: 'lg',
                content: `
                    <form id="form-create-delivery">
                        <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:1rem;">
                            <div class="form-group">
                                <label class="form-label">Customer / Destination Client *</label>
                                <input type="text" id="cd-customer" class="form-control" placeholder="e.g. Acme Aerospace Dynamics" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Sales Order / SO Reference #</label>
                                <input type="text" id="cd-ref" class="form-control" placeholder="e.g. SO-88401">
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:1rem;">
                            <div class="form-group">
                                <label class="form-label">Source Warehouse *</label>
                                <select id="cd-wh" class="form-control" required>
                                    ${warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Source Dispatch Location *</label>
                                <select id="cd-loc" class="form-control" required>
                                    <!-- Loaded dynamically -->
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Scheduled Dispatch Date</label>
                                <input type="date" id="cd-date" class="form-control">
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Fulfillment Notes / Shipping Carrier</label>
                            <input type="text" id="cd-notes" class="form-control" placeholder="e.g. Express Air Freight, palletized">
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:center; margin:1rem 0 0.5rem 0;">
                            <h4 style="font-size:0.95rem; margin:0;">Ordered Products</h4>
                            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-delivery-item">
                                ${Icons.plus} Add Product
                            </button>
                        </div>

                        <div class="table-container" style="margin-bottom:1rem;">
                            <table class="data-table line-items-table">
                                <thead>
                                    <tr>
                                        <th style="width:50%;">Product</th>
                                        <th>Ordered Quantity</th>
                                        <th>Notes</th>
                                        <th style="width:40px;"></th>
                                    </tr>
                                </thead>
                                <tbody id="delivery-items-tbody">
                                    <!-- Dynamic rows -->
                                </tbody>
                            </table>
                        </div>
                    </form>
                `,
                footer: `
                    <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    <button class="btn btn-primary" id="btn-submit-delivery">Save Draft Delivery</button>
                `,
                onOpen: async () => {
                    const whSelect = document.getElementById('cd-wh');
                    const locSelect = document.getElementById('cd-loc');
                    const tbody = document.getElementById('delivery-items-tbody');

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
                                    ${products.items.map(p => `<option value="${p.id}">${p.name} (${p.sku}) - Avail: ${p.available_stock}</option>`).join('')}
                                </select>
                            </td>
                            <td>
                                <input type="number" step="0.01" class="form-control item-qty" value="5" min="0.01" required>
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

                    addRow();
                    document.getElementById('btn-add-delivery-item').onclick = addRow;

                    document.getElementById('btn-submit-delivery').onclick = async () => {
                        const customer_name = document.getElementById('cd-customer').value;
                        const reference_number = document.getElementById('cd-ref').value;
                        const warehouse_id = whSelect.value;
                        const source_location_id = locSelect.value;
                        const scheduled_date = document.getElementById('cd-date').value;
                        const notes = document.getElementById('cd-notes').value;

                        if (!customer_name) return Toast.error('Please specify the customer name');

                        const rows = tbody.querySelectorAll('tr');
                        const items = [];
                        rows.forEach(r => {
                            const pId = r.querySelector('.item-product').value;
                            const qty = parseFloat(r.querySelector('.item-qty').value) || 0;
                            const n = r.querySelector('.item-note').value;
                            if (pId && qty > 0) {
                                items.push({ product_id: pId, ordered_quantity: qty, notes: n });
                            }
                        });

                        if (items.length === 0) return Toast.error('Please specify at least one ordered item');

                        try {
                            const res = await API.createDelivery({
                                customer_name, reference_number, warehouse_id,
                                source_location_id, scheduled_date, notes, items
                            });

                            Toast.success(`Delivery order ${res.delivery_number} created!`);
                            Modal.close();
                            DeliveriesView.loadDeliveries();
                        } catch (e) {
                            Toast.error(e.message);
                        }
                    };
                }
            });
        } catch (e) {
            Toast.error('Failed to prepare delivery creation modal: ' + e.message);
        }
    }
};

window.DeliveriesView = DeliveriesView;
