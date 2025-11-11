import React, { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { XCircle, DollarSign, Users, Eye, TrendingUp, Share, ExternalLink } from "lucide-react";
import { EndPromotionModal } from "../EndPromotionModal/EndPromotionModal";
import { AddBudgetModal } from "../AddBudgetModal/AddBudgetModal";
import { Button } from "../ui/button";
import sdk from "@farcaster/frame-sdk";
import PromotionCastPreview from "../CastCard/PromotionCastPreview";

interface PromotionManageCardProps {
    promotion: any
    activeTab: "active" | "completed";
    onAddBudget?: (promotionId: string) => void;
    onEndPromotion?: (promotionId: string) => void;
}

const PromotionManageCard: React.FC<PromotionManageCardProps> = ({ promotion, activeTab: _activeTab, onAddBudget: _onAddBudget, onEndPromotion: _onEndPromotion }) => {

    const [isEndModalOpen, setIsEndModalOpen] = useState(false);
    const [isAddBudgetModalOpen, setIsAddBudgetModalOpen] = useState(false);

    // Format the budget values (assuming they're in smallest unit, e.g., cents/wei)
    const formatBudget = (value: string) => {
        const num = parseInt(value) / 1000000; // Adjust divisor based on your token decimals
        return `$${num.toFixed(2)}`;
    };

    // Calculate budget spent percentage
    const budgetSpentPercentage = promotion.total_budget
        ? ((parseInt(promotion.total_budget) - parseInt(promotion.remaining_budget)) / parseInt(promotion.total_budget)) * 100
        : 0;

    const handleShare = async () => {
        if (!promotion.id) return
        await sdk.actions.composeCast({
            text: `Check out this promotion on Hypeman!`,
            embeds: [`https://hypeman.social/promotion/${promotion.id}`]
        });
    }

    const hasCastData = !!promotion.cast_data;

    return (
        <>
            <Card
                key={promotion.id}
                className="p-0 py-0 gap-0 border border-white/10 rounded-2xl overflow-hidden bg-gradient-to-b from-[#3b374a]/60 via-[#171324]/90 to-[#040307]/95 backdrop-blur-xl shadow-[0_25px_45px_rgba(0,0,0,0.45)] transition-all duration-300"
            >
                {hasCastData ? (
                    <PromotionCastPreview
                        username={promotion.cast_data?.author?.username || "Unknown"}
                        text={promotion.cast_data?.text || "No description available"}
                        pfpUrl={promotion.cast_data?.author?.pfp_url || ""}
                        authorFid={promotion.cast_data?.author?.fid || 0}
                        castUrl={promotion.cast_url || ""}
                        embeds={promotion.cast_data?.embeds || []}
                        promotionId={promotion.id}
                        className="rounded-none border-0 border-b border-white/5 bg-gradient-to-b from-[#49475a]/80 via-[#2a2738]/90 to-[#100d18]/95"
                    />
                ) : (
                    <div className="px-4 py-3 border-b border-white/5 bg-gradient-to-b from-[#49475a]/50 via-[#2a2738]/80 to-[#100d18]/95">
                        <p className="text-sm text-white/80">
                            {promotion.cast_data?.text || "No description available"}
                        </p>
                    </div>
                )}
                <CardContent className="p-4 space-y-4 bg-gradient-to-b from-transparent via-[#05030c]/80 to-[#020103]/95">
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden flex-wrap">
                        <Button
                            onClick={handleShare}
                            variant="outline"
                            size="sm"
                            className="h-auto rounded-full border-white/15 bg-white/5 text-white/80 hover:bg-white/10 flex items-center justify-center gap-1 shrink-0 whitespace-nowrap px-3 py-1.5 cursor-pointer shadow-none"
                        >
                            <Share className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-xs">Share</span>
                        </Button>
                        {promotion.cast_url && (
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-auto rounded-full border-white/15 bg-white/5 text-white/80 hover:bg-white/10 flex items-center justify-center gap-1 shrink-0 whitespace-nowrap px-3 py-1.5 cursor-pointer shadow-none"
                            >
                                <a
                                    href={promotion.cast_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                    <span className="text-xs">View</span>
                                </a>
                            </Button>
                        )}
                        {promotion.state === 0 && (
                            <>
                                <Button
                                    onClick={() => setIsAddBudgetModalOpen(true)}
                                    variant="outline"
                                    size="sm"
                                    className="h-auto rounded-full border-white/15 bg-white/5 text-white/80 hover:bg-white/10 flex items-center justify-center gap-1 shrink-0 whitespace-nowrap px-3 py-1.5 cursor-pointer shadow-none"
                                >
                                    <DollarSign className="w-3.5 h-3.5 shrink-0" />
                                    <span className="text-xs">Top Up</span>
                                </Button>
                                <Button
                                    onClick={() => setIsEndModalOpen(true)}
                                    variant="outline"
                                    size="sm"
                                    className="h-auto rounded-full border-white/15 bg-white/5 text-white/80 hover:bg-white/10 flex items-center justify-center gap-1 shrink-0 whitespace-nowrap px-3 py-1.5 cursor-pointer shadow-none"
                                >
                                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span className="text-xs">End</span>
                                </Button>
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 relative">
                            <div className="flex items-center gap-2 mb-1">
                                <DollarSign className="w-4 h-4 text-pink-400" />
                                <span className="text-xs text-white/60">Budget</span>
                            </div>
                            <div className="text-sm font-bold text-white mb-1">
                                {formatBudget(promotion.remaining_budget)} / {formatBudget(promotion.total_budget)}
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-1 mb-2">
                                <div
                                    className="bg-pink-400 h-1 rounded-full transition-all duration-300"
                                    style={{ width: `${budgetSpentPercentage}%` }}
                                />
                            </div>
                        </div>
                        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Users className="w-4 h-4 text-pink-400" />
                                <span className="text-xs text-white/60">Promoters</span>
                            </div>
                            <div className="text-sm font-bold text-white">
                                {promotion.promoters?.length || 0}
                            </div>
                        </div>
                        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Eye className="w-4 h-4 text-pink-400" />
                                <span className="text-xs text-white/60">Intents</span>
                            </div>
                            <div className="text-sm font-bold text-white">
                                {promotion.intents?.length || 0}
                            </div>
                        </div>
                        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="w-4 h-4 text-pink-400" />
                                <span className="text-xs text-white/60">Paid Out</span>
                            </div>
                            <div className="text-sm font-bold text-white">
                                {formatBudget(promotion.amount_paid_out)}
                            </div>
                        </div>
                    </div>

                    {/* Show pro user badge */}
                    {promotion.pro_user && (
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-pink-500/20 border border-pink-400/20">
                            <span className="text-xs font-medium text-pink-400">PRO ONLY</span>
                        </div>
                    )}

                </CardContent>
            </Card>

            <EndPromotionModal isOpen={isEndModalOpen} onClose={() => setIsEndModalOpen(false)} promotion={promotion} />
            <AddBudgetModal isOpen={isAddBudgetModalOpen} onClose={() => setIsAddBudgetModalOpen(false)} promotion={promotion} />
        </>

    );
}

export default PromotionManageCard;
