const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

const auth     = require('../controllers/authController');
const users    = require('../controllers/userController');
const products = require('../controllers/productController');
const sales    = require('../controllers/saleController');
const purchases= require('../controllers/purchaseController');
const customers= require('../controllers/customerController');
const suppliers= require('../controllers/supplierController');
const dashboard= require('../controllers/dashboardController');

// Auth
router.post('/auth/login',   auth.login);
router.post('/auth/refresh', auth.refresh);
router.get('/auth/me',       protect, auth.getMe);

// Users
router.get   ('/users',             protect, adminOnly, users.getUsers);
router.post  ('/users',             protect, adminOnly, users.createUser);
router.put   ('/users/:id',         protect, adminOnly, users.updateUser);
router.patch ('/users/:id/password',protect, users.changePassword);
router.delete('/users/:id',         protect, adminOnly, users.deleteUser);

// Categories
router.get   ('/categories',     protect, products.getCategories);
router.post  ('/categories',     protect, adminOnly, products.createCategory);
router.delete('/categories/:id', protect, adminOnly, products.deleteCategory);

// Products
router.get   ('/products',     protect, products.getProducts);
router.get   ('/products/:id', protect, products.getProduct);
router.post  ('/products',     protect, adminOnly, upload.single('image'), products.createProduct);
router.put   ('/products/:id', protect, adminOnly, upload.single('image'), products.updateProduct);
router.delete('/products/:id', protect, adminOnly, products.deleteProduct);

// Sales
router.get   ('/sales',                protect, sales.getSales);
router.get   ('/sales/:id',            protect, sales.getSale);
router.post  ('/sales',                protect, sales.createSale);
router.patch ('/sales/:id/payment',    protect, sales.recordPayment);
router.delete('/sales/:id',            protect, adminOnly, sales.voidSale);

// Purchases
router.get   ('/purchases',             protect, adminOnly, purchases.getPurchases);
router.get   ('/purchases/:id',         protect, adminOnly, purchases.getPurchase);
router.post  ('/purchases',             protect, adminOnly, purchases.createPurchase);
router.patch ('/purchases/:id/payment', protect, adminOnly, purchases.recordPayment);
router.delete('/purchases/:id',         protect, adminOnly, purchases.cancelPurchase);

// Customers
router.get   ('/customers',     protect, customers.getCustomers);
router.get   ('/customers/:id', protect, customers.getCustomer);
router.post  ('/customers',     protect, customers.createCustomer);
router.put   ('/customers/:id', protect, customers.updateCustomer);
router.delete('/customers/:id', protect, adminOnly, customers.deleteCustomer);

// Suppliers
router.get   ('/suppliers',     protect, suppliers.getSuppliers);
router.get   ('/suppliers/:id', protect, suppliers.getSupplier);
router.post  ('/suppliers',     protect, adminOnly, suppliers.createSupplier);
router.put   ('/suppliers/:id', protect, adminOnly, suppliers.updateSupplier);
router.delete('/suppliers/:id', protect, adminOnly, suppliers.deleteSupplier);

// Dashboard
router.get('/dashboard/stats',         protect, dashboard.getStats);
router.get('/dashboard/sales-chart',   protect, dashboard.getSalesChart);
router.get('/dashboard/category-chart',protect, dashboard.getCategoryChart);
router.get('/dashboard/top-products',  protect, dashboard.getTopProducts);
router.get('/dashboard/low-stock',     protect, dashboard.getLowStockItems);
router.get('/dashboard/profit-loss',   protect, dashboard.getProfitLoss);

module.exports = router;
