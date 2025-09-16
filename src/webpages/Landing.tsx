
import type React from "react"
import { NavLink } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Zap, Plus, DollarSign, ArrowRight, Check, X } from "lucide-react"
import { useState } from "react"

export default function HomePage() {
    const [swipeStates, setSwipeStates] = useState<{ [key: number]: { isSwipingRight: boolean; translateX: number } }>({})
    const [editingCast, setEditingCast] = useState<number | null>(null)
    const [editedTexts, setEditedTexts] = useState<{ [key: number]: string }>({})

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

    const handleTouchStart = (e: React.TouchEvent, castId: number) => {
        const touch = e.touches[0]
        setSwipeStates((prev) => ({
            ...prev,
            [castId]: { ...prev[castId], startX: touch.clientX, startY: touch.clientY },
        }))
    }

    const handleTouchMove = (e: React.TouchEvent, castId: number) => {
        const touch = e.touches[0]
        const currentState: any = swipeStates[castId]
        if (!currentState?.startX) return

        const deltaX = touch.clientX - currentState.startX
        const deltaY = Math.abs(touch.clientY - (currentState.startY || 0))

        if (deltaY < 50 && deltaX > 20) {
            setSwipeStates((prev) => ({
                ...prev,
                [castId]: {
                    ...prev[castId],
                    isSwipingRight: true,
                    translateX: Math.min(deltaX, 100),
                },
            }))
        }
    }

    const handleTouchEnd = (e: React.TouchEvent, castId: number) => {
        const currentState: any = swipeStates[castId]
        if (!currentState?.startX) return

        const touch = e.changedTouches[0]
        const deltaX = touch.clientX - currentState.startX

        if (deltaX > 80) {
            handlePost(castId)
        } else {
            setSwipeStates((prev) => ({
                ...prev,
                [castId]: { isSwipingRight: false, translateX: 0 },
            }))
        }
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
                        const swipeState = swipeStates[cast.id] || { isSwipingRight: false, translateX: 0 }
                        const currentText = editedTexts[cast.id] || cast.aiGeneratedText
                        const isEditing = editingCast === cast.id

                        return (
                            <Card
                                key={cast.id}
                                className="bg-card border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group rounded-none border-x-0 border-t-0 last:border-b-0 cursor-pointer select-none relative overflow-hidden"
                                style={{
                                    animationDelay: `${index * 100}ms`,
                                    transform: `translateX(${swipeState.translateX}px)`,
                                    transition: swipeState.isSwipingRight ? "none" : "transform 0.3s ease",
                                }}
                                onTouchStart={(e) => handleTouchStart(e, cast.id)}
                                onTouchMove={(e) => handleTouchMove(e, cast.id)}
                                onTouchEnd={(e) => handleTouchEnd(e, cast.id)}
                                onClick={() => !isEditing && handleTap(cast.id)}
                            >
                                {swipeState.isSwipingRight && (
                                    <div
                                        className="absolute inset-y-0 left-0 bg-primary/20 flex items-center justify-start pl-6 transition-all duration-200"
                                        style={{ width: `${swipeState.translateX}px` }}
                                    >
                                        <div className="flex items-center gap-2 text-primary">
                                            <ArrowRight className="w-5 h-5" />
                                            <span className="text-sm font-medium">Post</span>
                                        </div>
                                    </div>
                                )}

                                <CardContent className="p-6 relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2 bg-primary px-3 py-1.5 rounded-full">
                                            <DollarSign className="w-4 h-4 text-white" />
                                            <span className="text-white font-bold text-sm">${cast.budget}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {isEditing ? "Editing..." : "Tap to edit • Swipe to post"}
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
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handlePost(cast.id)
                                                }}
                                                className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary/90 rounded-lg text-white text-sm font-medium transition-all hover:scale-[1.02]"
                                            >
                                                <ArrowRight className="w-4 h-4" />
                                                Swipe to Post
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
