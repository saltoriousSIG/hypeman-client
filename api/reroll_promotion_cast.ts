import { VercelRequest, VercelResponse } from "@vercel/node";
import { HypemanAI } from "../src/clients/HypemanAI.js";
import { RedisClient } from "../src/clients/RedisClient.js";

const redisClient = new RedisClient(process.env.REDIS_URL as string);
const hypeman_ai = new HypemanAI();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const {
      fid,
      username,
      promotionId,
      previousCast,
      userFeedback,
      promotionName,
      promotionDescription,
      promotionUrl,
      promotionCast,
    } = req.body;

    const cast = await hypeman_ai.refineCast(
      fid,
      username,
      promotionName,
      promotionDescription,
      promotionUrl,
      previousCast,
      userFeedback,
      promotionCast
    );

    const cast_obj = {
      id: promotionId,
      cast_text: cast.text,
    };

    await redisClient.set(
      `user_cast:${fid}:${promotionId}`,
      JSON.stringify(cast_obj)
    );

    console.log("REROLLED CAST", { cast });

    res.status(200).json({ cast: cast.text });
  } catch (e: any) {
    res.status(500).json({ error: "Error processing reroll" });
  }
}
