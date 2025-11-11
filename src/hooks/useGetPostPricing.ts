import { useMemo } from "react";
import {
  calculateUserTier,
  pricing_tiers,
  Tiers,
} from "@/lib/calculateUserScore";
import { useUserStats } from "@/providers/UserStatsProvider";
import { useFrameContext } from "@/providers/FrameProvider";

const useGetPostPricing = (base_rate: number) => {
  const { connectedUserData } = useUserStats();
  const { fUser } = useFrameContext();

  const pricePerPost = useMemo(() => {
    if (!connectedUserData || !fUser) return 0;
    const { avgLikes, avgRecasts, avgReplies, follower_count, score, following_count, power_badge } =
      connectedUserData;

    const tier = calculateUserTier(
      score,
      fUser.fid,
      follower_count,
      following_count,
      avgLikes,
      avgRecasts,
      avgReplies,
      power_badge
    );

    switch (tier) {
      case Tiers.TIER_1:
        return (base_rate * pricing_tiers.tier1).toFixed(2);
      case Tiers.TIER_2:
        return (base_rate * pricing_tiers.tier2).toFixed(2);
      case Tiers.TIER_3:
        return (base_rate * pricing_tiers.tier3).toFixed(2);
      case Tiers.TIER_4:
        return (base_rate * pricing_tiers.tier4).toFixed(2);
      case Tiers.TIER_5:
        return (base_rate * pricing_tiers.tier5).toFixed(2);
      default:
        return (base_rate * pricing_tiers.tier1).toFixed(2);
    }
  }, [connectedUserData, base_rate, fUser?.fid]);

  return pricePerPost;
};

export default useGetPostPricing;
