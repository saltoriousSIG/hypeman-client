import { useState, useEffect, useMemo } from "react"
import { Loader2, X, ChevronRight } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useFrameContext } from "@/providers/FrameProvider";
import PromotionCastPreview from "@/components/CastCard/PromotionCastPreview";
import LoginModal from "@/components/LoginModal/LoginModal";
import MainLayout from "@/components/Layout/MainLayout";
import { useData } from "@/providers/DataProvider";

export default function HomePage() {
    const { isAuthenticated } = useFrameContext();
    const navigate = useNavigate();

    const [showLoginModal, setShowLoginModal] = useState(false)

    const { promoterPromotions, loading } = useData();

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
                    <div key={cast.id} className="space-y-2 border border-white/10 rounded-lg">
                        <PromotionCastPreview
                            username={cast.cast_data.author.username}
                            text={cast.cast_data?.text || ""}
                            pfpUrl={cast.cast_data.author.pfp_url || ""}
                            authorFid={cast.cast_data.author.fid}
                            castUrl={(cast as any).cast_url || ""}
                        />
                        <div className="p-2 pt-0">
                            <button
                                onClick={() => navigate(`/promotion/${cast.id}`)}
                                className="w-full cursor-pointer flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white text-sm font-semibold px-4 py-4 rounded-lg transition-all active:scale-[0.95]"
                            >
                                <span>View Details</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                    </div>
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
