"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = __importDefault(require("../../../../database/client"));
const env_1 = require("../../../../shared/config/env");
const auth_error_codes_1 = require("../../enums/V2/auth-error-codes");
const token_service_1 = require("./token.service");
const refresh_token_repository_1 = require("../../repository/V2/refresh-token.repository");
const date_utils_1 = require("../../../../shared/utils/date-utils");
const logger_1 = require("../../../../shared/utils/logger");
const send_password_reset_email_job_1 = require("../../../../domains/Auth/jobs/send-password-reset-email.job");
const exceptions_1 = require("../../../../shared/exceptions");
const file_storage_service_1 = require("../../../../shared/services/file-storage.service");
const permission_service_1 = require("./permission.service");
const repo = new refresh_token_repository_1.RefreshTokenRepository();
const permissionService = new permission_service_1.PermissionService();
class AuthService {
    /**
     * Request password reset
     */
    async requestPasswordReset(identifier) {
        // Get user by username or email
        const isEmail = identifier.includes('@');
        if (isEmail) {
            const users = await client_1.default.user.findMany({
                where: { email: identifier },
                select: {
                    userId: true,
                    username: true,
                    email: true,
                    fullName: true,
                    role: true,
                    status: true,
                },
                orderBy: { createdAt: 'desc' },
            });
            if (users.length > 1) {
                throw new Error('Multiple accounts use this email. Please use username instead.');
            }
            if (users.length === 0) {
                logger_1.logger.warn('Password reset requested for non-existent user', { identifier });
                return;
            }
            const user = users[0];
            await this.sendResetOtp(user);
            return;
        }
        const user = await client_1.default.user.findFirst({
            where: { username: identifier },
            select: {
                userId: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
                status: true,
            },
        });
        if (!user) {
            // Don't reveal if user exists (security best practice)
            logger_1.logger.warn('Password reset requested for non-existent user', { identifier });
            return;
        }
        // Check user status
        if (user.status !== 'active') {
            logger_1.logger.warn('Password reset requested for inactive user', { userId: user.userId });
            return;
        }
        await this.sendResetOtp(user);
    }
    /**
     * Verify OTP and return tokens for password reset flow
     */
    async verifyOtp(input) {
        const isEmail = input.identifier.includes('@');
        if (isEmail) {
            const users = await client_1.default.user.findMany({
                where: { email: input.identifier },
                select: { userId: true },
            });
            if (users.length > 1) {
                throw new Error('Multiple accounts use this email. Please use username instead.');
            }
        }
        // Find OTP by identifier + code (avoids ambiguity when duplicate emails exist)
        let otpRecord = [];
        if (isEmail) {
            otpRecord = await client_1.default.$queryRaw `
        SELECT o.id, o.user_id, o.otp_code, o.expires_at, o.used_at,
               u.status, u.role
        FROM password_reset_otps o
        JOIN users u ON u.user_id = o.user_id
        WHERE u.email = ${input.identifier}
        AND o.otp_code = ${input.otpCode}
        AND o.used_at IS NULL
        ORDER BY o.created_at DESC
        LIMIT 1
      `;
        }
        else {
            otpRecord = await client_1.default.$queryRaw `
        SELECT o.id, o.user_id, o.otp_code, o.expires_at, o.used_at,
               u.status, u.role
        FROM password_reset_otps o
        JOIN users u ON u.user_id = o.user_id
        WHERE u.username = ${input.identifier}
        AND o.otp_code = ${input.otpCode}
        AND o.used_at IS NULL
        ORDER BY o.created_at DESC
        LIMIT 1
      `;
        }
        if (!otpRecord || otpRecord.length === 0) {
            throw new Error('Invalid or expired OTP');
        }
        const otp = otpRecord[0];
        // Check user status
        if (otp.status !== 'active') {
            throw new Error('User account is not active');
        }
        // Restriction: Only Admin accounts can reset password via OTP
        if (otp.role !== 'ADMIN') {
            throw new Error('This account is not eligible for OTP password reset. Please contact admin.');
        }
        // Check if OTP is expired
        if (new Date() > new Date(otp.expires_at)) {
            throw new Error('OTP has expired');
        }
        // Mark OTP as used
        await client_1.default.$executeRaw `
      UPDATE password_reset_otps
      SET used_at = CURRENT_TIMESTAMP
      WHERE id = ${otp.id}
    `;
        // Generate tokens so user can proceed to reset password
        // const accessToken = TokenService.generateAccessToken({
        //   userId: user.userId,
        //   role: user.role as 'ADMIN' | 'CASHIER',
        //   tenantId: user.tenantId ?? 1,
        // });
        logger_1.logger.info('OTP verified successfully', { userId: otp.user_id });
    }
    async sendResetOtp(user) {
        // Check user status
        if (user.status !== 'active') {
            logger_1.logger.warn('Password reset requested for inactive user', { userId: user.userId });
            return;
        }
        // Restriction: Only Admin accounts can reset password via OTP
        if (user.role !== 'ADMIN') {
            throw new Error('This account is not eligible for OTP password reset. Please contact admin.');
        }
        // Send password reset email (async job)
        if (!user.email) {
            logger_1.logger.warn('Password reset requested but user has no email', { userId: user.userId });
            return;
        }
        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        // Delete any existing unused OTPs for this user
        await client_1.default.$executeRaw `
      DELETE FROM password_reset_otps 
      WHERE user_id = ${user.userId} 
      AND used_at IS NULL
    `;
        // Store OTP in database
        await client_1.default.$executeRaw `
      INSERT INTO password_reset_otps (user_id, otp_code, expires_at)
      VALUES (${user.userId}, ${otpCode}, NOW() + INTERVAL '15 minutes')
    `;
        // Fire-and-forget email sending
        void (0, send_password_reset_email_job_1.sendPasswordResetEmailJob)({
            toEmail: user.email,
            username: user.username,
            fullName: user.fullName,
            otpCode,
        }).catch((error) => {
            logger_1.logger.error('Failed to enqueue/send password reset email', {
                userId: user.userId,
                error: error?.message || error,
            });
        });
        logger_1.logger.info('Password reset OTP generated', { userId: user.userId });
    }
    /**
     * Reset password (Admin only)
     */
    async resetPassword(identifier, newPassword, adminUserId) {
        // Verify target user exists
        const user = await client_1.default.user.findFirst({
            where: typeof identifier === 'number'
                ? { userId: identifier }
                : {
                    OR: [
                        { username: identifier },
                        { email: identifier },
                    ],
                },
            select: {
                userId: true,
                username: true,
                status: true,
                role: true,
            },
        });
        if (!user) {
            throw new Error('User not found');
        }
        // Restriction: Only Admin can be reset password 
        if (user.role === 'CASHIER') {
            throw new Error('This account is for a cashier. Please contact admin.');
        }
        // Hash new password
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
        // Update password
        await client_1.default.$executeRaw `
      UPDATE users
      SET password_hash = ${hashedPassword}
      WHERE user_id = ${user.userId}
    `;
        logger_1.logger.info('Password reset by admin', {
            userId: user.userId,
            adminUserId,
        });
    }
    async login(input) {
        const user = await client_1.default.user.findFirst({
            where: { email: input.email },
            select: {
                userId: true,
                username: true,
                passwordHash: true,
                role: true,
                status: true,
                email: true,
                fullName: true,
            },
        });
        if (!user) {
            throw new exceptions_1.ValidationException('Invalid email or password', [], auth_error_codes_1.AuthErrorCode.INVALID_CREDENTIALS, 401);
        }
        if (user.status !== 'active') {
            throw new exceptions_1.ValidationException('Invalid email or password', [], auth_error_codes_1.AuthErrorCode.INVALID_CREDENTIALS, 401);
        }
        const ok = await bcryptjs_1.default.compare(input.password, user.passwordHash);
        if (!ok) {
            throw new exceptions_1.ValidationException('Invalid email or password', [], auth_error_codes_1.AuthErrorCode.INVALID_CREDENTIALS, 401);
        }
        const now = new Date();
        const absoluteDays = Math.min(Math.max(env_1.env.JWT_V2_REFRESH_ABSOLUTE_DAYS || 30, 7), 30);
        const idleDays = Math.min(Math.max(env_1.env.JWT_V2_REFRESH_IDLE_DAYS || 7, 1), 14);
        const absoluteExpiresAt = (0, date_utils_1.addDaysToDate)(now, absoluteDays);
        const idleExpiresAt = (0, date_utils_1.addDaysToDate)(now, idleDays);
        const tokenFamilyId = crypto_1.default.randomUUID();
        const refreshRaw = token_service_1.TokenService.generateOpaqueRefreshToken();
        const refreshHash = token_service_1.TokenService.hashRefreshToken(refreshRaw);
        await repo.createSession({
            userId: user.userId,
            refreshTokenHash: refreshHash,
            tokenFamilyId,
            absoluteExpiresAt,
            idleExpiresAt,
            deviceId: null,
            ipAddress: input.ip ?? null,
            userAgent: input.user_agent ?? null,
        });
        const accessToken = token_service_1.TokenService.generateAccessToken({
            userId: user.userId,
            role: user.role,
        });
        const permissions = await permissionService.getUserPermissions(user.userId, user.role);
        return {
            token: accessToken,
            refresh_token: refreshRaw,
            token_type: 'Bearer',
            expires_in_seconds: token_service_1.TokenService.getAccessTokenTtlSeconds(),
            idle_expires_at: (0, date_utils_1.toPhnomPenhISOString)(idleExpiresAt),
            absolute_expires_at: (0, date_utils_1.toPhnomPenhISOString)(absoluteExpiresAt),
            user: {
                userId: user.userId,
                user_id: user.userId,
                username: user.username,
                role: user.role,
                email: user.email,
                fullName: user.fullName,
                full_name: user.fullName,
                permissions,
            },
        };
    }
    async refresh(input) {
        const now = new Date();
        const refreshHash = token_service_1.TokenService.hashRefreshToken(input.refresh_token);
        const session = await repo.findByTokenHash(refreshHash);
        if (!session)
            throw new Error(auth_error_codes_1.AuthErrorCode.INVALID_REFRESH_TOKEN);
        if (session.revokedAt) {
            await repo.revokeFamily(session.tokenFamilyId);
            throw new Error(auth_error_codes_1.AuthErrorCode.TOKEN_REUSE_DETECTED);
        }
        if (now > session.idleExpiresAt) {
            await repo.revokeSession(session.id);
            throw new Error(auth_error_codes_1.AuthErrorCode.REFRESH_IDLE_EXPIRED);
        }
        if (now > session.absoluteExpiresAt) {
            await repo.revokeSession(session.id);
            throw new Error(auth_error_codes_1.AuthErrorCode.REFRESH_ABSOLUTE_EXPIRED);
        }
        if (!session.user || session.user.status !== 'active') {
            await repo.revokeSession(session.id);
            throw new Error(auth_error_codes_1.AuthErrorCode.TOKEN_REVOKED);
        }
        const idleDays = Math.min(Math.max(env_1.env.JWT_V2_REFRESH_IDLE_DAYS || 7, 1), 14);
        const nextIdleExpiresAt = (0, date_utils_1.addDaysToDate)(now, idleDays);
        const newRefreshRaw = token_service_1.TokenService.generateOpaqueRefreshToken();
        const newRefreshHash = token_service_1.TokenService.hashRefreshToken(newRefreshRaw);
        await client_1.default.$transaction(async (tx) => {
            await repo.rotateToken(tx, {
                currentSessionId: session.id,
                userId: session.userId,
                newRefreshTokenHash: newRefreshHash,
                tokenFamilyId: session.tokenFamilyId,
                absoluteExpiresAt: session.absoluteExpiresAt,
                nextIdleExpiresAt,
                deviceId: session.deviceId ?? null,
                ipAddress: input.ip ?? null,
                userAgent: input.user_agent ?? null,
            });
        });
        const accessToken = token_service_1.TokenService.generateAccessToken({
            userId: session.userId,
            role: session.user.role,
            deviceId: session.deviceId ?? undefined,
        });
        return {
            token: accessToken,
            refresh_token: newRefreshRaw,
            token_type: 'Bearer',
            expires_in_seconds: token_service_1.TokenService.getAccessTokenTtlSeconds(),
            idle_expires_at: (0, date_utils_1.toPhnomPenhISOString)(nextIdleExpiresAt),
            absolute_expires_at: (0, date_utils_1.toPhnomPenhISOString)(session.absoluteExpiresAt),
        };
    }
    async logout(input) {
        const hash = token_service_1.TokenService.hashRefreshToken(input.refresh_token);
        const session = await repo.findByTokenHash(hash);
        if (!session)
            return { revoked: true };
        await repo.revokeSession(session.id);
        return { revoked: true };
    }
    async logoutAll(userId) {
        await repo.revokeAllForUser(userId);
        return { revoked_all: true };
    }
    async me(userId) {
        const user = await client_1.default.user.findUnique({
            where: { userId },
            select: {
                userId: true,
                username: true,
                role: true,
                status: true,
                email: true,
                fullName: true,
                phone: true,
                bio: true,
            },
        });
        if (!user)
            throw new Error(auth_error_codes_1.AuthErrorCode.TOKEN_REVOKED);
        const permissions = await permissionService.getUserPermissions(user.userId, user.role);
        return {
            userId: user.userId,
            user_id: user.userId,
            username: user.username,
            role: user.role,
            status: user.status,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone,
            bio: user.bio,
            permissions,
        };
    }
    async updateProfile(userId, request, imageFile) {
        const { full_name, username, email, phone, bio } = request;
        // Check if user exists
        const user = await client_1.default.user.findUnique({
            where: { userId },
        });
        if (!user) {
            throw new exceptions_1.ValidationException('User not found');
        }
        // Check if username is taken
        if (username && username !== user.username) {
            const existing = await client_1.default.user.findFirst({
                where: {
                    username,
                    userId: { not: userId }
                }
            });
            if (existing)
                throw new exceptions_1.BusinessLogicException('Username already taken');
        }
        // Handle image upload if provided
        let finalProfilePath = request.profile ?? user.profileImage;
        if (imageFile) {
            try {
                // Upload new image
                const uploadResult = await file_storage_service_1.fileStorageService.uploadFile(imageFile, 'users/avatars', {
                    filename: `user-${userId}-${Date.now()}`,
                    public: true,
                    metadata: {
                        userId: userId.toString(),
                    }
                });
                finalProfilePath = uploadResult.url;
                // Delete old image if it exists
                if (user.profileImage) {
                    const oldKey = file_storage_service_1.fileStorageService.extractKeyFromUrl(user.profileImage);
                    if (oldKey) {
                        void file_storage_service_1.fileStorageService.deleteFile(oldKey).catch(err => {
                            logger_1.logger.warn('Failed to delete old profile image', { userId, oldKey, error: err });
                        });
                    }
                }
            }
            catch (error) {
                logger_1.logger.error('Failed to upload user profile image:', error);
                throw new exceptions_1.BusinessLogicException('Failed to upload profile image');
            }
        }
        // Update user
        await client_1.default.user.update({
            where: { userId },
            data: {
                fullName: full_name,
                username: username,
                email,
                phone,
                bio,
                profileImage: finalProfilePath,
                updatedAt: new Date(),
            },
        });
        logger_1.logger.info('User profile updated', { userId });
    }
    async changePassword(userId, request) {
        const { current_password, new_password } = request;
        // Get user
        const user = await client_1.default.user.findUnique({
            where: { userId },
            select: {
                userId: true,
                passwordHash: true,
            },
        });
        if (!user) {
            throw new exceptions_1.ValidationException('User not found');
        }
        // Verify current password
        const isPasswordValid = await bcryptjs_1.default.compare(current_password, user.passwordHash);
        if (!isPasswordValid) {
            throw new exceptions_1.ValidationException('Current password is incorrect', [], 'INVALID_PASSWORD', 400);
        }
        // Hash new password
        const newPasswordHash = await bcryptjs_1.default.hash(new_password, env_1.env.BCRYPT_SALT_ROUNDS);
        // Update password
        await client_1.default.user.update({
            where: { userId },
            data: { passwordHash: newPasswordHash },
        });
        logger_1.logger.info('Password changed', { userId });
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map