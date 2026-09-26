/**
 * Notifications Center View
 */
const NotificationsView = {
    notifications: [],

    async render(container) {
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <h1 style="font-size:1.6rem; font-weight:800; margin-bottom:0.25rem;">Notifications Center</h1>
                    <p style="font-size:0.85rem; color:var(--text-secondary);">System alerts, operation confirmations, and approval requests.</p>
                </div>
                <div style="display:flex; gap:0.75rem;">
                    <button class="btn btn-secondary" id="btn-mark-all-read">
                        ${Icons.check} Mark All Read
                    </button>
                    <button class="btn btn-secondary" id="btn-refresh-notifs">
                        ${Icons.refresh}
                    </button>
                </div>
            </div>

            <!-- Unread Count Badge -->
            <div id="notif-summary" style="margin-bottom:1rem; padding:0.75rem 1rem; background:var(--bg-surface-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-md); display:flex; align-items:center; gap:1.5rem; font-size:0.85rem;">
                <span>Loading...</span>
            </div>

            <!-- Notifications List -->
            <div class="table-container" style="max-height:calc(100vh - 300px); overflow-y:auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width:40px;"></th>
                            <th>Title</th>
                            <th>Message</th>
                            <th>Type</th>
                            <th>Time</th>
                            <th style="width:120px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="notifications-table-body">
                        <tr><td colspan="6" style="text-align:center; padding:2rem;">Loading notifications...</td></tr>
                    </tbody>
                </table>
            </div>

            <div id="notifications-pagination" style="display:flex; justify-content:center; align-items:center; gap:1rem; margin-top:1rem; padding:1rem;"></div>
        `;

        await this.loadNotifications();

        document.getElementById('btn-mark-all-read').onclick = async () => {
            try {
                await API.markAllNotificationsRead();
                Toast.success('All notifications marked as read');
                this.loadNotifications();
            } catch (e) {
                Toast.error(e.message);
            }
        };

        document.getElementById('btn-refresh-notifs').onclick = () => this.loadNotifications();
    },

    async loadNotifications() {
        const tbody = document.getElementById('notifications-table-body');
        const summary = document.getElementById('notif-summary');
        try {
            const res = await API.getNotifications();
            this.notifications = res.items || [];

            const unreadCount = res.unreadCount || 0;
            summary.innerHTML = `
                <span style="color:var(--text-primary);">Total: <strong>${this.notifications.length}</strong></span>
                <span style="color:${unreadCount > 0 ? 'var(--warning)' : 'var(--success)'};">Unread: <strong>${unreadCount}</strong></span>
                <span style="color:var(--text-muted);">Organization-wide alerts shown</span>
            `;

            if (this.notifications.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2.5rem; color:var(--text-muted);">No notifications yet. You'll see alerts here when stock operations occur.</td></tr>`;
                return;
            }

            const typeConfig = {
                LOW_STOCK: { icon: Icons.alert, color: 'var(--warning)', label: 'Low Stock' },
                OUT_OF_STOCK: { icon: Icons.x, color: 'var(--danger)', label: 'Out of Stock' },
                RECEIPT_VALIDATED: { icon: Icons.receipts, color: 'var(--success)', label: 'Receipt' },
                DELIVERY_VALIDATED: { icon: Icons.deliveries, color: 'var(--info)', label: 'Delivery' },
                TRANSFER_COMPLETED: { icon: Icons.transfers, color: 'var(--primary)', label: 'Transfer' },
                ADJUSTMENT_PENDING: { icon: Icons.adjustments, color: 'var(--warning)', label: 'Adj. Pending' },
                SYSTEM: { icon: Icons.alert, color: 'var(--secondary)', label: 'System' }
            };

            tbody.innerHTML = this.notifications.map(n => {
                const cfg = typeConfig[n.type] || { icon: Icons.alert, color: 'var(--text-muted)', label: n.type };
                const timeAgo = this.getTimeAgo(n.created_at);
                return `
                    <tr class="${n.is_read ? '' : 'notification-unread'}" style="${n.is_read ? '' : 'background:var(--primary-light);'}" id="notif-${n.id}">
                        <td style="text-align:center;">
                            ${!n.is_read ? `<div class="badge-dot" style="background:${cfg.color}; width:8px; height:8px; border-radius:50%; margin:0 auto;"></div>` : ''}
                        </td>
                        <td>
                            <div style="font-weight:${n.is_read ? '500' : '700'}; color:var(--text-primary);">${n.title}</div>
                        </td>
                        <td style="font-size:0.85rem; color:var(--text-secondary); max-width:350px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${n.message}</td>
                        <td>
                            <span class="badge" style="background:${cfg.color}15; color:${cfg.color}; border-color:${cfg.color}40;">
                                ${cfg.icon} ${cfg.label}
                            </span>
                        </td>
                        <td style="font-size:0.75rem; color:var(--text-muted); white-space:nowrap;">${timeAgo}</td>
                        <td style="text-align:right;">
                            ${!n.is_read ? `<button class="btn btn-secondary btn-sm" onclick="NotificationsView.markAsRead('${n.id}')">Mark Read</button>` : ''}
                            ${n.related_entity_type && n.related_entity_id ? `<button class="btn btn-ghost btn-sm" onclick="NotificationsView.navigateToEntity('${n.related_entity_type}', '${n.related_entity_id}')">View</button>` : ''}
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--danger);">Error loading notifications: ${err.message}</td></tr>`;
        }
    },

    async markAsRead(notificationId) {
        try {
            await API.markNotificationRead(notificationId);
            const row = document.getElementById(`notif-${notificationId}`);
            if (row) {
                row.classList.remove('notification-unread');
                row.style.background = '';
                row.querySelector('td:last-child').innerHTML = '';
            }
            Toast.success('Marked as read');
        } catch (e) {
            Toast.error(e.message);
        }
    },

    navigateToEntity(entityType, entityId) {
        const routes = {
            'receipt': '#receipts',
            'delivery': '#deliveries',
            'transfer': '#transfers',
            'adjustment': '#adjustments',
            'product': '#products'
        };
        const route = routes[entityType];
        if (route) {
            window.location.hash = route;
            // Store the entity ID to auto-open detail modal
            sessionStorage.setItem('openDetail', JSON.stringify({ type: entityType, id: entityId }));
        }
    },

    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }
};

window.NotificationsView = NotificationsView;