import { z } from "zod";
import axios from "axios";
import { anthropic } from "@ai-sdk/anthropic";
import { tool, generateObject } from "ai";
import { TopPostsSummarySchema } from "../schemas.js";
import { sanitizeCasts } from "../utils.js";

const anthropicModel = anthropic(
  process.env.ANTHROPIC_MODEL_NAME || "claude-haiku-4-5-20251001"
);

const topPostsAnalysisTool = tool({
  description:
    "Analyze a user's top posts to generate a summary of the main topics, tone, writing style, and provide a representative sample.",
  inputSchema: z.object({
    fid: z.number().describe("The farcaster FID of the user to analyze"),
  }),
  execute: async ({ fid }) => {
    const {
      data: { casts: popular_casts },
    } = await axios.get(
      `https://api.neynar.com/v2/farcaster/feed/user/popular/?fid=${fid}`,
      {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY as string,
        },
      }
    );
    const sanitizedCasts = sanitizeCasts(popular_casts);
    const topPostsSummary = await generateObject({
      model: anthropicModel,
      messages: [
        {
          role: "system",
          content: `You are an expert social media analyst. Based on the user's top posts below, generate a detailed summary of the main topics, tone, writing style, and provide a representative sample.`,
        },
        {
          role: "user",
          content: `User's Top Posts: ${JSON.stringify(sanitizedCasts)}`,
        },
      ],
      schema: TopPostsSummarySchema,
    });
    console.log(topPostsSummary.object);
    return topPostsSummary.object;
  },
});

export default topPostsAnalysisTool;
