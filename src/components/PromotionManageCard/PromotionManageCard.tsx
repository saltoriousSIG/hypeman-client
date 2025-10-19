import React from "react";
import { Card, CardContent } from "../ui/card";
import { XCircle, DollarSign, Users, Eye, TrendingUp, CheckCircle, Clock } from "lucide-react";

interface PromotionManageCardProps {
    promotion: any
    activeTab: "active" | "completed";
}

const PromotionManageCard: React.FC<PromotionManageCardProps> = ({ promotion, activeTab }) => {
    console.log(promotion);
    // Format the budget values (assuming they're in smallest unit, e.g., cents/wei)
    const formatBudget = (value: string) => {
        const num = parseInt(value) / 1000000; // Adjust divisor based on your token decimals
        return `$${num.toFixed(2)}`;
    };

    // Format timestamp to readable date
    const formatDate = (timestamp: string) => {
        const date = new Date(parseInt(timestamp) * 1000);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Calculate budget spent percentage
    const budgetSpentPercentage = promotion.total_budget
        ? ((parseInt(promotion.total_budget) - parseInt(promotion.remaining_budget)) / parseInt(promotion.total_budget)) * 100
        : 0;

    // Determine status based on state (0 = active, 1 = paused, 2 = completed, etc.)
    const getStatus = (state: number) => {
        switch (state) {
            case 0: return 'active';
            case 1: return 'paused';
            case 2: return 'completed';
            default: return 'unknown';
        }
    };

    const status = getStatus(promotion.state);

    return (
        <Card
            key={promotion.id}
            className="bg-white/10 backdrop-blur-sm border-white/20 rounded-2xl hover:bg-white/15 transition-all duration-300"
        >
            <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400">
                            {promotion.cast_data?.author?.pfp_url ? (
                                <img
                                    src={promotion.cast_data.author.pfp_url}
                                    alt={promotion.cast_data.author.display_name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                                    {promotion.cast_data?.author?.display_name?.charAt(0) || 'P'}
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">
                                {promotion.cast_data?.author?.display_name || `Promotion #${promotion.id}`}
                            </h3>
                            <p className="text-sm text-white/60">
                                @{promotion.cast_data?.author?.username || 'unknown'} · {formatDate(promotion.created_time)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {promotion.state === 0 && (
                            <button
                                onClick={() => { }}
                                className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center transition-all duration-300"
                                title="End promotion"
                            >
                                <XCircle className="w-4 h-4 text-red-400" />
                            </button>
                        )}
                    </div>
                </div>

                <p className="text-sm text-white/80 mb-4 line-clamp-3">
                    {promotion.cast_data?.text || 'No description available'}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-black/20 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-green-400" />
                            <span className="text-xs text-white/60">Budget</span>
                        </div>
                        <div className="text-sm font-bold text-white">
                            {formatBudget(promotion.remaining_budget)} / {formatBudget(promotion.total_budget)}
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1 mt-2">
                            <div
                                className="bg-green-400 h-1 rounded-full transition-all duration-300"
                                style={{ width: `${budgetSpentPercentage}%` }}
                            />
                        </div>
                    </div>
                    <div className="bg-black/20 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-blue-400" />
                            <span className="text-xs text-white/60">Promoters</span>
                        </div>
                        <div className="text-sm font-bold text-white">
                            {promotion.promoters?.length || 0}
                        </div>
                    </div>
                    <div className="bg-black/20 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Eye className="w-4 h-4 text-purple-400" />
                            <span className="text-xs text-white/60">Intents</span>
                        </div>
                        <div className="text-sm font-bold text-white">
                            {promotion.intents?.length || 0}
                        </div>
                    </div>
                    <div className="bg-black/20 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-yellow-400" />
                            <span className="text-xs text-white/60">Paid Out</span>
                        </div>
                        <div className="text-sm font-bold text-white">
                            {formatBudget(promotion.amount_paid_out)}
                        </div>
                    </div>
                </div>

                {/* Show claimable status if relevant */}
                {promotion.claimable && (
                    <div className="bg-green-500/10 border border-green-400/20 rounded-xl p-3 mb-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-sm font-semibold text-green-400">Claimable</span>
                        </div>
                    </div>
                )}

                {/* Show pro user badge */}
                {promotion.pro_user && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/20 mb-4">
                        <span className="text-xs font-medium text-purple-400">PRO</span>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div
                            className={`px-3 py-1 rounded-full text-xs font-medium ${status === "active"
                                ? "bg-green-500/20 text-green-400 border border-green-400/20"
                                : status === "paused"
                                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-400/20"
                                    : "bg-gray-500/20 text-gray-400 border border-gray-400/20"
                                }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </div>

                        {/* Show if it's an open promotion */}
                        {promotion.is_open_promotion && (
                            <div className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-400/20">
                                Open
                            </div>
                        )}
                    </div>

                    {activeTab === "active" && promotion.cast_url && (
                        <a
                            href={promotion.cast_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full text-white text-sm font-semibold transition-all duration-300"
                        >
                            View Cast
                        </a>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default PromotionManageCard;