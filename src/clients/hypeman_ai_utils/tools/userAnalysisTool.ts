import { z } from "zod";
import axios from "axios";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { tool, generateObject } from "ai";
import { UserProfileSchema } from "../schemas.js";
import { RedisClient } from "../../RedisClient.js";

const redis = new RedisClient(process.env.REDIS_URL as string);

const anthropicModel = anthropic(
  process.env.ANTHROPIC_MODEL_NAME || "claude-haiku-4-5-20251001"
);

const openAIModel = openai.responses(
  process.env.OPENAI_MODEL_NAME || "gpt-4o-mini"
);

const userAnalysisTool = tool({
  description:
    "Analyze a user's profile and content to generate a profile summary about who the user is and what their interests are.",
  inputSchema: z.object({
    fid: z.number().describe("The farcaster FID of the user to analyze"),
  }),
  execute: async ({ fid }) => {
    const {
      data: { users },
    } = await axios.get(
      `https://api.neynar.com/v2/farcaster/user/bulk/?fids=${fid}`,
      {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY as string,
        },
      }
    );
    const userProfile = users[0];
    const userAnalysis = await generateObject({
      model: openAIModel,
      messages: [
        {
          role: "system",
          content: `You are an expert social media analyst. Based on the user's profile below, generate a detailed profile summary about who the user is and what their interests are.`,
        },
        {
          role: "user",
          content: `User Profile Data: ${JSON.stringify(userProfile)} FID: ${fid} username: ${users[0].username}`,
        },
      ],
      schema: UserProfileSchema,
    });
    await redis.set(`user_analysis:${fid}`, JSON.stringify(userAnalysis.object), 60 * 60 * 24 * 7); // Cache for 7 days
    return userAnalysis.object;
  },
});

export default userAnalysisTool;
