"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../../shared/middleware/auth.middleware");
const validation_middleware_1 = require("../../../../shared/middleware/validation.middleware");
const receipt_link_controller_1 = require("../../../../domains/Receipt/controllers/V1/receipt-link.controller");
const receipt_settings_controller_1 = require("../../../../domains/Receipt/controllers/V1/receipt-settings.controller");
const V1_1 = require("../../../../domains/Receipt/validators/V1");
const authorization_middleware_1 = require("../../../../shared/middleware/authorization.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken);
// Cashier/Admin - generate QR receipt link
router.post('/orders/:order_id/receipt-link', ...(0, validation_middleware_1.validateRequest)(V1_1.createReceiptLinkValidator), receipt_link_controller_1.ReceiptLinkController.createReceiptLink);
// Admin - get/update receipt settings
router.get('/admin/receipt-settings', ...(0, validation_middleware_1.validateRequest)(V1_1.getReceiptSettingsValidator), receipt_settings_controller_1.ReceiptSettingsController.getSettings);
router.put('/admin/receipt-settings', ...(0, validation_middleware_1.validateRequest)(V1_1.updateReceiptSettingsValidator), authorization_middleware_1.requireAdmin, receipt_settings_controller_1.ReceiptSettingsController.updateSettings);
const multer_config_1 = require("../../../../shared/utils/multer.config");
// Optional upload endpoint (if multipart middleware enabled)
router.post('/admin/receipt-settings/logo', auth_middleware_1.authenticateToken, authorization_middleware_1.requireAdmin, multer_config_1.productImageUploadAny, ...(0, validation_middleware_1.validateRequest)(V1_1.uploadReceiptLogoValidator), receipt_settings_controller_1.ReceiptSettingsController.uploadLogo);
exports.default = router;
//# sourceMappingURL=receipt.routes.js.map