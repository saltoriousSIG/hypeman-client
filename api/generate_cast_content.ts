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
      intent,
      userFeedback,
      previousCast,
    } = req.body;

    // Check if intent is provided - only required for initial generation, not refresh
    const isRefreshOperation = !intent;
    
    if (!isRefreshOperation && !intent) {
      return res.status(400).json({ 
        error: "Intent signature required before generating cast content",
        code: "INTENT_REQUIRED"
      });
    }

    // Save intent to Redis if not already saved (only for initial generation, not refresh)
    if (!isRefreshOperation && intent) {
      try {
        const existingIntents = await redisClient.lrange(`intent:${promotionId}`, 0, -1);
        const intentExists = existingIntents.some((i: any) => {
          const parsed = typeof i === 'string' ? JSON.parse(i) : i;
          return parsed.intentHash === intent.intentHash && 
                 parsed.fid === req.fid?.toString();
        });

        if (!intentExists) {
          await redisClient.lpush(`intent:${promotionId}`, JSON.stringify(intent));
          console.log("Intent saved to Redis:", intent.intentHash);
        }
      } catch (redisError) {
        console.error("Error saving intent to Redis:", redisError);
        // Continue with cast generation even if Redis save fails
      }
    }

    const hypeman_ai = await HypemanAI.getInstance(req.fid as number, username);

    // Generate cast content - use refineCast if user feedback is provided, otherwise generateInitialCast
    let castResult;
    if (userFeedback && userFeedback.trim()) {
      // Use refineCast with the provided previous cast
      castResult = await hypeman_ai.refineCast(
        promotionContent,
        promotionAuthor,
        embedContext,
        userFeedback,
        previousCast || "", // Use provided previous cast or empty string
        { temperature: 0.92 }
      );
    } else {
      // Use generateInitialCast for regular generation
      castResult = await hypeman_ai.generateInitialCast(
        promotionContent,
        promotionAuthor,
        embedContext
      );
    }

    if (!castResult.success) {
      return res.status(500).json({ 
        error: "Failed to generate cast content",
        details: castResult.error 
      });
    }

    // Store the generated content in Redis for future rerolls
    const cast_obj = {
      id: promotionId,
      generated_cast: castResult.text,
      cast_author: promotionAuthor,
      cast_text: promotionContent,
      cast_embed_context: embedContext,
      ...(intent && { intent }), // Include intent in cast object for reference only if provided
    };

    await redisClient.set(
      `user_cast:${req.fid}:${promotionId}`,
      JSON.stringify(cast_obj)
    );

    console.log("Generated cast content:", { 
      cast: castResult, 
      isRefreshOperation,
      intentHash: intent?.intentHash,
      userFeedback: userFeedback ? "provided" : "none"
    });

    res.status(200).json({ 
      generated_cast: castResult.text,
      model: castResult.model,
      ...(intent && { intent }) // Return intent for client reference only if provided
    });
  } catch (e: any) {
    console.error("Error generating cast content:", e);
    res.status(500).json({ error: "Error generating cast content" });
  }
}

export default withHost(validateSignature(handler));
