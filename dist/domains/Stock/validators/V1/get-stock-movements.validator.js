"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStockMovementsValidator = void 0;
const express_validator_1 = require("express-validator");
exports.getStockMovementsValidator = [
    (0, express_validator_1.query)('product_id').optional().isInt().withMessage('Product ID must be an integer'),
    (0, express_validator_1.query)('movement_type')
        .optional()
        .isIn(['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'RETURN'])
        .withMessage('Movement type must be STOCK_IN, STOCK_OUT, ADJUSTMENT, or RETURN'),
    (0, express_validator_1.query)('date_from').optional().isISO8601().withMessage('Date from must be a valid ISO 8601 date'),
    (0, express_validator_1.query)('date_to').optional().isISO8601().withMessage('Date to must be a valid ISO 8601 date'),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('Limit must be between 1 and 10000'),
];
//# sourceMappingURL=get-stock-movements.validator.js.map