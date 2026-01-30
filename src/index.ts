import express, { Express } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import bridgeRoutes from "./routes/bridge-simple";
import authRoutes from "./routes/auth";
import { Logger } from "./config/logger";

// Load environment variables
dotenv.config();

const logger = new Logger("App");
const app: Express = express();
const PORT = parseInt(process.env.PORT || "5001", 10);
const MONGODB_URI = process.env.MONGODB_URI || "";

// CORS configuration - support both local development and production
const allowedOrigins: string[] = [
	"http://localhost:5173", // Local development (Vite)
	"http://localhost:3000", // Local development alternative
	"https://cerulean-scone-426b80.netlify.app", // Netlify frontend
	...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []), // Production URL from env
];

// Initialize MongoDB connection
async function connectMongoDB() {
	try {
		if (!MONGODB_URI) {
			logger.warn("⚠️ MONGODB_URI not set - skipping MongoDB connection");
			return false;
		}
		await mongoose.connect(MONGODB_URI, {
			retryWrites: true,
			w: "majority",
			serverSelectionTimeoutMS: 5000,
			socketTimeoutMS: 5000,
		});
		logger.info("✅ Successfully connected to MongoDB!");
		return true;
	} catch (error: any) {
		logger.error("⚠️ MongoDB connection error:", error.message);
		logger.info(
			"⚠️ Continuing without MongoDB - in-memory storage will be used",
		);
		return false;
	}
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware - proper configuration
app.use(
	cors({
		origin: (origin, callback) => {
			// Allow all origins in production (Vercel handles security)
			callback(null, true);
		},
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
	}),
);

// Request logging middleware
app.use((req, res, next) => {
	console.log(`${req.method} ${req.path}`);
	next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/bridge", bridgeRoutes);

// Health check
app.get("/health", async (req, res) => {
	try {
		const mongooseConnection = mongoose.connection.readyState === 1;
		if (mongooseConnection) {
			res.json({ status: "healthy", mongodb: "connected", port: PORT });
		} else {
			res.json({ status: "unhealthy", mongodb: "disconnected" });
		}
	} catch (error: any) {
		res.status(500).json({ status: "error", message: error.message });
	}
});

// Health check endpoint for Docker healthcheck
app.get("/api/bridge/health", async (req, res) => {
	try {
		const mongooseConnection = mongoose.connection.readyState === 1;
		res.json({
			status: mongooseConnection ? "healthy" : "unhealthy",
			mongodb: mongooseConnection ? "connected" : "disconnected",
			port: PORT,
		});
	} catch (error: any) {
		res.status(500).json({ status: "error", message: error.message });
	}
});

// Error handling middleware
app.use(
	(
		err: any,
		req: express.Request,
		res: express.Response,
		next: express.NextFunction,
	) => {
		console.error("Unhandled error", err);
		res.status(500).json({
			error: "Internal server error",
			message: process.env.NODE_ENV === "development" ? err.message : undefined,
		});
	},
);

// Start server
async function startServer() {
	try {
		// Try to connect to MongoDB
		logger.info("Attempting MongoDB connection...");
		await connectMongoDB();

		// Start Express server
		const server = app.listen(PORT, "0.0.0.0", () => {
			logger.info(`🚀 Server running on http://0.0.0.0:${PORT}`);
			if (mongoose.connection.readyState === 1) {
				logger.info("✅ MongoDB connected");
			} else {
				logger.warn("⚠️  MongoDB not connected (non-blocking)");
			}
		});

		// Handle port in use error
		server.on("error", (error: any) => {
			if (error.code === "EADDRINUSE") {
				console.error(`❌ Port ${PORT} is already in use`);
				console.error(`Kill process: lsof -ti:${PORT} | xargs kill -9`);
			}
			process.exit(1);
		});
	} catch (error) {
		console.error("Failed to start server:", error);
		process.exit(1);
	}
}

// Graceful shutdown
process.on("SIGINT", async () => {
	logger.info("\n🛑 Shutting down gracefully...");
	await mongoose.disconnect();
	logger.info("MongoDB connection closed");
	process.exit(0);
});

startServer();
