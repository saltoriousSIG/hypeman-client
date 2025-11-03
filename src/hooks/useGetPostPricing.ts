import { useMemo } from "react";
import {
  calculateUserTier,
  pricing_tiers,
  Tiers,
} from "@/lib/calculateUserScore";
import { useUserStats } from "@/providers/UserStatsProvider";

const useGetPostPricing = (base_rate: number) => {
  const { connectedUserData } = useUserStats();

  const pricePerPost = useMemo(() => {
    if (!connectedUserData) return 0;
    const { avgLikes, avgRecasts, avgReplies, follower_count, score } =
      connectedUserData;
    const tier = calculateUserTier(
      score,
      follower_count,
      avgLikes,
      avgRecasts,
      avgReplies
    );

    switch (tier) {
      case Tiers.TIER_1:
        return (base_rate * pricing_tiers.tier1).toFixed(2);
      case Tiers.TIER_2:
        return (base_rate * pricing_tiers.tier2).toFixed(2);
      case Tiers.TIER_3:
        return (base_rate * pricing_tiers.tier3).toFixed(2);
      default:
        return (base_rate * pricing_tiers.tier1).toFixed(2);
    }
  }, [connectedUserData]);

  return pricePerPost;
};

export default useGetPostPricing;
