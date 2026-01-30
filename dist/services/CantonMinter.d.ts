export declare class CantonMinter {
    private cantonGrpcEndpoint;
    private participantId;
    private partyId;
    private tokenContractId;
    constructor();
    mint(depositAddress: string, amount: string, cantonAddress: string, ethTxHash: string): Promise<string>;
    private callCantonMintAPI;
    getMintStatus(depositAddress: string): Promise<{
        status: string;
        cantonTxHash: string | null;
        amount: string | null;
    }>;
}
//# sourceMappingURL=CantonMinter.d.ts.map