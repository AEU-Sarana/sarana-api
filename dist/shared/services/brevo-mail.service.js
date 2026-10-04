"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const sib_api_v3_sdk_1 = __importDefault(require("sib-api-v3-sdk"));
const client = sib_api_v3_sdk_1.default.ApiClient.instance;
// Configure API key
client.authentications['api-key'].apiKey =
    process.env.BREVO_API_KEY;
const transactionalApi = new sib_api_v3_sdk_1.default.TransactionalEmailsApi();
async function sendEmail(options) {
    return transactionalApi.sendTransacEmail({
        sender: {
            email: process.env.BREVO_SENDER_EMAIL,
            name: process.env.BREVO_SENDER_NAME,
        },
        to: [{ email: options.to }],
        subject: options.subject,
        htmlContent: options.html,
        textContent: options.text,
    });
}
//# sourceMappingURL=brevo-mail.service.js.map