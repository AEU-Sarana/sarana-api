"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = void 0;
const events_1 = require("events");
class EventBus extends events_1.EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50);
    }
}
exports.eventBus = new EventBus();
//# sourceMappingURL=event-bus.js.map