"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// Import route modules
const auth_routes_1 = __importDefault(require("./auth.routes"));
const product_routes_1 = __importDefault(require("./product.routes"));
const category_routes_1 = __importDefault(require("./category.routes"));
const stock_routes_1 = __importDefault(require("./stock.routes"));
const inventory_routes_1 = __importDefault(require("./inventory.routes"));
const order_routes_1 = __importDefault(require("./order.routes"));
const receipt_route_1 = __importDefault(require("./receipt.route"));
const report_routes_1 = __importDefault(require("./report.routes"));
const backup_routes_1 = __importDefault(require("./backup.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const role_routes_1 = __importDefault(require("../../domains/User/routes/V1/role.routes"));
const setting_routes_1 = __importDefault(require("./setting.routes"));
const dashboard_routes_1 = __importDefault(require("./dashboard.routes"));
const customer_routes_1 = __importDefault(require("./customer.routes"));
const permission_routes_1 = __importDefault(require("../../domains/Auth/routes/V1/permission.routes"));
const supplier_routes_1 = __importDefault(require("../../domains/Supplier/routes/V1/supplier.routes"));
const po_routes_1 = __importDefault(require("../../domains/Purchasing/routes/V1/po.routes"));
const router = (0, express_1.Router)();
// Mount route modules
router.use('/', permission_routes_1.default);
router.use('/auth', auth_routes_1.default);
router.use('/products', product_routes_1.default);
router.use('/categories', category_routes_1.default);
router.use('/stocks', stock_routes_1.default);
router.use('/inventory', inventory_routes_1.default);
router.use('/orders', order_routes_1.default);
router.use('/receipts', receipt_route_1.default);
router.use('/reports', report_routes_1.default);
router.use('/backup', backup_routes_1.default);
router.use('/users', user_routes_1.default);
router.use('/roles', role_routes_1.default);
router.use('/settings', setting_routes_1.default);
router.use('/dashboard', dashboard_routes_1.default);
router.use('/customers', customer_routes_1.default);
router.use('/suppliers', supplier_routes_1.default);
router.use('/purchasing', po_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map