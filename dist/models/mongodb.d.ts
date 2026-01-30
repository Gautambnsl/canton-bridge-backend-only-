import mongoose from "mongoose";
export declare const DepositAddress: mongoose.Model<{
    address: string;
    privateKey: string;
    createdAt: NativeDate;
    partyId: string;
    status: "PENDING" | "CONFIRMED" | "PROCESSED";
    userId: string;
    expectedAmount: number;
    blockConfirmations: number;
    sentToStaticAddress: boolean;
    ethTxHash?: string | null | undefined;
}, {}, {}, {
    id: string;
}, mongoose.Document<unknown, {}, {
    address: string;
    privateKey: string;
    createdAt: NativeDate;
    partyId: string;
    status: "PENDING" | "CONFIRMED" | "PROCESSED";
    userId: string;
    expectedAmount: number;
    blockConfirmations: number;
    sentToStaticAddress: boolean;
    ethTxHash?: string | null | undefined;
}, {
    id: string;
}, mongoose.DefaultSchemaOptions> & Omit<{
    address: string;
    privateKey: string;
    createdAt: NativeDate;
    partyId: string;
    status: "PENDING" | "CONFIRMED" | "PROCESSED";
    userId: string;
    expectedAmount: number;
    blockConfirmations: number;
    sentToStaticAddress: boolean;
    ethTxHash?: string | null | undefined;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, {
    address: string;
    privateKey: string;
    createdAt: NativeDate;
    partyId: string;
    status: "PENDING" | "CONFIRMED" | "PROCESSED";
    userId: string;
    expectedAmount: number;
    blockConfirmations: number;
    sentToStaticAddress: boolean;
    ethTxHash?: string | null | undefined;
}, mongoose.Document<unknown, {}, {
    address: string;
    privateKey: string;
    createdAt: NativeDate;
    partyId: string;
    status: "PENDING" | "CONFIRMED" | "PROCESSED";
    userId: string;
    expectedAmount: number;
    blockConfirmations: number;
    sentToStaticAddress: boolean;
    ethTxHash?: string | null | undefined;
}, {
    id: string;
}, mongoose.ResolveSchemaOptions<mongoose.DefaultSchemaOptions>> & Omit<{
    address: string;
    privateKey: string;
    createdAt: NativeDate;
    partyId: string;
    status: "PENDING" | "CONFIRMED" | "PROCESSED";
    userId: string;
    expectedAmount: number;
    blockConfirmations: number;
    sentToStaticAddress: boolean;
    ethTxHash?: string | null | undefined;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    [path: string]: mongoose.SchemaDefinitionProperty<undefined, any, any>;
} | {
    [x: string]: mongoose.SchemaDefinitionProperty<any, any, mongoose.Document<unknown, {}, {
        address: string;
        privateKey: string;
        createdAt: NativeDate;
        partyId: string;
        status: "PENDING" | "CONFIRMED" | "PROCESSED";
        userId: string;
        expectedAmount: number;
        blockConfirmations: number;
        sentToStaticAddress: boolean;
        ethTxHash?: string | null | undefined;
    }, {
        id: string;
    }, mongoose.ResolveSchemaOptions<mongoose.DefaultSchemaOptions>> & Omit<{
        address: string;
        privateKey: string;
        createdAt: NativeDate;
        partyId: string;
        status: "PENDING" | "CONFIRMED" | "PROCESSED";
        userId: string;
        expectedAmount: number;
        blockConfirmations: number;
        sentToStaticAddress: boolean;
        ethTxHash?: string | null | undefined;
    } & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, {
    address: string;
    privateKey: string;
    createdAt: NativeDate;
    partyId: string;
    status: "PENDING" | "CONFIRMED" | "PROCESSED";
    userId: string;
    expectedAmount: number;
    blockConfirmations: number;
    sentToStaticAddress: boolean;
    ethTxHash?: string | null | undefined;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>, {
    address: string;
    privateKey: string;
    createdAt: NativeDate;
    partyId: string;
    status: "PENDING" | "CONFIRMED" | "PROCESSED";
    userId: string;
    expectedAmount: number;
    blockConfirmations: number;
    sentToStaticAddress: boolean;
    ethTxHash?: string | null | undefined;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
export declare const PartyBalance: mongoose.Model<{
    createdAt: NativeDate;
    partyId: string;
    balance: number;
    totalReceived: number;
    lastUpdated: NativeDate;
}, {}, {}, {
    id: string;
}, mongoose.Document<unknown, {}, {
    createdAt: NativeDate;
    partyId: string;
    balance: number;
    totalReceived: number;
    lastUpdated: NativeDate;
}, {
    id: string;
}, mongoose.DefaultSchemaOptions> & Omit<{
    createdAt: NativeDate;
    partyId: string;
    balance: number;
    totalReceived: number;
    lastUpdated: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, {
    createdAt: NativeDate;
    partyId: string;
    balance: number;
    totalReceived: number;
    lastUpdated: NativeDate;
}, mongoose.Document<unknown, {}, {
    createdAt: NativeDate;
    partyId: string;
    balance: number;
    totalReceived: number;
    lastUpdated: NativeDate;
}, {
    id: string;
}, mongoose.ResolveSchemaOptions<mongoose.DefaultSchemaOptions>> & Omit<{
    createdAt: NativeDate;
    partyId: string;
    balance: number;
    totalReceived: number;
    lastUpdated: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    [path: string]: mongoose.SchemaDefinitionProperty<undefined, any, any>;
} | {
    [x: string]: mongoose.SchemaDefinitionProperty<any, any, mongoose.Document<unknown, {}, {
        createdAt: NativeDate;
        partyId: string;
        balance: number;
        totalReceived: number;
        lastUpdated: NativeDate;
    }, {
        id: string;
    }, mongoose.ResolveSchemaOptions<mongoose.DefaultSchemaOptions>> & Omit<{
        createdAt: NativeDate;
        partyId: string;
        balance: number;
        totalReceived: number;
        lastUpdated: NativeDate;
    } & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, {
    createdAt: NativeDate;
    partyId: string;
    balance: number;
    totalReceived: number;
    lastUpdated: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>, {
    createdAt: NativeDate;
    partyId: string;
    balance: number;
    totalReceived: number;
    lastUpdated: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
//# sourceMappingURL=mongodb.d.ts.map