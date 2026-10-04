"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_VERSIONS = void 0;
exports.getApiVersion = getApiVersion;
exports.isSupportedVersion = isSupportedVersion;
/**
 * API version configuration
 */
exports.API_VERSIONS = {
    DEFAULT: 'v1',
    SUPPORTED: ['v1', 'v2'], // v2 for future
    LATEST: 'v1',
};
/**
 * Get API version from request
 */
function getApiVersion(version) {
    if (!version)
        return exports.API_VERSIONS.DEFAULT;
    if (exports.API_VERSIONS.SUPPORTED.includes(version)) {
        return version;
    }
    return exports.API_VERSIONS.DEFAULT;
}
/**
 * Check if API version is supported
 */
function isSupportedVersion(version) {
    return exports.API_VERSIONS.SUPPORTED.includes(version);
}
//# sourceMappingURL=api-version.js.map