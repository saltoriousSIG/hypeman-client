import { ExtendedVercelRequest } from "../src/types/request.type";
import { VercelResponse } from "@vercel/node";
import { withHost } from "../middleware/withHost.js";
import { validateSignature } from "../middleware/validateSignature.js";
import setupAdminWallet from "../src/lib/setupAdminWallet.js";
import { RedisClient } from "../src/clients/RedisClient.js";
import fs from "fs";
import path from "path";
import { DIAMOND_ADDRESS } from "../src/lib/utils.js";

const redis = new RedisClient(process.env.REDIS_URL as string);

async function handler(req: ExtendedVercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { publicClient } = setupAdminWallet();

    const dataAbiFilePath = path.join(
      process.cwd(),
      "/src/abis",
      "PromotionData.json"
    );
    const dataAbiFileContents = fs.readFileSync(dataAbiFilePath, "utf8");
    const data_abi = JSON.parse(dataAbiFileContents);

    const promoterPromotions: any = await publicClient.readContract({
      address: DIAMOND_ADDRESS as `0x${string}`,
      abi: data_abi,
      functionName: "getPromoterPromotions",
      args: [req.address as string],
    });

    const uniquePromotions = Array.from(
      new Map(promoterPromotions.map((item: any) => [item.id.toString(), item])).values()
    ); 


    const promotions = await Promise.all(
      uniquePromotions.map(async (promotion: any) => {
        const list = await redis.lrange(
          `intent:${promotion.id.toString()}`,
          0,
          -1
        );
        const current_user_intent = list.find((intent: any) => {
          return intent?.fid === req.fid?.toString();
        });
        const cast = await redis.get(
          `promotion:cast:${promotion.id.toString()}`
        );
        return {
          id: promotion.id.toString(),
          total_budget: promotion.total_budget.toString(),
          creator_fid: promotion.creator_fid.toString(),
          amount_paid_out: promotion.amount_paid_out.toString(),
          committed_budget: promotion.committed_budget.toString(),
          remaining_budget: promotion.remaining_budget.toString(),
          created_time: promotion.created_time.toString(),
          unprocessed_intents: parseInt(
            promotion.unprocessed_intents.toString()
          ),
          base_rate: promotion.base_rate.toString(),
          intents: current_user_intent ? [current_user_intent] : [],
          claimable: !!current_user_intent?.processed,
          cast_data: {
            text: cast.text,
            embeds: cast.embeds,
            author: cast.author,
          },
        };
      })
    );

    console.log(promotions);

    return res
      .status(200)
      .json({
        promotions: promotions.filter((p: any) => p.intents.length > 0 && p.claimable),
      });
  } catch (e: any) {
    console.log(e, e.message);
    return res.status(500).json({ error: e.message });
  }
}

export default withHost(validateSignature(handler));
