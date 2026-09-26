/**
 * Dashboard View - Simple with Receipt and Delivery Cards
 */
const DashboardView = {
    async render(container) {
        container.innerHTML = `
            <div style="margin-bottom:2rem;">
                <h1 style="font-size:1.75rem; font-weight:700; margin-bottom:0.25rem;">Dashboard</h1>
                <p style="font-size:1rem; color:var(--text-secondary);">Overview of incoming and outgoing warehouse operations.</p>
            </div>

            <!-- Receipt & Delivery Cards -->
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:1.5rem; margin-bottom:2rem;">
                <!-- Receipt Card -->
                <div class="card" style="padding:1.5rem; transition:transform var(--transition-fast), box-shadow var(--transition-fast);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-md)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                    <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:1rem;">
                        <div>
                            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
                                <div style="width:40px; height:40px; border-radius:var(--radius-md); background:var(--success-light); color:var(--success); display:flex; align-items:center; justify-content:center;">
                                    ${Icons.receipts}
                                </div>
                                <h2 style="font-size:1.25rem; font-weight:700; color:var(--text-primary); margin:0;">Receipt</h2>
                            </div>
                            <p style="font-size:0.875rem; color:var(--text-secondary); margin:0;">Incoming warehouse operations</p>
                        </div>
                        <span class="badge badge-ready">Live</span>
                    </div>

                    <div style="margin-bottom:1.5rem;">
                        <div style="font-size:2.5rem; font-weight:800; color:var(--text-primary);" id="dash-receipt-count">0</div>
                        <div style="font-size:0.875rem; color:var(--text-secondary);">pending receipts</div>
                    </div>

                    <button class="btn btn-primary" style="width:100%;" onclick="window.location.hash='#operations/receipts'">
                        ${Icons.arrowRight} View Receipts
                    </button>
                </div>

                <!-- Delivery Card -->
                <div class="card" style="padding:1.5rem; transition:transform var(--transition-fast), box-shadow var(--transition-fast);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-md)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                    <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:1rem;">
                        <div>
                            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
                                <div style="width:40px; height:40px; border-radius:var(--radius-md); background:var(--danger-light); color:var(--danger); display:flex; align-items:center; justify-content:center;">
                                    ${Icons.deliveries}
                                </div>
                                <h2 style="font-size:1.25rem; font-weight:700; color:var(--text-primary); margin:0;">Delivery</h2>
                            </div>
                            <p style="font-size:0.875rem; color:var(--text-secondary); margin:0;">Outgoing warehouse operations</p>
                        </div>
                        <span class="badge badge-ready">Live</span>
                    </div>

                    <div style="margin-bottom:1.5rem;">
                        <div style="font-size:2.5rem; font-weight:800; color:var(--text-primary);" id="dash-delivery-count">0</div>
                        <div style="font-size:0.875rem; color:var(--text-secondary);">pending deliveries</div>
                    </div>

                    <button class="btn btn-primary" style="width:100%;" onclick="window.location.hash='#operations/deliveries'">
                        ${Icons.arrowRight} View Deliveries
                    </button>
                </div>
            </div>

            <!-- Quick Stats Row -->
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:2rem;">
                <div class="card" style="padding:1.25rem; text-align:center;">
                    <div style="font-size:2rem; font-weight:800; color:var(--primary);" id="dash-total-products">0</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Total Products</div>
                </div>
                <div class="card" style="padding:1.25rem; text-align:center;">
                    <div style="font-size:2rem; font-weight:800; color:var(--success);" id="dash-total-stock">0</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Units in Stock</div>
                </div>
                <div class="card" style="padding:1.25rem; text-align:center;">
                    <div style="font-size:2rem; font-weight:800; color:var(--secondary);" id="dash-stock-value">$0</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Stock Value</div>
                </div>
                <div class="card" style="padding:1.25rem; text-align:center;">
                    <div style="font-size:2rem; font-weight:800; color:var(--warning);" id="dash-low-stock">0</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Low Stock Items</div>
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="card">
                <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="font-size:1rem; font-weight:700;">Recent Stock Movements</h3>
                    <a href="#move-history" class="btn btn-ghost btn-sm" style="color:var(--primary);">View All →</a>
                </div>
                <div class="card-body" id="dash-activity-container">
                    Loading recent activity...
                </div>
            </div>
        `;

        await this.loadData();
    },

    async loadData() {
        try {
            const [summary, activity] = await Promise.all([
                API.getDashboardSummary({}),
                API.getDashboardActivity(10)
            ]);

            document.getElementById('dash-receipt-count').textContent = summary.pendingReceipts;
            document.getElementById('dash-delivery-count').textContent = summary.pendingDeliveries;
            document.getElementById('dash-total-products').textContent = summary.totalProducts.toLocaleString();
            document.getElementById('dash-total-stock').textContent = summary.totalStockQuantity.toLocaleString();
            document.getElementById('dash-stock-value').textContent = '$' + summary.totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            document.getElementById('dash-low-stock').textContent = summary.lowStockCount;

            this.renderActivity(activity);
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
            Toast.error('Failed to load dashboard data: ' + err.message);
        }
    },

    renderActivity(activities = []) {
        const container = document.getElementById('dash-activity-container');
        if (!activities || activities.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">No stock movements recorded yet.</div>`;
            return;
        }

        const typeMap = {
            RECEIPT: { label: 'RECEIPT', class: 'badge-ready' },
            DELIVERY: { label: 'DELIVERY', class: 'badge-danger' },
            INTERNAL_TRANSFER: { label: 'TRANSFER', class: 'badge-warning' },
            ADJUSTMENT: { label: 'ADJUSTMENT', class: 'badge-info' },
            OPENING_BALANCE: { label: 'OPENING', class: 'badge-ready' }
        };

        container.innerHTML = `
            <div class="activity-feed-list">
                ${activities.map(a => {
                    const cfg = typeMap[a.movement_type] || { label: a.movement_type, class: 'badge-ready' };
                    const qtyColor = a.quantity > 0 ? 'var(--success)' : 'var(--danger)';
                    const qtySign = a.quantity > 0 ? '+' : '';
                    return `
                        <div class="activity-item">
                            <div class="activity-info">
                                <div class="activity-icon-badge ${cfg.class}">
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
                                <div style="font-weight:800; font-size:0.95rem; color:${qtyColor};">${a.quantity > 0 ? '+' + a.quantity : a.quantity} ${a.uom_symbol}</div>
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