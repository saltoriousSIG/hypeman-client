// create a skeleton for UserStatsProvider.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import useAxios from "@/hooks/useAxios";
import { useFrameContext } from "./FrameProvider";
import { useQuery } from "@tanstack/react-query";

export interface UserStats {
    score: number;
    isPro: boolean;
    follower_count: number;
    avgLikes: number;
    avgRecasts: number;
    avgReplies: number;
    casts: any[];
    cursor: string | null;
}


interface UserStatsContextType {
    loading: boolean;
    error: Error | null
    connectedUserData?: UserStats;
}

const UserStatsContext = createContext<UserStatsContextType | undefined>(undefined);

export const UserStatsProvider = ({ children }: { children: ReactNode }) => {
    const axios = useAxios();
    const { fUser } = useFrameContext();

    const { data: connectedUserData, isLoading: loading, error } = useQuery({
        queryKey: ["connectedUserData", fUser?.fid],
        queryFn: async () => {
            const { data } = await axios.get(`/api/fetch_user`);
            const { data: casts } = await axios.post("/api/fetch_user_casts", {
                cursor: null,
            });
            const castsLength = casts.casts.length || 1;
            const avgLikes =
                casts.casts.reduce((acc: any, curr: any) => {
                    return acc + (curr.reactions?.likes_count ?? 0);
                }, 0) / castsLength;
            const avgRecasts =
                casts.casts.reduce((acc: any, curr: any) => {
                    return acc + (curr.reactions?.recasts_count ?? 0);
                }, 0) / castsLength;
            const avgReplies =
                casts.casts.reduce((acc: any, curr: any) => {
                    return acc + (curr.replies?.count ?? 0);
                }, 0) / castsLength;

            return {
                score: data.user.score,
                isPro: data.user?.pro.status === "subscribed",
                follower_count: data.user.follower_count,
                avgLikes,
                avgRecasts,
                avgReplies,
                casts: casts.casts,
                cursor: casts.next?.cursor || null,
            };
        },
        enabled: !!fUser,
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
        retry: 2, // Retry failed requests twice
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    })

    return (
        <UserStatsContext.Provider value={{ loading, error, connectedUserData }}>
            {children}
        </UserStatsContext.Provider>
    );
};

export const useUserStats = () => {
    const context = useContext(UserStatsContext);
    if (context === undefined) {
        throw new Error("useUserStats must be used within a UserStatsProvider");
    }
    return context;
}