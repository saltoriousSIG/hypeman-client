import { VercelResponse } from "@vercel/node";
import { ExtendedVercelRequest } from "../src/types/request.type.js";
import { RedisClient } from "../src/clients/RedisClient.js";
import { withHost } from "../middleware/withHost.js";
import { validateSignature } from "../middleware/validateSignature.js";

const redis = new RedisClient(process.env.REDIS_URL as string);

async function handler(req: ExtendedVercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!req.body.promotion_id) {
    return res
      .status(400)
      .json({ error: "Missing required fields: fid or promotion_id" });
  }

  try {
    const { promotion_id } = req.body;
    const list = await redis.lrange(`intent:${promotion_id}`, 0, -1);
    res.status(200).json({
      intents: list.find((i: any) => parseInt(i.fid) === req.fid || !req.fid),
    });
  } catch (e: any) {
    console.log("Error fetching intents:", e);
    res.status(500).json({ error: "Error processing cast" });
  }
}

export default withHost(validateSignature(handler));
