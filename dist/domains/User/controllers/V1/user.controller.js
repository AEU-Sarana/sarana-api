"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_service_1 = require("../../../../domains/User/services/user.service");
const logger_1 = require("../../../../shared/utils/logger");
class UserController {
    /**
     * GET /api/v1/users
     * List users with filters
     */
    static async listUsers(req, res) {
        try {
            const user = req.user;
            const request = {
                page: req.query.page ? parseInt(req.query.page, 10) : 1,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
                role: req.query.role,
                status: req.query.status,
                search: req.query.search,
            };
            const response = await user_service_1.UserService.listUsers(request, {
                userId: user.userId,
                role: user.role,
            });
            res.status(200).json({
                success: true,
                data: response,
                message: 'Users retrieved',
            });
        }
        catch (error) {
            logger_1.logger.error('List users error', { error: error.message });
            throw error; // Let error middleware handle it
        }
    }
    /**
     * GET /api/v1/users/cashiers
     * List cashiers only
     */
    static async listCashiers(req, res) {
        try {
            const user = req.user;
            const request = {
                page: req.query.page ? parseInt(req.query.page, 10) : 1,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
                status: req.query.status ? req.query.status : undefined,
                search: req.query.search,
            };
            const response = await user_service_1.UserService.listCashiers(request, {
                userId: user.userId,
                role: user.role,
            });
            res.status(200).json({
                success: true,
                data: {
                    cashiers: response.users,
                    pagination: response.pagination,
                },
                message: 'Cashiers retrieved',
            });
        }
        catch (error) {
            logger_1.logger.error('List sellers error', { error: error.message });
            throw error;
        }
    }
    /**
     * GET /api/v1/users/:id
     * Get user details
     */
    static async getUser(req, res) {
        try {
            const user = req.user;
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const userId = parseInt(idParam, 10);
            if (isNaN(userId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid user ID',
                    code: 'INVALID_USER_ID',
                });
                return;
            }
            const response = await user_service_1.UserService.getUser(userId, user.userId);
            res.status(200).json({
                success: true,
                data: response,
                message: 'User retrieved',
            });
        }
        catch (error) {
            logger_1.logger.error('Get user error', { error: error.message });
            throw error;
        }
    }
    /**
     * POST /api/v1/users
     * Create user/cashier
     */
    static async createUser(req, res) {
        try {
            const user = req.user;
            const request = req.body;
            const response = await user_service_1.UserService.createUser(request, {
                userId: user.userId,
            });
            res.status(201).json({
                success: true,
                data: response,
                message: 'User created',
            });
        }
        catch (error) {
            logger_1.logger.error('Create user error', { error: error.message });
            throw error;
        }
    }
    /**
     * PUT /api/v1/users/:id
     * Update user/cashier
     */
    static async updateUser(req, res) {
        try {
            const user = req.user;
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const userId = parseInt(idParam, 10);
            if (isNaN(userId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid user ID',
                    code: 'INVALID_USER_ID',
                });
                return;
            }
            const request = req.body;
            const response = await user_service_1.UserService.updateUser(userId, request, user.userId);
            res.status(200).json({
                success: true,
                data: response,
                message: 'User updated',
            });
        }
        catch (error) {
            logger_1.logger.error('Update user error', { error: error.message });
            throw error;
        }
    }
    /**
     * DELETE /api/v1/users/:id
     * Deactivate user (soft delete)
     */
    static async deactivateUser(req, res) {
        try {
            const user = req.user;
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const userId = parseInt(idParam, 10);
            if (isNaN(userId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid user ID',
                    code: 'INVALID_USER_ID',
                });
                return;
            }
            const response = await user_service_1.UserService.deactivateUser(userId, user.userId);
            res.status(200).json({
                success: true,
                data: response,
                message: 'User deactivated',
            });
        }
        catch (error) {
            logger_1.logger.error('Deactivate user error', { error: error.message });
            throw error;
        }
    }
    /**
     * PUT /api/v1/users/:id/pin
     * Set user PIN
    */
    static async setUserPIN(req, res) {
        try {
            const user = req.user;
            const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const userId = parseInt(idParam, 10);
            const { pin } = req.body;
            if (isNaN(userId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid user ID',
                    code: 'INVALID_USER_ID',
                });
                return;
            }
            await user_service_1.UserService.setUserPIN(userId, pin, user.userId);
            res.status(200).json({
                success: true,
                data: {
                    user_id: userId,
                    pin_configured: true,
                    updated_at: new Date(),
                },
                message: 'PIN configured successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Set user PIN error', { error: error.message });
            throw error;
        }
    }
}
exports.UserController = UserController;
//# sourceMappingURL=user.controller.js.map