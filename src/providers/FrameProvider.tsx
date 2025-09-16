import { createContext, useEffect, useState, useContext, useCallback } from "react";
import sdk from "@farcaster/frame-sdk";
import { MiniAppSDK } from "@farcaster/miniapp-sdk/dist/types";
import { useAccount, useConnect } from "wagmi";

interface FrameContextValue {
    errors: Record<string, Error> | null;
    context: Awaited<MiniAppSDK['context']> | null;
    fUser: Awaited<MiniAppSDK['context']>['user'] | null;
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
    const [isFrameAdded, setIsframeAdded] = useState<boolean>(false);
    const [isFrameAdding, setIsFrameAdding] = useState<boolean>(false)

    const { isConnected, address } = useAccount();
    const { connect, connectors } = useConnect();

    const handleSetIsFrameAdding = (state: boolean) => setIsFrameAdding(state);

    const handleAddFrame = useCallback(async () => {
        try {
            console.log("this was called")
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
        console.log(isConnected);
        if (!isConnected) {
            connect({
                connector: connectors[0]
            })
        }
    }, [])


    // Load context
    useEffect(() => {
        const load = async () => {
            try {
                const context = await sdk.context;
                setContext(context)
                setFUser(context.user);
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



    return (
        <FrameSDKContext.Provider value={{
            errors,
            fUser,
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