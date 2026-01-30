"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const winston_1 = __importDefault(require("winston"));
class Logger {
    constructor(label) {
        this.logger = winston_1.default.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.printf(({ timestamp, level, message, label, ...meta }) => {
                return `${timestamp} [${label}] ${level.toUpperCase()}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
            })),
            defaultMeta: { label },
            transports: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
                ? [new winston_1.default.transports.Console()]
                : [
                    new winston_1.default.transports.Console(),
                    new winston_1.default.transports.File({ filename: 'logs/error.log', level: 'error' }),
                    new winston_1.default.transports.File({ filename: 'logs/combined.log' }),
                ],
        });
    }
    info(message, meta) {
        this.logger.info(message, meta);
    }
    error(message, error) {
        this.logger.error(message, error);
    }
    warn(message, meta) {
        this.logger.warn(message, meta);
    }
    debug(message, meta) {
        this.logger.debug(message, meta);
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map