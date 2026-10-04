"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stock_route_1 = __importDefault(require("../../domains/Stock/routes/V1/stock.route"));
const router = (0, express_1.Router)();
router.use('/', stock_route_1.default);
exports.default = router;
//# sourceMappingURL=stock.routes.js.map