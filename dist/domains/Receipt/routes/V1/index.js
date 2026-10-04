"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/domains/Receipt/routes/V1/index.ts
const express_1 = require("express");
const receipt_routes_1 = __importDefault(require("./receipt.routes"));
const router = (0, express_1.Router)();
router.use(receipt_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map