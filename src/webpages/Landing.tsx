import { NavLink } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Zap, Plus, Check, X, Settings, Clock, DollarSign, Eye } from "lucide-react"
import { useState, useRef } from "react"
import { useFrameContext } from "@/providers/FrameProvider"
import sdk from "@farcaster/frame-sdk"

export default function HomePage() {
    const [holdStates, setHoldStates] = useState<{ [key: number]: { isHolding: boolean; progress: number } }>({})
    const [editingCast, setEditingCast] = useState<number | null>(null)
    const [editedTexts, setEditedTexts] = useState<{ [key: number]: string }>({})
    const [activeTab, setActiveTab] = useState<"active" | "completed">("active")
    const holdTimers = useRef<{ [key: number]: NodeJS.Timeout }>({})
    const progressIntervals = useRef<{ [key: number]: NodeJS.Timeout }>({})

    const { fUser } = useFrameContext();
    console.log(fUser);

    const currentUser = {
        username: "alex_crypto",
        profileImage: "/profile-avatar-person.jpg",
        totalEarned: 1250,
    }

    const readyToPostCasts = [
        {
            id: 1,
            aiGeneratedText:
                "Just discovered this insane new DeFi protocol that's about to change everything! 🚀 The yield farming opportunities are absolutely wild - we're talking potential 200%+ APY. Early access starts tomorrow and I'm already locked and loaded. Who else is ready to ride this wave? #DeFi #CryptoGains #YieldFarming",
            budget: 250,
            minTime: "24h",
            category: "Crypto",
            engagement: "High",
            views: "12.5K",
        },
        {
            id: 2,
            aiGeneratedText:
                "Okay this NFT drop is actually fire 🔥 The art style is giving me major BAYC vibes but with a fresh twist. Mint starts in 6 hours and I'm setting my alarms. The roadmap looks solid and the team has serious credentials. Don't sleep on this one! #NFT #Mint #DigitalArt",
            budget: 150,
            minTime: "12h",
            category: "NFT",
            engagement: "Medium",
            views: "8.2K",
        },
        {
            id: 3,
            aiGeneratedText:
                "MASSIVE gaming tournament alert! 🎮 $50k prize pool, top streamers competing, and the gameplay is absolutely insane. I'll be streaming my reactions live - this is going to be legendary. Mark your calendars because this is THE event of the year! #Gaming #Esports #Tournament",
            budget: 300,
            minTime: "48h",
            category: "Gaming",
            engagement: "High",
            views: "15.7K",
        },
    ]

    const completedPromotions = [
        {
            id: 101,
            text: "This new AI trading bot is absolutely crushing it! 🤖 Made 15% gains in just 2 days. The algorithm is next level and the team behind it has serious credentials. Early access ends soon! #AI #Trading #Crypto",
            category: "Crypto",
            earned: 180,
            postedAt: "2 days ago",
            status: "claimable", // claimable, claimed, pending
            engagement: "2.1K likes, 340 recasts",
            minTimeRemaining: null,
        },
        {
            id: 102,
            text: "Just minted from this incredible NFT collection and WOW! 🎨 The artwork is stunning and the utility roadmap is insane. Floor price already pumping. This is going to be huge! #NFT #Art #Web3",
            category: "NFT",
            earned: 120,
            postedAt: "5 days ago",
            status: "claimed",
            engagement: "1.8K likes, 290 recasts",
            minTimeRemaining: null,
        },
        {
            id: 103,
            text: "This gaming platform is revolutionizing how we play! 🎮 Earn real rewards while gaming, incredible graphics, and the community is amazing. Beta access is live now! #Gaming #P2E #Web3",
            category: "Gaming",
            earned: 95,
            postedAt: "1 week ago",
            status: "pending",
            engagement: "1.2K likes, 180 recasts",
            minTimeRemaining: "6h remaining",
        },
    ]

    const handleHoldStart = async (castId: number) => {
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

        await sdk.haptics.impactOccurred("heavy");
        holdTimers.current[castId] = setTimeout(() => {
            handlePost(castId)
            handleHoldEnd(castId)
        }, 1000) // 1 second hold
    }

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
        if (editingCast !== castId) {
            setEditingCast(castId)
            const cast = readyToPostCasts.find((c) => c.id === castId)
            if (cast && !editedTexts[castId]) {
                setEditedTexts((prev) => ({ ...prev, [castId]: cast.aiGeneratedText }))
            }
        }
    }

    const handleSaveEdit = (castId: number) => {
        setEditingCast(null)
    }

    const handleCancelEdit = (castId: number) => {
        const cast = readyToPostCasts.find((c) => c.id === castId)
        if (cast) {
            setEditedTexts((prev) => ({ ...prev, [castId]: cast.aiGeneratedText }))
        }
        setEditingCast(null)
    }

    const handlePost = (castId: number) => {
        console.log(`[v0] Posting cast ${castId}`)
        // Add post functionality here
    }

    return (
        <div className="min-h-screen bg-black text-white pb-20 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-20 left-8 w-20 h-20 bg-purple-500/30 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute top-40 right-12 w-16 h-16 bg-green-400/40 rounded-full blur-lg animate-bounce"></div>
                <div className="absolute top-60 left-16 w-12 h-12 bg-yellow-400/50 rounded-full blur-md animate-pulse"></div>
                <div className="absolute bottom-40 right-8 w-24 h-24 bg-blue-500/25 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute bottom-60 left-12 w-8 h-8 bg-pink-400/60 rounded-full blur-sm animate-bounce"></div>
                <div className="absolute top-80 right-20 w-14 h-14 bg-cyan-400/35 rounded-full blur-lg animate-pulse"></div>
                <div className="absolute top-32 right-32 w-6 h-6 bg-white/40 rounded-full blur-sm"></div>
                <div className="absolute bottom-32 left-32 w-10 h-10 bg-purple-400/30 rounded-full blur-md animate-bounce"></div>
                <div className="absolute top-96 left-6 w-4 h-4 bg-green-300/50 rounded-full blur-sm"></div>
            </div>

            <header className="relative z-10 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <img src="/hypeman-logo.png" alt="Hypeman Logo" width={32} height={32} className="rounded-lg" />
                    <h1 className="text-lg font-semibold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent">
                        HYPEMAN
                    </h1>
                </div>
                <NavLink to="/creators/settings">
                    <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-300">
                        <Settings className="w-4 h-4 text-white/60" />
                    </button>
                </NavLink>
            </header>

            <div className="px-4 space-y-4 relative z-10">
                {activeTab === "active" && (
                    <div className="text-center mb-8">
                        <div className="relative inline-block mb-4">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-purple-600 p-1 mx-auto">
                                <img
                                    src={fUser?.pfpUrl || "/placeholder.svg"}
                                    alt={fUser?.username}
                                    width={88}
                                    height={88}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">@{fUser?.username}</h2>
                        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500/20 to-green-400/20 text-green-400 px-6 py-2 rounded-full text-sm font-semibold border border-green-400/20">
                            ${currentUser.totalEarned} earned
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2 mb-6 bg-white/5 rounded-2xl p-1 backdrop-blur-sm border border-white/10">
                    <button
                        onClick={() => setActiveTab("active")}
                        className={`flex-1 py-4 px-6 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === "active"
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                            : "text-white/60 hover:text-white/80 hover:bg-white/5"
                            }`}
                    >
                        Available
                    </button>
                    <button
                        onClick={() => setActiveTab("completed")}
                        className={`flex-1 py-4 px-6 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === "completed"
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                            : "text-white/60 hover:text-white/80 hover:bg-white/5"
                            }`}
                    >
                        Claim
                    </button>
                </div>

                {activeTab === "active" ? (
                    // Active promotions (existing code)
                    readyToPostCasts.map((cast) => {
                        const holdState = holdStates[cast.id] || { isHolding: false, progress: 0 }
                        const currentText = editedTexts[cast.id] || cast.aiGeneratedText
                        const isEditing = editingCast === cast.id

                        return (
                            <div key={cast.id} className="space-y-3">
                                {/* Cast card */}
                                <Card
                                    className={`relative overflow-hidden border-0 cursor-pointer transition-all duration-300 hover:scale-[1.02] bg-white/10 backdrop-blur-sm text-white ${holdState.isHolding
                                        ? "scale-[1.03] shadow-lg shadow-purple-500/20 ring-2 ring-purple-400/20 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-600/10"
                                        : ""
                                        } ${!isEditing ? "hover:bg-white/15 hover:ring-1 hover:ring-white/20" : ""}`}
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
                                    onClick={() => !isEditing && handleTap(cast.id)}
                                >
                                    {!isEditing && (
                                        <div className="absolute top-4 right-4 transition-opacity duration-300">
                                            <div className="w-6 h-6 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                                                <span className="text-xs text-white/40">✏️</span>
                                            </div>
                                        </div>
                                    )}

                                    <CardContent className="p-6 group">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                                                    {cast.category.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-white">{cast.category} Campaign</div>
                                                    <div className="text-sm text-white/40">{cast.minTime} minimum • Tap to edit</div>
                                                </div>
                                            </div>
                                            <div className="text-right text-purple-400 font-bold text-lg">${cast.budget}</div>
                                        </div>

                                        {isEditing ? (
                                            <div className="space-y-4">
                                                <textarea
                                                    value={currentText}
                                                    onChange={(e) => setEditedTexts((prev) => ({ ...prev, [cast.id]: e.target.value }))}
                                                    className="w-full bg-black/10 rounded-2xl p-4 border-0 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[120px] text-white placeholder-white/50"
                                                    placeholder="Edit your cast..."
                                                    autoFocus
                                                />
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => handleSaveEdit(cast.id)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-full text-white text-sm font-semibold transition-all duration-300"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => handleCancelEdit(cast.id)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-white text-sm font-medium transition-all duration-300"
                                                    >
                                                        <X className="w-4 h-4" />
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <p className="text-sm leading-relaxed text-white/80">{currentText}</p>

                                                <button
                                                    onClick={(e) => e.stopPropagation()}
                                                    onMouseDown={() => handleHoldStart(cast.id)}
                                                    onMouseUp={() => handleHoldEnd(cast.id)}
                                                    onMouseLeave={() => handleHoldEnd(cast.id)}
                                                    onTouchStart={() => handleHoldStart(cast.id)}
                                                    onTouchEnd={() => handleHoldEnd(cast.id)}
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
                                                            {/* Animated gradient background */}
                                                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-purple-600/20 animate-pulse" />

                                                            {/* Floating particles effect */}
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

                                                            {/* Ripple effect */}
                                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
                                                            <div className="relative z-10 flex items-center justify-center gap-2">
                                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                Posting...
                                                            </div>
                                                        </>
                                                    )}
                                                    {!holdState.isHolding && (
                                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                                            <Zap className="w-4 h-4" />
                                                            Hold to Post
                                                        </span>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )
                    })
                ) : (
                    <div className="space-y-4">
                        {completedPromotions.map((promotion) => (
                            <Card
                                key={promotion.id}
                                className="bg-white/10 backdrop-blur-sm border-white/20 rounded-2xl hover:bg-white/15 transition-all duration-300"
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg">
                                                {promotion.category.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-white text-lg">{promotion.category} Campaign</div>
                                                <div className="text-sm text-white/50">{promotion.postedAt}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-green-400 font-bold text-xl">${promotion.earned}</div>
                                            <div
                                                className={`text-xs px-3 py-1 rounded-full font-medium ${promotion.status === "claimed"
                                                    ? "bg-green-500/20 text-green-400 border border-green-400/20"
                                                    : promotion.status === "claimable"
                                                        ? "bg-yellow-500/20 text-yellow-400 border border-yellow-400/20"
                                                        : "bg-orange-500/20 text-orange-400 border border-orange-400/20"
                                                    }`}
                                            >
                                                {promotion.status === "claimed"
                                                    ? "Claimed"
                                                    : promotion.status === "claimable"
                                                        ? "Ready to Claim"
                                                        : "Pending"}
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-sm leading-relaxed text-white/80 mb-4">{promotion.text}</p>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 text-xs text-white/60">
                                            <div className="flex items-center gap-1">
                                                <Eye className="w-3 h-3" />
                                                {promotion.engagement}
                                            </div>
                                            {promotion.minTimeRemaining && (
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {promotion.minTimeRemaining}
                                                </div>
                                            )}
                                        </div>

                                        {promotion.status === "claimable" && (
                                            <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-full text-white text-sm font-bold transition-all duration-300 shadow-lg shadow-green-500/25">
                                                <DollarSign className="w-4 h-4" />
                                                Claim ${promotion.earned}
                                            </button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/20 z-50">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                        <NavLink to="/">
                            <button className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm font-semibold transition-all duration-300 border border-white/10">
                                <Zap className="w-4 h-4" />
                                Browse
                            </button>
                        </NavLink>
                        <NavLink to="/creators">
                            <button className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full text-white text-sm font-bold transition-all duration-300 shadow-lg shadow-purple-500/25">
                                <Plus className="w-4 h-4" />
                                Create
                            </button>
                        </NavLink>
                    </div>
                </div>
            </div>
        </div>
    )
}
