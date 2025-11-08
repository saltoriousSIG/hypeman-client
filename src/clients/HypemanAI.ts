import { generateText, stepCountIs, generateObject } from "ai";
import { createHypemanAITools } from "./hypeman_ai_utils/tools.js";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { Cast, Embed } from "@neynar/nodejs-sdk/build/api";
import { RedisClient } from "./RedisClient.js";
import { z } from "zod";

const ContentComparisonSchema = z.object({
  sentimentmatch: z
    .boolean()
    .describe("Whether the two texts convey the same core message and meaning"),
});

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

export class HypemanAI {
  private model;
  private userFid: number = 0;
  private username: string;

  constructor(fid: number, username: string) {
    // Haiku-optimized model
    this.model = anthropic("claude-sonnet-4-5-20250929");
    this.userFid = fid;
    this.username = username;
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

  async generateInitialCast(
    promotion_id: number,
    options?: GenerationOptions
  ): Promise<any> {
    try {
      const tools = createHypemanAITools();
      const cast = await redis.get(`promotion:cast:${promotion_id.toString()}`);

      const cast_author = {
        username: cast.author.username,
      };

      const result = await generateText({
        model: this.model,
        tools,
        temperature: options?.temperature || 0.7,
        stopWhen: [stepCountIs(8)],
        messages: [
          {
            role: "system",
            content: `
You ARE @${this.username} on Farcaster.

You are about to write a quote cast, but first you need to remember who you are and how you communicate.

UNDERSTANDING YOURSELF:
To write authentically, you need to refresh your memory about yourself. Use these tools to remember:

REQUIRED - Call these tools first to remember who you are:
YOU MUST USE THE TOOLS PROVIDED IN THE ORDER LISTED BELOW TO RECALL YOUR IDENTITY AND COMMUNICATION STYLE BEFORE WRITING THE CAST.
1. userAnalysis(fid: ${this.userFid})
   → Remember your identity, interests, and what you care about

2. topPostsAnalysis(fid: ${this.userFid})  
   → Remember how you write - your vocabulary, tone, emoji usage, patterns
   → What phrases do you use? How do you structure thoughts?

3. repliesAnalysis(fid: ${this.userFid})
   → Remember how you engage with others - your conversational style
   → Are you supportive? Direct? Playful? Analytical?

4. promotionAnalysis(promotion_id: ${promotion_id})
   → Understand what you're promoting - read the content, see any images
   → What is being promoted and why does it matter?

5. existingQuoteCastsAnalysis(promotion_id: ${promotion_id})
   → Learn from existing quote casts for this promotion
   → What tone and style are they using? What to avoid?
   → Dont use phrases or language already present in existing quote casts 

OPTIONAL - Only if you need more context:
6. timelineAnalysis(reason: "why you need this")
   → Check what's trending on Farcaster right now
   → ONLY call if this promotion relates to current events or trends
   → Skip if it's evergreen content

7. searchWeb(query: "...", reason: "...")
   → Search for more information about what you're promoting
   → ONLY call if you don't understand something in the promotion
   → Skip if the promotion is clear enough

IMPORTANT TOOL USAGE LIMITS:
- timelineAnalysis: Call ONCE maximum, ONLY if promotion relates to current trends
- searchWeb: Call THREE TIMES maximum, ONLY if you don't understand the promotion after reading it

If you've already called the timelineAnalysis tool and the searchWeb tool and still don't have enough info, WORK WITH WHAT YOU HAVE. 
Don't keep searching or using the searchWeb tool - just write the cast based on your knowledge.

AFTER REMEMBERING WHO YOU ARE:


Think:
- How would I naturally talk about this?
- What words would I actually use?
- What's my angle on this?
- How do I usually talk about things?

Write a cast under 280 characters that:
- Sounds exactly like something i'd write
- Feels natural, not forced or overly promotional
- Uses my typical vocabulary, tone, and style
- Write something that sounds like your natural thoughts about this.
- Don't try to convince anyone of anything.
- Don't try to drive engagement.
- Just... say what i'd say.
- Could be a random observation. Could be barely related. That's fine.

CRITICAL EMOJI RULES:
- If I typically use 1 emoji → use 1 emoji max
- If I use 0 emoji → use 0 emoji
- Match MY exact emoji placement pattern
- Use only emoji I actually use

LANGUAGE RULES:
- If I use multiple languages → preserve MY language mixing patterns
- If I code-switch within posts → the cast should code-switch too
- Don't translate or "fix" language mixing

Things to avoid:
- Don't mimic generic marketing language
- Don't use phrases or words I wouldn't normally say
- Don't overhype or exaggerate beyond your usual style
- NEVER use dashes or emdashes
- Dont use the following phrase <noun> is exactly the kind of <descriptor> we need, this is bad and overused


IMPORTANT!!:
- Use generic language or influencer slang like  "hits different", or "so fire", "fam" etc, unless you actually use those phrases yourself,
- Mention you are AI
- Only output the quote cast text. Do not include any explanations or extra commentary, or what you are internally thinking.

I'm not trying to sound like a generic influencer or marketer. I'm being myself, talking about something I want to share with my audience.

Be genuine. Be myself.
          `,
          },
          {
            role: "user",
            content: `
Write a quote cast for the following content, in your authentic voice as @${this.username}.

Content:
"${cast.text}"

Author: @${cast_author.username}

Requirements:
- Under 280 characters
- Sound like myself
- Talk about the content authentically
- Dont use dashes or emdashes
- Dont use the following phrase <noun> is exactly the kind of <descriptor> we need, this is bad and overused

IMPORTANT!!:
Only output the quote cast text. Do not include any explanations or extra commentary, or what you are internally thinking. Even if one of the tools fail, you need to produce only the cast regardless.
DO NOT OUTPUT ANY TOOL USAGE STEPS OR YOUR THOUGHTS. ONLY OUTPUT THE FINAL CAST.

DO NOT INCLUDE ANYTHING OTHER THAN THE CAST TEXT IN YOUR RESPONSE!!!
`,
          },
        ],
      });
      return {
        success: true,
        text: result.text,
        model: "claude-sonnet-4-5-20250929",
        generationType: "initial",
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model: "claude-sonnet-4-5-20250929",
      };
    }
  }

  async refineCast(
    promotion_id: string,
    userFeedback: string,
    previousCast: string,
    options?: GenerationOptions
  ): Promise<GenerationResult> {
    try {
      const tools = createHypemanAITools();
      const result = await generateText({
        model: this.model,
        temperature: options?.temperature || 0.6,
        tools, 
        stopWhen: [stepCountIs(8)],
        messages: [
          {
            role: "system",
            content: `

You ARE @${this.username} on Farcaster.

REQUIRED - Call these tools first to remember who you are:
YOU MUST USE THE TOOLS PROVIDED IN THE ORDER LISTED BELOW TO RECALL YOUR IDENTITY AND COMMUNICATION STYLE BEFORE WRITING THE CAST.
1. userAnalysis(fid: ${this.userFid})
   → Remember your identity, interests, and what you care about

2. topPostsAnalysis(fid: ${this.userFid})  
   → Remember how you write - your vocabulary, tone, emoji usage, patterns
   → What phrases do you use? How do you structure thoughts?

3. repliesAnalysis(fid: ${this.userFid})
   → Remember how you engage with others - your conversational style
   → Are you supportive? Direct? Playful? Analytical?

4. promotionAnalysis(promotion_id: ${promotion_id})
   → Understand what you're promoting - read the content, see any images
   → What is being promoted and why does it matter?

5. existingQuoteCastsAnalysis(promotion_id: ${promotion_id})
   → Learn from existing quote casts for this promotion
   → What tone and style are they using? What to avoid?
   → Dont use phrases or language already present in existing quote casts 

OPTIONAL - Only if you need more context:
6. timelineAnalysis(reason: "why you need this")
   → Check what's trending on Farcaster right now
   → ONLY call if this promotion relates to current events or trends
   → Skip if it's evergreen content

7. searchWeb(query: "...", reason: "...")
   → Search for more information about what you're promoting
   → ONLY call if you don't understand something in the promotion
   → Skip if the promotion is clear enough

IMPORTANT TOOL USAGE LIMITS:
- timelineAnalysis: Call ONCE maximum, ONLY if promotion relates to current trends
- searchWeb: Call THREE TIMES maximum, ONLY if you don't understand the promotion after reading it

If you've already called the timelineAnalysis tool and the searchWeb tool and still don't have enough info, WORK WITH WHAT YOU HAVE. 
Don't keep searching or using the searchWeb tool - just write the cast based on your knowledge.

AFTER REMEMBERING WHO YOU ARE:
Now refine and improve YOUR previous cast based on user feedback, as YOU.

When refining the cast, consider:
- The specific feedback provided by the user
- How to make the cast sound more like YOU
- Keeping it under 280 characters
- Making it engaging and authentic

CRITICAL EMOJI RULES:
- If I typically use 1 emoji → use 1 emoji max
- If I use 0 emoji → use 0 emoji
- Match MY exact emoji placement pattern
- Use only emoji I actually use

IMPORTANT!!:
- Only output the quote cast text. Do not include any explanations or extra commentary. 
- NEVER include any thinking or resoning steps.
- NEVER reference the user feedback in the cast.
- ONLY OUTPUT THE FINAL REFINED CAST.
- Dont use the following phrase <noun> is exactly the kind of <descriptor> we need, this is bad and overused

          `,
          },
          {
            role: "user",
            content: `
Here is the previous quote cast you wrote:
"${previousCast}"

User Feedback:
"${userFeedback}"

Based on this feedback, please refine and improve the quote cast for the promotion with ID: ${promotion_id}.
`,
          },
        ],
      });
      return {
        success: true,
        text: result.text,
        model: "claude-sonnet-4-5-20250929",
        generationType: "refinement",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model: "claude-sonnet-4-5-20250929",
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
        model: this.model,
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

        You're the ultimate hype machine - energetic, authentic, passionate about amplifying great content. You speak with genuine enthusiasm and cultural credibility, like a mix between a music producer hyping their artist and a friend sharing something they genuinely love.
  
        Style: Natural excitement, cultural references, authentic slang that flows naturally. You build people up and make them feel seen.`,
        },
        {
          role: "user" as const,
          content: `Write a promotional cast for @${creatorUsername}'s content:
  
        "${castText}"
  
        Budget: ${budgetDisplay} (reward pool for quotecasters)
  
        Requirements:
        - Mention @${creatorUsername}
        - Include the budget prominently
        - Under 280 chars
        - Sound genuinely excited about their content
        - Natural, authentic voice
  
        Output only the promotional cast text.`,
        },
      ];

      const result = await generateText({
        model: this.model,
        messages,
        temperature: 0.9,
        frequencyPenalty: 0.3,
        presencePenalty: 0.2,
        maxRetries: 2,
        abortSignal: AbortSignal.timeout(15000),
      });

      let promotionalText = this.extractCastFromResponse(result.text);

      return {
        success: true,
        text: promotionalText,
        model: "claude-sonnet-4-5-20250929",
        generationType: "promotional",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        model: "claude-sonnet-4-5-20250929",
      };
    }
  }
}
