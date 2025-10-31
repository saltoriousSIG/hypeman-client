import { VercelRequest, VercelResponse } from "@vercel/node";
import { decodeEventLog } from "viem";
import fs from "fs";
import path from "path";
import { RedisClient } from "../../src/clients/RedisClient.js";
import setupAdminWallet from "../../src/lib/setupAdminWallet.js";
import { DIAMOND_ADDRESS } from "../../src/lib/utils.js";
import axios from "axios";
import { formatUnits } from "viem";
import { streamMiddleware } from "../../middleware/streamMiddleware.js";

const redis = new RedisClient(process.env.REDIS_URL as string);

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { publicClient } = setupAdminWallet();
    const filePath = path.join(
      process.cwd(),
      "/src/abis",
      `PromotionCreate.json`
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
        "PROMOTION CREATE EVENT FIRED vvv =============================================================================================== vvv"
      );

      for (const log of req.body) {
        const decoded: any = decodeEventLog({
          abi: [
            data.find(
              (x: any) => x.name === "PromotionCreated" && x.type === "event"
            )!,
          ],
          data: log.data,
          topics: log.topics,
        });

        if (decoded && decoded.eventName === "PromotionCreated") {
          const promotion: any = await publicClient.readContract({
            address: DIAMOND_ADDRESS as `0x${string}`,
            abi: data_abi,
            functionName: "getPromotion",
            args: [decoded.args.id.toString()],
          });

          const {
            data: { cast },
          } = await axios.get(
            `https://api.neynar.com/v2/farcaster/cast/?type=url&identifier=${encodeURIComponent(promotion.cast_url)}`,
            {
              headers: {
                "x-api-key": process.env.NEYNAR_API_KEY as string,
              },
            }
          );

          pipeline
            .set(
              `promotion:cast:${promotion.id.toString()}`,
              redis.encrypt(JSON.stringify(cast))
            )
            .hset(`promotion:${promotion.id.toString()}`, {
              ...promotion,
            })
            .zadd(
              `promotion_budget`,
              parseFloat(formatUnits(promotion.remaining_budget, 6)),
              promotion.id.toString()
            )
            //TODO: update this to the right thing after contract has beed upgraded
            .zadd(`promotion_base_rate`, parseFloat("0.25"), promotion.id.toString())
            .sadd(`promotion_state:${promotion.state.toString()}`, promotion.id.toString())
            .sadd(`promotion_is_pro:${promotion.pro_user}`, promotion.id.toString())

          await pipeline.exec()
        }
      }
    }
    return res.status(200).json({
      message: "Promotion Create Event Processed",
      processed: req.body.length,
    });
  } catch (e: any) {
    console.error("Error loading ABI file:", e);
    return res
      .status(500)
      .json({ error: "Internal Server Error - ABI Load Failed" });
  }
}

export default streamMiddleware(handler);
