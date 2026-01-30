"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const bridge_simple_1 = __importDefault(require("./routes/bridge-simple"));
const auth_1 = __importDefault(require("./routes/auth"));
const logger_1 = require("./config/logger");
const logger = new logger_1.Logger("App");
const app = (0, express_1.default)();
const MONGODB_URI = process.env.MONGODB_URI || "";
// CORS configuration - support both local development and production
const allowedOrigins = [
    "http://localhost:5173", // Local development
    "http://localhost:3000", // Local development alternative
    ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []), // Production URL from env
];
// Initialize MongoDB connection (only if not already connected)
async function connectMongoDB() {
    if (mongoose_1.default.connection.readyState !== 1) {
        try {
            await mongoose_1.default.connect(MONGODB_URI, {
                retryWrites: true,
                w: "majority",
            });
            logger.info("✅ Successfully connected to MongoDB!");
            return true;
        }
        catch (error) {
            logger.error("⚠️ MongoDB connection error:", error);
            logger.info("⚠️ Continuing without MongoDB - in-memory storage will be used");
            return false;
        }
    }
    return true;
}
// Connect to MongoDB on cold start
connectMongoDB();
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// CORS middleware - proper configuration
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true,
}));
// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});
// Routes
app.use("/auth", auth_1.default);
app.use("/bridge", bridge_simple_1.default);
// Health check
app.get("/health", async (req, res) => {
    try {
        const mongooseConnection = mongoose_1.default.connection.readyState === 1;
        if (mongooseConnection) {
            res.json({ status: "healthy", mongodb: "connected" });
        }
        else {
            res.json({ status: "unhealthy", mongodb: "disconnected" });
        }
    }
    catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Unhandled error", err);
    res.status(500).json({
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
});
// Catch-all 404 for debugging
app.use((req, res) => {
    res.status(404).json({ error: "Not found", path: req.path });
});
exports.default = app;
//# sourceMappingURL=app.js.map