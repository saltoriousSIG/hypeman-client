import { ExtendedVercelRequest } from "../src/types/request.type";
import { VercelResponse } from "@vercel/node";
import { RedisClient } from "../src/clients/RedisClient.js";
import { withHost } from "../middleware/withHost.js";
import { validateSignature } from "../middleware/validateSignature.js";

const redis = new RedisClient(process.env.REDIS_URL as string);

async function handler(req: ExtendedVercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!req.body.promotion_id || !req.body.intent) {
    return res
      .status(400)
      .json({ error: "Missing required fields: fid, promotion_id or intent" });
  }

  try {
    const { promotion_id, intent } = req.body;
    const list = await redis.lrange(`intent:${promotion_id}`, 0, -1);
    const index = list.findIndex(
      (i: any) =>
        i.intentHash === intent.intentHash &&
        promotion_id.toString() == i.promotionId &&
        i.fid == req.fid?.toString()
    );
    if (index === -1) {
      await redis.lpush(`intent:${promotion_id}`, JSON.stringify(intent));
    }
    res.status(200).json({ message: "Intent added successfully" });
  } catch (e: any) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export default withHost(validateSignature(handler));
