import { useFrameContext } from "@/providers/FrameProvider";
import { useMemo } from "react";
import { calculateUserScore } from "@/lib/calculateUserScore";

const useGetPostPricing = () => {
  const { connectedUserData } = useFrameContext();

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
