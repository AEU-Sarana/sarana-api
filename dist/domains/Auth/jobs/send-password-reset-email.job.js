"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetEmailJob = sendPasswordResetEmailJob;
const brevo_mail_service_1 = require("../../../shared/services/brevo-mail.service");
const logger_1 = require("../../../shared/utils/logger");
async function sendPasswordResetEmailJob(payload) {
    const displayName = payload.fullName?.trim() || payload.username;
    const subject = 'Your Password Reset Code';
    const text = `Hello ${displayName},

We received a request to reset your password.

Your verification code is: ${payload.otpCode}

This code will expire in 15 minutes.

If you did not request this, you can ignore this email.`;
    const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
      <p>Hello <strong>${displayName}</strong>,</p>
      <p>We received a request to reset your password.</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">Your verification code is:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827; margin: 10px 0;">${payload.otpCode}</p>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">This code will expire in 15 minutes</p>
      </div>
      <p style="font-size: 12px; color: #6b7280;">If you did not request this, you can ignore this email.</p>
    </div>
  `.trim();
    try {
        await (0, brevo_mail_service_1.sendEmail)({
            to: payload.toEmail,
            subject,
            html,
            text,
        });
        logger_1.logger.info('Password reset OTP email sent', {
            toEmail: payload.toEmail,
            username: payload.username,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to send password reset OTP email', {
            toEmail: payload.toEmail,
            username: payload.username,
            error: error?.message || error,
        });
        throw error;
    }
}
//# sourceMappingURL=send-password-reset-email.job.js.map