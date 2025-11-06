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

    const hypeman = new HypemanAI(0, "hypeman_admin");

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

    let intents_to_process: any = [];

    for (let i = 0; i < Number(next_promotion_id); i++) {
      const redis_list = await redis.lrange(`intent:${i}`, 0, -1);
      const list = redis_list.filter((item) => !item.processed);
      if (list.length > 0) {
        for (const [index, item] of list.entries()) {
          const promoter_details: any = await publicClient.readContract({
            address: DIAMOND_ADDRESS as `0x${string}`,
            abi: data_abi,
            functionName: "getPromoterDetails",
            args: [BigInt(i), item.wallet as `0x${string}`],
          });

          const submitted_cast = await redis.get(`user_cast:${item.fid}:${i}`);

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

                const { sentimentMatch } = await hypeman.compareContent(
                  submitted_cast.generated_cast,
                  cast.text
                );

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
                }
              } catch (e: any) {
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

    if (intents_to_process.length > 0) {
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

      const notification_ids: any = [];

      // only update redis after successful tx
      for (const intent of intents_to_process) {
        const list = await redis.lrange(`intent:${intent.promotion_id}`, 0, -1);
        if (intent.cast_hash === zeroHash) {
          const target_intent = list.find((item) => {
            return item.intentHash === intent.intent_hash;
          });
          if (target_intent) {
            await redis.lrem(
              `intent:${intent.promotion_id}`,
              1,
              JSON.stringify(target_intent)
            );
          }
        } else {
          const index = list.findIndex((item) => {
            return item.intentHash === intent.intent_hash;
          });
          if (index !== -1) {
            const item = list[index];
            notification_ids.push(item.fid.toString());
            await redis.lset(`intent:${intent.promotion_id}`, index, {
              ...item,
              processed: true,
            });
          }
        }
      }

      //push notifications
      if (notification_ids.length > 0) {
        await axios.post(
          `https://api.neynar.com/v2/farcaster/frame/notifications`,
          {
            notification: {
              title: `Your claim is ready!`,
              body: "Your USDC is ready to be claimed. Click to claim now!",
              target_url: "https://hypeman.social",
            },
            target_fids: [...notification_ids],
          },
          {
            headers: {
              "x-api-key": process.env.NEYNAR_API_KEY as string,
            },
          }
        );
      }

      return res.status(200).json({
        success: true,
        txHash: receipt.transactionHash,
        processed: intents_to_process.length,
      });
    }

    res.status(200).json({
      success: true,
      txHash: null,
      processed: intents_to_process.length,
    });
  } catch (e: any) {
    console.error("Error:", e);
    res.status(500).json({ error: e.message || "Error verifying intents" });
  }
}
