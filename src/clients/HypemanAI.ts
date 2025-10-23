import { generateText, generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import axios from "axios";
import { Cast } from "@neynar/nodejs-sdk/build/api";
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

interface ValidationResult {
  valid: boolean;
  issues: string[];
}

interface VoiceProfile {
  avgLength: number;
  usesEmoji: boolean;
  usesProfanity: boolean;
  energyLevel: "high" | "medium" | "low";
  commonPhrases: string[];
  punctuationStyle: string;
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
  private user_casts: Cast[];
  private username: string;
  private voiceProfile: VoiceProfile | null = null;
  private topExamples: Cast[] = [];

  constructor(fid: number, username: string) {
    // Haiku-optimized model
    this.fastModel = anthropic("claude-haiku-4-5-20251001");
    this.user_casts = [];
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
      await this.fetchUserCasts(fid);
      this.voiceProfile = this.analyzeVoice(this.user_casts);
      this.topExamples = this.selectBestExamples(this.user_casts);
    } catch (e: any) {
      throw new Error("Failed to initialize HypemanAI: " + e.message);
    }
  }

  async fetchUserCasts(fid: number): Promise<void> {
    try {
      const { data } = await axios.get(
        `https://api.neynar.com/v2/farcaster/feed/user/casts/?limit=100&include_replies=true&fid=${fid}`,
        {
          headers: {
            "x-api-key": process.env.NEYNAR_API_KEY as string,
          },
        }
      );
      this.user_casts = this.sanitizeCasts(data.casts);
    } catch (e: any) {
      console.log(e, e.message);
      throw new Error("Failed to fetch user casts");
    }
  }

  sanitizeCasts(casts: Cast[]): Cast[] {
    return casts
      .filter((cast) => cast.text && cast.text.trim().length > 15)
      .filter((cast) => !cast.text.startsWith("@"))
      .slice(0, 100)
      .map((cast) => ({
        ...cast,
        text: cast.text.trim(),
      }));
  }

  /**
   * Fast voice analysis - extract key patterns only
   */
  private analyzeVoice(casts: Cast[]): VoiceProfile {
    const texts = casts.map((c) => c.text);
    const allText = texts.join(" ");

    const avgLength =
      texts.reduce((sum, t) => sum + t.length, 0) / texts.length;
    const usesEmoji = /[\p{Emoji}]/gu.test(allText);
    const profanityWords = ["fuck", "shit", "damn", "hell"];
    const usesProfanity = profanityWords.some((word) =>
      allText.toLowerCase().includes(word)
    );

    // Energy level based on punctuation
    const exclamations = (allText.match(/!/g) || []).length;
    const energyRatio = exclamations / texts.length;
    const energyLevel =
      energyRatio > 0.5 ? "high" : energyRatio < 0.2 ? "low" : "medium";

    // Extract 2-3 word phrases that appear 3+ times
    const phraseCounts: { [key: string]: number } = {};
    texts.forEach((text) => {
      const words = text.toLowerCase().split(/\s+/);
      for (let i = 0; i < words.length - 1; i++) {
        const phrase = words.slice(i, i + 2).join(" ");
        if (phrase.length > 5) {
          phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
        }
      }
    });
    const commonPhrases = Object.entries(phraseCounts)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([phrase]) => phrase);

    // Punctuation style
    const hasEllipsis = allText.includes("...");
    const hasDashes = allText.includes("—") || allText.includes(" - ");
    const punctuationStyle = hasEllipsis
      ? "uses ellipses"
      : hasDashes
        ? "uses dashes"
        : "standard";

    return {
      avgLength,
      usesEmoji,
      usesProfanity,
      energyLevel,
      commonPhrases,
      punctuationStyle,
    };
  }

  /**
   * Select 8-10 best examples for few-shot prompting
   * Research shows Haiku performs best with 8-10 examples
   */
  private selectBestExamples(casts: Cast[]): Cast[] {
    if (casts.length <= 10) return casts;

    // Diversity sampling: different lengths and styles
    const sorted = [...casts].sort((a, b) => {
      // Prefer medium-to-long casts (more informative)
      const scoreA = a.text.length > 30 ? a.text.length : 0;
      const scoreB = b.text.length > 30 ? b.text.length : 0;
      return scoreB - scoreA;
    });

    const selected: Cast[] = [];
    const used = new Set<number>();

    // Pick diverse lengths
    for (let i = 0; i < sorted.length && selected.length < 10; i++) {
      if (used.has(i)) continue;

      const cast = sorted[i];
      const lengthBucket = Math.floor(cast.text.length / 50);

      // Check if we already have similar length
      const hasSimilar = selected.some((s) => {
        const sBucket = Math.floor(s.text.length / 50);
        return Math.abs(sBucket - lengthBucket) < 1;
      });

      if (!hasSimilar || selected.length < 6) {
        selected.push(cast);
        used.add(i);
      }
    }

    return selected.slice(0, 10);
  }

  /**
   * Generate concise style hints (3-5 bullets max)
   */
  private generateStyleHints(): string {
    if (!this.voiceProfile) return "";

    const hints: string[] = [];
    const vp = this.voiceProfile;

    // Energy
    if (vp.energyLevel === "high") {
      hints.push("High energy - use !, emojis, caps");
    } else if (vp.energyLevel === "low") {
      hints.push("Low-key, understated - minimal !, emojis");
    }

    // Length
    if (vp.avgLength < 60) {
      hints.push("Keep it SHORT and punchy");
    } else if (vp.avgLength > 120) {
      hints.push("Longer, detailed responses");
    }

    // Profanity
    if (vp.usesProfanity) {
      hints.push("Use profanity naturally");
    }

    // Punctuation
    if (vp.punctuationStyle !== "standard") {
      hints.push(`Style: ${vp.punctuationStyle}`);
    }

    // Common phrases
    if (vp.commonPhrases.length > 0) {
      hints.push(`Sometimes use: "${vp.commonPhrases[0]}"`);
    }

    return hints.slice(0, 5).join("\n");
  }

  /**
   * HAIKU-OPTIMIZED PROMPT
   * - XML tags for structure
   * - 8-10 clear examples
   * - Concise instructions
   * - Prefilling support
   */
  buildVoiceLearningPrompt(
    promotionContent: string,
    promotionAuthor: string,
    embedContext: { type: string; value: string }[]
  ) {
    const contextUrl = embedContext.find((x) => x.type === "url")?.value;
    const additionalContext =
      embedContext.length > 0
        ? embedContext.map((e) => `${e.type}: ${e.value}`).join("\n")
        : "";

    const styleHints = this.generateStyleHints();

    return [
      {
        role: "system" as const,
        content: `You are ${this.username}. Write EXACTLY like these examples:

<examples>
${this.topExamples.map((cast, i) => `<example${i + 1}>${cast.text}</example${i + 1}>`).join("\n")}
</examples>

<voice_rules>
${styleHints}
</voice_rules>

<restrictions>
- You're replying to ${promotionAuthor}'s post (not writing as them)
- Only use facts from provided content
- Never invent URLs
- Under 280 characters
- Match examples' tone exactly
- No generic promotional language
</restrictions>`,
      },
      {
        role: "user" as const,
        content: `<task>Write a natural reply (not an ad)</task>

<content>
${promotionContent}
</content>

${additionalContext ? `<context>\n${additionalContext}\n</context>` : ""}

${contextUrl ? `<url>${contextUrl}</url>` : ""}

<output>Only the cast text</output>`,
      },
    ];
  }

  /**
   * Clean extraction - handle any wrapper text
   */
  private extractCastFromResponse(fullResponse: string): string {
    return (
      fullResponse
        .replace(/^(Here's|Here is|Cast:|Output:)/i, "")
        .replace(/<\/?[^>]+(>|$)/g, "") // Remove any XML tags in output
        .trim()
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .pop()
        ?.trim() || fullResponse.trim()
    );
  }

  /**
   * Fast warmup - single example style priming
   */
  private async performVoiceWarmup(): Promise<void> {
    if (this.topExamples.length === 0) return;

    try {
      await generateText({
        model: this.fastModel,
        messages: [
          {
            role: "user",
            content: `Copy this style: "${this.topExamples[0].text}"\n\nWrite 1 sentence about tech in that style.`,
          },
        ],
        temperature: 1.0,
      });
    } catch {
      // Silent fail - warmup is optional
    }
  }

  /**
   * Post-process - ensure quality
   */
  private postProcessCast(castText: string): string {
    let processed = castText.trim();

    // Remove common artifacts
    processed = processed.replace(/^(Here's|Here is|Cast:)/i, "").trim();

    // Ensure character limit
    if (processed.length > 280) {
      processed = processed.substring(0, 277) + "...";
    }

    return processed;
  }

  /**
   * HAIKU-OPTIMIZED: Fast initial generation
   * - Voice warmup
   * - Optimal temperature (0.9-0.95 for creativity)
   * - Minimal retries for speed
   */
  async generateInitialCast(
    promotionContent: string,
    promotionAuthor: string,
    embedContext: { type: string; value: string }[],
    options?: GenerationOptions
  ): Promise<GenerationResult> {
    try {
      if (this.topExamples.length === 0) {
        return {
          success: false,
          error: "No suitable casts found for voice training",
          model: "claude-3-5-haiku-20241022",
        };
      }

      // Quick warmup
      await this.performVoiceWarmup();

      const messages = this.buildVoiceLearningPrompt(
        promotionContent,
        promotionAuthor,
        embedContext
      );

      const result = await generateText({
        model: this.fastModel,
        messages,
        temperature: options?.temperature || 0.92, // Sweet spot for Haiku creativity
        frequencyPenalty: 0.65,
        presencePenalty: 0.5,
        maxRetries: 1, // Fast fail for speed
        abortSignal: AbortSignal.timeout(15000), // 15s timeout
      });

      let castText = this.extractCastFromResponse(result.text);
      castText = this.postProcessCast(castText);

      return {
        success: true,
        text: castText,
        model: "claude-3-5-haiku-20241022",
        generationType: "initial",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model: "claude-3-5-haiku-20241022",
      };
    }
  }

  /**
   * HAIKU-OPTIMIZED: Refinement with feedback
   */
  async refineCast(
    promotionContent: string,
    promotionAuthor: string,
    embedContext: { type: string; value: string }[],
    userFeedback: string,
    previousCast: string,
    options?: GenerationOptions
  ): Promise<GenerationResult> {
    try {
      if (this.topExamples.length === 0) {
        return {
          success: false,
          error: "No suitable casts found for voice training",
          model: "claude-3-5-haiku-20241022",
        };
      }

      const baseMessages = this.buildVoiceLearningPrompt(
        promotionContent,
        promotionAuthor,
        embedContext
      );

      const styleHints = this.generateStyleHints();

      const messages = [
        ...baseMessages,
        {
          role: "assistant" as const,
          content: previousCast,
        },
        {
          role: "user" as const,
          content: `<feedback>${userFeedback}</feedback>

<voice_reminder>
${styleHints}
</voice_reminder>

<task>Rewrite completely (under 280 chars). Match voice. Address feedback.</task>

<output>Only the revised cast</output>`,
        },
      ];

      const result = await generateText({
        model: this.fastModel,
        messages,
        temperature: options?.temperature || 0.92,
        frequencyPenalty: 0.65,
        presencePenalty: 0.5,
        maxRetries: 2,
        abortSignal: AbortSignal.timeout(20000),
      });

      let castText = this.extractCastFromResponse(result.text);
      castText = this.postProcessCast(castText);

      return {
        success: true,
        text: castText,
        model: "claude-3-5-haiku-20241022",
        generationType: "refinement",
        originalCast: previousCast,
        feedback: userFeedback,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model: "claude-3-5-haiku-20241022",
      };
    }
  }
  /**
   * HAIKU-OPTIMIZED: Generate variations
   * - Temperature variation for diversity
   * - Shared warmup
   */
  async generateVariations(
    count: number = 3,
    promotionContent: string,
    promotionAuthor: string,
    embedContext: { type: string; value: string }[]
  ): Promise<GenerationResult[]> {
    const variations: GenerationResult[] = [];

    if (this.topExamples.length === 0) {
      return [
        {
          success: false,
          error: "No suitable casts found for voice training",
          model: "claude-3-5-haiku-20241022",
        },
      ];
    }

    // Single warmup for all variations
    await this.performVoiceWarmup();

    for (let i = 0; i < count; i++) {
      try {
        const messages = this.buildVoiceLearningPrompt(
          promotionContent,
          promotionAuthor,
          embedContext
        );

        // Vary temperature: 0.88, 0.92, 0.96
        const temperature = 0.88 + i * 0.04;

        const result = await generateText({
          model: this.fastModel,
          messages,
          temperature,
          frequencyPenalty: 0.3 + i * 0.05,
          presencePenalty: 0.3 + i * 0.05,
          maxRetries: 1,
          abortSignal: AbortSignal.timeout(15000),
        });

        let castText = this.extractCastFromResponse(result.text);
        castText = this.postProcessCast(castText);

        variations.push({
          success: true,
          text: castText,
          model: "claude-3-5-haiku-20241022",
          generationType: "variation",
          variationIndex: i,
        });
      } catch (error) {
        variations.push({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          model: "claude-3-5-haiku-20241022",
          variationIndex: i,
        });
      }
    }

    return variations;
  }

  /**
   * Enhanced validation with voice matching
   */
  validateCast(castText: string): ValidationResult {
    const issues: string[] = [];

    if (!castText || castText.trim().length === 0) {
      issues.push("Cast cannot be empty");
    }

    if (castText.length > 280) {
      issues.push("Cast exceeds 280 character limit");
    }

    if (castText.length < 10) {
      issues.push("Cast too short, minimum 10 characters");
    }

    // AI markers
    const aiMarkers = ["as an ai", "i am an ai", "i cannot", "i apologize"];
    if (aiMarkers.some((m) => castText.toLowerCase().includes(m))) {
      issues.push("Contains AI markers");
    }

    // Generic promotional language
    const genericMarkers = [
      "excited to share",
      "won't want to miss",
      "game-changer",
    ];
    if (genericMarkers.some((m) => castText.toLowerCase().includes(m))) {
      issues.push("Too promotional/generic");
    }

    // Voice mismatch checks
    if (this.voiceProfile) {
      const vp = this.voiceProfile;

      // Energy mismatch
      const exclamations = (castText.match(/!/g) || []).length;
      if (vp.energyLevel === "low" && exclamations > 1) {
        issues.push("Energy too high for this user's style");
      }

      // Profanity mismatch
      const hasProfanity = ["fuck", "shit", "damn"].some((w) =>
        castText.toLowerCase().includes(w)
      );
      if (hasProfanity && !vp.usesProfanity) {
        issues.push("Contains profanity (user doesn't use it)");
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
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
      if (this.topExamples.length === 0) {
        return {
          success: false,
          error: "No suitable casts found for voice training",
          model: "claude-3-5-haiku-20241022",
        };
      }

      // Convert budget to readable format (assuming it's in USDC - 6 decimals)
      const budgetInUsdc = (parseFloat(budget) / 1e6).toFixed(2);
      const budgetDisplay = `$${budgetInUsdc} USDC`;

      const styleHints = this.generateStyleHints();

      const messages = [
        {
          role: "system" as const,
          content: `You are ${this.username}. Write EXACTLY like these examples:

<examples>
${this.topExamples.map((cast, i) => `<example${i + 1}>${cast.text}</example${i + 1}>`).join("\n")}
</examples>

<voice_rules>
${styleHints}
</voice_rules>

<restrictions>
- You're promoting @${creatorUsername}'s cast (they wrote the original content)
- MUST mention @${creatorUsername} in the cast
- MUST include the budget amount prominently
- Under 280 characters
- Match examples' tone exactly
- Make it sound like a genuine recommendation, not an ad
- Be enthusiastic but authentic
</restrictions>`,
        },
        {
          role: "user" as const,
          content: `<task>Write a promotional cast recommending this content</task>

<original_cast>
${castText}
</original_cast>

<creator>
Original Creator: @${creatorUsername} (they wrote the cast above)
</creator>

<budget>
Budget: ${budgetDisplay}
</budget>

<requirements>
- MUST mention @${creatorUsername} (the original creator)
- MUST include the budget amount
- Make it sound natural and authentic
- You're promoting their content, not writing as them
</requirements>

<output>Only the promotional cast text</output>`,
        },
      ];

      const result = await generateText({
        model: this.fastModel,
        messages,
        temperature: 0.9,
        frequencyPenalty: 0.6,
        presencePenalty: 0.4,
        maxRetries: 2,
        abortSignal: AbortSignal.timeout(15000),
      });

      let promotionalText = this.extractCastFromResponse(result.text);
      promotionalText = this.postProcessCast(promotionalText);

      return {
        success: true,
        text: promotionalText,
        model: "claude-3-5-haiku-20241022",
        generationType: "promotional",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model: "claude-3-5-haiku-20241022",
      };
    }
  }
}
