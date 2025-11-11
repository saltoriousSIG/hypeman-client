import { useState, useEffect } from "react"
import { Loader2, X, ChevronRight } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useFrameContext } from "@/providers/FrameProvider";
import PromotionCastPreview from "@/components/CastCard/PromotionCastPreview";
import LoginModal from "@/components/LoginModal/LoginModal";
import MainLayout from "@/components/Layout/MainLayout";
import { useData } from "@/providers/DataProvider";
import MaintenancePage from "@/components/Maintenance/Maintenance";
import LoadingState from "@/components/LoadingState/LoadingState";

export default function HomePage() {
    const { isAuthenticated } = useFrameContext();
    const [showLoginModal, setShowLoginModal] = useState(false)

    const navigate = useNavigate();


    const { promotions, loading } = useData();

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


    if (import.meta.env.VITE_MAINTENANCE_MODE === "true") {
        return <MaintenancePage />;
    }

    return (
        <MainLayout className="space-y-4 bg-white/5 backdrop-blur-sm">
            {loading && (
                <LoadingState
                    title="Loading promotions galaxy..."
                    message="Fetching the cast, budgets, and intent status from the chain."
                    hint="This usually takes just a sec"
                />
            )}
            {promotions?.map((cast) => {
                return (
                    <div key={cast.id} className="space-y-2 border border-white/10 rounded-lg">
                        <PromotionCastPreview
                            username={cast.cast_data.author.username}
                            text={cast.cast_data?.text || ""}
                            pfpUrl={cast.cast_data.author.pfp_url || ""}
                            authorFid={cast.cast_data.author.fid}
                            castUrl={(cast as any).cast_url || ""}
                            embeds={cast.cast_data?.embeds || []}
                            promotionId={cast.id}
                        />
                    </div>
                )
            })}
            {promotions?.length === 0 && !loading && (
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
