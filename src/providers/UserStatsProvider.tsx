// create a skeleton for UserStatsProvider.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import useAxios from "@/hooks/useAxios";
import { useFrameContext } from "./FrameProvider";

export interface UserStats {
    score: number;
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
    connectedUserData: UserStats | null;
}

const UserStatsContext = createContext<UserStatsContextType | undefined>(undefined);

export const UserStatsProvider = ({ children }: { children: ReactNode }) => {
    const axios = useAxios();
    const { fUser } = useFrameContext();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [connectedUserData, setConnectedUserData] = useState<UserStats | null>(null);

    useEffect(() => {
        if (!fUser) return;

        const fetchUserStats = async () => {
            setLoading(true);
            setError(null);

            try {
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

                setConnectedUserData({
                    score: data.user.score,
                    follower_count: data.user.follower_count,
                    avgLikes,
                    avgRecasts,
                    avgReplies,
                    casts: casts.casts,
                    cursor: casts.next?.cursor || null,
                });
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserStats();
    }, [fUser]);

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