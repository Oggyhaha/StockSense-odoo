const express = require('express');
const productsService = require('./products.service');
const { authenticateToken } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');
const { recordAuditLog } = require('../../middleware/audit');

const router = express.Router();

router.use(authenticateToken);

// List products
router.get('/', requirePermission('product.view'), (req, res, next) => {
    try {
        const result = productsService.listProducts(req.user.organization_id, req.query);
        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        next(err);
    }
});

// Categories list & create
router.get('/categories', requirePermission('product.view'), (req, res, next) => {
    try {
        const categories = productsService.listCategories(req.user.organization_id);
        res.json({ success: true, data: categories });
    } catch (err) {
        next(err);
    }
});

router.post('/categories', requirePermission('product.create'), (req, res, next) => {
    try {
        const { name, description } = req.body;
        const category = productsService.createCategory(req.user.organization_id, name, description);
        recordAuditLog(req, 'CATEGORY_CREATED', 'category', category.id, `Created category ${name}`);
        res.status(201).json({ success: true, data: category });
    } catch (err) {
        next(err);
    }
});

// Units of Measure list & create
router.get('/uoms', requirePermission('product.view'), (req, res, next) => {
    try {
        const uoms = productsService.listUoms(req.user.organization_id);
        res.json({ success: true, data: uoms });
    } catch (err) {
        next(err);
    }
});

router.post('/uoms', requirePermission('product.create'), (req, res, next) => {
    try {
        const { name, symbol } = req.body;
        const uom = productsService.createUom(req.user.organization_id, name, symbol);
        recordAuditLog(req, 'UOM_CREATED', 'uom', uom.id, `Created UoM ${name} (${symbol})`);
        res.status(201).json({ success: true, data: uom });
    } catch (err) {
        next(err);
    }
});

// Get product detail
router.get('/:id', requirePermission('product.view'), (req, res, next) => {
    try {
        const product = productsService.getProductById(req.user.organization_id, req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, error: 'NotFound', message: 'Product not found' });
        }
        res.json({ success: true, data: product });
    } catch (err) {
        next(err);
    }
});

// Create product
router.post('/', requirePermission('product.create'), (req, res, next) => {
    try {
        const product = productsService.createProduct(req.user.organization_id, req.body, req.user.id);
        recordAuditLog(req, 'PRODUCT_CREATED', 'product', product.id, `Created product ${product.name} (SKU: ${product.sku})`);
        res.status(201).json({ success: true, data: product });
    } catch (err) {
        next(err);
    }
});

// Update product
router.patch('/:id', requirePermission('product.update'), (req, res, next) => {
    try {
        const product = productsService.updateProduct(req.user.organization_id, req.params.id, req.body);
        recordAuditLog(req, 'PRODUCT_UPDATED', 'product', product.id, `Updated product ${product.name} (${product.sku})`);
        res.json({ success: true, data: product });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
