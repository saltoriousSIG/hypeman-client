import { useState, useEffect, useMemo } from "react"
import { BarChart3 } from "lucide-react"
import { useFrameContext } from "@/providers/FrameProvider";
import CastCard from "@/components/CastCard/CastCard";
import LoginModal from "@/components/LoginModal/LoginModal";
import MainLayout from "@/components/Layout/MainLayout";
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
        <MainLayout className="space-y-4">
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

            <LoginModal showLoginModal={showLoginModal} handleShowLoginModal={handleShowLoginModal} />
        </MainLayout>
    )
}
