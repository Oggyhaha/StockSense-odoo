/**
 * Stock Adjustments View (Cycle Count Reconciliation, Approval Workflow)
 */
const AdjustmentsView = {
    status: '',
    warehouseId: '',
    search: '',

    async render(container) {
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <h1 style="font-size:1.6rem; font-weight:800; margin-bottom:0.25rem;">Stock Adjustments</h1>
                    <p style="font-size:0.85rem; color:var(--text-secondary);">Reconcile physical counts with system quantities. Large variances require approval.</p>
                </div>
                <button class="btn btn-primary" id="btn-create-adjustment">
                    ${Icons.plus} New Adjustment
                </button>
            </div>

            <!-- Filter Toolbar -->
            <div class="card" style="margin-bottom:1.25rem; padding:1rem;">
                <div class="filter-bar" style="margin:0;">
                    <div class="search-input-wrapper">
                        <span class="search-icon-inside">${Icons.search}</span>
                        <input type="text" id="adj-search-input" class="form-control" placeholder="Search by adjustment #, reason, or product..." value="${this.search}">
                    </div>

                    <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
                        <select id="adj-wh-select" class="form-control" style="width:180px;">
                            <option value="">All Warehouses</option>
                        </select>

                        <select id="adj-status-select" class="form-control" style="width:180px;">
                            <option value="">All Statuses</option>
                            <option value="DRAFT">Draft</option>
                            <option value="PENDING_APPROVAL">Pending Approval</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="DONE">Done (Posted)</option>
                            <option value="CANCELED">Canceled</option>
                        </select>

                        <button class="btn btn-secondary" id="adj-btn-refresh">
                            ${Icons.refresh}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Adjustments Table -->
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Adjustment Number</th>
                            <th>Warehouse / Location</th>
                            <th>Reason</th>
                            <th>Status</th>
                            <th>Items</th>
                            <th>Net Difference</th>
                            <th>Date</th>
                            <th style="text-align:right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="adjustments-table-body">
                        <tr><td colspan="8" style="text-align:center; padding:2rem;">Loading adjustments...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        await this.loadWarehousesFilter();
        await this.loadAdjustments();

        let searchTimeout;
        document.getElementById('adj-search-input').oninput = (e) => {
            clearTimeout(searchTimeout);
            this.search = e.target.value;
            searchTimeout = setTimeout(() => this.loadAdjustments(), 300);
        };

        document.getElementById('adj-wh-select').onchange = (e) => {
            this.warehouseId = e.target.value;
            this.loadAdjustments();
        };

        document.getElementById('adj-status-select').onchange = (e) => {
            this.status = e.target.value;
            this.loadAdjustments();
        };

        document.getElementById('adj-btn-refresh').onclick = () => this.loadAdjustments();
        document.getElementById('btn-create-adjustment').onclick = () => this.showCreateAdjustmentModal();
    },

    async loadWarehousesFilter() {
        try {
            const warehouses = await API.getWarehouses();
            const select = document.getElementById('adj-wh-select');
            warehouses.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.id;
                opt.textContent = w.name;
                if (w.id === this.warehouseId) opt.selected = true;
                select.appendChild(opt);
            });
        } catch (e) {
            console.error('Failed to load warehouses for adjustments filter:', e);
        }
    },

    async loadAdjustments() {
        const tbody = document.getElementById('adjustments-table-body');
        try {
            const res = await API.getAdjustments({
                search: this.search,
                warehouseId: this.warehouseId,
                status: this.status,
                limit: 100
            });

            if (!res.items || res.items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2.5rem; color:var(--text-muted);">No stock adjustments found matching your criteria.</td></tr>`;
                return;
            }

            tbody.innerHTML = res.items.map(a => {
                const badgeClass = `badge-${a.status.toLowerCase().replace('_', '-')}`;
                const diffColor = a.net_difference > 0 ? 'var(--success)' : (a.net_difference < 0 ? 'var(--danger)' : 'var(--text-muted)');
                const diffSign = a.net_difference > 0 ? '+' : '';
                return `
                    <tr style="cursor:pointer;" onclick="AdjustmentsView.showAdjustmentDetailModal('${a.id}')">
                        <td>
                            <strong style="color:var(--primary-hover); font-family:var(--font-mono); font-size:0.95rem;">${a.adjustment_number}</strong>
                        </td>
                        <td>
                            <div style="font-weight:600; color:var(--text-primary);">${a.warehouse_name}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">${a.location_name}</div>
                        </td>
                        <td>
                            <span class="badge badge-ready">${a.reason_category}</span>
                            ${a.detailed_reason ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.25rem;">${a.detailed_reason}</div>` : ''}
                        </td>
                        <td>
                            <span class="badge ${badgeClass}"><span class="badge-dot"></span> ${a.status.replace('_', ' ')}</span>
                        </td>
                        <td>
                            <span style="font-weight:600; color:white;">${a.item_count}</span>
                        </td>
                        <td>
                            <strong style="color:${diffColor}; font-size:1rem;">${diffSign}${a.net_difference}</strong>
                        </td>
                        <td style="font-size:0.8rem; color:var(--text-muted);">
                            ${new Date(a.created_at).toLocaleDateString()}
                        </td>
                        <td style="text-align:right;" onclick="event.stopPropagation()">
                            <button class="btn btn-secondary btn-sm" onclick="AdjustmentsView.showAdjustmentDetailModal('${a.id}')">
                                View / Process
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--danger);">Error loading adjustments: ${err.message}</td></tr>`;
        }
    },

    async showAdjustmentDetailModal(adjustmentId) {
        try {
            const a = await API.getAdjustment(adjustmentId);
            const isDone = a.status === 'DONE';
            const isCanceled = a.status === 'CANCELED';
            const isRejected = a.status === 'REJECTED';
            const isPending = a.status === 'PENDING_APPROVAL';
            const isApproved = a.status === 'APPROVED';

            Modal.open({
                title: `Adjustment Details: ${a.adjustment_number}`,
                size: 'lg',
                content: `
                    <!-- Stepper Bar -->
                    <div class="workflow-stepper">
                        <div class="step-item ${['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DONE'].includes(a.status) ? 'active' : ''} ${['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DONE'].includes(a.status) ? 'completed' : ''}">
                            <div class="step-circle">1</div>
                            <span>Created</span>
                        </div>
                        <div style="flex:1; height:2px; background:var(--border-subtle); margin:0 0.5rem;"></div>
                        <div class="step-item ${['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DONE'].includes(a.status) ? 'active' : ''} ${['APPROVED', 'REJECTED', 'DONE'].includes(a.status) ? 'completed' : ''}">
                            <div class="step-circle">2</div>
                            <span>${isPending || isApproved || isDone ? 'Under Review' : 'Approval Required'}</span>
                        </div>
                        <div style="flex:1; height:2px; background:var(--border-subtle); margin:0 0.5rem;"></div>
                        <div class="step-item ${['APPROVED', 'DONE'].includes(a.status) ? 'active' : ''} ${isDone ? 'completed' : ''}">
                            <div class="step-circle">3</div>
                            <span>Approved</span>
                        </div>
                        <div style="flex:1; height:2px; background:var(--border-subtle); margin:0 0.5rem;"></div>
                        <div class="step-item ${isDone ? 'completed' : ''}">
                            <div class="step-circle">4</div>
                            <span>Posted to Stock</span>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:1rem; padding:1rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); margin-bottom:1.5rem;">
                        <div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Warehouse / Location</div>
                            <div style="font-weight:700; color:white; font-size:0.95rem;">${a.warehouse_name}</div>
                            <div style="font-size:0.75rem; color:var(--primary-hover);">${a.location_name} (${a.location_code})</div>
                        </div>
                        <div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Reason Category</div>
                            <div style="font-weight:700; color:white; font-size:0.95rem;">${a.reason_category}</div>
                        </div>
                        <div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">Status & Date</div>
                            <div><span class="badge badge-${a.status.toLowerCase().replace('_', '-')}">${a.status.replace('_', ' ')}</span></div>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">Created: ${new Date(a.created_at).toLocaleDateString()}</div>
                        </div>
                    </div>

                    ${a.detailed_reason ? `<div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:1rem; font-style:italic;">"${a.detailed_reason}"</div>` : ''}

                    <h4 style="margin-bottom:0.75rem; font-size:0.95rem;">Counted Items</h4>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>SKU</th>
                                    <th>System Qty</th>
                                    <th>Counted Qty</th>
                                    <th>Difference</th>
                                    <th>Valuation Impact</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${a.items.map(item => {
                                    const diff = item.difference;
                                    const diffClass = diff > 0 ? 'diff-tag-positive' : (diff < 0 ? 'diff-tag-negative' : 'diff-tag-zero');
                                    const diffSign = diff > 0 ? '+' : '';
                                    const impact = diff * (item.unit_cost || 0);
                                    const impactColor = impact > 0 ? 'var(--success)' : (impact < 0 ? 'var(--danger)' : 'var(--text-muted)');
                                    return `
                                        <tr>
                                            <td>
                                                <div style="font-weight:600; color:var(--text-primary);">${item.product_name}</div>
                                                <div style="font-size:0.7rem; color:var(--text-muted); font-family:var(--font-mono);">${item.product_sku}</div>
                                            </td>
                                            <td><span style="font-family:var(--font-mono); color:var(--primary-hover);">${item.product_sku}</span></td>
                                            <td><strong style="color:var(--text-secondary);">${item.system_quantity} ${item.uom_symbol}</strong></td>
                                            <td><strong style="color:var(--primary-hover);">${item.counted_quantity} ${item.uom_symbol}</strong></td>
                                            <td><span class="diff-tag ${diffClass}">${diffSign}${diff} ${item.uom_symbol}</span></td>
                                            <td><strong style="color:${impactColor};">$${impact.toFixed(2)}</strong></td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>

                    ${isDone ? `
                        <div style="padding:0.85rem; background:var(--success-light); border:1px solid var(--success-border); border-radius:var(--radius-md); margin-top:1.25rem; display:flex; align-items:center; gap:0.75rem;">
                            <div style="color:var(--success);">${Icons.check}</div>
                            <div style="font-size:0.85rem; color:white;"><strong>Adjustment Posted:</strong> Stock balances updated and immutable ledger entries recorded.</div>
                        </div>
                    ` : ''}
                    ${isRejected ? `
                        <div style="padding:0.85rem; background:var(--danger-light); border:1px solid var(--danger-border); border-radius:var(--radius-md); margin-top:1.25rem; display:flex; align-items:center; gap:0.75rem;">
                            <div style="color:var(--danger);">${Icons.x}</div>
                            <div style="font-size:0.85rem; color:white;"><strong>Adjustment Rejected:</strong> No stock changes were made.</div>
                        </div>
                    ` : ''}
                `,
                footer: `
                    <button class="btn btn-secondary" onclick="Modal.close()">Close</button>
                    ${!isDone && !isCanceled && !isRejected ? `
                        <button class="btn btn-danger" id="btn-cancel-adj">Cancel Adjustment</button>
                        ${isPending ? `
                            <button class="btn btn-secondary" id="btn-reject-adj">Reject</button>
                            <button class="btn btn-success" id="btn-approve-adj">
                                ${Icons.check} Approve & Post to Stock
                            </button>
                        ` : ''}
                    ` : ''}
                `,
                onOpen: () => {
                    const btnApprove = document.getElementById('btn-approve-adj');
                    if (btnApprove) {
                        btnApprove.onclick = async () => {
                            if (!confirm(`Approve and post adjustment ${a.adjustment_number}? This will update stock balances and write immutable ledger entries.`)) return;

                            try {
                                btnApprove.disabled = true;
                                btnApprove.innerHTML = 'Posting to Stock...';
                                await API.approveAdjustment(a.id);
                                Toast.success(`Adjustment ${a.adjustment_number} approved and posted!`);
                                Modal.close();
                                AdjustmentsView.loadAdjustments();
                            } catch (err) {
                                Toast.error(err.message);
                                btnApprove.disabled = false;
                                btnApprove.innerHTML = 'Approve & Post to Stock';
                            }
                        };
                    }

                    const btnReject = document.getElementById('btn-reject-adj');
                    if (btnReject) {
                        btnReject.onclick = async () => {
                            if (!confirm(`Reject adjustment ${a.adjustment_number}?`)) return;
                            try {
                                await API.rejectAdjustment(a.id);
                                Toast.warning(`Adjustment ${a.adjustment_number} rejected`);
                                Modal.close();
                                AdjustmentsView.loadAdjustments();
                            } catch (e) {
                                Toast.error(e.message);
                            }
                        };
                    }

                    const btnCancel = document.getElementById('btn-cancel-adj');
                    if (btnCancel) {
                        btnCancel.onclick = async () => {
                            if (!confirm(`Cancel adjustment ${a.adjustment_number}?`)) return;
                            try {
                                // Note: No explicit cancel endpoint, would need to add or just close
                                Toast.info('Cancel functionality - use backend if needed');
                                Modal.close();
                            } catch (e) {
                                Toast.error(e.message);
                            }
                        };
                    }
                }
            });
        } catch (e) {
            Toast.error('Failed to load adjustment details: ' + e.message);
        }
    },

    async showCreateAdjustmentModal() {
        try {
            const [warehouses, products] = await Promise.all([
                API.getWarehouses(),
                API.getProducts({ limit: 200 })
            ]);

            Modal.open({
                title: 'Create Stock Adjustment (Physical Count)',
                size: 'lg',
                content: `
                    <form id="form-create-adjustment">
                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:1rem;">
                            <div class="form-group">
                                <label class="form-label">Warehouse *</label>
                                <select id="ca-wh" class="form-control" required>
                                    ${warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Location *</label>
                                <select id="ca-loc" class="form-control" required>
                                    <!-- Loaded dynamically -->
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Adjustment Date</label>
                                <input type="date" id="ca-date" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                            <div class="form-group">
                                <label class="form-label">Reason Category *</label>
                                <select id="ca-reason" class="form-control" required>
                                    <option value="DAMAGED">Damaged</option>
                                    <option value="LOST">Lost</option>
                                    <option value="FOUND">Found</option>
                                    <option value="COUNTING_ERROR">Counting Error</option>
                                    <option value="OPENING_BALANCE">Opening Balance</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Detailed Reason</label>
                                <input type="text" id="ca-detail" class="form-control" placeholder="e.g. Forklift damage to pallet corner">
                            </div>
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:center; margin:1rem 0 0.5rem 0;">
                            <h4 style="font-size:0.95rem; margin:0;">Counted Items</h4>
                            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-adj-item">
                                ${Icons.plus} Add Product Count
                            </button>
                        </div>

                        <div class="table-container" style="margin-bottom:1rem;">
                            <table class="data-table line-items-table">
                                <thead>
                                    <tr>
                                        <th style="width:45%;">Product</th>
                                        <th>System Qty (Auto)</th>
                                        <th>Counted Qty *</th>
                                        <th style="width:40px;"></th>
                                    </tr>
                                </thead>
                                <tbody id="adj-items-tbody">
                                    <!-- Dynamic Rows -->
                                </tbody>
                            </table>
                        </div>

                        <div style="padding:0.75rem; background:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-md); font-size:0.8rem; color:var(--text-secondary);">
                            <strong>Note:</strong> System quantity is fetched in real-time when you select a product. Large valuation variances will require manager/admin approval before posting.
                        </div>
                    </form>
                `,
                footer: `
                    <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
                    <button class="btn btn-primary" id="btn-submit-adjustment">Create Adjustment</button>
                `,
                onOpen: async () => {
                    const whSelect = document.getElementById('ca-wh');
                    const locSelect = document.getElementById('ca-loc');
                    const tbody = document.getElementById('adj-items-tbody');

                    const loadLocs = async (whId) => {
                        const locs = await API.getLocations(whId);
                        locSelect.innerHTML = locs.map(l => `<option value="${l.id}">${l.name} (${l.code})</option>`).join('');
                    };

                    if (warehouses.length > 0) {
                        await loadLocs(warehouses[0].id);
                    }
                    whSelect.onchange = (e) => loadLocs(e.target.value);

                    const addRow = (productId = null) => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>
                                <select class="form-control item-product" required>
                                    <option value="">Select product...</option>
                                    ${products.items.map(p => `<option value="${p.id}" data-system="${p.current_stock || 0}" data-uom="${p.uom_symbol}" data-cost="${p.unit_cost || 0}">${p.name} (${p.sku})</option>`).join('')}
                                </select>
                            </td>
                            <td>
                                <input type="text" class="form-control item-system" readonly placeholder="Auto" style="background:var(--bg-input); color:var(--text-muted);">
                            </td>
                            <td>
                                <input type="number" step="0.01" class="form-control item-counted" value="0" min="0" required>
                            </td>
                            <td style="text-align:center;">
                                <button type="button" class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="this.closest('tr').remove()">&times;</button>
                            </td>
                        `;
                        tbody.appendChild(tr);

                        // Auto-fill system qty on product change
                        tr.querySelector('.item-product').onchange = async (e) => {
                            const opt = e.target.selectedOptions[0];
                            if (opt.value) {
                                tr.querySelector('.item-system').value = `${opt.dataset.system} ${opt.dataset.uom}`;
                            }
                        };
                    };

                    addRow();
                    document.getElementById('btn-add-adj-item').onclick = () => addRow();

                    document.getElementById('btn-submit-adjustment').onclick = async () => {
                        const warehouse_id = whSelect.value;
                        const location_id = locSelect.value;
                        const adjustment_date = document.getElementById('ca-date').value;
                        const reason_category = document.getElementById('ca-reason').value;
                        const detailed_reason = document.getElementById('ca-detail').value;

                        if (!warehouse_id || !location_id) return Toast.error('Please select warehouse and location');

                        const rows = tbody.querySelectorAll('tr');
                        const items = [];
                        rows.forEach(r => {
                            const pId = r.querySelector('.item-product').value;
                            const counted = parseFloat(r.querySelector('.item-counted').value) || 0;
                            if (pId && counted >= 0) {
                                items.push({ product_id: pId, counted_quantity: counted });
                            }
                        });

                        if (items.length === 0) return Toast.error('Please add at least one product count');

                        try {
                            const res = await API.createAdjustment({
                                warehouse_id, location_id, adjustment_date,
                                reason_category, detailed_reason, items
                            });

                            Toast.success(`Adjustment ${res.adjustment_number} created!`);
                            Modal.close();
                            AdjustmentsView.loadAdjustments();
                        } catch (e) {
                            Toast.error(e.message);
                        }
                    };
                }
            });
        } catch (e) {
            Toast.error('Failed to prepare adjustment form: ' + e.message);
        }
    }
};

window.AdjustmentsView = AdjustmentsView;