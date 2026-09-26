/**
 * StockSense API Client with JWT Bearer Interception & Token Refresh
 */
const API = {
    baseUrl: '/api/v1',

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        if (State.accessToken) {
            headers['Authorization'] = `Bearer ${State.accessToken}`;
        }

        try {
            let response = await fetch(url, {
                method: options.method || 'GET',
                headers,
                body: options.body ? JSON.stringify(options.body) : undefined
            });

            // Handle 401 Unauthorized with token refresh attempt
            if (response.status === 401 && State.refreshToken && !endpoint.includes('/auth/')) {
                const refreshed = await this.tryRefreshToken();
                if (refreshed) {
                    headers['Authorization'] = `Bearer ${State.accessToken}`;
                    response = await fetch(url, {
                        method: options.method || 'GET',
                        headers,
                        body: options.body ? JSON.stringify(options.body) : undefined
                    });
                } else {
                    State.logout();
                    throw new Error('Your session has expired. Please log in again.');
                }
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Server error occurred');
            }

            return data.data;
        } catch (error) {
            console.error(`API Error on ${endpoint}:`, error);
            throw error;
        }
    },

    async tryRefreshToken() {
        try {
            const res = await fetch(`${this.baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: State.refreshToken })
            });
            if (res.ok) {
                const json = await res.json();
                State.setTokens(json.data.accessToken, json.data.refreshToken);
                return true;
            }
        } catch (e) {
            // refresh failed
        }
        return false;
    },

    // Auth
    login: (credentials) => API.request('/auth/login', { method: 'POST', body: credentials }),
    register: (data) => API.request('/auth/register', { method: 'POST', body: data }),
    logout: () => API.request('/auth/logout', { method: 'POST', body: { refreshToken: State.refreshToken } }),
    getMe: () => API.request('/auth/me'),
    switchDemo: (role) => API.request('/auth/demo-switch', { method: 'POST', body: { role } }),
    forgotPassword: (email) => API.request('/auth/forgot-password', { method: 'POST', body: { email } }),
    verifyOtp: (email, otp) => API.request('/auth/verify-otp', { method: 'POST', body: { email, otp } }),
    resetPassword: (email, otp, newPassword) => API.request('/auth/reset-password', { method: 'POST', body: { email, otp, newPassword } }),

    // Dashboard
    getDashboardSummary: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return API.request(`/dashboard/summary${q ? '?' + q : ''}`);
    },
    getDashboardActivity: (limit = 15) => API.request(`/dashboard/activity?limit=${limit}`),
    getDashboardWarehouseSummary: () => API.request('/dashboard/warehouse-summary'),
    getDashboardCharts: () => API.request('/dashboard/charts'),

    // Products
    getProducts: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return API.request(`/products${q ? '?' + q : ''}`);
    },
    getProduct: (id) => API.request(`/products/${id}`),
    createProduct: (data) => API.request('/products', { method: 'POST', body: data }),
    updateProduct: (id, data) => API.request(`/products/${id}`, { method: 'PATCH', body: data }),
    getCategories: () => API.request('/products/categories'),
    createCategory: (data) => API.request('/products/categories', { method: 'POST', body: data }),
    getUoms: () => API.request('/products/uoms'),
    createUom: (data) => API.request('/products/uoms', { method: 'POST', body: data }),

    // Warehouses & Locations
    getWarehouses: () => API.request('/warehouses'),
    getWarehouse: (id) => API.request(`/warehouses/${id}`),
    createWarehouse: (data) => API.request('/warehouses', { method: 'POST', body: data }),
    updateWarehouse: (id, data) => API.request(`/warehouses/${id}`, { method: 'PATCH', body: data }),
    getLocations: (warehouseId = null) => API.request(`/warehouses/locations${warehouseId ? '?warehouseId=' + warehouseId : ''}`),
    createLocation: (data) => API.request('/warehouses/locations', { method: 'POST', body: data }),

    // Receipts
    getReceipts: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return API.request(`/receipts${q ? '?' + q : ''}`);
    },
    getReceipt: (id) => API.request(`/receipts/${id}`),
    createReceipt: (data) => API.request('/receipts', { method: 'POST', body: data }),
    updateReceiptStatus: (id, status) => API.request(`/receipts/${id}/status`, { method: 'PATCH', body: { status } }),
    validateReceipt: (id) => API.request(`/receipts/${id}/validate`, { method: 'POST' }),
    cancelReceipt: (id) => API.request(`/receipts/${id}/cancel`, { method: 'POST' }),

    // Deliveries
    getDeliveries: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return API.request(`/deliveries${q ? '?' + q : ''}`);
    },
    getDelivery: (id) => API.request(`/deliveries/${id}`),
    createDelivery: (data) => API.request('/deliveries', { method: 'POST', body: data }),
    updateDeliveryStatus: (id, status) => API.request(`/deliveries/${id}/status`, { method: 'PATCH', body: { status } }),
    validateDelivery: (id) => API.request(`/deliveries/${id}/validate`, { method: 'POST' }),
    cancelDelivery: (id) => API.request(`/deliveries/${id}/cancel`, { method: 'POST' }),

    // Transfers
    getTransfers: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return API.request(`/transfers${q ? '?' + q : ''}`);
    },
    getTransfer: (id) => API.request(`/transfers/${id}`),
    createTransfer: (data) => API.request('/transfers', { method: 'POST', body: data }),
    updateTransferStatus: (id, status) => API.request(`/transfers/${id}/status`, { method: 'PATCH', body: { status } }),
    validateTransfer: (id) => API.request(`/transfers/${id}/validate`, { method: 'POST' }),
    cancelTransfer: (id) => API.request(`/transfers/${id}/cancel`, { method: 'POST' }),

    // Adjustments
    getAdjustments: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return API.request(`/adjustments${q ? '?' + q : ''}`);
    },
    getAdjustment: (id) => API.request(`/adjustments/${id}`),
    createAdjustment: (data) => API.request('/adjustments', { method: 'POST', body: data }),
    approveAdjustment: (id) => API.request(`/adjustments/${id}/approve`, { method: 'POST' }),
    rejectAdjustment: (id) => API.request(`/adjustments/${id}/reject`, { method: 'POST' }),

    // Inventory & Ledger
    getBalances: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return API.request(`/inventory/balances${q ? '?' + q : ''}`);
    },
    getLedger: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return API.request(`/inventory/ledger${q ? '?' + q : ''}`);
    },

    // Notifications
    getNotifications: () => API.request('/notifications'),
    markNotificationRead: (id) => API.request(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllNotificationsRead: () => API.request('/notifications/read-all', { method: 'PATCH' }),

    // Audit & Settings
    getAuditLogs: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return API.request(`/audit-logs${q ? '?' + q : ''}`);
    },
    getOrgSettings: () => API.request('/settings/organization'),
    updateOrgSettings: (data) => API.request('/settings/organization', { method: 'PATCH', body: data }),
    getInventorySettings: () => API.request('/settings/inventory'),
    updateInventorySettings: (data) => API.request('/settings/inventory', { method: 'PATCH', body: data }),

    // Warehouses
    getWarehouses: () => API.request('/warehouses'),
    getWarehouse: (id) => API.request(`/warehouses/${id}`),
    createWarehouse: (data) => API.request('/warehouses', { method: 'POST', body: data }),
    updateWarehouse: (id, data) => API.request(`/warehouses/${id}`, { method: 'PATCH', body: data }),
    getLocations: (warehouseId = null) => API.request(`/warehouses/locations${warehouseId ? '?warehouseId=' + warehouseId : ''}`),
    createLocation: (data) => API.request('/warehouses/locations', { method: 'POST', body: data })
};

window.API = API;
