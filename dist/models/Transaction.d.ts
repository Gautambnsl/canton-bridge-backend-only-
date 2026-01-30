import mongoose, { Document } from "mongoose";
export interface ITransaction extends Document {
    fromAddress: string;
    toPartyId: string;
    amount: number;
    txHash: string;
    tempAddress: string;
    status: "PENDING" | "CONFIRMED" | "FORWARDED" | "FAILED";
    createdAt: Date;
    updatedAt?: Date;
    confirmedAt?: Date;
    forwardedAt?: Date;
    failureReason?: string;
}
declare const Transaction: mongoose.Model<any, {}, {}, {}, any, any, any>;
export default Transaction;
//# sourceMappingURL=Transaction.d.ts.map