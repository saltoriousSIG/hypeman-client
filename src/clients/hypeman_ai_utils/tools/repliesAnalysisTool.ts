import { z } from "zod";
import axios from "axios";
import { anthropic } from "@ai-sdk/anthropic";
import { tool, generateObject } from "ai";
import { RepliesSummarySchema } from "../schemas.js";
import { sanitizeCasts } from "../utils.js";

const anthropicModel = anthropic(
  process.env.ANTHROPIC_MODEL_NAME || "claude-haiku-4-5-20251001"
);

const repliesAnalysisTool = tool({
  description:
    "Analyze a user's replies to other posts to generate a summary of their engagement style, tone, disposition, attitude, and provide a representative sample.",
  inputSchema: z.object({
    fid: z.number().describe("The farcaster FID of the user to analyze"),
  }),
  execute: async ({ fid }) => {
    const { data: replies } = await axios.get(
      `https://api.neynar.com/v2/farcaster/feed/user/replies_and_recasts/?filter=replies&limit=50&fid=${fid}`,
      {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY as string,
        },
      }
    );
    const sanitizedCasts = sanitizeCasts(replies.casts);
    const repliesSummary = await generateObject({
      model: anthropicModel,
      messages: [
        {
          role: "system",
          content: `You are an expert social media analyst. Based on the user's replies to other posts below, generate a detailed summary of their engagement style, tone, disposition, attitude, and provide a representative sample.`,
        },
        {
          role: "user",
          content: `User's Replies: ${JSON.stringify(sanitizedCasts)}`,
        },
      ],
      schema: RepliesSummarySchema,
    });
    console.log(repliesSummary.object);
    return repliesSummary.object;
  },
});

export default repliesAnalysisTool;
