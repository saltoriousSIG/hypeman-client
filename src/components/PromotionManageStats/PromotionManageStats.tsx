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
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10">
        <div className="text-xl font-black ">
          ${formatNumber(parseFloat(totalBudgetAllocated))}
        </div>
        <div className="text-xs text-white/60 mt-1">Spend</div>
      </div>
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10">
        <div className="text-xl font-black ">
          {formatNumber(creatorPromotionCount as number)}
        </div>
        <div className="text-xs text-white/60 mt-1">Promotions</div>
      </div>
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10">
        <div className="text-xl font-black ">
          {formatNumber(activePromotionsCount as number)}
        </div>
        <div className="text-xs text-white/60 mt-1">Active Now</div>
      </div>
    </div>
  );
};

export default PromotionManageStats;
