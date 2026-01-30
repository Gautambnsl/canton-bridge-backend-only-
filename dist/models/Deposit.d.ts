import mongoose, { Document } from "mongoose";
export interface IDeposit extends Document {
    tempAddress: string;
    partyId: string;
    amount: number;
    status: "PENDING" | "CONFIRMED" | "FORWARDED";
    txHash?: string;
    confirmedAt?: Date;
    forwardedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Deposit: mongoose.Model<IDeposit, {}, {}, {}, mongoose.Document<unknown, {}, IDeposit, {}, mongoose.DefaultSchemaOptions> & IDeposit & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IDeposit>;
//# sourceMappingURL=Deposit.d.ts.map