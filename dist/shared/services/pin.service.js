"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPIN = verifyPIN;
exports.hashPIN = hashPIN;
// File: src/shared/services/pin.service.ts
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function verifyPIN(pin, pinHash) {
    return await bcryptjs_1.default.compare(pin, pinHash);
}
async function hashPIN(pin) {
    return await bcryptjs_1.default.hash(pin, 10);
}
//# sourceMappingURL=pin.service.js.map