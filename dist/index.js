"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const bridge_simple_1 = __importDefault(require("./routes/bridge-simple"));
const auth_1 = __importDefault(require("./routes/auth"));
const logger_1 = require("./config/logger");
// Load environment variables
dotenv_1.default.config();
const logger = new logger_1.Logger("App");
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || "5001", 10);
const MONGODB_URI = process.env.MONGODB_URI || "";
// CORS configuration - support both local development and production
const allowedOrigins = [
    "http://localhost:5173", // Local development (Vite)
    "http://localhost:3000", // Local development alternative
    ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []), // Production URL from env
];
// Initialize MongoDB connection
async function connectMongoDB() {
    try {
        if (!MONGODB_URI) {
            logger.warn("⚠️ MONGODB_URI not set - skipping MongoDB connection");
            return false;
        }
        await mongoose_1.default.connect(MONGODB_URI, {
            retryWrites: true,
            w: "majority",
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 5000,
        });
        logger.info("✅ Successfully connected to MongoDB!");
        return true;
    }
    catch (error) {
        logger.error("⚠️ MongoDB connection error:", error.message);
        logger.info("⚠️ Continuing without MongoDB - in-memory storage will be used");
        return false;
    }
}
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
app.use("/api/auth", auth_1.default);
app.use("/api/bridge", bridge_simple_1.default);
// Health check
app.get("/health", async (req, res) => {
    try {
        const mongooseConnection = mongoose_1.default.connection.readyState === 1;
        if (mongooseConnection) {
            res.json({ status: "healthy", mongodb: "connected", port: PORT });
        }
        else {
            res.json({ status: "unhealthy", mongodb: "disconnected" });
        }
    }
    catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});
// Health check endpoint for Docker healthcheck
app.get("/api/bridge/health", async (req, res) => {
    try {
        const mongooseConnection = mongoose_1.default.connection.readyState === 1;
        res.json({
            status: mongooseConnection ? "healthy" : "unhealthy",
            mongodb: mongooseConnection ? "connected" : "disconnected",
            port: PORT,
        });
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
// Start server
async function startServer() {
    try {
        // Try to connect to MongoDB
        logger.info("Attempting MongoDB connection...");
        await connectMongoDB();
        // Start Express server
        const server = app.listen(PORT, "0.0.0.0", () => {
            logger.info(`🚀 Server running on http://0.0.0.0:${PORT}`);
            if (mongoose_1.default.connection.readyState === 1) {
                logger.info("✅ MongoDB connected");
            }
            else {
                logger.warn("⚠️  MongoDB not connected (non-blocking)");
            }
        });
        // Handle port in use error
        server.on("error", (error) => {
            if (error.code === "EADDRINUSE") {
                console.error(`❌ Port ${PORT} is already in use`);
                console.error(`Kill process: lsof -ti:${PORT} | xargs kill -9`);
            }
            process.exit(1);
        });
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}
// Graceful shutdown
process.on("SIGINT", async () => {
    logger.info("\n🛑 Shutting down gracefully...");
    await mongoose_1.default.disconnect();
    logger.info("MongoDB connection closed");
    process.exit(0);
});
startServer();
//# sourceMappingURL=index.js.map