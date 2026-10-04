"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertDatesToPhnomPenh = convertDatesToPhnomPenh;
const date_utils_1 = require("../../shared/utils/date-utils");
/**
 * Convert any Date found inside object/array into Phnom Penh ISO string.
 * Keeps the same keys. Does NOT add new keys.
 */
function convertDatesToPhnomPenh(input) {
    return convertAny(input);
}
function convertAny(value) {
    if (value == null)
        return value;
    // Convert Date -> "YYYY-MM-DDTHH:mm:ss+07:00"
    if (value instanceof Date) {
        return (0, date_utils_1.toPhnomPenhISOString)(value);
    }
    // If it's an ISO datetime string (with Z or timezone) or local-like string, try to parse
    if (typeof value === 'string') {
        const trimmed = value.trim();
        // stricter regex to avoid false positives like product codes
        // Matches YYYY-MM-DD or ISO 8601 patterns
        const datePattern = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?(?:\.\d{3})?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
        if (trimmed.length >= 10 && datePattern.test(trimmed)) {
            try {
                // parseClientDateTime supports ISO with offset and local YYYY-MM-DD HH:mm formats
                const parsed = (0, date_utils_1.parseClientDateTime)(trimmed);
                if (!isNaN(parsed.getTime())) {
                    return (0, date_utils_1.toPhnomPenhISOString)(parsed);
                }
            }
            catch (err) {
                // not a parseable datetime string, leave as-is
            }
        }
    }
    // Array
    if (Array.isArray(value)) {
        return value.map(convertAny);
    }
    // Plain object
    if (typeof value === 'object') {
        const out = {};
        for (const key of Object.keys(value)) {
            out[key] = convertAny(value[key]);
        }
        return out;
    }
    // primitive
    return value;
}
//# sourceMappingURL=timezone.js.map