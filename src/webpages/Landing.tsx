"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, Users, ArrowRight } from "lucide-react"
import { useState } from "react"
import { NavLink } from "react-router-dom"

export default function Landing() {
    const [touchStart, setTouchStart] = useState<number | null>(null)
    const [touchEnd, setTouchEnd] = useState<number | null>(null)

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null)
        setTouchStart(e.targetTouches[0].clientX)
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX)
    }

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return
        const distance = touchStart - touchEnd
        const isLeftSwipe = distance > 50
        const isRightSwipe = distance < -50

        if (isLeftSwipe) {
            window.location.href = "/creators"
        }
        if (isRightSwipe) {
            window.location.href = "/buyers"
        }
    }

    return (
        <div
            className="min-h-screen bg-gray-950 text-white overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-50">
                <div className="px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden">
                            <img
                                src="/hypeman-logo.png"
                                alt="Hypeman Logo"
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <span className="text-xl font-bold text-white">HYPEMAN</span>
                    </div>
                </div>
            </header>

            <div className="px-4 py-8">
                <div className="text-center mb-8">
                    <div className="relative">
                        <div className="mb-6">
                            <div className="w-28 h-28 mx-auto rounded-2xl overflow-hidden shadow-2xl">
                                <img
                                    src="/hypeman-logo.png"
                                    alt="Hypeman Logo"
                                    width={150}
                                    height={150}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black mb-4">
                            <span className="text-white bg-gradient-to-r from-blue-300 via-purple-300 to-blue-300 bg-clip-text text-transparent animate-pulse [text-shadow:_0_0_20px_rgb(147_51_234_/_50%)]">
                                HYPEMAN
                            </span>
                        </h1>
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent flex-1"></div>
                            <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent flex-1"></div>
                        </div>
                        <p className="text-gray-200 text-lg font-medium mb-2">Ready to make moves?</p>
                    </div>
                </div>

                <div className="space-y-4 max-w-sm mx-auto">
                    <Card className="bg-gray-900 border border-gray-800 hover:border-blue-500 transition-all duration-300 cursor-pointer group active:scale-95 touch-manipulation">
                        <CardHeader className="text-center pb-4">
                            <div className="w-16 h-16 bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/20 transition-all duration-300">
                                <Users className="w-8 h-8 text-blue-500" />
                            </div>
                            <CardTitle className="text-xl font-bold text-white mb-2">Need Promotion?</CardTitle>
                            <CardDescription className="text-gray-400 text-sm">Find creators to amplify your project</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <NavLink to="/buyers">
                                <Button className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-base py-3 rounded-lg font-semibold transition-all duration-200 touch-manipulation">
                                    Find Creators
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </NavLink>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-900 border border-gray-800 hover:border-purple-500 transition-all duration-300 cursor-pointer group active:scale-95 touch-manipulation">
                        <CardHeader className="text-center pb-4">
                            <div className="w-16 h-16 bg-purple-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-500/20 transition-all duration-300">
                                <Zap className="w-8 h-8 text-purple-500" />
                            </div>
                            <CardTitle className="text-xl font-bold text-white mb-2">I'm a Creator</CardTitle>
                            <CardDescription className="text-gray-400 text-sm">Monetize your influence and earn</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <NavLink to="/creators">
                                <Button className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-base py-3 rounded-lg font-semibold transition-all duration-200 touch-manipulation">
                                    Start Earning
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </NavLink>
                        </CardContent>
                    </Card>
                </div>

                <div className="text-center mt-8 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                    <p className="text-gray-500 text-xs">
                        Built on <span className="text-blue-400 font-semibold">Base</span> • Swipe to navigate
                    </p>
                </div>
            </div>
        </div>
    )
}
