import { VercelRequest, VercelResponse } from "@vercel/node";
import { HypemanAI } from "../src/clients/HypemanAI.js";
import { RedisClient } from "../src/clients/RedisClient.js";
import { withHost } from "../middleware/withHost.js";

const redisClient = new RedisClient(process.env.REDIS_URL as string);

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const {
      fid,
      username,
      promotionId,
      previousCast,
      promotionContent,
      promotionAuthor,
      embedContext,
      userFeedback,
    } = req.body;

    const hypeman_ai = await HypemanAI.getInstance(fid, username);

    const cast = await hypeman_ai.refineCast(
      promotionContent,
      promotionAuthor,
      embedContext,
      userFeedback,
      previousCast
    );

    const cast_obj = {
      id: promotionId,
      generated_cast: cast.text,
      cast_author: promotionAuthor,
      cast_text: promotionContent,
      cast_embed_context: embedContext,
    };

    await redisClient.set(
      `user_cast:${fid}:${promotionId}`,
      JSON.stringify(cast_obj)
    );

    console.log("REROLLED CAST", { cast });

    res.status(200).json({ cast: cast_obj });
  } catch (e: any) {
    res.status(500).json({ error: "Error processing reroll" });
  }
}

export default withHost(handler);
