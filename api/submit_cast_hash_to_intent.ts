import { ExtendedVercelRequest } from "../src/types/request.type";
import { VercelResponse } from "@vercel/node";
import { withHost } from "../middleware/withHost.js";
import { validateSignature } from "../middleware/validateSignature.js";
import { RedisClient } from "../src/clients/RedisClient";

const redis = new RedisClient(process.env.REDIS_URL as string);

async function handler(req: ExtendedVercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { cast_hash, intent_hash, promotion_id } = req.body;
    const list = await redis.lrange(`intent:${promotion_id}`, 0, -1);
    const intent = list.find((i: any) => i.intentHash === intent_hash);
  } catch (e: any) {
    res.status(500).json({ error: "Error submitting cast hash" });
  }
}

export default withHost(validateSignature(handler));
