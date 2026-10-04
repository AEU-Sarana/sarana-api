"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = require("../../shared/utils/logger");
class EmailService {
    constructor() {
        // Configure email transporter (if email service is needed)
        // For Phase 1, this is optional
        this.transporter = nodemailer_1.default.createTransport({
        // Configure based on your email provider
        });
    }
    async sendEmail(options) {
        try {
            await this.transporter.sendMail({
                from: process.env.EMAIL_FROM || 'noreply@stockpos.com',
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to send email:', error);
            return false;
        }
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
//# sourceMappingURL=email.service.js.map