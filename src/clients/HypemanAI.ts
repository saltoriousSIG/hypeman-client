import { generateText, generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import axios from "axios";
import { Cast, Embed } from "@neynar/nodejs-sdk/build/api";
import { z } from "zod";
import { RedisClient } from "./RedisClient.js";
import sharp from "sharp";

const redis = new RedisClient(process.env.REDIS_URL as string);

interface GenerationOptions {
  temperature?: number;
}

interface GenerationResult {
  success: boolean;
  text?: string;
  model?: string;
  generationType?: string;
  error?: string;
  originalCast?: string;
  feedback?: string;
  variationIndex?: number;
}
interface EmbedContext {
  // For image embeds
  metadata?: {
    content_type?: string;
    content_length?: number | null;
    image?: {
      width_px: number;
      height_px: number;
    };
    // For miniapp/frame embeds
    frame?: any;
    html?: any;
    _status?: string;
    [key: string]: any;
  };
  url?: string;
  // For cast embeds
  cast?: {
    text: string;
    author: {
      username: string;
      display_name?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  cast_id?: {
    fid: number;
    hash: string;
  };
  [key: string]: any; // Allow for other properties
}

const ContentComparisonSchema = z.object({
  sentimentmatch: z
    .boolean()
    .describe("Whether the two texts convey the same core message and meaning"),
});

export class HypemanAI {
  private static instance: HypemanAI;
  private initPromise: Promise<void> | null = null;
  private fastModel;
  private userFid: number = 0;
  private username: string;
  private topCasts: {
    text: string;
    embeds: Embed[];
  }[] = [];
  private userBio: string = "";
  private userReplies: {
    text: string;
    embeds: Embed[];
  }[] = [];
  // private user_casts: Cast[];
  // private voiceProfile: VoiceProfile | null = null;
  // private topExamples: Cast[] = [];

  constructor(fid: number, username: string) {
    // Haiku-optimized model
    this.fastModel = anthropic("claude-sonnet-4-5-20250929");
    this.userFid = fid;
    this.username = username;
    this.initPromise = this.init(fid);
  }

  public static async getInstance(
    fid: number,
    username: string
  ): Promise<HypemanAI> {
    if (!HypemanAI.instance) {
      HypemanAI.instance = new HypemanAI(fid, username);
    }
    await HypemanAI.instance.initPromise;
    return HypemanAI.instance;
  }

  private async init(fid: number): Promise<void> {
    if (fid === 0) {
      return;
    }
    try {
      await this.fetchTrainingData(fid);
    } catch (e: any) {
      throw new Error("Failed to initialize HypemanAI: " + e.message);
    }
  }

  sanitizeCasts(casts: Cast[]): {
    text: string;
    embeds: Embed[];
    author: string;
  }[] {
    return casts.map((cast) => ({
      text: cast.text.trim(),
      embeds: cast.embeds,
      author: cast.author.username,
    }));
  }

  async fetchTrainingData(fid: number): Promise<void> {
    try {
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
      const { data: replies } = await axios.get(
        `https://api.neynar.com/v2/farcaster/feed/user/replies_and_recasts/?filter=replies&limit=50&fid=${fid}`,
        {
          headers: {
            "x-api-key": process.env.NEYNAR_API_KEY as string,
          },
        }
      );
      const author_bio = popular_casts[0].author.profile.bio.text;
      const sanitizedPopularCasts = this.sanitizeCasts(popular_casts);
      const sanitizedReplies = this.sanitizeCasts(replies.casts);
      this.topCasts = sanitizedPopularCasts;
      this.userBio = author_bio;
      this.userReplies = sanitizedReplies;
    } catch (e: any) {
      console.log(e, e.message);
      throw new Error("Failed to fetch user casts");
    }
  }

  /**
   * Helper function to fetch image and convert to base64
   */
  private async fetchImageAsBase64(url: string): Promise<string | null> {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 10000,
      });

      const base64 = Buffer.from(response.data, "binary").toString("base64");

      return base64;
    } catch (error) {
      console.error("Failed to fetch image:", error);
      return null;
    }
  }

  /**
   * Extract all image URLs from embedContext
   */
  private extractImageFromEmbeds(embedContext: EmbedContext[]): string[] {
    if (!embedContext || embedContext.length === 0) return [];

    // Look for all embeds with image content_type in metadata
    const imageUrls: string[] = [];

    for (const embed of embedContext) {
      if (embed.metadata?.content_type?.startsWith("image/") && embed.url) {
        imageUrls.push(embed.url);
      }
    }

    return imageUrls;
  }
  private async compressImageIfNeeded(
    base64Image: string,
    maxSizeBytes: number = 5242880 // Exact 5MB limit
  ): Promise<string> {
    try {
      const buffer = Buffer.from(base64Image, "base64");

      // Check if already under limit
      if (buffer.length <= maxSizeBytes) {
        return base64Image;
      }

      console.log(
        `Compressing image from ${(buffer.length / 1024 / 1024).toFixed(2)}MB`
      );

      // Resize progressively until under limit
      let quality = 85;
      let compressed = buffer;

      while (compressed.length > maxSizeBytes && quality > 20) {
        compressed = await sharp(buffer)
          .resize(2000, 2000, {
            // max 2000px on longest edge
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality })
          .toBuffer();

        quality -= 10;
      }

      console.log(
        `Compressed to ${(compressed.length / 1024 / 1024).toFixed(2)}MB`
      );
      return compressed.toString("base64");
    } catch (error) {
      console.error("Compression failed:", error);
      return base64Image; // Return original if compression fails
    }
  }

  async buildVoiceLearningPrompt(
    promotionUrl: string,
    promotionContent: string,
    promotionAuthor: string,
    embedContext: EmbedContext[]
  ) {
    const {
      data: { casts: existing_quotes },
    } = await axios.get(
      `https://api.neynar.com/v2/farcaster/cast/quotes/?limit=25&identifier=${encodeURIComponent(promotionUrl)}&type=url`,
      {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY as string,
        },
      }
    );

    const sanitizedExistingQuotes = this.sanitizeCasts(existing_quotes);

    console.log(sanitizedExistingQuotes, "existing quotes");

    // Build additional context from all embeds
    const contextParts: string[] = [];

    for (const embed of embedContext) {
      // Add URL context
      if (embed.url) {
        contextParts.push(`url: ${embed.url}`);
      }

      // Add embedded cast context
      if (embed.cast?.text) {
        const castAuthor = embed.cast.author?.username || "unknown";
        contextParts.push(
          `embedded cast by @${castAuthor}: "${embed.cast.text}"`
        );
      }

      // Add frame/miniapp context
      if (embed.metadata?.frame?.title) {
        contextParts.push(`frame: ${embed.metadata.frame.title}`);
      }
    }

    const contextUrl = embedContext.find((e) => e.url)?.url;
    const additionalContext =
      contextParts.length > 0 ? contextParts.join("\n") : "";

    // Check for images (separate from other context)
    const imageUrls = this.extractImageFromEmbeds(embedContext);
    const imageDataArray: string[] = [];

    // Fetch all images
    for (const imageUrl of imageUrls) {
      const imageData = await this.fetchImageAsBase64(imageUrl);
      if (imageData) {
        const compressedImage = await this.compressImageIfNeeded(imageData);
        imageDataArray.push(compressedImage);
      }
    }

    const trending_sentiment_summary = await redis.get("trending:summary");
    console.log(trending_sentiment_summary, "trending sentiment summary");
    console.log(additionalContext, "additional context");
    console.log(this.userBio);
    console.log(this.username);
    console.log(this.topCasts);
    console.log(this.userReplies);

    const systemContent = `You are ${this.username} on Farcaster. You're writing a quote cast to share interesting content with your followers.

<your_voice>
Study these examples to understand exactly how you write:

<top_casts>
${this.topCasts.map((cast) => cast.text).join("\n\n")}
</top_casts>

<reply_casts>
${this.userReplies.map((cast) => cast.text).join("\n\n")}
</reply_casts>

<profile_bio>
${this.userBio}
</profile_bio>
</your_voice>

${
  sanitizedExistingQuotes.length > 0
    ? `
<already_written>
⚠️ IMPORTANT: These quote casts already exist for this content. Your cast must be CLEARLY DIFFERENT in wording, angle, and structure:

${sanitizedExistingQuotes.map((quote) => `"${quote.text}" - @${quote.author}`).join("\n")}

Do NOT use similar phrases, openings, or patterns. Write something fresh.
</already_written>
`
    : ""
}

<task>
You are @${this.username}. You're quote casting content written by @${promotionAuthor}.

${
  this.username === promotionAuthor
    ? `
NOTE: You are quote casting YOUR OWN content. You can reference it as your own.
`
    : `
CRITICAL: @${promotionAuthor} wrote this content, NOT YOU. You are reacting to THEIR post.
- Do NOT speak as if you did what they did
- Do NOT retell their story in first person
- React, comment on, or add to what THEY shared
- You are the outside observer/supporter, not the original author
`
}

Your quote cast must:
- Be under 280 characters
- Match your voice EXACTLY - same tone, punctuation, capitalization, typical length
- Sound like you genuinely found something worth sharing
- Add your authentic reaction or insight, not just a summary
</task>

<rules>
✓ Write like a real person sharing something they like
✓ Match the sentence structure and length you typically use
✓ Use only the slang, emojis, and expressions YOU actually use in your examples
✓ Stay focused on the actual content provided
✓ Keep it under 280 characters

✗ Don't use generic AI phrases like "yo", "ngl", "hits different", "that's the vibe" unless they appear in YOUR examples above
✗ Don't use corporate/marketing language or formulaic phrases
✗ Don't invent facts, URLs, or details not in the content
✗ Don't use em dashes (—)
✗ Don't just copy or paraphrase the original content in first person${this.username !== promotionAuthor ? `\n✗ Don't speak as if YOU did what @${promotionAuthor} did - you're commenting on THEIR experience` : ""}
</rules>

${
  trending_sentiment_summary
    ? `
<current_vibe>
Recent Farcaster trends:
${trending_sentiment_summary}

Only reference this if it naturally fits your voice and the content.
</current_vibe>
`
    : ""
}

Output only the quote cast text - nothing else.`;

    const textContent = `
<original_content>
This content was written by @${promotionAuthor}${this.username !== promotionAuthor ? " (NOT you)" : " (this is YOUR content)"}:

${promotionContent}
</original_content>

${
  additionalContext || contextUrl || imageDataArray.length > 0
    ? `
<additional_context>
${additionalContext ? `${additionalContext}\n` : ""}${contextUrl ? `URL: ${contextUrl}\n` : ""}${imageDataArray.length > 0 ? `${imageDataArray.length} image(s) attached - analyze and reference naturally if relevant.` : ""}
</additional_context>
`
    : ""
}

${
  this.username === promotionAuthor
    ? `
Write a quote cast promoting your own content above. You can reference it as your own work.
`
    : `
Write a quote cast reacting to @${promotionAuthor}'s content above. Remember: THEY wrote this, not you. You're commenting on what THEY shared.
`
}

Make it sound like ${this.username} actually wrote it - not "similar to" their voice, but IDENTICAL.`;

    // Build the user message content with or without images
    const userContent: any[] = [];

    // Add all images first if available (Claude performs better with images before text)
    for (const imageData of imageDataArray) {
      userContent.push({
        type: "image",
        image: imageData,
      });
    }

    // Add text content
    userContent.push({
      type: "text",
      text: textContent,
    });

    return [
      {
        role: "system" as const,
        content: systemContent,
      },
      {
        role: "user" as const,
        content: userContent,
      },
    ];
  }

  // ... rest of the methods remain the same until generateVariations

  private extractCastFromResponse(text: string): string {
    text = text.trim();
    const oTagMatch = text.match(/<o>([\s\S]*?)<\/o>/);
    if (oTagMatch) {
      return oTagMatch[1].trim();
    }
    const lines = text.split("\n");
    if (lines.length > 0) {
      return lines[0].trim();
    }
    return text;
  }

  private postProcessCast(castText: string): string {
    castText = castText.replace(/<\/?cast>/g, "").trim();
    castText = castText.replace(/^["']|["']$/g, "");
    if (castText.length > 280) {
      castText = castText.substring(0, 277) + "...";
    }
    return castText;
  }

  async performVoiceWarmup(): Promise<void> {
    // if (this.topExamples.length === 0) return;
    try {
      const warmupExample = this.topCasts[0];
      await generateText({
        model: this.fastModel,
        messages: [
          {
            role: "system",
            content: `You are ${this.username}. Match this style exactly: ${warmupExample.text}`,
          },
          {
            role: "user",
            content: "Write a short test message in this style.",
          },
        ],
        temperature: 0.9,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      // Warmup failure is non-critical
    }
  }

  async generateInitialCast(
    promotionUrl: string,
    promotionContent: string,
    promotionAuthor: string,
    embedContext: EmbedContext[],
    options?: GenerationOptions
  ): Promise<GenerationResult> {
    console.log(promotionUrl, "promotion url ");
    try {
      // Quick warmup
      await this.performVoiceWarmup();

      const messages = await this.buildVoiceLearningPrompt(
        promotionUrl,
        promotionContent,
        promotionAuthor,
        embedContext
      );

      const result = await generateText({
        model: this.fastModel,
        messages,
        temperature: 0.95,
        frequencyPenalty: 0.65, // moderate - avoid repetition
        presencePenalty: 0.65, // moderate - encourage new topics
        maxRetries: 1,
        abortSignal: AbortSignal.timeout(15000),
      });

      console.log(result);
      let castText = this.extractCastFromResponse(result.text);
      castText = this.postProcessCast(castText);
      console.log(castText);

      return {
        success: true,
        text: castText,
        model: "claude-haiku-4-5-20251001",
        generationType: "initial",
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model: "claude-haiku-4-5-20251001",
      };
    }
  }

  /**
   * HAIKU-OPTIMIZED: Refinement with feedback
   */
  async refineCast(
    promotionUrl: string,
    promotionContent: string,
    promotionAuthor: string,
    embedContext: EmbedContext[],
    userFeedback: string,
    previousCast: string,
    options?: GenerationOptions
  ): Promise<GenerationResult> {
    try {
      const baseMessages = await this.buildVoiceLearningPrompt(
        promotionUrl,
        promotionContent,
        promotionAuthor,
        embedContext
      );
      //const styleHints = this.generateStyleHints();

      const messages = [
        ...baseMessages,
        {
          role: "assistant" as const,
          content: previousCast,
        },
        {
          role: "user" as const,
          content: `<${this.username}_feedback>${userFeedback}</${this.username}_feedback>
          <task>Rewrite completely (under 280 chars). Match voice. Address feedback.</task>
          <output>Only the revised cast</output>`,
        },
      ];

      const result = await generateText({
        model: this.fastModel,
        messages,
        temperature: options?.temperature || 0.85, // Low for exact matching
        frequencyPenalty: 0.05, // Very low - allow pattern reuse
        presencePenalty: 0.05, // Very low - allow style matching
        maxRetries: 2,
        abortSignal: AbortSignal.timeout(20000),
      });

      let castText = this.extractCastFromResponse(result.text);
      castText = this.postProcessCast(castText);

      return {
        success: true,
        text: castText,
        model: "claude-haiku-4-5-20251001",
        generationType: "refinement",
        originalCast: previousCast,
        feedback: userFeedback,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model: "claude-haiku-4-5-20251001",
      };
    }
  }

  async compareContent(expected: string, actual: string) {
    try {
      const normalizedExpected = expected.trim().toLowerCase();
      const normalizedActual = actual.trim().toLowerCase();
      if (normalizedExpected === normalizedActual) {
        return { sentimentMatch: true };
      }
      const { object } = await generateObject({
        model: this.fastModel,
        schema: ContentComparisonSchema,
        prompt: `You are a content similarity analyzer. Compare these two texts and determine if they convey the same core message and meaning.
        Focus on whether they're saying the same thing, not exact wording.
        Be lenient with minor differences in style, emojis, punctuation.
        
        Text 1: ${expected}
        Text 2: ${actual}
        
        Determine if these texts convey the same message.`,
        temperature: 0.3,
        maxRetries: 2,
        abortSignal: AbortSignal.timeout(10000),
      });
      return {
        sentimentMatch: object.sentimentmatch,
      };
    } catch {
      const expectedWords = expected.toLowerCase().split(/\s+/);
      const actualWords = actual.toLowerCase().split(/\s+/);
      const overlap = expectedWords.filter((word) =>
        actualWords.some(
          (actualWord) => actualWord.includes(word) || word.includes(actualWord)
        )
      );

      const overlapRatio =
        overlap.length / Math.max(expectedWords.length, actualWords.length);

      return { sentimentMatch: overlapRatio > 0.6 };
    }
  }

  /**
   * Generate a promotional cast for a given cast text and budget
   * Uses the user's actual voice, not a generic character
   * @param castText - The original cast text to promote
   * @param budget - The budget amount for the promotion
   * @param creatorUsername - The username of the creator to mention
   * @returns Promise with promotional cast text
   */
  async generatePromotionalCast(
    castText: string,
    budget: string,
    creatorUsername: string
  ): Promise<GenerationResult> {
    try {
      // Convert budget to readable format (assuming it's in USDC - 6 decimals)
      const budgetInUsdc = (parseFloat(budget) / 1e6).toFixed(2);
      const budgetDisplay = `$${budgetInUsdc} USDC`;

      const messages = [
        {
          role: "system" as const,
          content: `You are Hypeman, a promotional cast writer.

        <character>
You are Hypeman, a charismatic hero who amplifies and promotes content for creators. You embody authentic enthusiasm and cultural credibility.
APPEARANCE: You wear a signature red jacket with electric yellow lightning bolts, a black flat-top hat with gold stripes, futuristic rainbow-spectrum goggles, and gold "H" medallions on your chest and belt. Your style blends street culture with digital-age swagger.
PERSONALITY: You are genuinely enthusiastic, energetic, and passionate about the content you promote. You're not just loud—you're strategic and authentic. You believe in what you hype up, and that belief is contagious. You bring momentum and cultural weight to everything you touch.
COMMUNICATION STYLE: You speak with confidence and energy. You're lively and engaging, using cultural references and current slang naturally. You build people up and make them feel seen. You're encouraging without being fake, professional without being stiff.
EXPERTISE: You've worked with cultural icons like Drake, Kendrick Lamar, Frank Ocean, Chance the Rapper, and Snoop Dogg. You understand what makes content resonate and how to amplify messages authentically. You champion both established legends and emerging talent.
MISSION: Help creators get their content noticed by bringing authentic hype, cultural credibility, and strategic amplification. You translate creative vision into cultural impact.
</character>


<restrictions>
CONTENT REQUIREMENTS:
- You're promoting @${creatorUsername}'s content (they created the original post)
- MUST mention @${creatorUsername} in the cast
- MUST include the budget amount prominently
- Under 280 characters

BUDGET CLARIFICATION:
- The budget (${budgetDisplay}) is a reward pool for people who quote cast this promotion
- Do NOT imply the creator is charging this amount
- Do NOT imply this is the cost to view the content
- The budget is separate from the creator's actual post

STYLE:
- Make it sound like a genuine recommendation to check out the promotion
- Be enthusiastic but authentic
- Do NOT copy phrases directly from the original cast
- Do NOT invent any facts about the content

NEVER DO:
- Mention that AI is involved in creating this promotional cast
- Use dashes or em dashes in your writing
</restrictions>`,
        },
        {
          role: "user" as const,
          content: `<task>Write a promotional cast recommending this content</task>

<task>
Write a promotional cast for @${creatorUsername}'s content below. You're recommending their content to others.
</task>

<original_cast>
${castText}
</original_cast>

<creator>
Original Creator: @${creatorUsername}
</creator>

<budget>
Budget: ${budgetDisplay}
This is how much is available for quote casters to claim. Do NOT confuse this with the creator's content—the creator is not charging this amount, and this is not the cost to view their post. This is a reward pool for people who share the promotion.
</budget>

<requirements>
MUST INCLUDE:
- Mention @${creatorUsername} (the creator of this content)
- Include the budget amount prominently

STYLE:
- Under 280 characters
- Enthusiastic but authentic
- Natural recommendation tone
- Stay true to Hypeman's personality
- Do NOT use dashes or em dashes
- Do NOT copy phrases directly from the original cast
- Do NOT mention AI involvement
- Do NOT invent facts about the content
- Never return models internal thinking or notes, only the cast text
- DO NOT USE GENERIC PHRASES LIKE "CHECK THIS OUT" OR "FR" OR "LOWKEY" UNLESS THEY FIT NATURALLY IN THE CAST or HITS DIFFERENT or anything like that. Talk like flava flav
</requirements>

<output_format>
Return only the promotional cast text, nothing else.
Never include any explanations, notes, or formatting—just the cast text.
</output_format>`,
        },
      ];

      const result = await generateText({
        model: this.fastModel,
        messages,
        temperature: 0.9, // Slightly higher for promotional variety
        frequencyPenalty: 0.3, // Moderate - still promotional character
        presencePenalty: 0.2,
        maxRetries: 2,
        abortSignal: AbortSignal.timeout(15000),
      });

      let promotionalText = this.extractCastFromResponse(result.text);
      promotionalText = this.postProcessCast(promotionalText);

      return {
        success: true,
        text: promotionalText,
        model: "claude-haiku-4-5-20251001",
        generationType: "promotional",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model: "claude-haiku-4-5-20251001",
      };
    }
  }
}
