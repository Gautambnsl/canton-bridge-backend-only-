"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ethers_1 = require("ethers");
const logger_1 = require("../config/logger");
const TempAddress_1 = require("../models/TempAddress");
const Deposit_1 = require("../models/Deposit");
const Balance_1 = require("../models/Balance");
const Transaction_1 = __importDefault(require("../models/Transaction"));
const logger = new logger_1.Logger("BridgeRoutes");
const router = (0, express_1.Router)();
const RPC_URL = process.env.EVM_RPC_URL ||
    "https://eth-sepolia.g.alchemy.com/v2/GgqRIsVJXXFCb9n5xd7dnNJdOeuwbsjG";
const WS_RPC_URL = process.env.EVM_WS_RPC_URL ||
    "wss://eth-sepolia.g.alchemy.com/v2/GgqRIsVJXXFCb9n5xd7dnNJdOeuwbsjG";
const CONFIRMATION_BLOCKS = parseInt(process.env.EVM_CONFIRMATION_BLOCKS || "1");
const STATIC_WALLET = process.env.STATIC_WALLET_ADDRESS ||
    "0xFCF07cf03599cBBAfB90ee179fc6F5b198B67474";
// Valid party ID hash suffix
const VALID_PARTY_ID_SUFFIX = "::1220572515ea25db89f8aec321e1989d4cc6ec26b1dc71b6abc320a6aca688af744f";
const provider = new ethers_1.ethers.JsonRpcProvider(RPC_URL);
// Health check
router.get("/health", (req, res) => {
    res.json({
        status: "OK",
        network: "Ethereum Sepolia",
        confirmations: CONFIRMATION_BLOCKS,
    });
});
// Get or create a fixed temp address for an EVM account
router.post("/get-or-create-temp-address", async (req, res) => {
    try {
        const { evmAddress } = req.body;
        if (!evmAddress) {
            return res.status(400).json({ error: "EVM address is required" });
        }
        const normalizedAddress = evmAddress.toLowerCase();
        // Check if this account already has a temp address in MongoDB
        let tempAddressDoc = await TempAddress_1.TempAddress.findOne({
            evmAddress: normalizedAddress,
        });
        if (tempAddressDoc) {
            logger.info(`Returning existing temp address for account: ${normalizedAddress}`);
            return res.json({
                success: true,
                address: tempAddressDoc.address,
                isNew: false,
            });
        }
        // Create new temp address for this account
        const tempWallet = ethers_1.ethers.Wallet.createRandom();
        tempAddressDoc = new TempAddress_1.TempAddress({
            evmAddress: normalizedAddress,
            address: tempWallet.address,
            privateKey: tempWallet.privateKey,
        });
        await tempAddressDoc.save();
        logger.info(`Created new temp address ${tempWallet.address} for EVM account ${normalizedAddress}`);
        res.json({
            success: true,
            address: tempWallet.address,
            isNew: true,
        });
    }
    catch (error) {
        logger.error("Error getting or creating temp address", error);
        res.status(500).json({ error: "Failed to get or create temp address" });
    }
});
// Assign a generated address to user (uses fixed temp address per EVM account)
router.post("/assign-address", async (req, res) => {
    try {
        const { evmAddress, partyId, amount } = req.body;
        logger.info(`assign-address called with evmAddress=${evmAddress}, partyId=${partyId}, amount=${amount}`);
        if (!evmAddress || !partyId || !amount) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // Convert amount to a string and ensure it's not in scientific notation
        const amountNum = Number(amount);
        const amountStr = amountNum
            .toFixed(18)
            .replace(/0+$/, "")
            .replace(/\.$/, "");
        // Validate party ID has correct suffix
        if (!partyId.endsWith(VALID_PARTY_ID_SUFFIX)) {
            logger.error(`Invalid party ID format: ${partyId} - must end with ${VALID_PARTY_ID_SUFFIX}`);
            return res.status(403).json({
                error: "Invalid Party ID format",
            });
        }
        const normalizedAddress = evmAddress.toLowerCase();
        // Get the fixed temp address for this EVM account from MongoDB
        const tempAddressDoc = await TempAddress_1.TempAddress.findOne({
            evmAddress: normalizedAddress,
        });
        if (!tempAddressDoc) {
            logger.error(`Temp address not found for evmAddress: ${normalizedAddress}`);
            return res.status(404).json({
                error: "Temp address not found. Call get-or-create-temp-address first",
            });
        }
        const address = tempAddressDoc.address;
        // Save deposit record to MongoDB
        const depositDoc = new Deposit_1.Deposit({
            tempAddress: address,
            partyId,
            amount,
            status: "PENDING",
        });
        await depositDoc.save();
        logger.info(`Assigned deposit to temp address: ${address} for party ${partyId}, amount: ${amount}`);
        res.json({
            success: true,
            address,
            partyId,
            amount,
            qrValue: `ethereum:${address}?value=${ethers_1.ethers.parseEther(amountStr).toString()}`,
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
        const { address, partyId, amount, confirmations } = req.body;
        logger.info(`Received confirm-and-forward: address=${address}, partyId=${partyId}, amount=${amount}, confirmations=${confirmations}`);
        if (!address ||
            !partyId ||
            !amount ||
            confirmations < CONFIRMATION_BLOCKS) {
            logger.error(`Validation failed: address=${!!address}, partyId=${!!partyId}, amount=${!!amount}, confirmations=${confirmations}/${CONFIRMATION_BLOCKS}`);
            return res.status(400).json({
                error: `Need ${CONFIRMATION_BLOCKS} confirmations, got ${confirmations}`,
            });
        }
        // Find deposit from MongoDB
        const depositDoc = await Deposit_1.Deposit.findOne({
            tempAddress: address,
            partyId,
        });
        if (!depositDoc) {
            logger.error(`Deposit not found for address: ${address}, partyId: ${partyId}`);
            return res.status(404).json({ error: "Deposit not found" });
        }
        logger.info(`Found deposit: ${JSON.stringify(depositDoc)}`);
        // Update party balance in MongoDB
        let balanceDoc = await Balance_1.Balance.findOne({ partyId });
        if (!balanceDoc) {
            balanceDoc = new Balance_1.Balance({
                partyId,
                balance: 0,
                totalReceived: 0,
            });
        }
        balanceDoc.balance += amount;
        balanceDoc.totalReceived += amount;
        balanceDoc.lastUpdated = new Date();
        await balanceDoc.save();
        logger.info(`Updated balance for party ${partyId}: +${amount} ETH, new balance: ${balanceDoc.balance}`);
        // Get the private key from MongoDB
        const tempAddressDoc = await TempAddress_1.TempAddress.findOne({
            address: address,
        });
        if (!tempAddressDoc) {
            logger.error(`Private key not found for temp address: ${address}`);
            throw new Error("Private key not found for temp address");
        }
        // Send ETH from temp address to static wallet
        try {
            logger.info(`Starting ETH forward from ${address}...`);
            await sendEthToStaticAddress(tempAddressDoc.privateKey, amount);
            logger.info(`ETH forward completed successfully`);
            // Mark deposit as forwarded
            depositDoc.status = "FORWARDED";
            depositDoc.forwardedAt = new Date();
        }
        catch (forwardErr) {
            logger.error("Error forwarding ETH:", forwardErr);
            // Mark as confirmed but not forwarded yet
            depositDoc.status = "CONFIRMED";
            depositDoc.confirmedAt = new Date();
        }
        await depositDoc.save();
        res.json({
            success: true,
            status: depositDoc.status,
            confirmations,
            partyId,
            balance: balanceDoc.balance,
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
        logger.info(`Starting fund forward from temp wallet: ${tempWallet.address}`);
        logger.info(`Target static wallet: ${STATIC_WALLET}`);
        // Get balance to ensure we have funds
        const balance = await provider.getBalance(tempWallet.address);
        const balanceEth = parseFloat(ethers_1.ethers.formatEther(balance));
        logger.info(`Temp wallet (${tempWallet.address}) balance: ${balanceEth} ETH`);
        if (balance <= ethers_1.ethers.toBigInt(0)) {
            logger.error(`Temp wallet has no balance`);
            throw new Error(`Temp wallet has no ETH to forward`);
        }
        // Get current gas prices
        const feeData = await provider.getFeeData();
        const maxFeePerGas = feeData.maxFeePerGas || ethers_1.ethers.toBigInt(50000000000); // 50 gwei fallback
        const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers_1.ethers.toBigInt(2000000000); // 2 gwei fallback
        logger.info(`Gas prices - maxFeePerGas: ${ethers_1.ethers.formatUnits(maxFeePerGas, "gwei")} gwei, maxPriority: ${ethers_1.ethers.formatUnits(maxPriorityFeePerGas, "gwei")} gwei`);
        // Estimate gas for actual transaction (sending all funds)
        const estimateGasTx = {
            to: STATIC_WALLET,
            from: tempWallet.address,
            value: balance,
        };
        let estimatedGas = ethers_1.ethers.toBigInt(21000); // minimum gas
        try {
            estimatedGas = await provider.estimateGas(estimateGasTx);
            logger.info(`Estimated gas: ${estimatedGas.toString()}`);
        }
        catch (err) {
            logger.warn(`Gas estimation failed, using minimum gas of 21000`);
        }
        // Calculate gas cost with 20% buffer
        const bufferedMaxFeePerGas = (maxFeePerGas * ethers_1.ethers.toBigInt(120)) / ethers_1.ethers.toBigInt(100);
        const gasCost = bufferedMaxFeePerGas * estimatedGas;
        const gasCostEth = parseFloat(ethers_1.ethers.formatEther(gasCost));
        logger.info(`Gas cost estimate: ${gasCostEth} ETH`);
        // Send all balance minus gas fees
        let amountToSend = balance - gasCost;
        if (amountToSend <= ethers_1.ethers.toBigInt(0)) {
            logger.warn(`Insufficient balance for gas. Balance: ${balanceEth} ETH, Gas cost: ${gasCostEth} ETH. Sending all available funds.`);
            // Send whatever we can
            amountToSend = balance - (maxFeePerGas * ethers_1.ethers.toBigInt(21000)); // Just gas for basic transfer
            if (amountToSend <= ethers_1.ethers.toBigInt(0)) {
                logger.error(`Balance too low to send anything`);
                throw new Error("Balance too low to forward");
            }
        }
        const amountToSendEth = parseFloat(ethers_1.ethers.formatEther(amountToSend));
        logger.info(`Sending ${amountToSendEth} ETH to vault ${STATIC_WALLET}`);
        // Prepare EIP-1559 transaction
        const tx = {
            to: STATIC_WALLET,
            value: amountToSend,
            maxFeePerGas: bufferedMaxFeePerGas,
            maxPriorityFeePerGas: (maxPriorityFeePerGas * ethers_1.ethers.toBigInt(120)) /
                ethers_1.ethers.toBigInt(100),
            gasLimit: estimatedGas,
        };
        logger.info(`Transaction - To: ${tx.to}, Value: ${ethers_1.ethers.formatEther(tx.value)} ETH, GasLimit: ${tx.gasLimit}`);
        const txResponse = await tempWallet.sendTransaction(tx);
        logger.info(`Transaction sent: ${txResponse.hash}`);
        // Wait for confirmation
        const receipt = await txResponse.wait(1);
        if (receipt) {
            logger.info(`Transaction confirmed in block ${receipt.blockNumber}. Sent ${amountToSendEth} ETH from ${tempWallet.address} to ${STATIC_WALLET}`);
        }
        else {
            logger.warn(`Transaction ${txResponse.hash} sent but receipt not found`);
        }
    }
    catch (error) {
        logger.error("Error sending ETH to static address:", error);
        throw error;
    }
}
// Get party balance
router.get("/balance/:partyId", async (req, res) => {
    try {
        const { partyId } = req.params;
        const balanceDoc = await Balance_1.Balance.findOne({ partyId });
        res.json({
            partyId,
            balance: balanceDoc?.balance || 0,
            totalReceived: balanceDoc?.totalReceived || 0,
        });
    }
    catch (error) {
        logger.error("Error getting balance", error);
        res.status(500).json({ error: "Failed to get balance" });
    }
});
// Record a transaction
router.post("/record-transaction", async (req, res) => {
    try {
        const { fromAddress, toPartyId, amount, txHash, tempAddress, status } = req.body;
        if (!fromAddress || !toPartyId || !amount || !txHash) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const transactionDoc = new Transaction_1.default({
            fromAddress: fromAddress.toLowerCase(),
            toPartyId,
            amount,
            txHash,
            tempAddress: tempAddress.toLowerCase(),
            status: status || "PENDING",
        });
        await transactionDoc.save();
        logger.info(`Recorded transaction: ${txHash} from ${fromAddress} to ${toPartyId}, amount: ${amount}`);
        res.json({
            success: true,
            transaction: transactionDoc,
        });
    }
    catch (error) {
        logger.error("Error recording transaction", error);
        res.status(500).json({ error: "Failed to record transaction" });
    }
});
// Get transaction history for an address
router.get("/transactions/:fromAddress", async (req, res) => {
    try {
        const { fromAddress } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        const transactions = await Transaction_1.default.find({
            fromAddress: fromAddress.toLowerCase(),
        })
            .sort({ createdAt: -1 })
            .limit(limit);
        res.json({
            fromAddress,
            count: transactions.length,
            transactions,
        });
    }
    catch (error) {
        logger.error("Error getting transactions", error);
        res.status(500).json({ error: "Failed to get transactions" });
    }
});
// Get transaction history for a party ID
router.get("/party-transactions/:partyId", async (req, res) => {
    try {
        const { partyId } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        const transactions = await Transaction_1.default.find({ toPartyId: partyId })
            .sort({ createdAt: -1 })
            .limit(limit);
        res.json({
            partyId,
            count: transactions.length,
            transactions,
        });
    }
    catch (error) {
        logger.error("Error getting party transactions", error);
        res.status(500).json({ error: "Failed to get party transactions" });
    }
});
exports.default = router;
//# sourceMappingURL=bridge-simple.js.map