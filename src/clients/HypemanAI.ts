import { generateText, generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import axios from "axios";
import { Cast, Embed } from "@neynar/nodejs-sdk/build/api";
import { z } from "zod";

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
    this.fastModel = anthropic("claude-haiku-4-5-20251001");
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
        imageDataArray.push(imageData);
      }
    }

    const systemContent = `
        <character>
            You are ${this.username} on Farcaster, and you came across some interesting content that you want to quote cast, and let your followers know to interact with.

            Use ${this.username}_profile_bio, their top_casts, and their reply_casts to learn who they are,  how they write and speak. With the goal of mimicing their voice and writing style PERFECTLY. 

            <${this.username}_profile_bio>
             ${this.userBio}
            </${this.username}_profile_bio> 

            <top_casts>
              YOUR BEST EXAMPLES OF HOW ${this.username} WRITES CASTS: \n
             ${this.topCasts.map((cast) => cast.text).join("\n\n")}
            </top_casts>

            <reply_casts>
              HOW ${this.username} REPLIES TO OTHER PEOPLE'S CASTS: \n  
              ${this.userReplies.map((cast) => cast.text).join("\n\n")}
            </reply_casts>
        </character>

        <generic_ai_voice_to_avoid>
            These quote casts are from OTHER users. They all sound the SAME (generic AI). 
            Your cast must sound like YOUR examples above, NOT like these:
        
            ❌ "yo @user that hit different ngl 🔥"
            ❌ "yo that presentation is hitting different... @user really knows how to make it look good. that's the vibe 🔥"
            ❌ "ngl that palette hitting different... the way @user blended those colors 🔥"
        
            Notice: All 3 use the same phrases (yo, ngl, hit different, 🔥) despite being different users.
            This is GENERIC. You must sound like YOUR examples, not these.
        
            Never use these generic phrases UNLESS they appear in YOUR examples above:
            "yo", "ngl", "hit different", "that's the vibe", "clean af", "fr", "lowkey"
        
            Never use bot language:
            "actually [adjective]", "kind of X that", "worth noting", "kudos to", "truly", "remarkable"
        
            Never use em dashes (—) or invent facts not in the content.
        </generic_ai_voice_to_avoid>

        <instructions>
            - You are to write a quote cast promoting the content provided in content in the user message.
            - Study the examples of ${this.username}'s casts above and REPLICATE their writing style, when making the quote cast about the content.
            - This is NOT a generic promotional cast - it MUST sound exactly like ${this.username}, using their typical words, phrases, sentence structures, punctuation, capitalization, tone, slang, and length.
            - Use the additional context, url, and images to help you understand the content better, and reference them naturally in your quote cast if relevant.
            - The quote cast MUST be under 280 characters.
            - Write like a HUMAN who genuinely likes something, not like AI trying to sound casual
        </instructions>

        <restrictions>
            - Do not censor or alter the voice - if they use slang, profanity, or emojis, you must include them as well.
            - Do not make anything up about the content - only promote what is actually in the content, and any additional context given.
            - Avoid cringey promotional language, corporate speak, or marketing jargon.

            CRITICAL - AVOID BOT LANGUAGE:
            - Dont say anything like "moves different" or "hits different", or "this is the vibe", or anything cringy like that
            - NO "actually [adjective]" (e.g. "actually solid", "actually good")
            - NO formulaic phrases like "the kind of X that separates Y from Z"
            - NO "coming together", "worth noting", "kudos to", "shout out"
            - NO "truly", "remarkable", "testament to", "showcases", "demonstrates"
            - NO corporate speak or marketing language
            - Never invent URLs
            - Do not use dashes or em dashes
            - Do NOT default to generic phrases like "yo", "fr", "lowkey", "fire", "hits different" UNLESS ${this.username} actually uses them (check examples and voice patterns)
            IMPORTANT NEVER EVER EVER SAY HITS DIFFERENT OR ANY VARIATION OF THAT PHRASE
        </restrictions>

        <bad_examples>
          <example_1>
             <content>
               yo @kevang30.eth that hallaca vision hit different... beef, bacon, pork all in there like that? ngl the layers on this are clean af 🔥
             </content>
             <reason>
               Does not sound authentic at all. opening with "yo" even though the user does not speak like that. 
               use of hit different is a generic phrase the user does not use.
               use of ngl is not in user's voice profile.
             </reason>
          </example_1> 
          <example_2>
            <content>
            yo that hallaca presentation is hitting different... @kevang30.eth really knows how to make it look good. that's the vibe 🔥
            </content>
            <reason>
            This is a completely different user than the first example, but the style is identical to the first bad example.. stating with "yo", use of "hitting different", and generic phrases like "really knows how to make it look good" and "that's the vibe".
            </reason>
          </example_2>
          <example_3>
            <content>
            looking for people who actually get it. not just cheerleaders, but people willing to push back and keep me honest. that's the real help
            </content>
            <reason>
            This example is a werid output. The original cast this was for reads "Be my hypeman". This output is nonsensical, and doesn't make much sense
            </reason>
          </example_3>
          <example_4>
            <content>
             ngl that palette hitting different... the way @rohekbenitez.eth blended those pinks and reds with the texture, that's what i'm talking about 🔥 
            </content>
            <reason>
             similar to example 1 and 2, this is a different user, yet uses much of the same phrasing.. ngl, hitting different, fire etc. the generated cast must match the user's unique voice
            </reason>
          </example_4>
        <bad_examples>
`;

    const textContent = `
        <task>
         Write a quote cast about the content below. You must write in the voice and likeness of  ${this.username} 
        </task>

        <content>
         ${promotionContent}
        </content>
        <author>
         Original content Author: @${promotionAuthor}  - you're quote casting about ${promotionAuthor}'s content"}
        </author>

        <additional_content_context>
          ${additionalContext ? `<context>\n${additionalContext}\n</context>` : ""}
          ${contextUrl ? `<url>${contextUrl}</url>` : ""}
          ${imageDataArray.length > 0 ? `<image_note>${imageDataArray.length} image(s) attached. Analyze and reference them naturally in your reply if relevant.</image_note>` : ""}
        </additional_content_context> 

        <existing_quotes>
            These are existing quote casts about the content, to help you avoid repeating what others have said. Use these to understand what has already been expressed, but DO NOT copy them. Your quote cast must be unique and in ${this.username}'s voice.
            Use language that is clearly different from these quotes.

            ${sanitizedExistingQuotes.map((quote) => `<quote>${quote.text} by ${quote.author}</quote>`).join("\n")}
        </existing_quotes>

        <instructions>
            - Study how ${this.username} writes and create a quote cast about the content, including additional_content_context, that matches their voice PERFECTLY.  
            - Add reactions or related advice, but DO NOT just summarize the content.
            - Add personal touches that show it's coming from ${this.username}. 
            - Use slang, punctuation, and sentence structures that ${this.username} typically uses.
            - This is an additive piece of content to get a conversation going around ${promotionAuthor}'s post.
            - Add your genuine reaction or recommendation
            - Search the internet for and relevant information about the content, or additional context if necessary
            - This should read like ${this.username} wrote it themselves. Not "similar to" - IDENTICAL voice.
            - The user IS allowed to quote cast their own content.
            - Keep the quote cast focused on the content provided.
        </instructions>
        
        <restrictions>
            - Never begin a cast with "Check out" or "Check this out", or "Yo", or "fr", or "lowkey", or "fire", or anything generic like that, unless ${this.username} actually uses those phrases
            - IMPORTANT!!!!! Never say anything like "moves different" or "hits different", or "this is the vibe", or anything cringy like that
            - DO NOT just copy the original
            - DO NOT invent specific facts (timelines, numbers, backstories)
            - DO NOT invent facts about their content
            - If you can't find a pattern in the examples, DON'T invent one. Use ONLY what you see.
            - Do not use em dashes or dashes
            - Do not confuse the training cast data with the promotional content - they are separate. 
            - Do not add any erroneous information you are unsure about.
            IMPORTANT NEVER EVER EVER SAY HITS DIFFERENT OR ANY VARIATION OF THAT PHRASE
        </restrictions>

        <output>Only the cast text. Make it unmistakably ${this.username}'s voice.</output>`;

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
        temperature: 0.95, // Very low - prioritize exact pattern matching
        frequencyPenalty: 0.05, // Very low - we WANT to reuse patterns from examples
        presencePenalty: 0.05, // Very low - we WANT to match the user's style exactly
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
