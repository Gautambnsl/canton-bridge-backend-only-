import mongoose, { Schema, Document } from "mongoose";

export interface ITempAddress extends Document {
	evmAddress: string; // The user's EVM wallet address
	address: string; // The temp address
	privateKey: string; // The private key of temp address
	createdAt: Date;
	updatedAt: Date;
}

const TempAddressSchema = new Schema<ITempAddress>(
	{
		evmAddress: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
		},
		address: {
			type: String,
			required: true,
		},
		privateKey: {
			type: String,
			required: true,
		},
	},
	{
		timestamps: true,
	},
);

export const TempAddress = mongoose.model<ITempAddress>(
	"TempAddress",
	TempAddressSchema,
);
