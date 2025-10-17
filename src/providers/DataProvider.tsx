import { useContext, createContext, useState, useEffect } from "react";
import useAxios from "@/hooks/useAxios";
import { useQuery } from "@tanstack/react-query";
import { Promotion } from "@/types/promotion.type";
import { useUserStats } from "./UserStatsProvider";
interface DataContextValue {
    promotions?: Array<Promotion & {
        claimable: boolean;
        display_to_promoters: boolean
    }>;
    promoterPromotions?: Array<Promotion & {
        claimable: boolean;
        display_to_promoters: boolean
    }>;
    promoterPromotionsLoading?: boolean;
    loading?: boolean;
    error: any;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function useData() {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error("useEvents must be used within an EventsProvider");
    }
    return context;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
    const axios = useAxios();
    const { connectedUserData } = useUserStats();

    const { data: promotions, isLoading, error } = useQuery({
        queryKey: ["promotions"],
        queryFn: async () => {
            const { data: { promotions } } = await axios.get<{
                promotions: Array<Promotion & {
                    claimable: boolean;
                    display_to_promoters: boolean
                }>
            }>('/api/fetch_promotions');
            return promotions;
        },
        enabled: true,
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
        retry: 2, // Retry failed requests twice
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    });

    const { data: promoterPromotions, isLoading: promoterPromotionsLoading, error: errorPromoter } = useQuery({
        queryKey: ["promoterPromotions", connectedUserData, promotions],
        queryFn: async () => {
            if (!connectedUserData || !promotions) return [];
            const filtered = promotions?.filter(p => connectedUserData.score >= parseFloat(p.neynar_score)).map((p) => {
                if (p.pro_user) {
                    if (connectedUserData.isPro) {
                        return p;
                    }
                    return null;
                } else {
                    return p;
                }
            }).filter(p => p !== null)
            return filtered
        },
        enabled: !!connectedUserData && !!promotions,
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
        retry: 2, // Retry failed requests twice
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    })
    const loading = isLoading || promoterPromotionsLoading;

    return (
        <DataContext.Provider value={{
            promotions,
            promoterPromotions,
            promoterPromotionsLoading,
            loading,
            error
        }}>
            {children}
        </DataContext.Provider>
    )
}