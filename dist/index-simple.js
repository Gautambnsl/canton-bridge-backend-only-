"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Simple in-memory storage
const deposits = new Map();
// Routes
app.get("/health", (req, res) => {
    res.json({ status: "OK" });
});
app.get("/api/bridge/health", (req, res) => {
    res.json({
        status: "OK",
        network: "Arbitrum Sepolia",
        confirmations: 6,
    });
});
app.post("/api/bridge/assign-address", (req, res) => {
    const { address, privateKey, partyId, amount } = req.body;
    if (!address || !privateKey || !partyId || !amount) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    deposits.set(address, { privateKey, partyId, amount, status: "PENDING" });
    console.log(`✅ Assigned address ${address} for party ${partyId}, amount: ${amount} ETH`);
    res.json({ success: true, address });
});
app.post("/api/bridge/confirm-and-forward", (req, res) => {
    const { depositAddress, txHash, partyId, amount } = req.body;
    console.log(`✅ Confirming ${amount} ETH for ${partyId}, tx: ${txHash}`);
    res.json({
        success: true,
        status: "CONFIRMED",
        confirmations: 6,
        partyId,
        balance: amount,
        message: "Funds confirmed and forwarded to vault",
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api/bridge`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}\n`);
});
//# sourceMappingURL=index-simple.js.map