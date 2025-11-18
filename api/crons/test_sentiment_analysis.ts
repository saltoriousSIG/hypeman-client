import { VercelRequest, VercelResponse } from "@vercel/node";
import { HypemanAI } from "../../src/clients/HypemanAI.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const hypemanAI = new HypemanAI(0, "hypemanAdmin");

    const testCases = [
      // ===== POSITIVE SENTIMENT MATCHES =====
      {
        name: "Hype/excitement - different intensities",
        texts: [
          "This is going to be HUGE! 🚀🚀🚀",
          "This will be absolutely massive 🔥",
        ],
        expectedMatch: true,
      },
      {
        name: "Bullish statements - crypto style",
        texts: ["We're so back 📈", "Bulls are running 🐂"],
        expectedMatch: true,
      },
      {
        name: "Achievement celebration",
        texts: [
          "Just hit 10k followers! Thank you all 🙏",
          "10k followers reached! Grateful for everyone 💙",
        ],
        expectedMatch: true,
      },
      {
        name: "FOMO inducing - similar urgency",
        texts: [
          "Don't sleep on this opportunity fr fr",
          "You're gonna regret missing this one",
        ],
        expectedMatch: true,
      },
      {
        name: "Community praise",
        texts: [
          "Best community in web3 hands down",
          "This community is unmatched in the space",
        ],
        expectedMatch: true,
      },

      // ===== NEGATIVE SENTIMENT MATCHES =====
      {
        name: "Bearish statements",
        texts: ["This market is cooked 📉", "Everything's dumping, pack it up"],
        expectedMatch: true,
      },
      {
        name: "Disappointment - similar frustration",
        texts: ["Another rug pull smh", "Got rugged again, classic"],
        expectedMatch: true,
      },
      {
        name: "Criticism - constructive tone",
        texts: [
          "The UI needs serious work before launch",
          "This interface requires major improvements",
        ],
        expectedMatch: true,
      },
      {
        name: "Skepticism about claims",
        texts: [
          "Yeah right, I'll believe it when I see it",
          "Sure buddy, prove it first",
        ],
        expectedMatch: true,
      },

      // ===== NEUTRAL STATEMENT MATCHES =====
      {
        name: "Simple announcements",
        texts: [
          "New feature dropping tomorrow",
          "Feature release scheduled for tomorrow",
        ],
        expectedMatch: true,
      },
      {
        name: "Factual observations",
        texts: ["ETH is at $3500 right now", "Current ETH price: $3500"],
        expectedMatch: true,
      },
      {
        name: "Questions - same inquiry",
        texts: ["When's the airdrop happening?", "Airdrop date?"],
        expectedMatch: true,
      },
      {
        name: "Technical discussion",
        texts: [
          "The smart contract uses ERC-1155 standard",
          "It's built on the ERC-1155 token standard",
        ],
        expectedMatch: true,
      },

      // ===== CALL TO ACTION MATCHES =====
      {
        name: "Direct CTAs",
        texts: [
          "Go follow @saltorious right now!",
          "Everyone needs to follow @saltorious asap",
        ],
        expectedMatch: true,
      },
      {
        name: "Community engagement requests",
        texts: [
          "Drop your Base wallet below 👇",
          "Comment your Base address ⬇️",
        ],
        expectedMatch: true,
      },
      {
        name: "Participation encouragement",
        texts: [
          "Join the discord and lock in",
          "Get in the discord, we're cooking",
        ],
        expectedMatch: true,
      },

      // ===== EMOJI & STYLE VARIATIONS =====
      {
        name: "Heavy emoji vs clean text",
        texts: ["🔥🔥🔥 This is fire 🔥🔥🔥", "This is fire"],
        expectedMatch: true,
      },
      {
        name: "Gen Z slang equivalents",
        texts: [
          "This hits different fr fr no cap",
          "This is genuinely special",
        ],
        expectedMatch: true,
      },
      {
        name: "Formal vs casual same message",
        texts: [
          "I am extremely impressed with this development",
          "Ngl this is pretty sick",
        ],
        expectedMatch: true,
      },
      {
        name: "All caps vs normal",
        texts: ["LETS GOOOOO", "let's go"],
        expectedMatch: true,
      },

      // ===== SHOULD NOT MATCH - OPPOSITE SENTIMENTS =====
      {
        name: "Bullish vs bearish",
        texts: ["We're going to the moon! 🚀", "This is going to zero 📉"],
        expectedMatch: false,
      },
      {
        name: "Love vs hate",
        texts: ["I absolutely love this project", "I can't stand this project"],
        expectedMatch: false,
      },
      {
        name: "Excited vs bored",
        texts: [
          "Can't wait for this launch!!!",
          "Another boring launch, whatever",
        ],
        expectedMatch: false,
      },
      {
        name: "Trust vs distrust",
        texts: ["The team is incredibly transparent", "The team is shady af"],
        expectedMatch: false,
      },
      {
        name: "Success vs failure",
        texts: ["This absolutely crushed it!", "This was a complete disaster"],
        expectedMatch: false,
      },

      // ===== SHOULD NOT MATCH - DIFFERENT TOPICS =====
      {
        name: "Different blockchain topics",
        texts: [
          "Base is the best L2 for building",
          "Solana has the fastest transactions",
        ],
        expectedMatch: false,
      },
      {
        name: "Different products mentioned",
        texts: [
          "Hypeman is crushing the promo game",
          "Packs is the best prediction market",
        ],
        expectedMatch: false,
      },
      {
        name: "Different actions",
        texts: ["Just bought more ETH", "Just sold all my ETH"],
        expectedMatch: false,
      },
      {
        name: "Different events",
        texts: [
          "Excited for the hackathon this weekend",
          "Just got back from the conference",
        ],
        expectedMatch: false,
      },

      // ===== SHOULD NOT MATCH - DIFFERENT NUMBERS/FACTS =====
      {
        name: "Different metrics",
        texts: ["We hit 5000 users!", "We hit 10000 users!"],
        expectedMatch: false,
      },
      {
        name: "Different prices",
        texts: ["Floor price is 0.5 ETH", "Floor price is 2 ETH"],
        expectedMatch: false,
      },
      {
        name: "Different dates",
        texts: ["Launch is tomorrow", "Launch is next week"],
        expectedMatch: false,
      },
      {
        name: "Different percentages",
        texts: ["Up 20% today", "Down 20% today"],
        expectedMatch: false,
      },

      // ===== EDGE CASES - SARCASM & IRONY =====
      {
        name: "Both sarcastic negative",
        texts: [
          "Oh wow, another NFT project, how original 🙄",
          "Great, just what we needed, another JPEG collection",
        ],
        expectedMatch: true,
      },
      {
        name: "Sarcastic vs genuine",
        texts: [
          "Sure, this will definitely work out 🙄",
          "This is going to work out perfectly!",
        ],
        expectedMatch: false,
      },
      {
        name: "Ironic praise vs genuine criticism",
        texts: ["Wow what a genius idea 😂", "This is a terrible idea"],
        expectedMatch: true, // Both negative
      },

      // ===== EDGE CASES - PARTIAL OVERLAP =====
      {
        name: "Shared positive, different specifics",
        texts: [
          "Great UI but the backend needs work",
          "Great UI and the backend is solid too",
        ],
        expectedMatch: false,
      },
      {
        name: "Same topic, mixed sentiment",
        texts: [
          "The concept is good but execution is lacking",
          "The concept is bad but execution is decent",
        ],
        expectedMatch: false,
      },
      {
        name: "Agreeing with different reasoning",
        texts: [
          "This will succeed because of the team",
          "This will succeed because of the tech",
        ],
        expectedMatch: true, // Both predict success
      },

      // ===== EDGE CASES - LENGTH DIFFERENCES =====
      {
        name: "Short affirmation vs long explanation",
        texts: [
          "Facts",
          "I completely agree with everything you said, this is absolutely correct and I've been thinking the same thing",
        ],
        expectedMatch: true,
      },
      {
        name: "Emoji only vs full sentence",
        texts: ["🔥🔥🔥", "This is absolutely fire"],
        expectedMatch: true,
      },
      {
        name: "Acronym vs full phrase",
        texts: ["LFG!!!", "Let's freaking go!"],
        expectedMatch: true,
      },

      // ===== EDGE CASES - QUESTIONS =====
      {
        name: "Same question, different phrasing",
        texts: ["Wen token?", "When is the token launching?"],
        expectedMatch: true,
      },
      {
        name: "Rhetorical question vs statement",
        texts: [
          "Why would anyone use anything else?",
          "Nothing else compares to this",
        ],
        expectedMatch: true,
      },
      {
        name: "Different questions same topic",
        texts: ["What's the mint price?", "When does minting start?"],
        expectedMatch: false,
      },

      // ===== EDGE CASES - MENTIONS & HASHTAGS =====
      {
        name: "With vs without mentions",
        texts: ["@saltorious this is amazing!", "This is amazing!"],
        expectedMatch: true,
      },
      {
        name: "Different people mentioned",
        texts: [
          "Shoutout to @alice for the help",
          "Shoutout to @bob for the help",
        ],
        expectedMatch: false,
      },
      {
        name: "With vs without hashtags",
        texts: ["Great project #Base #DeFi", "Great project"],
        expectedMatch: true,
      },

      // ===== CRYPTO/WEB3 SPECIFIC =====
      {
        name: "Diamond hands vs paper hands",
        texts: ["💎🙌 holding forever", "Paper hands sold at the bottom"],
        expectedMatch: false,
      },
      {
        name: "WAGMI variations",
        texts: ["WAGMI fr", "We're all gonna make it"],
        expectedMatch: true,
      },
      {
        name: "GM variations",
        texts: ["GM frens ☀️", "Good morning everyone"],
        expectedMatch: true,
      },
      {
        name: "Degen culture - similar sentiment",
        texts: ["Aping in with my last $100", "Full send mode activated"],
        expectedMatch: true,
      },
      {
        name: "FUD vs FOMO",
        texts: ["Don't fall for the FUD", "Major FOMO kicking in"],
        expectedMatch: false,
      },

      // ===== COMPARATIVE STATEMENTS =====
      {
        name: "Better than - same comparison",
        texts: ["This is 10x better than X", "Way superior to X"],
        expectedMatch: true,
      },
      {
        name: "Better than - different subjects",
        texts: ["This is better than Ethereum", "This is better than Bitcoin"],
        expectedMatch: false,
      },
      {
        name: "Ranking - same position",
        texts: ["Best L2 hands down", "#1 L2 no debate"],
        expectedMatch: true,
      },

      // ===== CONDITIONAL STATEMENTS =====
      {
        name: "If/then - same logic",
        texts: [
          "If this drops below $1, I'm buying more",
          "Planning to buy more if it dips under $1",
        ],
        expectedMatch: true,
      },
      {
        name: "If/then - opposite actions",
        texts: [
          "If this hits $10, I'm selling",
          "If this hits $10, I'm buying more",
        ],
        expectedMatch: false,
      },

      // ===== EMPTY/MINIMAL CONTENT =====
      {
        name: "Single emoji same meaning",
        texts: ["🔥", "🚀"],
        expectedMatch: true,
      },
      {
        name: "Single emoji opposite meaning",
        texts: ["🔥", "💩"],
        expectedMatch: false,
      },
      {
        name: "Punctuation only",
        texts: ["!!!", "???"],
        expectedMatch: false,
      },
    ];

    const results = [];

    for (const testCase of testCases) {
      const { sentimentMatch } = await hypemanAI.compareContent(
        testCase.texts[0],
        testCase.texts[1]
      );

      const passed = sentimentMatch === testCase.expectedMatch;

      results.push({
        name: testCase.name,
        expected: testCase.expectedMatch,
        actual: sentimentMatch,
        passed,
        texts: testCase.texts,
      });

      console.log(
        `${passed ? "✅" : "❌"} ${testCase.name}: expected ${testCase.expectedMatch}, got ${sentimentMatch}`
      );
    }

    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;
    const failedTests = results.filter((r) => !r.passed);

    console.log(
      `\n📊 Results: ${passedCount}/${totalCount} tests passed (${((passedCount / totalCount) * 100).toFixed(1)}%)`
    );

    if (failedTests.length > 0) {
      console.log(`\n❌ Failed tests:`);
      failedTests.forEach((test) => {
        console.log(`  - ${test.name}`);
        console.log(`    Text 1: "${test.texts[0]}"`);
        console.log(`    Text 2: "${test.texts[1]}"`);
        console.log(`    Expected: ${test.expected}, Got: ${test.actual}\n`);
      });
    }

    return res.status(200).json({
      summary: {
        total: totalCount,
        passed: passedCount,
        failed: totalCount - passedCount,
        passRate: `${((passedCount / totalCount) * 100).toFixed(1)}%`,
      },
      results,
      failedTests: failedTests.map((t) => ({
        name: t.name,
        texts: t.texts,
        expected: t.expected,
        actual: t.actual,
      })),
    });
  } catch (e: any) {
    console.error("Test error:", e);
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
}
