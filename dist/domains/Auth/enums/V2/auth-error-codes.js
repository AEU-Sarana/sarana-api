"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthErrorCode = void 0;
var AuthErrorCode;
(function (AuthErrorCode) {
    AuthErrorCode["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    AuthErrorCode["INVALID_REFRESH_TOKEN"] = "INVALID_REFRESH_TOKEN";
    AuthErrorCode["REFRESH_IDLE_EXPIRED"] = "REFRESH_IDLE_EXPIRED";
    AuthErrorCode["REFRESH_ABSOLUTE_EXPIRED"] = "REFRESH_ABSOLUTE_EXPIRED";
    AuthErrorCode["TOKEN_REVOKED"] = "TOKEN_REVOKED";
    AuthErrorCode["DEVICE_REVOKED"] = "DEVICE_REVOKED";
    AuthErrorCode["TOKEN_REUSE_DETECTED"] = "TOKEN_REUSE_DETECTED";
    AuthErrorCode["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
})(AuthErrorCode || (exports.AuthErrorCode = AuthErrorCode = {}));
//# sourceMappingURL=auth-error-codes.js.map