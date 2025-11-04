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

// Voice Pattern Analysis Types and Class
interface VoicePattern {
  sentenceStructures: string[];
  openingPatterns: string[];
  reactionWords: string[];
  punctuationStyle: {
    usesPeriods: boolean;
    usesEllipsis: boolean;
    usesExclamation: boolean;
    usesQuestionMarks: boolean;
    multipleMarks: boolean;
  };
  emojiPatterns: {
    emojis: string[];
    frequency: 'never' | 'rarely' | 'sometimes' | 'often';
    placement: 'start' | 'end' | 'middle' | 'mixed';
  };
  sentenceLength: {
    average: number;
    style: 'short' | 'mixed' | 'long';
  };
  vocabulary: {
    slangTerms: string[];
    technicalTerms: string[];
    fillerWords: string[];
    intensifiers: string[];
  };
  capitalization: 'standard' | 'all-lowercase' | 'random' | 'emphasis';
  tweetStyle: 'single-line' | 'multi-line' | 'thread-like';
}

class VoiceAnalyzer {
  private topCasts: Array<{ text: string; embeds: Embed[] }>;
  private userReplies: Array<{ text: string; embeds: Embed[] }>;
  
  constructor(
    topCasts: Array<{ text: string; embeds: Embed[] }>, 
    userReplies: Array<{ text: string; embeds: Embed[] }>
  ) {
    this.topCasts = topCasts;
    this.userReplies = userReplies;
  }

  analyzeVoicePatterns(): VoicePattern {
    const allPosts = [...this.topCasts, ...this.userReplies].map(c => c.text);
    
    return {
      sentenceStructures: this.extractSentenceStructures(allPosts),
      openingPatterns: this.extractOpeningPatterns(allPosts),
      reactionWords: this.extractReactionWords(allPosts),
      punctuationStyle: this.analyzePunctuation(allPosts),
      emojiPatterns: this.analyzeEmojis(allPosts),
      sentenceLength: this.analyzeSentenceLength(allPosts),
      vocabulary: this.extractVocabulary(allPosts),
      capitalization: this.analyzeCapitalization(allPosts),
      tweetStyle: this.analyzeTweetStyle(allPosts)
    };
  }

  private extractSentenceStructures(posts: string[]): string[] {
    const structures = new Set<string>();
    
    posts.forEach(post => {
      const sentences = post.split(/[.!?]+/).filter(s => s.trim());
      sentences.forEach(sentence => {
        const trimmed = sentence.trim();
        if (trimmed.length > 10 && trimmed.length < 100) {
          const structure = this.generalizeStructure(trimmed);
          if (structure) structures.add(structure);
        }
      });
    });

    return Array.from(structures).slice(0, 5);
  }

  private generalizeStructure(sentence: string): string {
    const patterns = [
      { regex: /^this is \w+/i, pattern: "this is [REACTION]" },
      { regex: /^finally\s/i, pattern: "finally [OBSERVATION]" },
      { regex: /^just \w+/i, pattern: "just [VERB/ADJ]" },
      { regex: /^been \w+ing/i, pattern: "been [VERB]ing" },
      { regex: /^love (that|when|how)/i, pattern: "love [CLAUSE]" },
      { regex: /^the fact that/i, pattern: "the fact that [OBSERVATION]" },
      { regex: /^wondering if/i, pattern: "wondering if [QUESTION]" },
      { regex: /^imagine if/i, pattern: "imagine if [SCENARIO]" },
      { regex: /^wait,?\s/i, pattern: "wait, [REALIZATION]" },
      { regex: /^okay but/i, pattern: "okay but [COUNTER]" },
      { regex: /^so basically/i, pattern: "so basically [SUMMARY]" }
    ];

    for (const { regex, pattern } of patterns) {
      if (regex.test(sentence)) return pattern;
    }

    return null;
  }

