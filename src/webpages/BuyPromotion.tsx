import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Star, Users, Zap, Search, Check, Plus, History } from "lucide-react"
import { NavLink } from "react-router-dom"

// Mock creator data
const creators = [
    {
        id: 1,
        name: "Alex Chen",
        handle: "@alexbuilds",
        avatar: "/tech-creator-avatar.png",
        followers: "125K",
        engagement: "8.2%",
        price: 299,
        rating: 4.9,
        specialty: "Tech & Startups",
        bio: "Building in public, sharing the journey. Love amplifying innovative projects.",
        isRegistered: true,
    },
    {
        id: 2,
        name: "Sarah Kim",
        handle: "@sarahcodes",
        avatar: "/female-developer-avatar.png",
        followers: "89K",
        engagement: "12.1%",
        price: 199,
        rating: 4.8,
        specialty: "Web3 & AI",
        bio: "Passionate about emerging tech. Authentic voice in the developer community.",
        isRegistered: true,
    },
    {
        id: 3,
        name: "Marcus Johnson",
        handle: "@marcusdesigns",
        avatar: "/diverse-designer-avatars.png",
        followers: "156K",
        engagement: "6.7%",
        price: 399,
        rating: 4.9,
        specialty: "Design & UX",
        bio: "Design leader sharing insights. Love promoting beautiful, functional products.",
        isRegistered: true,
    },
]

// Mock search results for any user search
const searchResults = [
    {
        id: 101,
        name: "Emma Rodriguez",
        handle: "@emmatech",
        avatar: "/placeholder.svg?height=64&width=64",
        followers: "45K",
        isRegistered: false,
    },
    {
        id: 102,
        name: "David Park",
        handle: "@davidbuilds",
        avatar: "/placeholder.svg?height=64&width=64",
        followers: "78K",
        isRegistered: false,
    },
]

