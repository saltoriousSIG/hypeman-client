import { VercelRequest, VercelResponse } from "@vercel/node";
import { RedisClient } from "../../src/clients/RedisClient.js";
import { DIAMOND_ADDRESS } from "../../src/lib/utils.js";
import setupAdminWallet from "../../src/lib/setupAdminWallet.js";
import fs from "fs";
import path from "path";
import { getUserStats } from "../../src/lib/getUserStats.js";
import { calculateUserTier } from "../../src/lib/calculateUserScore.js";
const redis = new RedisClient(process.env.REDIS_URL as string);

export const maxDuration = 300;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const dataAbiFilePath = path.join(
      process.cwd(),
      "/src/abis",
      `PromotionData.json`
    ); // Adjust path
    const dataAbiFileContents = fs.readFileSync(dataAbiFilePath, "utf8");
    const data_abi = JSON.parse(dataAbiFileContents);

    const { publicClient } = setupAdminWallet();

    const next_promotion_id = await publicClient.readContract({
      address: DIAMOND_ADDRESS as `0x${string}`,
      abi: data_abi,
      functionName: "getNextPromotionId",
      args: [],
    });

    const feeTierFrequencyMap = new Map<string, number>();

    for (let i = 0; i < Number(next_promotion_id); i++) {
      const list = await redis.lrange(`intent:${i}`, 0, -1);
      for (const item of list) {
        const cachedTier = await redis.get(`user_tier:${item.fid}`);
        if (!cachedTier) {
          const userData = await getUserStats(item.fid);
          const tier = calculateUserTier(
            userData.score,
            item.fid,
            userData.follower_count,
            userData.following_count,
            userData.avgLikes,
            userData.avgRecasts,
            userData.avgReplies,
            userData.power_badge
          );
          await redis.set(`user_tier:${item.fid}`, tier, 60 * 60 * 24 * 7); // Cache for 24 hours
          feeTierFrequencyMap.set(
            tier,
            (feeTierFrequencyMap.get(tier) || 0) + 1
          );
        } else {
          feeTierFrequencyMap.set(
            cachedTier,
            (feeTierFrequencyMap.get(cachedTier) || 0) + 1
          );
        }
      }
    }

    let frequencySum = 0;

    for (const tiers of feeTierFrequencyMap.entries()) {
      frequencySum += tiers[1];
    }

    const tierRates: {
      [key: string]: {
        count: number;
        rate: number;
      };
    } = {};

    for (const [feeTier, frequency] of feeTierFrequencyMap.entries()) {
      const rate = frequency / frequencySum;
      tierRates[feeTier] = {
        count: frequency,
        rate,
      };
    }

    await redis.set("tier_rates", JSON.stringify(tierRates));

    return res
      .status(200)
      .json({ message: "Tier rates processed successfully" });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
