import mongoose from "mongoose";
import { Logger } from "./logger";

const logger = new Logger("MongoDB");

const MONGODB_URI =
	process.env.MONGODB_URI ||
	"mongodb+srv://bansalgautam005_db_user:dgxNBquFkNepU15Q@cluster0.iokgba5.mongodb.net/?appName=Cluster0";

export async function connectMongoDB() {
	try {
		await mongoose.connect(MONGODB_URI, {
			retryWrites: true,
			w: "majority",
		});
		logger.info("Connected to MongoDB");
	} catch (error) {
		logger.error("Failed to connect to MongoDB", error);
		throw error;
	}
}

export async function closeMongoDB() {
	try {
		await mongoose.disconnect();
		logger.info("Disconnected from MongoDB");
	} catch (error) {
		logger.error("Failed to disconnect from MongoDB", error);
	}
}
