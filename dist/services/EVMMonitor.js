"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVMMonitor = void 0;
const ethers_1 = require("ethers");
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const uuid_1 = require("uuid");
const logger = new logger_1.Logger('EVMMonitor');
class EVMMonitor {
    constructor() {
        this.isMonitoring = false;
        const rpcUrl = process.env.EVM_RPC_URL;
        if (!rpcUrl) {
            throw new Error('EVM_RPC_URL environment variable not set');
        }
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        this.requiredConfirmations = parseInt(process.env.EVM_CONFIRMATION_BLOCKS || '12');
    }
    async startMonitoring(depositAddresses) {
        if (this.isMonitoring) {
            logger.warn('Monitor already running');
            return;
        }
        this.isMonitoring = true;
        logger.info(`Starting EVM monitor for ${depositAddresses.length} addresses`);
        // Option 1: Polling mechanism (fallback if webhooks aren't available)
        this.startPolling(depositAddresses);
        // Option 2: Setup Alchemy webhooks (recommended for production)
        // this.setupAlchemyWebhooks(depositAddresses);
    }
    startPolling(depositAddresses) {
        const pollInterval = 15000; // 15 seconds
        setInterval(async () => {
            try {
                for (const depositAddress of depositAddresses) {
                    await this.checkAddressForDeposits(depositAddress);
                }
            }
            catch (err) {
                logger.error('Error during polling', err);
            }
        }, pollInterval);
        logger.info('Polling started with 15s interval');
    }
    async checkAddressForDeposits(depositAddress) {
        try {
            const db = (0, database_1.getDB)();
            // Get latest block to calculate confirmations
            const latestBlock = await this.provider.getBlockNumber();
            // Get transactions to this address
            const filter = {
                to: depositAddress,
            };
            // Get past 1000 blocks worth of transactions
            const logs = await this.provider.getLogs({
                ...filter,
                fromBlock: Math.max(0, latestBlock - 1000),
                toBlock: latestBlock,
            });
            // Check for direct transfers (not just logs)
            // In this case, we'll monitor with eth_getLogs but for direct ETH transfers
            // we need a different approach
            await this.checkETHTransfers(depositAddress, latestBlock);
        }
        catch (err) {
            logger.error(`Failed to check address ${depositAddress}`, err);
        }
    }
    async checkETHTransfers(depositAddress, latestBlock) {
        try {
            const db = (0, database_1.getDB)();
            // Get all transactions from database that haven't been confirmed yet
            const result = await db.query(`SELECT * FROM deposit_transactions 
         WHERE status IN ('PENDING', 'CONFIRMED') 
         AND deposit_address_id IN (
           SELECT id FROM deposit_addresses WHERE address = $1
         )`, [depositAddress]);
            for (const txRow of result.rows) {
                const txHash = txRow.eth_tx_hash;
                try {
                    const tx = await this.provider.getTransaction(txHash);
                    const receipt = await this.provider.getTransactionReceipt(txHash);
                    if (!receipt) {
                        continue; // Transaction not yet mined
                    }
                    const confirmations = latestBlock - receipt.blockNumber;
                    if (confirmations >= this.requiredConfirmations) {
                        logger.info(`Transaction ${txHash} reached required confirmations`, {
                            confirmations,
                            required: this.requiredConfirmations,
                        });
                        // Update transaction status to CONFIRMED
                        await db.query(`UPDATE deposit_transactions 
               SET status = 'CONFIRMED', confirmations = $1, updated_at = NOW()
               WHERE eth_tx_hash = $2`, [confirmations, txHash]);
                        // Trigger minting service
                        const depositAddressRecord = await db.query(`SELECT da.* FROM deposit_addresses da
               JOIN deposit_transactions dt ON da.id = dt.deposit_address_id
               WHERE dt.eth_tx_hash = $1`, [txHash]);
                        if (depositAddressRecord.rows.length > 0) {
                            const depositInfo = depositAddressRecord.rows[0];
                            logger.info('Triggering Canton mint for confirmed deposit', {
                                address: depositInfo.address,
                                amount: txRow.amount,
                            });
                        }
                    }
                }
                catch (err) {
                    logger.error(`Failed to process transaction ${txHash}`, err);
                }
            }
        }
        catch (err) {
            logger.error('Failed to check ETH transfers', err);
        }
    }
    async recordDeposit(txHash, amount, depositAddress, fromAddress) {
        try {
            const db = (0, database_1.getDB)();
            const txId = (0, uuid_1.v4)();
            // Get the deposit address ID
            const addressResult = await db.query(`SELECT id FROM deposit_addresses WHERE address = $1`, [depositAddress]);
            if (addressResult.rows.length === 0) {
                throw new Error(`Deposit address not found: ${depositAddress}`);
            }
            const depositAddressId = addressResult.rows[0].id;
            // Record the transaction
            await db.query(`INSERT INTO deposit_transactions 
         (id, deposit_address_id, eth_tx_hash, amount, from_address, confirmations, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`, [txId, depositAddressId, txHash, amount, fromAddress, 0, 'PENDING']);
            logger.info(`Recorded deposit transaction`, {
                txHash,
                amount,
                depositAddress,
            });
            return txId;
        }
        catch (err) {
            logger.error('Failed to record deposit', err);
            throw err;
        }
    }
    async getTransactionConfirmations(txHash) {
        try {
            const receipt = await this.provider.getTransactionReceipt(txHash);
            if (!receipt) {
                return 0;
            }
            const latestBlock = await this.provider.getBlockNumber();
            return latestBlock - receipt.blockNumber;
        }
        catch (err) {
            logger.error(`Failed to get transaction confirmations for ${txHash}`, err);
            throw err;
        }
    }
    setupAlchemyWebhooks(depositAddresses) {
        // This would be implemented if using Alchemy webhooks
        // Documentation: https://docs.alchemy.com/reference/create-webhook
        logger.info('Alchemy webhook setup not yet implemented');
    }
    async stopMonitoring() {
        this.isMonitoring = false;
        logger.info('EVM monitor stopped');
    }
}
exports.EVMMonitor = EVMMonitor;
//# sourceMappingURL=EVMMonitor.js.map