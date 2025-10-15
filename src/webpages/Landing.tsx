import { useState, useEffect, useMemo } from "react"
import { BarChart3 } from "lucide-react"
import { useFrameContext } from "@/providers/FrameProvider";
import CastCard from "@/components/CastCard/CastCard";
import LoginModal from "@/components/LoginModal/LoginModal";
import Footer from "@/components/Footer/Footer";
import Header from "@/components/Header/Header";
import useGetPostPricing from "@/hooks/useGetPostPricing";
import { useData } from "@/providers/DataProvider";

export default function HomePage() {
    const { isAuthenticated } = useFrameContext();

    const [showLoginModal, setShowLoginModal] = useState(false)

    const { promotions, promotion_casts, promotion_intents } = useData();

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
        return promotions.map((p) => {
            const intent = promotion_intents[p.id];
            return {
                ...p,
                intent
            }
        }).filter((p) => {
            return !p.intent?.castHash
        });
    }, [promotions, promotion_intents]);

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

            <Header />

            <div className="pt-20 px-4 space-y-4 relative z-10">
                {availablePromotions.map((cast) => {
                    return (
                        <CastCard
                            key={cast.id}
                            promotion={cast}
                            cast_text={promotion_casts[cast.id]?.generated_cast}
                            pricing={pricing}
                            promotionContent={promotion_casts[cast.id]?.cast_text}
                            promotionAuthor={promotion_casts[cast.id]?.author}
                            promotionEmmbedContext={promotion_casts[cast.id]?.cast_embed_context}
                        />
                    )
                })}

                {availablePromotions.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BarChart3 className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Available Promotions</h3>
                        <p className="text-white/60 max-w-sm mx-auto leading-relaxed">
                            Check back soon for new promotion opportunities.
                        </p>
                    </div>
                )}
            </div>

            <LoginModal showLoginModal={showLoginModal} handleShowLoginModal={handleShowLoginModal} />

            <Footer />
        </div>
    )
}
