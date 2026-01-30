"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartyBalance = exports.DepositAddress = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// Deposit Address Schema - stores generated temp addresses with private keys
const depositAddressSchema = new mongoose_1.default.Schema({
    address: {
        type: String,
        required: true,
        unique: true,
    },
    privateKey: {
        type: String,
        required: true,
    },
    userId: {
        type: String,
        required: true,
    },
    partyId: {
        type: String,
        required: true,
    },
    expectedAmount: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ["PENDING", "CONFIRMED", "PROCESSED"],
        default: "PENDING",
    },
    blockConfirmations: {
        type: Number,
        default: 0,
    },
    ethTxHash: {
        type: String,
        default: null,
    },
    sentToStaticAddress: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400, // 24 hour TTL
    },
});
// Party Balance Schema - tracks balance per party
const partyBalanceSchema = new mongoose_1.default.Schema({
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
    createdAt: {
        type: Date,
        default: Date.now,
    },
});
exports.DepositAddress = mongoose_1.default.model("DepositAddress", depositAddressSchema);
exports.PartyBalance = mongoose_1.default.model("PartyBalance", partyBalanceSchema);
//# sourceMappingURL=mongodb.js.map