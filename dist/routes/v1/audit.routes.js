"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_routes_1 = __importDefault(require("../../domains/Audit/routes/V1/audit.routes"));
const router = (0, express_1.Router)();
router.use('/', audit_routes_1.default);
exports.default = router;
//# sourceMappingURL=audit.routes.js.map