import { useContext, createContext, useEffect } from "react";
import useAxios from "@/hooks/useAxios";
import { useQuery } from "@tanstack/react-query";
import { Promotion } from "@/types/promotion.type";
import useContract, { ExecutionType } from "@/hooks/useContract";

interface DataContextValue {
    promotions?: Array<Promotion & {
        claimable: boolean;
        display_to_promoters: boolean;
        cast_data?: {
            text: string;
            embeds: any[];
            author: {
                username: string;
            };
        };
    }>;
    promoterPromotions?: Array<Promotion & {
        claimable: boolean;
        display_to_promoters: boolean;
        cast_data?: {
            text: string;
            embeds: any[];
            author: {
                username: string;
            };
        };
    }>;
    promoterPromotionsLoading?: boolean;
    platformFee?: number;
    refetchPromotions: () => Promise<any>;
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

    const getPlatformFee = useContract(ExecutionType.READABLE, "Data", "getPlatformFee");

    const { data: promotions, isLoading, error, refetch } = useQuery({
        queryKey: ["promotions"],
        queryFn: async () => {
            const { data: { promotions } } = await axios.get<{
                promotions: Array<Promotion & {
                    claimable: boolean;
                    display_to_promoters: boolean;
                    cast_data?: {
                        text: string;
                        embeds: any[];
                        author: {
                            username: string;
                        };
                    };
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

    const { data: promoterPromotions, isPending: promoterPromotionsLoading } = useQuery({
        queryKey: ["promoterPromotions", promotions],
        queryFn: async () => {
            if (!promotions) return [];
            // Apply user-specific filtering when user data is available
            const filtered = promotions?.filter(p => {
                return (
                    p.display_to_promoters &&
                    !p.claimable
                )
            })
            return filtered
        },
        enabled: !!promotions, // Only depend on promotions being available
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
        retry: 2, // Retry failed requests twice
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    })

    const { data: platformFee, isLoading: isPlatformFeeLoading } = useQuery({
        queryKey: ['platformFee'],
        queryFn: async () => {
            const fee = await getPlatformFee([]);
            return parseInt(fee.toString()) / 10000;
        },
        enabled: true,
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
        retry: 2, // Retry failed requests twice
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    });

    useEffect(() => {
        if (!refetch) return;

        const signinEventHandler = () => {
            if (!promotions) {
                refetch();
            }
        }

        window.addEventListener("fc-signin-success", signinEventHandler);
        return () => {
            window.removeEventListener("fc-signin-success", signinEventHandler);
        }
    }, [refetch, promotions]);

    const loading = isLoading || isPlatformFeeLoading;
    console.log(promotions);

    return (
        <DataContext.Provider value={{
            promotions,
            promoterPromotions,
            promoterPromotionsLoading,
            loading,
            platformFee,
            refetchPromotions: refetch,
            error
        }}>
            {children}
        </DataContext.Provider>
    )
}