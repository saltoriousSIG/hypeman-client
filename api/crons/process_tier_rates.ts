import { VercelRequest, VercelResponse } from "@vercel/node";
import { RedisClient } from "../../src/clients/RedisClient.js";
import { DIAMOND_ADDRESS } from "../../src/lib/utils.js";
import setupAdminWallet from "../../src/lib/setupAdminWallet.js";
import fs from "fs";
import path from "path";

const redis = new RedisClient(process.env.REDIS_URL as string);
const tierNameMapping: Record<string, string> = {
  "1000000": "tier1",
  "2000000": "tier2",
  "3000000": "tier3",
};

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
        const feeTierFrequency = feeTierFrequencyMap.get(item.fee) || 0;
        feeTierFrequencyMap.set(item.fee, feeTierFrequency + 1);
      }
    }

    let frequencySum = 0;

    for (const [feeTier, frequency] of feeTierFrequencyMap.entries()) {
      frequencySum += frequency;
    }

    const tierRates: {
      [key: string]: {
        count: number;
        rate: number;
      };
    } = {};

    for (const [feeTier, frequency] of feeTierFrequencyMap.entries()) {
      tierRates[tierNameMapping[feeTier]] = {
        count: frequency,
        rate: frequencySum === 0 ? 0 : frequency / frequencySum,
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