export default function BuyersPage() {
    const [selectedCreators, setSelectedCreators] = useState<number[]>([])
    const [selectedUsers, setSelectedUsers] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [showSearchResults, setShowSearchResults] = useState(false)
    const [projectDetails, setProjectDetails] = useState({
        name: "",
        description: "",
        url: "",
        budget: "",
    })

    const calculateTotalSpend = () => {
        const verifiedTotal = selectedCreators.reduce((total, creatorId) => {
            const creator = creators.find((c) => c.id === creatorId)
            return total + (creator?.price || 0)
        }, 0)

        const budgetAmount = projectDetails.budget ? Number.parseInt(projectDetails.budget.replace(/[^0-9]/g, "")) || 0 : 0
        const unverifiedCount = selectedUsers.length
        const unverifiedTotal = unverifiedCount > 0 && budgetAmount > 0 ? budgetAmount : 0

        return { verifiedTotal, unverifiedTotal, total: verifiedTotal + unverifiedTotal }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        console.log("Submitting request:", { selectedCreators, selectedUsers, projectDetails })
    }

    const handleSearch = (query: string) => {
        setSearchQuery(query)
        setShowSearchResults(query.length > 0)
    }

    const selectUser = (user: any) => {
        if (!selectedUsers.find((u) => u.id === user.id)) {
            setSelectedUsers((prev) => [...prev, user])
        }
        setShowSearchResults(false)
        setSearchQuery("")
    }

    const toggleCreator = (creatorId: number) => {
        setSelectedCreators((prev) =>
            prev.includes(creatorId) ? prev.filter((id) => id !== creatorId) : [...prev, creatorId],
        )
    }

    const removeSelectedUser = (userId: number) => {
        setSelectedUsers((prev) => prev.filter((u) => u.id !== userId))
    }

    const removeSelectedCreator = (creatorId: number) => {
        setSelectedCreators((prev) => prev.filter((id) => id !== creatorId))
    }

    const totalSpend = calculateTotalSpend()

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-gray-800/50 bg-gray-900/80 backdrop-blur-md">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <NavLink to="/">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-white hover:bg-gray-800/50 p-2 h-9 w-9 rounded-full transition-all active:scale-95"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </NavLink>
                        <div>
                            <h1 className="text-lg font-semibold text-white leading-tight">Find Your Hypeman</h1>
                            <p className="text-xs text-gray-500 leading-tight">Select multiple creators</p>
                        </div>
                    </div>
                    <NavLink to="/promotions">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white hover:bg-gray-800/50 p-2 h-9 w-9 rounded-full transition-all active:scale-95"
                        >
                            <History className="w-4 h-4" />
                        </Button>
                    </NavLink>
                </div>
            </header>

            <div className="container mx-auto px-4 py-4 max-w-4xl">
                <div className="flex flex-col gap-6">
                    {/* Creator Selection - Mobile First */}
                    <div className="w-full">
                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    id="search"
                                    placeholder="Search any user..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 h-12 rounded-xl"
                                />
                            </div>

                            {showSearchResults && (
                                <Card className="mt-2 bg-gray-800/80 border-gray-700 backdrop-blur-sm">
                                    <CardContent className="p-3">
                                        <div className="space-y-2">
                                            {searchResults
                                                .filter(
                                                    (user) =>
                                                        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                        user.handle.toLowerCase().includes(searchQuery.toLowerCase()),
                                                )
                                                .map((user) => (
                                                    <div
                                                        key={user.id}
                                                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors active:scale-[0.98]"
                                                        onClick={() => selectUser(user)}
                                                    >
                                                        <Avatar className="w-10 h-10">
                                                            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                                                            <AvatarFallback className="bg-gray-600 text-white text-sm">
                                                                {user.name
                                                                    .split(" ")
                                                                    .map((n) => n[0])
                                                                    .join("")}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-white truncate">{user.name}</p>
                                                            <p className="text-sm text-gray-400 truncate">
                                                                {user.handle} • {user.followers}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="text-orange-400 border-orange-400 text-xs">
                                                                Request
                                                            </Badge>
                                                            <Plus className="w-4 h-4 text-gray-400" />
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {(selectedCreators.length > 0 || selectedUsers.length > 0) && (
                            <Card className="mb-4 bg-blue-500/10 border-blue-500/30">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-blue-400">
                                            Selected ({selectedCreators.length + selectedUsers.length})
                                        </h3>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-green-400">${totalSpend.total}</div>
                                            <div className="text-xs text-gray-400">Total spend</div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {selectedCreators.map((creatorId) => {
                                            const creator = creators.find((c) => c.id === creatorId)
                                            return creator ? (
                                                <div
                                                    key={creatorId}
                                                    className="flex items-center justify-between bg-gray-800/50 rounded-lg p-2"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="w-6 h-6">
                                                            <AvatarImage src={creator.avatar || "/placeholder.svg"} alt={creator.name} />
                                                            <AvatarFallback className="bg-gray-600 text-white text-xs">
                                                                {creator.name
                                                                    .split(" ")
                                                                    .map((n) => n[0])
                                                                    .join("")}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm text-white">{creator.name}</span>
                                                        <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-xs">
                                                            ${creator.price}
                                                        </Badge>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeSelectedCreator(creatorId)}
                                                        className="text-gray-400 hover:text-red-400 p-1 h-6 w-6"
                                                    >
                                                        ×
                                                    </Button>
                                                </div>
                                            ) : null
                                        })}

                                        {selectedUsers.map((user) => (
                                            <div key={user.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-2">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="w-6 h-6">
                                                        <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                                                        <AvatarFallback className="bg-gray-600 text-white text-xs">
                                                            {user.name
                                                                .split(" ")
                                                                .map((n: string) => n[0])
                                                                .join("")}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm text-white">{user.name}</span>
                                                    <Badge variant="outline" className="text-orange-400 border-orange-400 text-xs">
                                                        {totalSpend.unverifiedTotal > 0
                                                            ? `$${Math.round(totalSpend.unverifiedTotal / selectedUsers.length)}`
                                                            : "TBD"}
                                                    </Badge>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeSelectedUser(user.id)}
                                                    className="text-gray-400 hover:text-red-400 p-1 h-6 w-6"
                                                >
                                                    ×
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <div className="mb-4">
                            <h2 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
                                <Zap className="w-5 h-5 text-blue-400" />
                                Verified Creators
                            </h2>
                            <div className="space-y-3">
                                {creators.map((creator) => (
                                    <Card
                                        key={creator.id}
                                        className={`cursor-pointer transition-all hover:shadow-lg bg-gray-800/50 border-gray-700 active:scale-[0.98] ${selectedCreators.includes(creator.id) ? "ring-2 ring-blue-500 bg-gray-700/50" : ""
                                            }`}
                                        onClick={() => toggleCreator(creator.id)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 mt-1">
                                                    <div
                                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedCreators.includes(creator.id) ? "bg-blue-500 border-blue-500" : "border-gray-500"
                                                            }`}
                                                    >
                                                        {selectedCreators.includes(creator.id) && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                </div>

                                                <Avatar className="w-12 h-12 flex-shrink-0">
                                                    <AvatarImage src={creator.avatar || "/placeholder.svg"} alt={creator.name} />
                                                    <AvatarFallback className="bg-gray-600 text-white">
                                                        {creator.name
                                                            .split(" ")
                                                            .map((n) => n[0])
                                                            .join("")}
                                                    </AvatarFallback>
                                                </Avatar>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="font-semibold text-white truncate">{creator.name}</h3>
                                                            <p className="text-sm text-gray-400 truncate">{creator.handle}</p>
                                                        </div>
                                                        <div className="text-right flex-shrink-0 ml-2">
                                                            <div className="text-lg font-bold text-green-400">${creator.price}</div>
                                                            <div className="text-xs text-gray-500">per post</div>
                                                        </div>
                                                    </div>

                                                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">{creator.bio}</p>

                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3 text-xs text-gray-400">
                                                            <div className="flex items-center gap-1">
                                                                <Users className="w-3 h-3" />
                                                                {creator.followers}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Zap className="w-3 h-3" />
                                                                {creator.engagement}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                                                {creator.rating}
                                                            </div>
                                                        </div>
                                                        <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-xs">
                                                            {creator.specialty}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="w-full">
                        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-white text-lg">Project Details</CardTitle>
                                <CardDescription className="text-gray-400 text-sm">
                                    Tell us about your project for the perfect promotion
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <Label htmlFor="project-name" className="text-gray-300 text-sm">
                                            Project Name
                                        </Label>
                                        <Input
                                            id="project-name"
                                            placeholder="My Awesome Project"
                                            value={projectDetails.name}
                                            onChange={(e) => setProjectDetails((prev) => ({ ...prev, name: e.target.value }))}
                                            className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 h-11 mt-1"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="project-description" className="text-gray-300 text-sm">
                                            Description
                                        </Label>
                                        <Textarea
                                            id="project-description"
                                            placeholder="Describe what makes your project special..."
                                            rows={3}
                                            value={projectDetails.description}
                                            onChange={(e) => setProjectDetails((prev) => ({ ...prev, description: e.target.value }))}
                                            className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 mt-1 resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="project-url" className="text-gray-300 text-sm">
                                                Project URL
                                            </Label>
                                            <Input
                                                id="project-url"
                                                type="url"
                                                placeholder="https://myproject.com"
                                                value={projectDetails.url}
                                                onChange={(e) => setProjectDetails((prev) => ({ ...prev, url: e.target.value }))}
                                                className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 h-11 mt-1"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="budget" className="text-gray-300 text-sm">
                                                {selectedCreators.length > 0 && selectedUsers.length === 0
                                                    ? "Total Cost (Auto-calculated)"
                                                    : selectedUsers.length > 0 && selectedCreators.length === 0
                                                        ? "Budget for Unverified Creators"
                                                        : selectedCreators.length > 0 && selectedUsers.length > 0
                                                            ? "Additional Budget for Unverified Creators"
                                                            : "Budget for Unverified Creators"}
                                            </Label>
                                            <Input
                                                id="budget"
                                                placeholder={selectedCreators.length > 0 ? `$${totalSpend.verifiedTotal}` : "$500"}
                                                value={
                                                    selectedCreators.length > 0 && selectedUsers.length === 0
                                                        ? `$${totalSpend.verifiedTotal}`
                                                        : projectDetails.budget
                                                }
                                                onChange={(e) => setProjectDetails((prev) => ({ ...prev, budget: e.target.value }))}
                                                className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 h-11 mt-1"
                                                readOnly={selectedCreators.length > 0 && selectedUsers.length === 0}
                                            />
                                            {selectedUsers.length > 0 && projectDetails.budget && (
                                                <div className="mt-2 space-y-1">
                                                    <p className="text-xs text-gray-400">
                                                        $
                                                        {Math.round(
                                                            Number.parseInt(projectDetails.budget.replace(/[^0-9]/g, "")) / selectedUsers.length,
                                                        )}{" "}
                                                        per unverified creator
                                                    </p>
                                                    {Number.parseInt(projectDetails.budget.replace(/[^0-9]/g, "")) / selectedUsers.length <
                                                        50 && (
                                                            <p className="text-xs text-amber-400 flex items-center gap-1">
                                                                ⚠️ Low budget per creator (under $50)
                                                            </p>
                                                        )}
                                                    {Number.parseInt(projectDetails.budget.replace(/[^0-9]/g, "")) === 0 && (
                                                        <p className="text-xs text-red-400 flex items-center gap-1">
                                                            ❌ Unverified creators will receive $0
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                            {selectedCreators.length > 0 && selectedUsers.length > 0 && (
                                                <div className="mt-2 p-2 bg-gray-700/30 rounded-lg">
                                                    <p className="text-xs text-gray-300 font-medium mb-1">Budget Breakdown:</p>
                                                    <div className="text-xs text-gray-400 space-y-1">
                                                        <div className="flex justify-between">
                                                            <span>Verified creators:</span>
                                                            <span className="text-green-400">${totalSpend.verifiedTotal}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Unverified creators:</span>
                                                            <span className="text-orange-400">
                                                                $
                                                                {projectDetails.budget
                                                                    ? Number.parseInt(projectDetails.budget.replace(/[^0-9]/g, "")) || 0
                                                                    : 0}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between font-medium text-white border-t border-gray-600 pt-1">
                                                            <span>Total:</span>
                                                            <span>
                                                                $
                                                                {totalSpend.verifiedTotal +
                                                                    (projectDetails.budget
                                                                        ? Number.parseInt(projectDetails.budget.replace(/[^0-9]/g, "")) || 0
                                                                        : 0)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-white font-medium active:scale-[0.98] transition-transform"
                                        disabled={(selectedCreators.length === 0 && selectedUsers.length === 0) || !projectDetails.name}
                                    >
                                        {selectedCreators.length > 0 || selectedUsers.length > 0
                                            ? `Book ${selectedCreators.length + selectedUsers.length} Creator${selectedCreators.length + selectedUsers.length > 1 ? "s" : ""} - $${totalSpend.total}`
                                            : "Select Creators"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
