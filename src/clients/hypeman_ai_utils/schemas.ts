
import { z } from 'zod';

export const UserProfileSchema = z.object({
  fid: z.string().describe("The farcaster FID of the user"),
  username: z.string().describe("The username of the user"),
  location: z.string().nullable().describe("The location of the user from their profile if available otherwise null"),
  bio: z.string().nullable().describe("Their actual bio text, unedited"),
  follower_count: z.number().describe("The user's follower count"),
  character_description: z.string().describe("A brief description of the user's character/personality based on their bio and profile"),
});

export const TopPostsSummarySchema = z.object({
  raw_examples: z.array(z.string()).describe("5-7 complete, unedited posts - their actual words"),
  
  // WHO they are (persona)
  persona: z.object({
    tone: z.string().describe("Their overall tone: sarcastic, earnest, skeptical, enthusiastic, etc"),
    attitude: z.string().describe("Their general attitude: optimistic, cynical, playful, serious, etc"),
    energy_level: z.enum(['high', 'medium', 'low']).describe("How much energy/excitement they typically show"),
  }),
  
  // HOW they write (mechanics)
  writing_patterns: z.object({
    typical_length_range: z.string().describe("Character count range like '10-30 chars' or '50-100 chars'"),
    sentence_structure: z.enum(['complete_sentences', 'fragments', 'run_ons', 'mixed']).describe("How they structure sentences"),
    capitalization: z.enum(['standard', 'all_lowercase', 'all_uppercase', 'random']).describe("Capitalization patterns"),
    punctuation_style: z.string().describe("Uses periods? Only emoji? No punctuation? Ellipses?"),
    emoji_usage: z.string().describe("Heavy emoji user? Specific emoji? None?"),
    signature_phrases: z.array(z.string()).describe("Exact phrases they use repeatedly"),
    never_uses: z.array(z.string()).describe("Words/phrases they NEVER say"),
  }),
  
  topics: z.array(z.string()).describe("Main topics they post about"),
});

export const RepliesSummarySchema = z.object({
  raw_examples: z.array(z.string()).describe("5-7 actual replies, unedited"),
  
  // WHO they are in conversations
  persona: z.object({
    disposition: z.string().describe("How they come across: helpful, contrarian, supportive, challenging, etc"),
    engagement_style: z.string().describe("How they engage: builds on ideas, asks questions, gives advice, jokes around, etc"),
  }),
  
  // HOW they write replies
  engagement_patterns: z.object({
    typical_length: z.string().describe("How long their replies usually are"),
    starts_with: z.array(z.string()).describe("How they typically open replies"),
    formality_level: z.enum(['very_casual', 'casual', 'neutral', 'formal']).describe("How formal they are in replies"),
    uses_questions: z.boolean().describe("Do they ask questions in replies?"),
    uses_agreement_words: z.array(z.string()).describe("How they agree: 'yes', 'fr', 'facts', etc"),
  }),
});

export const ExistingQuoteCastSchema = z.object({
  examples: z.array(z.string()).describe("Existing quote casts for this promotion"),
  overused_phrases: z.array(z.string()).describe("Phrases already used - avoid these"),
  average_length: z.number().describe("Average character count of existing casts"),
  common_tone: z.string().describe("The tone used in existing quote casts for this promotion"),
});

export const PromotionImageAnalysisSchema = z.object({
  what_it_shows: z.string().describe("Literal description of what's in the image"),
  mention_in_cast: z.boolean().describe("Should the cast reference the image content?"),
});

export const PromotionAnalysisSchema = z.object({
  what_it_is: z.string().describe("Factual summary of what's being promoted"),
  creator_username: z.string().describe("Username of the promotion creator"),
  why_interesting: z.string().describe("Why someone might care about this"),
  key_details: z.array(z.string()).describe("Important facts to potentially mention"),
  
  // Decision flags for additional tool usage
  needs_web_search: z.boolean().describe("Is more information needed via web search to understand this promotion?"),
  web_search_query: z.string().nullable().describe("Suggested search query if web search is needed"),
  
  relates_to_current_trends: z.boolean().describe("Does this promotion relate to current events or trending topics that would benefit from timeline analysis?"),
  
  has_image: z.boolean().describe("Does the promotion include an image?"),
  image_analysis: z.nullable(PromotionImageAnalysisSchema).describe("Analysis of the image content if present"),
});

export const TimelineSummarySchema = z.object({
  trending_topics: z.array(z.string()).describe("What's trending right now on Farcaster"),
  relevant_to_promotion: z.boolean().describe("Is the trending content relevant to this promotion?"),
});

export const SearchWebResultsSchema = z.object({
  key_findings: z.array(z.string()).describe("Important facts found from web search"),
  relevant: z.boolean().describe("Are the search results relevant to the promotion?"),
});

export const GeneratedQuoteCastSchema = z.object({
  text: z.string().describe("The generated quote cast text for the promotion"),
  model: z.string().describe("The AI model used to generate the quote cast"),
  confidence_score: z.number().describe("A numerical score representing the confidence level that the quote cast is written in the voice of the promoter"),
});
