import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useData } from "@/providers/DataProvider";
import CastCard from "@/components/CastCard/CastCard";
import MainLayout from "@/components/Layout/MainLayout";
import useGetPostPricing from "@/hooks/useGetPostPricing";
import { useMemo } from "react";

export default function PromotionDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { promoterPromotions, loading } = useData();
    const pricing = useGetPostPricing();

    const promotion = useMemo(() => {
        return promoterPromotions?.find((p) => p.id === id);
    }, [promoterPromotions, id]);

    if (loading) {
        return (
            <MainLayout className="space-y-4">
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Loader2 className="w-8 h-8 text-white animate-spin absolute" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Loading Promotion...</h3>
                    <p className="text-white/60 max-w-sm mx-auto leading-relaxed">
                        Please wait while we fetch the promotion details.
                    </p>
                </div>
            </MainLayout>
        );
    }

    if (!promotion) {
        return (
            <MainLayout className="space-y-4">
                <button
                    onClick={() => navigate("/")}
                    className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to all promotions
                </button>
                <div className="text-center py-12">
                    <h3 className="text-xl font-bold text-white mb-2">Promotion Not Found</h3>
                    <p className="text-white/60 max-w-sm mx-auto leading-relaxed">
                        This promotion doesn't exist or is no longer available.
                    </p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout className="space-y-4">
            <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to all promotions
            </button>

            <div className="space-y-4">
                <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4">
                    <h1 className="text-2xl font-bold text-white mb-2">{promotion.name}</h1>
                    {promotion.description && (
                        <p className="text-white/70 mb-4">{promotion.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-white/50 text-sm">Budget Remaining</span>
                            <p className="text-white font-semibold">
                                ${(Number(promotion.remaining_budget) / 1e18).toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <span className="text-white/50 text-sm">Total Budget</span>
                            <p className="text-white font-semibold">
                                ${(Number(promotion.total_budget) / 1e18).toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>

                <CastCard
                    promotion={promotion}
                    pricing={pricing}
                    promotionContent={promotion.cast_data?.text}
                    promotionAuthor={promotion.cast_data.author.username}
                    promotionEmmbedContext={promotion.cast_data?.embeds}
                />
            </div>
        </MainLayout>
    );
}
