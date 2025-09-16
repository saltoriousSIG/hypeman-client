import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Eye, Edit, Trash2, TrendingUp, DollarSign, Users, MoreHorizontal, Play, Pause } from "lucide-react"
import { NavLink } from "react-router-dom"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Mock promotion data
const promotions = [
    {
        id: 1,
        projectName: "TaskFlow AI",
        description: "A revolutionary AI-powered task management app that learns from your workflow patterns.",
        status: "active",
        totalSpend: 1200,
        creatorsSelected: 4,
        createdAt: "2024-01-15",
        performance: {
            views: "45.2K",
            engagement: "8.7%",
            clicks: "2.1K",
            conversions: 89,
        },
        creators: [
            { name: "Alex Chen", handle: "@alexbuilds", status: "posted", earnings: 299 },
            { name: "Sarah Kim", handle: "@sarahcodes", status: "approved", earnings: 199 },
            { name: "Marcus Johnson", handle: "@marcusdesigns", status: "pending", earnings: 399 },
            { name: "Emma Rodriguez", handle: "@emmatech", status: "posted", earnings: 303 },
        ],
    },
    {
        id: 2,
        projectName: "CodeSnap",
        description: "Beautiful code screenshot generator with syntax highlighting and customizable themes.",
        status: "completed",
        totalSpend: 800,
        creatorsSelected: 3,
        createdAt: "2024-01-10",
        performance: {
            views: "28.5K",
            engagement: "12.3%",
            clicks: "1.8K",
            conversions: 156,
        },
        creators: [
            { name: "Alex Chen", handle: "@alexbuilds", status: "posted", earnings: 299 },
            { name: "Sarah Kim", handle: "@sarahcodes", status: "posted", earnings: 199 },
            { name: "David Park", handle: "@davidbuilds", status: "posted", earnings: 302 },
        ],
    },
    {
        id: 3,
        projectName: "MindMap Pro",
        description: "Advanced mind mapping tool for creative professionals and teams.",
        status: "draft",
        totalSpend: 600,
        creatorsSelected: 2,
        createdAt: "2024-01-20",
        performance: {
            views: "0",
            engagement: "0%",
            clicks: "0",
            conversions: 0,
        },
        creators: [
            { name: "Marcus Johnson", handle: "@marcusdesigns", status: "draft", earnings: 399 },
            { name: "Emma Rodriguez", handle: "@emmatech", status: "draft", earnings: 201 },
        ],
    },
]

