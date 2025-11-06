import { z } from 'zod';

export const UserProfileSchema = z.object({
  fid: z.string().describe("The farcaster FID of the user"),
  username: z.string().describe("The display name of the user"),
  location: z.string().nullable().describe("The location of the user from their profile if available otherwise null"),
  character_descrption: z.string().describe("A brief description of the user's character based on their bio and overall profile"),
  popularity_score: z.number().describe("A numerical score representing the user's popularity based on their follower count"),
});

export const TopPostsSummarySchema = z.object({
  summary: z.string().describe("A summary of the user's top posts"),
  topics: z.array(z.string()).describe("A list of main topics covered in the user's top posts"),
  tone: z.string().describe("A description of the overall tone of the user's top posts"),
  writing_style: z.string().describe("A description of the writing style used in the post"),
  sample: z.string().describe("A representative sample from one of the user's top posts"),
});

export const RepliesSummarySchema = z.object({
  summary: z.string().describe("A summary of the user's replies to other posts"),
  engagement_style: z.string().describe("A description of how the user engages with others in their replies"),
  tone: z.string().describe("A description of the overall tone of the user's replies"),
  disposition: z.string().describe("A description of the user's general disposition as reflected in their replies"),
  attitude: z.string().describe("A description of the user's attitude in their replies"),
  sample: z.string().describe("A representative sample from one of the user's replies"),
}); 

export const ExistingQuoteCastSchema = z.object({
  examples: z.array(z.string()).describe("A list of existing quote casts for the current promotion"),
  common_phrases: z.array(z.string()).describe("A list of common phrases used in the existing quote casts"),
  tone: z.string().describe("A description of the overall tone of the existing quote casts"),
  things_to_avoid_for_new_quote_casts: z.string().describe("A list of things to avoid when generating new quote casts based on the existing ones, cannot use phrases already present in existing quote casts"),
})

export const PromotionImageAnalysisSchema = z.object({
  description: z.string().describe("A description of the image content related to the promotion"),
  emotional_tone: z.string().describe("A description of the emotional tone conveyed by the image"),
  alignment_with_promotion: z.enum(['high', 'medium', 'low']).describe("An assessment of how well the image aligns with the promotion content"),
  distinctive_elements: z.string().describe("A description of any distinctive visual elements in the image that make it stand out"),
  include_in_promotion: z.enum(['yes', 'no']).describe("A recommendation on whether to include context about the image content in the promotional quote casts"),
});

export const PromotionAnalysisSchema = z.object({
  topics: z.array(z.string()).describe("A list of topics covered in the promotion to be promoted"),
  summary: z.string().describe("A summary of the content that is going to be promoted"),
  promotion_creator: z.string().describe("A brief description of the creator of the promotion"),
  promotion_creator_profile: z.string().describe("An analysis of the promotion creator's profile and typical content"),
  emotional_tone: z.string().describe("A description of the emotional tone of the promotion content"),
  distinctive_elements: z.string().describe("A description of any distinctive elements in the promotion that make it stand out"),
  additional_context: z.string().describe("Any additional context that would help understand the promotion better."),
  requires_more_info: z.enum(['yes', 'no']).describe("An assessment of whether more information is needed to fully understand the promotion via an internet search"),
  has_image: z.enum(['yes', 'no']).describe("Indicates if the promotion includes an image"),
  image_analysis: z.nullable(PromotionImageAnalysisSchema).describe("Analysis of the image content if the promotion includes an image"),
});

export const TimelineSummarySchema = z.object({
  summary: z.string().describe("A summary of the user's overall timeline activity"),
  relevant_to_promotion: z.enum(['yes', 'no']).describe("An assessment of how relevant the trending timeline summary is to the promotion topic"),
}); 

export const SearchWebResultsSchema = z.object({
  summary: z.string().describe("A summary of the web search results related to the promotion topic"),
  relevant: z.enum(['yes', 'no']).describe("An assessment of if the search results are relevant to the promotion topic"),
});

export const GeneratedQuoteCastSchema = z.object({
  text: z.string().describe("The generated quote cast text for the promotion"),
  model: z.string().describe("The AI model used to generate the quote cast"),
  confidence_score: z.number().describe("A numerical score representing the confidence level that the quote cast is written in the voice of the promoter"),
});

