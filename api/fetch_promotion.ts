import { ExtendedVercelRequest } from "../src/types/request.type";
import { VercelResponse } from "@vercel/node";
import setupAdminWallet from "../src/lib/setupAdminWallet.js";
import { withHost } from "../middleware/withHost.js";
import { validateSignature } from "../middleware/validateSignature.js";
import { default_base_rate, DIAMOND_ADDRESS } from "../src/lib/utils.js";
import fs from "fs";
import path from "path";
import { RedisClient } from "../src/clients/RedisClient.js";
import { zeroHash } from "viem";
import { getUserStats } from "../src/lib/getUserStats.js";
import { parseUnits } from "viem";

const redis = new RedisClient(process.env.REDIS_URL as string);

async function handler(req: ExtendedVercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      res.status(400).json({ error: "Promotion ID is required" });
      return;
    }

    const dataAbiFilePath = path.join(
      process.cwd(),
      "/src/abis",
      `PromotionData.json`
    );
    const dataAbiFileContents = fs.readFileSync(dataAbiFilePath, "utf8");
    const data_abi = JSON.parse(dataAbiFileContents);
    const { publicClient } = setupAdminWallet();

    const promotionId = BigInt(id);
    const { score, isPro } = await getUserStats(req.fid as number);

    const [promotion, promoterData, promoters]: any =
      await publicClient.multicall({
        contracts: [
          {
            address: DIAMOND_ADDRESS as `0x${string}`,
            abi: data_abi,
            functionName: "getPromotion",
            args: [promotionId],
          },
          {
            address: DIAMOND_ADDRESS as `0x${string}`,
            abi: data_abi,
            functionName: "getPromoterDetails",
            args: [promotionId, req.address],
          },
          {
            address: DIAMOND_ADDRESS as `0x${string}`,
            abi: data_abi,
            functionName: "getPromotionPromoters",
            args: [promotionId],
          },
        ],
      });

    const list = await redis.lrange(`intent:${id}`, 0, -1);
    const current_user_intent = list.find((intent: any) => {
      return intent.fid === req.fid?.toString();
    });

    const existing_generated_cast = await redis.get(
      `user_cast:${req.fid}:${id}`
    );

    const cast = await redis.get(`promotion:cast:${id}`);
    console.log(promotion.result);
    if (cast) {
      const promotionData = {
        ...promotion.result,
        id: promotion.result.id.toString(),
        creator_fid: promotion.result.creator_fid.toString(),
        total_budget: promotion.result.total_budget.toString(),
        amount_paid_out: promotion.result.amount_paid_out.toString(),
        remaining_budget: promotion.result.remaining_budget.toString(),
        created_time: promotion.result.created_time.toString(),
        unprocessed_intents: promotion.result.unprocessed_intents.toString(),
        committed_budget: promotion.result.committed_budget.toString(),
        promoters: Array.from(new Set(promoters.result)),
        intents: list,
        current_user_intent,
        existing_generated_cast,
        display_to_promoters:
          promotion.result.state === 0 &&
          BigInt(promotion.result.remaining_budget) > 0n &&
          (promotion.result.pro_user ? isPro : true) &&
          score >= promotion.result.neynar_score,
        claimable:
          (promoterData &&
            promoterData.result.fid > BigInt(0) &&
            promoterData.result.state > BigInt(0) &&
            promoterData.result.cast_hash !== zeroHash) ||
          !!current_user_intent?.cast_hash,
        base_rate: promotion.result.base_rate > 0n ? promotion.result.base_rate.toString() : parseUnits(default_base_rate, 6).toString(),
        cast_data: {
          text: cast.text,
          embeds: cast.embeds,
          author: cast.author,
        },
      };

      res.status(200).json({ promotion: promotionData });
    } else {
      const promotionData = {
        ...promotion.result,
        id: promotion.result.id.toString(),
        creator_fid: promotion.result.creator_fid.toString(),
        total_budget: promotion.result.total_budget.toString(),
        amount_paid_out: promotion.result.amount_paid_out.toString(),
        promoters: Array.from(new Set(promoters.result)),
        remaining_budget: promotion.result.remaining_budget.toString(),
        created_time: promotion.result.created_time.toString(),
        committed_budget: promotion.result.committed_budget.toString(),
        unprocessed_intents: promotion.result.unprocessed_intents.toString(),
        current_user_intent,
        base_rate: parseUnits(default_base_rate, 6).toString(),
        display_to_promoters: false,
        intents: list,
        existing_generated_cast,
        cast_data_fetch_error: "No cast data found in Redis", 
        cast_data: null,
      };

      res.status(200).json({ promotion: promotionData });
    }
  } catch (e: any) {
    console.log(e, e.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export default withHost(validateSignature(handler));
