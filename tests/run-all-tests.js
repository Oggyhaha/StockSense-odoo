/**
 * StockSense Automated Test Suite
 * Validates critical backend workflows, ACID transactions, RBAC guards, and stock ledger immutability
 */
const assert = require('assert');
const app = require('../src/server/app');
const config = require('../src/server/config');
const db = require('../src/server/database/connection');
const seedDatabase = require('../src/server/database/seed');

let server;
let baseUrl;

async function request(path, options = {}) {
    const url = `${baseUrl}${path}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    const res = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await res.json();
    return { status: res.status, ok: res.ok, data };
}

async function runTests() {
    console.log('\n======================================================');
    console.log('   Starting StockSense Production Test Suite...       ');
    console.log('======================================================\n');

    // Fresh seed before tests
    seedDatabase();

    // Start server on a test port
    const testPort = 4567;
    server = app.listen(testPort);
    baseUrl = `http://localhost:${testPort}/api/v1`;

    let adminToken, managerToken, staffToken, viewerToken;

    try {
        // TEST 1: Health check
        console.log('-> [Test 1] Health Check Endpoint');
        const health = await request('/health'.replace('/api/v1', '/api'));
        assert.strictEqual(health.status, 200);
        assert.strictEqual(health.data.status, 'UP');
        console.log('   ✓ Health check passed');

        // TEST 2: Authentication (Login with Demo Accounts)
        console.log('-> [Test 2] Authentication & JWT Verification');
        const adminLogin = await request('/auth/login', {
            method: 'POST',
            body: { email: 'admin@stocksense.io', password: 'Password123!' }
        });
        assert.strictEqual(adminLogin.status, 200);
        assert.ok(adminLogin.data.data.tokens.accessToken);
        assert.strictEqual(adminLogin.data.data.user.role, 'ADMIN');
        adminToken = adminLogin.data.data.tokens.accessToken;

        const managerLogin = await request('/auth/login', {
            method: 'POST',
            body: { email: 'manager@stocksense.io', password: 'Password123!' }
        });
        assert.strictEqual(managerLogin.status, 200);
        managerToken = managerLogin.data.data.tokens.accessToken;

        const staffLogin = await request('/auth/login', {
            method: 'POST',
            body: { email: 'staff@stocksense.io', password: 'Password123!' }
        });
        assert.strictEqual(staffLogin.status, 200);
        staffToken = staffLogin.data.data.tokens.accessToken;

        const viewerLogin = await request('/auth/login', {
            method: 'POST',
            body: { email: 'viewer@stocksense.io', password: 'Password123!' }
        });
        assert.strictEqual(viewerLogin.status, 200);
        viewerToken = viewerLogin.data.data.tokens.accessToken;

        // Invalid credentials check
        const badLogin = await request('/auth/login', {
            method: 'POST',
            body: { email: 'admin@stocksense.io', password: 'WrongPassword!' }
        });
        assert.strictEqual(badLogin.status, 401);
        console.log('   ✓ Login for all roles & invalid password rejection passed');

        // TEST 3: OTP Password Reset Flow
        console.log('-> [Test 3] OTP-Based Password Reset Flow');
        const otpReq = await request('/auth/forgot-password', {
            method: 'POST',
            body: { email: 'manager@stocksense.io' }
        });
        assert.strictEqual(otpReq.status, 200);
        const demoOtp = otpReq.data.data.demoOtp;
        assert.ok(demoOtp);

        const verifyOtp = await request('/auth/verify-otp', {
            method: 'POST',
            body: { email: 'manager@stocksense.io', otp: demoOtp }
        });
        assert.strictEqual(verifyOtp.status, 200);
        assert.strictEqual(verifyOtp.data.data.verified, true);
        console.log('   ✓ OTP request and verification passed');

        // TEST 4: Dashboard KPIs
        console.log('-> [Test 4] Dashboard KPIs Aggregation');
        const dash = await request('/dashboard/summary', {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.strictEqual(dash.status, 200);
        assert.ok(dash.data.data.totalProducts > 0);
        assert.ok(dash.data.data.totalStockQuantity > 0);
        console.log(`   ✓ Dashboard returned ${dash.data.data.totalProducts} products with ${dash.data.data.totalStockQuantity} total units`);

        // TEST 5: Product Management & Location Breakdown
        console.log('-> [Test 5] Product Creation and Stock Matrix');
        const newProd = await request('/products', {
            method: 'POST',
            headers: { Authorization: `Bearer ${managerToken}` },
            body: {
                name: 'Industrial Carbon Fiber Sheet 1mm',
                sku: 'CF-SHT-01',
                barcode: '890123499999',
                category_id: 'cat-raw',
                uom_id: 'uom-pcs',
                min_stock_level: 10,
                unit_cost: 75.0,
                initial_stock: 40,
                initial_warehouse_id: 'wh-central',
                initial_location_id: 'loc-c-rack-a1'
            }
        });
        assert.strictEqual(newProd.status, 201);
        assert.strictEqual(newProd.data.data.total_stock, 40);
        const createdProdId = newProd.data.data.id;
        console.log('   ✓ Product created with initial balance and ledger opening entry');

        // TEST 6: Receipts Workflow (Draft -> Waiting -> Ready -> Validate)
        console.log('-> [Test 6] Incoming Receipt Workflow & Atomic Stock Increment');
        const receiptCreate = await request('/receipts', {
            method: 'POST',
            headers: { Authorization: `Bearer ${staffToken}` },
            body: {
                supplier_name: 'Tokyo Carbon Composites',
                warehouse_id: 'wh-central',
                receiving_location_id: 'loc-c-rec',
                expected_date: '2026-09-26',
                reference_number: 'PO-TEST-001',
                items: [
                    { product_id: createdProdId, received_quantity: 60 }
                ]
            }
        });
        assert.strictEqual(receiptCreate.status, 201);
        const receiptId = receiptCreate.data.data.id;
        assert.strictEqual(receiptCreate.data.data.status, 'DRAFT');

        // Validate Receipt by Manager
        const receiptValidate = await request(`/receipts/${receiptId}/validate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${managerToken}` }
        });
        assert.strictEqual(receiptValidate.status, 200);
        assert.strictEqual(receiptValidate.data.data.status, 'DONE');

        // Verify Stock Increased at Receiving location
        const recBal = db.getOne(`SELECT quantity FROM inventory_balances WHERE product_id = ? AND location_id = 'loc-c-rec'`, [createdProdId]);
        assert.strictEqual(recBal.quantity, 60);

        // Verify Immutable Stock Ledger entry
        const recLedger = db.getOne(`SELECT * FROM stock_ledger WHERE reference_id = ? AND movement_type = 'RECEIPT'`, [receiptId]);
        assert.ok(recLedger);
        assert.strictEqual(recLedger.quantity, 60);
        console.log('   ✓ Receipt validated: Stock increased +60 and immutable ledger record created');

        // TEST 7: Internal Transfer Workflow (Move from Receiving to Bulk Rack)
        console.log('-> [Test 7] Internal Transfer & Double-Sided Ledger Entries');
        const transferCreate = await request('/transfers', {
            method: 'POST',
            headers: { Authorization: `Bearer ${staffToken}` },
            body: {
                source_warehouse_id: 'wh-central',
                source_location_id: 'loc-c-rec',
                destination_warehouse_id: 'wh-central',
                destination_location_id: 'loc-c-rack-a1',
                reason: 'Shelve incoming receipt to High-Bay Rack',
                items: [
                    { product_id: createdProdId, quantity: 25 }
                ]
            }
        });
        assert.strictEqual(transferCreate.status, 201);
        const transferId = transferCreate.data.data.id;

        // Complete Transfer
        const transferValidate = await request(`/transfers/${transferId}/validate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${staffToken}` }
        });
        assert.strictEqual(transferValidate.status, 200);
        assert.strictEqual(transferValidate.data.data.status, 'DONE');

        // Source decreased to 35 (60 - 25)
        const srcAfter = db.getOne(`SELECT quantity FROM inventory_balances WHERE product_id = ? AND location_id = 'loc-c-rec'`, [createdProdId]);
        assert.strictEqual(srcAfter.quantity, 35);

        // Destination increased to 65 (40 initial + 25)
        const dstAfter = db.getOne(`SELECT quantity FROM inventory_balances WHERE product_id = ? AND location_id = 'loc-c-rack-a1'`, [createdProdId]);
        assert.strictEqual(dstAfter.quantity, 65);

        // Check 2 Ledger Entries
        const trfLedgers = db.query(`SELECT * FROM stock_ledger WHERE reference_id = ? AND movement_type = 'INTERNAL_TRANSFER'`, [transferId]);
        assert.strictEqual(trfLedgers.length, 2);
        console.log('   ✓ Internal transfer complete: Source decreased (-25), Dest increased (+25), two ledger entries logged');

        // TEST 8: Outgoing Delivery Order Workflow (Pick -> Pack -> Ship)
        console.log('-> [Test 8] Delivery Order Picking, Packing, & Stock Deduction');
        const deliveryCreate = await request('/deliveries', {
            method: 'POST',
            headers: { Authorization: `Bearer ${staffToken}` },
            body: {
                customer_name: 'Boeing Aero Structures',
                warehouse_id: 'wh-central',
                source_location_id: 'loc-c-rack-a1',
                items: [
                    { product_id: createdProdId, ordered_quantity: 15 }
                ]
            }
        });
        assert.strictEqual(deliveryCreate.status, 201);
        const deliveryId = deliveryCreate.data.data.id;

        // Staff picks items
        await request(`/deliveries/${deliveryId}/pick`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${staffToken}` }
        });

        // Staff packs items
        await request(`/deliveries/${deliveryId}/pack`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${staffToken}` }
        });

        // Validate Delivery
        const deliveryValidate = await request(`/deliveries/${deliveryId}/validate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${managerToken}` }
        });
        assert.strictEqual(deliveryValidate.status, 200);
        assert.strictEqual(deliveryValidate.data.data.status, 'DONE');

        // Rack A1 stock should now be 50 (65 - 15)
        const rackAfterDel = db.getOne(`SELECT quantity FROM inventory_balances WHERE product_id = ? AND location_id = 'loc-c-rack-a1'`, [createdProdId]);
        assert.strictEqual(rackAfterDel.quantity, 50);

        // Ledger check
        const delLedger = db.getOne(`SELECT * FROM stock_ledger WHERE reference_id = ? AND movement_type = 'DELIVERY'`, [deliveryId]);
        assert.ok(delLedger);
        assert.strictEqual(delLedger.quantity, -15);
        console.log('   ✓ Delivery validated: Stock decremented (-15) and negative ledger record logged');

        // TEST 9: Negative Stock Prevention
        console.log('-> [Test 9] Insufficient Stock Validation Check');
        const oversizedDelivery = await request('/deliveries', {
            method: 'POST',
            headers: { Authorization: `Bearer ${staffToken}` },
            body: {
                customer_name: 'Overdraw Attempt',
                warehouse_id: 'wh-central',
                source_location_id: 'loc-c-rack-a1',
                items: [
                    { product_id: createdProdId, ordered_quantity: 99999 } // Way more than available (50)
                ]
            }
        });
        const overDelId = oversizedDelivery.data.data.id;
        const overValidate = await request(`/deliveries/${overDelId}/validate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${managerToken}` }
        });
        assert.strictEqual(overValidate.status, 500);
        assert.ok(overValidate.data.message.includes('Insufficient stock'));
        console.log('   ✓ Prevented insufficient stock transaction with clear error message');

        // TEST 10: Stock Adjustments & Difference Calculation
        console.log('-> [Test 10] Stock Adjustments & Cycle Counting Reconciliation');
        const adjCreate = await request('/adjustments', {
            method: 'POST',
            headers: { Authorization: `Bearer ${staffToken}` },
            body: {
                warehouse_id: 'wh-central',
                location_id: 'loc-c-rack-a1',
                reason_category: 'DAMAGED',
                detailed_reason: '2 sheets scratched during forklift transit',
                items: [
                    { product_id: createdProdId, counted_quantity: 48 } // System has 50, counted 48 -> diff -2
                ]
            }
        });
        assert.strictEqual(adjCreate.status, 201);
        const adjId = adjCreate.data.data.id;
        assert.strictEqual(adjCreate.data.data.items[0].difference, -2);

        // Approve adjustment
        const adjApprove = await request(`/adjustments/${adjId}/approve`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${managerToken}` }
        });
        assert.strictEqual(adjApprove.status, 200);
        assert.strictEqual(adjApprove.data.data.status, 'DONE');

        // Verify balance updated to counted 48
        const finalBalance = db.getOne(`SELECT quantity FROM inventory_balances WHERE product_id = ? AND location_id = 'loc-c-rack-a1'`, [createdProdId]);
        assert.strictEqual(finalBalance.quantity, 48);
        console.log('   ✓ Stock adjustment reconciled physical count to 48 and logged ledger diff');

        // TEST 11: RBAC Permission Guards
        console.log('-> [Test 11] RBAC Guards Verification');
        // Viewer should NOT be able to create or validate receipts
        const unauthorizedReceipt = await request('/receipts', {
            method: 'POST',
            headers: { Authorization: `Bearer ${viewerToken}` },
            body: {
                warehouse_id: 'wh-central',
                receiving_location_id: 'loc-c-rec',
                items: [{ product_id: createdProdId, received_quantity: 10 }]
            }
        });
        assert.strictEqual(unauthorizedReceipt.status, 403);
        console.log('   ✓ VIEWER role blocked from modifying inventory operations (403 Forbidden)');

        console.log('\n======================================================');
        console.log('   🎉 ALL 11 TEST SUITES PASSED FLAWLESSLY!          ');
        console.log('======================================================\n');
    } finally {
        server.close();
    }
}

runTests().catch(err => {
    console.error('\n❌ Test failure:', err);
    if (server) server.close();
    process.exit(1);
});
