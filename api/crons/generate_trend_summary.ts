import { VercelRequest, VercelResponse } from "@vercel/node";
import { RedisClient } from "../../src/clients/RedisClient.js";
import axios from "axios";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const redis = new RedisClient(process.env.REDIS_URL as string);

const fetchAllTrending = async (casts: Array<any>, cursor: string) => {
  try {
    const { data } = await axios.get(
      `https://api.neynar.com/v2/farcaster/feed/trending/?limit=10&time_window=24h&provider=neynar${cursor ? `&cursor=${cursor}` : ""}`,
      {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY as string,
        },
      }
    );
    const sanitizedCasts = data.casts.map((c: any) => {
      return {
        text: c.text,
        embeds: c.embeds,
        author: {
          displayName: c.author.display_name,
          username: c.author.username,
          fid: c.author.fid,
        },
      };
    });
    if (data.next.cursor) {
      return fetchAllTrending(casts.concat(sanitizedCasts), data.next.cursor);
    }
    return casts.concat(sanitizedCasts);
  } catch (e: any) {
    throw new Error(e.message);
  }
};

const generateCompactSummary = async (casts: Array<any>) => {
  // Use ALL casts for analysis
  const castsContext = casts
    .map((cast, idx) => `${idx + 1}. @${cast.author.username}: ${cast.text}`)
    .join("\n");

  const { text } = await generateText({
    model: openai("gpt-5-2025-08-07"),
    prompt: `Analyze ALL of these trending Farcaster posts and create a comprehensive summary of what's trending right now.

${castsContext}

Write a 200-word summary that covers:
- Main topics and themes
- Notable trends or conversations
- Key voices and discussions
- Overall sentiment and energy

Keep it concise, informative, and engaging. Aim for exactly 250 words.`,
  });

  return text;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const trendingCasts = await fetchAllTrending([], "");
    console.log(`Fetched ${trendingCasts.length} trending casts`);

    // Generate 250-word summary from ALL casts
    const summary = await generateCompactSummary(trendingCasts);

    // Store in Redis for later use
    await redis.set("trending:summary", summary); // expires in 1 hour

    console.log("Summary generated:", summary);

    return res.status(200).json({
      message: "Trend summary generated successfully",
      summary: summary,
      castsAnalyzed: trendingCasts.length,
    });
  } catch (error: any) {
    console.error("Error:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
