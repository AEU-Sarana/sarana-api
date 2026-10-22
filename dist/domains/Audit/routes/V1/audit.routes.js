"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../../shared/middleware/auth.middleware");
const validation_middleware_1 = require("../../../../shared/middleware/validation.middleware");
const audit_controller_1 = require("../../../../domains/Audit/controllers/V1/audit.controller");
const audit_validator_1 = require("../../../../domains/Audit/validators/V1/audit.validator");
const router = (0, express_1.Router)();
// All audit routes require authentication and manage permission (Admin automatically has full access)
router.use(auth_middleware_1.authenticateToken);
// 1. Get filter dropdown options
router.get('/filters', (0, auth_middleware_1.requirePermission)('users.manage', 'read'), audit_controller_1.AuditController.getFilterOptions);
// 2. Get summary statistics and trends
router.get('/stats', (0, auth_middleware_1.requirePermission)('users.manage', 'read'), audit_controller_1.AuditController.getStats);
// 3. Export audit logs to CSV
router.get('/export', (0, auth_middleware_1.requirePermission)('users.manage', 'read'), audit_controller_1.AuditController.exportLogs);
// 4. List audit logs with pagination and filters
router.get('/', (0, auth_middleware_1.requirePermission)('users.manage', 'read'), ...(0, validation_middleware_1.validateRequest)(audit_validator_1.listAuditLogsValidator), audit_controller_1.AuditController.listLogs);
// 5. Get audit log by ID
router.get('/:id', (0, auth_middleware_1.requirePermission)('users.manage', 'read'), ...(0, validation_middleware_1.validateRequest)(audit_validator_1.getAuditLogValidator), audit_controller_1.AuditController.getLogDetails);
exports.default = router;
//# sourceMappingURL=audit.routes.js.map