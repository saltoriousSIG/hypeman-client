import { z } from "zod";
import axios from "axios";
import { anthropic } from "@ai-sdk/anthropic";
import { tool, generateObject } from "ai";
import { ExistingQuoteCastSchema } from "../schemas.js";
import { sanitizeCasts } from "../utils.js";
import { RedisClient } from "../../RedisClient.js";

const redis = new RedisClient(process.env.REDIS_URL as string);

const anthropicModel = anthropic(
  process.env.ANTHROPIC_MODEL_NAME || "claude-haiku-4-5-20251001"
);

const existingQuoteCastAnalysisTool = tool({
  description:
    "Analyze existing quote casts for a promotion to identify common phrases, and language already used, and know things to avoid when generating new quote casts.",
  inputSchema: z.object({
    promotion_id: z.number().describe("The ID of the promotion to analyze"),
  }),
  execute: async ({ promotion_id }) => {
    const castKey = `promotion:cast:${promotion_id}`;
    const castData = await redis.get(castKey);
    const {
      data: { casts },
    } = await axios.get(
      `https://api.neynar.com/v2/farcaster/cast/quotes/?limit=100&type=hash&identifier=${castData.hash}`,
      {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY as string,
        },
      }
    );
    const sanitizedQuotesCasts = sanitizeCasts(casts);
    const existingQuoteCastsSummary = await generateObject({
      model: anthropicModel,
      messages: [
        {
          role: "system",
          content: `You are an expert social media analyst. Based on the existing quote casts for the promotion below, identify common phrases, language already used, and things to avoid when generating new quote casts.`,
        },
        {
          role: "user",
          content: `Existing Quote Casts for Promotion ID ${promotion_id}: ${JSON.stringify(
            sanitizedQuotesCasts
          )}`,
        },
      ],
      schema: ExistingQuoteCastSchema,
    });
    return existingQuoteCastsSummary.object;
  },
});

export default existingQuoteCastAnalysisTool;
