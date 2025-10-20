import React, { useContext, useMemo } from "react";
import { useData } from "./DataProvider";
import useContract, { ExecutionType } from "@/hooks/useContract";
import { useFrameContext } from "./FrameProvider";
import { useQuery } from "@tanstack/react-query";
import { Promotion } from "@/types/promotion.type";
import { formatUnits } from "viem";

interface PromotionManageContextValue {
    creatorPromotions?: (Promotion & {
        claimable: boolean;
        display_to_promoters: boolean
    })[];
    totalBudgetSpent?: any;
    totalBudgetAllocated?: any;
    creatorPromotionCount?: number;
    promotionInsights?: any[];
    insightsLoading?: boolean;
    insightsError?: any;
    activePromotions: any;
    completedPromotions: any;
    activePromotionsCount?: number;
    completedPromotionsCount?: number;
    handleEndPromotion: (promotionId: number) => Promise<void>;
    handleAddPromotionBudget: (promotionId: number, amount: bigint) => Promise<void>;
}

const PromotionManageContext = React.createContext<PromotionManageContextValue | undefined>(undefined);

export function usePromotionManage() {
    const context = useContext(PromotionManageContext);
    if (context === undefined) {
        throw new Error("usePromotionManage must be used within a PromotionManageProvider");
    }
    return context;
}

export function PromotionManageProvider({ children }: { children: React.ReactNode }) {
    const { fUser, address } = useFrameContext();
    const { promotions } = useData();

    const promotion_insights = useContract(ExecutionType.READABLE, "Data", "getPromotionInsights");
    const end_promotion = useContract(ExecutionType.WRITABLE, "Manage", "endPromotion");
    const add_promotion_budget = useContract(ExecutionType.WRITABLE, "Manage", "addPromotionBudget");

    const creatorPromotions = useMemo(() => {
        return promotions?.filter((p) => {
            return BigInt(p.creator_fid) === BigInt(fUser?.fid as number) || p.creator === address;
        })
    }, [promotions, fUser, address]);

    const totalBudgetSpent = useMemo(() => {
        if (!creatorPromotions) return 0;
        return formatUnits(BigInt(creatorPromotions.reduce((acc, promo) => acc + parseFloat(BigInt(promo.amount_paid_out).toString()), 0)), 6);
    }, [creatorPromotions]);

    const totalBudgetAllocated = useMemo(() => {
        if (!creatorPromotions) return 0;
        return formatUnits(BigInt(creatorPromotions.reduce((acc, promo) => acc + parseFloat(BigInt(promo.total_budget).toString()), 0)), 6);
    }, [creatorPromotions]);

    const creatorPromotionCount = creatorPromotions?.length || 0

    const activePromotions = useMemo(() => {
        if (!creatorPromotions) return [];
        return creatorPromotions.filter(promo => promo.state === 0);
    }, [creatorPromotions]);

    const completedPromotions = useMemo(() => {
        if (!creatorPromotions) return [];
        return creatorPromotions.filter(promo => promo.state === 1);
    }, [creatorPromotions]);

    const activePromotionsCount = activePromotions.length
    const completedPromotionsCount = completedPromotions.length;

    const { data: promotionInsights, isLoading, error } = useQuery({
        queryKey: ['creatorPromotionInsights', creatorPromotions],
        queryFn: async () => {
            if (!creatorPromotions) return [];
            const insights = []
            for (let promotion of creatorPromotions) {
                const insight = await promotion_insights([promotion.id]);
                insights.push(insight);
            }
            return insights;
        },
        enabled: !!creatorPromotions,
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
        retry: 2, // Retry failed requests twice
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    });

    const handleEndPromotion = async (promotionId: number) => {
        try {
            await end_promotion([promotionId]);
        } catch (e: any) {
            throw new Error(e.message);
        }
    }

    const handleAddPromotionBudget = async (promotionId: number, amount: bigint) => {
        try {
            await add_promotion_budget([promotionId, amount]);
        } catch (e: any) {
            throw new Error(e.message);
        }
    }

    return (
        <PromotionManageContext.Provider value={{
            creatorPromotions,
            totalBudgetSpent,
            totalBudgetAllocated,
            creatorPromotionCount,
            activePromotionsCount,
            promotionInsights,
            insightsLoading: isLoading,
            insightsError: error,
            activePromotions,
            completedPromotions,
            handleEndPromotion,
            handleAddPromotionBudget
        }}>
            {children}
        </PromotionManageContext.Provider>
    );
}   