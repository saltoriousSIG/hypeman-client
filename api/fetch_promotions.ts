import { ExtendedVercelRequest } from "../src/types/request.type";
import { VercelResponse } from "@vercel/node";
import setupAdminWallet from "../src/lib/setupAdminWallet.js";
import { withHost } from "../middleware/withHost.js";
import { validateSignature } from "../middleware/validateSignature.js";
import { DIAMOND_ADDRESS } from "../src/lib/utils.js";
import fs from "fs";
import path from "path";
import axios from "axios";
import { RedisClient } from "../src/clients/RedisClient.js";
import { zeroHash } from "viem";

const redis = new RedisClient(process.env.REDIS_URL as string);

async function handler(req: ExtendedVercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const dataAbiFilePath = path.join(
      process.cwd(),
      "/src/abis",
      `PromotionData.json`
    );
    const dataAbiFileContents = fs.readFileSync(dataAbiFilePath, "utf8");
    const data_abi = JSON.parse(dataAbiFileContents);
    const { publicClient } = setupAdminWallet();

    const promotions = [];

    const next_promotion_id = await publicClient.readContract({
      address: DIAMOND_ADDRESS as `0x${string}`,
      abi: data_abi,
      functionName: "getNextPromotionId",
      args: [],
    });

    for (let i = 0; i < Number(next_promotion_id); i++) {
      const promotion: any = await publicClient.readContract({
        address: DIAMOND_ADDRESS as `0x${string}`,
        abi: data_abi,
        functionName: "getPromotion",
        args: [BigInt(i)],
      });

      const promoterData: any = await publicClient.readContract({
        address: DIAMOND_ADDRESS as `0x${string}`,
        abi: data_abi,
        functionName: "getPromoterDetails",
        args: [BigInt(i), req.address],
      });
      const promoters: any = await publicClient.readContract({
        address: DIAMOND_ADDRESS as `0x${string}`,
        abi: data_abi,
        functionName: "getPromotionPromoters",
        args: [BigInt(i)],
      });

      const list = await redis.lrange(`intent:${i}`, 0, -1);

      try {
        const {
          data: { cast },
        } = await axios.get(
          `https://api.neynar.com/v2/farcaster/cast?identifier=${encodeURIComponent(promotion.cast_url)}&type=url`,
          {
            headers: {
              "x-api-key": process.env.NEYNAR_API_KEY || "",
            },
          }
        );

        promotions.push({
          ...promotion,
          id: promotion.id.toString(),
          creator_fid: promotion.creator_fid.toString(),
          total_budget: promotion.total_budget.toString(),
          amount_paid_out: promotion.amount_paid_out.toString(),
          remaining_budget: promotion.remaining_budget.toString(),
          created_time: promotion.created_time.toString(),
          unprocessed_intents: promotion.unprocessed_intents.toString(),
          committed_budget: promotion.committed_budget.toString(),
          promoters,
          intents: list,
          display_to_promoters:
            promotion.state === 0 && BigInt(promotion.remaining_budget) > 0n,
          claimable:
            promoterData &&
            promoterData.fid > BigInt(0) &&
            promoterData.state > BigInt(0) &&
            promoterData.cast_hash !== zeroHash,
          cast_data: {
            text: cast.text,
            embeds: cast.embeds,
            author: cast.author,
          },
        });
      } catch (e: any) {
        promotions.push({
          ...promotion,
          id: promotion.id.toString(),
          creator_fid: promotion.creator_fid.toString(),
          total_budget: promotion.total_budget.toString(),
          amount_paid_out: promotion.amount_paid_out.toString(),
          promoters,
          remaining_budget: promotion.remaining_budget.toString(),
          created_time: promotion.created_time.toString(),
          committed_budget: promotion.committed_budget.toString(),
          unprocessed_intents: promotion.unprocessed_intents.toString(),
          display_to_promoters: false,
          intents: list,
          cast_data_fetch_error: e.message,
          cast_data: null,
        });
      }
    }
    res.status(200).json({ promotions });
  } catch (e: any) {
    console.log(e, e.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export default withHost(validateSignature(handler));
