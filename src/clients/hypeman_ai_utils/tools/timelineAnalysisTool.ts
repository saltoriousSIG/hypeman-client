import { z } from "zod";
import { anthropic } from "@ai-sdk/anthropic";
import { tool, generateObject } from "ai";
import { TimelineSummarySchema } from "../schemas.js";
import { RedisClient } from "../../RedisClient.js";

const anthropicModel = anthropic(
  process.env.ANTHROPIC_MODEL_NAME || "claude-haiku-4-5-20251001"
);


const redis = new RedisClient(process.env.REDIS_URL as string);

const timelineAnalysisTool = tool({
  description: `Analyze the current trending timeline on Farcaster to understand what topics are popular right now.

ONLY call this tool if:
- The promotion topic relates to current events, trends, or zeitgeist
- Understanding what's trending would help make the promotion more relevant
- The promotion mentions or relates to something happening "now" or "today"

DO NOT call this if:
- The promotion is evergreen or timeless
- The promotion is about a specific product/feature (not trend-dependent)
- Timeline context wouldn't add value to the promotion`,
  inputSchema: z.object({
    reason: z
      .string()
      .describe("Why you think timeline analysis is needed for this promotion"),
  }),
  execute: async ({ reason }) => {
    console.log(`📱 Timeline analysis requested: ${reason}`);
    const trendingCastsSummary = await redis.get("trending:summary");
    const timelineSummary = await generateObject({
      model: anthropicModel,
      messages: [
        {
          role: "system",
          content: `You are analyzing the current Farcaster timeline to identify trending topics and themes.`,
        },
        {
          role: "user",
          content: `Trending casts: ${trendingCastsSummary}\n\nProvide a summary of what's trending and assess if this is relevant to the promotion context.`,
        },
      ],
      schema: TimelineSummarySchema,
    });

    return timelineSummary.object;
  },
});

export default timelineAnalysisTool;
