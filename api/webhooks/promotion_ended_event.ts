import { VercelRequest, VercelResponse } from "@vercel/node";
import { decodeEventLog } from "viem";
import fs from "fs";
import path from "path";
import { RedisClient } from "../../src/clients/RedisClient.js";
import setupAdminWallet from "../../src/lib/setupAdminWallet.js";
import { DIAMOND_ADDRESS } from "../../src/lib/utils.js";
import { formatUnits } from "viem";
import { streamMiddleware } from "../../middleware/streamMiddleware.js";
import { withHost } from "../../middleware/withHost.js";
import axios from "axios";

const redis = new RedisClient(process.env.REDIS_URL as string);

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { publicClient } = setupAdminWallet();
    const filePath = path.join(
      process.cwd(),
      "/src/abis",
      `PromotionManage.json`
    ); // Adjust path
    const fileContents = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(fileContents);

    const dataAbiFilePath = path.join(
      process.cwd(),
      "/src/abis",
      "PromotionData.json"
    );

    const dataAbiFileContents = fs.readFileSync(dataAbiFilePath, "utf8");
    const data_abi = JSON.parse(dataAbiFileContents);

    const pipeline = redis.pipeline();

    if (req.body.length > 0) {
      console.log(
        "PROMOTION ENDED EVENT FIRED vvv =============================================================================================== vvv"
      );

      for (const log of req.body) {
        const decoded: any = decodeEventLog({
          abi: [
            data.find(
              (x: any) => x.name === "PromotionEnded" && x.type === "event"
            )!,
          ],
          data: log.data,
          topics: log.topics,
        });

        if (decoded && decoded.eventName === "PromotionEnded") {
          const promotion: any = await publicClient.readContract({
            address: DIAMOND_ADDRESS as `0x${string}`,
            abi: data_abi,
            functionName: "getPromotion",
            args: [decoded.args.promotionId.toString()],
          });

          pipeline
            .hset(`promotion:${promotion.id.toString()}`, {
              ...promotion,
            })
            .zadd(
              `promotion_budget`,
              parseFloat(formatUnits(promotion.remaining_budget, 6)),
              promotion.id.toString()
            )
            .srem(`promotion_state:0`, promotion.id.toString())
            .sadd(
              `promotion_state:${promotion.state.toString()}`,
              promotion.id.toString()
            );
          await pipeline.exec();

          // update tracked user deletions
          const activeIds = await redis.smembers(`promotion_state:0`);

          const new_pipeline = redis.pipeline();
          for (const id of activeIds) {
            new_pipeline.hgetall(`promotion:${id}`);
          }
          const results: any = await new_pipeline.exec();
          const promotion_mapping = new Map();

          for (const [error, promotion] of results) {
            if (error) {
              console.error("Error fetching promotion:", error);
              continue;
            }
            promotion_mapping.set(promotion.id, promotion);
          }
          const creatorIds = new Set<number>();
          for (const id of activeIds) {
            const promo = promotion_mapping.get(id);
            creatorIds.add(Number(promo.creator_fid));
          }
          await axios.put(
            "https://api.neynar.com/v2/farcaster/webhook/",
            {
              name: process.env.NEYNAR_CHECK_DELETE_CAST_WEBHOOK_NAME,
              url: process.env.NEYNAR_CHECK_DELETE_CAST_WEBHOOK_URL,
              webhook_id: process.env.NEYNAR_CHECK_DELETE_CAST_WEBHOOK_ID,
              subscription: {
                "cast.deleted": {
                  author_fids: Array.from(creatorIds),
                },
              },
            },
            {
              headers: {
                "x-api-key": process.env.NEYNAR_API_KEY as string,
              },
            }
          );
        }
      }
    }
    return res.status(200).json({
      message: "Promotion ended Event Processed",
      processed: req.body.length,
    });
  } catch (e: any) {
    console.error("Error loading ABI file:", e);
    return res
      .status(500)
      .json({ error: "Internal Server Error - ABI Load Failed" });
  }
}

export default withHost(streamMiddleware(handler));
