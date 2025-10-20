import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Loader2, X, User, ExternalLink } from "lucide-react"
import { useFrameContext } from "@/providers/FrameProvider"
import Skeleton from "react-loading-skeleton";
import 'react-loading-skeleton/dist/skeleton.css'
import useContract, { ExecutionType } from "@/hooks/useContract"
import { Button } from "../ui/button"
import { extractUrls, convertWarpcastUrlToCastHash } from "@/lib/utils"
import sdk from "@farcaster/frame-sdk"
import useAxios from "@/hooks/useAxios"
import { useData } from "@/providers/DataProvider";
import { toast } from "sonner";

interface CastCardProps {
    promotion: any
    pricing: number
    promotionContent: string
    promotionAuthor: string
    promotionEmmbedContext?: any[]
}

const CastCard: React.FC<CastCardProps> = ({
    promotion,
    promotionContent,
    promotionAuthor,
    promotionEmmbedContext,
    pricing,
}) => {
    const [isPosting, setIsPosting] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [generatedCast, setGeneratedCast] = useState<string | null>(null)
    const [rerolledCast, setRerolledCast] = useState<string | null>(null)
    const [rerollNotes, setRerollNotes] = useState("")
    const [showRerollInput, setShowRerollInput] = useState(false)
    const [intent, setIntent] = useState<any | null>();
    const [postSubmitted, setPostSubmitted] = useState(false);
    const [promoterDetails, setPromoterDetails] = useState<any | null>(null);
    const [isContentRevealed, setIsContentRevealed] = useState(false);
    const [isGeneratingContent, setIsGeneratingContent] = useState(false);
    const [isGeneratingIntent, setIsGeneratingIntent] = useState(false);
    const [showRefreshFeedback, setShowRefreshFeedback] = useState(false);
    const [refreshFeedback, setRefreshFeedback] = useState("");

    const axios = useAxios();

    const { fUser, address, isFrameAdded, handleAddFrame } = useFrameContext();
    const { refetchPromotions } = useData();

    const intentPromiseRef = useRef<Promise<any> | null>(null)

    const submit_intent = useContract(ExecutionType.WRITABLE, "Intents", "submitIntent");
    const get_promoter_details = useContract(ExecutionType.READABLE, "Data", "getPromoterDetails");
    const claim = useContract(ExecutionType.WRITABLE, "Claim", "claim");

    useEffect(() => {
        if (promotion.intents && address) {
            const existingIntent = promotion.intents.find((i: any) => i.wallet && i.wallet.toLowerCase() === address.toLowerCase());
            if (existingIntent) {
                setIntent(existingIntent);
                setGeneratedCast(promotion.existing_generated_cast.generated_cast);
                setIsContentRevealed(true)
            }
        }
    }, [promotion.intents, address]);

    const handleReroll = async () => {
        if (!fUser) return;
        if (intent?.cast_hash) return;
        try {
            setIsLoading(true)
            const { data } = await axios.post("/api/reroll_promotion_cast", {
                username: fUser.username,
                promotionId: promotion.id,
                previousCast: rerolledCast || generatedCast,
                promotionContent: promotionContent,
                promotionAuthor: promotionAuthor,
                embedContext: promotionEmmbedContext,
                userFeedback: rerollNotes,
            });
            setRerolledCast(data.cast.generated_cast);
            setShowRerollInput(false)
        } catch (e: any) {
            throw new Error(e.message);
        } finally {
            setIsLoading(false)
        }
    }

    const handleCancelReroll = () => {
        setShowRerollInput(false)
        setRerollNotes("")
    }

    const handleRevealContent = async () => {
        if (!fUser || !address) return;

        try {
            setIsGeneratingContent(true);

            // First, generate intent signature if not already available
            let currentIntent = intent;

            if (!currentIntent && !intentPromiseRef.current) {
                setIsGeneratingIntent(true);
                intentPromiseRef.current = axios.post("/api/generate_intent_signature", {
                    promotion_id: promotion.id,
                    wallet: address
                })
                    .then((res) => {
                        // Transform the response to match expected structure
                        const transformedIntent = {
                            intentHash: res.data.intent.intentHash,
                            intent: res.data.intent,
                            signature: res.data.signature,
                            messageHash: res.data.messageHash
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
            const isRawIntent = currentIntent.intentHash && !currentIntent.intent && !currentIntent.signature;
            const isTransformedIntent = currentIntent.intentHash && currentIntent.intent && currentIntent.signature;

            if (!isRawIntent && !isTransformedIntent) {
                console.error("❌ Invalid intent structure:", currentIntent);
                throw new Error("Invalid intent signature structure");
            }

            // If it's a raw intent, we need to transform it or skip blockchain submission
            if (isRawIntent) {
                console.log("📋 Using existing raw intent, skipping blockchain submission");
                // Skip blockchain submission for existing intents
                // Just generate cast content directly
            } else {
                try {
                    // Submit intent to blockchain for new intents
                    console.log("💳 Submitting intent to blockchain:");
                    // await axios.post("/api/add_intent", {
                    //     promotion_id: promotion.id,
                    //     intent: currentIntent.intent
                    // });
                    await submit_intent([currentIntent.intent, currentIntent.signature]);
                    toast.success("Intent submitted successfully!");
                    console.log("✅ Intent submitted to blockchain and saved to backend");
                } catch (e: any) {
                    console.error("❌ Error submitting intent to blockchain:", e);
                    throw new Error('Error submitting intent to blockchain');
                }
            }

            // Now generate cast content
            console.log("🎯 Generating cast content with intent:");
            const { data } = await axios.post("/api/generate_cast_content", {
                username: fUser.username,
                promotionId: promotion.id,
                promotionContent: promotionContent,
                promotionAuthor: promotionAuthor,
                embedContext: promotionEmmbedContext,
                intent: isRawIntent ? currentIntent : currentIntent.intent, // Pass appropriate intent structure
            });
            setGeneratedCast(data.generated_cast);
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
    }

    const handleRefreshCast = async (userFeedback?: string) => {
        if (!fUser) return;

        try {
            setIsGeneratingContent(true);

            const { data } = await axios.post("/api/generate_cast_content", {
                username: fUser.username,
                promotionId: promotion.id,
                promotionContent: promotionContent,
                promotionAuthor: promotionAuthor,
                embedContext: promotionEmmbedContext,
                userFeedback: userFeedback, // Pass user feedback to API
                previousCast: generatedCast, // Pass current cast for refinement
                // No intent required for refresh
            });
            toast.success("Cast content refreshed successfully!");
            setGeneratedCast(data.generated_cast);
        } catch (e: any) {
            console.error("Error refreshing cast content:", e);
            toast.error("Error refreshing cast content");
            // Handle error - maybe show a toast or error message
        } finally {
            setIsGeneratingContent(false);
        }
    }

    const handleRefreshClick = () => {
        setShowRefreshFeedback(true);
    }

    const handleRefreshWithFeedback = async () => {
        await handleRefreshCast(refreshFeedback);
        setShowRefreshFeedback(false);
        setRefreshFeedback("");
    }

    const handleCancelRefresh = () => {
        setShowRefreshFeedback(false);
        setRefreshFeedback("");
    }

    const handleViewProfile = async () => {
        try {
            await sdk.actions.viewProfile({
                fid: promotion.cast_data.author.fid
            });
        } catch (error) {
            console.error("Error viewing profile:", error);
        }
    }

    const handleViewCast = async () => {
        try {
            const castUrl = promotion.cast_url;
            const hash = castUrl.split('/').pop();

            await sdk.actions.viewCast({
                hash
            });
        } catch (error) {
            console.error("Error viewing cast:", error);
        }
    }


    const handlePostCast = useCallback(
        async (e?: React.MouseEvent, intent_passed?: any) => {
            try {
                if (!rerolledCast && !generatedCast) return;
                e?.stopPropagation();
                // Post cast logic here
                const { text } = extractUrls(rerolledCast || generatedCast || "");
                
                // Convert Warpcast URL to cast hash for embedding
                const castHash = await convertWarpcastUrlToCastHash(promotion.cast_url);

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
                    toast.success("Cast posted successfully!")
                    await refetchPromotions()
                    if (!isFrameAdded) {
                        await handleAddFrame();
                    }
                } else {
                    toast.error("Error posting cast")
                }
            } catch (e: any) {
                toast.error(`Error posting cast: ${e.message}`)
            }
        }, [rerolledCast, generatedCast, promotion.cast_url, intent]
    )

    const handlePost = useCallback(async () => {
        try {
            setIsPosting(true)

            // Intent should already be submitted to blockchain from handleRevealContent
            if (!intent) {
                throw new Error("No intent available - please generate content first")
            }

            await handlePostCast(undefined, intent.intent);
        } catch (error) {
            console.error("Error posting:", error)
        } finally {
            setIsPosting(false)
        }
    }, [intent, handlePostCast])



    useEffect(() => {
        const load = async () => {
            const details = await get_promoter_details([promotion.id, address]);
            setPromoterDetails(details);
        }
        load();
    }, [promotion.id, address]);


    const username = promotion.cast_data.author.username;
    const text = promotion.cast_data.text;
    const pfp_url = promotion.cast_data.author.pfp_url;

    return (
        <div className="space-y-3 mb-5">

            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/10">


                {/* User's Original Cast Content */}
                <div className="p-4">
                    <div>
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                                <img src={pfp_url} alt={username} width={36} height={36} className="rounded-full w-6 h-6" />
                                <span className="text-white text-sm font-bold">{username}</span>
                                <button
                                    onClick={handleViewProfile}
                                    className="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-white/80 border border-white/10 transition-all duration-200 hover:scale-105"
                                    title="View Profile"
                                >
                                    <User className="w-3 h-3" />
                                    <span>Profile</span>
                                </button>
                            </div>
                            <div className="w-full flex justify-end gap-x-2">

                                <button
                                    onClick={handleViewCast}
                                    className="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-white/80 border border-white/10 transition-all duration-200 hover:scale-105"
                                    title="View Cast"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Cast</span>
                                </button>
                            </div>

                        </div>

                        <div className="flex items-start gap-3">
                            <div className="flex-1">
                                <p className="text-xs text-white/90 whitespace-pre-wrap">{text}</p>
                            </div>
                        </div>

                    </div>
                </div>

                {showRerollInput ? (
                    <div className="space-y-4 h-full">
                        {/* AI Generated Content Section */}
                        <div>
                            {(!generatedCast || isLoading) ? (
                                <div className="space-y-2 h-full">
                                    <Skeleton count={3} className="!bg-white/10" />
                                </div>
                            ) : (
                                <div className="bg-purple-500/10 border-t border-l border-r border-purple-500/20 rounded-t-xl p-4 mb-0">
                                    <div className="flex justify-between items-center gap-2 mb-3">
                                        <span className="text-sm font-medium text-purple-400">Quote Cast</span>
                                        {!isPosting && !intent?.cast_hash && isContentRevealed && !showRefreshFeedback && (
                                            <button
                                                onClick={handleRefreshClick}
                                                disabled={isGeneratingContent}
                                                className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white/60 border border-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
                                            >
                                                {isGeneratingContent ? "Generating..." : "Refresh"}
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-sm leading-relaxed text-white/90">{rerolledCast || generatedCast}</p>
                                </div>
                            )}
                        </div>
                        <div className="bg-black/20 rounded-2xl p-4 border border-white/10">
                            <label className="block text-sm font-medium text-white/80 mb-2">Reroll Notes (optional)</label>
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
                                🔄 Reroll
                            </Button>
                            <Button
                                onClick={handleCancelReroll}
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                            >
                                <X className="w-4 h-4" />
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {!isContentRevealed && !promotion.claimable ? (
                            // Step 1: Show generate button
                            <Button
                                onClick={handleRevealContent}
                                variant="default"
                                size="lg"
                                className="w-full rounded-b-lg rounded-t-none cursor-pointer"
                                disabled={isGeneratingContent || isGeneratingIntent}
                            >
                                {isGeneratingIntent ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Submitting Intent Transaction...
                                    </>
                                ) : isGeneratingContent ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Generating Content...
                                    </>
                                ) : (
                                    <>
                                        <span className="text-lg">✨</span>
                                        Generate Your Quote Cast & Earn ${pricing}
                                    </>
                                )}
                            </Button>
                        ) : (
                            // Step 2: Show content and slide-to-post
                            <>
                                {/* AI Generated Content Section */}
                                {(!generatedCast || isLoading) && !promotion.claimable ? (
                                    <div className="space-y-2 h-full">
                                        <Skeleton count={3} className="!bg-white/10" />
                                    </div>
                                ) : (
                                    <div className={`bg-purple-500/10 border-t border-l border-r ${promotion.claimable && "hidden"} border-purple-500/20 p-4 ${showRefreshFeedback ? 'rounded-t-xl rounded-b-none mb-0' : 'rounded-t-xl mb-0'}`}>
                                        <div className="flex justify-between items-center gap-2 mb-2">
                                            <span className="text-sm font-medium text-purple-400">Your Quote Cast</span>
                                        </div>
                                        <p className="text-sm leading-relaxed text-white/90">{rerolledCast || generatedCast}</p>

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
                                        <span className="text-white/80 font-medium">Posting...</span>
                                    </div>
                                ) : (
                                    <>
                                        {
                                            promotion.claimable ?
                                                (
                                                    <div className="text-center py-4 px-3 bg-white/10 rounded-xl border border-white/10">
                                                        <div className="text-sm text-white/80 mb-2">✅ Posted Successfully!</div>
                                                        <a
                                                            href={`https://farcaster.xyz/${fUser?.username}/${intent?.cast_hash}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-purple-400 font-semibold hover:underline break-all"
                                                        >
                                                            View Cast
                                                        </a>
                                                        <div className="w-full mt-2 flex flex-col items-center justify-center">
                                                            <Button
                                                                disabled={promoterDetails?.state === 2 || !intent?.processed}
                                                                onClick={async () => {
                                                                    await claim([promotion.id])
                                                                    toast.success("Claim submitted!");
                                                                    await refetchPromotions();
                                                                }}
                                                                variant="default"
                                                                size="lg"
                                                                className="w-full bg-green-600 hover:bg-green-500 rounded-xl"
                                                            >
                                                                Claim
                                                            </Button>
                                                            {(!intent?.processed) && (
                                                                <div className="text-xs text-white/80 mt-2">Your claim is being processed...</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                ) :

                                                (
                                                    <>
                                                        {intent ? (

                                                            <div className="space-y-2">
                                                                <div className="flex gap-0 w-full">
                                                                    {showRefreshFeedback ? (
                                                                        <>
                                                                            <Button
                                                                                onClick={handleCancelRefresh}
                                                                                variant="outline"
                                                                                size="lg"
                                                                                className="flex-1 bg-white/10 hover:bg-white/20 border-white/20 text-white/80 rounded-bl-xl rounded-tr-none rounded-tl-none rounded-br-none border-r-0"
                                                                            >
                                                                                <X className="w-4 h-4" />
                                                                                Cancel
                                                                            </Button>
                                                                            <Button
                                                                                onClick={handleRefreshWithFeedback}
                                                                                disabled={isGeneratingContent}
                                                                                variant="default"
                                                                                size="lg"
                                                                                className="flex-1 rounded-bl-none rounded-br-xl rounded-tr-none rounded-tl-none bg-purple-600 hover:bg-purple-500"
                                                                            >
                                                                                {isGeneratingContent ? "Generating..." : "Regenerate"}
                                                                            </Button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            {!isPosting && !intent?.cast_hash && isContentRevealed && (
                                                                                <Button
                                                                                    onClick={handleRefreshClick}
                                                                                    disabled={isGeneratingContent}
                                                                                    variant="outline"
                                                                                    size="lg"
                                                                                    className="flex-1 bg-white/10 hover:bg-white/20 border-white/20 text-white/80 rounded-bl-xl rounded-tr-none rounded-tl-none rounded-br-none border-r-0"
                                                                                >
                                                                                    {isGeneratingContent ? "Generating..." : "Refresh"}
                                                                                </Button>
                                                                            )}
                                                                            <Button
                                                                                onClick={handlePostCast}
                                                                                variant="default"
                                                                                size="lg"
                                                                                className={`${!isPosting && !intent?.cast_hash && isContentRevealed ? 'flex-1 rounded-bl-none rounded-br-xl rounded-tr-none rounded-tl-none' : 'w-full rounded-b-xl rounded-t-none'} bg-purple-600 hover:bg-purple-500`}
                                                                            >
                                                                                Post Cast
                                                                            </Button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {!postSubmitted && (
                                                                    <div className="flex gap-0 w-full">
                                                                        {showRefreshFeedback ? (
                                                                            <>
                                                                                <Button
                                                                                    onClick={handleCancelRefresh}
                                                                                    variant="outline"
                                                                                    size="lg"
                                                                                    className="flex-1 bg-white/10 hover:bg-white/20 border-white/20 text-white/80 rounded-bl-lg rounded-tr-none rounded-tl-none rounded-br-none border-r-0"
                                                                                >
                                                                                    <X className="w-4 h-4" />
                                                                                    Cancel
                                                                                </Button>
                                                                                <Button
                                                                                    onClick={handleRefreshWithFeedback}
                                                                                    disabled={isGeneratingContent}
                                                                                    variant="default"
                                                                                    size="lg"
                                                                                    className="flex-1 rounded-bl-none rounded-br-lg rounded-tr-none rounded-tl-none bg-purple-600 hover:bg-purple-500"
                                                                                >
                                                                                    {isGeneratingContent ? "Generating..." : "🔄 Generate"}
                                                                                </Button>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                {isContentRevealed && (
                                                                                    <Button
                                                                                        onClick={handleRefreshClick}
                                                                                        disabled={isGeneratingContent}
                                                                                        variant="outline"
                                                                                        size="lg"
                                                                                        className="flex-1 bg-white/10 hover:bg-white/20 border-white/20 text-white/80 rounded-bl-lg rounded-tr-none rounded-tl-none rounded-br-none border-r-0"
                                                                                    >
                                                                                        {isGeneratingContent ? "Generating..." : "Refresh"}
                                                                                    </Button>
                                                                                )}
                                                                                <Button
                                                                                    onClick={handlePost}
                                                                                    variant="default"
                                                                                    size="lg"
                                                                                    className={`${isContentRevealed ? 'flex-1 rounded-bl-none rounded-br-lg rounded-tr-none rounded-tl-none' : 'w-full rounded-b-lg rounded-t-none'} cursor-pointer`}
                                                                                    disabled={isPosting}
                                                                                >
                                                                                    {isPosting ? (
                                                                                        <>
                                                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                                                            Posting...
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <span className="text-lg">💸</span>
                                                                                            Cast this to earn ${pricing}
                                                                                        </>
                                                                                    )}
                                                                                </Button>
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
    )
}

export default CastCard
