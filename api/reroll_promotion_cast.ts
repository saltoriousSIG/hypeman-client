import { VercelResponse } from "@vercel/node";
import { HypemanAI } from "../src/clients/HypemanAI.js";
import { RedisClient } from "../src/clients/RedisClient.js";
import { withHost } from "../middleware/withHost.js";
import { ExtendedVercelRequest } from "../src/types/request.type.js";
import { validateSignature } from "../middleware/validateSignature.js";

const redisClient = new RedisClient(process.env.REDIS_URL as string);

export const maxDuration = 300; 

async function handler(req: ExtendedVercelRequest, res: VercelResponse) {
  try {
    const {
      username,
      promotionId,
      previousCast,
      promotionContent,
      promotionAuthor,
      embedContext,
      userFeedback,
    } = req.body;

    const hypeman_ai = new HypemanAI(req.fid as number, username);

    const cast = await hypeman_ai.refineCast(
      promotionId,
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
      `user_cast:${req.fid}:${promotionId}`,
      JSON.stringify(cast_obj)
    );

    console.log("REROLLED CAST:", { cast });

    res.status(200).json({ cast: cast_obj });
  } catch (e: any) {
    console.error("Error processing reroll:", e);
    res.status(500).json({ error: "Error processing reroll" });
  }
}

export default withHost(validateSignature(handler));
