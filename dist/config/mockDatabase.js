"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockDatabase = void 0;
exports.initializeMockDatabase = initializeMockDatabase;
const logger_1 = require("./logger");
const logger = new logger_1.Logger("MockDatabase");
// In-memory storage for testing
const depositAddresses = [];
const depositTransactions = [];
exports.mockDatabase = {
    // Deposit Addresses
    insertDepositAddress: async (data) => {
        depositAddresses.push(data);
        logger.info(`Deposit address created: ${data.address}`);
        return { rows: [data] };
    },
    getDepositAddress: async (address) => {
        const addr = depositAddresses.find((a) => a.address === address);
        return { rows: addr ? [addr] : [] };
    },
    updateDepositAddressStatus: async (address, status) => {
        const idx = depositAddresses.findIndex((a) => a.address === address);
        if (idx >= 0) {
            depositAddresses[idx].status = status;
            depositAddresses[idx].updated_at = new Date();
        }
        return { rows: depositAddresses[idx] ? [depositAddresses[idx]] : [] };
    },
    updateCantonMintStatus: async (address, txHash) => {
        const idx = depositAddresses.findIndex((a) => a.address === address);
        if (idx >= 0) {
            depositAddresses[idx].canton_tx_hash = txHash;
            depositAddresses[idx].status = "MINTED";
            depositAddresses[idx].updated_at = new Date();
        }
        return { rows: depositAddresses[idx] ? [depositAddresses[idx]] : [] };
    },
    // Deposit Transactions
    insertDepositTransaction: async (data) => {
        depositTransactions.push(data);
        logger.info(`Deposit transaction recorded: ${data.eth_tx_hash}`);
        return { rows: [data] };
    },
    getDepositTransaction: async (txHash) => {
        const tx = depositTransactions.find((t) => t.eth_tx_hash === txHash);
        return { rows: tx ? [tx] : [] };
    },
    updateTransactionConfirmations: async (txHash, confirmations) => {
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
    query: async (sql) => {
        logger.debug(`Mock query: ${sql}`);
        return { rows: [] };
    },
    connect: async () => {
        logger.info("Mock database connected (in-memory)");
        return { release: () => { } };
    },
};
async function initializeMockDatabase() {
    logger.info("Initializing mock in-memory database");
    return exports.mockDatabase;
}
//# sourceMappingURL=mockDatabase.js.map