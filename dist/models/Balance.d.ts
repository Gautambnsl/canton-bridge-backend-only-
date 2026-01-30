import mongoose, { Document } from "mongoose";
export interface IBalance extends Document {
    partyId: string;
    balance: number;
    totalReceived: number;
    lastUpdated: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Balance: mongoose.Model<IBalance, {}, {}, {}, mongoose.Document<unknown, {}, IBalance, {}, mongoose.DefaultSchemaOptions> & IBalance & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IBalance>;
//# sourceMappingURL=Balance.d.ts.map