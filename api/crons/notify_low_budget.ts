import { VercelRequest, VercelResponse } from "@vercel/node";
import { RedisClient } from "../../src/clients/RedisClient.js";
import axios from "axios";
import { formatUnits } from "viem";

const redis = new RedisClient(process.env.REDIS_URL as string);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const activeIds = await redis.smembers("promotion_state:0");
    const creator_fids: Array<number> = [];
    for (const id of activeIds) {
      const promotion = await redis.hgetall(`promotion:${id}`);
      const formatted_remaining_budget = parseFloat(
        formatUnits(promotion.remaining_budget, 6)
      );
      const formatted_committed_budget = parseFloat(
        formatUnits(promotion.committed_budget, 6)
      );
      const formatted_base_rate = parseFloat(
        formatUnits(promotion.base_rate, 6)
      );
      const enough_budget =
        formatted_remaining_budget - formatted_committed_budget >=
        formatted_base_rate;
      if (!enough_budget) {
        creator_fids.push(promotion.creator_fid);
      }
    }

    await axios.post(
      `https://api.neynar.com/v2/farcaster/frame/notifications`,
      {
        notification: {
          title: `Your Promotion is Low on Budget`,
          body: `End your promotion, or top up your budget so it shows on the feed.`,
          target_url: `https://hypeman.social/manage`,
        },
        target_fids: [...creator_fids],
      },
      {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY as string,
        },
      }
    );
    return res.status(200).json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