const getStatusColor = (status: string) => {
    switch (status) {
        case "active":
            return "bg-blue-500/20 text-blue-400 border-blue-500/30"
        case "completed":
            return "bg-green-500/20 text-green-400 border-green-500/30"
        case "draft":
            return "bg-gray-500/20 text-gray-400 border-gray-500/30"
        case "paused":
            return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
        default:
            return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
}

const getCreatorStatusColor = (status: string) => {
    switch (status) {
        case "posted":
            return "bg-green-500/20 text-green-400"
        case "approved":
            return "bg-blue-500/20 text-blue-400"
        case "pending":
            return "bg-yellow-500/20 text-yellow-400"
        case "draft":
            return "bg-gray-500/20 text-gray-400"
        default:
            return "bg-gray-500/20 text-gray-400"
    }
}

export default function PromotionsPage() {
    const [selectedPromotion, setSelectedPromotion] = useState<number | null>(null)

    const activePromotions = promotions.filter((p) => p.status === "active")
    const completedPromotions = promotions.filter((p) => p.status === "completed")
    const draftPromotions = promotions.filter((p) => p.status === "draft")

    const totalSpent = promotions.reduce((sum, p) => sum + p.totalSpend, 0)
    const totalViews = promotions.reduce((sum, p) => sum + Number.parseInt(p.performance.views.replace(/[^0-9]/g, "")), 0)

    const handleEdit = (promotionId: number) => {
        console.log("Editing promotion:", promotionId)
        // Navigate to edit page
    }

    const handleDelete = (promotionId: number) => {
        console.log("Deleting promotion:", promotionId)
        // Handle deletion
    }

    const handlePause = (promotionId: number) => {
        console.log("Pausing promotion:", promotionId)
        // Handle pause/resume
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-gray-800/50 bg-gray-900/80 backdrop-blur-md">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <NavLink to="/">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-8 h-8 p-0 rounded-full text-gray-400 hover:text-white hover:bg-gray-800/50"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                            </NavLink>
                            <div>
                                <h1 className="text-lg font-semibold text-white">My Promotions</h1>
                                <p className="text-xs text-gray-400">Manage your campaigns</p>
                            </div>
                        </div>
                        <NavLink to="/buyers">
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs px-3">
                                New Campaign
                            </Button>
                        </NavLink>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-6 max-w-4xl">
                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                        <CardContent className="p-4">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mb-2">
                                    <TrendingUp className="w-4 h-4 text-blue-400" />
                                </div>
                                <p className="text-lg font-bold text-white">{promotions.length}</p>
                                <p className="text-xs text-gray-400">Total Campaigns</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                        <CardContent className="p-4">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                                    <DollarSign className="w-4 h-4 text-green-400" />
                                </div>
                                <p className="text-lg font-bold text-white">${totalSpent.toLocaleString()}</p>
                                <p className="text-xs text-gray-400">Total Spent</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                        <CardContent className="p-4">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mb-2">
                                    <Eye className="w-4 h-4 text-purple-400" />
                                </div>
                                <p className="text-lg font-bold text-white">{(totalViews / 1000).toFixed(1)}K</p>
                                <p className="text-xs text-gray-400">Total Views</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                        <CardContent className="p-4">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center mb-2">
                                    <Users className="w-4 h-4 text-orange-400" />
                                </div>
                                <p className="text-lg font-bold text-white">{activePromotions.length}</p>
                                <p className="text-xs text-gray-400">Active Now</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Promotions List */}
                <Tabs defaultValue="all" className="space-y-4">
                    <TabsList className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm w-full">
                        <TabsTrigger
                            value="all"
                            className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 flex-1"
                        >
                            All ({promotions.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="active"
                            className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 flex-1"
                        >
                            Active ({activePromotions.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="completed"
                            className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 flex-1"
                        >
                            Done ({completedPromotions.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="space-y-4">
                        {promotions.map((promotion) => (
                            <Card key={promotion.id} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <CardTitle className="text-base text-white truncate">{promotion.projectName}</CardTitle>
                                                <Badge variant="outline" className={`text-xs ${getStatusColor(promotion.status)}`}>
                                                    {promotion.status}
                                                </Badge>
                                            </div>
                                            <CardDescription className="text-xs text-gray-400">
                                                Created {new Date(promotion.createdAt).toLocaleDateString()} • {promotion.creatorsSelected}{" "}
                                                creators
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-green-400">${promotion.totalSpend}</div>
                                                <div className="text-xs text-gray-400">total spend</div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0 text-gray-400 hover:text-white">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                                                    <DropdownMenuItem
                                                        onClick={() => handleEdit(promotion.id)}
                                                        className="text-gray-300 hover:bg-gray-700"
                                                    >
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    {promotion.status === "active" && (
                                                        <DropdownMenuItem
                                                            onClick={() => handlePause(promotion.id)}
                                                            className="text-gray-300 hover:bg-gray-700"
                                                        >
                                                            <Pause className="w-4 h-4 mr-2" />
                                                            Pause
                                                        </DropdownMenuItem>
                                                    )}
                                                    {promotion.status === "paused" && (
                                                        <DropdownMenuItem
                                                            onClick={() => handlePause(promotion.id)}
                                                            className="text-gray-300 hover:bg-gray-700"
                                                        >
                                                            <Play className="w-4 h-4 mr-2" />
                                                            Resume
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(promotion.id)}
                                                        className="text-red-400 hover:bg-red-400/10"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-0">
                                    <p className="text-sm text-gray-400 leading-relaxed">{promotion.description}</p>

                                    {/* Performance Metrics */}
                                    {promotion.status !== "draft" && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-700/30 rounded-lg">
                                            <div className="text-center">
                                                <div className="text-sm font-semibold text-white">{promotion.performance.views}</div>
                                                <div className="text-xs text-gray-400">Views</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-sm font-semibold text-white">{promotion.performance.engagement}</div>
                                                <div className="text-xs text-gray-400">Engagement</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-sm font-semibold text-white">{promotion.performance.clicks}</div>
                                                <div className="text-xs text-gray-400">Clicks</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-sm font-semibold text-white">{promotion.performance.conversions}</div>
                                                <div className="text-xs text-gray-400">Conversions</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Creator Status */}
                                    <div>
                                        <h4 className="text-sm font-medium mb-2 text-white">Creator Status</h4>
                                        <div className="space-y-2">
                                            {promotion.creators.map((creator, index) => (
                                                <div key={index} className="flex items-center justify-between bg-gray-700/30 rounded-lg p-2">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="w-6 h-6">
                                                            <AvatarImage src="/placeholder.svg" alt={creator.name} />
                                                            <AvatarFallback className="bg-gray-600 text-white text-xs">
                                                                {creator.name
                                                                    .split(" ")
                                                                    .map((n) => n[0])
                                                                    .join("")}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <span className="text-sm text-white">{creator.name}</span>
                                                            <p className="text-xs text-gray-400">{creator.handle}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className={`text-xs ${getCreatorStatusColor(creator.status)}`}>
                                                            {creator.status}
                                                        </Badge>
                                                        <span className="text-xs text-gray-400">${creator.earnings}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>

                    <TabsContent value="active" className="space-y-4">
                        {activePromotions.map((promotion) => (
                            <Card key={promotion.id} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                                {/* Same card structure as above */}
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <CardTitle className="text-base text-white truncate">{promotion.projectName}</CardTitle>
                                                <Badge variant="outline" className={`text-xs ${getStatusColor(promotion.status)}`}>
                                                    {promotion.status}
                                                </Badge>
                                            </div>
                                            <CardDescription className="text-xs text-gray-400">
                                                Created {new Date(promotion.createdAt).toLocaleDateString()} • {promotion.creatorsSelected}{" "}
                                                creators
                                            </CardDescription>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-green-400">${promotion.totalSpend}</div>
                                            <div className="text-xs text-gray-400">total spend</div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-0">
                                    <p className="text-sm text-gray-400 leading-relaxed">{promotion.description}</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-700/30 rounded-lg">
                                        <div className="text-center">
                                            <div className="text-sm font-semibold text-white">{promotion.performance.views}</div>
                                            <div className="text-xs text-gray-400">Views</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm font-semibold text-white">{promotion.performance.engagement}</div>
                                            <div className="text-xs text-gray-400">Engagement</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm font-semibold text-white">{promotion.performance.clicks}</div>
                                            <div className="text-xs text-gray-400">Clicks</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm font-semibold text-white">{promotion.performance.conversions}</div>
                                            <div className="text-xs text-gray-400">Conversions</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>

                    <TabsContent value="completed" className="space-y-4">
                        {completedPromotions.map((promotion) => (
                            <Card key={promotion.id} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                                {/* Same card structure as above */}
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <CardTitle className="text-base text-white truncate">{promotion.projectName}</CardTitle>
                                                <Badge variant="outline" className={`text-xs ${getStatusColor(promotion.status)}`}>
                                                    {promotion.status}
                                                </Badge>
                                            </div>
                                            <CardDescription className="text-xs text-gray-400">
                                                Created {new Date(promotion.createdAt).toLocaleDateString()} • {promotion.creatorsSelected}{" "}
                                                creators
                                            </CardDescription>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-green-400">${promotion.totalSpend}</div>
                                            <div className="text-xs text-gray-400">total spend</div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-0">
                                    <p className="text-sm text-gray-400 leading-relaxed">{promotion.description}</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-700/30 rounded-lg">
                                        <div className="text-center">
                                            <div className="text-sm font-semibold text-white">{promotion.performance.views}</div>
                                            <div className="text-xs text-gray-400">Views</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm font-semibold text-white">{promotion.performance.engagement}</div>
                                            <div className="text-xs text-gray-400">Engagement</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm font-semibold text-white">{promotion.performance.clicks}</div>
                                            <div className="text-xs text-gray-400">Clicks</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm font-semibold text-white">{promotion.performance.conversions}</div>
                                            <div className="text-xs text-gray-400">Conversions</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
