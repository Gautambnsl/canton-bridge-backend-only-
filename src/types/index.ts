export interface DepositAddress {
  id: string;
  address: string;
  userId: string;
  cantonAddress: string;
  status: 'PENDING' | 'CONFIRMED' | 'MINTED' | 'FAILED';
  expectedAmount?: number;
  receivedAmount?: number;
  ethTxHash?: string;
  cantonTxHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepositTransaction {
  id: string;
  depositAddressId: string;
  ethTxHash: string;
  amount: string;
  fromAddress: string;
  confirmations: number;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'MINTED' | 'FAILED';
  createdAt: Date;
  updatedAt: Date;
}

export interface BridgeRequest {
  userId: string;
  cantonAddress: string;
  amount: number;
}

export interface DepositAddressResponse {
  depositAddress: string;
  amount: number;
  userId: string;
  expiresAt: Date;
  qrCode?: string;
}

export interface MintResult {
  success: boolean;
  cantonTxHash: string;
  depositAddress: string;
  amount: string;
  timestamp: Date;
}
