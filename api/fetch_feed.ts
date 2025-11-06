import { ExtendedVercelRequest } from "../src/types/request.type";
import { VercelResponse } from "@vercel/node";
import setupAdminWallet from "../src/lib/setupAdminWallet.js";
import { withHost } from "../middleware/withHost.js";
import { validateSignature } from "../middleware/validateSignature.js";
import { RedisClient } from "../src/clients/RedisClient.js";
import fs from "fs";
import path from "path";
import { DIAMOND_ADDRESS } from "../src/lib/utils.js";
import { zeroHash } from "viem";

const redis = new RedisClient(process.env.REDIS_URL as string);

async function handler(req: ExtendedVercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { publicClient } = setupAdminWallet();
    const client = redis.raw;
    const pipeline = redis.pipeline();

    const dataAbiFilePath = path.join(
      process.cwd(),
      "/src/abis",
      "PromotionData.json"
    );
    const dataAbiFileContents = fs.readFileSync(dataAbiFilePath, "utf8");
    const data_abi = JSON.parse(dataAbiFileContents);


    // STEP 1: Create composite scores for ALL promotions
    await client.zunionstore(
      "temp:sorted_promotions",
      2,
      "promotion_base_rate",
      "promotion_budget",
      "WEIGHTS",
      100,
      1,
      "AGGREGATE",
      "SUM"
    );

    // STEP 2: Get which promotions are active
    const activeIds = await client.smembers("promotion_state:0");

    // STEP 3: Fetch scores for ONLY the active ones
    activeIds.forEach((id) => {
      pipeline.zscore("temp:sorted_promotions", id);
      pipeline.hgetall(`promotion:${id}`);
      pipeline.get(`promotion:cast:${id}`);
    });

    const results: any = await pipeline.exec();

    // STEP 4: Build and sort
    const promotions: any = [];
    for (let i = 0; i < activeIds.length; i++) {
      const baseIndex = i * 3;
      const score = results[baseIndex][1];

      const cast = redis.decrypt(results[baseIndex + 2][1]);

      if (score !== null) {
        promotions.push({
          ...results[baseIndex + 1][1],
          cast_data: {
            text: cast.text,
            embeds: cast.embeds,
            author: cast.author,
          },
          score,
        });
      }
    }

    promotions
      .sort((a: any, b: any) => b.score - a.score)
      .map((promotion: any) => ({
        ...promotion,
      }));

    const promotion_hydrated_onchain = await Promise.all(
      promotions.map(async (promotion: any) => {
        const [promoterDetails, promotionPromoters]: any =
          await publicClient.multicall({
            contracts: [
              {
                address: DIAMOND_ADDRESS as `0x${string}`,
                abi: data_abi,
                functionName: "getPromoterDetails",
                args: [promotion.id, req.address],
              },
              {
                address: DIAMOND_ADDRESS as `0x${string}`,
                abi: data_abi,
                functionName: "getPromotionPromoters",
                args: [promotion.id],
              },
            ],
          });

        const list = await redis.lrange(`intent:${promotion.id}`, 0, -1);
        const current_user_intent = list.find((intent: any) => {
          return intent?.fid === req.fid?.toString();
        });
        const existing_generated_cast = await redis.get(
          `user_cast:${req?.fid}:${promotion.id}`
        );
        return {
          ...promotion,
          display_to_promoters:
            promotion.state === "0" && BigInt(promotion.remaining_budget) > 0n,
          claimable:
            (promoterDetails.result &&
              promoterDetails.result?.fid > BigInt(0) &&
              promoterDetails.result.state > BigInt(0) &&
              promoterDetails.result.cast_hash !== zeroHash) ||
            !!current_user_intent?.cast_hash,
          current_user_intent,
          intents: list,
          existing_generated_cast,
          promoters: Array.from(new Set(promotionPromoters.result)),
        };
      })
    );

    // STEP 5: Cleanup
    await redis.del("temp:sorted_promotions");

    res.status(200).json({ promotions: promotion_hydrated_onchain });
  } catch (e: any) {
    console.error("Error in fetch_feed handler:", e);
    res
      .status(500)
      .json({ error: "Internal server error", message: e.message });
  }
}

export default withHost(validateSignature(handler));
