
export enum Tiers {
  TIER_1 = "tier1",
  TIER_2 = "tier2",
  TIER_3 = "tier3",
  TIER_4 = "tier4",
  TIER_5 = "tier5",
}

export const pricing_tiers = {
  tier1: 1,      // Bottom tier
  tier2: 1.5,    // Decent accounts
  tier3: 1.85,   // Good accounts
  tier4: 2.5,      // Strong accounts
  tier5: 3.5,      // Top tier influencers
};

export const calculateUserTier = (
  score: number,
  fid: number,
  follower_count: number,
  following_count: number,
  avgLikes: number,
  avgRecasts: number,
  avgReplies: number,
  power_badge: boolean = false
) => {
  const avgEngagement = avgLikes + avgRecasts + avgReplies;

  const engagementRate = follower_count > 0 
    ? Math.min(100, (avgEngagement / follower_count) * 10000) 
    : 0;
  
  const followerRatio = following_count > 0
    ? Math.min(100, (follower_count / following_count) * 20) 
    : 0;

  const neynarScore = score * 100;
  const powerBadgeBonus = power_badge ? 20 : 0;
  const earlyAdopterBonus = fid < 100000 ? 5 : 0;

  const compositeScore =
    neynarScore * 0.50 +       
    engagementRate * 0.30 +    
    followerRatio * 0.20 +     
    powerBadgeBonus +
    earlyAdopterBonus;

  console.log(compositeScore)

  if (compositeScore >= 88) return Tiers.TIER_5;      // 90+ (legendary)
  else if (compositeScore >= 75) return Tiers.TIER_4;  // 80-89 (elite)
  else if (compositeScore >= 59) return Tiers.TIER_3;  // 60-79 (good)
  else if (compositeScore >= 38) return Tiers.TIER_2;  // 40-59 (decent)
  else return Tiers.TIER_1;                            // 0-39 (bottom)
};
