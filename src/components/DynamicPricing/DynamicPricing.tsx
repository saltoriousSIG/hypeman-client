import { useState, useMemo, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { pricing_tiers } from "@/lib/calculateUserScore"

interface DynamicPricingProps {
    neynarScore: number
    proUser: boolean
    setTotalBudget: (budget: number) => void
    setBasePrice: (price: number) => void
    tierRates?: Record<
        string,
        {
            count: number
            rate: number
        }
    >
}

export function DynamicPricing({
    neynarScore,
    proUser,
    setTotalBudget,
    setBasePrice,
    tierRates,
}: DynamicPricingProps) {
    const [baseCastRate, setBaseCastRate] = useState(0.25)
    const [desiredReach, setDesiredReach] = useState(25)

    const tier1Rate = baseCastRate * pricing_tiers.tier1;
    const tier2Rate = baseCastRate * pricing_tiers.tier2;
    const tier3Rate = baseCastRate * pricing_tiers.tier3;

    const weightedAverageRate = useMemo(() => {
        if (!tierRates) return 0;
        const tier1Avg = tierRates.tier1.rate * tier1Rate
        const tier2Avg = tierRates.tier2.rate * tier2Rate
        const tier3Avg = tierRates.tier3.rate * tier3Rate
        return tier1Avg + tier2Avg + tier3Avg
    }, [tierRates, tier1Rate, tier2Rate, tier3Rate])

    const totalBudget = desiredReach * weightedAverageRate * 1.10;

    useEffect(() => {
        setBasePrice(baseCastRate);
    }, [baseCastRate]);

    useEffect(() => {
        if (setTotalBudget) {
            setTotalBudget(totalBudget);
        }
    }, [totalBudget, setTotalBudget]);


    return (
        <div className="space-y-2">
            {/* Base Quote Cast Rate slider */}
            <div>
                <div className="flex items-center justify-between mb-0.5">
                    <Label className="text-[11px] text-white/70">Base Quote Price</Label>
                    <span className="text-base font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        ${baseCastRate.toFixed(2)}
                    </span>
                </div>
                <Slider
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    value={[baseCastRate]}
                    onValueChange={(value) => setBaseCastRate(value[0])}
                    className="w-full"
                />
                <div className="flex justify-between text-[9px] text-white/40 mt-0.5">
                    <span>$0.10</span>
                    <span>$1.00</span>
                </div>
            </div>

            {/* Estimated Avg Price Per Cast */}
            <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                <div className="flex items-center justify-between mb-0.5">
                    <div>
                        <Label className="text-[11px] text-white/70">Estimated Avg Price Per Cast</Label>
                        <p className="text-[9px] text-white/40 mt-0.5">Based on current usage</p>
                    </div>
                    <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        ${weightedAverageRate.toFixed(3)}
                    </span>
                </div>
            </div>

            {/* Tier Rates & Distribution */}
            <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-green-500/10 rounded p-1.5 border border-green-500/20">
                    <div className="text-[8px] text-green-400/70">Tier 1</div>
                    <div className="text-[11px] font-semibold text-green-400">${tier1Rate.toFixed(2)}</div>
                </div>
                <div className="bg-blue-500/10 rounded p-1.5 border border-blue-500/20">
                    <div className="text-[8px] text-blue-400/70">Tier 2 (2x)</div>
                    <div className="text-[11px] font-semibold text-blue-400">${tier2Rate.toFixed(2)}</div>
                </div>
                <div className="bg-purple-500/10 rounded p-1.5 border border-purple-500/20">
                    <div className="text-[8px] text-purple-400/70">Tier 3 (3.5x)</div>
                    <div className="text-[11px] font-semibold text-purple-400">${tier3Rate.toFixed(2)}</div>
                </div>
            </div>

            {/* Desired Reach - Compact */}
            <div>
                <Label className="text-[11px] text-white/70 mb-0.5 block">Desired Reach (Quotes)</Label>
                <Input
                    type="number"
                    value={desiredReach}
                    onChange={(e) => setDesiredReach(Math.max(0, Number.parseInt(e.target.value) || 1))}
                    className="text-center text-sm font-semibold bg-white/5 border-white/10 text-white h-8"
                />
            </div>

            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-2 border border-purple-400/30">
                <div className="flex items-baseline justify-between">
                    <span className="text-[18px] text-white/70">Total</span>
                    <span className="text-xl font-bold text-white">
                        {totalBudget.toFixed(2)} <span className="text-xs text-purple-400">USDC</span>
                    </span>
                </div>
                <p className="text-[9px] text-white/50 text-right mt-0.5">
                    ~{desiredReach} casts × ${weightedAverageRate.toFixed(3)} avg + 10% protocol fee
                </p>
            </div>
            <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                <div className="flex items-center gap-2 text-[11px] text-white/60">
                    <p>
                        Minimum Neynar Score: <span className="text-purple-400 font-medium">{neynarScore.toFixed(2)}</span>
                    </p>
                    <span className="text-white/30">•</span>
                    <p>
                        Pro Users Only: <span className="text-purple-400 font-medium">{proUser ? "Yes" : "No"}</span>
                    </p>
                </div>
            </div>
        </div>
    )
}
