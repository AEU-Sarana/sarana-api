"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const api_version_middleware_1 = require("../shared/middleware/api-version.middleware");
const logging_middleware_1 = require("../shared/middleware/logging.middleware");
const rate_limit_middleware_1 = require("../shared/middleware/rate-limit.middleware");
const error_middleware_1 = require("../shared/middleware/error.middleware");
// Import version-specific routers
const v1_1 = __importDefault(require("./v1"));
const v2_1 = __importDefault(require("./v2")); // Future version
const router = (0, express_1.Router)();
// Apply global middleware
router.use(logging_middleware_1.loggingMiddleware);
router.use(api_version_middleware_1.apiVersionMiddleware);
router.use(rate_limit_middleware_1.apiRateLimiter);
// Health check endpoint (no version)
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is healthy',
        timestamp: new Date().toISOString(),
    });
});
// Route to version-specific routers
router.use('/v1', v1_1.default);
router.use('/v2', v2_1.default); // Future version
// Error middleware (must be last)
router.use(error_middleware_1.errorMiddleware);
exports.default = router;
//# sourceMappingURL=api.js.map