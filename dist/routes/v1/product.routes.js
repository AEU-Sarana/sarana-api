"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_routes_1 = __importDefault(require("../../domains/Product/routes/V1/product.routes"));
const router = (0, express_1.Router)();
router.use('/', product_routes_1.default);
exports.default = router;
//# sourceMappingURL=product.routes.js.map