"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiVersionMiddleware = apiVersionMiddleware;
const api_version_1 = require("../../shared/config/api-version");
function apiVersionMiddleware(req, res, next) {
    // Extract version from header or query
    const headerVersion = req.headers['api-version'];
    const queryVersion = req.query.version;
    let version = api_version_1.API_VERSIONS.DEFAULT;
    if (headerVersion) {
        version = Array.isArray(headerVersion) ? headerVersion[0] : String(headerVersion);
    }
    else if (queryVersion) {
        const queryStr = Array.isArray(queryVersion) ? queryVersion[0] : queryVersion;
        version = typeof queryStr === 'string' ? queryStr : String(queryStr);
    }
    // Validate version
    if (!api_version_1.API_VERSIONS.SUPPORTED.includes(version)) {
        res.status(400).json({
            success: false,
            message: `Unsupported API version: ${version}`,
            code: 'UNSUPPORTED_API_VERSION',
            supportedVersions: api_version_1.API_VERSIONS.SUPPORTED,
        });
        return;
    }
    req.apiVersion = version;
    next();
}
//# sourceMappingURL=api-version.middleware.js.map