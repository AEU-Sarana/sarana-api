"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settings_routes_1 = __importDefault(require("../../domains/Setting/routes/V1/settings.routes"));
const router = (0, express_1.Router)();
router.use('/', settings_routes_1.default);
exports.default = router;
//# sourceMappingURL=setting.routes.js.map