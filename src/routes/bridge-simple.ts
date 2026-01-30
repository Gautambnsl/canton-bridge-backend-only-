import express, { Router, Request, Response } from "express";
import { ethers } from "ethers";
import { Logger } from "../config/logger";
import { TempAddress } from "../models/TempAddress";
import { Deposit } from "../models/Deposit";
import { Balance } from "../models/Balance";
import User from "../models/User";
import Transaction from "../models/Transaction";

const logger = new Logger("BridgeRoutes");
const router = Router();

const RPC_URL =
	process.env.EVM_RPC_URL ||
	"https://eth-sepolia.g.alchemy.com/v2/GgqRIsVJXXFCb9n5xd7dnNJdOeuwbsjG";
const WS_RPC_URL =
	process.env.EVM_WS_RPC_URL ||
	"wss://eth-sepolia.g.alchemy.com/v2/GgqRIsVJXXFCb9n5xd7dnNJdOeuwbsjG";
const CONFIRMATION_BLOCKS = parseInt(
	process.env.EVM_CONFIRMATION_BLOCKS || "1",
);
const STATIC_WALLET =
	process.env.STATIC_WALLET_ADDRESS ||
	"0xFCF07cf03599cBBAfB90ee179fc6F5b198B67474";

// Valid party ID hash suffix
const VALID_PARTY_ID_SUFFIX =
	"::1220572515ea25db89f8aec321e1989d4cc6ec26b1dc71b6abc320a6aca688af744f";

const provider = new ethers.JsonRpcProvider(RPC_URL);

// Health check
router.get("/health", (req: Request, res: Response) => {
	res.json({
		status: "OK",
		network: "Ethereum Sepolia",
		confirmations: CONFIRMATION_BLOCKS,
	});
});

// Get or create a fixed temp address for an EVM account
router.post(
	"/get-or-create-temp-address",
	async (req: Request, res: Response) => {
		try {
			const { evmAddress } = req.body;

			if (!evmAddress) {
				return res.status(400).json({ error: "EVM address is required" });
			}

			const normalizedAddress = evmAddress.toLowerCase();

			// Check if this account already has a temp address in MongoDB
			let tempAddressDoc = await TempAddress.findOne({
				evmAddress: normalizedAddress,
			});

			if (tempAddressDoc) {
				logger.info(
					`Returning existing temp address for account: ${normalizedAddress}`,
				);
				return res.json({
					success: true,
					address: tempAddressDoc.address,
					isNew: false,
				});
			}

			// Create new temp address for this account
			const tempWallet = ethers.Wallet.createRandom();
			tempAddressDoc = new TempAddress({
				evmAddress: normalizedAddress,
				address: tempWallet.address,
				privateKey: tempWallet.privateKey,
			});

			await tempAddressDoc.save();

			logger.info(
				`Created new temp address ${tempWallet.address} for EVM account ${normalizedAddress}`,
			);

			res.json({
				success: true,
				address: tempWallet.address,
				isNew: true,
			});
		} catch (error) {
			logger.error("Error getting or creating temp address", error);
			res.status(500).json({ error: "Failed to get or create temp address" });
		}
	},
);

// Assign a generated address to user (uses fixed temp address per EVM account)
router.post("/assign-address", async (req: Request, res: Response) => {
	try {
		const { evmAddress, partyId, amount } = req.body;

		logger.info(
			`assign-address called with evmAddress=${evmAddress}, partyId=${partyId}, amount=${amount}`,
		);

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
			logger.error(
				`Invalid party ID format: ${partyId} - must end with ${VALID_PARTY_ID_SUFFIX}`,
			);
			return res.status(403).json({
				error: "Invalid Party ID format",
			});
		}

		const normalizedAddress = evmAddress.toLowerCase();

		// Get the fixed temp address for this EVM account from MongoDB
		const tempAddressDoc = await TempAddress.findOne({
			evmAddress: normalizedAddress,
		});

		if (!tempAddressDoc) {
			logger.error(
				`Temp address not found for evmAddress: ${normalizedAddress}`,
			);
			return res.status(404).json({
				error: "Temp address not found. Call get-or-create-temp-address first",
			});
		}

		const address = tempAddressDoc.address;

		// Save deposit record to MongoDB
		const depositDoc = new Deposit({
			tempAddress: address,
			partyId,
			amount,
			status: "PENDING",
		});

		await depositDoc.save();

		logger.info(
			`Assigned deposit to temp address: ${address} for party ${partyId}, amount: ${amount}`,
		);

		res.json({
			success: true,
			address,
			partyId,
			amount,
			qrValue: `ethereum:${address}?value=${ethers.parseEther(amountStr).toString()}`,
		});
	} catch (error) {
		logger.error("Error assigning address", error);
		res.status(500).json({ error: "Failed to assign address" });
	}
});

