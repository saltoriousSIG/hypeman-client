export enum Tiers {
  TIER_1 = "tier1",
  TIER_2 = "tier2",
  TIER_3 = "tier3",
}

export const pricing_tiers = {
  tier1: 1,
  tier2: 2,
  tier3: 3.5,
};

export const calculateUserTier = (
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

  if (compositeScore >= 70) return Tiers.TIER_3;
  else if (compositeScore >= 40) return Tiers.TIER_2;
  else return Tiers.TIER_1;
};
