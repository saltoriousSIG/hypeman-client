import { VercelRequest, VercelResponse } from "@vercel/node";
import {
  createWalletClient,
  createPublicClient,
  http,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains"; // import chains you need
import { RedisClient } from "../../src/clients/RedisClient.js";
import { DIAMOND_ADDRESS } from "../../src/lib/utils.js";
import fs from "fs";
import path from "path";
import { zeroHash, pad } from "viem";

const redis = new RedisClient(process.env.REDIS_URL as string);

// Define your contract ABI

// Setup wallet and clients
const setupClients = () => {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Auth check
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const dataAbiFilePath = path.join(
      process.cwd(),
      "/src/abis",
      `PromotionData.json`
    ); // Adjust path
    const dataAbiFileContents = fs.readFileSync(dataAbiFilePath, "utf8");
    const data_abi = JSON.parse(dataAbiFileContents);

    const intentsAbiFilePath = path.join(
      process.cwd(),
      "/src/abis",
      `PromotionIntents.json`
    ); // Adjust path
    const intentsAbiFileContents = fs.readFileSync(intentsAbiFilePath, "utf8");
    const intents_abi = JSON.parse(intentsAbiFileContents);

    const { publicClient, walletClient, account } = setupClients();

    // Example: Read from contract
    const next_promotion_id = await publicClient.readContract({
      address: DIAMOND_ADDRESS as `0x${string}`,
      abi: data_abi,
      functionName: "getNextPromotionId",
      args: [
        /* your args */
      ],
    });

    let intents_to_process = [];

    for (let i = 0; i < Number(next_promotion_id); i++) {
      const list = (await redis.lrange(`intent:${i}`, 0, -1)).filter(
        (item) => !item.processed
      );
      if (list.length > 0) {
        for (const [index, item] of list.entries()) {
          if (item.castHash) {
            intents_to_process.push({
              intent_hash: item.intentHash,
              promotion_id: BigInt(item.promotionId),
              wallet: item.wallet,
              fid: BigInt(item.fid),
              cast_hash: pad(item.castHash, { size: 32 }),
              post_time: BigInt(item.timestamp),
            });
            await redis.lset(`intent:${i}`, index, {
              ...item,
              processed: true,
            });
          } else {
            if (Date.now() / 1000 > Number(item.expiry)) {
              intents_to_process.push({
                intent_hash: item.intentHash,
                promotion_id: BigInt(item.promotionId),
                wallet: item.wallet,
                fid: BigInt(item.fid),
                cast_hash: zeroHash,
                post_time: 0,
              });
              await redis.lset(`intent:${i}`, index, {
                ...item,
                processed: true,
              });
            }
          }
        }
      }
    }
    const { request } = await publicClient.simulateContract({
      account,
      address: DIAMOND_ADDRESS as `0x${string}`,
      abi: intents_abi,
      functionName: "batchProcessIntents",
      args: [intents_to_process],
    });

    const hash = await walletClient.writeContract(request);

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    res.status(200).json({
      success: true,
      txHash: receipt.transactionHash,
      processed: intents_to_process.length,
    });
  } catch (e: any) {
    console.error("Error:", e);
    res.status(500).json({ error: e.message || "Error verifying intents" });
  }
}
