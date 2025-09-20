import { createContext, useEffect, useState, useContext, useCallback } from "react";
import sdk from "@farcaster/frame-sdk";
import { MiniAppSDK } from "@farcaster/miniapp-sdk/dist/types";
import { useAccount, useConnect } from "wagmi";
import axios from "axios";

type ConnectedUserData = {
    score: number,
    follower_count: number,
    avgLikes: number,
    avgRecasts: number,
    avgReplies: number

}

interface FrameContextValue {
    errors: Record<string, Error> | null;
    context: Awaited<MiniAppSDK['context']> | null;
    fUser: Awaited<MiniAppSDK['context']>['user'] | null;
    connectedUserData: ConnectedUserData | null;
    address: string | undefined;
    isConnected: boolean | undefined;
    handleAddFrame: () => Promise<void>;
    handleSetIsFrameAdding: (state: boolean) => void;
    isFrameAdded: boolean;
    isFrameAdding: boolean;
    connect: Function;
}

const FrameSDKContext = createContext<FrameContextValue | undefined>(undefined);

export function useFrameContext() {
    const context = useContext(FrameSDKContext);
    if (context === undefined) {
        throw new Error("useFrameContext must be used within an FramSDKProvider");
    }
    return context;
}

export function FrameSDKProvider({ children }: { children: React.ReactNode }) {
    const [errors, setErrors] = useState<Record<string, Error> | null>(null);
    const [context, setContext] = useState<Awaited<MiniAppSDK['context']> | null>(null);
    const [fUser, setFUser] = useState<Awaited<MiniAppSDK['context']>['user'] | null>(null);
    const [connectedUserData, setConnectedUserData] = useState<ConnectedUserData | null>(null);

    const [isFrameAdded, setIsframeAdded] = useState<boolean>(false);
    const [isFrameAdding, setIsFrameAdding] = useState<boolean>(false)

    const { isConnected, address } = useAccount();
    const { connect, connectors } = useConnect();

    const handleSetIsFrameAdding = (state: boolean) => setIsFrameAdding(state);

    const handleAddFrame = useCallback(async () => {
        try {
            await sdk.actions.addFrame();
            setIsframeAdded(true);
        } catch (e: any) {
            setErrors({
                ...errors,
                addFrame: new Error("Error adding frame! " + e.message)
            })
        } finally {
            setIsFrameAdding(false)
        }
    }, []);

    useEffect(() => {
        sdk.actions.ready();
    }, []);

    useEffect(() => {
        if (!isConnected) {
            connect({
                connector: connectors[0]
            });
        }
    }, [])


    // Load context
    useEffect(() => {
        const load = async () => {
            try {
                const context = await sdk.context;
                setContext(context)
                setFUser({
                    ...context.user,
                });
                setIsframeAdded(context.client.added);
            } catch (e: any) {
                setErrors({
                    ...errors,
                    load: new Error("You must load this page from within Warpcast!")
                })
            }
        }
        load()
    }, []);

    useEffect(() => {
        if (!fUser) return;
        const load = async () => {
            try {
                const { data } = await axios.post("/api/fetch_user", {
                    fid: fUser.fid
                });
                const { data: casts } = await axios.post("/api/fetch_user_casts", {
                    fid: fUser.fid
                })
                const avgLikes = casts.casts.reduce((acc, curr) => {
                    return acc + curr.reactions.likes_count
                }, 0) / casts.casts.length;
                const avgRecasts = casts.casts.reduce((acc, curr) => {
                    return acc + curr.reactions.recasts_count
                }, 0) / casts.casts.length;
                const avgReplies = casts.casts.reduce((acc, curr) => {
                    return acc + curr.replies.count
                }, 0) / casts.casts.length;

                setConnectedUserData({
                    score: data.user.score,
                    follower_count: data.user.follower_count,
                    avgLikes,
                    avgRecasts,
                    avgReplies
                });
            } catch (e: any) {
                setErrors({
                    ...errors,
                    load: new Error("Could not load user data")
                });
            }
        }
        load();
    }, [fUser]);

    return (
        <FrameSDKContext.Provider value={{
            errors,
            fUser,
            connectedUserData,
            context,
            address,
            handleAddFrame,
            handleSetIsFrameAdding,
            isFrameAdded,
            isFrameAdding,
            isConnected,
            connect
        }}>
            {children}
        </FrameSDKContext.Provider>
    );
}