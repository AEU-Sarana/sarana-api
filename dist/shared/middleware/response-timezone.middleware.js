"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.responseTimezoneMiddleware = responseTimezoneMiddleware;
const timezone_1 = require("../../shared/utils/timezone");
function responseTimezoneMiddleware(req, res, next) {
    const originalJson = res.json.bind(res);
    res.json = ((body) => {
        const transformed = (0, timezone_1.convertDatesToPhnomPenh)(body);
        return originalJson(transformed);
    });
    next();
}
//# sourceMappingURL=response-timezone.middleware.js.map