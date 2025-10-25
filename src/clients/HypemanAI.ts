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
  // Basic metrics
  avgLength: number;
  avgSentenceLength: number;

  // Vocabulary fingerprint
  uniqueWords: string[]; // Words used frequently by this user
  favoredAdjectives: string[];
  slangTerms: string[];
  technicalTerms: string[];

  // Structural patterns
  openingPatterns: string[]; // How they start messages
  closingPatterns: string[]; // How they end messages
  questionFrequency: number; // % of casts that are questions

  // Linguistic markers
  usesEmoji: boolean;
  emojiStyle: string[]; // Specific emojis they use
  usesProfanity: boolean;
  profanityWords: string[];

  // Punctuation and formatting
  ellipsisUsage: boolean;
  exclamationUsage: number; // per cast average
  capitalPattern: "standard" | "lowercase" | "mixed";

  // Personality markers
  enthusiasmMarkers: string[]; // How they show excitement
  cautionaryWords: string[]; // "imo", "tbh", etc.
  fillerWords: string[]; // "like", "honestly", etc.

  // What they avoid
  avoidedPatterns: string[];

  // Energy
  energyLevel: "high" | "medium" | "low";
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
   * Deep voice analysis - extract unique patterns that differentiate this user
   */
  private analyzeVoice(casts: Cast[]): VoiceProfile {
    const texts = casts.map((c) => c.text);
    const allText = texts.join(" ");

    // === BASIC METRICS ===
    const avgLength =
      texts.reduce((sum, t) => sum + t.length, 0) / texts.length;

    // Calculate average sentence length
    const allSentences = texts.flatMap((t) =>
      t.split(/[.!?]+/).filter((s) => s.trim().length > 0)
    );
    const avgSentenceLength =
      allSentences.length > 0
        ? allSentences.reduce((sum, s) => sum + s.length, 0) /
          allSentences.length
        : avgLength;

    // === VOCABULARY FINGERPRINT ===
    // Extract all words and find frequently used ones
    const wordFreq: { [key: string]: number } = {};
    const allWords = allText
      .toLowerCase()
      .replace(/[^\w\s']/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3); // Filter out short words

    allWords.forEach((word) => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Find unique/characteristic words (used 3+ times)
    const uniqueWords = Object.entries(wordFreq)
      .filter(([word, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    // Find favored adjectives
    const commonAdjectives = [
      "good",
      "great",
      "nice",
      "cool",
      "awesome",
      "amazing",
      "sick",
      "dope",
      "fire",
      "clean",
      "solid",
      "wild",
      "crazy",
      "insane",
      "real",
      "true",
      "best",
      "perfect",
      "beautiful",
    ];
    const favoredAdjectives = commonAdjectives
      .filter((adj) => allText.toLowerCase().includes(adj))
      .filter(
        (adj) =>
          (allText.toLowerCase().match(new RegExp(adj, "g")) || []).length >= 2
      )
      .slice(0, 5);

    // Detect slang usage
    const slangTerms: string[] = [];
    const slangPatterns = [
      { pattern: /\bfr\b|\bfr fr\b/i, term: "fr" },
      { pattern: /\blowkey\b/i, term: "lowkey" },
      { pattern: /\bhighkey\b/i, term: "highkey" },
      { pattern: /\byo+\b/i, term: "yo" },
      { pattern: /\bvibing\b|\bvibe\b/i, term: "vibe/vibing" },
      { pattern: /\bhits different\b/i, term: "hits different" },
      { pattern: /\blmao\b|\blmfao\b/i, term: "lmao" },
      { pattern: /\bngl\b/i, term: "ngl" },
      { pattern: /\btbh\b/i, term: "tbh" },
      { pattern: /\bimo\b/i, term: "imo" },
      { pattern: /\baf\b/i, term: "af" },
      { pattern: /\bfinna\b|\bgonna\b/i, term: "finna/gonna" },
      { pattern: /\bhonestly\b/i, term: "honestly" },
      { pattern: /\blegit\b/i, term: "legit" },
    ];

    slangPatterns.forEach(({ pattern, term }) => {
      if (pattern.test(allText)) {
        slangTerms.push(term);
      }
    });

    // Detect technical/crypto terms
    const technicalPatterns = [
      "protocol",
      "onchain",
      "token",
      "mint",
      "airdrop",
      "dao",
      "defi",
      "nft",
      "wallet",
      "transaction",
      "smart contract",
      "blockchain",
    ];
    const technicalTerms = technicalPatterns.filter((term) =>
      allText.toLowerCase().includes(term.toLowerCase())
    );

    // === STRUCTURAL PATTERNS ===
    // Analyze how they open messages
    const openings: { [key: string]: number } = {};
    texts.forEach((text) => {
      const firstWords = text.toLowerCase().split(/\s+/).slice(0, 2).join(" ");
      if (firstWords.length > 0) {
        openings[firstWords] = (openings[firstWords] || 0) + 1;
      }
    });
    const openingPatterns = Object.entries(openings)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern]) => pattern);

    // Analyze how they close messages
    const closings: { [key: string]: number } = {};
    texts.forEach((text) => {
      const lastWords = text
        .toLowerCase()
        .replace(/[.!?]+$/, "") // Remove trailing punctuation
        .split(/\s+/)
        .slice(-2)
        .join(" ");
      if (lastWords.length > 0) {
        closings[lastWords] = (closings[lastWords] || 0) + 1;
      }
    });
    const closingPatterns = Object.entries(closings)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern]) => pattern);

    // Question frequency
    const questionCount = texts.filter((t) => t.includes("?")).length;
    const questionFrequency = questionCount / texts.length;

    // === EMOJI ANALYSIS ===
    const emojiRegex = /[\p{Emoji}]/gu;
    const usesEmoji = emojiRegex.test(allText);
    const emojiMatches = allText.match(emojiRegex) || [];
    const emojiFreq: { [key: string]: number } = {};
    emojiMatches.forEach((emoji) => {
      emojiFreq[emoji] = (emojiFreq[emoji] || 0) + 1;
    });
    const emojiStyle = Object.entries(emojiFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([emoji]) => emoji);

    // === PROFANITY ANALYSIS ===
    const profanityList = ["fuck", "shit", "damn", "hell", "ass", "bitch"];
    const profanityWords: string[] = [];
    profanityList.forEach((word) => {
      if (allText.toLowerCase().includes(word)) {
        profanityWords.push(word);
      }
    });
    const usesProfanity = profanityWords.length > 0;

    // === PUNCTUATION & FORMATTING ===
    const ellipsisUsage = allText.includes("...");
    const exclamationCount = (allText.match(/!/g) || []).length;
    const exclamationUsage = exclamationCount / texts.length;

    // Detect capitalization pattern
    const lowercaseTexts = texts.filter(
      (t) => t === t.toLowerCase() && t.length > 10
    );
    const uppercaseWords = allText.match(/[A-Z]{2,}/g) || [];
    const capitalPattern =
      lowercaseTexts.length > texts.length * 0.5
        ? "lowercase"
        : uppercaseWords.length > 5
          ? "mixed"
          : "standard";

    // === PERSONALITY MARKERS ===
    // Enthusiasm markers (how they show excitement)
    const enthusiasmMarkers: string[] = [];
    if (allText.includes("!!")) enthusiasmMarkers.push("double exclamation");
    if (allText.includes("..."))
      enthusiasmMarkers.push("ellipsis for suspense");
    if (/\b(omg|wow|damn|holy|sheesh)\b/i.test(allText))
      enthusiasmMarkers.push("exclamations");
    if (slangTerms.includes("fire"))
      enthusiasmMarkers.push("fire/flames language");
    if (exclamationUsage > 1)
      enthusiasmMarkers.push("multiple exclamation marks");

    // Cautionary/hedging words
    const cautionaryWords: string[] = [];
    const hedges = [
      "imo",
      "tbh",
      "ngl",
      "probably",
      "maybe",
      "kinda",
      "sorta",
      "i think",
    ];
    hedges.forEach((hedge) => {
      if (new RegExp(`\\b${hedge}\\b`, "i").test(allText)) {
        cautionaryWords.push(hedge);
      }
    });

    // Filler words
    const fillerWords: string[] = [];
    const fillers = [
      "like",
      "honestly",
      "basically",
      "literally",
      "actually",
      "really",
    ];
    fillers.forEach((filler) => {
      const count = (
        allText.toLowerCase().match(new RegExp(`\\b${filler}\\b`, "g")) || []
      ).length;
      if (count >= 2) {
        fillerWords.push(filler);
      }
    });

    // === AVOIDED PATTERNS ===
    const avoidedPatterns: string[] = [];

    // Check what they DON'T do
    if (!slangTerms.includes("fr")) avoidedPatterns.push('does not use "fr"');
    if (!slangTerms.includes("lowkey"))
      avoidedPatterns.push('does not use "lowkey"');
    if (!slangTerms.includes("yo"))
      avoidedPatterns.push('does not start with "yo"');
    if (!slangTerms.includes("hits different"))
      avoidedPatterns.push('does not use "hits different"');
    if (!slangTerms.includes("vibe/vibing"))
      avoidedPatterns.push('does not use "vibe/vibing"');
    if (!usesEmoji) avoidedPatterns.push("rarely or never uses emojis");
    if (exclamationUsage < 0.3)
      avoidedPatterns.push("minimal exclamation marks");
    if (questionFrequency < 0.1) avoidedPatterns.push("rarely asks questions");

    // === ENERGY LEVEL ===
    const energyLevel =
      exclamationUsage > 0.8
        ? "high"
        : exclamationUsage < 0.3
          ? "low"
          : "medium";

    return {
      avgLength,
      avgSentenceLength,
      uniqueWords,
      favoredAdjectives,
      slangTerms,
      technicalTerms,
      openingPatterns,
      closingPatterns,
      questionFrequency,
      usesEmoji,
      emojiStyle,
      usesProfanity,
      profanityWords,
      ellipsisUsage,
      exclamationUsage,
      capitalPattern,
      enthusiasmMarkers,
      cautionaryWords,
      fillerWords,
      avoidedPatterns,
      energyLevel,
    };
  }

  /**
   * Select 8-10 best examples that showcase different aspects of user's voice
   * Prioritizes diversity in: length, tone, structure, and content type
   */
  private selectBestExamples(casts: Cast[]): Cast[] {
    if (casts.length <= 10) return casts;

    const selected: Cast[] = [];
    const remaining = [...casts];

    // Helper function to score diversity
    const getDiversityScore = (cast: Cast): number => {
      let score = 0;

      // Length diversity
      const lengthBucket = Math.floor(cast.text.length / 50);
      const hasSimilarLength = selected.some((s) => {
        const sBucket = Math.floor(s.text.length / 50);
        return Math.abs(sBucket - lengthBucket) < 1;
      });
      if (!hasSimilarLength) score += 3;

      // Question vs statement
      const isQuestion = cast.text.includes("?");
      const hasQuestion = selected.some((s) => s.text.includes("?"));
      if (isQuestion !== hasQuestion) score += 2;

      // Emoji usage
      const hasEmoji = /[\p{Emoji}]/gu.test(cast.text);
      const selectedHasEmoji = selected.some((s) =>
        /[\p{Emoji}]/gu.test(s.text)
      );
      if (hasEmoji !== selectedHasEmoji) score += 2;

      // Exclamation points
      const exclamations = (cast.text.match(/!/g) || []).length;
      const exclamationBucket =
        exclamations > 2 ? "high" : exclamations > 0 ? "med" : "low";
      const hasSimilarEnergy = selected.some((s) => {
        const sExcl = (s.text.match(/!/g) || []).length;
        const sBucket = sExcl > 2 ? "high" : sExcl > 0 ? "med" : "low";
        return sBucket === exclamationBucket;
      });
      if (!hasSimilarEnergy) score += 2;

      // Starting pattern diversity
      const firstWord = cast.text.toLowerCase().split(/\s+/)[0];
      const hasFirstWord = selected.some(
        (s) => s.text.toLowerCase().split(/\s+/)[0] === firstWord
      );
      if (!hasFirstWord) score += 1;

      // Prefer medium-to-long casts (more informative)
      if (cast.text.length > 50) score += 1;

      return score;
    };

    // Select diverse examples
    while (selected.length < 10 && remaining.length > 0) {
      // Score all remaining casts
      const scored = remaining.map((cast, index) => ({
        cast,
        index,
        score: getDiversityScore(cast),
      }));

      // Sort by diversity score
      scored.sort((a, b) => b.score - a.score);

      // Add the most diverse
      if (scored.length > 0) {
        selected.push(scored[0].cast);
        remaining.splice(scored[0].index, 1);
      }
    }

    return selected;
  }

  /**
   * Generate highly specific style hints that capture what makes this user unique
   */
  private generateStyleHints(): string {
    if (!this.voiceProfile) return "";

    const hints: string[] = [];
    const vp = this.voiceProfile;

    // What makes them UNIQUE
    if (vp.uniqueWords.length > 0) {
      hints.push(
        `VOCABULARY: Uses words like "${vp.uniqueWords.slice(0, 5).join('", "')}"`
      );
    }

    if (vp.favoredAdjectives.length > 0) {
      hints.push(
        `DESCRIPTORS: Describes things as "${vp.favoredAdjectives.join('", "')}"`
      );
    }

    if (vp.slangTerms.length > 0) {
      hints.push(`SLANG: Uses "${vp.slangTerms.join('", "')}"`);
    } else {
      hints.push(`SLANG: Doesn't use typical internet slang`);
    }

    // Opening/closing patterns
    if (vp.openingPatterns.length > 0) {
      hints.push(
        `STARTS MESSAGES: "${vp.openingPatterns.slice(0, 3).join('" OR "')}"`
      );
    }

    if (vp.closingPatterns.length > 0) {
      hints.push(
        `ENDS MESSAGES: "${vp.closingPatterns.slice(0, 3).join('" OR "')}"`
      );
    }

    // Length preference
    if (vp.avgLength < 60) {
      hints.push(`LENGTH: Keeps it brief (under 60 chars typically)`);
    } else if (vp.avgLength > 120) {
      hints.push(`LENGTH: Writes longer messages (120+ chars)`);
    }

    // Energy and enthusiasm
    if (vp.enthusiasmMarkers.length > 0) {
      hints.push(
        `ENTHUSIASM: Shows excitement with ${vp.enthusiasmMarkers.slice(0, 3).join(", ")}`
      );
    } else if (vp.energyLevel === "low") {
      hints.push(`ENERGY: Low-key and understated - minimal exclamation marks`);
    }

    // Punctuation habits
    if (vp.capitalPattern === "lowercase") {
      hints.push(`CAPS: Writes in all lowercase`);
    } else if (vp.capitalPattern === "mixed") {
      hints.push(`CAPS: Uses capitals for EMPHASIS`);
    }

    if (vp.ellipsisUsage) {
      hints.push(`Uses ellipses...`);
    }

    if (vp.exclamationUsage > 0.8) {
      hints.push(`PUNCTUATION: Heavy use of !!!`);
    } else if (vp.exclamationUsage < 0.3) {
      hints.push(`PUNCTUATION: Rarely uses !`);
    }

    // Emoji
    if (vp.usesEmoji && vp.emojiStyle.length > 0) {
      hints.push(`EMOJI: Uses ${vp.emojiStyle.slice(0, 5).join(" ")}`);
    } else if (!vp.usesEmoji) {
      hints.push(`EMOJI: Rarely or never uses emojis`);
    }

    // Questions
    if (vp.questionFrequency > 0.3) {
      hints.push(`QUESTIONS: Asks questions frequently`);
    } else if (vp.questionFrequency < 0.1) {
      hints.push(`QUESTIONS: Rarely asks questions`);
    }

    // Filler words
    if (vp.fillerWords.length > 0) {
      hints.push(`FILLERS: Uses "${vp.fillerWords.slice(0, 3).join('", "')}"`);
    }

    // Cautionary words
    if (vp.cautionaryWords.length > 0) {
      hints.push(
        `HEDGING: Uses "${vp.cautionaryWords.slice(0, 3).join('", "')}"`
      );
    }

    // Profanity
    if (vp.usesProfanity && vp.profanityWords.length > 0) {
      hints.push(`PROFANITY: Uses ${vp.profanityWords.join(", ")}`);
    } else {
      hints.push(`PROFANITY: Does not use profanity`);
    }

    // CRITICAL: What they DON'T do
    if (vp.avoidedPatterns.length > 0) {
      hints.push(`⚠️ NEVER: ${vp.avoidedPatterns.slice(0, 5).join("; ")}`);
    }

    return hints.join("\n");
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

  /**
   * HAIKU-OPTIMIZED PROMPT WITH IMAGE SUPPORT
   * - XML tags for structure
   * - 8-10 clear examples
   * - Concise instructions
   * - Image analysis when available
   */
  async buildVoiceLearningPrompt(
    promotionContent: string,
    promotionAuthor: string,
    embedContext: EmbedContext[]
  ) {
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

    const styleHints = this.generateStyleHints();
    const antiPatterns = this.generateAntiPatterns();

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

    // Detect if user is promoting their own content
    const isSelfPromotion =
      promotionAuthor.toLowerCase() === this.username.toLowerCase();

    const systemContent = `You are ${this.username}. You must write EXACTLY like them - not like a generic internet user, and especially NOT like an AI.

CRITICAL: Match ${this.username}'s VOICE and STYLE from the examples below, but write DIFFERENT CONTENT than the original promotion.

<examples>
${this.topExamples.map((cast, i) => `<example${i + 1}>${cast.text}</example${i + 1}>`).join("\n")}
</examples>

<voice_requirements>
${styleHints}
</voice_requirements>

<phrases_never_used>
${this.username} NEVER uses:
${antiPatterns.map((p) => `- ${p}`).join("\n")}
</phrases_never_used>

<critical_rules>
VOICE MATCHING (match these from examples):
1. Copy STYLE: words, phrases, and speech patterns ${this.username} uses
2. Copy STRUCTURE: how they build sentences
3. Copy PUNCTUATION: their use of !, ?, ...
4. Copy CAPITALIZATION: uppercase? lowercase? mixed?
5. Copy LENGTH: examples average ${Math.round(this.voiceProfile?.avgLength || 100)} chars
6. Copy OPENINGS: how they start messages
7. Copy TONE/ENERGY: formal? casual? hyped?
8. Copy SLANG: which terms they actually use

CONTENT RULES (what you write about):
9. DO NOT repeat the original promotion text
10. DO NOT paraphrase the original promotion
11. ADD something new: your reaction, advice, emphasis, or take
12. NO generic internet speak unless it's in the examples
13. NO bot language ("actually solid", "kind of X that separates Y from Z")
14. Write as if you ARE ${this.username}, not mimicking them
</critical_rules>

<restrictions>
${
  isSelfPromotion
    ? `SELF-PROMOTION MODE:
- You're quote-casting YOUR OWN content
- MANDATORY: Write NEW content, not a copy of the original
- The original promotion will be embedded (users can see it)
- Your job: Add value on top of the original

WHAT TO ADD:
✅ General reactions: "this is important", "be careful", "yall need to see this"
✅ Related advice: "audit your code", "do your research", "stay vigilant"  
✅ Emphasis/expansion: why it matters, what to do about it
✅ Your perspective: how you feel, your take on it

EXAMPLE TRANSFORMATIONS:
Original: "saw bad code, stay safe"
❌ WRONG: "saw bad code, stay safe" (just copying)
❌ WRONG: "just saw bad code, everyone stay safe out there" (paraphrasing)
✅ RIGHT: "seriously audit your code before deploying" (new advice in your voice)
✅ RIGHT: "this is why you dont skip security reviews" (new take in your voice)

Original: "Just saw quite possibly the worst smart contract ever written. Stay safe out there"
❌ WRONG: "Just saw quite possibly the worst smart contract ever written" (copying)
❌ WRONG: "saw the worst smart contract ever, be safe" (paraphrasing) 
✅ RIGHT: "always get your contracts audited before deployment" (advice in your voice)
✅ RIGHT: "this is exactly why code reviews matter" (reaction in your voice)
✅ RIGHT: "do not deploy without proper testing yall" (warning in your voice)

WHAT NOT TO ADD:
❌ Specific timelines: "been working on this for weeks"
❌ Made-up numbers: "found 10 bugs", "$50k raised"
❌ Fabricated stories: "client asked for this"
❌ Made-up technical details not in original
❌ Invented names, dates, or events

Think: The original says WHAT happened. You add WHY it matters or WHAT to do.`
    : `PROMOTING OTHERS:
- You're replying to @${promotionAuthor}'s post
- You're recommending someone else's content to your followers
- React to what's actually there, add your genuine take
- DO NOT invent facts about their content`
}

- Your writing must be DISTINCTIVE to ${this.username}, not generic
- Only use words, phrases, and patterns that ${this.username} actually uses (see examples)
- Never invent URLs
- Under 280 characters
- Make it sound like a genuine ${isSelfPromotion ? "self-boost" : "recommendation"} from ${this.username}, not an ad
- Do not mention that AI is involved in creating this
- Do not use dashes or em dashes
- Do NOT default to generic phrases like "yo", "fr", "lowkey", "fire", "hits different" UNLESS ${this.username} actually uses them (check examples and voice patterns)
- If ${this.username} has a specific way of opening or closing messages, use it

CRITICAL - AVOID BOT LANGUAGE:
- NO "actually [adjective]" (e.g. "actually solid", "actually good")
- NO formulaic phrases like "the kind of X that separates Y from Z"
- NO "coming together", "worth noting", "kudos to", "shout out"
- NO "truly", "remarkable", "testament to", "showcases", "demonstrates"
- NO corporate speak or marketing language
- Write like a HUMAN who genuinely likes something, not like AI trying to sound casual
</restrictions>`;

    const textContent = `<task>Write a ${isSelfPromotion ? "quote cast promoting your own content" : "reply to promote this content"}. Write EXACTLY like ${this.username} would - not close, EXACTLY.</task>

<content>
${promotionContent}
</content>

<author>
${isSelfPromotion ? "Original Author: YOU (@" + this.username + ") - you're promoting your own content" : "Original Author: @" + promotionAuthor + " - you're promoting someone else's content"}
</author>

${additionalContext ? `<context>\n${additionalContext}\n</context>` : ""}
${contextUrl ? `<url>${contextUrl}</url>` : ""}
${imageDataArray.length > 0 ? `<image_note>${imageDataArray.length} image(s) attached. Analyze and reference them naturally in your reply if relevant.</image_note>` : ""}

<critical_matching_instructions>
TWO-STEP PROCESS:

STEP 1 - MATCH THE VOICE (from examples):
Study the examples above and REPLICATE the STYLE:
1. WORDS/PHRASES ${this.username} uses (their vocabulary)
2. SENTENCE STRUCTURES (how they build sentences)
3. PUNCTUATION (!, ?, ...)
4. CAPITALIZATION (uppercase? lowercase? mixed?)
5. LENGTH (~${Math.round(this.voiceProfile?.avgLength || 100)} characters typical)
6. OPENING STYLE (how do they start messages?)
7. TONE/ENERGY (formal? casual? hyped?)
8. SLANG USAGE (which terms do they actually use?)

STEP 2 - WRITE NEW CONTENT (don't copy original):
${
  isSelfPromotion
    ? `FOR SELF-PROMOTION - CRITICAL:
The original promotion is shown below. DO NOT repeat it or paraphrase it.
Instead, ADD NEW VALUE in ${this.username}'s voice:

APPROACH:
- Original states the WHAT → You add the WHY or WHAT TO DO
- Original: "saw bad code" → You: "audit before deploying" 
- Original: "stay safe" → You: "do your research first"
- Original describes a problem → You give advice about it
- Original makes a claim → You emphasize why it matters

YOUR NEW CONTENT must:
✅ Add advice, reaction, emphasis, or your take
✅ Use ${this.username}'s vocabulary and style from examples
✅ Be under 280 characters
✅ Sound like ${this.username} expanding on their point

❌ DO NOT repeat the original text
❌ DO NOT paraphrase the original text
❌ DO NOT just rearrange the words from the original`
    : `FOR PROMOTING OTHERS:
- Add your genuine reaction or recommendation
- Use ${this.username}'s voice from examples
- DO NOT invent facts about their content`
}

REMEMBER: Match the VOICE from examples, write DIFFERENT CONTENT than the original.
This should read like ${this.username} wrote it themselves - their STYLE, but NEW thoughts.
</critical_matching_instructions>

<o>Only the cast text. Make it unmistakably ${this.username}'s voice.</o>`;

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
    if (this.topExamples.length === 0) return;
    try {
      const warmupExample = this.topExamples[0];
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
    promotionContent: string,
    promotionAuthor: string,
    embedContext: EmbedContext[],
    options?: GenerationOptions
  ): Promise<GenerationResult> {
    try {
      if (this.topExamples.length === 0) {
        return {
          success: false,
          error: "No suitable casts found for voice training",
          model: "claude-haiku-4-5-20251001",
        };
      }

      // Quick warmup
      await this.performVoiceWarmup();

      const messages = await this.buildVoiceLearningPrompt(
        promotionContent,
        promotionAuthor,
        embedContext
      );

      const result = await generateText({
        model: this.fastModel,
        messages,
        temperature: 0.85, // Higher to encourage creative additions beyond the original
        frequencyPenalty: 0.3, // Moderate to discourage repeating original phrases
        presencePenalty: 0.2, // Moderate to encourage new vocabulary
        maxRetries: 1,
        abortSignal: AbortSignal.timeout(15000),
      });

      let castText = this.extractCastFromResponse(result.text);
      castText = this.postProcessCast(castText);

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
    promotionContent: string,
    promotionAuthor: string,
    embedContext: EmbedContext[],
    userFeedback: string,
    previousCast: string,
    options?: GenerationOptions
  ): Promise<GenerationResult> {
    try {
      if (this.topExamples.length === 0) {
        return {
          success: false,
          error: "No suitable casts found for voice training",
          model: "claude-haiku-4-5-20251001",
        };
      }

      const baseMessages = await this.buildVoiceLearningPrompt(
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

<o>Only the revised cast</o>`,
        },
      ];

      const result = await generateText({
        model: this.fastModel,
        messages,
        temperature: options?.temperature || 0.85, // Higher for creative additions
        frequencyPenalty: 0.3, // Discourage repeating phrases
        presencePenalty: 0.2, // Encourage new vocabulary
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

  /**
   * HAIKU-OPTIMIZED: Generate variations with image support
   * - Temperature variation for diversity
   * - Shared warmup
   */
  async generateVariations(
    count: number = 3,
    promotionContent: string,
    promotionAuthor: string,
    embedContext: EmbedContext[]
  ): Promise<GenerationResult[]> {
    const variations: GenerationResult[] = [];

    if (this.topExamples.length === 0) {
      return [
        {
          success: false,
          error: "No suitable casts found for voice training",
          model: "claude-haiku-4-5-20251001",
        },
      ];
    }

    // Single warmup for all variations
    await this.performVoiceWarmup();

    for (let i = 0; i < count; i++) {
      try {
        const messages = await this.buildVoiceLearningPrompt(
          promotionContent,
          promotionAuthor,
          embedContext
        );

        // Vary temperature slightly: 0.65, 0.70, 0.75
        const temperature = 0.65 + i * 0.05;

        const result = await generateText({
          model: this.fastModel,
          messages,
          temperature,
          frequencyPenalty: 0.05, // Very low - we want tight style matching
          presencePenalty: 0.05, // Very low - we want pattern reuse
          maxRetries: 1,
          abortSignal: AbortSignal.timeout(15000),
        });

        let castText = this.extractCastFromResponse(result.text);
        castText = this.postProcessCast(castText);

        variations.push({
          success: true,
          text: castText,
          model: "claude-haiku-4-5-20251001",
          generationType: "variation",
          variationIndex: i,
        });
      } catch (error) {
        variations.push({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          model: "claude-haiku-4-5-20251001",
          variationIndex: i,
        });
      }
    }

    return variations;
  }

  /**
   * Detect bot-like language patterns
   */
  private detectBotLanguage(text: string): string[] {
    const botPatterns: string[] = [];
    const lowerText = text.toLowerCase();

    // AI filler words
    if (
      /\bactually\s+(solid|good|cool|nice|great|awesome|amazing|fire|dope)/i.test(
        text
      )
    ) {
      botPatterns.push('uses "actually [adjective]" pattern');
    }

    // Formulaic phrases
    const formulaicPhrases = [
      /the kind of .{5,30} that separates .{5,30} from/i,
      /coming together (real |really )?nice/i,
      /worth noting/i,
      /have to say/i,
      /can't help but/i,
      /kudos to/i,
      /shout out to/i,
      /testament to/i,
    ];

    formulaicPhrases.forEach((pattern) => {
      if (pattern.test(text)) {
        botPatterns.push(
          `uses formulaic phrase: "${text.match(pattern)?.[0]}"`
        );
      }
    });

    // Corporate/marketing language
    const corporateWords = [
      "showcases",
      "demonstrates",
      "revolutionary",
      "paradigm",
      "seamless",
      "cutting-edge",
      "innovative solution",
      "comprehensive approach",
      "user-friendly",
      "state-of-the-art",
    ];

    corporateWords.forEach((word) => {
      if (lowerText.includes(word)) {
        botPatterns.push(`uses corporate language: "${word}"`);
      }
    });

    // Overly enthusiastic AI phrases
    const aiEnthusiasm = [
      "truly remarkable",
      "absolutely incredible",
      "genuinely impressed",
      "cannot emphasize enough",
      "highly recommend",
    ];

    aiEnthusiasm.forEach((phrase) => {
      if (lowerText.includes(phrase)) {
        botPatterns.push(`uses AI enthusiasm: "${phrase}"`);
      }
    });

    return botPatterns;
  }

  /**
   * Generate anti-patterns - common AI phrases that this user never uses
   */
  private generateAntiPatterns(): string[] {
    const antiPatterns: string[] = [];
    const allText = this.topExamples
      .map((c) => c.text)
      .join(" ")
      .toLowerCase();

    // Common AI patterns to check against user's actual text
    const commonAiPatterns = [
      { phrase: "actually", reason: "filler word that sounds robotic" },
      { phrase: "the kind of", reason: "formulaic structure" },
      { phrase: "separates", reason: "comparison template language" },
      { phrase: "coming together", reason: "generic progress phrase" },
      { phrase: "worth noting", reason: "AI meta-commentary" },
      { phrase: "kudos", reason: "corporate congratulations" },
      { phrase: "shout out", reason: "unless used naturally" },
      { phrase: "truly", reason: "emphasis filler" },
      { phrase: "remarkable", reason: "formal praise" },
      { phrase: "testament", reason: "overly formal" },
      { phrase: "showcases", reason: "marketing speak" },
      { phrase: "demonstrates", reason: "technical/formal" },
      { phrase: "elevated", reason: "pretentious descriptor" },
      { phrase: "seamless", reason: "corporate jargon" },
    ];

    commonAiPatterns.forEach(({ phrase, reason }) => {
      // If user doesn't use this phrase, add it to anti-patterns
      if (!allText.includes(phrase)) {
        antiPatterns.push(`"${phrase}" (${reason})`);
      }
    });

    return antiPatterns.slice(0, 8); // Top 8 most important
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

    // AI markers and bot-like language
    const botPatterns = this.detectBotLanguage(castText);
    if (botPatterns.length > 0) {
      issues.push(`Contains bot language: ${botPatterns[0]}`); // Report first issue found
    }

    // Basic AI markers
    const basicAiMarkers = [
      "as an ai",
      "i am an ai",
      "i cannot",
      "i apologize",
    ];
    if (basicAiMarkers.some((m) => castText.toLowerCase().includes(m))) {
      issues.push("Contains explicit AI markers");
    }

    // Generic promotional/corporate language
    const genericMarkers = [
      "excited to share",
      "won't want to miss",
      "game-changer",
      "game changer",
      "revolutionary",
      "paradigm shift",
      "seamless experience",
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
  /**
   * Debug method to inspect the voice profile
   */
  getVoiceProfileDebug(): any {
    if (!this.voiceProfile) {
      return { error: "Voice profile not initialized" };
    }

    return {
      username: this.username,
      totalCasts: this.user_casts.length,
      exampleCount: this.topExamples.length,
      profile: {
        avgLength: this.voiceProfile.avgLength,
        slangTerms: this.voiceProfile.slangTerms,
        uniqueWords: this.voiceProfile.uniqueWords.slice(0, 10),
        usesProfanity: this.voiceProfile.usesProfanity,
        profanityWords: this.voiceProfile.profanityWords,
        openingPatterns: this.voiceProfile.openingPatterns.slice(0, 5),
        usesEmoji: this.voiceProfile.usesEmoji,
        emojiStyle: this.voiceProfile.emojiStyle,
        avoidedPatterns: this.voiceProfile.avoidedPatterns.slice(0, 5),
      },
      sampleCasts: this.topExamples.slice(0, 3).map((c) => c.text),
    };
  }

  /**
   * Check if voice profile is properly initialized
   */
  isInitialized(): boolean {
    return (
      this.voiceProfile !== null &&
      this.topExamples.length > 0 &&
      this.user_casts.length > 0
    );
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
      if (this.topExamples.length === 0) {
        return {
          success: false,
          error: "No suitable casts found for voice training",
          model: "claude-haiku-4-5-20251001",
        };
      }

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
</requirements>

<output_format>
Return only the promotional cast text, nothing else.
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
