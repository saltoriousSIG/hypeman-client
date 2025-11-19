import { z } from "zod";
import { tool, generateText, generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { SearchWebResultsSchema } from "../schemas.js";

const anthropicModel = anthropic(
  process.env.ANTHROPIC_MODEL_NAME || "claude-haiku-4-5-20251001"
);
const openAIModel = openai.responses(
  process.env.OPENAI_MODEL_NAME || "gpt-4o-mini"
);

const searchWebTool = tool({
  description: `Search the web for additional context about the promotion topic using GPT-4o-mini's native web search.
ONLY call this tool if:
- The promotion mentions something you don't have context about
- There's a new product, feature, or launch that needs explanation
- The promotion references recent events or announcements
- You need to verify or gather facts about what's being promoted

DO NOT call this if:
- The promotion is self-explanatory
- You already have enough context from other tools
- It's just a general announcement that doesn't need external research`,
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "Specific search query (2-5 words) about what you need to know"
      ),
    reason: z
      .string()
      .describe("Why you need this search to better understand the promotion"),
  }),
  execute: async ({ query, reason }) => {
    console.log(`🔍 Web search requested: "${query}" - Reason: ${reason}`);

    // Use GPT-4o-mini with native web search
    const { text, sources } = await generateText({
      model: openAIModel,
      prompt: `Search for: ${query}
Provide a 2-3 sentence summary of the most relevant, recent information.`,
      tools: {
        web_search: openai.tools.webSearch({}) as any,
      },
    });

    // Analyze search results for relevance
    const searchSummary = await generateObject({
      model: anthropicModel,
      messages: [
        {
          role: "system",
          content: `You are evaluating web search results for relevance to a promotion.`,
        },
        {
          role: "user",
          content: `Search results for "${query}":\n${text}\n\nSources: ${JSON.stringify(
            sources
          )}\n\nSummarize and assess relevance.`,
        },
      ],
      schema: SearchWebResultsSchema,
    });

    return searchSummary.object;
  },
});

export default searchWebTool;
