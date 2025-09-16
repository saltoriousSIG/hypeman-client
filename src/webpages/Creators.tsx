import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, CheckCircle, Clock, XCircle, Settings, DollarSign, TrendingUp } from "lucide-react"
import { NavLink } from "react-router-dom"

// Mock data for pending requests
const pendingRequests = [
    {
        id: 1,
        projectName: "TaskFlow AI",
        requesterName: "John Doe",
        description: "A revolutionary AI-powered task management app that learns from your workflow patterns.",
        url: "https://taskflow.ai",
        budget: "$500",
        aiGeneratedContent:
            "Just discovered TaskFlow AI and I'm genuinely impressed! 🤯 This isn't just another task manager - it actually learns how you work and adapts. The AI suggestions have saved me hours already. If you're drowning in todos like I was, this might be your lifeline. Early access is live now! #productivity #AI",
        timestamp: "2 hours ago",
    },
    {
        id: 2,
        projectName: "CodeSnap",
        requesterName: "Sarah Chen",
        description: "Beautiful code screenshot generator with syntax highlighting and customizable themes.",
        url: "https://codesnap.dev",
        budget: "$300",
        aiGeneratedContent:
            "Okay, CodeSnap just changed my entire workflow 📸 No more ugly screenshots for documentation - this tool makes your code look absolutely stunning. The theme customization is *chef's kiss* and it works with every language I've tried. Fellow devs, you need this in your toolkit! #coding #tools",
        timestamp: "5 hours ago",
    },
]

const approvedPosts = [
    {
        id: 3,
        projectName: "MindMap Pro",
        earnings: "$400",
        engagement: "12.5K views, 890 likes",
        status: "Posted",
        timestamp: "2 days ago",
    },
]

export default function CreatorsPage() {
    const [selectedRequest, setSelectedRequest] = useState<number | null>(null)

    const handleApprove = (requestId: number) => {
        console.log("Approving request:", requestId)
        // Handle approval logic
    }

    const handleReject = (requestId: number) => {
        console.log("Rejecting request:", requestId)
        // Handle rejection logic
    }

    const handleEdit = (requestId: number) => {
        console.log("Editing request:", requestId)
        // Handle edit logic
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
                            <div className="flex items-center gap-2">
                                <Avatar className="w-8 h-8">
                                    <AvatarImage src="/creator-avatar.png" alt="Creator" />
                                    <AvatarFallback className="bg-gray-700 text-white text-xs">AC</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <h1 className="text-base font-semibold text-white truncate">Creator Dashboard</h1>
                                    <p className="text-xs text-gray-400">@alexbuilds</p>
                                </div>
                            </div>
                        </div>
                        <NavLink to="/creators/settings">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-8 h-8 p-0 rounded-full text-gray-400 hover:text-white hover:bg-gray-800/50"
                            >
                                <Settings className="w-4 h-4" />
                            </Button>
                        </NavLink>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                {/* Stats Cards */}
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm min-w-[140px] flex-shrink-0">
                        <CardContent className="p-4">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                                    <DollarSign className="w-4 h-4 text-green-400" />
                                </div>
                                <p className="text-lg font-bold text-white">$2,340</p>
                                <p className="text-xs text-gray-400">Total Earnings</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm min-w-[140px] flex-shrink-0">
                        <CardContent className="p-4">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mb-2">
                                    <TrendingUp className="w-4 h-4 text-blue-400" />
                                </div>
                                <p className="text-lg font-bold text-white">23</p>
                                <p className="text-xs text-gray-400">Posts This Month</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm min-w-[140px] flex-shrink-0">
                        <CardContent className="p-4">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mb-2">
                                    <Clock className="w-4 h-4 text-purple-400" />
                                </div>
                                <p className="text-lg font-bold text-white">{pendingRequests.length}</p>
                                <p className="text-xs text-gray-400">Pending Requests</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <Tabs defaultValue="pending" className="space-y-4">
                    <TabsList className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm w-full">
                        <TabsTrigger
                            value="pending"
                            className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 flex-1"
                        >
                            Pending ({pendingRequests.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="approved"
                            className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 flex-1"
                        >
                            Approved
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pending" className="space-y-4">
                        {pendingRequests.map((request) => (
                            <Card key={request.id} className="overflow-hidden bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <CardTitle className="text-base text-white truncate">{request.projectName}</CardTitle>
                                            <CardDescription className="text-xs text-gray-400 mt-1">
                                                {request.requesterName} • {request.timestamp}
                                            </CardDescription>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className="text-green-400 border-green-400 bg-green-400/10 text-xs flex-shrink-0"
                                        >
                                            {request.budget}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-0">
                                    <div>
                                        <p className="text-sm text-gray-400 leading-relaxed">{request.description}</p>
                                        <p className="text-xs text-blue-400 mt-2">
                                            <a
                                                href={request.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:underline truncate block"
                                            >
                                                {request.url}
                                            </a>
                                        </p>
                                    </div>

                                    <div className="bg-gray-700/30 p-3 rounded-lg border border-gray-600/50">
                                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-white">
                                            AI Content
                                            <Badge variant="secondary" className="text-xs bg-gray-600/50 text-gray-300">
                                                Draft
                                            </Badge>
                                        </h4>
                                        <p className="text-xs leading-relaxed text-gray-300">{request.aiGeneratedContent}</p>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Button
                                            onClick={() => handleApprove(request.id)}
                                            className="bg-green-600 hover:bg-green-700 w-full"
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Approve & Post
                                        </Button>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => handleEdit(request.id)}
                                                className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white flex-1"
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => handleReject(request.id)}
                                                className="text-red-400 border-red-400 hover:bg-red-400/10 flex-1"
                                            >
                                                <XCircle className="w-4 h-4 mr-1" />
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>

                    <TabsContent value="approved" className="space-y-4">
                        {approvedPosts.map((post) => (
                            <Card key={post.id} className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-semibold text-white text-sm truncate">{post.projectName}</h3>
                                            <p className="text-xs text-gray-400">{post.timestamp}</p>
                                            <p className="text-xs text-gray-400 mt-1">{post.engagement}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-base font-bold text-green-400">{post.earnings}</div>
                                            <Badge variant="secondary" className="bg-gray-600/50 text-gray-300 text-xs">
                                                {post.status}
                                            </Badge>
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
