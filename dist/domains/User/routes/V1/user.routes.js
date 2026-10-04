"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../../shared/middleware/auth.middleware");
const validation_middleware_1 = require("../../../../shared/middleware/validation.middleware");
const user_controller_1 = require("../../../../domains/User/controllers/V1/user.controller");
const V1_1 = require("../../../../domains/User/validators/V1");
const create_pin_validator_1 = require("../../validators/V1/create-pin.validator");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticateToken);
// List users
router.get('/', (0, auth_middleware_1.requirePermission)('users.manage', 'read'), ...(0, validation_middleware_1.validateRequest)(V1_1.listUsersValidator), user_controller_1.UserController.listUsers);
// List cashiers only
router.get('/cashiers', (0, auth_middleware_1.requirePermission)('users.manage', 'read'), ...(0, validation_middleware_1.validateRequest)(V1_1.listCashiersValidator), user_controller_1.UserController.listCashiers);
// Get user details
router.get('/:id', (0, auth_middleware_1.requirePermission)('users.manage', 'read'), ...(0, validation_middleware_1.validateRequest)(V1_1.getUserValidator), user_controller_1.UserController.getUser);
// Create user/cashier
router.post('/', (0, auth_middleware_1.requirePermission)('users.manage', 'create'), ...(0, validation_middleware_1.validateRequest)(V1_1.createUserValidator), user_controller_1.UserController.createUser);
// Update user/cashier
router.put('/:id', (0, auth_middleware_1.requirePermission)('users.manage', 'update'), ...(0, validation_middleware_1.validateRequest)(V1_1.updateUserValidator), user_controller_1.UserController.updateUser);
// Deactivate user (soft delete)
router.delete('/:id', (0, auth_middleware_1.requirePermission)('users.manage', 'delete'), ...(0, validation_middleware_1.validateRequest)(V1_1.deactivateUserValidator), user_controller_1.UserController.deactivateUser);
// Set user PIN
router.put('/:id/pin', (0, auth_middleware_1.requirePermission)('users.manage', 'update'), ...(0, validation_middleware_1.validateRequest)(create_pin_validator_1.createPinValidator), user_controller_1.UserController.setUserPIN);
exports.default = router;
//# sourceMappingURL=user.routes.js.map