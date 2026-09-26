/**
 * Dashboard View (KPI Cards, Dynamic Filters, Charts, Recent Activity Feed)
 */
const DashboardView = {
    selectedWarehouse: '',
    selectedCategory: '',

    async render(container) {
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <h1 style="font-size:1.6rem; font-weight:800; margin-bottom:0.25rem;">Inventory Operations Dashboard</h1>
                    <p style="font-size:0.85rem; color:var(--text-secondary);">Real-time metrics, inbound/outbound movements, and stock distribution.</p>
                </div>

                <!-- Dynamic Filter Bar -->
                <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:0.5rem; background:var(--bg-surface); padding:0.35rem 0.75rem; border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
                        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">Warehouse:</span>
                        <select id="dash-filter-warehouse" style="color:var(--text-primary); font-size:0.8rem; cursor:pointer;">
                            <option value="">All Warehouses</option>
                        </select>
                    </div>

                    <div style="display:flex; align-items:center; gap:0.5rem; background:var(--bg-surface); padding:0.35rem 0.75rem; border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
                        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">Category:</span>
                        <select id="dash-filter-category" style="color:var(--text-primary); font-size:0.8rem; cursor:pointer;">
                            <option value="">All Categories</option>
                        </select>
                    </div>

                    <button class="btn btn-secondary btn-sm" id="dash-btn-refresh">
                        ${Icons.refresh} Refresh
                    </button>
                </div>
            </div>

            <!-- KPI Cards Grid -->
            <div class="kpi-grid" id="dash-kpis-container">
                <div class="card" style="padding:1.5rem; text-align:center;">Loading KPI metrics...</div>
            </div>

            <!-- Charts & Operations Breakdown -->
            <div class="dashboard-charts-grid">
                <!-- Operation Volumes & Trends -->
                <div class="card">
                    <div class="card-header">
                        <div>
                            <h3 style="font-size:1rem; font-weight:700;">Stock Operations Volume</h3>
                            <div style="font-size:0.75rem; color:var(--text-muted);">Validated document totals across the organization</div>
                        </div>
                        <span class="badge badge-ready">Real-Time</span>
                    </div>
                    <div class="card-body" id="dash-charts-container">
                        <!-- Chart rendered dynamically -->
                    </div>
                </div>

                <!-- Top Moving Products -->
                <div class="card">
                    <div class="card-header">
                        <div>
                            <h3 style="font-size:1rem; font-weight:700;">Top Moving Items</h3>
                            <div style="font-size:0.75rem; color:var(--text-muted);">Highest velocity stock in ledger</div>
                        </div>
                    </div>
                    <div class="card-body" id="dash-top-products-container">
                        <!-- Top moving products rendered dynamically -->
                    </div>
                </div>
            </div>

            <!-- Warehouse Breakdown & Recent Activity -->
            <div style="display:grid; grid-template-columns: 1fr 1.5fr; gap:1.5rem; margin-bottom:1.5rem;" id="dash-bottom-grid">
                <!-- Warehouse Facility Summary -->
                <div class="card">
                    <div class="card-header">
                        <h3 style="font-size:1rem; font-weight:700;">Warehouse Distribution</h3>
                    </div>
                    <div class="card-body" id="dash-wh-summary-container">
                        <!-- Warehouse cards rendered here -->
                    </div>
                </div>

                <!-- Recent Stock Movements Feed -->
                <div class="card">
                    <div class="card-header" style="justify-content:space-between;">
                        <h3 style="font-size:1rem; font-weight:700;">Recent Stock Ledger Movements</h3>
                        <a href="#ledger" class="btn btn-ghost btn-sm" style="color:var(--primary-hover);">View Full Ledger &rarr;</a>
                    </div>
                    <div class="card-body" id="dash-activity-container">
                        <!-- Recent movements rendered here -->
                    </div>
                </div>
            </div>
        `;

        await this.loadFilters();
        await this.loadData();

        document.getElementById('dash-filter-warehouse').onchange = (e) => {
            this.selectedWarehouse = e.target.value;
            this.loadData();
        };

        document.getElementById('dash-filter-category').onchange = (e) => {
            this.selectedCategory = e.target.value;
            this.loadData();
        };

        document.getElementById('dash-btn-refresh').onclick = () => {
            this.loadData();
            Toast.success('Dashboard metrics updated');
        };
    },

    async loadFilters() {
        try {
            const [warehouses, categories] = await Promise.all([
                API.getWarehouses(),
                API.getCategories()
            ]);

            const whSelect = document.getElementById('dash-filter-warehouse');
            warehouses.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.id;
                opt.textContent = `${w.name} (${w.code})`;
                if (w.id === this.selectedWarehouse) opt.selected = true;
                whSelect.appendChild(opt);
            });

            const catSelect = document.getElementById('dash-filter-category');
            categories.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name;
                if (c.id === this.selectedCategory) opt.selected = true;
                catSelect.appendChild(opt);
            });
        } catch (e) {
            console.error('Failed to load dashboard filters:', e);
        }
    },

    async loadData() {
        try {
            const [summary, activity, whSummary, charts] = await Promise.all([
                API.getDashboardSummary({ warehouseId: this.selectedWarehouse, categoryId: this.selectedCategory }),
                API.getDashboardActivity(10),
                API.getDashboardWarehouseSummary(),
                API.getDashboardCharts()
            ]);

            this.renderKPIs(summary);
            this.renderCharts(charts);
            this.renderTopProducts(charts.topProducts);
            this.renderWarehouseSummary(whSummary);
            this.renderActivity(activity);
        } catch (err) {
            Toast.error('Failed to load dashboard data: ' + err.message);
        }
    },

    renderKPIs(summary) {
        const container = document.getElementById('dash-kpis-container');
        container.innerHTML = `
            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-title">Total Active Products</span>
                    <div class="kpi-icon-pill">${Icons.products}</div>
                </div>
                <div class="kpi-value">${summary.totalProducts.toLocaleString()}</div>
                <div class="kpi-subtext">Catalogued SKUs in organization</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-title">Total Units in Stock</span>
                    <div class="kpi-icon-pill" style="background:var(--success-light); color:var(--success);">${Icons.warehouses}</div>
                </div>
                <div class="kpi-value">${summary.totalStockQuantity.toLocaleString()}</div>
                <div class="kpi-subtext" style="color:var(--success);">Available on warehouse shelves</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-title">Stock Valuation</span>
                    <div class="kpi-icon-pill" style="background:hsla(250, 84%, 67%, 0.15); color:var(--secondary);">$</div>
                </div>
                <div class="kpi-value">$${summary.totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div class="kpi-subtext">Estimated aggregate asset value</div>
            </div>

            <div class="kpi-card" style="${summary.lowStockCount > 0 ? 'border-color:var(--warning-border);' : ''}">
                <div class="kpi-header">
                    <span class="kpi-title">Low / Out of Stock</span>
                    <div class="kpi-icon-pill" style="background:var(--warning-light); color:var(--warning);">${Icons.alert}</div>
                </div>
                <div class="kpi-value" style="color:${summary.lowStockCount > 0 ? 'var(--warning)' : 'var(--text-primary)'};">
                    ${summary.lowStockCount} <span style="font-size:1rem; font-weight:600; color:var(--danger);">(${summary.outOfStockCount} zero)</span>
                </div>
                <div class="kpi-subtext">Requires procurement reorder</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-title">Pending Inbound Receipts</span>
                    <div class="kpi-icon-pill" style="background:var(--info-light); color:var(--info);">${Icons.receipts}</div>
                </div>
                <div class="kpi-value">${summary.pendingReceipts}</div>
                <div class="kpi-subtext">Awaiting dock validation</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-title">Pending Deliveries</span>
                    <div class="kpi-icon-pill" style="background:var(--danger-light); color:var(--danger);">${Icons.deliveries}</div>
                </div>
                <div class="kpi-value">${summary.pendingDeliveries}</div>
                <div class="kpi-subtext">Orders in picking or packing</div>
            </div>

            <div class="kpi-card">
                <div class="kpi-header">
                    <span class="kpi-title">Internal Transfers</span>
                    <div class="kpi-icon-pill" style="background:var(--warning-light); color:var(--warning);">${Icons.transfers}</div>
                </div>
                <div class="kpi-value">${summary.pendingTransfers}</div>
                <div class="kpi-subtext">Relocations in-transit</div>
            </div>
        `;
    },

    renderCharts(charts) {
        const container = document.getElementById('dash-charts-container');
        const b = charts.operationBreakdown || { receipts: 0, deliveries: 0, transfers: 0, adjustments: 0 };
        const total = (b.receipts + b.deliveries + b.transfers + b.adjustments) || 1;

        const pRec = Math.round((b.receipts / total) * 100);
        const pDel = Math.round((b.deliveries / total) * 100);
        const pTrf = Math.round((b.transfers / total) * 100);
        const pAdj = Math.round((b.adjustments / total) * 100);

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:1.25rem;">
                <!-- Modern Segmented Bar -->
                <div style="display:flex; height:18px; border-radius:var(--radius-full); overflow:hidden; background:var(--bg-surface-elevated);">
                    <div style="width:${pRec}%; background:var(--success);" title="Receipts: ${b.receipts}"></div>
                    <div style="width:${pDel}%; background:var(--danger);" title="Deliveries: ${b.deliveries}"></div>
                    <div style="width:${pTrf}%; background:var(--warning);" title="Transfers: ${b.transfers}"></div>
                    <div style="width:${pAdj}%; background:var(--info);" title="Adjustments: ${b.adjustments}"></div>
                </div>

                <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:1rem;">
                    <div style="padding:0.85rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); border-left:4px solid var(--success);">
                        <div style="font-size:0.75rem; color:var(--text-muted);">Incoming Receipts</div>
                        <div style="font-size:1.4rem; font-weight:800; color:white;">${b.receipts} <span style="font-size:0.75rem; color:var(--success); font-weight:600;">(${pRec}%)</span></div>
                    </div>
                    <div style="padding:0.85rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); border-left:4px solid var(--danger);">
                        <div style="font-size:0.75rem; color:var(--text-muted);">Outgoing Deliveries</div>
                        <div style="font-size:1.4rem; font-weight:800; color:white;">${b.deliveries} <span style="font-size:0.75rem; color:var(--danger); font-weight:600;">(${pDel}%)</span></div>
                    </div>
                    <div style="padding:0.85rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); border-left:4px solid var(--warning);">
                        <div style="font-size:0.75rem; color:var(--text-muted);">Internal Transfers</div>
                        <div style="font-size:1.4rem; font-weight:800; color:white;">${b.transfers} <span style="font-size:0.75rem; color:var(--warning); font-weight:600;">(${pTrf}%)</span></div>
                    </div>
                    <div style="padding:0.85rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); border-left:4px solid var(--info);">
                        <div style="font-size:0.75rem; color:var(--text-muted);">Stock Adjustments</div>
                        <div style="font-size:1.4rem; font-weight:800; color:white;">${b.adjustments} <span style="font-size:0.75rem; color:var(--info); font-weight:600;">(${pAdj}%)</span></div>
                    </div>
                </div>
            </div>
        `;
    },

    renderTopProducts(products = []) {
        const container = document.getElementById('dash-top-products-container');
        if (!products || products.length === 0) {
            container.innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem; text-align:center; padding:1.5rem;">No product activity recorded yet.</div>`;
            return;
        }

        container.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
                ${products.map(p => `
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0.75rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md);">
                        <div style="min-width:0; flex:1;">
                            <div style="font-size:0.85rem; font-weight:600; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.name}</div>
                            <div style="font-size:0.7rem; color:var(--text-muted); font-family:var(--font-mono);">${p.sku}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:0.85rem; font-weight:800; color:var(--primary-hover);">${p.total_volume.toLocaleString()} units</div>
                            <div style="font-size:0.65rem; color:var(--text-muted);">${p.movement_count} movements</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderWarehouseSummary(warehouses = []) {
        const container = document.getElementById('dash-wh-summary-container');
        container.innerHTML = warehouses.map(w => `
            <div class="tree-node" style="margin-bottom:1rem;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <div style="font-weight:700; color:var(--text-primary); font-size:0.95rem;">${w.name}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${w.address || 'Standard Logistics Facility'}</div>
                    </div>
                    <span class="badge badge-ready" style="font-family:var(--font-mono);">${w.code}</span>
                </div>
                <div style="display:flex; gap:1.25rem; margin-top:0.85rem; padding-top:0.75rem; border-top:1px solid var(--border-subtle); font-size:0.8rem;">
                    <div>
                        <span style="color:var(--text-muted);">Stock:</span>
                        <strong style="color:white; margin-left:0.25rem;">${w.totalStockQuantity} units</strong>
                    </div>
                    <div>
                        <span style="color:var(--text-muted);">Active SKUs:</span>
                        <strong style="color:white; margin-left:0.25rem;">${w.activeSkuCount}</strong>
                    </div>
                </div>
            </div>
        `).join('');
    },

    renderActivity(activities = []) {
        const container = document.getElementById('dash-activity-container');
        if (!activities || activities.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">No stock movements recorded yet.</div>`;
            return;
        }

        const typeMap = {
            RECEIPT: { label: 'RECEIPT', badgeClass: 'activity-badge-receipt', sign: '+' },
            DELIVERY: { label: 'DELIVERY', badgeClass: 'activity-badge-delivery', sign: '' },
            INTERNAL_TRANSFER: { label: 'TRANSFER', badgeClass: 'activity-badge-transfer', sign: '' },
            ADJUSTMENT: { label: 'ADJUSTMENT', badgeClass: 'activity-badge-adj', sign: '' },
            OPENING_BALANCE: { label: 'OPENING', badgeClass: 'activity-badge-receipt', sign: '+' }
        };

        container.innerHTML = `
            <div class="activity-feed-list">
                ${activities.map(a => {
                    const cfg = typeMap[a.movement_type] || { label: a.movement_type, badgeClass: 'activity-badge-receipt', sign: '' };
                    const signStr = a.quantity > 0 ? `+${a.quantity}` : `${a.quantity}`;
                    const qtyColor = a.quantity > 0 ? 'var(--success)' : 'var(--danger)';
                    return `
                        <div class="activity-item">
                            <div class="activity-info">
                                <div class="activity-icon-badge ${cfg.badgeClass}">
                                    ${cfg.label.slice(0, 3)}
                                </div>
                                <div>
                                    <div style="font-weight:600; color:var(--text-primary); font-size:0.85rem;">${a.product_name}</div>
                                    <div style="font-size:0.7rem; color:var(--text-muted); display:flex; gap:0.5rem; align-items:center;">
                                        <span style="font-family:var(--font-mono);">${a.product_sku}</span>
                                        <span>•</span>
                                        <span>${a.warehouse_name}</span>
                                        <span>•</span>
                                        <span>${new Date(a.created_at).toLocaleDateString()} ${new Date(a.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                                    </div>
                                </div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-weight:800; font-size:0.95rem; color:${qtyColor};">${signStr} ${a.uom_symbol}</div>
                                <div style="font-size:0.7rem; color:var(--text-muted);">${a.performed_by_name || 'System'}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
};

window.DashboardView = DashboardView;
