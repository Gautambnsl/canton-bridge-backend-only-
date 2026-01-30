export declare const mockDatabase: {
    insertDepositAddress: (data: any) => Promise<{
        rows: any[];
    }>;
    getDepositAddress: (address: string) => Promise<{
        rows: any[];
    }>;
    updateDepositAddressStatus: (address: string, status: string) => Promise<{
        rows: any[];
    }>;
    updateCantonMintStatus: (address: string, txHash: string) => Promise<{
        rows: any[];
    }>;
    insertDepositTransaction: (data: any) => Promise<{
        rows: any[];
    }>;
    getDepositTransaction: (txHash: string) => Promise<{
        rows: any[];
    }>;
    updateTransactionConfirmations: (txHash: string, confirmations: number) => Promise<{
        rows: any[];
    }>;
    query: (sql: string) => Promise<{
        rows: never[];
    }>;
    connect: () => Promise<{
        release: () => void;
    }>;
};
export declare function initializeMockDatabase(): Promise<{
    insertDepositAddress: (data: any) => Promise<{
        rows: any[];
    }>;
    getDepositAddress: (address: string) => Promise<{
        rows: any[];
    }>;
    updateDepositAddressStatus: (address: string, status: string) => Promise<{
        rows: any[];
    }>;
    updateCantonMintStatus: (address: string, txHash: string) => Promise<{
        rows: any[];
    }>;
    insertDepositTransaction: (data: any) => Promise<{
        rows: any[];
    }>;
    getDepositTransaction: (txHash: string) => Promise<{
        rows: any[];
    }>;
    updateTransactionConfirmations: (txHash: string, confirmations: number) => Promise<{
        rows: any[];
    }>;
    query: (sql: string) => Promise<{
        rows: never[];
    }>;
    connect: () => Promise<{
        release: () => void;
    }>;
}>;
//# sourceMappingURL=mockDatabase.d.ts.map