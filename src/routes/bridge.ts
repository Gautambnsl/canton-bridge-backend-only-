import express, { Router, Request, Response } from "express";
import { ethers } from "ethers";
import Joi from "joi";
import { DepositAddress, PartyBalance } from "../models/mongodb";
import { Logger } from "../config/logger";

const logger = new Logger("BridgeRoutes");
const router = Router();

const RPC_URL =
	process.env.EVM_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";
const CONFIRMATION_BLOCKS = parseInt(
	process.env.EVM_CONFIRMATION_BLOCKS || "6",
);
const STATIC_WALLET =
	process.env.STATIC_WALLET_ADDRESS ||
	"0xFCF07cf03599cBBAfB90ee179fc6F5b198B67474";

const provider = new ethers.JsonRpcProvider(RPC_URL);

// Validation schemas
const generateAddressSchema = Joi.object({
	userId: Joi.string().required(),
	partyId: Joi.string().required(),
	amount: Joi.number().required().min(0.001),
});

const confirmDepositSchema = Joi.object({
	depositAddress: Joi.string().required(),
	txHash: Joi.string().required(),
});

// Assign a generated address to user (frontend generates, backend saves)
router.post("/assign-address", async (req: Request, res: Response) => {
	try {
		const { address, privateKey, partyId, amount } = req.body;

		if (!address || !privateKey || !partyId || !amount) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		// Save to MongoDB
		const depositRecord = new DepositAddress({
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
	} catch (error) {
		logger.error("Error assigning address", error);
		res.status(500).json({ error: "Failed to assign address" });
	}
});

// Confirm transaction and forward funds (called by frontend after 6 confirmations detected)
router.post("/confirm-and-forward", async (req: Request, res: Response) => {
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
		const deposit = await DepositAddress.findOneAndUpdate(
			{ address: depositAddress },
			{
				ethTxHash: txHash,
				blockConfirmations: confirmations,
				status: "CONFIRMED",
			},
			{ new: true },
		);

		if (!deposit) {
			return res.status(404).json({ error: "Deposit address not found" });
		}

		// Update party balance
		const updated = await PartyBalance.findOneAndUpdate(
			{ partyId },
			{
				$inc: {
					balance: amount,
					totalReceived: amount,
				},
				lastUpdated: new Date(),
			},
			{ upsert: true, new: true },
		);

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
	} catch (error) {
		logger.error("Error confirming and forwarding", error);
		res.status(500).json({ error: "Failed to confirm and forward" });
	}
});

// Send ETH from temp address to static wallet
async function sendEthToStaticAddress(
	tempPrivateKey: string,
	amount: number,
): Promise<void> {
	try {
		const tempWallet = new ethers.Wallet(tempPrivateKey, provider);

		// Get balance to ensure we have funds
		const balance = await provider.getBalance(tempWallet.address);
		logger.info(`Temp wallet balance: ${ethers.formatEther(balance)} ETH`);

		// Prepare transaction
		const tx = {
			to: STATIC_WALLET,
			value: ethers.parseEther(amount.toString()),
		};

		// Send transaction
		const txResponse = await tempWallet.sendTransaction(tx);
		await txResponse.wait(1); // Wait 1 confirmation

		logger.info(
			`Sent ${amount} ETH from ${tempWallet.address} to ${STATIC_WALLET}`,
		);
	} catch (error) {
		logger.error("Error sending ETH to static address", error);
	}
}

// Get party balance
router.get("/balance/:partyId", async (req: Request, res: Response) => {
	try {
		const { partyId } = req.params;

		const partyData = await PartyBalance.findOne({ partyId });

		res.json({
			partyId,
			balance: partyData?.balance || 0,
			totalReceived: partyData?.totalReceived || 0,
		});
	} catch (error) {
		logger.error("Error getting balance", error);
		res.status(500).json({ error: "Failed to get balance" });
	}
});

// Health check
router.get("/health", (req: Request, res: Response) => {
	res.json({
		status: "OK",
		network: "Arbitrum Sepolia",
		confirmations: CONFIRMATION_BLOCKS,
	});
});

export default router;
