import { type Address, type Hex } from "viem";

export interface Intent {
  intentHash: Hex;
  promotion_id: bigint | string;
  wallet: Address;
  fid: bigint | string;
  fee: bigint | string;
  expiry: bigint | string;
  nonce: bigint | string;
  castHash?: string;
  timestamp?: string;
}
