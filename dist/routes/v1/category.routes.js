"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const category_routes_1 = __importDefault(require("../../domains/Product/routes/V1/category.routes"));
const router = (0, express_1.Router)();
router.use('/', category_routes_1.default);
exports.default = router;
//# sourceMappingURL=category.routes.js.map