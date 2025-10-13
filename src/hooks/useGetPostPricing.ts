import { useMemo } from "react";
import { calculateUserScore } from "@/lib/calculateUserScore";
import { useUserStats } from "@/providers/UserStatsProvider";

const useGetPostPricing = () => {
  const { connectedUserData } = useUserStats();

  const pricePerPost = useMemo(() => {
    if (!connectedUserData) return 0;
    const { avgLikes, avgRecasts, avgReplies, follower_count, score } =
      connectedUserData;
    return calculateUserScore(
      score,
      follower_count,
      avgLikes,
      avgRecasts,
      avgReplies
    );
  }, [connectedUserData]);

  return pricePerPost;
};

export default useGetPostPricing;
