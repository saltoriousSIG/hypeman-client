import { VercelRequest, VercelResponse } from "@vercel/node";
import { decodeEventLog } from "viem";
import fs from "fs";
import path from "path";
import setupAdminWallet from "../../src/lib/setupAdminWallet.js";
import { DIAMOND_ADDRESS } from "../../src/lib/utils.js";
import { RedisClient } from "../../src/clients/RedisClient.js";
import { formatUnits } from "viem";
import { streamMiddleware } from "../../middleware/streamMiddleware.js";
import { withHost } from "../../middleware/withHost.js";

const redis = new RedisClient(process.env.REDIS_URL as string);

async function handler(req: VercelRequest, res: VercelResponse) {
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

  try {
    for (const log of req.body) {
      const decoded: any = decodeEventLog({
        abi: [
          data.find((x: any) => {
            return x.name === "IntentProcessed" && x.type === "event";
          })!,
        ],
        data: log.data,
        topics: log.topics,
      });

      const promotion: any = await publicClient.readContract({
        address: DIAMOND_ADDRESS,
        abi: data_abi,
        functionName: "getPromotion",
        args: [decoded.args.promotionId],
      });

      pipeline
        .hset(`promotion:${promotion.id}`, {
          ...promotion
        })
        .zadd(
          `promotion_budget`,
          parseFloat(formatUnits(promotion.remaining_budget, 6)),
          promotion.id.toString()
        )
      await pipeline.exec();
    }
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.log(error);
    console.log(error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export default withHost(streamMiddleware(handler));
