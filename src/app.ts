import express, { Express } from "express";
import mongoose from "mongoose";
import cors from "cors";
import bridgeRoutes from "./routes/bridge-simple";
import authRoutes from "./routes/auth";
import { Logger } from "./config/logger";

const logger = new Logger("App");
const app: Express = express();
const MONGODB_URI = process.env.MONGODB_URI || "";

// CORS configuration - support both local development and production
const allowedOrigins: string[] = [
	"http://localhost:5173", // Local development
	"http://localhost:3000", // Local development alternative
	...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []), // Production URL from env
];

// Initialize MongoDB connection (only if not already connected)
async function connectMongoDB() {
	if (mongoose.connection.readyState !== 1) {
		try {
			await mongoose.connect(MONGODB_URI, {
				retryWrites: true,
				w: "majority",
			});
			logger.info("✅ Successfully connected to MongoDB!");
			return true;
		} catch (error) {
			logger.error("⚠️ MongoDB connection error:", error);
			logger.info(
				"⚠️ Continuing without MongoDB - in-memory storage will be used",
			);
			return false;
		}
	}
	return true;
}

// Connect to MongoDB on cold start
connectMongoDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware - proper configuration
app.use(
	cors({
		origin: allowedOrigins,
		credentials: true,
	}),
);

// Request logging middleware
app.use((req, res, next) => {
	console.log(`${req.method} ${req.path}`);
	next();
});

// Routes
app.use("/auth", authRoutes);
app.use("/bridge", bridgeRoutes);

// Health check
app.get("/health", async (req, res) => {
	try {
		const mongooseConnection = mongoose.connection.readyState === 1;
		if (mongooseConnection) {
			res.json({ status: "healthy", mongodb: "connected" });
		} else {
			res.json({ status: "unhealthy", mongodb: "disconnected" });
		}
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

// Catch-all 404 for debugging
app.use((req, res) => {
	res.status(404).json({ error: "Not found", path: req.path });
});

export default app;