  private extractOpeningPatterns(posts: string[]): string[] {
    const openings = new Map<string, number>();
    
    posts.forEach(post => {
      // Get first 2-4 words as opening pattern
      const words = post.split(/\s+/);
      if (words.length > 0) {
        // Try different lengths
        const twoWord = words.slice(0, 2).join(' ').toLowerCase();
        const threeWord = words.slice(0, 3).join(' ').toLowerCase();
        
        if (twoWord.length < 20) {
          openings.set(twoWord, (openings.get(twoWord) || 0) + 1);
        }
        if (threeWord.length < 30) {
          openings.set(threeWord, (openings.get(threeWord) || 0) + 1);
        }
      }
    });

    return Array.from(openings.entries())
      .filter(([_, count]) => count > 1) // Only patterns used more than once
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern]) => pattern);
  }

  private extractReactionWords(posts: string[]): string[] {
    const reactions = new Set<string>();
    const reactionRegex = /\b(wild|cool|dope|sick|fire|based|crazy|insane|huge|massive|solid|clean|fresh|nice|awesome|great|amazing|interesting|fascinating|bullish|bearish|vibes?|slaps?|bangs?|hits?|goated|peak|mid|bussin|facts|real|legit|valid)\b/gi;
    
    posts.forEach(post => {
      const matches = post.match(reactionRegex);
      if (matches) {
        matches.forEach(match => reactions.add(match.toLowerCase()));
      }
    });

    return Array.from(reactions);
  }

  private analyzePunctuation(posts: string[]): VoicePattern['punctuationStyle'] {
    let periods = 0, ellipsis = 0, exclamation = 0, questions = 0, multiple = 0;
    
    posts.forEach(post => {
      if (post.match(/\.\s/)) periods++;
      if (post.match(/\.{2,}/)) ellipsis++;
      if (post.includes('!')) exclamation++;
      if (post.includes('?')) questions++;
      if (post.match(/[!?]{2,}/)) multiple++;
    });

    const total = Math.max(posts.length, 1);
    
    return {
      usesPeriods: periods > total * 0.3,
      usesEllipsis: ellipsis > total * 0.15,
      usesExclamation: exclamation > total * 0.2,
      usesQuestionMarks: questions > total * 0.15,
      multipleMarks: multiple > total * 0.1
    };
  }

  private analyzeEmojis(posts: string[]): VoicePattern['emojiPatterns'] {
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]/gu;
    const emojis = new Map<string, number>();
    let totalWithEmoji = 0;
    let placements = { start: 0, end: 0, middle: 0 };
    
    posts.forEach(post => {
      const matches = post.match(emojiRegex);
      if (matches) {
        totalWithEmoji++;
        matches.forEach(emoji => {
          emojis.set(emoji, (emojis.get(emoji) || 0) + 1);
        });
        
        // Check placement
        const firstEmoji = post.search(emojiRegex);
        const lastEmoji = post.lastIndexOf(matches[matches.length - 1]);
        
        if (firstEmoji === 0) {
          placements.start++;
        } else if (lastEmoji === post.length - matches[matches.length - 1].length) {
          placements.end++;
        } else if (firstEmoji > 0) {
          placements.middle++;
        }
      }
    });

    const ratio = posts.length > 0 ? totalWithEmoji / posts.length : 0;
    const frequency = ratio === 0 ? 'never' : 
                     ratio < 0.2 ? 'rarely' : 
                     ratio < 0.5 ? 'sometimes' : 'often';
    
    const maxPlacement = Math.max(placements.start, placements.end, placements.middle);
    const placement = maxPlacement === 0 ? 'mixed' :
                     maxPlacement === placements.end ? 'end' :
                     maxPlacement === placements.start ? 'start' :
                     maxPlacement === placements.middle ? 'middle' : 'mixed';

    return {
      emojis: Array.from(emojis.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([emoji]) => emoji),
      frequency,
      placement
    };
  }

  private analyzeSentenceLength(posts: string[]): VoicePattern['sentenceLength'] {
    const lengths: number[] = [];
    
    posts.forEach(post => {
      const words = post.split(/\s+/).filter(w => w.length > 0).length;
      lengths.push(words);
    });

    const average = lengths.length > 0 
      ? lengths.reduce((a, b) => a + b, 0) / lengths.length 
      : 20;
    
    const style = average < 20 ? 'short' : average < 40 ? 'mixed' : 'long';

    return { average: Math.round(average), style };
  }

  private extractVocabulary(posts: string[]): VoicePattern['vocabulary'] {
    const slangRegex = /\b(lol|lmao|rofl|ngl|tbh|imo|imho|afaik|fwiw|gm|gn|ngmi|wagmi|lfg|iykyk|degens?|alpha|cope|hopium|moon|pump|dump|rug|rekt|ser|fren|anon|chad|noob|normie|pleb|whale|hodl|diamond hands|paper hands|ape|gmi|probably nothing|few understand|up only|down bad|touch grass)\b/gi;
    const intensifierRegex = /\b(really|actually|literally|totally|absolutely|definitely|seriously|genuinely|truly|extremely|super|very|quite|pretty|so|mega|ultra|hella)\b/gi;
    const fillerRegex = /\b(like|just|kinda|sorta|maybe|probably|basically|essentially|apparently|obviously|clearly|honestly|lowkey|highkey)\b/gi;
    
    const slang = new Set<string>();
    const intensifiers = new Set<string>();
    const fillers = new Set<string>();

    posts.forEach(post => {
      const slangMatches = post.match(slangRegex);
      const intensifierMatches = post.match(intensifierRegex);
      const fillerMatches = post.match(fillerRegex);
      
      if (slangMatches) slangMatches.forEach(s => slang.add(s.toLowerCase()));
      if (intensifierMatches) intensifierMatches.forEach(i => intensifiers.add(i.toLowerCase()));
      if (fillerMatches) fillerMatches.forEach(f => fillers.add(f.toLowerCase()));
    });

    return {
      slangTerms: Array.from(slang),
      technicalTerms: [], // Could be expanded with domain-specific detection
      fillerWords: Array.from(fillers),
      intensifiers: Array.from(intensifiers)
    };
  }

  private analyzeCapitalization(posts: string[]): VoicePattern['capitalization'] {
    let allLower = 0, standard = 0, random = 0, emphasis = 0;
    
    posts.forEach(post => {
      const hasUppercase = /[A-Z]/.test(post);
      const startsCapital = /^[A-Z]/.test(post);
      const hasAllCaps = /\b[A-Z]{2,}\b/.test(post);
      
      if (!hasUppercase) {
        allLower++;
      } else if (hasAllCaps) {
        emphasis++;
      } else if (startsCapital && !post.match(/[A-Z]/g)?.slice(1).length) {
        standard++;
      } else {
        random++;
      }
    });

    const max = Math.max(allLower, standard, random, emphasis);
    return max === allLower ? 'all-lowercase' : 
           max === standard ? 'standard' : 
           max === emphasis ? 'emphasis' : 'random';
  }

  private analyzeTweetStyle(posts: string[]): VoicePattern['tweetStyle'] {
    let singleLine = 0, multiLine = 0, threadLike = 0;
    
    posts.forEach(post => {
      const lineCount = post.split('\n').length;
      if (lineCount === 1) {
        singleLine++;
      } else if (lineCount > 3) {
        threadLike++;
      } else {
        multiLine++;
      }
    });

    const max = Math.max(singleLine, multiLine, threadLike);
    return max === threadLike ? 'thread-like' :
           max === multiLine ? 'multi-line' : 'single-line';
  }

  formatVoiceInstructions(pattern: VoicePattern): string {
    const instructions: string[] = [];

    // Add sentence structures if found
    if (pattern.sentenceStructures.length > 0) {
      instructions.push(`Common patterns: ${pattern.sentenceStructures.slice(0, 3).join(', ')}`);
    }

    // Add opening patterns if consistent
    if (pattern.openingPatterns.length > 0) {
      instructions.push(`Often starts with: "${pattern.openingPatterns[0]}" or "${pattern.openingPatterns[1] || pattern.openingPatterns[0]}"`);
    }

    // Add reaction words if they use them
    if (pattern.reactionWords.length > 0) {
      const topReactions = pattern.reactionWords.slice(0, 5);
      instructions.push(`Reactions: ${topReactions.join(', ')}`);
    }

    // Punctuation style
    const punctuation: string[] = [];
    if (pattern.punctuationStyle.usesEllipsis) punctuation.push('uses ...');
    if (pattern.punctuationStyle.multipleMarks) punctuation.push('uses !!! or ???');
    if (!pattern.punctuationStyle.usesPeriods) punctuation.push('rarely uses periods');
    if (pattern.punctuationStyle.usesExclamation) punctuation.push('uses !');
    if (punctuation.length > 0) {
      instructions.push(`Punctuation: ${punctuation.join(', ')}`);
    }

    // Emoji usage
    if (pattern.emojiPatterns.frequency !== 'never' && pattern.emojiPatterns.emojis.length > 0) {
      instructions.push(`${pattern.emojiPatterns.frequency === 'often' ? 'Often uses' : 
                         pattern.emojiPatterns.frequency === 'sometimes' ? 'Sometimes uses' : 
                         'Rarely uses'} emojis: ${pattern.emojiPatterns.emojis.join(' ')}`);
    }

    // Vocabulary style
    if (pattern.vocabulary.slangTerms.length > 0) {
      instructions.push(`Slang: ${pattern.vocabulary.slangTerms.slice(0, 5).join(', ')}`);
    }
    if (pattern.vocabulary.fillerWords.length > 0) {
      instructions.push(`Filler words: ${pattern.vocabulary.fillerWords.slice(0, 3).join(', ')}`);
    }

    // Capitalization
    if (pattern.capitalization === 'all-lowercase') {
      instructions.push('Writes in all lowercase');
    } else if (pattern.capitalization === 'emphasis') {
      instructions.push('Uses CAPS for emphasis');
    }

    // Length
    instructions.push(`Average length: ~${pattern.sentenceLength.average} words`);

    // Style
    if (pattern.tweetStyle === 'multi-line') {
      instructions.push('Often uses line breaks');
    }

    return instructions.join('\n');
  }
}

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
    // Fetch existing quotes
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

    // Analyze voice patterns
    const analyzer = new VoiceAnalyzer(this.topCasts, this.userReplies);
    const voicePattern = analyzer.analyzeVoicePatterns();
    const voiceInstructions = analyzer.formatVoiceInstructions(voicePattern);

    // Build context
    const contextParts: string[] = [];
    for (const embed of embedContext) {
      if (embed.url) contextParts.push(`url: ${embed.url}`);
      if (embed.cast?.text) {
        const castAuthor = embed.cast.author?.username || "unknown";
        contextParts.push(`embedded cast by @${castAuthor}: "${embed.cast.text}"`);
      }
      if (embed.metadata?.frame?.title) {
        contextParts.push(`frame: ${embed.metadata.frame.title}`);
      }
    }

    const additionalContext = contextParts.length > 0 ? contextParts.join("\n") : "";

    // Handle images
    const imageUrls = this.extractImageFromEmbeds(embedContext);
    const imageDataArray: string[] = [];
    for (const imageUrl of imageUrls) {
      const imageData = await this.fetchImageAsBase64(imageUrl);
      if (imageData) {
        const compressedImage = await this.compressImageIfNeeded(imageData);
        imageDataArray.push(compressedImage);
      }
    }

    // Get trending context if available
    const trending_sentiment_summary = await redis.get("trending:summary");

    // SIMPLIFIED SYSTEM PROMPT
    const systemContent = `You are @${this.username} quote casting on Farcaster.

Voice patterns:
${voiceInstructions}

Your recent posts:
${this.topCasts.slice(0, 3).map((cast) => `"${cast.text}"`).join("\n")}

Bio: ${this.userBio}

${sanitizedExistingQuotes.length > 0 ? `
Others already quoted this - avoid these angles:
${sanitizedExistingQuotes.slice(0, 3).map((quote) => {
  const preview = quote.text.substring(0, 60);
  return `- ${preview}${quote.text.length > 60 ? '...' : ''}`;
}).join("\n")}` : ''}

${trending_sentiment_summary ? `Current vibe: ${trending_sentiment_summary}` : ''}

Write a quote cast under 280 chars.`;

    // SIMPLIFIED USER PROMPT
    const userContent: any[] = [];

    // Add images first if available
    for (const imageData of imageDataArray) {
      userContent.push({
        type: "image",
        image: imageData,
      });
    }

    // Add text - much simpler
    const isOwnContent = this.username === promotionAuthor;
    userContent.push({
      type: "text",
      text: `@${promotionAuthor}${isOwnContent ? ' (you)' : ''} posted:

"${promotionContent}"

${additionalContext ? `Context: ${additionalContext}\n` : ''}
${imageDataArray.length > 0 ? `[${imageDataArray.length} image(s) attached]\n` : ''}

Write your quote cast.${isOwnContent ? ' Reference it as your own content.' : ' React to their post.'}

Output only the quote cast text.`
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
    try {
      if (this.topCasts.length === 0) return;
      
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
        temperature: options?.temperature || 0.95,
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

      const messages = [
        ...baseMessages,
        {
          role: "assistant" as const,
          content: previousCast,
        },
        {
          role: "user" as const,
          content: `Feedback: ${userFeedback}

Rewrite the quote cast addressing this feedback. Stay under 280 chars.
Output only the new quote cast text.`,
        },
      ];

      const result = await generateText({
        model: this.fastModel,
        messages,
        temperature: options?.temperature || 0.85,
        frequencyPenalty: 0.4,
        presencePenalty: 0.4,
        maxRetries: 2,
        abortSignal: AbortSignal.timeout(20000),
      });

      let castText = this.extractCastFromResponse(result.text);
      castText = this.postProcessCast(castText);

      return {
        success: true,
        text: castText,
        model: "claude-sonnet-4-5-20250929",
        generationType: "refinement",
        originalCast: previousCast,
        feedback: userFeedback,
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
        model: this.fastModel,
        messages,
        temperature: 0.9,
        frequencyPenalty: 0.3,
        presencePenalty: 0.2,
        maxRetries: 2,
        abortSignal: AbortSignal.timeout(15000),
      });

      let promotionalText = this.extractCastFromResponse(result.text);
      promotionalText = this.postProcessCast(promotionalText);

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
