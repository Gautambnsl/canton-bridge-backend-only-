import mongoose, { Document } from "mongoose";
export interface ITempAddress extends Document {
    evmAddress: string;
    address: string;
    privateKey: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const TempAddress: mongoose.Model<ITempAddress, {}, {}, {}, mongoose.Document<unknown, {}, ITempAddress, {}, mongoose.DefaultSchemaOptions> & ITempAddress & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ITempAddress>;
//# sourceMappingURL=TempAddress.d.ts.map