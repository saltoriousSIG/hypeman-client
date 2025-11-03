import { ExtendedVercelRequest } from "../src/types/request.type";
import { VercelResponse } from "@vercel/node";
import setupAdminWallet from "../src/lib/setupAdminWallet.js";
import { withHost } from "../middleware/withHost.js";
import { validateSignature } from "../middleware/validateSignature.js";
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

    const creatorPromotions: any = await publicClient.readContract({
      address: DIAMOND_ADDRESS as `0x${string}`,
      abi: data_abi,
      functionName: "getCreatorPromotions",
      args: [req.address as string],
    });

    const formattedPromotions = await Promise.all(
      creatorPromotions.map(async (promotion: any) => {
        const list = await redis.lrange(
          `intent:${promotion.id.toString()}`,
          0,
          -1
        );

        const cast = await redis.get(
          `promotion:cast:${promotion.id.toString()}`
        );
        return {
          ...promotion,
          id: promotion.id.toString(),
          creator_fid: promotion.creator_fid.toString(),
          total_budget: promotion.total_budget.toString(),
          amount_paid_out: promotion.amount_paid_out.toString(),
          intents: list,
          committed_budget: promotion.committed_budget.toString(),
          remaining_budget: promotion.remaining_budget.toString(),
          created_time: promotion.created_time.toString(),
          unprocessed_intents: promotion.unprocessed_intents.toString(),
          base_rate: promotion.base_rate.toString(),
          cast_data: {
            text: cast.text,
            embeds: cast.embeds,
            author: cast.author,
          },
        };
      })
    );

    return res.status(200).json({ creatorPromotions: formattedPromotions });
  } catch (e: any) {
    return res.status(500).json({ error: "Error fetching creator promotions" });
  }
}

export default withHost(validateSignature(handler));
