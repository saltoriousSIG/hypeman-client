import { VercelRequest, VercelResponse } from "@vercel/node";
import { RedisClient } from "../src/clients/RedisClient.js";
import { withHost } from "../middleware/withHost.js";

const redis = new RedisClient(process.env.REDIS_URL as string);

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const tierRates = await redis.get("tier_rates");
    if (!tierRates) {
      return res.status(404).json({ error: "Tier rates not found" });
    }
    return res.status(200).json(tierRates);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export default withHost(handler);
