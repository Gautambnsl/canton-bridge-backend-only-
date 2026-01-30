"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectMongoDB = connectMongoDB;
exports.closeMongoDB = closeMongoDB;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("./logger");
const logger = new logger_1.Logger("MongoDB");
const MONGODB_URI = process.env.MONGODB_URI ||
    "mongodb+srv://bansalgautam005_db_user:dgxNBquFkNepU15Q@cluster0.iokgba5.mongodb.net/?appName=Cluster0";
async function connectMongoDB() {
    try {
        await mongoose_1.default.connect(MONGODB_URI, {
            retryWrites: true,
            w: "majority",
        });
        logger.info("Connected to MongoDB");
    }
    catch (error) {
        logger.error("Failed to connect to MongoDB", error);
        throw error;
    }
}
async function closeMongoDB() {
    try {
        await mongoose_1.default.disconnect();
        logger.info("Disconnected from MongoDB");
    }
    catch (error) {
        logger.error("Failed to disconnect from MongoDB", error);
    }
}
//# sourceMappingURL=mongodb.js.map