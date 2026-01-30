import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
	email: string;
	username: string;
	password: string;
	partyId: string;
	createdAt: Date;
}

const userSchema = new Schema<IUser>(
	{
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		username: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		password: {
			type: String,
			required: true,
		},
		partyId: {
			type: String,
			required: true,
			unique: true,
		},
		createdAt: {
			type: Date,
			default: Date.now,
		},
	},
	{ timestamps: true },
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;
