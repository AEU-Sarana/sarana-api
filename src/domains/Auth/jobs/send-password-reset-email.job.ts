import { sendEmail } from '@src/shared/services/brevo-mail.service';
import { logger } from '@src/shared/utils/logger';
import { type SendPasswordResetEmailJobPayload } from '@src/domains/Auth/types/auth.types';

function buildResetPasswordUrl(resetToken: string): string {
  const baseUrl =
    process.env.FRONTEND_URL ||
    process.env.APP_URL ||
    'http://localhost:3000';

  const url = new URL('/reset-password', baseUrl);
  url.searchParams.set('token', resetToken);
  return url.toString();
}

export async function sendPasswordResetEmailJob(
  payload: SendPasswordResetEmailJobPayload
): Promise<void> {
  const resetUrl = buildResetPasswordUrl(payload.resetToken);
  const displayName = payload.fullName?.trim() || payload.username;

  const subject = 'Reset your password';
  const text = `Hello ${displayName},

We received a request to reset your password.

Reset link: ${resetUrl}

If you did not request this, you can ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <p>Hello <strong>${displayName}</strong>,</p>
      <p>We received a request to reset your password.</p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;padding:10px 14px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;">
          Reset Password
        </a>
      </p>
      <p style="font-size:12px;color:#6b7280;">If you did not request this, you can ignore this email.</p>
    </div>
  `.trim();

  try {
    await sendEmail({
      to: payload.toEmail,
      subject,
      html,
      text,
    });

    logger.info('Password reset email sent', {
      toEmail: payload.toEmail,
      username: payload.username,
    });
  } catch (error: any) {
    logger.error('Failed to send password reset email', {
      toEmail: payload.toEmail,
      username: payload.username,
      error: error?.message || error,
    });
    throw error;
  }
}