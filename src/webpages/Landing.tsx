import { useState, useEffect, useMemo } from "react"
import { BarChart3, Loader2, X } from "lucide-react"
import { useFrameContext } from "@/providers/FrameProvider";
import CastCard from "@/components/CastCard/CastCard";
import LoginModal from "@/components/LoginModal/LoginModal";
import MainLayout from "@/components/Layout/MainLayout";
import useGetPostPricing from "@/hooks/useGetPostPricing";
import { useData } from "@/providers/DataProvider";

export default function HomePage() {
    const { isAuthenticated } = useFrameContext();

    const [showLoginModal, setShowLoginModal] = useState(false)

    const { promoterPromotions, loading } = useData();

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
        return promoterPromotions || [];
    }, [promoterPromotions]);

    return (
        <MainLayout className="space-y-4">
            {loading && (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Loader2 className="w-8 h-8 text-white animate-spin absolute" />
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">Loading Promotions...</h3>
                    <p className="text-white/60 max-w-sm mx-auto leading-relaxed">
                        Please wait while we fetch the latest promotion opportunities for you.
                    </p>
                </div>
            )}
            {availablePromotions.map((cast) => {
                return (
                    <CastCard
                        key={cast.id}
                        promotion={cast}
                        pricing={pricing}
                        promotionContent={cast.cast_data?.text}
                        promotionAuthor={cast.cast_data.author.username}
                        promotionEmmbedContext={cast.cast_data?.embeds}
                    />
                )
            })}

            {availablePromotions.length === 0 && !loading && (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Promotions</h3>
                    <p className="text-white/60 max-w-sm mx-auto leading-relaxed">
                        Check back soon.
                    </p>
                </div>
            )}

            <LoginModal showLoginModal={showLoginModal} handleShowLoginModal={handleShowLoginModal} />
        </MainLayout>
    )
}
