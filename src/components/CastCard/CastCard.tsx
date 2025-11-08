import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, X } from "lucide-react";
import { useFrameContext } from "@/providers/FrameProvider";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import useContract, { ExecutionType } from "@/hooks/useContract";
import { Button } from "../ui/button";
import { extractUrls, extractHashFromFCUrl } from "@/lib/utils";
import sdk from "@farcaster/frame-sdk";
import useAxios from "@/hooks/useAxios";
import { useData } from "@/providers/DataProvider";
import { toast } from "sonner";
import { useIntentProcessingStatus } from "@/hooks/useIntentProcessingStatus";
import { useUserStats, UserStats } from "@/providers/UserStatsProvider";
import PromotionCastPreview from "./PromotionCastPreview";
import useGetPostPricing from "@/hooks/useGetPostPricing";
import { formatUnits } from "viem";

interface CastCardProps {
  promotion: any;
  promotionContent: string;
  promotionAuthor: string;
  promotionEmmbedContext?: any[];
  refetchPromotion: () => Promise<any>;
}

const CastCard: React.FC<CastCardProps> = ({
  promotion,
  promotionContent,
  promotionAuthor,
  promotionEmmbedContext,
  refetchPromotion,
}) => {
  const [isPosting, setIsPosting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCast, setGeneratedCast] = useState<string | null>(null);
  const [rerolledCast, setRerolledCast] = useState<string | null>(null);
  const [rerollNotes, setRerollNotes] = useState("");
  const [showRerollInput, setShowRerollInput] = useState(false);
  const [intent, setIntent] = useState<any | null>();
  const [postSubmitted, setPostSubmitted] = useState(false);
  const [_promoterDetails, setPromoterDetails] = useState<any | null>(null); // Used in useEffect to load promoter details
  const [isContentRevealed, setIsContentRevealed] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isGeneratingIntent, setIsGeneratingIntent] = useState(false);
  const [showRefreshFeedback, setShowRefreshFeedback] = useState(false);
  const [refreshFeedback, setRefreshFeedback] = useState("");
  const [hasClaimed, setHasClaimed] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const pricing = useGetPostPricing(
    parseFloat(formatUnits(promotion.base_rate, 6))
  );

  const { connectedUserData } = useUserStats() as {
    connectedUserData: UserStats;
  };

  const score = connectedUserData?.score || 0;
  const isPro = connectedUserData?.isPro || false;

  const axios = useAxios();

  const { fUser, address, isFrameAdded, handleAddFrame } = useFrameContext();
  const { refetchPromotions } = useData();

  const intentPromiseRef = useRef<Promise<any> | null>(null);

  const submit_intent = useContract(
    ExecutionType.WRITABLE,
    "Intents",
    "submitIntent"
  );
  const get_promoter_details = useContract(
    ExecutionType.READABLE,
    "Data",
    "getPromoterDetails"
  );
  const claim = useContract(ExecutionType.WRITABLE, "Claim", "claim");

  // Use React Query hook for intent processing status
  const { data: isIntentProcessed, isLoading: isCheckingIntent } =
    useIntentProcessingStatus({
      promotionId: promotion.id,
      intentHash: intent?.intentHash || "",
      enabled: !!intent?.intentHash && promotion.claimable && !hasClaimed,
    });

  useEffect(() => {
    if (promotion.intents && address) {
      const existingIntent = promotion.intents.find(
        (i: any) =>
          i?.wallet && i?.wallet?.toLowerCase() === address.toLowerCase()
      );
      if (existingIntent) {
        setIntent(existingIntent);
        setGeneratedCast(promotion.existing_generated_cast?.generated_cast);
        setIsContentRevealed(true);
      }
    }
  }, [promotion.intents, address]);

  const handleReroll = async () => {
    if (!fUser) return;
    if (!axios) return;
    if (intent?.cast_hash) return;
    try {
      setIsLoading(true);
      const { data } = await axios.post("/api/reroll_promotion_cast", {
        promotionUrl: promotion.cast_url,
        username: fUser.username,
        promotionId: promotion.id,
        previousCast: rerolledCast || generatedCast,
        promotionContent: promotionContent,
        promotionAuthor: promotionAuthor,
        embedContext: promotionEmmbedContext,
        userFeedback: rerollNotes,
      });
      setRerolledCast(data.cast?.generated_cast);
      setShowRerollInput(false);
    } catch (e: any) {
      throw new Error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelReroll = () => {
    setShowRerollInput(false);
    setRerollNotes("");
  };

  const handleRevealContent = async () => {
    if (!fUser || !address) return;
    if (!axios) return;

    if (promotion.pro_user && !isPro) {
      return toast.error("This promotion is only available to Pro users.");
    }

    if (promotion.id === "120") {
      if (score < 0.85) {
        return toast.error(
          "Your Neynar score is not high enough to reveal this content."
        );
      }
    } else if (score < parseFloat(promotion.neynar_score)) {
      return toast.error(
        "Your Neynar score is not high enough to reveal this content."
      );
    }

    try {
      setIsGeneratingContent(true);

      // First, generate intent signature if not already available
      let currentIntent = intent;

      if (!currentIntent && !intentPromiseRef.current) {
        setIsGeneratingIntent(true);
        intentPromiseRef.current = axios
          .post("/api/generate_intent_signature", {
            promotion_id: promotion.id,
            wallet: address,
          })
          .then((res) => {
            // Transform the response to match expected structure
            const transformedIntent = {
              intentHash: res.data.intent.intentHash,
              intent: res.data.intent,
              signature: res.data.signature,
              messageHash: res.data.messageHash,
            };
            setIntent(transformedIntent);
            return transformedIntent;
          })
          .catch((err) => {
            console.error("❌ Error generating intent signature:", err);
            intentPromiseRef.current = null;
            throw err;
          });

        currentIntent = await intentPromiseRef.current;
        setIsGeneratingIntent(false);
      } else if (intentPromiseRef.current) {
        setIsGeneratingIntent(true);
        currentIntent = await intentPromiseRef.current;
        setIsGeneratingIntent(false);
      } else {
        console.log("✅ Using existing intent:");
      }

      if (!currentIntent) {
        throw new Error("Failed to generate intent signature");
      }

      // Validate intent has required properties
      // Check if this is a raw intent (from existing state) or transformed intent (from API)
      const isRawIntent =
        currentIntent.intentHash &&
        !currentIntent.intent &&
        !currentIntent.signature;
      const isTransformedIntent =
        currentIntent.intentHash &&
        currentIntent.intent &&
        currentIntent.signature;

      if (!isRawIntent && !isTransformedIntent) {
        console.error("❌ Invalid intent structure:", currentIntent);
        throw new Error("Invalid intent signature structure");
      }

      // If it's a raw intent, we need to transform it or skip blockchain submission
      if (isRawIntent) {
        console.log(
          "📋 Using existing raw intent, skipping blockchain submission"
        );
        // Skip blockchain submission for existing intents
        // Just generate cast content directly
      } else {
        try {
          // Submit intent to blockchain for new intents
          console.log("💳 Submitting intent to blockchain:");
          await submit_intent([currentIntent.intent, currentIntent.signature]);
          toast.success("Intent submitted successfully!");
          console.log("✅ Intent submitted to blockchain and saved to backend");
        } catch (e: any) {
          console.error("❌ Error submitting intent to blockchain:", e);
          throw new Error("Error submitting intent to blockchain");
        }
      }

      // Now generate cast content
      console.log("🎯 Generating cast content with intent:");
      const { data } = await axios.post("/api/generate_cast_content", {
        username: fUser.username,
        promotionId: promotion.id,
        promotionUrl: promotion.cast_url,
        promotionContent: promotionContent,
        promotionAuthor: promotionAuthor,
        embedContext: promotionEmmbedContext,
        intent: isRawIntent ? currentIntent : currentIntent.intent, // Pass appropriate intent structure
      });
      setGeneratedCast(data?.generated_cast);
      // Update intent state with the returned intent (in case it was updated)
      if (data.intent) {
        setIntent(data.intent);
      }
      setIsContentRevealed(true);
    } catch (e: any) {
      toast.error(`Error generating content: ${e.message}`);
      console.error("Error generating content:", e);
      // Handle error - maybe show a toast or error message
    } finally {
      setIsGeneratingContent(false);
      setIsGeneratingIntent(false);
    }
  };

  const handleRefreshCast = async (userFeedback?: string) => {
    if (!axios) return;
    if (!fUser) return;

    try {
      setIsGeneratingContent(true);

      const { data } = await axios.post("/api/generate_cast_content", {
        username: fUser.username,
        promotionId: promotion.id,
        promotionUrl: promotion.cast_url,
        promotionContent: promotionContent,
        promotionAuthor: promotionAuthor,
        embedContext: promotionEmmbedContext,
        userFeedback: userFeedback, // Pass user feedback to API
        previousCast: generatedCast, // Pass current cast for refinement
        // No intent required for refresh
      });
      toast.success("Cast content refreshed successfully!");
      setGeneratedCast(data?.generated_cast);
    } catch (e: any) {
      console.error("Error refreshing cast content:", e);
      toast.error("Error refreshing cast content");
      // Handle error - maybe show a toast or error message
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleRefreshClick = () => {
    setShowRefreshFeedback(true);
  };

  const handleRefreshWithFeedback = async () => {
    await handleRefreshCast(refreshFeedback);
    setShowRefreshFeedback(false);
    setRefreshFeedback("");
  };

  const handleCancelRefresh = () => {
    setShowRefreshFeedback(false);
    setRefreshFeedback("");
  };

  const handlePostCast = useCallback(
    async (e?: React.MouseEvent, intent_passed?: any) => {
      if (!axios) return;
      try {
        if (!rerolledCast && !generatedCast) return;
        e?.stopPropagation();
        // Post cast logic here
        const { text } = extractUrls(rerolledCast || generatedCast || "");

        // Extract cast hash from Warpcast URL
        const castHash = extractHashFromFCUrl(promotion.cast_url);
        if (!castHash) {
          throw new Error("Invalid cast URL - unable to extract hash");
        }

        const response = await sdk.actions.composeCast({
          text,
          embeds: [castHash],
        });
        if (response.cast) {
          //decide what to do here, do i add bytes string now or let the intent timeout
          setPostSubmitted(true);
          await axios.post("/api/submit_cast_hash_to_intent", {
            cast_hash: response.cast.hash,
            intent_hash: intent_passed?.intentHash || intent?.intentHash,
            promotion_id: promotion.id,
          });
          toast.success("Cast posted successfully!");
          await refetchPromotions();
          await refetchPromotion();
          if (!isFrameAdded) {
            try {
              await handleAddFrame();
              await axios.post("/api/add_frame_notification", {});
            } catch (e: any) {
              console.error("Error adding frame:", e);
            }
          }
        } else {
          toast.error("Error posting cast");
        }
      } catch (e: any) {
        toast.error(`Error posting cast: ${e.message}`);
      }
    },
    [rerolledCast, generatedCast, promotion.cast_url, intent, axios]
  );

  const handlePost = useCallback(async () => {
    try {
      setIsPosting(true);

      // Intent should already be submitted to blockchain from handleRevealContent
      if (!intent) {
        throw new Error("No intent available - please generate content first");
      }

      await handlePostCast(undefined, intent.intent);
    } catch (error) {
      console.error("Error posting:", error);
    } finally {
      setIsPosting(false);
    }
  }, [intent, handlePostCast]);

  useEffect(() => {
    const load = async () => {
      const details = await get_promoter_details([promotion.id, address]);
      setPromoterDetails(details);
      // Set hasClaimed based on promoter state (state 2 means already claimed)
      setHasClaimed(details?.state === 2);
    };
    load();
  }, [promotion.id, address, get_promoter_details]);

  const username = promotion.cast_data.author.username;
  const text = promotion.cast_data.text;
  const pfp_url = promotion.cast_data.author.pfp_url;
  const embeds = promotion.cast_data.embeds;

  return (
    <div className="space-y-3 mb-5">
      <PromotionCastPreview
        username={username}
        text={text}
        pfpUrl={pfp_url}
        authorFid={promotion.cast_data.author.fid}
        castUrl={promotion.cast_url}
        embeds={embeds}
      />

      <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
        {showRerollInput ? (
          <div className="space-y-4 h-full">
            {/* AI Generated Content Section */}
            <div>
              {!generatedCast || isLoading ? (
                <div className="space-y-2 h-full">
                  <Skeleton count={3} className="!bg-white/10" />
                </div>
              ) : (
                <div className="bg-purple-500/10 border-t border-l border-r border-purple-500/20 rounded-t-xl p-4 mb-0">
                  <div className="flex justify-between items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-purple-400">
                      Quote Cast
                    </span>
                    {!isPosting &&
                      !intent?.cast_hash &&
                      isContentRevealed &&
                      !showRefreshFeedback && (
                        <button
                          onClick={handleRefreshClick}
                          disabled={isGeneratingContent}
                          className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white/60 border border-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
                        >
                          {isGeneratingContent ? "Generating..." : "Refresh"}
                        </button>
                      )}
                  </div>
                  <p className="text-sm leading-relaxed text-white/90">
                    {rerolledCast || generatedCast}
                  </p>
                </div>
              )}
            </div>
            <div className="bg-black/20 rounded-2xl p-4 border border-white/10">
              <label className="block text-sm font-medium text-white/80 mb-2">
                Reroll Notes (optional)
              </label>
              <textarea
                value={rerollNotes}
                onChange={(e) => setRerollNotes(e.target.value)}
                className="w-full bg-black/20 rounded-xl p-3 border border-white/10 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[80px] text-white placeholder-white/50"
                placeholder="e.g., use less emojis, make it more professional, add more excitement..."
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleReroll}
                variant="default"
                size="sm"
                className="rounded-full"
              >
                Reroll
              </Button>
              <Button
                onClick={handleCancelReroll}
                variant="outline"
                size="sm"
                className="rounded-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {!isContentRevealed && !promotion.claimable ? (
              // Step 1: Show generate button
              <div className="text-center p-4 bg-black">
                <button
                  onClick={handleRevealContent}
                  disabled={isGeneratingContent || isGeneratingIntent}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white text-sm font-semibold px-4 py-4 rounded-lg transition-all active:scale-[0.95] w-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingIntent ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Submitting Intent Transaction...
                    </>
                  ) : isGeneratingContent ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Generating Content...
                    </>
                  ) : (
                    <>Cast to Earn ${pricing}</>
                  )}
                </button>
              </div>
            ) : (
              // Step 2: Show content and slide-to-post
              <>
                {/* AI Generated Content Section */}
                {isGeneratingContent ? (
                  <div className="space-y-2 h-full">
                    <Skeleton count={3} className="!bg-white/10" />
                  </div>
                ) : (
                  <div
                    className={`bg-black border-t border-l border-r ${promotion.claimable && "hidden"} border-purple-500/20 p-4 pb-0 ${showRefreshFeedback ? "rounded-t-xl rounded-b-none mb-0" : "rounded-t-xl mb-0"}`}
                  >
                    <div className="flex justify-between items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-purple-400">
                        Your Quote Cast
                      </span>
                    </div>
                    {!generatedCast && !rerolledCast && (
                      <span className="text-sm text-red-300 font-mediut">
                        Something happened when we tried to generate your cast.
                        Click Update to get a new one!
                      </span>
                    )}
                    <p className="text-sm leading-relaxed text-white/90">
                      {rerolledCast || generatedCast}
                    </p>

                    {/* Refresh Feedback Section - now part of the purple container */}
                    {showRefreshFeedback && (
                      <div className="mt-4 pt-4 border-t border-purple-500/20">
                        <label className="block text-sm font-medium text-white/80 mb-2">
                          How would you like to improve this cast? (optional)
                        </label>
                        <textarea
                          value={refreshFeedback}
                          onChange={(e) => setRefreshFeedback(e.target.value)}
                          className="w-full bg-black/20 rounded-xl p-3 border border-white/10 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[80px] text-white placeholder-white/50"
                          placeholder="e.g., make it more professional, add more excitement, use fewer emojis, make it shorter..."
                        />
                      </div>
                    )}
                  </div>
                )}

                {isPosting ? (
                  <div className="flex items-center justify-center gap-3 py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                    <span className="text-white/80 font-medium">
                      Posting...
                    </span>
                  </div>
                ) : (
                  <>
                    {promotion.claimable ? (
                      <div className="text-center p-4 bg-black">
                        {hasClaimed ? (
                          <div className="text-sm text-white/80">
                            ✅ Successfully Claimed
                          </div>
                        ) : (
                          <div className="w-full flex flex-col items-center justify-center">
                            <button
                              disabled={
                                !isIntentProcessed ||
                                isCheckingIntent ||
                                isClaiming
                              }
                              onClick={async () => {
                                try {
                                  setIsClaiming(true);
                                  await claim([promotion.id]);
                                  toast.success("Claim submitted!");
                                  setHasClaimed(true); // Update local state immediately
                                  await refetchPromotions();
                                  await refetchPromotion();
                                } catch (error) {
                                  console.error("Error claiming:", error);
                                  toast.error(
                                    "Failed to claim. Please try again."
                                  );
                                } finally {
                                  setIsClaiming(false);
                                }
                              }}
                              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white text-sm font-semibold px-4 py-4 rounded-lg transition-all active:scale-[0.95] w-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isClaiming ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                                  Claiming...
                                </>
                              ) : !isIntentProcessed || isCheckingIntent ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                                  Your claim is being processed...
                                </>
                              ) : (
                                `Claim $${formatUnits(intent.fee, 6)}`
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {intent ? (
                          <div className="space-y-2">
                            <div className="flex gap-4 w-full p-4 bg-black">
                              {showRefreshFeedback ? (
                                <>
                                  <button
                                    onClick={handleCancelRefresh}
                                    className="relative flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-sm font-semibold text-white/90 bg-gradient-to-r from-gray-500/10 to-gray-600/10 border border-gray-400/30 hover:border-gray-300/50 transition-all duration-500 group overflow-hidden backdrop-blur-sm hover:shadow-lg hover:shadow-gray-500/20 hover:scale-105 flex-1 cursor-pointer"
                                  >
                                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                    <span className="relative z-10 bg-gradient-to-r from-gray-300 to-gray-400 bg-clip-text text-transparent group-hover:from-gray-200 group-hover:to-gray-300 transition-all duration-300">
                                      Cancel
                                    </span>
                                  </button>
                                  <button
                                    onClick={handleRefreshWithFeedback}
                                    disabled={isGeneratingContent}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white text-sm font-semibold px-4 py-4 rounded-lg transition-all active:scale-[0.95] flex-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isGeneratingContent
                                      ? "Updating..."
                                      : "Update Cast"}
                                  </button>
                                </>
                              ) : (
                                <>
                                  {!isPosting &&
                                    !intent?.cast_hash &&
                                    isContentRevealed && (
                                      <button
                                        onClick={handleRefreshClick}
                                        disabled={isGeneratingContent}
                                        className="relative flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-sm font-semibold text-white/90 bg-gradient-to-r from-gray-500/10 to-gray-600/10 border border-gray-400/30 hover:border-gray-300/50 transition-all duration-500 group overflow-hidden backdrop-blur-sm hover:shadow-lg hover:shadow-gray-500/20 hover:scale-105 flex-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                      >
                                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                        <span className="relative z-10 bg-gradient-to-r from-gray-300 to-gray-400 bg-clip-text text-transparent group-hover:from-gray-200 group-hover:to-gray-300 transition-all duration-300">
                                          {isGeneratingContent
                                            ? "Generating..."
                                            : "Refresh"}
                                        </span>
                                      </button>
                                    )}
                                  <button
                                    onClick={handlePostCast}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white text-sm font-semibold px-4 py-4 rounded-lg transition-all active:scale-[0.95] cursor-pointer"
                                    style={{
                                      width:
                                        !isPosting &&
                                        !intent?.cast_hash &&
                                        isContentRevealed
                                          ? "calc(50% - 0.25rem)"
                                          : "100%",
                                    }}
                                  >
                                    Post Cast
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            {!postSubmitted && (
                              <div className="flex gap-2 w-full">
                                {showRefreshFeedback ? (
                                  <>
                                    <button
                                      onClick={handleCancelRefresh}
                                      className="relative flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-sm font-semibold text-white/90 bg-gradient-to-r from-gray-500/10 to-gray-600/10 border border-gray-400/30 hover:border-gray-300/50 transition-all duration-500 group overflow-hidden backdrop-blur-sm hover:shadow-lg hover:shadow-gray-500/20 hover:scale-105 flex-1 cursor-pointer"
                                    >
                                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                      <span className="relative z-10 bg-gradient-to-r from-gray-300 to-gray-400 bg-clip-text text-transparent group-hover:from-gray-200 group-hover:to-gray-300 transition-all duration-300">
                                        <X className="w-4 h-4 inline mr-1" />
                                        Cancel
                                      </span>
                                    </button>
                                    <button
                                      onClick={handleRefreshWithFeedback}
                                      disabled={isGeneratingContent}
                                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white text-sm font-semibold px-4 py-4 rounded-lg transition-all active:scale-[0.95] flex-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {isGeneratingContent
                                        ? "Generating..."
                                        : "🔄 Generate"}
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {isContentRevealed && (
                                      <button
                                        onClick={handleRefreshClick}
                                        disabled={isGeneratingContent}
                                        className="relative flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-sm font-semibold text-white/90 bg-gradient-to-r from-gray-500/10 to-gray-600/10 border border-gray-400/30 hover:border-gray-300/50 transition-all duration-500 group overflow-hidden backdrop-blur-sm hover:shadow-lg hover:shadow-gray-500/20 hover:scale-105 flex-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                      >
                                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                        <span className="relative z-10 bg-gradient-to-r from-gray-300 to-gray-400 bg-clip-text text-transparent group-hover:from-gray-200 group-hover:to-gray-300 transition-all duration-300">
                                          {isGeneratingContent
                                            ? "Generating..."
                                            : "Refresh"}
                                        </span>
                                      </button>
                                    )}
                                    <button
                                      onClick={handlePost}
                                      disabled={isPosting}
                                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white text-sm font-semibold px-4 py-4 rounded-lg transition-all active:scale-[0.95] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                      style={{
                                        width: isContentRevealed
                                          ? "calc(50% - 0.25rem)"
                                          : "100%",
                                      }}
                                    >
                                      {isPosting ? (
                                        <>
                                          <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                                          Posting...
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-lg">💸</span>
                                          Cast this to earn ${pricing}
                                        </>
                                      )}
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CastCard;
