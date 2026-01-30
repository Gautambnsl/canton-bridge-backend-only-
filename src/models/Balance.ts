import mongoose, { Schema, Document } from "mongoose";

export interface IBalance extends Document {
	partyId: string;
	balance: number; // Current balance in ETH
	totalReceived: number; // Total received in ETH
	lastUpdated: Date;
	createdAt: Date;
	updatedAt: Date;
}

const BalanceSchema = new Schema<IBalance>(
	{
		partyId: {
			type: String,
			required: true,
			unique: true,
		},
		balance: {
			type: Number,
			default: 0,
		},
		totalReceived: {
			type: Number,
			default: 0,
		},
		lastUpdated: {
			type: Date,
			default: Date.now,
		},
	},
	{
		timestamps: true,
	},
);

export const Balance = mongoose.model<IBalance>("Balance", BalanceSchema);
