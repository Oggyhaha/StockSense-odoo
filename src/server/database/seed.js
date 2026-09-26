const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./connection');

function uuid() {
    return crypto.randomUUID();
}

function hashPassword(password) {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
}

function seedDatabase() {
    console.log('Seeding StockSense Enterprise Database...');

    // Clear existing data cleanly if running seed fresh
    db.transaction(() => {
        // Permissions
        const permissions = [
            { id: uuid(), name: 'product.view', category: 'Products', description: 'View products and stock levels' },
            { id: uuid(), name: 'product.create', category: 'Products', description: 'Create new products' },
            { id: uuid(), name: 'product.update', category: 'Products', description: 'Edit product details and rules' },
            { id: uuid(), name: 'product.delete', category: 'Products', description: 'Deactivate products' },
            { id: uuid(), name: 'warehouse.view', category: 'Warehouses', description: 'View warehouses and locations' },
            { id: uuid(), name: 'warehouse.manage', category: 'Warehouses', description: 'Create and update warehouses/locations' },
            { id: uuid(), name: 'receipt.view', category: 'Receipts', description: 'View incoming receipts' },
            { id: uuid(), name: 'receipt.create', category: 'Receipts', description: 'Create incoming receipts' },
            { id: uuid(), name: 'receipt.validate', category: 'Receipts', description: 'Validate receipts and increase stock' },
            { id: uuid(), name: 'receipt.cancel', category: 'Receipts', description: 'Cancel receipts' },
            { id: uuid(), name: 'delivery.view', category: 'Deliveries', description: 'View outgoing deliveries' },
            { id: uuid(), name: 'delivery.create', category: 'Deliveries', description: 'Create outgoing delivery orders' },
            { id: uuid(), name: 'delivery.validate', category: 'Deliveries', description: 'Validate delivery and decrease stock' },
            { id: uuid(), name: 'delivery.cancel', category: 'Deliveries', description: 'Cancel deliveries' },
            { id: uuid(), name: 'transfer.view', category: 'Transfers', description: 'View internal transfers' },
            { id: uuid(), name: 'transfer.create', category: 'Transfers', description: 'Create internal transfers' },
            { id: uuid(), name: 'transfer.validate', category: 'Transfers', description: 'Validate internal transfers' },
            { id: uuid(), name: 'adjustment.view', category: 'Adjustments', description: 'View stock adjustments' },
            { id: uuid(), name: 'adjustment.create', category: 'Adjustments', description: 'Create stock adjustments' },
            { id: uuid(), name: 'adjustment.approve', category: 'Adjustments', description: 'Approve and post adjustments' },
            { id: uuid(), name: 'report.view', category: 'Reports', description: 'View analytics and stock ledger' },
            { id: uuid(), name: 'user.manage', category: 'Users', description: 'Manage organization users and roles' },
            { id: uuid(), name: 'settings.manage', category: 'Settings', description: 'Manage organization settings' }
        ];

        for (const p of permissions) {
            db.execute(
                `INSERT OR IGNORE INTO permissions (id, name, category, description) VALUES (?, ?, ?, ?)`,
                [p.id, p.name, p.category, p.description]
            );
        }

        // Roles
        const roleAdminId = 'role-admin';
        const roleManagerId = 'role-manager';
        const roleStaffId = 'role-staff';
        const roleViewerId = 'role-viewer';

        db.execute(`INSERT OR REPLACE INTO roles (id, name, description) VALUES (?, ?, ?)`,
            [roleAdminId, 'ADMIN', 'Full system access and organization administration']);
        db.execute(`INSERT OR REPLACE INTO roles (id, name, description) VALUES (?, ?, ?)`,
            [roleManagerId, 'INVENTORY_MANAGER', 'Manage stock operations, receipts, deliveries, and validation']);
        db.execute(`INSERT OR REPLACE INTO roles (id, name, description) VALUES (?, ?, ?)`,
            [roleStaffId, 'WAREHOUSE_STAFF', 'Execute picking, packing, shelving, transfers, and counts']);
        db.execute(`INSERT OR REPLACE INTO roles (id, name, description) VALUES (?, ?, ?)`,
            [roleViewerId, 'VIEWER', 'Read-only access to inventory dashboards and reports']);

        // Link Role Permissions
        const allPerms = db.query(`SELECT id, name FROM permissions`);
        
        // ADMIN gets all permissions
        for (const perm of allPerms) {
            db.execute(`INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`, [roleAdminId, perm.id]);
        }

        // INVENTORY_MANAGER gets all except user.manage & settings.manage
        for (const perm of allPerms) {
            if (!['user.manage', 'settings.manage'].includes(perm.name)) {
                db.execute(`INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`, [roleManagerId, perm.id]);
            }
        }

        // WAREHOUSE_STAFF gets operational permissions
        const staffPermNames = [
            'product.view', 'warehouse.view', 'receipt.view', 'receipt.create',
            'delivery.view', 'delivery.create', 'transfer.view', 'transfer.create', 'transfer.validate',
            'adjustment.view', 'adjustment.create'
        ];
        for (const perm of allPerms) {
            if (staffPermNames.includes(perm.name)) {
                db.execute(`INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`, [roleStaffId, perm.id]);
            }
        }

        // VIEWER gets view permissions
        for (const perm of allPerms) {
            if (perm.name.endsWith('.view') || perm.name === 'report.view') {
                db.execute(`INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`, [roleViewerId, perm.id]);
            }
        }

        // Seed Default Organization
        const orgId = 'org-apex-global';
        db.execute(`
            INSERT OR REPLACE INTO organizations 
            (id, name, code, logo_url, currency, timezone, allow_negative_stock, adjustment_approval_threshold)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            orgId,
            'Apex Logistics & Manufacturing Ltd.',
            'APEX-CORP',
            '/images/logo.svg',
            'USD',
            'America/New_York',
            0,
            500.0
        ]);

        // Demo Users
        const commonPasswordHash = hashPassword('Password123!');
        const adminUserId = 'user-admin-01';
        const managerUserId = 'user-manager-01';
        const staffUserId = 'user-staff-01';
        const viewerUserId = 'user-viewer-01';

        const users = [
            {
                id: adminUserId,
                email: 'admin@stocksense.io',
                name: 'Alexander Vance',
                roleId: roleAdminId
            },
            {
                id: managerUserId,
                email: 'manager@stocksense.io',
                name: 'Sarah Jenkins',
                roleId: roleManagerId
            },
            {
                id: staffUserId,
                email: 'staff@stocksense.io',
                name: 'Marcus Brody',
                roleId: roleStaffId
            },
            {
                id: viewerUserId,
                email: 'viewer@stocksense.io',
                name: 'Elena Rostova',
                roleId: roleViewerId
            }
        ];

        for (const u of users) {
            db.execute(`
                INSERT OR REPLACE INTO users (id, organization_id, email, password_hash, name, timezone, is_active)
                VALUES (?, ?, ?, ?, ?, ?, 1)
            `, [u.id, orgId, u.email, commonPasswordHash, u.name, 'America/New_York']);

            db.execute(`INSERT OR REPLACE INTO user_roles (user_id, role_id) VALUES (?, ?)`, [u.id, u.roleId]);
        }

        // Categories
        const catRawMaterials = 'cat-raw';
        const catComponents = 'cat-comp';
        const catFinishedGoods = 'cat-fg';
        const catPackaging = 'cat-pack';

        const categories = [
            { id: catRawMaterials, name: 'Raw Materials', description: 'Metals, polymers, and bulk base stock' },
            { id: catComponents, name: 'Mechanical Components', description: 'Bearings, fasteners, gears, and motors' },
            { id: catFinishedGoods, name: 'Finished Goods', description: 'Assembled and packaged final products' },
            { id: catPackaging, name: 'Packaging Supplies', description: 'Corrugated boxes, wrap, pallets, and labels' }
        ];

        for (const c of categories) {
            db.execute(`INSERT OR REPLACE INTO categories (id, organization_id, name, description) VALUES (?, ?, ?, ?)`,
                [c.id, orgId, c.name, c.description]);
        }

        // Units of Measure
        const uomPcs = 'uom-pcs';
        const uomKg = 'uom-kg';
        const uomM = 'uom-m';
        const uomBox = 'uom-box';

        const uoms = [
            { id: uomPcs, name: 'Pieces', symbol: 'pcs', isDefault: 1 },
            { id: uomKg, name: 'Kilograms', symbol: 'kg', isDefault: 0 },
            { id: uomM, name: 'Meters', symbol: 'm', isDefault: 0 },
            { id: uomBox, name: 'Boxes (Pack of 50)', symbol: 'box', isDefault: 0 }
        ];

        for (const u of uoms) {
            db.execute(`INSERT OR REPLACE INTO units_of_measure (id, organization_id, name, symbol, is_default) VALUES (?, ?, ?, ?, ?)`,
                [u.id, orgId, u.name, u.symbol, u.isDefault]);
        }

        // Warehouses
        const whCentral = 'wh-central';
        const whNorth = 'wh-north';
        const whProduction = 'wh-production';

        const warehouses = [
            {
                id: whCentral,
                name: 'Central Distribution Center',
                code: 'CDC-01',
                address: '100 Industrial Parkway, Logan Township, NJ',
                contact_person: 'David Chen',
                contact_number: '+1 (555) 392-8810'
            },
            {
                id: whNorth,
                name: 'North Regional Hub',
                code: 'NRH-02',
                address: '450 Northern Gateway Blvd, Albany, NY',
                contact_person: 'Rachel Green',
                contact_number: '+1 (555) 782-9901'
            },
            {
                id: whProduction,
                name: 'Plant 4 Assembly Facility',
                code: 'PAF-04',
                address: '88 Precision Way, Bethlehem, PA',
                contact_person: 'Robert Torres',
                contact_number: '+1 (555) 234-1192'
            }
        ];

        for (const w of warehouses) {
            db.execute(`
                INSERT OR REPLACE INTO warehouses 
                (id, organization_id, name, code, address, contact_person, contact_number, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            `, [w.id, orgId, w.name, w.code, w.address, w.contact_person, w.contact_number]);
        }

        // Locations
        const locs = [
            // Central Warehouse Locations
            { id: 'loc-c-rec', wh: whCentral, parent: null, name: 'Receiving Dock 1', code: 'REC-01', type: 'RECEIVING' },
            { id: 'loc-c-bulk-a', wh: whCentral, parent: null, name: 'Bulk Aisle A', code: 'AISLE-A', type: 'STORAGE' },
            { id: 'loc-c-bulk-b', wh: whCentral, parent: null, name: 'Bulk Aisle B', code: 'AISLE-B', type: 'STORAGE' },
            { id: 'loc-c-rack-a1', wh: whCentral, parent: 'loc-c-bulk-a', name: 'High-Bay Rack A-01', code: 'RACK-A01', type: 'STORAGE' },
            { id: 'loc-c-disp', wh: whCentral, parent: null, name: 'Outbound Dispatch Bay', code: 'DISP-01', type: 'DISPATCH' },
            { id: 'loc-c-scrap', wh: whCentral, parent: null, name: 'Damaged & Quarantine Area', code: 'SCRAP-01', type: 'SCRAP' },

            // North Warehouse Locations
            { id: 'loc-n-rec', wh: whNorth, parent: null, name: 'North Inbound Dock', code: 'N-REC-01', type: 'RECEIVING' },
            { id: 'loc-n-storage', wh: whNorth, parent: null, name: 'North Main Staging', code: 'N-STG-01', type: 'STORAGE' },
            { id: 'loc-n-disp', wh: whNorth, parent: null, name: 'North Outbound Staging', code: 'N-DSP-01', type: 'DISPATCH' },

            // Production Plant Locations
            { id: 'loc-p-mat', wh: whProduction, parent: null, name: 'Raw Material Feed Store', code: 'P-MAT-01', type: 'STORAGE' },
            { id: 'loc-p-line', wh: whProduction, parent: null, name: 'Assembly Line 1', code: 'P-LINE-01', type: 'PRODUCTION' },
            { id: 'loc-p-disp', wh: whProduction, parent: null, name: 'Finished Goods Bay', code: 'P-FGB-01', type: 'DISPATCH' }
        ];

        for (const loc of locs) {
            db.execute(`
                INSERT OR REPLACE INTO locations 
                (id, organization_id, warehouse_id, parent_location_id, name, code, location_type, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            `, [loc.id, orgId, loc.wh, loc.parent, loc.name, loc.code, loc.type]);
        }

        // Products
        const prodSteelRod = 'prod-steel-rod';
        const prodSheetMetal = 'prod-sheet-metal';
        const prodBearings = 'prod-bearings';
        const prodBolts = 'prod-bolts';
        const prodMotor = 'prod-stepper-motor';
        const prodChair = 'prod-ergo-chair';
        const prodDesk = 'prod-standing-desk';
        const prodBoxes = 'prod-shipping-box';

        const products = [
            {
                id: prodSteelRod,
                name: 'High-Tensile Steel Rod 20mm x 3m',
                sku: 'RAW-STL-20MM',
                barcode: '890123450001',
                category_id: catRawMaterials,
                uom_id: uomPcs,
                description: 'Grade 304 structural alloy steel rod for frame fabrication.',
                min_stock_level: 25.0,
                reorder_quantity: 50.0,
                unit_cost: 18.50
            },
            {
                id: prodSheetMetal,
                name: 'Cold-Rolled Aluminum Sheet 2mm',
                sku: 'RAW-ALU-02MM',
                barcode: '890123450002',
                category_id: catRawMaterials,
                uom_id: uomKg,
                description: 'Aircraft grade 6061-T6 aluminum sheet stock.',
                min_stock_level: 100.0,
                reorder_quantity: 250.0,
                unit_cost: 8.75
            },
            {
                id: prodBearings,
                name: 'Precision Deep Groove Ball Bearing 608-2RS',
                sku: 'CMP-BRG-608',
                barcode: '890123450003',
                category_id: catComponents,
                uom_id: uomPcs,
                description: 'Rubber sealed high-speed ABEC-7 chrome steel bearings.',
                min_stock_level: 80.0,
                reorder_quantity: 200.0,
                unit_cost: 2.20
            },
            {
                id: prodBolts,
                name: 'M8 Stainless Steel Hex Flange Bolts',
                sku: 'CMP-BLT-M8-30',
                barcode: '890123450004',
                category_id: catComponents,
                uom_id: uomBox,
                description: 'DIN 6921 passivated stainless steel bolts, 50 pcs per box.',
                min_stock_level: 15.0,
                reorder_quantity: 40.0,
                unit_cost: 14.50
            },
            {
                id: prodMotor,
                name: 'NEMA 23 High Torque Stepper Motor',
                sku: 'CMP-MTR-NEMA23',
                barcode: '890123450005',
                category_id: catComponents,
                uom_id: uomPcs,
                description: 'Dual shaft 2.8A 1.8 degree bipolar stepper motor.',
                min_stock_level: 10.0,
                reorder_quantity: 30.0,
                unit_cost: 32.00
            },
            {
                id: prodChair,
                name: 'StockSense Ergonomic Pro Mesh Chair',
                sku: 'FG-CHR-ERGOPRO',
                barcode: '890123450006',
                category_id: catFinishedGoods,
                uom_id: uomPcs,
                description: 'Full ergonomic adjustable lumbar support, 4D armrests.',
                min_stock_level: 12.0,
                reorder_quantity: 25.0,
                unit_cost: 145.00
            },
            {
                id: prodDesk,
                name: 'Dual-Motor Electric Standing Desk 60x30"',
                sku: 'FG-DSK-DUAL60',
                barcode: '890123450007',
                category_id: catFinishedGoods,
                uom_id: uomPcs,
                description: 'Commercial grade programmable digital height adjustment.',
                min_stock_level: 5.0,
                reorder_quantity: 15.0,
                unit_cost: 220.00
            },
            {
                id: prodBoxes,
                name: 'Heavy-Duty Corrugated Shipping Boxes 24x18x12',
                sku: 'PKG-BOX-2418',
                barcode: '890123450008',
                category_id: catPackaging,
                uom_id: uomBox,
                description: '275# double-wall test corrugated cartons (Pack of 50).',
                min_stock_level: 20.0,
                reorder_quantity: 60.0,
                unit_cost: 45.00
            }
        ];

        for (const p of products) {
            db.execute(`
                INSERT OR REPLACE INTO products
                (id, organization_id, name, sku, barcode, category_id, uom_id, description, min_stock_level, reorder_quantity, unit_cost, is_active, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            `, [p.id, orgId, p.name, p.sku, p.barcode, p.category_id, p.uom_id, p.description, p.min_stock_level, p.reorder_quantity, p.unit_cost, adminUserId]);
        }

        // Helper to record stock balance and immutable ledger entry
        function seedStock(productId, warehouseId, locationId, quantity, reason = 'Initial Opening Inventory') {
            const balanceId = uuid();
            db.execute(`
                INSERT OR REPLACE INTO inventory_balances
                (id, organization_id, product_id, warehouse_id, location_id, quantity, reserved_quantity, version, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 0.0, 1, datetime('now'))
            `, [balanceId, orgId, productId, warehouseId, locationId, quantity]);

            const ledgerId = uuid();
            const idempotencyKey = `opening-${productId}-${locationId}`;
            db.execute(`
                INSERT OR IGNORE INTO stock_ledger
                (id, organization_id, product_id, warehouse_id, source_location_id, destination_location_id, movement_type, quantity, reference_type, reference_id, previous_quantity, new_quantity, reason, idempotency_key, performed_by)
                VALUES (?, ?, ?, ?, NULL, ?, 'OPENING_BALANCE', ?, 'OPENING', 'INITIAL-SEED', 0.0, ?, ?, ?, ?)
            `, [ledgerId, orgId, productId, warehouseId, locationId, quantity, quantity, reason, idempotencyKey, adminUserId]);
        }

        // Seed realistic stock levels across warehouses and locations
        // Steel rods: 85 in Central High-Bay Rack, 30 in Production Plant Feed Store
        seedStock(prodSteelRod, whCentral, 'loc-c-rack-a1', 85.0);
        seedStock(prodSteelRod, whProduction, 'loc-p-mat', 30.0);

        // Aluminum sheets: 240 kg in Central Bulk Aisle B
        seedStock(prodSheetMetal, whCentral, 'loc-c-bulk-b', 240.0);

        // Bearings: 320 pcs in Central High-Bay Rack, 60 in North Main Staging
        seedStock(prodBearings, whCentral, 'loc-c-rack-a1', 320.0);
        seedStock(prodBearings, whNorth, 'loc-n-storage', 60.0);

        // Bolts: 45 boxes in Central High-Bay Rack, 15 boxes in Plant 4 Feed Store
        seedStock(prodBolts, whCentral, 'loc-c-rack-a1', 45.0);
        seedStock(prodBolts, whProduction, 'loc-p-mat', 15.0);

        // Stepper Motors: 8 pcs in Central (Low stock! min is 10), 0 in North (Out of stock!)
        seedStock(prodMotor, whCentral, 'loc-c-rack-a1', 8.0);

        // Finished Ergonomic Chairs: 18 in Central Bulk B, 6 in North Main Staging
        seedStock(prodChair, whCentral, 'loc-c-bulk-b', 18.0);
        seedStock(prodChair, whNorth, 'loc-n-storage', 6.0);

        // Dual Motor Standing Desks: 3 in Central Bulk B (Low stock! min is 5)
        seedStock(prodDesk, whCentral, 'loc-c-bulk-b', 3.0);

        // Shipping Boxes: 35 boxes in Central High-Bay Rack
        seedStock(prodBoxes, whCentral, 'loc-c-rack-a1', 35.0);

        // Seed Sample Receipts (Incoming Goods)
        // Receipt 1: DONE (Validated)
        const rec1Id = uuid();
        db.execute(`
            INSERT OR REPLACE INTO receipts
            (id, organization_id, receipt_number, supplier_name, warehouse_id, receiving_location_id, expected_date, received_date, reference_number, notes, status, created_by)
            VALUES (?, ?, 'REC-2026-0001', 'Sumitomo Precision Steel Inc.', ?, 'loc-c-rec', '2026-09-20', '2026-09-20', 'PO-88219', 'Shipment arrived in good condition on container MSCU-8812', 'DONE', ?)
        `, [rec1Id, orgId, whCentral, managerUserId]);

        db.execute(`
            INSERT OR REPLACE INTO receipt_items (id, receipt_id, product_id, expected_quantity, received_quantity, notes)
            VALUES (?, ?, ?, 50.0, 50.0, 'Batch QA inspected and certified')
        `, [uuid(), rec1Id, prodSteelRod]);

        // Receipt 2: READY (Waiting for manager validation)
        const rec2Id = uuid();
        db.execute(`
            INSERT OR REPLACE INTO receipts
            (id, organization_id, receipt_number, supplier_name, warehouse_id, receiving_location_id, expected_date, received_date, reference_number, notes, status, created_by)
            VALUES (?, ?, 'REC-2026-0002', 'Shenzhen Motion Dynamics Ltd.', ?, 'loc-c-rec', '2026-09-25', '2026-09-25', 'PO-91044', '20x NEMA 23 Motors arrived at Bay 1', 'READY', ?)
        `, [rec2Id, orgId, whCentral, staffUserId]);

        db.execute(`
            INSERT OR REPLACE INTO receipt_items (id, receipt_id, product_id, expected_quantity, received_quantity, notes)
            VALUES (?, ?, ?, 20.0, 20.0, 'Ready for validation into stock')
        `, [uuid(), rec2Id, prodMotor]);

        // Receipt 3: DRAFT
        const rec3Id = uuid();
        db.execute(`
            INSERT OR REPLACE INTO receipts
            (id, organization_id, receipt_number, supplier_name, warehouse_id, receiving_location_id, expected_date, reference_number, notes, status, created_by)
            VALUES (?, ?, 'REC-2026-0003', 'Alcoa Aluminum Americas', ?, 'loc-c-rec', '2026-09-28', 'PO-92100', 'Scheduled bulk raw sheet shipment', 'DRAFT', ?)
        `, [rec3Id, orgId, whCentral, managerUserId]);

        db.execute(`
            INSERT OR REPLACE INTO receipt_items (id, receipt_id, product_id, expected_quantity, received_quantity, notes)
            VALUES (?, ?, ?, 150.0, 0.0, 'Expected delivery Friday')
        `, [uuid(), rec3Id, prodSheetMetal]);

        // Seed Sample Delivery Orders (Outgoing Goods)
        // Delivery 1: DONE
        const del1Id = uuid();
        db.execute(`
            INSERT OR REPLACE INTO deliveries
            (id, organization_id, delivery_number, customer_name, warehouse_id, source_location_id, scheduled_date, shipped_date, reference_number, notes, status, created_by)
            VALUES (?, ?, 'DEL-2026-0001', 'TechCorp Silicon Valley HQ', ?, 'loc-c-disp', '2026-09-22', '2026-09-22', 'SO-44102', 'Shipped via FedEx Freight Express', 'DONE', ?)
        `, [del1Id, orgId, whCentral, managerUserId]);

        db.execute(`
            INSERT OR REPLACE INTO delivery_items (id, delivery_id, product_id, ordered_quantity, picked_quantity, packed_quantity, delivered_quantity)
            VALUES (?, ?, ?, 10.0, 10.0, 10.0, 10.0)
        `, [uuid(), del1Id, prodChair]);

        // Delivery 2: PICKING
        const del2Id = uuid();
        db.execute(`
            INSERT OR REPLACE INTO deliveries
            (id, organization_id, delivery_number, customer_name, warehouse_id, source_location_id, scheduled_date, reference_number, notes, status, created_by)
            VALUES (?, ?, 'DEL-2026-0002', 'Vanguard Bio Labs', ?, 'loc-c-rack-a1', '2026-09-26', 'SO-44319', 'Staff is currently picking items from Rack A01', 'PICKING', ?)
        `, [del2Id, orgId, whCentral, staffUserId]);

        db.execute(`
            INSERT OR REPLACE INTO delivery_items (id, delivery_id, product_id, ordered_quantity, picked_quantity, packed_quantity, delivered_quantity)
            VALUES (?, ?, ?, 25.0, 15.0, 0.0, 0.0)
        `, [uuid(), del2Id, prodBearings]);

        // Seed Sample Internal Transfers
        // Transfer 1: DONE
        const trf1Id = uuid();
        db.execute(`
            INSERT OR REPLACE INTO internal_transfers
            (id, organization_id, transfer_number, source_warehouse_id, source_location_id, destination_warehouse_id, destination_location_id, scheduled_date, completed_date, reason, status, created_by)
            VALUES (?, ?, 'TRF-2026-0001', ?, 'loc-c-rack-a1', ?, 'loc-p-mat', '2026-09-21', '2026-09-21', 'Transfer steel rods to assembly line staging', 'DONE', ?)
        `, [trf1Id, orgId, whCentral, whProduction, managerUserId]);

        db.execute(`
            INSERT OR REPLACE INTO internal_transfer_items (id, transfer_id, product_id, quantity)
            VALUES (?, ?, ?, 15.0)
        `, [uuid(), trf1Id, prodSteelRod]);

        // Transfer 2: IN_TRANSIT
        const trf2Id = uuid();
        db.execute(`
            INSERT OR REPLACE INTO internal_transfers
            (id, organization_id, transfer_number, source_warehouse_id, source_location_id, destination_warehouse_id, destination_location_id, scheduled_date, reason, status, created_by)
            VALUES (?, ?, 'TRF-2026-0002', ?, 'loc-c-bulk-b', ?, 'loc-n-storage', '2026-09-26', 'Replenish North Regional Hub showroom chairs', 'IN_TRANSIT', ?)
        `, [trf2Id, orgId, whCentral, whNorth, staffUserId]);

        db.execute(`
            INSERT OR REPLACE INTO internal_transfer_items (id, transfer_id, product_id, quantity)
            VALUES (?, ?, ?, 4.0)
        `, [uuid(), trf2Id, prodChair]);

        // Seed Sample Stock Adjustments
        // Adjustment 1: DONE (Physical count reconciled damaged units)
        const adj1Id = uuid();
        db.execute(`
            INSERT OR REPLACE INTO stock_adjustments
            (id, organization_id, adjustment_number, warehouse_id, location_id, adjustment_date, reason_category, detailed_reason, status, created_by)
            VALUES (?, ?, 'ADJ-2026-0001', ?, 'loc-c-rack-a1', '2026-09-23', 'DAMAGED', 'Forklift accidentally clipped pallet corner damaging 3kg sheet aluminum', 'DONE', ?)
        `, [adj1Id, orgId, whCentral, managerUserId]);

        db.execute(`
            INSERT OR REPLACE INTO stock_adjustment_items (id, adjustment_id, product_id, system_quantity, counted_quantity, difference, notes)
            VALUES (?, ?, ?, 243.0, 240.0, -3.0, 'Written off to scrap')
        `, [uuid(), adj1Id, prodSheetMetal]);

        // Notifications
        const notif1 = uuid();
        const notif2 = uuid();
        const notif3 = uuid();

        db.execute(`
            INSERT OR REPLACE INTO notifications (id, organization_id, user_id, title, message, type, related_entity_type, related_entity_id, is_read)
            VALUES (?, ?, ?, 'Low Stock Warning', 'NEMA 23 Stepper Motor has dropped below minimum threshold (8 available, min 10)', 'LOW_STOCK', 'product', ?, 0)
        `, [notif1, orgId, adminUserId, prodMotor]);

        db.execute(`
            INSERT OR REPLACE INTO notifications (id, organization_id, user_id, title, message, type, related_entity_type, related_entity_id, is_read)
            VALUES (?, ?, ?, 'Receipt Ready for Validation', 'Incoming Receipt REC-2026-0002 has arrived at Receiving Dock 1', 'RECEIPT_VALIDATED', 'receipt', ?, 0)
        `, [notif2, orgId, adminUserId, rec2Id]);

        db.execute(`
            INSERT OR REPLACE INTO notifications (id, organization_id, user_id, title, message, type, related_entity_type, related_entity_id, is_read)
            VALUES (?, ?, ?, 'Internal Transfer In-Transit', 'Transfer TRF-2026-0002 dispatched from Central to North Regional Hub', 'TRANSFER_COMPLETED', 'transfer', ?, 1)
        `, [notif3, orgId, adminUserId, trf2Id]);

        // Initial Audit Logs
        const audit1 = uuid();
        db.execute(`
            INSERT OR REPLACE INTO audit_logs (id, organization_id, user_id, action, entity_type, entity_id, details)
            VALUES (?, ?, ?, 'ORGANIZATION_INITIALIZED', 'organization', ?, 'StockSense seed data and baseline inventory loaded successfully')
        `, [audit1, orgId, adminUserId, orgId]);
    });

    console.log('StockSense Enterprise Database seeded successfully with realistic data!');
}

if (require.main === module) {
    seedDatabase();
}

module.exports = seedDatabase;
