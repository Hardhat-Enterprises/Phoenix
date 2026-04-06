"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
var winston = require("winston");
var config_1 = require("./config");
exports.logger = winston.createLogger({
    level: config_1.config.LOG_LEVEL,
    defaultMeta: { service: config_1.config.SERVICE_NAME },
    format: winston.format.combine(winston.format.timestamp(), winston.format.printf(function (_a) {
        var level = _a.level, message = _a.message, timestamp = _a.timestamp, service = _a.service;
        return "[".concat(timestamp, "] [").concat(level, "] [").concat(service, "]: ").concat(message);
    })),
    transports: [new winston.transports.Console()],
});
