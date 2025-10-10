import { useContext, createContext, useEffect, useState, useCallback } from "react";
import useContract, { ExecutionType } from "@/hooks/useContract";
import { DIAMOND_ADDRESS } from "@/lib/utils";
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

    const [promotions, setPromotions] = useState<Array<Promotion>>([]);
    const [promotionCasts, setPromotionCasts] = useState<Record<string, PromotionCasts>>({});

    const get_next_promotion_id = useContract(ExecutionType.READABLE, "Data", "getNextPromotionId");
    const get_promotion = useContract(ExecutionType.READABLE, "Data", "getPromotion");

    useEffect(() => {
        if (!get_promotion) return;
        const load = async () => {
            const promotions: Array<Promotion> = [];
            try {
                const next_promotion_id = await get_next_promotion_id([]);
                console.log(next_promotion_id);
                for (let i = 0; i < next_promotion_id; i++) {
                    const promotion = await get_promotion([i]);
                    promotions.push({
                        ...promotion,
                        id: promotion.id.toString(),
                        created_time: new Date(parseInt(promotion.created_time.toString())),
                        creator_fid: parseInt(promotion.creator_fid.toString()),
                        committed_budget: parseInt(promotion.committed_budget.toString()),
                        total_budget: parseInt(promotion.total_budget.toString()),
                        amount_paid_out: parseInt(promotion.amount_paid_out.toString())
                    })
                }
                setPromotions(promotions);
            } catch (e: any) {
                throw new Error(e.message);
            }
        }
        load();
    }, [get_promotion, get_next_promotion_id]);

    console.log(promotions)

    useEffect(() => {
        if (!fUser) return;
        if (!promotions || promotions.length === 0) return
        const load = async () => {
            try {
                const casts_obj: any = {}
                const { data: { user_casts } } = await axios.post('/api/get_user_promotions', {
                    fid: fUser.fid,
                    username: fUser.username,
                    promotions
                });
                user_casts.map((x: any) => casts_obj[x.id] = {
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