import { VercelResponse } from "@vercel/node";
import { HypemanAI } from "../src/clients/HypemanAI.js";
import { RedisClient } from "../src/clients/RedisClient.js";
import { withHost } from "../middleware/withHost.js";
import { ExtendedVercelRequest } from "../src/types/request.type.js";
import { validateSignature } from "../middleware/validateSignature.js";

const redisClient = new RedisClient(process.env.REDIS_URL as string);

async function handler(req: ExtendedVercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  try {
    const {
      username,
      promotionId,
      promotionContent,
      promotionAuthor,
      embedContext,
    } = req.body;

    const hypeman_ai = await HypemanAI.getInstance(req.fid as number, username);

    // Generate the initial cast content
    const initialCast = await hypeman_ai.generateInitialCast(
      promotionContent,
      promotionAuthor,
      embedContext
    );

    if (!initialCast.success) {
      return res.status(500).json({ 
        error: "Failed to generate cast content",
        details: initialCast.error 
      });
    }

    // Store the generated content in Redis for future rerolls
    const cast_obj = {
      id: promotionId,
      generated_cast: initialCast.text,
      cast_author: promotionAuthor,
      cast_text: promotionContent,
      cast_embed_context: embedContext,
    };

    await redisClient.set(
      `user_cast:${req.fid}:${promotionId}`,
      JSON.stringify(cast_obj)
    );

    console.log("Generated cast content:", { cast: initialCast });

    res.status(200).json({ 
      generated_cast: initialCast.text,
      model: initialCast.model 
    });
  } catch (e: any) {
    console.error("Error generating cast content:", e);
    res.status(500).json({ error: "Error generating cast content" });
  }
}

export default withHost(validateSignature(handler));
