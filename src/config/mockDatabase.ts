import { Logger } from "./logger";

const logger = new Logger("MockDatabase");

// In-memory storage for testing
const depositAddresses: any[] = [];
const depositTransactions: any[] = [];

export const mockDatabase = {
	// Deposit Addresses
	insertDepositAddress: async (data: any) => {
		depositAddresses.push(data);
		logger.info(`Deposit address created: ${data.address}`);
		return { rows: [data] };
	},

	getDepositAddress: async (address: string) => {
		const addr = depositAddresses.find((a) => a.address === address);
		return { rows: addr ? [addr] : [] };
	},

	updateDepositAddressStatus: async (address: string, status: string) => {
		const idx = depositAddresses.findIndex((a) => a.address === address);
		if (idx >= 0) {
			depositAddresses[idx].status = status;
			depositAddresses[idx].updated_at = new Date();
		}
		return { rows: depositAddresses[idx] ? [depositAddresses[idx]] : [] };
	},

	updateCantonMintStatus: async (address: string, txHash: string) => {
		const idx = depositAddresses.findIndex((a) => a.address === address);
		if (idx >= 0) {
			depositAddresses[idx].canton_tx_hash = txHash;
			depositAddresses[idx].status = "MINTED";
			depositAddresses[idx].updated_at = new Date();
		}
		return { rows: depositAddresses[idx] ? [depositAddresses[idx]] : [] };
	},

	// Deposit Transactions
	insertDepositTransaction: async (data: any) => {
		depositTransactions.push(data);
		logger.info(`Deposit transaction recorded: ${data.eth_tx_hash}`);
		return { rows: [data] };
	},

	getDepositTransaction: async (txHash: string) => {
		const tx = depositTransactions.find((t) => t.eth_tx_hash === txHash);
		return { rows: tx ? [tx] : [] };
	},

	updateTransactionConfirmations: async (
		txHash: string,
		confirmations: number,
	) => {
		const idx = depositTransactions.findIndex((t) => t.eth_tx_hash === txHash);
		if (idx >= 0) {
			depositTransactions[idx].confirmations = confirmations;
			if (confirmations >= 12) {
				depositTransactions[idx].status = "CONFIRMED";
			}
			depositTransactions[idx].updated_at = new Date();
		}
		return { rows: depositTransactions[idx] ? [depositTransactions[idx]] : [] };
	},

	query: async (sql: string) => {
		logger.debug(`Mock query: ${sql}`);
		return { rows: [] };
	},

	connect: async () => {
		logger.info("Mock database connected (in-memory)");
		return { release: () => {} };
	},
};

export async function initializeMockDatabase() {
	logger.info("Initializing mock in-memory database");
	return mockDatabase;
}
