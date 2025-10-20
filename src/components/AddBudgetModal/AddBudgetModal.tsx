import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DollarSign, TrendingUp, Wallet } from "lucide-react"
import { useState, useCallback } from "react"
import { usePromotionManage } from "@/providers/PromotionManageProvider"
import { parseUnits, formatUnits } from "viem"
import { useQuery } from "@tanstack/react-query"
import useContract, { ExecutionType } from "@/hooks/useContract"
import { USDC_ADDRESS, DIAMOND_ADDRESS } from "@/lib/utils"
import { useFrameContext } from "@/providers/FrameProvider"
import { useData } from "@/providers/DataProvider"

interface AddBudgetModalProps {
    isOpen: boolean
    onClose: () => void
    promotion: any;
}

export function AddBudgetModal({ isOpen, onClose, promotion }: AddBudgetModalProps) {
    const [amount, setAmount] = useState("")
    const [error, setError] = useState("")
    const [approved, setApproved] = useState(false)

    const get_allowance = useContract(ExecutionType.READABLE, "ERC20", "allowance", USDC_ADDRESS);
    const approve = useContract(ExecutionType.WRITABLE, "ERC20", "approve", USDC_ADDRESS);

    const { handleAddPromotionBudget } = usePromotionManage()

    const { address } = useFrameContext();
    const { platformFee, refetchPromotions } = useData();

    const handleAmountChange = (value: string) => {
        const numValue = value.replace(/[^0-9]/g, "")
        setAmount(numValue)
        setError("")
    }

    const { data: allowance, isLoading } = useQuery({
        queryKey: ["usdcAllowance", amount, address, platformFee],
        queryFn: async () => {
            if (!platformFee) return;
            const user_allowance = await get_allowance([address, DIAMOND_ADDRESS]);
            const fee = parseFloat(amount) * platformFee;
            const total = parseFloat(amount) + fee;
            setApproved(parseFloat(user_allowance.toString()) > total);
            return user_allowance;
        },
        enabled: !!amount && !!platformFee,
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
        retry: 2, // Retry failed requests twice
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff   queryFn: async () => {},
    });

    const handleApprove = useCallback(
        async () => {
            if (!platformFee) return;
            const numAmount = parseFloat(amount)
            if (!amount || numAmount <= 0) {
                setError("Please enter a valid amount")
                return
            }
            const fee = numAmount * platformFee;
            const calculated_allowance = numAmount + fee;
            const tx = await approve([DIAMOND_ADDRESS, parseUnits(calculated_allowance.toString(), 6)]);
            setApproved(true);
        }, [amount, approve, platformFee]
    )

    const handleConfirm = useCallback(
        async () => {
            const numAmount = Number.parseInt(amount)
            if (!amount || numAmount <= 0) {
                setError("Please enter a valid amount")
                return
            }
            if (numAmount < 3) {
                setError("Minimum top-up amount is $3")
                return
            }
            await handleAddPromotionBudget(promotion.id, parseUnits(numAmount.toString(), 6))
            setAmount("")
            await refetchPromotions();
            onClose()
        }, [amount, allowance, handleAddPromotionBudget, onClose, promotion.id]
    )

    const newTotal = parseFloat(formatUnits(promotion.total_budget, 6)) + (Number.parseInt(amount) || 0)
    const quickAmounts = [50, 100, 250, 500];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-black/95 backdrop-blur-xl border-emerald-500/20 text-white w-[95%] rounded">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                            <Wallet className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-white">Add Budget</DialogTitle>
                            <p className="text-sm text-white/60">Increase your campaign budget</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-black/20 rounded-lg p-3">
                                <div className="text-xs text-white/60 mb-1">Current Budget</div>
                                <div className="text-lg font-bold text-white">${formatUnits(promotion.total_budget, 6)}</div>
                            </div>
                            <div className="bg-black/20 rounded-lg p-3">
                                <div className="text-xs text-white/60 mb-1">Remaining</div>
                                <div className="text-lg font-bold text-emerald-400">${formatUnits(promotion.remaining_budget, 6)}</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/80">Top-up Amount</label>
                        <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                            <input
                                type="text"
                                inputMode="numeric"
                                value={amount}
                                onChange={(e) => handleAmountChange(e.target.value)}
                                placeholder="0"
                                className="w-full bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 py-3 text-white text-lg font-semibold placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                            />
                        </div>
                        {error && <p className="text-xs text-red-400">{error}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-white/60">Quick Select</label>
                        <div className="grid grid-cols-4 gap-2">
                            {quickAmounts.map((quickAmount) => (
                                <button
                                    key={quickAmount}
                                    onClick={() => handleAmountChange(quickAmount.toString())}
                                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all active:scale-95 ${amount === quickAmount.toString()
                                        ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white"
                                        : "bg-white/10 text-white/80 border border-white/20"
                                        }`}
                                >
                                    ${quickAmount}
                                </button>
                            ))}
                        </div>
                    </div>

                    {amount && Number.parseInt(amount) > 0 && (
                        <div className="bg-emerald-500/10 backdrop-blur-sm rounded-xl p-4 border border-emerald-500/20">
                            <div className="flex items-center gap-3 mb-2">
                                <TrendingUp className="w-5 h-5 text-emerald-400" />
                                <span className="text-sm font-medium text-emerald-400">New Budget Summary</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-white/60">Current Budget</span>
                                    <span className="font-medium text-white">${formatUnits(promotion.total_budget, 6)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-white/60">Top-up Amount</span>
                                    <span className="font-medium text-emerald-400">+${amount}</span>
                                </div>
                                <div className="h-px bg-white/10 my-2"></div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-white">New Total</span>
                                    <span className="text-xl font-bold text-emerald-400">${newTotal}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-white/10 active:scale-95 rounded-xl text-white text-sm font-medium transition-transform duration-150 border border-white/20"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                if (!approved) {
                                    await handleApprove();
                                } else {
                                    await handleConfirm();
                                }
                            }}
                            disabled={!amount || Number.parseInt(amount) <= 0}
                            className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-green-500 active:scale-95 rounded-xl text-white text-sm font-semibold transition-transform duration-150 shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                        >
                            {(allowance && parseFloat(allowance.toString()) > parseFloat(amount) || approved) ? `Add $${amount || "0"}` : `Approve $${amount || "0"}`}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
