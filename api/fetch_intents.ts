import { VercelRequest, VercelResponse } from "@vercel/node";
import { RedisClient } from "../src/clients/RedisClient.js";

const redis = new RedisClient(process.env.REDIS_URL as string);

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!req.body.fid && !req.body.promotion_id) {
    return res
      .status(400)
      .json({ error: "Missing required fields: fid or promotion_id" });
  }

  try {
    const { fid, promotion_id } = req.body;
    console.log("FETCHING INTENTS", { fid, promotion_id });
    const list = await redis.lrange(`intent:${promotion_id}`, 0, -1);
    res
      .status(200)
      .json({
        intents: list.filter((i: any) => parseInt(i.fid) === fid || !fid),
      });
  } catch (e: any) {
    console.log("Error fetching intents:", e);
    res.status(500).json({ error: "Error processing cast" });
  }
}

export default handler;
