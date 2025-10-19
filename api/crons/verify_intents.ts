import { VercelRequest, VercelResponse } from "@vercel/node";
import { RedisClient } from "../../src/clients/RedisClient.js";
import { DIAMOND_ADDRESS } from "../../src/lib/utils.js";
import fs from "fs";
import path from "path";
import { zeroHash, pad } from "viem";
import setupAdminWallet from "../../src/lib/setupAdminWallet.js";
import { trim } from "viem";
import axios from "axios";
import { HypemanAI } from "../../src/clients/HypemanAI.js";

const redis = new RedisClient(process.env.REDIS_URL as string);

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

    const hypeman = await HypemanAI.getInstance(0, "hypeman_admin");

    const { publicClient, walletClient, account } = setupAdminWallet();

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
      const list = await redis.lrange(`intent:${i}`, 0, -1);
      console.log(list, "LIST");
      if (list.length > 0) {
        for (const [index, item] of list.entries()) {
          const promoter_details: any = await publicClient.readContract({
            address: DIAMOND_ADDRESS as `0x${string}`,
            abi: data_abi,
            functionName: "getPromoterDetails",
            args: [BigInt(i), item.wallet as `0x${string}`],
          });

          console.log(item, "ITEM");
          console.log(promoter_details, "PROMOTER DETAILS");
          const submitted_cast = await redis.get(`user_cast:${item.fid}:${i}`);
          console.log(
            promoter_details.fid !== 0n && promoter_details.state === 0
          );

          if (promoter_details.fid !== 0n && promoter_details.state === 0) {
            // check cast content matches what is in redis
            if (item.cast_hash) {
              const cast_hash = item.cast_hash
                ? trim(item.cast_hash)
                : zeroHash;
              try {
                const {
                  data: { cast },
                } = await axios.get(
                  `https://api.neynar.com/v2/farcaster/cast?identifier=${cast_hash}&type=hash`,
                  {
                    headers: {
                      "x-api-key": process.env.NEYNAR_API_KEY || "",
                    },
                  }
                );
                console.log(submitted_cast.generated_cast, "SUBMITTED CAST");

                const { sentimentMatch } = await hypeman.compareContent(
                  submitted_cast.generated_cast,
                  cast.text
                );
                console.log(sentimentMatch, "SENTIMENT MATCH");

                if (!sentimentMatch) {
                  intents_to_process.push({
                    intent_hash: item.intentHash,
                    promotion_id: item.promotion_id
                      ? BigInt(item.promotion_id)
                      : BigInt(item.promotionId),
                    wallet: item.wallet,
                    fid: BigInt(item.fid),
                    cast_hash: zeroHash,
                    post_time: BigInt(
                      item.timestamp || Math.floor(Date.now() / 1000)
                    ),
                  });
                  await redis.lrem(`intent:${i}`, 1, JSON.stringify(item));
                } else {
                  intents_to_process.push({
                    intent_hash: item.intentHash,
                    promotion_id: item.promotion_id
                      ? BigInt(item.promotion_id)
                      : BigInt(item.promotionId),
                    wallet: item.wallet,
                    fid: BigInt(item.fid),
                    cast_hash: pad(item.cast_hash, { size: 32 }),
                    post_time: BigInt(
                      item.timestamp || Math.floor(Date.now() / 1000)
                    ),
                  });
                  await redis.lset(`intent:${i}`, index, {
                    ...item,
                    processed: true,
                  });
                }
              } catch (e: any) {
                console.log("Error fetching cast:", e, e.message);
                intents_to_process.push({
                  intent_hash: item.intentHash,
                  promotion_id: item.promotion_id
                    ? BigInt(item.promotion_id)
                    : BigInt(item.promotionId),
                  wallet: item.wallet,
                  fid: BigInt(item.fid),
                  cast_hash: zeroHash,
                  post_time: BigInt(
                    item.timestamp || Math.floor(Date.now() / 1000)
                  ),
                });
                await redis.lrem(`intent:${i}`, 1, JSON.stringify(item));
              }
            } else {
              if (
                item.expiry &&
                parseInt(item.expiry) < Math.floor(Date.now() / 1000)
              ) {
                intents_to_process.push({
                  intent_hash: item.intentHash,
                  promotion_id: item.promotion_id
                    ? BigInt(item.promotion_id)
                    : BigInt(item.promotionId),
                  wallet: item.wallet,
                  fid: BigInt(item.fid),
                  cast_hash: zeroHash,
                  post_time: 0,
                });
                await redis.lrem(`intent:${i}`, 1, JSON.stringify(item));
              }
            }
          } else if (promoter_details.state !== 0n) {
            await redis.lset(`intent:${i}`, index, {
              ...item,
              processed: true,
            });
          }
        }
      }
    }
    console.log(intents_to_process, "INTENTS TO PROCESS");
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
