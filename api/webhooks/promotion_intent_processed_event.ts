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

const redis = new RedisClient(process.env.REDIS_URL as string);

const INTENT_PROCESSED_TOPIC_HASH =
  "0x9d5c0ebd1bf43c1607ac1d363c91376f6c2c4ef7fb72bc11535e3ac209b32192";

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { publicClient } = setupAdminWallet();
    const filePath = path.join(
      process.cwd(),
      "/src/abis",
      `PromotionIntents.json`
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
        "PROMOTION INTENT PROCESSED EVENT FIRED vvv =============================================================================================== vvv"
      );

      for (const log of req.body) {
        if (log.topics.includes(INTENT_PROCESSED_TOPIC_HASH)) {
          const decoded: any = decodeEventLog({
            abi: [
              data.find(
                (x: any) => x.name === "IntentProcessed" && x.type === "event"
              )!,
            ],
            data: log.data,
            topics: log.topics,
          });

          if (decoded && decoded.eventName === "IntentProcessed") {
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
              );
            await pipeline.exec();
          }
        }
      }
    }

    return res.status(200).json({
      message: "Promotion intent processed Event Processed",
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
