import React, { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { XCircle, DollarSign, Users, Eye, TrendingUp, Share, ExternalLink } from "lucide-react";
import { EndPromotionModal } from "../EndPromotionModal/EndPromotionModal";
import { AddBudgetModal } from "../AddBudgetModal/AddBudgetModal";
import { Button } from "../ui/button";
import sdk from "@farcaster/frame-sdk";

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

    return (
        <>
            <Card
                key={promotion.id}
                className="bg-white/10 backdrop-blur-sm border-white/10 rounded-lg hover:bg-white/15 transition-all duration-300"
            >
                <CardContent className="p-4">
                    <div className="flex items-center gap-1.5 mb-4 min-w-0 overflow-hidden">
                        <Button
                            onClick={handleShare}
                            variant="outline"
                            size="sm"
                            className="flex items-center justify-center gap-1 shrink-0 whitespace-nowrap px-2 cursor-pointer hover:bg-transparent dark:hover:bg-transparent"
                        >
                            <Share className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-xs">Share</span>
                        </Button>
                        {promotion.cast_url && (
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="flex items-center justify-center gap-1 shrink-0 whitespace-nowrap px-2 cursor-pointer hover:bg-transparent dark:hover:bg-transparent"
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
                                    className="flex items-center justify-center gap-1 shrink-0 whitespace-nowrap px-2 cursor-pointer hover:bg-transparent dark:hover:bg-transparent"
                                >
                                    <DollarSign className="w-3.5 h-3.5 shrink-0" />
                                    <span className="text-xs">Top Up</span>
                                </Button>
                                <Button
                                    onClick={() => setIsEndModalOpen(true)}
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center justify-center gap-1 shrink-0 whitespace-nowrap px-2 cursor-pointer hover:bg-transparent dark:hover:bg-transparent"
                                >
                                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span className="text-xs">End</span>
                                </Button>
                            </>
                        )}
                    </div>

                    <p className="text-sm text-white/80 mb-4 line-clamp-3">
                        {promotion.cast_data?.text || 'No description available'}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-black/20 rounded-lg p-3 relative">
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
                        <div className="bg-black/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Users className="w-4 h-4 text-pink-400" />
                                <span className="text-xs text-white/60">Promoters</span>
                            </div>
                            <div className="text-sm font-bold text-white">
                                {promotion.promoters?.length || 0}
                            </div>
                        </div>
                        <div className="bg-black/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Eye className="w-4 h-4 text-pink-400" />
                                <span className="text-xs text-white/60">Intents</span>
                            </div>
                            <div className="text-sm font-bold text-white">
                                {promotion.intents?.length || 0}
                            </div>
                        </div>
                        <div className="bg-black/20 rounded-lg p-3">
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
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-pink-500/20 border border-pink-400/20 mb-4">
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