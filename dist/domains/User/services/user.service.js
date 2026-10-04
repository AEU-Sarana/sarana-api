"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const env_1 = require("../../../shared/config/env");
const client_1 = __importDefault(require("../../../database/client"));
const enums_1 = require("../../../domains/User/enums");
const exceptions_1 = require("../../../shared/exceptions");
const logger_1 = require("../../../shared/utils/logger");
const audit_log_service_1 = require("../../../shared/services/audit-log.service");
const pin_service_1 = require("../../../shared/services/pin.service");
class UserService {
    /**
     * List users with filters
     */
    static async listUsers(request, currentUser) {
        const { page = 1, limit = 20, role, status, search } = request;
        const { role: currentUserRole, tenantId: currentUserTenantId } = currentUser;
        // Build where clause
        const where = {};
        if (role) {
            where.role = role;
        }
        // Single tenant environment - no tenant scope checks needed
        if (status) {
            where.status = status;
        }
        if (search) {
            where.OR = [
                { username: { contains: search, mode: 'insensitive' } },
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
            ];
        }
        // Get total count
        const total = await client_1.default.user.count({ where });
        // Get users with pagination
        const skip = (page - 1) * limit;
        const users = await client_1.default.user.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                userId: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                phone: true,
                status: true,
                deviceId: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        // Log audit
        await audit_log_service_1.auditLogService.createAuditLog({
            userId: currentUser.userId,
            action: 'LIST_USERS',
            entityType: 'User',
            oldValues: { filters: { role, status, search } },
        });
        return {
            users: users.map((user) => ({
                user_id: user.userId,
                username: user.username,
                email: user.email,
                full_name: user.fullName,
                role: user.role,
                phone: user.phone,
                status: user.status,
                device_id: user.deviceId,
                created_at: user.createdAt,
                updated_at: user.updatedAt,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * List sellers only
     */
    static async listCashiers(request, currentUser) {
        return this.listUsers({
            ...request,
            role: enums_1.UserRole.CASHIER,
        }, currentUser);
    }
    /**
     * Get user by ID
     */
    static async getUser(userId, currentUserId) {
        const user = await client_1.default.user.findUnique({
            where: { userId },
            select: {
                userId: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                phone: true,
                status: true,
                deviceId: true,
                createdBy: true,
                createdAt: true,
                updatedBy: true,
                updatedAt: true,
                deactivatedDate: true,
            },
        });
        if (!user) {
            throw new exceptions_1.ValidationException('User not found');
        }
        // Log audit
        await audit_log_service_1.auditLogService.createAuditLog({
            userId: currentUserId,
            action: 'VIEW_USER',
            entityType: 'User',
            entityId: userId,
        });
        return {
            user_id: user.userId,
            username: user.username,
            email: user.email,
            full_name: user.fullName,
            role: user.role,
            phone: user.phone,
            status: user.status,
            device_id: user.deviceId,
            created_by: user.createdBy,
            created_at: user.createdAt,
            updated_by: user.updatedBy,
            updated_at: user.updatedAt,
            deactivated_date: user.deactivatedDate,
        };
    }
    /**
     * Create user/cashier
     */
    static async createUser(request, currentUser) {
        const { username, email, full_name, password, phone, role } = request;
        const fullName = full_name; // Map snake_case to camelCase for database
        const { userId: currentUserId, tenantId: currentUserTenantId } = currentUser;
        // Check if username already exists
        const existingUser = await client_1.default.user.findUnique({
            where: { username },
        });
        if (existingUser) {
            throw new exceptions_1.ValidationException('Username already exists');
        }
        // Check if email already exists (if provided)
        if (email) {
            const existingEmail = await client_1.default.user.findFirst({
                where: { email },
            });
            if (existingEmail) {
                throw new exceptions_1.ValidationException('Email already exists');
            }
        }
        // Hash password
        const passwordHash = await bcryptjs_1.default.hash(password, env_1.env.BCRYPT_SALT_ROUNDS);
        // Create user
        const user = await client_1.default.user.create({
            data: {
                username,
                email,
                fullName,
                passwordHash,
                phone,
                role: role,
                status: enums_1.UserStatus.ACTIVE,
                createdBy: currentUserId,
                updatedBy: currentUserId,
            },
            select: {
                userId: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                phone: true,
                status: true,
                createdBy: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        // Log audit
        await audit_log_service_1.auditLogService.createAuditLog({
            userId: currentUserId,
            action: 'CREATE_USER',
            entityType: 'User',
            entityId: user.userId,
            newValues: {
                username: user.username,
                role: user.role,
            },
        });
        logger_1.logger.info('User created', {
            userId: user.userId,
            username: user.username,
            role: user.role,
            createdBy: currentUserId,
        });
        return {
            user_id: user.userId,
            username: user.username,
            email: user.email,
            full_name: user.fullName,
            role: user.role,
            phone: user.phone,
            status: user.status,
            created_by: user.createdBy,
            created_at: user.createdAt,
            updated_at: user.updatedAt,
        };
    }
    /**
     * Update user/cashier
     */
    static async updateUser(userId, request, currentUserId) {
        // Check if user exists
        const existingUser = await client_1.default.user.findUnique({
            where: { userId },
        });
        if (!existingUser) {
            throw new exceptions_1.ValidationException('User not found');
        }
        // Check if email already exists (if provided and changed)
        if (request.email && request.email !== existingUser.email) {
            const existingEmail = await client_1.default.user.findFirst({
                where: {
                    email: request.email,
                    userId: { not: userId },
                },
            });
            if (existingEmail) {
                throw new exceptions_1.ValidationException('Email already exists');
            }
        }
        // Build update data
        const updateData = {
            updatedBy: currentUserId,
            updatedAt: new Date(),
        };
        if (request.full_name !== undefined) {
            updateData.fullName = request.full_name; // Map snake_case to camelCase
        }
        if (request.email !== undefined) {
            updateData.email = request.email;
        }
        if (request.phone !== undefined) {
            updateData.phone = request.phone;
        }
        if (request.role !== undefined) {
            updateData.role = request.role;
        }
        if (request.password && request.password.trim().length > 0) {
            updateData.passwordHash = await bcryptjs_1.default.hash(request.password, env_1.env.BCRYPT_SALT_ROUNDS);
        }
        if (request.status !== undefined) {
            updateData.status = request.status;
            // If deactivating, set deactivated_date
            if (request.status === enums_1.UserStatus.INACTIVE && existingUser.status === enums_1.UserStatus.ACTIVE) {
                updateData.deactivatedDate = new Date();
            }
            // If reactivating, clear deactivated_date
            if (request.status === enums_1.UserStatus.ACTIVE && existingUser.status === enums_1.UserStatus.INACTIVE) {
                updateData.deactivatedDate = null;
            }
        }
        // Update user
        const user = await client_1.default.user.update({
            where: { userId },
            data: updateData,
            select: {
                userId: true,
                username: true,
                fullName: true,
                email: true,
                phone: true,
                status: true,
                updatedBy: true,
                updatedAt: true,
            },
        });
        // Log audit
        await audit_log_service_1.auditLogService.createAuditLog({
            userId: currentUserId,
            action: 'UPDATE_USER',
            entityType: 'User',
            entityId: userId,
            newValues: {
                changes: request,
            },
        });
        logger_1.logger.info('User updated', {
            userId,
            updatedBy: currentUserId,
            changes: request,
        });
        return {
            user_id: user.userId,
            username: user.username,
            full_name: user.fullName,
            email: user.email,
            phone: user.phone,
            status: user.status,
            updated_by: user.updatedBy,
            updated_at: user.updatedAt,
        };
    }
    /**
     * Deactivate user (soft delete)
     */
    static async deactivateUser(userId, currentUserId) {
        // Check if user exists
        const user = await client_1.default.user.findUnique({
            where: { userId },
        });
        if (!user) {
            throw new exceptions_1.ValidationException('User not found');
        }
        // Prevent deactivating self
        if (userId === currentUserId) {
            throw new exceptions_1.BusinessLogicException('Cannot deactivate your own account');
        }
        // Check if already inactive
        if (user.status === enums_1.UserStatus.INACTIVE) {
            throw new exceptions_1.BusinessLogicException('User is already inactive');
        }
        // Soft delete (set status to inactive)
        const updatedUser = await client_1.default.user.update({
            where: { userId },
            data: {
                status: enums_1.UserStatus.INACTIVE,
                deactivatedDate: new Date(),
                updatedBy: currentUserId,
                updatedAt: new Date(),
            },
            select: {
                userId: true,
                status: true,
                deactivatedDate: true,
            },
        });
        // Log audit
        await audit_log_service_1.auditLogService.createAuditLog({
            userId: currentUserId,
            action: 'DEACTIVATE_USER',
            entityType: 'User',
            entityId: userId,
            oldValues: {
                username: user.username,
                status: user.status,
            },
        });
        logger_1.logger.info('User deactivated', {
            userId,
            username: user.username,
            deactivatedBy: currentUserId,
        });
        return {
            user_id: updatedUser.userId,
            status: updatedUser.status,
            deactivated_date: updatedUser.deactivatedDate,
            deactivated_by: currentUserId,
        };
    }
    /**
     * Set user PIN
    */
    static async setUserPIN(userId, pin, currentUserId) {
        // Validate user exists
        const user = await client_1.default.user.findUnique({
            where: { userId },
        });
        if (!user || user.deactivatedDate) {
            throw new exceptions_1.ValidationException('User not found');
        }
        // Validate PIN format
        if (!/^\d{4,6}$/.test(pin)) {
            throw new exceptions_1.ValidationException('PIN must be 4-6 numeric digits');
        }
        // Hash PIN
        const pinHash = await (0, pin_service_1.hashPIN)(pin);
        // Update user PIN
        await client_1.default.user.update({
            where: { userId },
            data: {
                pinHash: pinHash,
                updatedBy: currentUserId,
                updatedAt: new Date(),
            },
        });
        // Audit log
        await audit_log_service_1.auditLogService.createAuditLog({
            userId: currentUserId,
            action: 'SET_USER_PIN',
            resource: 'User',
            entityId: userId,
            details: { targetUserId: userId },
        });
        logger_1.logger.info('User PIN set', { userId, setBy: currentUserId });
    }
}
exports.UserService = UserService;
//# sourceMappingURL=user.service.js.map