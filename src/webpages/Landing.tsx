import { useState, useEffect, useMemo } from "react"
import { Loader2, X, ChevronRight } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Helmet } from "react-helmet-async"
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
            <Helmet>
                {/* Default/Generic Frame Metadata */}
                <title>Hypeman - Find your Hypeman</title>
                <meta name="description" content="Paid promotion on Farcaster made easy. Amplify your reach through targeted promotions." />

                <meta property="og:title" content="Hypeman" />
                <meta property="og:description" content="Paid promotion on Farcaster made easy. Amplify your reach through targeted promotions." />
                <meta property="og:image" content="https://res.cloudinary.com/dsrjjqkjs/image/upload/v1760928637/replicate-prediction-ppnmz3g0yxrme0cssvhtx2r54w_alqowu.jpg" />
                <meta property="og:url" content="https://hypeman.social" />

                <meta property="fc:frame" content="vNext" />
                <meta property="fc:frame:image" content="https://res.cloudinary.com/dsrjjqkjs/image/upload/v1760928637/replicate-prediction-ppnmz3g0yxrme0cssvhtx2r54w_alqowu.jpg" />
                <meta property="fc:frame:button:1" content="Browse Promotions" />
                <meta property="fc:frame:button:1:action" content="link" />
                <meta property="fc:frame:button:1:target" content="https://hypeman.social" />
            </Helmet>

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
