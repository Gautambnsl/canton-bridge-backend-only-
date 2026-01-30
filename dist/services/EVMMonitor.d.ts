export declare class EVMMonitor {
    private provider;
    private requiredConfirmations;
    private isMonitoring;
    constructor();
    startMonitoring(depositAddresses: string[]): Promise<void>;
    private startPolling;
    private checkAddressForDeposits;
    private checkETHTransfers;
    recordDeposit(txHash: string, amount: string, depositAddress: string, fromAddress: string): Promise<string>;
    getTransactionConfirmations(txHash: string): Promise<number>;
    private setupAlchemyWebhooks;
    stopMonitoring(): Promise<void>;
}
//# sourceMappingURL=EVMMonitor.d.ts.map