"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidEmail = isValidEmail;
exports.isValidPhone = isValidPhone;
exports.isValidUUID = isValidUUID;
exports.isValidPIN = isValidPIN;
exports.sanitizeString = sanitizeString;
/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
/**
 * Validate phone number (Cambodia format)
 */
function isValidPhone(phone) {
    const phoneRegex = /^(\+855|0)[0-9]{8,9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}
/**
 * Validate UUID format
 */
function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}
/**
 * Validate PIN (4-6 digits)
 */
function isValidPIN(pin) {
    const pinRegex = /^\d{4,6}$/;
    return pinRegex.test(pin);
}
/**
 * Sanitize string input
 */
function sanitizeString(input) {
    return input.trim().replace(/[<>]/g, '');
}
//# sourceMappingURL=validators.js.map