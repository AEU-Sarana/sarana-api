"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerStockEventListeners = registerStockEventListeners;
const event_bus_1 = require("../../../shared/events/event-bus");
const logger_1 = require("../../../shared/utils/logger");
function registerStockEventListeners() {
    event_bus_1.eventBus.on('stock.updated', (payload) => {
        logger_1.logger.info('Event stock.updated', payload);
    });
    event_bus_1.eventBus.on('stock.movement.created', (payload) => {
        logger_1.logger.info('Event stock.movement.created', payload);
    });
}
//# sourceMappingURL=stock.listeners.js.map