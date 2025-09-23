import { useContext, createContext, useEffect, useState, useCallback } from "react";
import { usePublicClient } from "wagmi";
import useContract, { ExecutionType } from "@/hooks/useContract";
import { DIAMOND_ADDRESS } from "@/lib/utils";
import { parseAbiItem } from "viem";
import { useFrameContext } from "./FrameProvider";
import axios from "axios";

export enum PromotionState {
    ACTIVE,     // Promotion is live and can receive posts
    COMPLETED,  // Budget exhausted or manually completed
    EJECTED
}

type Promotion = {
    cast_text?: string;
    created_time: bigint;
    creator: string;
    creator_fid: bigint;
    description: string;
    id: string;
    is_open_promotion: boolean;
    name: string;
    project_url: string;
    refund_requested: boolean;
    remaining_budget: bigint;
    state: number;
    token: string;
    total_budget: bigint;
}

type PromotionCasts = {
    id: string,
    cast_text: string;
}

interface DataContextValue {
    promotions: Array<Promotion>;
    promotion_casts: Record<string, PromotionCasts>;
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
    const { fUser } = useFrameContext();
    const publicClient = usePublicClient();

    const [promotions, setPromotions] = useState<Array<Promotion>>([]);
    const [promotionCasts, setPromotionCasts] = useState<Record<string, PromotionCasts>>({});
    const get_promotion = useContract(ExecutionType.READABLE, "Data", "getPromotion");

    useEffect(() => {
        if (!publicClient) return
        if (!get_promotion) return;
        const load = async () => {
            try {
                const logs = await publicClient.getLogs({
                    address: DIAMOND_ADDRESS,
                    event: parseAbiItem("event PromotionCreated(bytes32 indexed id, address indexed creator, uint256 indexed creatorFid, string name, uint256 totalBudget, address token, bool isOpenPromotion, uint256 timestamp)"),
                    fromBlock: 35899628n,
                    toBlock: "latest"
                });
                const processed_promotions = await Promise.all(logs.map(async (l) => {
                    const p = await get_promotion([l.args.id]);
                    return {
                        ...p,
                        created_time: new Date(parseInt(p.created_time.toString())),
                        creator_fid: parseInt(p.creator_fid.toString()),
                        remaining_budget: parseInt(p.remaining_budget.toString()),
                        total_budget: parseInt(p.total_budget.toString())
                    }
                }));
                setPromotions(processed_promotions.filter((l) => l.state === PromotionState.ACTIVE));
            } catch (e: any) {
                throw new Error(e.message);
            }
        }
        load();
    }, [publicClient, get_promotion]);

    useEffect(() => {
        if (!fUser) return;
        if (!promotions || promotions.length === 0) return
        const load = async () => {
            try {
                const casts_obj = {}
                const { data: { user_casts } } = await axios.post('/api/get_user_promotions', {
                    fid: fUser.fid,
                    username: fUser.username,
                    promotions
                });
                user_casts.map((x) => casts_obj[x.id] = {
                    ...x
                })
                setPromotionCasts(casts_obj);
            } catch (e: any) {
                throw new Error(e.message);
            }
        }
        load();
    }, [fUser, promotions]);

    return (
        <DataContext.Provider value={{
            promotions,
            promotion_casts: promotionCasts
        }}>
            {children}
        </DataContext.Provider>
    )
}