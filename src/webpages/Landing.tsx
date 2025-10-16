import { useState, useEffect, useMemo } from "react"
import { Settings, BarChart3 } from "lucide-react"
import { NavLink } from "react-router-dom";
import { useFrameContext } from "@/providers/FrameProvider";
import CastCard from "@/components/CastCard/CastCard";
import LoginModal from "@/components/LoginModal/LoginModal";
import Footer from "@/components/Footer/Footer";
import useGetPostPricing from "@/hooks/useGetPostPricing";
import { useData } from "@/providers/DataProvider";
import { Loader2 } from "lucide-react";

export default function HomePage() {
    const { fUser, isAuthenticated } = useFrameContext();

    const [activeTab, setActiveTab] = useState<"active" | "completed">("active")
    const [showLoginModal, setShowLoginModal] = useState(false)

    const { promoterPromotions, loading, promoterPromotionsLoading } = useData();

    const pricing = useGetPostPricing();

    const handleShowLoginModal = (state: boolean) => {
        setShowLoginModal(state);
    }

    useEffect(() => {
        if (!isAuthenticated) {
            setShowLoginModal(true);
        } else {
            setShowLoginModal(false);
        }
    }, [isAuthenticated]);

    const availablePromotions = useMemo(() => {
        return promoterPromotions?.filter(p => p.display_to_promoters && !p.claimable) || [];
    }, [promoterPromotions]);

    const completedPromotions = useMemo(() => {
        return promoterPromotions?.filter(p => p.claimable) || [];
    }, [promoterPromotions]);

    console.log(promoterPromotions);

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
                    <h1 className="text-lg font-semibold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent title">
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
                            ${1000} earned
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
                        Claims
                    </button>
                </div>
                <>
                    {loading || promoterPromotionsLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {activeTab === "active" ? (
                                availablePromotions.map((promotion: any) => {
                                    return (
                                        <CastCard
                                            key={promotion.id}
                                            promotion={promotion}
                                            cast_text={"HURLS, REPLACE ME PLZ :)"}
                                            pricing={pricing}
                                            promotionContent={promotion.cast_data.text}
                                            promotionAuthor={promotion.cast_data.author.username}
                                            promotionEmmbedContext={promotion.cast_data.embeds}
                                        />
                                    )
                                })
                            ) : (
                                <div className="space-y-4">
                                    {completedPromotions.map((promotion: any) => (
                                        <CastCard
                                            key={promotion.id}
                                            promotion={promotion}
                                            cast_text={promotion.cast_data.text}
                                            pricing={pricing}
                                            promotionContent={promotion.cast_data.text}
                                            promotionAuthor={promotion.cast_data.author.username}
                                            promotionEmmbedContext={promotion.cast_data.embeds}
                                        />
                                    ))}

                                    {completedPromotions.length === 0 && (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <BarChart3 className="w-8 h-8 text-white" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">No History Yet</h3>
                                            <p className="text-white/60 max-w-sm mx-auto leading-relaxed">
                                                Your completed promotions and earnings will appear here.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>

                    )
                    }

                </>

            </div>

            <LoginModal showLoginModal={showLoginModal} handleShowLoginModal={handleShowLoginModal} />

            <Footer />
        </div>
    )
}
