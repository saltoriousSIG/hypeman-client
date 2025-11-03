import React, { useState } from "react";
import PromotionManageCard from "../PromotionManageCard/PromotionManageCard";
import { Eye } from "lucide-react";
import { usePromotionManage } from "@/providers/PromotionManageProvider";

interface PromotionManageProps { }

const PromotionManage: React.FC<PromotionManageProps> = () => {
    const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
    const { activePromotions, completedPromotions, activePromotionsCount, completedPromotionsCount } = usePromotionManage();
    const getCurrentPromotions = () => {
        switch (activeTab) {
            case "active":
                return activePromotions;
            case "completed":
                return completedPromotions
            default:
                return []
        }
    }
    return (
        <>
            <div className="flex items-center gap-2 mb-6 bg-white/5 rounded-2xl p-1 backdrop-blur-sm border border-white/10">
                <button
                    onClick={() => setActiveTab("active")}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === "active"
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                        : "text-white/60 hover:text-white/80 hover:bg-white/5"
                        }`}
                >
                    Active ({activePromotionsCount || 0})
                </button>
                <button
                    onClick={() => setActiveTab("completed")}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === "completed"
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                        : "text-white/60 hover:text-white/80 hover:bg-white/5"
                        }`}
                >
                    Completed ({completedPromotionsCount || 0})
                </button>
            </div>

            <div className="space-y-4">
                {getCurrentPromotions().map((promotion: any) => (
                    <PromotionManageCard key={promotion.id} promotion={promotion} activeTab={activeTab} />
                ))}
            </div>

            {getCurrentPromotions().length === 0 && (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Eye className="w-8 h-8 text-white/40" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No {activeTab} promotions</h3>
                    <p className="text-white/60 text-sm">
                        {activeTab === "active"
                            ? "Create your first promotion to get started"
                            : "Complete some campaigns to see results here"}
                    </p>
                </div>
            )}
        </>

    )
};

export default PromotionManage;
