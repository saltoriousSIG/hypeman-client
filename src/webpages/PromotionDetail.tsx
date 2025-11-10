import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import CastCard from "@/components/CastCard/CastCard";
import MainLayout from "@/components/Layout/MainLayout";
import { useQuery } from "@tanstack/react-query";
import useAxios from "@/hooks/useAxios";
import { Promotion } from "@/types/promotion.type";
import { formatUnits } from "viem";

export default function PromotionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const axios = useAxios();

  const {
    data: promotion,
    isLoading: loading,
    refetch: refetchPromotion,
  } = useQuery({
    queryKey: ["promotion", id, axios],
    queryFn: async () => {
      if (!axios) return;
      const { data } = await axios.get<{
        promotion: Promotion & {
          claimable: boolean;
          display_to_promoters: boolean;
          cast_data?: {
            text: string;
            embeds: any[];
            author: {
              username: string;
            };
          };
        };
      }>("/api/fetch_promotion", {
        params: { id },
      });
      return data.promotion;
    },
    enabled: !!id && !!axios,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchInterval: 45000 
  });

  if (loading) {
    return (
      <MainLayout className="space-y-4">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Loader2 className="w-8 h-8 text-white animate-spin absolute" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Loading Promotion...
          </h3>
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
          <h3 className="text-xl font-bold text-white mb-2">
            Promotion Not Found
          </h3>
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
          <h1 className="text-2xl font-bold text-white mb-2">
            {promotion.name}
          </h1>
          {promotion.description && (
            <p className="text-white/70 mb-4">{promotion.description}</p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-white/50 text-sm">Budget Remaining</span>
              <p className="text-white font-semibold">
                $
                {parseFloat(formatUnits(promotion.remaining_budget, 6)).toFixed(
                  2
                )}
              </p>
            </div>
            <div>
              <span className="text-white/50 text-sm">Total Budget</span>
              <p className="text-white font-semibold">
                ${parseFloat(formatUnits(promotion.total_budget, 6)).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {promotion.cast_data && (
          <CastCard
            promotion={promotion}
            promotionContent={promotion.cast_data.text}
            promotionAuthor={promotion.cast_data.author.username}
            promotionEmmbedContext={promotion.cast_data.embeds}
            refetchPromotion={refetchPromotion}
          />
        )}
      </div>
    </MainLayout>
  );
}
