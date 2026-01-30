import { DepositAddress } from '../types';
export declare class DepositAddressManager {
    private hdWallet;
    constructor();
    private initializeHDWallet;
    generateDepositAddress(userId: string, cantonAddress: string, expectedAmount?: number): Promise<DepositAddress>;
    getDepositAddress(address: string): Promise<DepositAddress | null>;
    getDepositAddressById(id: string): Promise<DepositAddress | null>;
    updateDepositAddressStatus(address: string, status: string, ethTxHash?: string, receivedAmount?: number): Promise<void>;
    updateCantonMintStatus(address: string, cantonTxHash: string): Promise<void>;
    private getNextAddressIndex;
    private mapRowToDepositAddress;
}
//# sourceMappingURL=DepositAddressManager.d.ts.map