"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepositAddressManager = void 0;
const bip32_1 = require("bip32");
const bip39 = __importStar(require("bip39"));
const uuid_1 = require("uuid");
const database_1 = require("../config/database");
const logger_1 = require("../config/logger");
const logger = new logger_1.Logger('DepositAddressManager');
class DepositAddressManager {
    constructor() {
        this.initializeHDWallet();
    }
    initializeHDWallet() {
        const seedPhrase = process.env.MASTER_SEED_PHRASE;
        if (!seedPhrase) {
            throw new Error('MASTER_SEED_PHRASE environment variable not set');
        }
        const seed = bip39.mnemonicToSeedSync(seedPhrase);
        const ecc = require('tiny-secp256k1');
        const bip32 = (0, bip32_1.BIP32Factory)(ecc);
        this.hdWallet = bip32.fromSeed(seed);
        logger.info('HD Wallet initialized');
    }
    async generateDepositAddress(userId, cantonAddress, expectedAmount) {
        try {
            const db = (0, database_1.getDB)();
            const depositId = (0, uuid_1.v4)();
            // Generate a new address using hierarchical deterministic wallet
            // Path: m/44'/0'/0'/0/{index}
            const index = await this.getNextAddressIndex();
            const derivedChild = this.hdWallet.derivePath(`m/44'/0'/0'/0/${index}`);
            if (!derivedChild.publicKey) {
                throw new Error('Failed to derive public key');
            }
            // Create checksummed address (for Ethereum compatibility)
            const addressBuffer = derivedChild.publicKey;
            const address = '0x' + Buffer.from(addressBuffer).toString('hex').slice(-40);
            const depositAddress = {
                id: depositId,
                address: address,
                userId,
                cantonAddress,
                status: 'PENDING',
                expectedAmount,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            // Store in database
            await db.query(`INSERT INTO deposit_addresses 
         (id, address, user_id, canton_address, status, expected_amount, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                depositId,
                address,
                userId,
                cantonAddress,
                'PENDING',
                expectedAmount,
                depositAddress.createdAt,
                depositAddress.updatedAt,
            ]);
            logger.info(`Generated deposit address for user: ${userId}`, {
                address,
                expectedAmount,
            });
            return depositAddress;
        }
        catch (err) {
            logger.error('Failed to generate deposit address', err);
            throw err;
        }
    }
    async getDepositAddress(address) {
        try {
            const db = (0, database_1.getDB)();
            const result = await db.query(`SELECT * FROM deposit_addresses WHERE address = $1`, [address]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.mapRowToDepositAddress(result.rows[0]);
        }
        catch (err) {
            logger.error('Failed to get deposit address', err);
            throw err;
        }
    }
    async getDepositAddressById(id) {
        try {
            const db = (0, database_1.getDB)();
            const result = await db.query(`SELECT * FROM deposit_addresses WHERE id = $1`, [id]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.mapRowToDepositAddress(result.rows[0]);
        }
        catch (err) {
            logger.error('Failed to get deposit address by ID', err);
            throw err;
        }
    }
    async updateDepositAddressStatus(address, status, ethTxHash, receivedAmount) {
        try {
            const db = (0, database_1.getDB)();
            await db.query(`UPDATE deposit_addresses 
         SET status = $1, eth_tx_hash = $2, received_amount = $3, updated_at = NOW()
         WHERE address = $4`, [status, ethTxHash, receivedAmount, address]);
            logger.info(`Updated deposit address status: ${address} -> ${status}`);
        }
        catch (err) {
            logger.error('Failed to update deposit address status', err);
            throw err;
        }
    }
    async updateCantonMintStatus(address, cantonTxHash) {
        try {
            const db = (0, database_1.getDB)();
            await db.query(`UPDATE deposit_addresses 
         SET status = 'MINTED', canton_tx_hash = $1, updated_at = NOW()
         WHERE address = $2`, [cantonTxHash, address]);
            logger.info(`Updated Canton mint status for address: ${address}`);
        }
        catch (err) {
            logger.error('Failed to update Canton mint status', err);
            throw err;
        }
    }
    async getNextAddressIndex() {
        try {
            const db = (0, database_1.getDB)();
            const result = await db.query(`SELECT COUNT(*) as count FROM deposit_addresses`);
            return parseInt(result.rows[0].count) + 1;
        }
        catch (err) {
            logger.error('Failed to get next address index', err);
            return 0;
        }
    }
    mapRowToDepositAddress(row) {
        return {
            id: row.id,
            address: row.address,
            userId: row.user_id,
            cantonAddress: row.canton_address,
            status: row.status,
            expectedAmount: row.expected_amount,
            receivedAmount: row.received_amount,
            ethTxHash: row.eth_tx_hash,
            cantonTxHash: row.canton_tx_hash,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
    }
}
exports.DepositAddressManager = DepositAddressManager;
//# sourceMappingURL=DepositAddressManager.js.map