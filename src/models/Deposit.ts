import mongoose, { Schema, Document } from "mongoose";

export interface IDeposit extends Document {
	tempAddress: string; // The temp address that received the funds
	partyId: string; // The party ID
	amount: number; // Amount in ETH
	status: "PENDING" | "CONFIRMED" | "FORWARDED";
	txHash?: string; // Transaction hash
	confirmedAt?: Date;
	forwardedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}

const DepositSchema = new Schema<IDeposit>(
	{
		tempAddress: {
			type: String,
			required: true,
		},
		partyId: {
			type: String,
			required: true,
		},
		amount: {
			type: Number,
			required: true,
		},
		status: {
			type: String,
			enum: ["PENDING", "CONFIRMED", "FORWARDED"],
			default: "PENDING",
		},
		txHash: String,
		confirmedAt: Date,
		forwardedAt: Date,
	},
	{
		timestamps: true,
	},
);

export const Deposit = mongoose.model<IDeposit>("Deposit", DepositSchema);
