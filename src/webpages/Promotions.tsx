import { Card, CardContent } from "@/components/ui/card"
import {
    Eye,
    DollarSign,
    Users,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    XCircle
} from "lucide-react"
import { useState } from "react"
import MainLayout from "@/components/Layout/MainLayout"
import { PromotionManageProvider } from "@/providers/PromotionManageProvider"
import PromotionManageStats from "@/components/PromotionManageStats/PromotionManageStats"
import PromotionManage from "@/components/PromotionManage/PromotionManage"


export default function CreatorManagePage() {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)
    const [actionFeedback, setActionFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null)

    return (
        <PromotionManageProvider>
            <MainLayout className="space-y-6">
                {actionFeedback && (
                    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-sm">
                        {actionFeedback.type === "success" ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                        )}
                        <span className={actionFeedback.type === "success" ? "text-green-400" : "text-red-400"}>
                            {actionFeedback.message}
                        </span>
                    </div>
                )}

                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 max-w-sm w-full">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">End Promotion</h3>
                                </div>
                            </div>
                            <p className="text-sm text-white/80 mb-6">
                                Are you sure you want to delete this promotion? Any unallocated budget will be returned to your wallet.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(null)}
                                    className="flex-1 py-2 px-4 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-medium transition-all duration-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => { }}
                                    className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 rounded-xl text-white text-sm font-semibold transition-all duration-300"
                                >
                                    End
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <PromotionManageStats />
                </div>

                <PromotionManage />

            </MainLayout>
        </PromotionManageProvider>
    )
}
