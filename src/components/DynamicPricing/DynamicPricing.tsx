import { useState, useMemo, useEffect } from "react"
import { Plus, Minus } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Collapsible } from "@/components/ui/collapsible"
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
    const panelClasses = "rounded-2xl border border-white/10 bg-[#080610]/90"

    const tier1Rate = baseCastRate * pricing_tiers.tier1;
    const tier2Rate = baseCastRate * pricing_tiers.tier2;
    const tier3Rate = baseCastRate * pricing_tiers.tier3;

    const weightedAverageRate = useMemo(() => {
        if (!tierRates || 
            tierRates.tier1?.rate === undefined || 
            tierRates.tier2?.rate === undefined || 
            tierRates.tier3?.rate === undefined) {
            return 0;
        }
        const tier1Avg = tierRates.tier1.rate * tier1Rate
        const tier2Avg = tierRates.tier2.rate * tier2Rate
        const tier3Avg = tierRates.tier3.rate * tier3Rate
        return tier1Avg + tier2Avg + tier3Avg
    }, [tierRates, tier1Rate, tier2Rate, tier3Rate])

    const totalBudget = desiredReach * weightedAverageRate;

    useEffect(() => {
        setBasePrice(baseCastRate);
    }, [baseCastRate]);

    useEffect(() => {
        if (setTotalBudget) {
            setTotalBudget(totalBudget);
        }
    }, [totalBudget, setTotalBudget]);


    return (
        <div className="space-y-4">
            {/* Base Quote Cast Rate slider */}
            <div className={`${panelClasses} p-4 space-y-3`}>
                <div className="flex items-center justify-between mb-0.5">
                    <Label className="text-[11px] text-white/70">Cost Per Quote Cast</Label>
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
            
            {/* Cost Breakdown - Collapsible */}
            <Collapsible
                defaultOpen={false}
                className={`${panelClasses} p-0`}
                trigger={
                    <div className="text-[12px] font-semibold text-white/80">
                        Cost Breakdown
                    </div>
                }
            >
                {/* Estimated Avg Price Per Cast */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
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
                    <div className="bg-green-500/10 rounded-xl p-2 border border-green-500/20">
                        <div className="text-[8px] text-green-400/70">Tier 1</div>
                        <div className="text-[11px] font-semibold text-green-400">${tier1Rate.toFixed(2)}</div>
                    </div>
                    <div className="bg-blue-500/10 rounded-xl p-2 border border-blue-500/20">
                        <div className="text-[8px] text-blue-400/70">Tier 2 (2x)</div>
                        <div className="text-[11px] font-semibold text-blue-400">${tier2Rate.toFixed(2)}</div>
                    </div>
                    <div className="bg-purple-500/10 rounded-xl p-2 border border-purple-500/20">
                        <div className="text-[8px] text-purple-400/70">Tier 3 (3.5x)</div>
                        <div className="text-[11px] font-semibold text-purple-400">${tier3Rate.toFixed(2)}</div>
                    </div>
                </div>
            </Collapsible>

            {/* Desired Reach - Compact */}
            <div className={`${panelClasses} p-4 space-y-3`}>
                <Label className="text-[11px] text-white/70 block">Desired # of Quote Casts</Label>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDesiredReach(Math.max(1, desiredReach - 1))}
                        className="h-10 w-10 rounded-xl bg-white/5 border-white/15 text-white hover:bg-white/10 hover:text-white shrink-0"
                    >
                        <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                        type="number"
                        value={desiredReach}
                        onChange={(e) => setDesiredReach(Math.max(1, Number.parseInt(e.target.value) || 1))}
                        className="text-center text-base font-semibold bg-transparent border-0 text-white h-10 flex-1 focus-visible:ring-0"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDesiredReach(desiredReach + 1)}
                        className="h-10 w-10 rounded-xl bg-white/5 border-white/15 text-white hover:bg-white/10 hover:text-white shrink-0"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className={`${panelClasses} p-4 space-y-1`}>
                <div className="flex items-baseline justify-between">
                    <span className="text-[18px] text-white/70">Total</span>
                    <span className="text-xl font-bold text-white">
                        {(totalBudget * 1.10).toFixed(2)} <span className="text-xs text-purple-400">USDC</span>
                    </span>
                </div>
                <p className="text-[9px] text-white/50 text-right mt-0.5">
                    ~{desiredReach} casts × ${weightedAverageRate.toFixed(3)} avg + 10% protocol fee
                </p>
            </div>
        </div>
    )
}
