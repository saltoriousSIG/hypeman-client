import { NavLink } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Zap, Plus, DollarSign, Check, X } from "lucide-react"
import { useState, useRef } from "react"

export default function HomePage() {
    const [holdStates, setHoldStates] = useState<{ [key: number]: { isHolding: boolean; progress: number } }>({})
    const [editingCast, setEditingCast] = useState<number | null>(null)
    const [editedTexts, setEditedTexts] = useState<{ [key: number]: string }>({})
    const holdTimers = useRef<{ [key: number]: NodeJS.Timeout }>({})
    const progressIntervals = useRef<{ [key: number]: NodeJS.Timeout }>({})

    const readyToPostCasts = [
        {
            id: 1,
            aiGeneratedText:
                "Just discovered this insane new DeFi protocol that's about to change everything! 🚀 The yield farming opportunities are absolutely wild - we're talking potential 200%+ APY. Early access starts tomorrow and I'm already locked and loaded. Who else is ready to ride this wave? #DeFi #CryptoGains #YieldFarming",
            budget: 250,
        },
        {
            id: 2,
            aiGeneratedText:
                "Okay this NFT drop is actually fire 🔥 The art style is giving me major BAYC vibes but with a fresh twist. Mint starts in 6 hours and I'm setting my alarms. The roadmap looks solid and the team has serious credentials. Don't sleep on this one! #NFT #Mint #DigitalArt",
            budget: 150,
        },
        {
            id: 3,
            aiGeneratedText:
                "MASSIVE gaming tournament alert! 🎮 $50k prize pool, top streamers competing, and the gameplay is absolutely insane. I'll be streaming my reactions live - this is going to be legendary. Mark your calendars because this is THE event of the year! #Gaming #Esports #Tournament",
            budget: 300,
        },
    ]

    const handleHoldStart = (castId: number) => {
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
        <div className="min-h-screen bg-background text-foreground pb-20 dark">
            <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                        <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm">
                            <img
                                src="/hypeman-logo.png"
                                alt="Hypeman Logo"
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <span className="text-xl font-bold text-white bg-gradient-to-r from-primary to-accent bg-clip-text">
                            HYPEMAN
                        </span>
                    </div>
                </div>
            </header>

            <div className="">
                <div className="space-y-0">
                    {readyToPostCasts.map((cast, index) => {
                        const holdState = holdStates[cast.id] || { isHolding: false, progress: 0 }
                        const currentText = editedTexts[cast.id] || cast.aiGeneratedText
                        const isEditing = editingCast === cast.id

                        return (
                            <Card
                                key={cast.id}
                                className="bg-card border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group rounded-none border-x-0 border-t-0 last:border-b-0 cursor-pointer select-none relative overflow-hidden"
                                style={{
                                    animationDelay: `${index * 100}ms`,
                                }}
                                onClick={() => !isEditing && handleTap(cast.id)}
                            >
                                <CardContent className="p-6 relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2 bg-primary px-3 py-1.5 rounded-full">
                                            <DollarSign className="w-4 h-4 text-white" />
                                            <span className="text-white font-bold text-sm">${cast.budget}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {isEditing ? "Editing..." : "Tap to edit • Hold to post"}
                                        </div>
                                    </div>

                                    {isEditing ? (
                                        <div className="space-y-4">
                                            <textarea
                                                value={currentText}
                                                onChange={(e) => setEditedTexts((prev) => ({ ...prev, [cast.id]: e.target.value }))}
                                                className="w-full bg-muted/30 rounded-lg p-4 border border-border/50 text-card-foreground text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[120px]"
                                                placeholder="Edit your cast..."
                                                autoFocus
                                            />
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleSaveEdit(cast.id)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary/90 rounded-full text-white text-xs font-medium transition-all"
                                                >
                                                    <Check className="w-3 h-3" />
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => handleCancelEdit(cast.id)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-muted-foreground text-xs font-medium transition-all"
                                                >
                                                    <X className="w-3 h-3" />
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                                                <p className="text-card-foreground text-sm leading-relaxed line-clamp-4">{currentText}</p>
                                            </div>
                                            <button
                                                onClick={(e) => e.stopPropagation()}
                                                onMouseDown={() => handleHoldStart(cast.id)}
                                                onMouseUp={() => handleHoldEnd(cast.id)}
                                                onMouseLeave={() => handleHoldEnd(cast.id)}
                                                onTouchStart={() => handleHoldStart(cast.id)}
                                                onTouchEnd={() => handleHoldEnd(cast.id)}
                                                className="w-full relative overflow-hidden py-3 bg-primary hover:bg-primary/90 rounded-lg text-white text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                                            >
                                                <div
                                                    className="absolute inset-0 bg-primary/40 transition-all duration-75 ease-out"
                                                    style={{
                                                        width: `${holdState.progress}%`,
                                                    }}
                                                />
                                                <span className="relative z-10">
                                                    {holdState.isHolding ? "Hold to Post..." : "Hold to Post"}
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-center gap-4">
                        <NavLink to="/creators">
                            <button className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 rounded-full text-white text-sm font-medium transition-all hover:scale-105">
                                <Zap className="w-4 h-4" />
                                Casts
                            </button>
                        </NavLink>
                        <NavLink to="/buyers">
                            <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 rounded-full text-white text-sm font-medium transition-all hover:scale-105">
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
