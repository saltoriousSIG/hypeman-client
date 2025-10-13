import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, X } from "lucide-react"
import { useFrameContext } from "@/providers/FrameProvider"
import Skeleton from "react-loading-skeleton";
import 'react-loading-skeleton/dist/skeleton.css'
import useContract, { ExecutionType } from "@/hooks/useContract"
import { Button } from "../ui/button"
import { extractUrls } from "@/lib/utils"
import sdk from "@farcaster/frame-sdk"
import useAxios from "@/hooks/useAxios"

interface CastCardProps {
    promotion: any
    cast_text: string
    pricing: number
    promotionContent: string
    promotionAuthor: string
    promotionEmmbedContext?: any[]

}

const CastCard: React.FC<CastCardProps> = ({
    promotion,
    cast_text,
    promotionContent,
    promotionAuthor,
    promotionEmmbedContext,
    pricing,
}) => {
    const [sliderOffset, setSliderOffset] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const [isCompleting, setIsCompleting] = useState(false)
    const [isPosting, setIsPosting] = useState(false)
    const sliderRef = useRef<HTMLDivElement>(null)
    const startXRef = useRef(0)
    const [isLoading, setIsLoading] = useState(false)
    const [rerolledCast, setRerolledCast] = useState<string | null>(null)
    const [rerollNotes, setRerollNotes] = useState("")
    const [showRerollInput, setShowRerollInput] = useState(false)
    const [intent, setIntent] = useState<any | null>(null)
    const [submittedIntents, setSubmittedIntents] = useState<any[]>([])
    const [isLoadingIntent, setIsLoadingIntent] = useState(false)

    const axios = useAxios();

    const { fUser, address } = useFrameContext();

    const intentPromiseRef = useRef<Promise<any> | null>(null)

    const submit_intent = useContract(ExecutionType.WRITABLE, "Intents", "submitIntent");

    const handleTap = () => {
        if (!showRerollInput && !isPosting) {
            setShowRerollInput(true)
        }
    }

    const handleReroll = async () => {
        if (!fUser) return;
        try {
            setIsLoading(true)
            const { data } = await axios.post("/api/reroll_promotion_cast", {
                username: fUser.username,
                promotionId: promotion.id,
                previousCast: cast_text,
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

    const handleDragStart = (clientX: number) => {
        if (!fUser) return;
        setIsDragging(true)
        startXRef.current = clientX

        if (!intent && !intentPromiseRef.current && address) {
            setIsLoadingIntent(true)

            // Store the promise so we can await it later
            intentPromiseRef.current = axios.post("/api/generate_intent_signature", {
                promotion_id: promotion.id,
                wallet: address
            })
                .then((res) => {
                    setIntent(res.data)
                    setIsLoadingIntent(false)
                    return res.data
                })
                .catch((err) => {
                    console.error("Error fetching intent signature:", err)
                    setIsLoadingIntent(false)
                    intentPromiseRef.current = null
                    throw err
                })
        }

    }

    const handleDragMove = (clientX: number) => {
        if (!isDragging || !sliderRef.current) return

        const rect = sliderRef.current.getBoundingClientRect()
        const maxOffset = rect.width - 48 // 48px is knob width
        const offset = Math.max(0, Math.min(clientX - rect.left - 24, maxOffset))
        setSliderOffset(offset)

        const threshold = maxOffset * 0.42
        if (offset >= threshold && !isCompleting) {
            setIsCompleting(true)
            setIsDragging(false)

            // Animate to completion
            setTimeout(() => {
                setSliderOffset(maxOffset)
                setTimeout(() => {
                    handlePost()
                }, 100)
            }, 50)
        }
    }

    const handleDragEnd = () => {
        if (!isCompleting) {
            setSliderOffset(0)
        }
        setIsDragging(false)
    }

    const handlePostCast = useCallback(
        async (e?: React.MouseEvent) => {
            console.log(rerolledCast, cast_text, promotion.cast_url);
            if (!rerolledCast && !cast_text) return;
            e?.stopPropagation();
            // Post cast logic here
            console.log(rerolledCast || cast_text);
            const { text, urls } = extractUrls(rerolledCast || cast_text);
            const embeds: any = [...urls, promotion.cast_url]
            const response = await sdk.actions.composeCast({
                text,
                embeds,
            });
            console.log(response);
            if (response.cast === null) {
                // decide what to do here, do i add bytes string now or let the intent timeout
            } else {
                console.log(response.cast);
                // Add to submitted intents 
            }
        }, [rerolledCast, cast_text, promotion.cast_url]
    )

    const handlePost = useCallback(async () => {
        try {
            setIsPosting(true)

            // If intent is already loaded, use it
            if (intent) {
                await submit_intent([intent.intent, intent.signature]);
                return
            }

            // Otherwise, wait for the promise to resolve
            if (intentPromiseRef.current) {
                const intentData = await intentPromiseRef.current
                await submit_intent([intentData.intent, intentData.signature]);
            } else {
                throw new Error("No intent available")
            }
            await handlePostCast()
        } catch (error) {
            console.error("Error posting:", error)
            // Reset state on error
            setSliderOffset(0)
            setIsCompleting(false)
        } finally {
            setIsPosting(false)
        }
    }, [intent, submit_intent, handlePostCast, cast_text, rerolledCast])

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        handleDragStart(e.clientX)
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault()
        e.stopPropagation()
        handleDragStart(e.touches[0].clientX)
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        e.preventDefault()
        handleDragMove(e.touches[0].clientX)
    }

    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                handleDragMove(e.clientX)
            }
        }

        const handleGlobalMouseUp = () => {
            if (isDragging) {
                handleDragEnd()
            }
        }

        if (isDragging) {
            document.addEventListener("mousemove", handleGlobalMouseMove)
            document.addEventListener("mouseup", handleGlobalMouseUp)
        }

        return () => {
            document.removeEventListener("mousemove", handleGlobalMouseMove)
            document.removeEventListener("mouseup", handleGlobalMouseUp)
        }
    }, [isDragging])

    useEffect(() => {
        if (!fUser) return;
        const load = async () => {
            try {
                const { data } = await axios.post("/api/fetch_intents", { promotion_id: promotion.id });
                console.log("Fetched existing intents:", data.intents);
                setSubmittedIntents(data.intents || [])
            } catch (e: any) {
                throw new Error(e.message);
            }
        }
        load();
    }, [fUser, promotion.id]);



    return (
        <div className="space-y-3 mb-5">
            <Card
                className={`relative overflow-hidden border-0 cursor-pointer transition-all duration-300 hover:scale-[1.02] bg-white/10 backdrop-blur-sm text-white ${!showRerollInput ? "hover:bg-white/15 hover:ring-1 hover:ring-white/20" : ""
                    }`}
                style={{ borderRadius: "24px" }}
                onClick={() => !showRerollInput && !isPosting && handleTap()}
            >
                {!showRerollInput && !isPosting && (
                    <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white/60 border border-white/10">
                        💡 Tap card to reroll content
                    </div>
                )}

                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                                {promotion.name?.charAt(0) || "P"}
                            </div>
                            <div>
                                <div className="font-semibold text-white">{promotion.name} Campaign</div>
                                <div className="text-sm text-white/40">{showRerollInput ? "Customize your post" : "Tap to reroll"}</div>
                            </div>
                        </div>
                        <div className="text-right text-purple-400 font-bold text-lg">${pricing}</div>
                    </div>

                    {showRerollInput ? (
                        <div className="space-y-4 h-full">
                            {(!cast_text || isLoading) ? (
                                <div className="space-y-2 h-full">
                                    <Skeleton count={3} className="!bg-white/10" />
                                </div>
                            ) : (
                                <p className="text-sm leading-relaxed text-white/80 mb-3">{rerolledCast || cast_text}</p>
                            )}
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
                                <button
                                    onClick={handleReroll}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full text-white text-sm font-semibold transition-all duration-300"
                                >
                                    🔄 Reroll
                                </button>
                                <button
                                    onClick={handleCancelReroll}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-white text-sm font-medium transition-all duration-300"
                                >
                                    <X className="w-4 h-4" />
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {(!cast_text || isLoading) ? (
                                <div className="space-y-2 h-full">
                                    <Skeleton count={3} className="!bg-white/10" />
                                </div>
                            ) : (
                                <p className="text-sm leading-relaxed text-white/80 mb-3">{rerolledCast || cast_text}</p>
                            )}

                            {isPosting ? (
                                <div className="flex items-center justify-center gap-3 py-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                                    <span className="text-white/80 font-medium">Posting...</span>
                                </div>
                            ) : (
                                <>
                                    {submittedIntents.length > 0 ? (
                                        <div className="space-y-2">
                                            <div className="w-full">
                                                <Button
                                                    onClick={handlePostCast}
                                                    className="w-full relative  bg-purple-600 rounded-xl shadow-lg flex items-center justify-center cursor-pointer z-40 hover:bg-purple-500 hover:text-white transition-all duration-300">
                                                    Post Cast
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            ref={sliderRef}
                                            className="relative h-14 bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div
                                                className={`absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 z-10 ${isCompleting ? "transition-all duration-300 ease-out" : ""
                                                    }`}
                                                style={{
                                                    width: sliderOffset
                                                        ? `${((sliderOffset + 48) / (sliderRef.current?.getBoundingClientRect().width || 1)) * 100}%`
                                                        : "0%",
                                                    maskImage: "linear-gradient(to right, black 85%, transparent 100%)",
                                                    WebkitMaskImage: "linear-gradient(to right, black 85%, transparent 100%)",
                                                }}
                                            />

                                            {isCompleting && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/50 via-pink-500/50 to-purple-600/50 animate-pulse z-20" />
                                            )}

                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                                                <span className="text-sm font-medium text-white/60">
                                                    {isCompleting ? "Posting..." : "Slide to Post & Earn"}
                                                </span>
                                            </div>

                                            <button
                                                onMouseDown={handleMouseDown}
                                                onTouchStart={handleTouchStart}
                                                onTouchMove={handleTouchMove}
                                                onTouchEnd={handleDragEnd}
                                                onTouchCancel={handleDragEnd}
                                                className={`absolute top-1 left-1 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing z-40 ${isCompleting ? "transition-all duration-300 ease-out" : ""
                                                    }`}
                                                style={{
                                                    transform: `translateX(${sliderOffset}px)`,
                                                    touchAction: "none",
                                                }}
                                            >
                                                <div className="text-xl">💸</div>
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export default CastCard
