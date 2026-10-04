"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerReportEventListeners = registerReportEventListeners;
const event_bus_1 = require("../../../shared/events/event-bus");
const logger_1 = require("../../../shared/utils/logger");
function registerReportEventListeners() {
    event_bus_1.eventBus.on('reports.generated', (payload) => {
        logger_1.logger.info('Event reports.generated', {
            report_type: payload.report_type,
            generated_by: payload.generated_by,
            generated_at: payload.generated_at,
        });
    });
    event_bus_1.eventBus.on('reports.exported', (payload) => {
        logger_1.logger.info('Event reports.exported', {
            report_type: payload.report_type,
            file_name: payload.file_name,
            exported_by: payload.exported_by,
            exported_at: payload.exported_at,
        });
    });
}
//# sourceMappingURL=report.listeners.js.map