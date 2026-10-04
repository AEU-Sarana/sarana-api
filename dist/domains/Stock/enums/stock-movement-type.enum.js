"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockStatus = exports.StockMovementType = void 0;
var StockMovementType;
(function (StockMovementType) {
    StockMovementType["STOCK_IN"] = "STOCK_IN";
    StockMovementType["STOCK_OUT"] = "STOCK_OUT";
    StockMovementType["ADJUSTMENT"] = "ADJUSTMENT";
    StockMovementType["RETURN"] = "RETURN";
})(StockMovementType || (exports.StockMovementType = StockMovementType = {}));
var StockStatus;
(function (StockStatus) {
    StockStatus["IN_STOCK"] = "IN_STOCK";
    StockStatus["LOW_STOCK"] = "LOW_STOCK";
    StockStatus["OUT_OF_STOCK"] = "OUT_OF_STOCK";
    StockStatus["NEGATIVE"] = "NEGATIVE";
})(StockStatus || (exports.StockStatus = StockStatus = {}));
//# sourceMappingURL=stock-movement-type.enum.js.map