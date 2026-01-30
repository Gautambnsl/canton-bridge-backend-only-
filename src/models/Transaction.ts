import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
	fromAddress: string; // EVM wallet address
	toPartyId: string; // Canton party ID
	amount: number; // Amount in ETH
	txHash: string; // Transaction hash
	tempAddress: string; // Temporary deposit address used
	status: "PENDING" | "CONFIRMED" | "FORWARDED" | "FAILED";
	createdAt: Date;
	updatedAt?: Date;
	confirmedAt?: Date;
	forwardedAt?: Date;
	failureReason?: string;
}

const transactionSchema = new Schema<ITransaction>(
	{
		fromAddress: {
			type: String,
			required: true,
			lowercase: true,
			index: true,
		},
		toPartyId: {
			type: String,
			required: true,
			index: true,
		},
		amount: {
			type: Number,
			required: true,
		},
		txHash: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		tempAddress: {
			type: String,
			required: true,
			lowercase: true,
		},
		status: {
			type: String,
			enum: ["PENDING", "CONFIRMED", "FORWARDED", "FAILED"],
			default: "PENDING",
			index: true,
		},
		confirmedAt: Date,
		forwardedAt: Date,
		failureReason: String,
	},
	{
		timestamps: true,
	},
);

const Transaction =
	mongoose.models.Transaction ||
	mongoose.model<ITransaction>("Transaction", transactionSchema);

export default Transaction;
