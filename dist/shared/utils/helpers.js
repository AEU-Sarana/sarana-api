"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRandomString = generateRandomString;
exports.deepClone = deepClone;
exports.isEmpty = isEmpty;
exports.paginate = paginate;
exports.getLocalNetworkIP = getLocalNetworkIP;
const os_1 = __importDefault(require("os"));
/**
 * Generate random string
 */
function generateRandomString(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
/**
 * Deep clone object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
/**
 * Check if value is empty
 */
function isEmpty(value) {
    if (value === null || value === undefined)
        return true;
    if (typeof value === 'string')
        return value.trim().length === 0;
    if (Array.isArray(value))
        return value.length === 0;
    if (typeof value === 'object')
        return Object.keys(value).length === 0;
    return false;
}
function paginate(data, page, limit) {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = data.slice(startIndex, endIndex);
    return {
        data: paginatedData,
        pagination: {
            page,
            limit,
            total: data.length,
            totalPages: Math.ceil(data.length / limit),
        },
    };
}
/**
 * Get local network IP address
 */
function getLocalNetworkIP() {
    let interfaces;
    try {
        interfaces = os_1.default.networkInterfaces();
    }
    catch {
        return null;
    }
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] || []) {
            const family = iface.family;
            const isIPv4 = family === 'IPv4' || family === 4;
            if (isIPv4 && !iface.internal) {
                return iface.address;
            }
        }
    }
    return null;
}
//# sourceMappingURL=helpers.js.map