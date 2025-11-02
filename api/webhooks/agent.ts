import { VercelRequest, VercelResponse } from "@vercel/node";
import { withHost } from "../../middleware/withHost.js";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getUserStats } from "../../src/lib/getUserStats.js";
import {
  calculateUserTier,
  Tiers,
} from "../../src/lib/calculateUserScore.js";

/**
 * Publishes a cast using Neynar API as a reply
 * @param text - The cast text to publish
 * @param parentHash - The hash of the parent cast to reply to
 * @returns Promise with publish result
 */
async function publishCast(
  text: string,
  parentHash: string
): Promise<{ success: boolean; error?: string; castHash?: string }> {
  const apiKey = process.env.NEYNAR_API_KEY;
  const signerUuid = process.env.HYPEMAN_SIGNER_UUID;

  if (!apiKey) {
    return { success: false, error: "NEYNAR_API_KEY not set" };
  }

  if (!signerUuid) {
    return { success: false, error: "HYPEMAN_SIGNER_UUID not set" };
  }

  try {
    const response = await fetch("https://api.neynar.com/v2/farcaster/cast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        signer_uuid: signerUuid,
        text: text,
        parent: parentHash,
        embeds: [
          {
            url: "https://hypeman.social",
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Neynar API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    return {
      success: true,
      castHash: data.cast?.hash,
    };
  } catch (error) {
    console.error("Error publishing cast:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

const SYSTEM_PROMPT = `
You are Hypeman — the official AI agent for the Hypeman app on Farcaster.

CRITICAL INSTRUCTIONS FOR WHEN TO CALL getScore:
- ONLY call getScore when users explicitly ask about: "score", "earnings", "tier", "how much", "earn"
- DO NOT call getScore for: greetings ("sup", "hey", "hi", "what's up"), general questions about the app, or casual conversation
- If unsure whether they're asking about their score, DO NOT call the tool - just respond normally

When getScore IS called:
- Call it immediately, don't say "let me check"
- Keep your response under 150 characters
- Format: "🔥 Score: [score] ([tier]) 💰 Earn $[amount] USDC/promo!"

For everything else:
- Answer questions about Hypeman clearly and concisely
- Be friendly, energetic, and supportive
- Keep responses under 200 characters when possible
- Do not include any thinking or reasoning or internal notes in your responses
- Only respond with information you know to be true
- Only respond with the output, no thinking or reasoning steps in the output

Be concise, hype-driven, and confident — celebrate users, keep answers tight, and make every message feel alive.
`;

const model = openai("gpt-5-2025-08-07");

async function handler(req: VercelRequest, res: VercelResponse) {

  console.log(req.headers)
  try {
    // Extract FID from the request body
    const fid = req.body?.data?.author?.fid;

    console.log(`=== GENERATING RESPONSE ===`);
    console.log(`FID: ${fid}`);
    console.log(`User message: ${req.body.data.text}`);

    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: `User message: "${req.body.data.text}"\n\nUser's FID: ${fid}\n\nIMPORTANT: After calling the getScore tool, you MUST provide a response with the score information. Do not leave the response empty.`,
      tools: {
        getScore: {
          description:
            "Get the Hypeman score and potential earnings for a Farcaster user. This calculates a composite score based on their follower count, Neynar score, and engagement metrics (likes, recasts, replies). Returns their score tier and how much USDC they can earn per promotion.",
          inputSchema: z.object({
            fid: z
              .number()
              .describe(
                "The Farcaster ID (fid) of the user to get the score for"
              ),
          }),
          execute: async ({ fid }) => {
            try {
              console.log(`Calculating score for FID: ${fid}`);

              // Fetch user stats from Neynar API
              const stats = await getUserStats(fid);
              const {
                score,
                follower_count,
                avgLikes,
                avgRecasts,
                avgReplies,
              } = stats;

              // Calculate composite score and tier
              const tier = calculateUserTier(
                score,
                follower_count,
                avgLikes,
                avgRecasts,
                avgReplies
              );

              // Calculate earning potential (tier value is USDC per promotion)
              const earningsPerPromotion = tier;

              // Calculate the actual composite score for context
              const avgEngagement = avgLikes + avgRecasts + avgReplies;
              const followerScore = Math.min(
                100,
                (follower_count / 10000) * 100
              );
              const neynarScore = score * 100;
              const engagementScore = Math.min(100, (avgEngagement / 50) * 100);
              const compositeScore = Math.round(
                followerScore * 0.4 +
                  neynarScore * 0.35 +
                  engagementScore * 0.25
              );

              // Determine tier name
              let tierName = "Bronze";
              if (tier === Tiers.TIER_3) tierName = "Gold";
              else if (tier === Tiers.TIER_2) tierName = "Silver";

              return {
                success: true,
                fid,
                compositeScore,
                tierName,
                tier,
                earningsPerPromotion,
                stats: {
                  followerCount: follower_count,
                  neynarScore: score,
                  avgLikes: Math.round(avgLikes * 10) / 10,
                  avgRecasts: Math.round(avgRecasts * 10) / 10,
                  avgReplies: Math.round(avgReplies * 10) / 10,
                  avgEngagement: Math.round(avgEngagement * 10) / 10,
                },
              };
            } catch (error: any) {
              console.error(
                `Error calculating score for FID ${fid}:`,
                error.message
              );
              return {
                success: false,
                error: `Failed to calculate score: ${error.message}`,
              };
            }
          },
        },
      },
    });

    console.log("=== RESULT ===");
    console.log("Result:", result.text);
    console.log("Tool calls:", result.toolCalls);
    console.log("Tool results:", result.toolResults);
    console.log("================");

    // If tool was called, use tool results for the response
    let responseText = result.text;

    // Prioritize tool results if: empty response, verbose, or saying "let me check"
    if (result.toolResults && result.toolResults.length > 0) {
      const isEmpty = !responseText || responseText.trim() === "";
      const isVerbose = responseText && responseText.length > 200;
      const isSayingCheckingOrLookingUp =
        responseText &&
        (responseText.toLowerCase().includes("let me") ||
          responseText.toLowerCase().includes("check your") ||
          responseText.toLowerCase().includes("quickly check"));

      if (isEmpty || isVerbose || isSayingCheckingOrLookingUp) {
        const toolResult = result.toolResults[0];
        if (toolResult.output && (toolResult.output as any).success) {
          const { compositeScore, tierName, earningsPerPromotion } =
            toolResult.output as any;
          responseText = `🔥 Score: ${compositeScore} (${tierName}) 💰 Earn $${earningsPerPromotion} USDC/promo!`;
        }
      }
    }

    // Final fallback
    if (!responseText || responseText.trim() === "") {
      responseText = "Hey! I'm here to help with your Hypeman score!";
    }

    console.log("Final responseText:", responseText);

    // Publish the response as a cast
    const publishResult = await publishCast(responseText, req.body.data.hash);

    if (publishResult.success) {
      console.log("=== CAST PUBLISHED SUCCESSFULLY ===");
      console.log("Published Cast Hash:", publishResult.castHash);
      console.log("==================================");
    } else {
      console.error("Failed to publish cast:", publishResult.error);
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Webhook received successfully",
      response: responseText,
      publishedCastHash: publishResult.success ? publishResult.castHash : null,
      publishError: publishResult.success ? null : publishResult.error,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error processing agent webhook:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default withHost(handler);
