export const pricing_tiers = {
  tier1: 3,
  tier2: 2,
  tier3: 1,
};

export const calculateUserScore = (
  score: number,
  follower_count: number,
  avgLikes: number,
  avgRecasts: number,
  avgReplies: number
) => {
  const avgEngagement = avgLikes + avgRecasts + avgReplies;

  // Normalize metrics (0-100 scale)
  const followerScore = Math.min(100, (follower_count / 10000) * 100); // 10k followers = 100 points
  const neynarScore = score * 100; // Convert 0-1 to 0-100
  const engagementScore = Math.min(100, (avgEngagement / 50) * 100); // 50 avg engagement = 100 points

  // Weighted composite score (adjust weights as needed)
  const compositeScore =
    followerScore * 0.4 + // 40% followers
    neynarScore * 0.35 + // 35% neynar score
    engagementScore * 0.25; // 25% engagement

  if (compositeScore >= 70) return pricing_tiers.tier1;
  else if (compositeScore >= 40) return pricing_tiers.tier2;
  else return pricing_tiers.tier3;
};
