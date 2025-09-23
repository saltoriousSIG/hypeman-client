import React, { useState, useRef } from "react";
import { Card, CardContent } from "../ui/card";
import { Zap, X } from "lucide-react";

interface CastCardProps {
    promotion: any;
    cast_text: string;
    isAuthenticated: boolean;
    handleShowLoginModal: (state: boolean) => void;
    pricing: number;
}

const CastCard: React.FC<CastCardProps> = ({ promotion, cast_text, isAuthenticated, handleShowLoginModal, pricing }) => {
    const [holdStates, setHoldStates] = useState<{ [key: number]: { isHolding: boolean; progress: number } }>({})
    const [rerollNotes, setRerollNotes] = useState<{ [key: number]: string }>({})
    const [showRerollInput, setShowRerollInput] = useState<number | null>(null)

    const holdState = holdStates[promotion.id] || { isHolding: false, progress: 0 }
    const isShowingReroll = showRerollInput === promotion.id

    const holdTimers = useRef<{ [key: number]: NodeJS.Timeout }>({})
    const progressIntervals = useRef<{ [key: number]: NodeJS.Timeout }>({})

    const handleHoldEnd = (castId: number) => {
        if (holdTimers.current[castId]) {
            clearTimeout(holdTimers.current[castId])
            delete holdTimers.current[castId]
        }
        if (progressIntervals.current[castId]) {
            clearInterval(progressIntervals.current[castId])
            delete progressIntervals.current[castId]
        }
        setHoldStates((prev) => ({
            ...prev,
            [castId]: { isHolding: false, progress: 0 },
        }))
    }

    const handleTap = (castId: number) => {
        if (showRerollInput !== castId) {
            setShowRerollInput(castId)
        }
    }

    const handleReroll = (castId: number) => {
        if (!isAuthenticated) {
            handleShowLoginModal(true)
            return
        }

        const notes = rerollNotes[castId] || ""
        console.log(`[v0] Rerolling cast ${castId} with notes: ${notes}`)
        // Add reroll functionality here - would call AI to regenerate with notes
        setShowRerollInput(null)
        setRerollNotes((prev) => ({ ...prev, [castId]: "" }))
    }

    const handleCancelReroll = (castId: number) => {
        setShowRerollInput(null)
        setRerollNotes((prev) => ({ ...prev, [castId]: "" }))
    }

    const handlePost = (castId: number) => {
        console.log(`[v0] Posting cast ${castId} and sending $${promotion.total_budget} payment immediately`)
        // Add post functionality here - automatically sends payment upon successful post
    }

    const handleHoldStart = (castId: number) => {
        if (!isAuthenticated) {
            handleShowLoginModal(true)
            return
        }

        setHoldStates((prev) => ({
            ...prev,
            [castId]: { isHolding: true, progress: 0 },
        }))

        let progress = 0
        progressIntervals.current[castId] = setInterval(() => {
            progress += 5
            setHoldStates((prev) => ({
                ...prev,
                [castId]: { ...prev[castId], progress },
            }))
        }, 50)

        holdTimers.current[castId] = setTimeout(() => {
            handlePost(castId)
            handleHoldEnd(castId)
        }, 1000) // 1 second hold
    }
    return (
        <div key={promotion.id} className="space-y-3 mb-5">
            <Card
                className={`relative overflow-hidden border-0 cursor-pointer transition-all duration-300 hover:scale-[1.02] bg-white/10 backdrop-blur-sm text-white ${holdState.isHolding
                    ? "scale-[1.03] shadow-lg shadow-purple-500/20 ring-2 ring-purple-400/20 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-600/10"
                    : ""
                    } ${!isShowingReroll ? "hover:bg-white/15 hover:ring-1 hover:ring-white/20" : ""}`}
                style={{
                    borderRadius: "24px",
                    transform: holdState.isHolding
                        ? `scale(1.03) rotate(${Math.sin(Date.now() / 400) * 0.5}deg)`
                        : undefined,
                    filter: holdState.isHolding
                        ? "brightness(1.05) saturate(1.1) drop-shadow(0 0 10px rgba(168, 85, 247, 0.2))"
                        : undefined,
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                onClick={() => !isShowingReroll && handleTap(promotion.id)}
            >
                {!isShowingReroll && (
                    <div className="absolute top-4 right-4 transition-opacity duration-300">
                        <div className="w-6 h-6 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                            <span className="text-xs text-white/40">🔄</span>
                        </div>
                    </div>
                )}

                <CardContent className="p-6 group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                                {promotion.name.charAt(0)}
                            </div>
                            <div>
                                <div className="font-semibold text-white">{promotion.name} Campaign</div>
                                <div className="text-sm text-white/40">Tap to reroll</div>
                            </div>
                        </div>
                        <div className="text-right text-purple-400 font-bold text-lg">${pricing}</div>
                    </div>

                    {isShowingReroll ? (
                        <div className="space-y-4">
                            <p className="text-sm leading-relaxed text-white/80 mb-3">{cast_text}</p>
                            <div className="bg-black/20 rounded-2xl p-4 border border-white/10">
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Reroll Notes (optional)
                                </label>
                                <textarea
                                    value={rerollNotes[promotion.id] || ""}
                                    onChange={(e) => setRerollNotes((prev) => ({ ...prev, [promotion.id]: e.target.value }))}
                                    className="w-full bg-black/20 rounded-xl p-3 border border-white/10 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[80px] text-white placeholder-white/50"
                                    placeholder="e.g., use less emojis, make it more professional, add more excitement..."
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleReroll(promotion.id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full text-white text-sm font-semibold transition-all duration-300"
                                >
                                    🔄 Reroll
                                </button>
                                <button
                                    onClick={() => handleCancelReroll(promotion.id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-white text-sm font-medium transition-all duration-300"
                                >
                                    <X className="w-4 h-4" />
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {!cast_text ? (
                                <div className="space-y-2 animate-pulse">
                                    <div className="h-4 bg-white/20 rounded-lg w-full"></div>
                                    <div className="h-4 bg-white/20 rounded-lg w-5/6"></div>
                                    <div className="h-4 bg-white/20 rounded-lg w-4/5"></div>
                                    <div className="h-4 bg-white/20 rounded-lg w-3/4"></div>
                                    <div className="h-4 bg-white/20 rounded-lg w-2/3"></div>
                                </div>
                            ) : (
                                <p className="text-sm leading-relaxed text-white/80">{cast_text}</p>
                            )}

                            <button
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={() => handleHoldStart(promotion.id)}
                                onMouseUp={() => handleHoldEnd(promotion.id)}
                                onMouseLeave={() => handleHoldEnd(promotion.id)}
                                onTouchStart={() => handleHoldStart(promotion.id)}
                                onTouchEnd={() => handleHoldEnd(promotion.id)}
                                className={`w-full relative overflow-hidden py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-2xl text-white font-semibold transition-all duration-300 active:scale-[0.98] ${holdState.isHolding ? "shadow-lg shadow-purple-500/50 ring-2 ring-purple-400/50" : ""
                                    }`}
                            >
                                <div
                                    className="absolute inset-0 bg-gradient-to-r from-green-400/80 to-emerald-500/80 transition-all duration-75 ease-out"
                                    style={{
                                        width: `${holdState.progress}%`,
                                    }}
                                />
                                {holdState.isHolding && (
                                    <>
                                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-purple-600/20 animate-pulse" />
                                        <div className="absolute inset-0 overflow-hidden">
                                            <div
                                                className="absolute top-2 left-4 w-2 h-2 bg-white/40 rounded-full animate-bounce"
                                                style={{ animationDelay: "0ms" }}
                                            />
                                            <div
                                                className="absolute top-8 right-6 w-1 h-1 bg-purple-400/60 rounded-full animate-bounce"
                                                style={{ animationDelay: "200ms" }}
                                            />
                                            <div
                                                className="absolute bottom-6 left-8 w-1.5 h-1.5 bg-pink-400/50 rounded-full animate-bounce"
                                                style={{ animationDelay: "400ms" }}
                                            />
                                            <div
                                                className="absolute bottom-4 right-4 w-1 h-1 bg-white/30 rounded-full animate-bounce"
                                                style={{ animationDelay: "600ms" }}
                                            />
                                        </div>
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
                                        <div className="relative z-10 flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Posting & Paying...
                                        </div>
                                    </>
                                )}
                                {!holdState.isHolding && (
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        <Zap className="w-4 h-4" />
                                        Hold to Post & Earn
                                    </span>
                                )}
                            </button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

    );
}

export default CastCard; 