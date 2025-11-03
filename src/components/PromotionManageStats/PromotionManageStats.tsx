import React from "react";
import { usePromotionManage } from "@/providers/PromotionManageProvider";

interface PromotionManageStatsProps {}

const PromotionManageStats: React.FC<PromotionManageStatsProps> = ({}) => {
  const { totalBudgetAllocated, creatorPromotionCount, activePromotionsCount } =
    usePromotionManage();
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toFixed(2);
  };
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
        <div className="text-xl font-bold text-green-400">
          ${formatNumber(parseFloat(totalBudgetAllocated))}
        </div>
        <div className="text-xs text-white/60">Total Allocated</div>
      </div>
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
        <div className="text-2xl font-bold text-purple-400">
          {formatNumber(creatorPromotionCount as number)}
        </div>
        <div className="text-xs text-white/60">Total Promotions</div>
      </div>
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
        <div className="text-2xl font-bold text-blue-400">
          {formatNumber(activePromotionsCount as number)}
        </div>
        <div className="text-xs text-white/60">Active Now</div>
      </div>
    </div>
  );
};

export default PromotionManageStats;
