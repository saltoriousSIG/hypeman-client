import { Card, CardContent } from "@/components/ui/card"
import {
    Edit3,
    Trash2,
    Eye,
    DollarSign,
    Users,
    TrendingUp,
    Pause,
    Play,
    AlertTriangle,
    CheckCircle,
} from "lucide-react"
import { useState } from "react"
import MainLayout from "@/components/Layout/MainLayout"

export default function CreatorManagePage() {
    const [activeTab, setActiveTab] = useState<"active" | "paused" | "completed">("active")
    const [promotions, setPromotions] = useState({
        active: [
            {
                id: 1,
                title: "DeFi Protocol Launch",
                description: "Promote our revolutionary new DeFi protocol with amazing yield opportunities",
                budget: 500,
                spent: 180,
                applications: 24,
                posts: 8,
                engagement: "2.1K likes, 340 recasts",
                createdAt: "2 days ago",
                status: "active",
                category: "Crypto",
            },
            {
                id: 2,
                title: "NFT Collection Drop",
                description: "Help spread the word about our exclusive NFT collection with unique utility",
                budget: 300,
                spent: 120,
                applications: 18,
                posts: 5,
                engagement: "1.8K likes, 290 recasts",
                createdAt: "5 days ago",
                status: "active",
                category: "NFT",
            },
            {
                id: 3,
                title: "Gaming Tournament",
                description: "Promote our massive gaming tournament with $50k prize pool",
                budget: 750,
                spent: 95,
                applications: 32,
                posts: 3,
                engagement: "3.2K likes, 480 recasts",
                createdAt: "1 week ago",
                status: "active",
                category: "Gaming",
            },
        ],
        paused: [
            {
                id: 4,
                title: "AI Trading Bot",
                description: "Promote our advanced AI trading bot with proven results",
                budget: 400,
                spent: 200,
                applications: 15,
                posts: 6,
                engagement: "1.5K likes, 220 recasts",
                createdAt: "3 weeks ago",
                status: "paused",
                category: "Crypto",
            },
        ],
        completed: [
            {
                id: 5,
                title: "Web3 Platform Launch",
                description: "Successfully launched our Web3 platform with community support",
                budget: 600,
                spent: 580,
                applications: 45,
                posts: 18,
                engagement: "5.2K likes, 890 recasts",
                createdAt: "1 month ago",
                status: "completed",
                category: "Web3",
                results: "150% engagement increase, 2.3K new users",
            },
            {
                id: 6,
                title: "Crypto Exchange Promo",
                description: "Promoted new features on our crypto exchange platform",
                budget: 350,
                spent: 340,
                applications: 28,
                posts: 12,
                engagement: "3.8K likes, 650 recasts",
                createdAt: "2 months ago",
                status: "completed",
                category: "Crypto",
                results: "200% trading volume increase",
            },
        ],
    })
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)
    const [actionFeedback, setActionFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null)

    const currentUser = {
        username: "alex_crypto",
        profileImage: "/profile-avatar-person.jpg",
        totalEarned: 2450,
        totalPromotions: 12,
        activePromotions: 3,
    }

    const handlePausePromotion = (id: number) => {
        const promotion = promotions.active.find((p) => p.id === id)
        if (promotion) {
            setPromotions((prev) => ({
                ...prev,
                active: prev.active.filter((p) => p.id !== id),
                paused: [...prev.paused, { ...promotion, status: "paused" }],
            }))
            setActionFeedback({ message: "Promotion paused successfully", type: "success" })
            setTimeout(() => setActionFeedback(null), 3000)
        }
    }

    const handleResumePromotion = (id: number) => {
        const promotion = promotions.paused.find((p) => p.id === id)
        if (promotion) {
            setPromotions((prev) => ({
                ...prev,
                paused: prev.paused.filter((p) => p.id !== id),
                active: [...prev.active, { ...promotion, status: "active" }],
            }))
            setActionFeedback({ message: "Promotion resumed successfully", type: "success" })
            setTimeout(() => setActionFeedback(null), 3000)
        }
    }

    const handleDeletePromotion = (id: number) => {
        const activePromotion = promotions.active.find((p) => p.id === id)
        const pausedPromotion = promotions.paused.find((p) => p.id === id)
        const completedPromotion = promotions.completed.find((p) => p.id === id)

        if (activePromotion) {
            setPromotions((prev) => ({
                ...prev,
                active: prev.active.filter((p) => p.id !== id),
            }))
        } else if (pausedPromotion) {
            setPromotions((prev) => ({
                ...prev,
                paused: prev.paused.filter((p) => p.id !== id),
            }))
        } else if (completedPromotion) {
            setPromotions((prev) => ({
                ...prev,
                completed: prev.completed.filter((p) => p.id !== id),
            }))
        }

        setShowDeleteConfirm(null)
        setActionFeedback({ message: "Promotion deleted successfully", type: "success" })
        setTimeout(() => setActionFeedback(null), 3000)
    }

    const getCurrentPromotions = () => {
        switch (activeTab) {
            case "active":
                return promotions.active
            case "paused":
                return promotions.paused
            case "completed":
                return promotions.completed
            default:
                return promotions.active
        }
    }

    return (
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
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">Delete Promotion</h3>
                                <p className="text-sm text-white/60">This action cannot be undone</p>
                            </div>
                        </div>
                        <p className="text-sm text-white/80 mb-6">
                            Are you sure you want to delete this promotion? All associated data will be permanently removed.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="flex-1 py-2 px-4 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-medium transition-all duration-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeletePromotion(showDeleteConfirm)}
                                className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 rounded-xl text-white text-sm font-semibold transition-all duration-300"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="text-center mb-8">
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                        <div className="text-2xl font-bold text-green-400">${currentUser.totalEarned}</div>
                        <div className="text-xs text-white/60">Total Earned</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                        <div className="text-2xl font-bold text-purple-400">{currentUser.totalPromotions}</div>
                        <div className="text-xs text-white/60">Total Campaigns</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                        <div className="text-2xl font-bold text-blue-400">{currentUser.activePromotions}</div>
                        <div className="text-xs text-white/60">Active Now</div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 mb-6 bg-white/5 rounded-2xl p-1 backdrop-blur-sm border border-white/10">
                <button
                    onClick={() => setActiveTab("active")}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === "active"
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                        : "text-white/60 hover:text-white/80 hover:bg-white/5"
                        }`}
                >
                    Active ({promotions.active.length})
                </button>
                <button
                    onClick={() => setActiveTab("paused")}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === "paused"
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                        : "text-white/60 hover:text-white/80 hover:bg-white/5"
                        }`}
                >
                    Paused ({promotions.paused.length})
                </button>
                <button
                    onClick={() => setActiveTab("completed")}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === "completed"
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                        : "text-white/60 hover:text-white/80 hover:bg-white/5"
                        }`}
                >
                    Completed ({promotions.completed.length})
                </button>
            </div>

            <div className="space-y-4">
                {getCurrentPromotions().map((promotion: any) => (
                    <Card
                        key={promotion.id}
                        className="bg-white/10 backdrop-blur-sm border-white/20 rounded-2xl hover:bg-white/15 transition-all duration-300"
                    >
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg">
                                        {promotion.category.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{promotion.title}</h3>
                                        <p className="text-sm text-white/60">{promotion.createdAt}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {activeTab === "active" && (
                                        <>
                                            <button
                                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-300"
                                                title="Edit promotion"
                                            >
                                                <Edit3 className="w-4 h-4 text-white/60" />
                                            </button>
                                            <button
                                                onClick={() => handlePausePromotion(promotion.id)}
                                                className="w-8 h-8 rounded-full bg-yellow-500/20 hover:bg-yellow-500/30 flex items-center justify-center transition-all duration-300"
                                                title="Pause promotion"
                                            >
                                                <Pause className="w-4 h-4 text-yellow-400" />
                                            </button>
                                        </>
                                    )}
                                    {activeTab === "paused" && (
                                        <button
                                            onClick={() => handleResumePromotion(promotion.id)}
                                            className="w-8 h-8 rounded-full bg-green-500/20 hover:bg-green-500/30 flex items-center justify-center transition-all duration-300"
                                            title="Resume promotion"
                                        >
                                            <Play className="w-4 h-4 text-green-400" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowDeleteConfirm(promotion.id)}
                                        className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center transition-all duration-300"
                                        title="Delete promotion"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-400" />
                                    </button>
                                </div>
                            </div>

                            <p className="text-sm text-white/80 mb-4">{promotion.description}</p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div className="bg-black/20 rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <DollarSign className="w-4 h-4 text-green-400" />
                                        <span className="text-xs text-white/60">Budget</span>
                                    </div>
                                    <div className="text-sm font-bold text-white">
                                        ${promotion.spent} / ${promotion.budget}
                                    </div>
                                    <div className="w-full bg-white/10 rounded-full h-1 mt-2">
                                        <div
                                            className="bg-green-400 h-1 rounded-full transition-all duration-300"
                                            style={{ width: `${(promotion.spent / promotion.budget) * 100}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="bg-black/20 rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Users className="w-4 h-4 text-blue-400" />
                                        <span className="text-xs text-white/60">Applications</span>
                                    </div>
                                    <div className="text-sm font-bold text-white">{promotion.applications}</div>
                                </div>
                                <div className="bg-black/20 rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Eye className="w-4 h-4 text-purple-400" />
                                        <span className="text-xs text-white/60">Posts</span>
                                    </div>
                                    <div className="text-sm font-bold text-white">{promotion.posts}</div>
                                </div>
                                <div className="bg-black/20 rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <TrendingUp className="w-4 h-4 text-yellow-400" />
                                        <span className="text-xs text-white/60">Engagement</span>
                                    </div>
                                    <div className="text-xs text-white/80">{promotion.engagement.split(",")[0]}</div>
                                </div>
                            </div>

                            {activeTab === "completed" && promotion.results && (
                                <div className="bg-green-500/10 border border-green-400/20 rounded-xl p-3 mb-4">
                                    <div className="text-sm font-semibold text-green-400 mb-1">Campaign Results</div>
                                    <div className="text-xs text-white/80">{promotion.results}</div>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <div
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${promotion.status === "active"
                                        ? "bg-green-500/20 text-green-400 border border-green-400/20"
                                        : promotion.status === "paused"
                                            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-400/20"
                                            : "bg-gray-500/20 text-gray-400 border border-gray-400/20"
                                        }`}
                                >
                                    {promotion.status.charAt(0).toUpperCase() + promotion.status.slice(1)}
                                </div>

                                {activeTab === "active" && (
                                    <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full text-white text-sm font-semibold transition-all duration-300">
                                        View Details
                                    </button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
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
                            : activeTab === "paused"
                                ? "No paused campaigns at the moment"
                                : "Complete some campaigns to see results here"}
                    </p>
                </div>
            )}
        </MainLayout>
    )
}
