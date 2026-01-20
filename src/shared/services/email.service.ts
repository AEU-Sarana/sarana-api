import nodemailer from 'nodemailer';
import { env } from '@src/shared/config/env';
import { logger } from '@src/shared/utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure email transporter (if email service is needed)
    // For Phase 1, this is optional
    this.transporter = nodemailer.createTransport({
      // Configure based on your email provider
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@stockpos.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();