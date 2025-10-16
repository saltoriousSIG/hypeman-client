import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains"; // import chains you need
import { createWalletClient, createPublicClient, http } from "viem";

const setupAdminWallet = () => {
  if (!process.env.OWNER_PRIVATE_KEY) {
    throw new Error("OWNER_PRIVATE_KEY not configured");
  }

  const account = privateKeyToAccount(
    process.env.OWNER_PRIVATE_KEY as `0x${string}`
  );

  const chain = base; // or polygon, arbitrum, etc.

  const publicClient = createPublicClient({
    chain,
    transport: http(process.env.RPC_URL), // or http() for default
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(process.env.RPC_URL),
  });

  return { publicClient, walletClient, account };
};

export default setupAdminWallet;
