import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import axios from "axios";
import { Cast } from "@neynar/nodejs-sdk/build/api";

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

export class HypemanAI {
  private fastModel;
  private qualityModel;
  private user_casts: Cast[];

  constructor() {
    // Initialize models for two-tier system
    this.fastModel = anthropic("claude-3-5-haiku-latest");
    this.qualityModel = openai("gpt-5");
    this.user_casts = [];
  }

  /**
   * Fetch user's recent casts from Neynar API
   * You'll implement the actual Neynar API call here
   */

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
      this.user_casts = data.casts;
    } catch (e: any) {
      console.log(e, e.message);
      throw new Error(
        "fetchUserCasts not implemented - add your Neynar API integration here"
      );
    }
  }

  /**
   * Basic post sanitization
   * Remove empty posts, clean up formatting
   */
  sanitizeCasts(casts: Cast[]): Cast[] {
    return casts
      .filter((cast) => cast.text && cast.text.trim().length > 10) // Remove empty/too short
      .filter((cast) => !cast.text.startsWith("@")) // Remove pure mentions/replies
      .slice(0, 500) // Limit to most recent 500 casts
      .map((cast) => ({
        ...cast,
        text: cast.text.trim(),
      }));
  }

  /**
   * Build voice learning prompt from user's cast history
   */
  buildVoiceLearningPrompt(
    casts: Cast[],
    fcUsername: string,
    promotionName: string,
    promotionDescription: string,
    promotionUrl: string
  ) {
    return [
      {
        role: "system" as const,
        content: `
You are ${fcUsername} on farcaster. Study how you actually write from these examples Write EXACTLY like these examples, including any slang, casual language, or edgy expressions:

${casts.map((cast, i) => `${i + 1}. ${cast.text}`).join("\n\n")}

You're NOT promoting anything. You're just casually mentioning something you tried.
don't sanitize or clean up their voice.
Important: Use their authentic vocabulary from the examples above, even if it's casual, edgy, or unconventional. Don't tone down their voice
       `,
      },
      {
        role: "user" as const,
        content: `
You tried this app: ${promotionName}
Description: ${promotionDescription}
${promotionUrl}

Just mention it casually. Don't try to get them to do anything. Under 280 chars
If the url is provide it, be sure to naturally include it in the cast.

IMPORTANT Write about the app/promotion while matching their exact language style and vocabulary from the examples. Stay focused on the topic but use their authentic voice. use curse words if I use them alot in my other posts

IMPORTANT! only output the cast and nothing else, do not include any of your thinking or reasoning

IMPORTANT, use correct spelling and grammer, even if you don't in your example casts
`,
      },
    ];
  }

  /**
   * Fast initial generation for landing page
   * Fetches user casts and generates content quickly
   */
  async generateInitialCast(
    fid: number,
    username: string,
    promotionName: string,
    promotionDescription: string,
    promotionUrl: string,
    _promotionCast?: string,
    options?: GenerationOptions
  ): Promise<GenerationResult> {
    try {
      // Fetch and prepare user's cast history
      await this.fetchUserCasts(fid);

      if (this.user_casts.length === 0) {
        return {
          success: false,
          error: "No suitable casts found for voice training",
          model: "claude-3.5-sonnet",
        };
      }

      const messages = this.buildVoiceLearningPrompt(
        this.user_casts,
        username,
        promotionName,
        promotionDescription,
        promotionUrl
      );

      const result = await generateText({
        model: this.fastModel,
        messages,
        temperature: options?.temperature || 0.9,
        topP: 0.9,
        maxRetries: 1, // Fail fast for speed
        abortSignal: AbortSignal.timeout(30000), // 15s timeout
      });

      return {
        success: true,
        text: result.text,
        model: "fast model",
        generationType: "initial",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model: "fast model",
      };
    }
  }

  /**
   * Quality refinement for iterative improvements
   * Uses cached cast data and Claude for better voice mimicry
   */
  async refineCast(
    username: string,
    promotionName: string,
    promotionDescription: string,
    promotionUrl: string,
    previousCast: string,
    userFeedback: string,
    _promotionCast?: string,
    options?: GenerationOptions
  ): Promise<GenerationResult> {
    try {
      // Fetch and prepare user's cast history

      if (this.user_casts.length === 0) {
        return {
          success: false,
          error: "No suitable casts found for voice training",
          model: "claude-3.5-sonnet",
        };
      }

      const baseMessages = this.buildVoiceLearningPrompt(
        this.user_casts,
        username,
        promotionName,
        promotionDescription,
        promotionUrl
      );

      const messages = [
        ...baseMessages,
        {
          role: "assistant" as const,
          content: previousCast,
        },
        {
          role: "user" as const,
          content: `Please revise this cast based on my feedback: "${userFeedback}"

Make it sound more authentic to my voice while addressing the feedback. Keep under 280 characters and maintain the promotional intent.`,
        },
      ];

      const result = await generateText({
        model: this.qualityModel,
        messages,
        temperature: options?.temperature || 0.7,
        maxRetries: 2,
        abortSignal: AbortSignal.timeout(30000), // 30s timeout for quality
      });

      return {
        success: true,
        text: result.text,
        model: "claude-3.5-sonnet",
        generationType: "refinement",
        originalCast: previousCast,
        feedback: userFeedback,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model: "claude-3.5-sonnet",
      };
    }
  }

  /**
   * Generate multiple variations for A/B testing
   */
  async generateVariations(
    username: string,
    count: number = 3,
    promotionName: string,
    promotionDescription: string,
    promotionUrl: string,
    _promotionCast?: string
  ): Promise<GenerationResult[]> {
    const variations: GenerationResult[] = [];

    // Fetch casts once for all variations

    if (this.user_casts.length === 0) {
      return [
        {
          success: false,
          error: "No suitable casts found for voice training",
          model: "gpt-4o-mini",
        },
      ];
    }

    for (let i = 0; i < count; i++) {
      try {
        const messages = this.buildVoiceLearningPrompt(
          this.user_casts,
          username,
          promotionName,
          promotionDescription,
          promotionUrl
        );

        const result = await generateText({
          model: this.fastModel,
          messages,
          temperature: 0.7 + i * 0.1, // Vary temperature for diversity
          maxRetries: 1,
          abortSignal: AbortSignal.timeout(15000),
        });

        variations.push({
          success: true,
          text: result.text,
          model: "gpt-4o-mini",
          generationType: "variation",
          variationIndex: i,
        });
      } catch (error) {
        variations.push({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          model: "gpt-4o-mini",
          variationIndex: i,
        });
      }
    }

    return variations;
  }

  /**
   * Validate cast meets requirements
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

    // Check for obvious AI markers
    const aiMarkers = ["as an ai", "i am an ai", "i cannot", "i apologize"];
    const hasAiMarkers = aiMarkers.some((marker) =>
      castText.toLowerCase().includes(marker)
    );

    if (hasAiMarkers) {
      issues.push("Cast contains AI-generated markers");
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

// Usage example:
// const hypemanAI = new HypemanAI()
//
// const initialCast = await hypemanAI.generateInitialCast(
//   12345, // user's FID
//   "Check out this new token $HYPE - it's revolutionizing social promotion!"
// )
//
// if (initialCast.success) {
//   console.log('Generated cast:', initialCast.text)
//
//   // User wants to refine it
//   const refined = await hypemanAI.refineCast(
//     12345,
//     "Check out this new token $HYPE - it's revolutionizing social promotion!",
//     initialCast.text,
//     "make it more excited and add an emoji"
//   )
//
//   console.log('Refined cast:', refined.text)
// }
