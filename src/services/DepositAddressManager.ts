import { BIP32Factory } from 'bip32';
import * as bip39 from 'bip39';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../config/database';
import { Logger } from '../config/logger';
import { DepositAddress } from '../types';

const logger = new Logger('DepositAddressManager');

export class DepositAddressManager {
  private hdWallet: any;

  constructor() {
    this.initializeHDWallet();
  }

  private initializeHDWallet(): void {
    const seedPhrase = process.env.MASTER_SEED_PHRASE;
    if (!seedPhrase) {
      throw new Error('MASTER_SEED_PHRASE environment variable not set');
    }

    const seed = bip39.mnemonicToSeedSync(seedPhrase);
    const ecc = require('tiny-secp256k1');
    const bip32 = BIP32Factory(ecc);
    this.hdWallet = bip32.fromSeed(seed);

    logger.info('HD Wallet initialized');
  }

  async generateDepositAddress(
    userId: string,
    cantonAddress: string,
    expectedAmount?: number
  ): Promise<DepositAddress> {
    try {
      const db = getDB();
      const depositId = uuidv4();
      
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

      const depositAddress: DepositAddress = {
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
      await db.query(
        `INSERT INTO deposit_addresses 
         (id, address, user_id, canton_address, status, expected_amount, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          depositId,
          address,
          userId,
          cantonAddress,
          'PENDING',
          expectedAmount,
          depositAddress.createdAt,
          depositAddress.updatedAt,
        ]
      );

      logger.info(`Generated deposit address for user: ${userId}`, {
        address,
        expectedAmount,
      });

      return depositAddress;
    } catch (err) {
      logger.error('Failed to generate deposit address', err);
      throw err;
    }
  }

  async getDepositAddress(address: string): Promise<DepositAddress | null> {
    try {
      const db = getDB();
      const result = await db.query(
        `SELECT * FROM deposit_addresses WHERE address = $1`,
        [address]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToDepositAddress(result.rows[0]);
    } catch (err) {
      logger.error('Failed to get deposit address', err);
      throw err;
    }
  }

  async getDepositAddressById(id: string): Promise<DepositAddress | null> {
    try {
      const db = getDB();
      const result = await db.query(
        `SELECT * FROM deposit_addresses WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToDepositAddress(result.rows[0]);
    } catch (err) {
      logger.error('Failed to get deposit address by ID', err);
      throw err;
    }
  }

  async updateDepositAddressStatus(
    address: string,
    status: string,
    ethTxHash?: string,
    receivedAmount?: number
  ): Promise<void> {
    try {
      const db = getDB();
      await db.query(
        `UPDATE deposit_addresses 
         SET status = $1, eth_tx_hash = $2, received_amount = $3, updated_at = NOW()
         WHERE address = $4`,
        [status, ethTxHash, receivedAmount, address]
      );

      logger.info(`Updated deposit address status: ${address} -> ${status}`);
    } catch (err) {
      logger.error('Failed to update deposit address status', err);
      throw err;
    }
  }

  async updateCantonMintStatus(address: string, cantonTxHash: string): Promise<void> {
    try {
      const db = getDB();
      await db.query(
        `UPDATE deposit_addresses 
         SET status = 'MINTED', canton_tx_hash = $1, updated_at = NOW()
         WHERE address = $2`,
        [cantonTxHash, address]
      );

      logger.info(`Updated Canton mint status for address: ${address}`);
    } catch (err) {
      logger.error('Failed to update Canton mint status', err);
      throw err;
    }
  }

  private async getNextAddressIndex(): Promise<number> {
    try {
      const db = getDB();
      const result = await db.query(
        `SELECT COUNT(*) as count FROM deposit_addresses`
      );
      return parseInt(result.rows[0].count) + 1;
    } catch (err) {
      logger.error('Failed to get next address index', err);
      return 0;
    }
  }

  private mapRowToDepositAddress(row: any): DepositAddress {
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
