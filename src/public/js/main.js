/**
 * StockSense Main Application Entry Point
 * SPA Router, App Shell, Authentication Guard, and Global Event Handlers
 */
const App = {
    routes: {
        '#auth': { view: 'AuthView', render: 'render', requiresAuth: false },
        '#dashboard': { view: 'DashboardView', render: 'render', requiresAuth: true },
        '#products': { view: 'ProductsView', render: 'render', requiresAuth: true },
        '#receipts': { view: 'ReceiptsView', render: 'render', requiresAuth: true },
        '#deliveries': { view: 'DeliveriesView', render: 'render', requiresAuth: true },
        '#transfers': { view: 'TransfersView', render: 'render', requiresAuth: true },
        '#adjustments': { view: 'AdjustmentsView', render: 'render', requiresAuth: true },
        '#inventory': { view: 'InventoryView', render: 'render', requiresAuth: true },
        '#notifications': { view: 'NotificationsView', render: 'render', requiresAuth: true },
        '#settings': { view: 'SettingsView', render: 'render', requiresAuth: true },
        '#warehouses': { view: 'WarehousesView', render: 'render', requiresAuth: true }
    },

    currentView: null,
    currentRoute: null,
    sidebarOpen: false,

    async init() {
        // Check for existing session
        if (State.isAuthenticated()) {
            try {
                const userData = await API.getMe();
                State.setUser(userData);
            } catch (e) {
                console.warn('Session validation failed, redirecting to auth');
                State.logout();
            }
        }

        // Initial route
        this.handleHashChange();
        window.addEventListener('hashchange', () => this.handleHashChange());

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.focusSearch();
            }
            if (e.key === 'Escape') {
                Modal.close();
            }
        });

        console.log('StockSense application initialized');
    },

    handleHashChange() {
        const hash = window.location.hash || '#auth';
        const routeKey = Object.keys(this.routes).find(r => hash.startsWith(r)) || '#auth';
        const route = this.routes[routeKey];

        // Auth guard
        if (route.requiresAuth && !State.isAuthenticated()) {
            window.location.hash = '#auth';
            return;
        }

        if (!route.requiresAuth && State.isAuthenticated() && hash === '#auth') {
            window.location.hash = '#dashboard';
            return;
        }

        this.currentRoute = routeKey;
        this.renderRoute(routeKey, route);
        this.updateSidebarActiveState(routeKey);
    },

    async renderRoute(routeKey, route) {
        const root = document.getElementById('app');

        if (!route.requiresAuth) {
            // Auth pages - full screen, no shell
            root.innerHTML = '';
            const view = window[route.view];
            if (view && typeof view[route.render] === 'function') {
                view[route.render](root);
                this.currentView = view;
            }
            return;
        }

        // Authenticated - render app shell if not already rendered
        if (!document.querySelector('.app-sidebar')) {
            this.renderAppShell(root);
        }

        // Render view into content area
        const contentArea = document.getElementById('app-content');
        if (!contentArea) return;

        const view = window[route.view];
        if (view && typeof view[route.render] === 'function') {
            try {
                await view.render(contentArea);
                this.currentView = view;
            } catch (e) {
                console.error('View render error:', e);
                contentArea.innerHTML = `<div class="card" style="padding:3rem; text-align:center; color:var(--danger);">Failed to load view: ${e.message}</div>`;
            }
        }

        // Update page title in topbar
        this.updateTopbarTitle(routeKey);
    },

    renderAppShell(root) {
        root.innerHTML = `
            <!-- Sidebar Overlay for Mobile -->
            <div class="sidebar-overlay" id="sidebar-overlay"></div>

            <!-- Sidebar Navigation -->
            <aside class="app-sidebar" id="app-sidebar">
                <div class="sidebar-header">
                    <div class="brand-logo-container" onclick="window.location.hash='#dashboard'">
                        <div class="brand-icon-svg">${Icons.logo}</div>
                        <span class="brand-title">StockSense</span>
                        <span class="brand-badge">IMS</span>
                    </div>
                </div>

                <nav class="sidebar-nav" id="sidebar-nav">
                    <div class="nav-group-title">Operations</div>
                    <div class="nav-group-items">
                        <a class="nav-link" href="#dashboard" data-route="#dashboard">
                            <span class="nav-link-icon">${Icons.dashboard}</span>
                            <span>Dashboard</span>
                        </a>
                        <a class="nav-link" href="#receipts" data-route="#receipts">
                            <span class="nav-link-icon">${Icons.receipts}</span>
                            <span>Receipts</span>
                            <span class="nav-link-badge" id="nav-badge-receipts" style="display:none;">0</span>
                        </a>
                        <a class="nav-link" href="#deliveries" data-route="#deliveries">
                            <span class="nav-link-icon">${Icons.deliveries}</span>
                            <span>Deliveries</span>
                            <span class="nav-link-badge" id="nav-badge-deliveries" style="display:none;">0</span>
                        </a>
                        <a class="nav-link" href="#transfers" data-route="#transfers">
                            <span class="nav-link-icon">${Icons.transfers}</span>
                            <span>Transfers</span>
                            <span class="nav-link-badge" id="nav-badge-transfers" style="display:none;">0</span>
                        </a>
                        <a class="nav-link" href="#adjustments" data-route="#adjustments">
                            <span class="nav-link-icon">${Icons.adjustments}</span>
                            <span>Adjustments</span>
                            <span class="nav-link-badge" id="nav-badge-adjustments" style="display:none;">0</span>
                        </a>
                    </div>

                    <div class="nav-group-title">Catalog</div>
                    <div class="nav-group-items">
                        <a class="nav-link" href="#products" data-route="#products">
                            <span class="nav-link-icon">${Icons.products}</span>
                            <span>Products</span>
                        </a>
                        <a class="nav-link" href="#warehouses" data-route="#warehouses">
                            <span class="nav-link-icon">${Icons.warehouses}</span>
                            <span>Warehouses</span>
                        </a>
                    </div>

                    <div class="nav-group-title">Insights</div>
                    <div class="nav-group-items">
                        <a class="nav-link" href="#inventory" data-route="#inventory">
                            <span class="nav-link-icon">${Icons.ledger}</span>
                            <span>Stock Ledger</span>
                        </a>
                        <a class="nav-link" href="#notifications" data-route="#notifications">
                            <span class="nav-link-icon">${Icons.notifications}</span>
                            <span>Notifications</span>
                            <span class="nav-link-badge" id="nav-badge-notifs" style="display:none;">0</span>
                        </a>
                    </div>

                    <div class="nav-group-title">System</div>
                    <div class="nav-group-items">
                        <a class="nav-link" href="#settings" data-route="#settings">
                            <span class="nav-link-icon">${Icons.settings}</span>
                            <span>Settings</span>
                        </a>
                        <a class="nav-link" href="#audit" data-route="#audit">
                            <span class="nav-link-icon">${Icons.auditLogs}</span>
                            <span>Audit Logs</span>
                        </a>
                    </div>
                </nav>

                <div class="sidebar-footer">
                    <div class="user-profile-card" id="user-profile-card">
                        <div class="user-avatar-circle" id="user-avatar">
                            ${Icons.profile}
                        </div>
                        <div class="user-info">
                            <div class="user-name" id="user-display-name">User</div>
                            <div class="user-role-tag" id="user-display-role">Role</div>
                        </div>
                        <button class="btn btn-ghost btn-icon" onclick="App.showUserMenu()">${Icons.menu}</button>
                    </div>
                </div>
            </aside>

            <!-- Main Content Area -->
            <main class="app-main">
                <header class="app-topbar">
                    <div class="topbar-left">
                        <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Toggle navigation">${Icons.menu}</button>
                        <h1 class="topbar-page-title" id="topbar-page-title">Dashboard</h1>
                    </div>
                    <div class="topbar-right">
                        <button class="btn btn-ghost btn-icon" id="notif-bell-btn" onclick="window.location.hash='#notifications'" aria-label="Notifications">
                            ${Icons.notifications}
                            <span class="nav-link-badge" id="topbar-notif-badge" style="display:none;">0</span>
                        </button>
                        <button class="btn btn-ghost btn-icon" id="logout-btn" onclick="App.logout()" aria-label="Logout">
                            ${Icons.logout}
                        </button>
                    </div>
                </header>
                <div class="app-content" id="app-content">
                    <!-- View content rendered here -->
                </div>
            </main>
        `;

        // Setup sidebar interactions
        this.setupSidebarEvents();
        this.updateUserProfile();
    },

    setupSidebarEvents() {
        const sidebar = document.getElementById('app-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const mobileBtn = document.getElementById('mobile-menu-btn');

        // Mobile menu toggle
        mobileBtn?.addEventListener('click', () => this.toggleSidebar());
        overlay?.addEventListener('click', () => this.closeSidebar());

        // Close sidebar on navigation click (mobile)
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => this.closeSidebar());
        });
    },

    toggleSidebar() {
        const sidebar = document.getElementById('app-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        this.sidebarOpen = !this.sidebarOpen;
        sidebar?.classList.toggle('open', this.sidebarOpen);
        overlay?.classList.toggle('active', this.sidebarOpen);
    },

    closeSidebar() {
        const sidebar = document.getElementById('app-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        this.sidebarOpen = false;
        sidebar?.classList.remove('open');
        overlay?.classList.remove('active');
    },

    updateSidebarActiveState(routeKey) {
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            if (href === routeKey || (routeKey.startsWith(href) && href !== '#dashboard')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    },

    updateTopbarTitle(routeKey) {
        const titles = {
            '#dashboard': 'Dashboard',
            '#products': 'Products & Catalog',
            '#receipts': 'Incoming Receipts',
            '#deliveries': 'Delivery Orders',
            '#transfers': 'Internal Transfers',
            '#adjustments': 'Stock Adjustments',
            '#inventory': 'Stock Ledger',
            '#notifications': 'Notifications',
            '#settings': 'Settings',
            '#warehouses': 'Warehouses & Locations'
        };
        const title = titles[routeKey] || 'StockSense';
        document.getElementById('topbar-page-title').textContent = title;
    },

    updateUserProfile() {
        if (!State.user) return;
        const nameEl = document.getElementById('user-display-name');
        const roleEl = document.getElementById('user-display-role');
        const avatarEl = document.getElementById('user-avatar');

        if (nameEl) nameEl.textContent = State.user.name || 'User';
        if (roleEl) roleEl.textContent = State.user.role || 'VIEWER';
        if (avatarEl && State.user.name) {
            avatarEl.textContent = State.user.name.charAt(0).toUpperCase();
            avatarEl.innerHTML = State.user.name.charAt(0).toUpperCase();
        }
    },

    showUserMenu() {
        if (!State.user) return;
        Modal.open({
            title: 'User Menu',
            content: `
                <div style="display:flex; flex-direction:column; gap:0.75rem;">
                    <div style="padding:1rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md);">
                        <div style="font-weight:700; color:var(--text-primary);">${State.user.name}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">${State.user.email}</div>
                        <div style="font-size:0.7rem; color:var(--primary-hover); margin-top:0.25rem;">${State.user.role} • ${State.user.organization_name}</div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:0.5rem;">
                        <button class="btn btn-secondary" onclick="window.location.hash='#settings'; Modal.close()">
                            ${Icons.settings} Account Settings
                        </button>
                        <button class="btn btn-danger" onclick="App.logout()">
                            ${Icons.logout} Sign Out
                        </button>
                    </div>
                </div>
            `,
            footer: ''
        });
    },

    logout() {
        if (State.refreshToken) {
            API.logout().catch(() => {});
        }
        State.logout();
        Toast.info('You have been logged out');
    },

    focusSearch() {
        const inputs = document.querySelectorAll('input[type="text"], input[type="search"]');
        if (inputs.length > 0) inputs[0].focus();
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());

// Expose globally for inline handlers
window.App = App;