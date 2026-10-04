"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customer_route_1 = __importDefault(require("../../domains/Customer/routes/V1/customer.route"));
const router = (0, express_1.Router)();
router.use('/', customer_route_1.default);
exports.default = router;
//# sourceMappingURL=customer.routes.js.map