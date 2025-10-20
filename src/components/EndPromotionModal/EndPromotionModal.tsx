import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle, XCircle } from "lucide-react"
import { usePromotionManage } from "@/providers/PromotionManageProvider"
import { formatUnits } from "viem"
import { useData } from "@/providers/DataProvider"

interface EndPromotionModalProps {
    isOpen: boolean
    onClose: () => void
    promotion: any;
}

export function EndPromotionModal({ isOpen, onClose, promotion }: EndPromotionModalProps) {
    const { handleEndPromotion } = usePromotionManage()
    const { refetchPromotions } = useData();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-black/95 backdrop-blur-xl border-orange-500/20 text-white w-[95%] rounded">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl flex items-center justify-center border border-orange-500/30">
                            <AlertTriangle className="w-6 h-6 text-orange-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-white">End Campaign</DialogTitle>
                            <p className="text-sm text-white/60">This action will stop your promotion</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <h4 className="text-sm font-semibold text-white mb-2">{promotion.title}</h4>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-white/60">Active Posts</span>
                                <span className="font-medium text-white">{promotion.intents.length} posts</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-white/60">Budget Spent</span>
                                <span className="font-medium text-white">${formatUnits(promotion.amount_paid_out, 6)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-white/60">Remaining Budget</span>
                                <span className="font-medium text-emerald-400">${formatUnits(promotion.remaining_budget, 6)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-orange-500/10 backdrop-blur-sm rounded-xl p-4 border border-orange-500/20">
                        <div className="flex gap-3">
                            <XCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-orange-400">What happens next?</p>
                                <ul className="text-xs text-white/70 space-y-1">
                                    <li>• Campaign will be moved to completed</li>
                                    <li>• No new posts will be accepted</li>
                                    <li>• Remaining budget will be refunded</li>
                                    <li>• Active posts will remain visible</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-white/10 active:scale-95 rounded-xl text-white text-sm font-medium transition-transform duration-150 border border-white/20"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                await handleEndPromotion(promotion.id);
                                await refetchPromotions();
                                onClose()
                            }}
                            className="flex-1 py-3 px-4 bg-gradient-to-r from-orange-500 to-red-500 active:scale-95 rounded-xl text-white text-sm font-semibold transition-transform duration-150 shadow-lg shadow-orange-500/25"
                        >
                            End Campaign
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