// Confirm transaction and forward funds (called by frontend after 6 confirmations detected)
router.post("/confirm-and-forward", async (req: Request, res: Response) => {
	try {
		const { address, partyId, amount, confirmations } = req.body;

		logger.info(
			`Received confirm-and-forward: address=${address}, partyId=${partyId}, amount=${amount}, confirmations=${confirmations}`,
		);

		if (
			!address ||
			!partyId ||
			!amount ||
			confirmations < CONFIRMATION_BLOCKS
		) {
			logger.error(
				`Validation failed: address=${!!address}, partyId=${!!partyId}, amount=${!!amount}, confirmations=${confirmations}/${CONFIRMATION_BLOCKS}`,
			);
			return res.status(400).json({
				error: `Need ${CONFIRMATION_BLOCKS} confirmations, got ${confirmations}`,
			});
		}

		// Find deposit from MongoDB
		const depositDoc = await Deposit.findOne({
			tempAddress: address,
			partyId,
		});

		if (!depositDoc) {
			logger.error(
				`Deposit not found for address: ${address}, partyId: ${partyId}`,
			);
			return res.status(404).json({ error: "Deposit not found" });
		}

		logger.info(`Found deposit: ${JSON.stringify(depositDoc)}`);

		// Update party balance in MongoDB
		let balanceDoc = await Balance.findOne({ partyId });
		if (!balanceDoc) {
			balanceDoc = new Balance({
				partyId,
				balance: 0,
				totalReceived: 0,
			});
		}

		balanceDoc.balance += amount;
		balanceDoc.totalReceived += amount;
		balanceDoc.lastUpdated = new Date();
		await balanceDoc.save();

		logger.info(
			`Updated balance for party ${partyId}: +${amount} ETH, new balance: ${balanceDoc.balance}`,
		);

		// Get the private key from MongoDB
		const tempAddressDoc = await TempAddress.findOne({
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
		} catch (forwardErr) {
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

		logger.info(
			`Starting fund forward from temp wallet: ${tempWallet.address}`,
		);
		logger.info(`Target static wallet: ${STATIC_WALLET}`);

		// Get balance to ensure we have funds
		const balance = await provider.getBalance(tempWallet.address);
		const balanceEth = parseFloat(ethers.formatEther(balance));
		logger.info(
			`Temp wallet (${tempWallet.address}) balance: ${balanceEth} ETH`,
		);

		if (balance <= ethers.toBigInt(0)) {
			logger.error(`Temp wallet has no balance`);
			throw new Error(`Temp wallet has no ETH to forward`);
		}

		// Get current gas prices
		const feeData = await provider.getFeeData();
		const maxFeePerGas = feeData.maxFeePerGas || ethers.toBigInt(50000000000); // 50 gwei fallback
		const maxPriorityFeePerGas =
			feeData.maxPriorityFeePerGas || ethers.toBigInt(2000000000); // 2 gwei fallback

		logger.info(
			`Gas prices - maxFeePerGas: ${ethers.formatUnits(maxFeePerGas, "gwei")} gwei, maxPriority: ${ethers.formatUnits(maxPriorityFeePerGas, "gwei")} gwei`,
		);

		// Estimate gas for actual transaction (sending all funds)
		const estimateGasTx = {
			to: STATIC_WALLET,
			from: tempWallet.address,
			value: balance,
		};

		let estimatedGas = ethers.toBigInt(21000); // minimum gas
		try {
			estimatedGas = await provider.estimateGas(estimateGasTx);
			logger.info(`Estimated gas: ${estimatedGas.toString()}`);
		} catch (err) {
			logger.warn(`Gas estimation failed, using minimum gas of 21000`);
		}

		// Calculate gas cost with 20% buffer
		const bufferedMaxFeePerGas =
			(maxFeePerGas * ethers.toBigInt(120)) / ethers.toBigInt(100);
		const gasCost = bufferedMaxFeePerGas * estimatedGas;
		const gasCostEth = parseFloat(ethers.formatEther(gasCost));

		logger.info(`Gas cost estimate: ${gasCostEth} ETH`);

		// Send all balance minus gas fees
		let amountToSend = balance - gasCost;

		if (amountToSend <= ethers.toBigInt(0)) {
			logger.warn(
				`Insufficient balance for gas. Balance: ${balanceEth} ETH, Gas cost: ${gasCostEth} ETH. Sending all available funds.`,
			);
			// Send whatever we can
			amountToSend = balance - (maxFeePerGas * ethers.toBigInt(21000)); // Just gas for basic transfer
			
			if (amountToSend <= ethers.toBigInt(0)) {
				logger.error(`Balance too low to send anything`);
				throw new Error("Balance too low to forward");
			}
		}

		const amountToSendEth = parseFloat(ethers.formatEther(amountToSend));
		logger.info(
			`Sending ${amountToSendEth} ETH to vault ${STATIC_WALLET}`,
		);

		// Prepare EIP-1559 transaction
		const tx = {
			to: STATIC_WALLET,
			value: amountToSend,
			maxFeePerGas: bufferedMaxFeePerGas,
			maxPriorityFeePerGas:
				(maxPriorityFeePerGas * ethers.toBigInt(120)) /
				ethers.toBigInt(100),
			gasLimit: estimatedGas,
		};

		logger.info(
			`Transaction - To: ${tx.to}, Value: ${ethers.formatEther(tx.value)} ETH, GasLimit: ${tx.gasLimit}`,
		);

		const txResponse = await tempWallet.sendTransaction(tx);
		logger.info(`Transaction sent: ${txResponse.hash}`);

		// Wait for confirmation
		const receipt = await txResponse.wait(1);
		if (receipt) {
			logger.info(
				`Transaction confirmed in block ${receipt.blockNumber}. Sent ${amountToSendEth} ETH from ${tempWallet.address} to ${STATIC_WALLET}`,
			);
		} else {
			logger.warn(`Transaction ${txResponse.hash} sent but receipt not found`);
		}
	} catch (error) {
		logger.error("Error sending ETH to static address:", error);
		throw error;
	}
}

// Get party balance
router.get("/balance/:partyId", async (req: Request, res: Response) => {
	try {
		const { partyId } = req.params;

		const balanceDoc = await Balance.findOne({ partyId });

		res.json({
			partyId,
			balance: balanceDoc?.balance || 0,
			totalReceived: balanceDoc?.totalReceived || 0,
		});
	} catch (error) {
		logger.error("Error getting balance", error);
		res.status(500).json({ error: "Failed to get balance" });
	}
});

// Record a transaction
router.post("/record-transaction", async (req: Request, res: Response) => {
	try {
		const { fromAddress, toPartyId, amount, txHash, tempAddress, status } =
			req.body;

		if (!fromAddress || !toPartyId || !amount || !txHash) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		const transactionDoc = new Transaction({
			fromAddress: fromAddress.toLowerCase(),
			toPartyId,
			amount,
			txHash,
			tempAddress: tempAddress.toLowerCase(),
			status: status || "PENDING",
		});

		await transactionDoc.save();

		logger.info(
			`Recorded transaction: ${txHash} from ${fromAddress} to ${toPartyId}, amount: ${amount}`,
		);

		res.json({
			success: true,
			transaction: transactionDoc,
		});
	} catch (error) {
		logger.error("Error recording transaction", error);
		res.status(500).json({ error: "Failed to record transaction" });
	}
});

// Get transaction history for an address
router.get(
	"/transactions/:fromAddress",
	async (req: Request, res: Response) => {
		try {
			const { fromAddress } = req.params;
			const limit = parseInt(req.query.limit as string) || 10;

			const transactions = await Transaction.find({
				fromAddress: fromAddress.toLowerCase(),
			})
				.sort({ createdAt: -1 })
				.limit(limit);

			res.json({
				fromAddress,
				count: transactions.length,
				transactions,
			});
		} catch (error) {
			logger.error("Error getting transactions", error);
			res.status(500).json({ error: "Failed to get transactions" });
		}
	},
);

// Get transaction history for a party ID
router.get(
	"/party-transactions/:partyId",
	async (req: Request, res: Response) => {
		try {
			const { partyId } = req.params;
			const limit = parseInt(req.query.limit as string) || 10;

			const transactions = await Transaction.find({ toPartyId: partyId })
				.sort({ createdAt: -1 })
				.limit(limit);

			res.json({
				partyId,
				count: transactions.length,
				transactions,
			});
		} catch (error) {
			logger.error("Error getting party transactions", error);
			res.status(500).json({ error: "Failed to get party transactions" });
		}
	},
);

export default router;
