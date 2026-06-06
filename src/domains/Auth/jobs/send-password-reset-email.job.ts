import { sendEmail } from '@src/shared/services/brevo-mail.service';
import { logger } from '@src/shared/utils/logger';
import { type SendPasswordResetEmailJobPayload } from '@src/domains/Auth/types/V1/auth.types';

export async function sendPasswordResetEmailJob(
  payload: SendPasswordResetEmailJobPayload
): Promise<void> {
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
    await sendEmail({
      to: payload.toEmail,
      subject,
      html,
      text,
    });

    logger.info('Password reset OTP email sent', {
      toEmail: payload.toEmail,
      username: payload.username,
    });
  } catch (error: any) {
    logger.error('Failed to send password reset OTP email', {
      toEmail: payload.toEmail,
      username: payload.username,
      error: error?.message || error,
    });
    throw error;
  }
}