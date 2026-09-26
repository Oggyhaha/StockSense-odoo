/**
 * Deliveries View (Outgoing Customer Shipments - Draft -> Waiting -> Ready -> Dispatch)
 */
const DeliveriesView = {
    status: '',
    warehouseId: '',
    search: '',
    viewMode: 'list', // 'list' or 'kanban'

    async render(container) {
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <h1 style="font-size:1.6rem; font-weight:800; margin-bottom:0.25rem;">Delivery Orders (Outbound)</h1>
                    <p style="font-size:0.85rem; color:var(--text-secondary);">Manage customer orders through Draft → Waiting → Ready → Dispatch workflow with stock validation.</p>
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
                            <option value="WAITING">Waiting</option>
                            <option value="READY">Ready</option>
                            <option value="DONE">Done (Dispatched)</option>
                            <option value="CANCELED">Canceled</option>
                        </select>

                        <!-- View Toggle -->
                        <div class="view-toggle" style="margin-left:auto;">
                            <button class="view-btn ${this.viewMode === 'list' ? 'active' : ''}" data-view="list" title="List View">${Icons.list}</button>
                            <button class="view-btn ${this.viewMode === 'kanban' ? 'active' : ''}" data-view="kanban" title="Kanban View">${Icons.kanban}</button>
                        </div>

                        <button class="btn btn-secondary" id="del-btn-refresh">
                            ${Icons.refresh}
                        </button>
                    </div>
                </div>
            </div>

            <!-- List View -->
            <div id="del-list-view" style="${this.viewMode === 'list' ? '' : 'display:none;'}">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Delivery Number</th>
                                <th>Customer / Recipient</th>
                                <th>Dispatch Bay</th>
                                <th>Status</th>
                                <th>Ordered Qty</th>
                                <th>Scheduled Date</th>
                                <th style="text-align:right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="deliveries-table-body">
                            <tr><td colspan="7" style="text-align:center; padding:2rem;">Loading deliveries...</td></tr>
                        </tbody>
                    </table>
                </table>
            </div>

            <!-- Kanban View -->
            <div id="del-kanban-view" style="${this.viewMode === 'kanban' ? '' : 'display:none;'}">
                <div class="kanban-board" style="display:flex; gap:1rem; overflow-x:auto; padding:0.5rem 0;">
                    <div class="kanban-column" data-status="DRAFT">
                        <div class="kanban-column-header" style="background:var(--bg-surface-hover); border:1px solid var(--border-subtle); border-radius:var(--radius-md) var(--radius-md) 0 0; padding:0.75rem 1rem; font-weight:600; color:var(--text-muted); display:flex; justify-content:space-between; align-items:center;">
                            <span>Draft</span>
                            <span class="badge badge-draft" id="kanban-count-draft">0</span>
                        </div>
                        <div class="kanban-cards" id="kanban-draft" style="min-height:300px; padding:0.5rem; background:var(--bg-surface); border:1px solid var(--border-subtle); border-top:none; border-radius:0 0 var(--radius-md) var(--radius-md);"></div>
                    </div>
                    <div class="kanban-column" data-status="WAITING">
                        <div class="kanban-column-header" style="background:var(--warning-light); border:1px solid var(--warning-border); border-radius:var(--radius-md) var(--radius-md) 0 0; padding:0.75rem 1rem; font-weight:600; color:var(--warning); display:flex; justify-content:space-between; align-items:center;">
                            <span>Waiting</span>
                            <span class="badge badge-warning" id="kanban-count-waiting">0</span>
                        </div>
                        <div class="kanban-cards" id="kanban-waiting" style="min-height:300px; padding:0.5rem; background:var(--bg-surface); border:1px solid var(--border-subtle); border-top:none; border-radius:0 0 var(--radius-md) var(--radius-md);"></div>
                    </div>
                    <div class="kanban-column" data-status="READY">
                        <div class="kanban-column-header" style="background:var(--success-light); border:1px solid var(--success-border); border-radius:var(--radius-md) var(--radius-md) 0 0; padding:0.75rem 1rem; font-weight:600; color:var(--success); display:flex; justify-content:space-between; align-items:center;">
                            <span>Ready</span>
                            <span class="badge badge-success" id="kanban-count-ready">0</span>
                        </div>
                        <div class="kanban-cards" id="kanban-ready" style="min-height:300px; padding:0.5rem; background:var(--bg-surface); border:1px solid var(--border-subtle); border-top:none; border-radius:0 0 var(--radius-md) var(--radius-md);"></div>
                    </div>
                    <div class="kanban-column" data-status="DONE">
                        <div class="kanban-column-header" style="background:var(--info-light); border:1px solid var(--info); border-radius:var(--radius-md) var(--radius-md) 0 0; padding:0.75rem 1rem; font-weight:600; color:var(--info); display:flex; justify-content:space-between; align-items:center;">
                            <span>Dispatched</span>
                            <span class="badge badge-info" id="kanban-count-done">0</span>
                        </div>
                        <div class="kanban-cards" id="kanban-done" style="min-height:300px; padding:0.5rem; background:var(--bg-surface); border:1px solid var(--border-subtle); border-top:none; border-radius:0 0 var(--radius-md) var(--radius-md);"></div>
                    </div>
                </div>
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

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.onclick = (e) => {
                this.viewMode = e.currentTarget.dataset.view;
                this.renderDeliveriesView();
            };
        });

        document.getElementById('del-btn-refresh').onclick = () => this.loadDeliveries();
        document.getElementById('btn-create-delivery').onclick = () => this.showCreateDeliveryModal();
    },

    renderDeliveriesView() {
        const listView = document.getElementById('del-list-view');
        const kanbanView = document.getElementById('del-kanban-view');
        const listBtn = document.querySelector('.view-btn[data-view="list"]');
        const kanbanBtn = document.querySelector('.view-btn[data-view="kanban"]');

        if (this.viewMode === 'list') {
            listView.style.display = '';
            document.getElementById('del-kanban-view').style.display = 'none';
            listBtn.classList.add('active');
            kanbanBtn.classList.remove('active');
        } else {
            listView.style.display = 'none';
            document.getElementById('del-kanban-view').style.display = '';
            listBtn.classList.remove('active');
            kanbanBtn.classList.add('active');
            this.loadDeliveries(); // Re-render kanban
        }
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
        try {
            const res = await API.getDeliveries({
                search: this.search,
                warehouseId: this.warehouseId,
                status: this.status,
                limit: 100
            });

            if (this.viewMode === 'list') {
                this.renderListView(res.items || []);
            } else {
                this.renderKanbanView(res.items || []);
            }
        } catch (err) {
            if (this.viewMode === 'list') {
                document.getElementById('deliveries-table-body').innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--danger);">Error loading delivery orders: ${err.message}</td></tr>`;
            }
        }
    },

    renderListView(items = []) {
        const tbody = document.getElementById('deliveries-table-body');
        if (!items || items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2.5rem; color:var(--text-muted);">No delivery orders found.</td></tr>`;
            return;
        }

        tbody.innerHTML = items.map(d => {
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
                    <td style="font-size:0.8rem; color:var(--text-muted);">
                        ${d.shipped_date ? 'Dispatched: ' + new Date(d.shipped_date).toLocaleDateString() : (d.scheduled_date ? 'Sched: ' + new Date(d.scheduled_date).toLocaleDateString() : '-')}
                    </td>
                    <td style="text-align:right;" onclick="event.stopPropagation()">
                        <button class="btn btn-secondary btn-sm" onclick="DeliveriesView.showDeliveryDetailModal('${d.id}')">
                            View / Process
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    renderKanbanView(items = []) {
        const columns = {
            DRAFT: document.getElementById('kanban-draft'),
            WAITING: document.getElementById('kanban-waiting'),
            READY: document.getElementById('kanban-ready'),
            DONE: document.getElementById('kanban-done')
        };

        // Clear columns
        Object.values(columns).forEach(col => col.innerHTML = '');

        // Count badges
        const counts = { DRAFT: 0, WAITING: 0, READY: 0, DONE: 0 };

        if (!items || items.length === 0) {
            Object.values(columns).forEach(col => {
                col.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted); font-size:0.85rem;">No delivery orders</div>';
            });
            document.getElementById('kanban-count-draft').textContent = 0;
            document.getElementById('kanban-count-waiting').textContent = 0;
            document.getElementById('kanban-count-ready').textContent = 0;
            document.getElementById('kanban-count-done').textContent = 0;
            return;
        }

        items.forEach(d => {
            const status = d.status;
            if (columns[status]) {
                counts[status]++;
                const card = document.createElement('div');
                card.className = 'kanban-card';
                card.style.cssText = 'background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:1rem; margin-bottom:0.5rem; cursor:pointer; transition:transform var(--transition-fast), box-shadow var(--transition-fast);';
                card.onmouseover = () => { card.style.transform = 'translateY(-2px)'; card.style.boxShadow = 'var(--shadow-md)'; };
                card.onmouseout = () => { card.style.transform = ''; card.style.boxShadow = ''; };
                card.onclick = () => DeliveriesView.showDeliveryDetailModal(d.id);

                // Check for insufficient stock
                const hasInsufficientStock = d.items && d.items.some(item => item.current_available_stock < item.ordered_quantity);

                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
                        <strong style="color:var(--primary-hover); font-family:var(--font-mono); font-size:0.9rem;">${d.delivery_number}</strong>
                        <span class="badge badge-${d.status.toLowerCase().replace('_', '-')}">${d.status}</span>
                    </div>
                    <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.5rem;">${d.customer_name || 'Customer Shipment'}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${d.warehouse_name} / ${d.location_name}</div>
                    <div style="margin-top:0.75rem; padding-top:0.5rem; border-top:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.75rem; color:var(--text-muted);">${d.item_count} items</span>
                        <strong style="color:var(--success);">Qty: ${d.total_ordered_quantity}</strong>
                    </div>
                    ${hasInsufficientStock ? `<div style="margin-top:0.5rem; padding:0.5rem; background:var(--danger-light); border:1px solid var(--danger-border); border-radius:var(--radius-sm); font-size:0.7rem; color:var(--danger);">⚠ Some items have insufficient stock</div>` : ''}
                `;
                columns[status].appendChild(card);
            });

            // Update count badges
            document.getElementById('kanban-count-draft').textContent = counts.DRAFT;
            document.getElementById('kanban-count-waiting').textContent = counts.WAITING;
            document.getElementById('kanban-count-ready').textContent = counts.READY;
            document.getElementById('kanban-count-done').textContent = counts.DONE;

            // Empty columns
            ['DRAFT', 'WAITING', 'READY', 'DONE'].forEach(s => {
                if (counts[s] === 0) {
                    document.getElementById(`kanban-${s.toLowerCase()}`).innerHTML = 
                        '<div style="text-align:center; padding:2rem; color:var(--text-muted); font-size:0.85rem;">No delivery orders</div>';
                }
            });
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
                        <div class="step-item ${['DRAFT', 'WAITING', 'READY', 'DONE'].includes(d.status) ? 'active' : ''} ${['WAITING', 'READY', 'DONE'].includes(d.status) ? 'completed' : ''}">
                            <div class="step-circle">1</div>
                            <span>Draft</span>
                        </div>
                        <div style="flex:1; height:2px; background:var(--border-subtle); margin:0 0.5rem;"></div>
                        <div class="step-item ${['WAITING', 'READY', 'DONE'].includes(d.status) ? 'active' : ''} ${['READY', 'DONE'].includes(d.status) ? 'completed' : ''}">
                            <div class="step-circle">2</div>
                            <span>Waiting</span>
                        </div>
                        <div style="flex:1; height:2px; background:var(--border-subtle); margin:0 0.5rem;"></div>
                        <div class="step-item ${['READY', 'DONE'].includes(d.status) ? 'active' : ''} ${isDone ? 'completed' : ''}">
                            <div class="step-circle">3</div>
                            <span>Ready</span>
                        </div>
                        <div style="flex:1; height:2px; background:var(--border-subtle); margin:0 0.5rem;"></div>
                        <div class="step-item ${isDone ? 'completed' : ''}">
                            <div class="step-circle">4</div>
                            <span>Dispatched</span>
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

                    <h4 style="margin-bottom:0.75rem; font-size:0.95rem;">Items to Dispatch</h4>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Product Name</th>
                                    <th>Ordered</th>
                                    <th>Location Available Stock</th>
                                    <th>Stock Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${d.items.map(item => `
                                    <tr class="${item.current_available_stock < item.ordered_quantity ? 'out-of-stock-row' : ''}">
                                        <td>
                                            <div style="font-weight:600; color:var(--text-primary);">${item.product_name}</div>
                                            <div style="font-size:0.7rem; color:var(--text-muted); font-family:var(--font-mono);">${item.product_sku}</div>
                                        </td>
                                        <td><strong style="color:white; font-size:1rem;">${item.ordered_quantity} ${item.uom_symbol}</strong></td>
                                        <td>
                                            <strong style="color:${item.current_available_stock >= item.ordered_quantity ? 'var(--success)' : 'var(--danger)'};">
                                                ${item.current_available_stock} ${item.uom_symbol}
                                            </strong>
                                        </td>
                                        <td>
                                            ${item.current_available_stock >= item.ordered_quantity ? 
                                                `<span class="badge badge-success">✓ Sufficient</span>` : 
                                                `<span class="badge badge-danger">⚠ Insufficient</span>`
                                            }
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
                                <strong>Order Dispatched:</strong> Goods have left the warehouse. Stock balances were decremented and audit log recorded in the stock ledger.
                            </div>
                        </div>
                    ` : ''}
                `,
                footer: `
                    <button class="btn btn-secondary" onclick="Modal.close()">Close</button>
                    ${!isDone && !isCanceled ? `
                        <button class="btn btn-danger" id="btn-cancel-del">Cancel Order</button>
                        ${d.status === 'DRAFT' ? `
                            <button class="btn btn-secondary" id="btn-to-waiting">
                                ${Icons.arrowRight} Move to Waiting
                            </button>
                        ` : ''}
                        ${d.status === 'WAITING' ? `
                            <button class="btn btn-secondary" id="btn-to-ready">
                                ${Icons.check} Mark Ready (Check Stock)
                            </button>
                            <button class="btn btn-secondary" id="btn-back-draft">
                                ${Icons.arrowLeft} Back to Draft
                            </button>
                        ` : ''}
                        ${d.status === 'READY' ? `
                            <button class="btn btn-secondary" id="btn-back-waiting">
                                ${Icons.arrowLeft} Back to Waiting
                            </button>
                        ` : ''}
                        ${d.status === 'READY' ? `
                            <button class="btn btn-primary" id="btn-validate-del">
                                🚚 Dispatch & Deduct Stock
                            </button>
                        ` : ''}
                    ` : ''}
                `,
                onOpen: () => {
                    const btnToWaiting = document.getElementById('btn-to-waiting');
                    if (btnToWaiting) {
                        btnToWaiting.onclick = async () => {
                            try {
                                await API.updateDeliveryStatus(d.id, 'WAITING');
                                Toast.success('Delivery moved to Waiting');
                                Modal.close();
                                DeliveriesView.showDeliveryDetailModal(d.id);
                            } catch (e) {
                                Toast.error(e.message);
                            }
                        };
                    }

                    const btnToReady = document.getElementById('btn-to-ready');
                    if (btnToReady) {
                        btnToReady.onclick = async () => {
                            try {
                                await API.updateDeliveryStatus(d.id, 'READY');
                                Toast.success('Delivery marked Ready - stock validated');
                                Modal.close();
                                DeliveriesView.showDeliveryDetailModal(d.id);
                            } catch (e) {
                                Toast.error(e.message);
                            }
                        };
                    }

                    const btnBackDraft = document.getElementById('btn-back-draft');
                    if (btnBackDraft) {
                        btnBackDraft.onclick = async () => {
                            try {
                                await API.updateDeliveryStatus(d.id, 'DRAFT');
                                Toast.success('Delivery moved back to Draft');
                                Modal.close();
                                DeliveriesView.showDeliveryDetailModal(d.id);
                            } catch (e) {
                                Toast.error(e.message);
                            }
                        };
                    }

                    const btnBackWaiting = document.getElementById('btn-back-waiting');
                    if (btnBackWaiting) {
                        btnBackWaiting.onclick = async () => {
                            try {
                                await API.updateDeliveryStatus(d.id, 'WAITING');
                                Toast.success('Delivery moved back to Waiting');
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
                            const hasInsufficientStock = d.items.some(item => item.current_available_stock < item.ordered_quantity);
                            let confirmMsg = `Dispatch delivery order ${d.delivery_number}? This will permanently deduct stock from ${d.location_name} and write immutable ledger entries.`;
                            if (hasInsufficientStock) {
                                confirmMsg += '\n\n⚠ WARNING: Some items have insufficient stock! This will only proceed if organization allows negative stock.';
                            }
                            
                            if (!confirm(confirmMsg)) return;

                            try {
                                btnValidate.disabled = true;
                                btnValidate.innerHTML = 'Dispatching & Deducting Stock...';
                                await API.validateDelivery(d.id);
                                Toast.success(`Delivery ${d.delivery_number} dispatched! Stock decremented.`);
                                Modal.close();
                                DeliveriesView.loadDeliveries();
                            } catch (err) {
                                Toast.error(err.message);
                                btnValidate.disabled = false;
                                btnValidate.innerHTML = '🚚 Dispatch & Deduct Stock';
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