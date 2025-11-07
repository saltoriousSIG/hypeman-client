import { z } from "zod";
import { anthropic } from "@ai-sdk/anthropic";
import { tool, generateObject } from "ai";
import { PromotionAnalysisSchema } from "../schemas.js";
import { RedisClient } from "../../RedisClient.js";
import {
  extractImageFromEmbeds,
  fetchImageAsBase64,
  compressImageIfNeeded,
} from "../utils.js";

const redis = new RedisClient(process.env.REDIS_URL as string);

const anthropicModel = anthropic(
  process.env.ANTHROPIC_MODEL_NAME || "claude-haiku-4-5-20251001"
);

const promotionAnalysisTool = tool({
  description:
    "Analyze the promotion content to generate a detailed analysis including topics, summary, creator profile, alignment with promoter, emotional tone, distinctive elements, additional context, and whether more information is needed.",
  inputSchema: z.object({
    promotion_id: z.number().describe("The ID of the promotion to analyze"),
  }),
  execute: async ({ promotion_id }) => {
    const castKey = `promotion:cast:${promotion_id}`;
    const castData = await redis.get(castKey);

    const promotionContent = castData.text;
    const promotionAuthor = castData.author.profile;
    const promotionEmbeds = castData.embeds;

    const contextParts: string[] = [];
    for (const embed of promotionEmbeds) {
      if (embed.url) contextParts.push(`url: ${embed.url}`);
      if (embed.cast?.text) {
        const castAuthor = embed.cast.author?.username || "unknown";
        contextParts.push(
          `embedded cast by @${castAuthor}: "${embed.cast.text}"`
        );
      }
      if (embed.metadata?.frame?.title) {
        contextParts.push(`frame: ${embed.metadata.frame.title}`);
      }
    }

    const additionalContext =
      contextParts.length > 0 ? contextParts.join("\n") : "";

    const imageUrls = extractImageFromEmbeds(promotionEmbeds);
    const imageDataArray: string[] = [];
    for (const imageUrl of imageUrls) {
      const imageData = await fetchImageAsBase64(imageUrl);
      if (imageData) {
        const compressedImage = await compressImageIfNeeded(imageData);
        imageDataArray.push(compressedImage);
      }
    }

    const messages: any = [
      {
        role: "system",
        content: `You are an expert social media analyst. Based on the promotion content and author profile below, generate a detailed analysis including topics, summary, creator profile, alignment with promoter, emotional tone, distinctive elements, additional context, and whether more information is needed.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Promotion Content: ${promotionContent}\nPromotion Author Profile: ${JSON.stringify(
              promotionAuthor
            )}\nAdditional Context: ${additionalContext}`,
          },
        ],
      },
    ];

    if (imageDataArray.length > 0) {
      for (const imageData of imageDataArray) {
        messages[1].content.push({
          type: "image",
          image: imageData,
        });
      }
    }

    const promotionAnalysis = await generateObject({
      model: anthropicModel,
      messages,
      schema: PromotionAnalysisSchema,
    });
    console.log(promotionAnalysis.object);
    await redis.set(
      `promotion_analysis:${promotion_id}`,
      JSON.stringify(promotionAnalysis.object),
      60 * 60 * 24 * 7
    ); // Cache for 7 days
    return promotionAnalysis.object;
  },
});

export default promotionAnalysisTool;
