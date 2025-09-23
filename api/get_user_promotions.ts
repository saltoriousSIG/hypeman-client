import { VercelRequest, VercelResponse } from "@vercel/node";
import { HypemanAI } from "../src/clients/HypemanAI.js";
import { RedisClient } from "../src/clients/RedisClient.js";

const redisClient = new RedisClient(process.env.REDIS_URL as string);
const hypeman_ai = new HypemanAI();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { fid, username, promotions } = req.body;
    const user_casts: any = [];

    for (const promotion of promotions) {
      const user_cast_data = await redisClient.get(
        `user_cast:${fid}:${promotion.id}`
      );
      if (!user_cast_data) {
        const initialCast = await hypeman_ai.generateInitialCast(
          fid,
          username,
          promotion.name,
          promotion.description,
          promotion.project_url,
          promotion.cast_url
        );
        const cast_obj = {
          id: promotion.id,
          cast_text: initialCast.text,
        };
        await redisClient.set(
          `user_cast:${fid}:${promotion.id}`,
          JSON.stringify(cast_obj)
        );
        user_casts.push(cast_obj);
      } else {
        console.log(user_cast_data);
        user_casts.push(user_cast_data);
      }
    }
    return res.status(200).json({ user_casts });
  } catch (e: any) {
    console.error(e.message, e);
    res.status(500).json({ error: "Error processing cast" });
  }
}
