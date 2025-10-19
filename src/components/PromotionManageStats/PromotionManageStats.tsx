import React from 'react';
import { usePromotionManage } from '@/providers/PromotionManageProvider';

interface PromotionManageStatsProps { }

const PromotionManageStats: React.FC<PromotionManageStatsProps> = ({ }) => {
    const { totalBudgetAllocated, creatorPromotionCount, activePromotionsCount } = usePromotionManage()
    return (
        <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="text-2xl font-bold text-green-400">${totalBudgetAllocated}</div>
                <div className="text-xs text-white/60">Total Allocated</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="text-2xl font-bold text-purple-400">{creatorPromotionCount}</div>
                <div className="text-xs text-white/60">Total Promotions</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="text-2xl font-bold text-blue-400">{activePromotionsCount}</div>
                <div className="text-xs text-white/60">Active Now</div>
            </div>
        </div>
    );

}

export default PromotionManageStats;