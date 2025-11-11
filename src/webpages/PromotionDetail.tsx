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
      <MainLayout className="space-y-4 pb-16">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to all promotions</span>
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

  const formatCurrency = (value: number) =>
    `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const remainingBudget = parseFloat(
    formatUnits(promotion.remaining_budget, 6)
  );
  const totalBudget = parseFloat(formatUnits(promotion.total_budget, 6));
  const amountPaidOut = parseFloat(
    formatUnits(promotion.amount_paid_out ?? 0n, 6)
  );
  const rewardPerCast = promotion.base_rate
    ? parseFloat(formatUnits(promotion.base_rate, 6))
    : null;

  const budgetSpent = Math.max(totalBudget - remainingBudget, 0);
  const budgetUsedPercent = totalBudget
    ? Math.min((budgetSpent / totalBudget) * 100, 100)
    : 0;

  const statCards = [
    { label: "Budget Remaining", value: formatCurrency(remainingBudget) },
    { label: "Total Budget", value: formatCurrency(totalBudget) },
    rewardPerCast !== null
      ? { label: "Reward / Cast", value: formatCurrency(rewardPerCast) }
      : null,
    { label: "Paid Out", value: formatCurrency(amountPaidOut) },
  ].filter(Boolean) as { label: string; value: string }[];

  const detailCardClasses =
    "bg-gradient-to-b from-[#3b374a]/60 via-[#171324]/90 to-[#040307]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_25px_45px_rgba(0,0,0,0.45)]";
  const statCardClasses =
    "bg-white/[0.04] border border-white/10 rounded-xl p-4 space-y-1";

  return (
    <MainLayout className="space-y-4 pb-16">
      <button
        onClick={() => navigate("/")}
        className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors mb-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>
      {promotion.cast_data && (
          <CastCard
            promotion={promotion}
            promotionContent={promotion.cast_data.text}
            promotionAuthor={promotion.cast_data.author.username}
            promotionEmmbedContext={promotion.cast_data.embeds}
            refetchPromotion={refetchPromotion}
          />
        )}
      <div className="space-y-4">
        <div className={`${detailCardClasses} transition-all duration-300`}>
          <div className="p-5 space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              {promotion.name && (
                <h1 className="text-2xl font-bold text-white">
                  {promotion.name}
                </h1>
              )}
              <div className="flex flex-wrap gap-2">
                {promotion.pro_user && (
                  <span className="px-3 py-1 text-xs font-semibold text-pink-200 bg-pink-500/10 border border-pink-400/30 rounded-full">
                    Pro Only
                  </span>
                )}
                {promotion.claimable && (
                  <span className="px-3 py-1 text-xs font-semibold text-emerald-200 bg-emerald-500/10 border border-emerald-400/30 rounded-full">
                    Claimable
                  </span>
                )}
              </div>
            </div>

            {promotion.description && (
              <p className="text-sm text-white/70 leading-relaxed">
                {promotion.description}
              </p>
            )}

            <div className="space-y-2">
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${budgetUsedPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-white/60 uppercase tracking-wide">
                <span>{formatCurrency(budgetSpent)} spent</span>
                <span>{budgetUsedPercent.toFixed(0)}% used</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {statCards.map(({ label, value }) => (
                <div key={label} className={statCardClasses}>
                  <span className="text-xs text-white/60">{label}</span>
                  <p className="text-lg font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
