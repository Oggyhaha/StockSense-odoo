/**
 * StockSense Global Client State Store
 */
class StateStore {
    constructor() {
        this.user = null;
        this.accessToken = localStorage.getItem('stocksense_access_token');
        this.refreshToken = localStorage.getItem('stocksense_refresh_token');
        this.activeView = 'dashboard';
        this.warehouses = [];
        this.categories = [];
        this.uoms = [];
        this.notifications = [];
        this.unreadNotifsCount = 0;
        this.listeners = new Map();
    }

    setTokens(accessToken, refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        if (accessToken) {
            localStorage.setItem('stocksense_access_token', accessToken);
        } else {
            localStorage.removeItem('stocksense_access_token');
        }
        if (refreshToken) {
            localStorage.setItem('stocksense_refresh_token', refreshToken);
        } else {
            localStorage.removeItem('stocksense_refresh_token');
        }
        this.emit('authChange', this.isAuthenticated());
    }

    setUser(user) {
        this.user = user;
        this.emit('userChange', user);
    }

    isAuthenticated() {
        return !!this.accessToken;
    }

    logout() {
        this.setTokens(null, null);
        this.setUser(null);
        window.location.hash = '#auth';
    }

    hasPermission(permission) {
        if (!this.user) return false;
        if (this.user.role === 'ADMIN') return true;
        return this.user.permissions && this.user.permissions.includes(permission);
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => cb(data));
        }
    }
}

window.State = new StateStore();
