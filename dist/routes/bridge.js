"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ethers_1 = require("ethers");
const joi_1 = __importDefault(require("joi"));
const mongodb_1 = require("../models/mongodb");
const logger_1 = require("../config/logger");
const logger = new logger_1.Logger("BridgeRoutes");
const router = (0, express_1.Router)();
const RPC_URL = process.env.EVM_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";
const CONFIRMATION_BLOCKS = parseInt(process.env.EVM_CONFIRMATION_BLOCKS || "6");
const STATIC_WALLET = process.env.STATIC_WALLET_ADDRESS ||
    "0xFCF07cf03599cBBAfB90ee179fc6F5b198B67474";
const provider = new ethers_1.ethers.JsonRpcProvider(RPC_URL);
// Validation schemas
const generateAddressSchema = joi_1.default.object({
    userId: joi_1.default.string().required(),
    partyId: joi_1.default.string().required(),
    amount: joi_1.default.number().required().min(0.001),
});
const confirmDepositSchema = joi_1.default.object({
    depositAddress: joi_1.default.string().required(),
    txHash: joi_1.default.string().required(),
});
// Assign a generated address to user (frontend generates, backend saves)
router.post("/assign-address", async (req, res) => {
    try {
        const { address, privateKey, partyId, amount } = req.body;
        if (!address || !privateKey || !partyId || !amount) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // Save to MongoDB
        const depositRecord = new mongodb_1.DepositAddress({
            address,
            privateKey,
            partyId,
            expectedAmount: amount,
            status: "PENDING",
        });
        await depositRecord.save();
        logger.info(`Assigned deposit address: ${address} for party: ${partyId}`);
        res.json({
            success: true,
            address,
            message: "Address assigned successfully",
        });
    }
    catch (error) {
        logger.error("Error assigning address", error);
        res.status(500).json({ error: "Failed to assign address" });
    }
});
// Confirm transaction and forward funds (called by frontend after 6 confirmations detected)
router.post("/confirm-and-forward", async (req, res) => {
    try {
        const { depositAddress, txHash, partyId, amount } = req.body;
        if (!depositAddress || !txHash || !partyId || !amount) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // Verify transaction on blockchain
        const receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt) {
            return res.status(400).json({ error: "Transaction not found" });
        }
        const currentBlock = await provider.getBlockNumber();
        const confirmations = currentBlock - receipt.blockNumber;
        if (confirmations < CONFIRMATION_BLOCKS) {
            return res.status(400).json({
                error: `Not enough confirmations. Need ${CONFIRMATION_BLOCKS}, have ${confirmations}`,
            });
        }
        // Get deposit record from DB
        const deposit = await mongodb_1.DepositAddress.findOneAndUpdate({ address: depositAddress }, {
            ethTxHash: txHash,
            blockConfirmations: confirmations,
            status: "CONFIRMED",
        }, { new: true });
        if (!deposit) {
            return res.status(404).json({ error: "Deposit address not found" });
        }
        // Update party balance
        const updated = await mongodb_1.PartyBalance.findOneAndUpdate({ partyId }, {
            $inc: {
                balance: amount,
                totalReceived: amount,
            },
            lastUpdated: new Date(),
        }, { upsert: true, new: true });
        logger.info(`Updated balance for party ${partyId}: +${amount} ETH`);
        // Send ETH from temp address to static wallet
        await sendEthToStaticAddress(deposit.privateKey, amount);
        res.json({
            success: true,
            status: "CONFIRMED",
            confirmations,
            partyId,
            balance: updated.balance,
            message: "Funds confirmed and forwarded to vault",
        });
    }
    catch (error) {
        logger.error("Error confirming and forwarding", error);
        res.status(500).json({ error: "Failed to confirm and forward" });
    }
});
// Send ETH from temp address to static wallet
async function sendEthToStaticAddress(tempPrivateKey, amount) {
    try {
        const tempWallet = new ethers_1.ethers.Wallet(tempPrivateKey, provider);
        // Get balance to ensure we have funds
        const balance = await provider.getBalance(tempWallet.address);
        logger.info(`Temp wallet balance: ${ethers_1.ethers.formatEther(balance)} ETH`);
        // Prepare transaction
        const tx = {
            to: STATIC_WALLET,
            value: ethers_1.ethers.parseEther(amount.toString()),
        };
        // Send transaction
        const txResponse = await tempWallet.sendTransaction(tx);
        await txResponse.wait(1); // Wait 1 confirmation
        logger.info(`Sent ${amount} ETH from ${tempWallet.address} to ${STATIC_WALLET}`);
    }
    catch (error) {
        logger.error("Error sending ETH to static address", error);
    }
}
// Get party balance
router.get("/balance/:partyId", async (req, res) => {
    try {
        const { partyId } = req.params;
        const partyData = await mongodb_1.PartyBalance.findOne({ partyId });
        res.json({
            partyId,
            balance: partyData?.balance || 0,
            totalReceived: partyData?.totalReceived || 0,
        });
    }
    catch (error) {
        logger.error("Error getting balance", error);
        res.status(500).json({ error: "Failed to get balance" });
    }
});
// Health check
router.get("/health", (req, res) => {
    res.json({
        status: "OK",
        network: "Arbitrum Sepolia",
        confirmations: CONFIRMATION_BLOCKS,
    });
});
exports.default = router;
//# sourceMappingURL=bridge.js.map