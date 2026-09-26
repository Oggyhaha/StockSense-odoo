-- StockSense Complete SQL Schema (SQLite & PostgreSQL Compatible)
-- Designed for enterprise Multi-Warehouse Inventory Management System

CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    currency TEXT DEFAULT 'USD',
    timezone TEXT DEFAULT 'UTC',
    allow_negative_stock INTEGER DEFAULT 0,
    adjustment_approval_threshold REAL DEFAULT 500.0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    is_active INTEGER DEFAULT 1,
    last_login_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id TEXT NOT NULL,
    permission_id TEXT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS otp_requests (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    is_used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    address TEXT,
    contact_person TEXT,
    contact_number TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    parent_location_id TEXT,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    location_type TEXT NOT NULL CHECK(location_type IN ('INTERNAL', 'RECEIVING', 'STORAGE', 'PRODUCTION', 'DISPATCH', 'SCRAP', 'VIRTUAL')),
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_location_id) REFERENCES locations(id) ON DELETE SET NULL,
    UNIQUE(warehouse_id, code)
);

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS units_of_measure (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(organization_id, symbol)
);

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    barcode TEXT,
    category_id TEXT NOT NULL,
    uom_id TEXT NOT NULL,
    description TEXT,
    min_stock_level REAL DEFAULT 0,
    reorder_quantity REAL DEFAULT 0,
    unit_cost REAL DEFAULT 0.0,
    image_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_by TEXT,
    updated_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (uom_id) REFERENCES units_of_measure(id),
    UNIQUE(organization_id, sku)
);

CREATE TABLE IF NOT EXISTS inventory_balances (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    quantity REAL DEFAULT 0.0,
    reserved_quantity REAL DEFAULT 0.0,
    version INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    UNIQUE(organization_id, product_id, location_id)
);

CREATE TABLE IF NOT EXISTS stock_ledger (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    source_location_id TEXT,
    destination_location_id TEXT,
    movement_type TEXT NOT NULL CHECK(movement_type IN ('RECEIPT', 'DELIVERY', 'INTERNAL_TRANSFER', 'ADJUSTMENT', 'RETURN', 'OPENING_BALANCE')),
    quantity REAL NOT NULL,
    reference_type TEXT NOT NULL,
    reference_id TEXT NOT NULL,
    previous_quantity REAL NOT NULL,
    new_quantity REAL NOT NULL,
    reason TEXT,
    idempotency_key TEXT UNIQUE,
    performed_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (source_location_id) REFERENCES locations(id),
    FOREIGN KEY (destination_location_id) REFERENCES locations(id),
    FOREIGN KEY (performed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    receipt_number TEXT NOT NULL,
    supplier_name TEXT,
    warehouse_id TEXT NOT NULL,
    receiving_location_id TEXT NOT NULL,
    expected_date TEXT,
    received_date TEXT,
    reference_number TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'WAITING', 'READY', 'DONE', 'CANCELED')),
    created_by TEXT,
    updated_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (receiving_location_id) REFERENCES locations(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(organization_id, receipt_number)
);

CREATE TABLE IF NOT EXISTS receipt_items (
    id TEXT PRIMARY KEY,
    receipt_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    expected_quantity REAL DEFAULT 0.0,
    received_quantity REAL NOT NULL,
    notes TEXT,
    FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS deliveries (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    delivery_number TEXT NOT NULL,
    customer_name TEXT,
    warehouse_id TEXT NOT NULL,
    source_location_id TEXT NOT NULL,
    scheduled_date TEXT,
    shipped_date TEXT,
    reference_number TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'WAITING', 'READY', 'PICKING', 'PACKED', 'DONE', 'CANCELED')),
    created_by TEXT,
    updated_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (source_location_id) REFERENCES locations(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(organization_id, delivery_number)
);

CREATE TABLE IF NOT EXISTS delivery_items (
    id TEXT PRIMARY KEY,
    delivery_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    ordered_quantity REAL NOT NULL,
    picked_quantity REAL DEFAULT 0.0,
    packed_quantity REAL DEFAULT 0.0,
    delivered_quantity REAL DEFAULT 0.0,
    notes TEXT,
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS internal_transfers (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    transfer_number TEXT NOT NULL,
    source_warehouse_id TEXT NOT NULL,
    source_location_id TEXT NOT NULL,
    destination_warehouse_id TEXT NOT NULL,
    destination_location_id TEXT NOT NULL,
    scheduled_date TEXT,
    completed_date TEXT,
    reason TEXT,
    responsible_user_id TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'WAITING', 'IN_TRANSIT', 'DONE', 'CANCELED')),
    created_by TEXT,
    updated_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (source_warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (source_location_id) REFERENCES locations(id),
    FOREIGN KEY (destination_warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (destination_location_id) REFERENCES locations(id),
    FOREIGN KEY (responsible_user_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(organization_id, transfer_number)
);

CREATE TABLE IF NOT EXISTS internal_transfer_items (
    id TEXT PRIMARY KEY,
    transfer_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    notes TEXT,
    FOREIGN KEY (transfer_id) REFERENCES internal_transfers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    adjustment_number TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    adjustment_date TEXT DEFAULT (datetime('now')),
    reason_category TEXT NOT NULL CHECK(reason_category IN ('DAMAGED', 'LOST', 'FOUND', 'COUNTING_ERROR', 'OPENING_BALANCE', 'OTHER')),
    detailed_reason TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DONE', 'CANCELED')),
    created_by TEXT,
    updated_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(organization_id, adjustment_number)
);

CREATE TABLE IF NOT EXISTS stock_adjustment_items (
    id TEXT PRIMARY KEY,
    adjustment_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    system_quantity REAL NOT NULL,
    counted_quantity REAL NOT NULL,
    difference REAL NOT NULL,
    notes TEXT,
    FOREIGN KEY (adjustment_id) REFERENCES stock_adjustments(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    user_id TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    related_entity_type TEXT,
    related_entity_id TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Optimized Performance Indexes
CREATE INDEX IF NOT EXISTS idx_balances_prod_loc ON inventory_balances(product_id, location_id);
CREATE INDEX IF NOT EXISTS idx_balances_wh ON inventory_balances(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_ledger_prod ON stock_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_ledger_wh ON stock_ledger(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON stock_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_mtype ON stock_ledger(movement_type);
CREATE INDEX IF NOT EXISTS idx_ledger_ref ON stock_ledger(reference_id);
CREATE INDEX IF NOT EXISTS idx_receipts_org_status ON receipts(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_deliveries_org_status ON deliveries(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_transfers_org_status ON internal_transfers(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_adjustments_org_status ON stock_adjustments(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(organization_id, created_at);
