import type React from "react"
import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Star, Zap, Search, Check, Plus, History, Users, Target } from "lucide-react"
import { toast } from "sonner"
import { NavLink } from "react-router-dom"
import useContract, { ExecutionType } from "@/hooks/useContract"
import { USDC_ADDRESS, DIAMOND_ADDRESS } from "@/lib/utils"
import { useFrameContext } from "@/providers/FrameProvider"
import { parseUnits } from "viem"

// Mock creator data
const creators = []

// Mock search results for any user search
const searchResults = [];

export default function BuyersPage() {
    const { address } = useFrameContext();
    console.log(address);

    const [promotionType, setPromotionType] = useState<"open" | "targeted">("open")
    const [selectedCreators, setSelectedCreators] = useState<number[]>([])
    const [selectedUsers, setSelectedUsers] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [showSearchResults, setShowSearchResults] = useState(false)
    const [promotionMode, setPromotionMode] = useState<"existing" | "new">("new")
    const [customDuration, setCustomDuration] = useState({ value: "", unit: "hours" })
    const [projectDetails, setProjectDetails] = useState({
        name: "",
        description: "",
        url: "",
        budget: "",
        pricePerPost: "",
        totalBudget: "",
        profilesToMention: "",
        parentCast: "",
        castToPost: "",
        existingCastUrl: "",
        postDuration: "24",
    })
    const [isApproved, setIsApproved] = useState<boolean>(false);

    const allowance = useContract(ExecutionType.READABLE, "ERC20", "allowance", USDC_ADDRESS);
    const approve = useContract(ExecutionType.WRITABLE, "ERC20", "approve", USDC_ADDRESS);
    const create_promotion = useContract(ExecutionType.WRITABLE, "Create", "create_promotion");

    useEffect(() => {
        const load = async () => {
            const user_allowance = await allowance([address, DIAMOND_ADDRESS]);
            setIsApproved(parseInt(user_allowance.toString()) >= parseInt(projectDetails.totalBudget));
        }
        load();
    }, [allowance, address, projectDetails]);

    const handleApprove = useCallback(async () => {
        try {

            await approve([DIAMOND_ADDRESS, parseUnits(projectDetails.totalBudget, 6)]);
        } catch (e: any) {
            console.error(e, e.message);
        }
    }, [approve, address, projectDetails]);


    console.log(isApproved, "is approved");

    const calculateTotalSpend = () => {
        if (promotionType === "open") {
            const totalBudget = projectDetails.totalBudget
                ? Number.parseInt(projectDetails.totalBudget.replace(/[^0-9]/g, "")) || 0
                : 0
            return { verifiedTotal: 0, unverifiedTotal: 0, total: totalBudget }
        }

        const verifiedTotal = selectedCreators.reduce((total, creatorId) => {
            const creator: any = creators.find((c: any) => c.id === creatorId)
            return total + (creator?.price || 0)
        }, 0)

        const budgetAmount = projectDetails.budget ? Number.parseInt(projectDetails.budget.replace(/[^0-9]/g, "")) || 0 : 0
        const unverifiedCount = selectedUsers.length
        const unverifiedTotal = unverifiedCount > 0 && budgetAmount > 0 ? budgetAmount : 0

        return { verifiedTotal, unverifiedTotal, total: verifiedTotal + unverifiedTotal }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log(isApproved);
        if (!isApproved) {
            await handleApprove();
        }
        console.log("Submitting request:", { promotionType, selectedUsers, projectDetails })
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
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            {/* Floating decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl"></div>
                <div className="absolute top-40 right-20 w-24 h-24 bg-pink-500/20 rounded-full blur-2xl"></div>
                <div className="absolute bottom-40 left-1/4 w-20 h-20 bg-purple-400/30 rounded-full blur-xl"></div>
                <div className="absolute top-60 left-1/2 w-16 h-16 bg-pink-400/20 rounded-full blur-lg"></div>
                <div className="absolute bottom-20 right-10 w-28 h-28 bg-purple-600/20 rounded-full blur-2xl"></div>
                <div className="absolute top-80 right-20 w-10 h-10 bg-cyan-400/30 rounded-full blur-lg"></div>
            </div>

            {/* Header */}
            <header className="relative z-10 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <NavLink to="/">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                            <ArrowLeft className="w-4 h-4 text-white/60" />
                        </div>
                    </NavLink>
                    <div>
                        <h1 className="text-lg font-semibold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent">
                            Find Your Hypeman
                        </h1>
                        <p className="text-xs text-white/60 leading-tight">Select multiple creators</p>
                    </div>
                </div>
                <NavLink to="/manage">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                        <History className="w-4 h-4 text-white/60" />
                    </div>
                </NavLink>
            </header>

            <div className="relative z-10 px-4 space-y-4">
                {/* Promotion Type Selection */}
                <div className="w-full">
                    <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-white text-lg">Promotion Type</CardTitle>
                            <CardDescription className="text-white/60 text-sm">
                                Choose how you want to run your promotion
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${promotionType === "open"
                                        ? "border-purple-400/50 bg-purple-500/10"
                                        : "border-white/20 bg-white/5 hover:bg-white/10"
                                        }`}
                                    onClick={() => setPromotionType("open")}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div
                                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${promotionType === "open" ? "bg-purple-500 border-purple-500" : "border-white/30"
                                                }`}
                                        >
                                            {promotionType === "open" && <Check className="w-2.5 h-2.5 text-white" />}
                                        </div>
                                        <Users className="w-5 h-5 text-purple-400" />
                                        <h3 className="font-semibold text-white">Open Promotion</h3>
                                    </div>
                                    <p className="text-sm text-white/60 ml-7">
                                        Set a budget and price per post. Anyone can claim and promote your project.
                                    </p>
                                </div>

                                <div
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${promotionType === "targeted"
                                        ? "border-purple-400/50 bg-purple-500/10"
                                        : "border-white/20 bg-white/5 hover:bg-white/10"
                                        }`}
                                    onClick={() => toast.info("Coming Soon!")}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div
                                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${promotionType === "targeted" ? "bg-purple-500 border-purple-500" : "border-white/30"
                                                }`}
                                        >
                                            {promotionType === "targeted" && <Check className="w-2.5 h-2.5 text-white" />}
                                        </div>
                                        <Target className="w-5 h-5 text-pink-400" />
                                        <h3 className="font-semibold text-white">Targeted Promotion</h3>
                                    </div>
                                    <p className="text-sm text-white/60 ml-7">
                                        Handpick verified creators or search for specific users to promote your project.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Project Details */}
                <div className="w-full">
                    <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-white text-lg">Project Details</CardTitle>
                            <CardDescription className="text-white/60 text-sm">
                                Tell us about your project for the perfect promotion
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Promotion Mode Selection */}
                                <div>
                                    <Label className="text-white/80 text-sm mb-3 block">Promotion Mode</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div
                                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${promotionMode === "existing"
                                                ? "border-purple-400/50 bg-purple-500/10"
                                                : "border-white/20 bg-white/5 hover:bg-white/10"
                                                }`}
                                            onClick={() => setPromotionMode("existing")}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div
                                                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${promotionMode === "existing" ? "bg-purple-500 border-purple-500" : "border-white/30"
                                                        }`}
                                                >
                                                    {promotionMode === "existing" && <Check className="w-2.5 h-2.5 text-white" />}
                                                </div>
                                                <h3 className="font-medium text-white text-sm">Promote Existing Cast</h3>
                                            </div>
                                            <p className="text-xs text-white/60 ml-6">Boost an existing cast by pasting its URL</p>
                                        </div>

                                        <div
                                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${promotionMode === "new"
                                                ? "border-purple-400/50 bg-purple-500/10"
                                                : "border-white/20 bg-white/5 hover:bg-white/10"
                                                }`}
                                            onClick={() => setPromotionMode("new")}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div
                                                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${promotionMode === "new" ? "bg-purple-500 border-purple-500" : "border-white/30"
                                                        }`}
                                                >
                                                    {promotionMode === "new" && <Check className="w-2.5 h-2.5 text-white" />}
                                                </div>
                                                <h3 className="font-medium text-white text-sm">Create New Promotion</h3>
                                            </div>
                                            <p className="text-xs text-white/60 ml-6">Create fresh promotional content</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="project-name" className="text-white/80 text-sm">
                                        Project Name
                                    </Label>
                                    <Input
                                        id="project-name"
                                        placeholder="My Awesome Project"
                                        value={projectDetails.name}
                                        onChange={(e) => setProjectDetails((prev) => ({ ...prev, name: e.target.value }))}
                                        className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 h-11 mt-1"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="project-description" className="text-white/80 text-sm">
                                        Description
                                    </Label>
                                    <Textarea
                                        id="project-description"
                                        placeholder="Describe what makes your project special..."
                                        rows={3}
                                        value={projectDetails.description}
                                        onChange={(e) => setProjectDetails((prev) => ({ ...prev, description: e.target.value }))}
                                        className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 mt-1 resize-none"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="project-url" className="text-white/80 text-sm">
                                        Project URL
                                    </Label>
                                    <Input
                                        id="project-url"
                                        type="url"
                                        placeholder="https://myproject.com"
                                        value={projectDetails.url}
                                        onChange={(e) => setProjectDetails((prev) => ({ ...prev, url: e.target.value }))}
                                        className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 h-11 mt-1"
                                    />
                                </div>

                                {promotionMode === "existing" ? (
                                    <div>
                                        <Label htmlFor="existing-cast-url" className="text-white/80 text-sm">
                                            Cast URL to Promote
                                        </Label>
                                        <Input
                                            id="existing-cast-url"
                                            placeholder="https://warpcast.com/username/0x123..."
                                            value={projectDetails.existingCastUrl || ""}
                                            onChange={(e) => setProjectDetails((prev) => ({ ...prev, existingCastUrl: e.target.value }))}
                                            className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 h-11 mt-1"
                                        />
                                        <p className="text-xs text-white/50 mt-1">Paste the URL of the cast you want to promote</p>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <Label htmlFor="profiles-mention" className="text-white/80 text-sm">
                                                Profiles to Mention
                                            </Label>
                                            <Input
                                                id="profiles-mention"
                                                placeholder="@username1, @username2"
                                                value={projectDetails.profilesToMention || ""}
                                                onChange={(e) => setProjectDetails((prev) => ({ ...prev, profilesToMention: e.target.value }))}
                                                className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 h-11 mt-1"
                                            />
                                            <p className="text-xs text-white/50 mt-1">Comma-separated usernames to mention in posts</p>
                                        </div>

                                        <div>
                                            <Label htmlFor="parent-cast" className="text-white/80 text-sm">
                                                Parent Cast
                                            </Label>
                                            <Input
                                                id="parent-cast"
                                                placeholder="https://warpcast.com/username/0x123..."
                                                value={projectDetails.parentCast || ""}
                                                onChange={(e) => setProjectDetails((prev) => ({ ...prev, parentCast: e.target.value }))}
                                                className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 h-11 mt-1"
                                            />
                                            <p className="text-xs text-white/50 mt-1">URL of the cast to reply to (optional)</p>
                                        </div>

                                        <div>
                                            <Label htmlFor="cast-to-post" className="text-white/80 text-sm">
                                                Cast to Post
                                            </Label>
                                            <Textarea
                                                id="cast-to-post"
                                                placeholder="Check out this amazing project! 🚀"
                                                rows={3}
                                                value={projectDetails.castToPost || ""}
                                                onChange={(e) => setProjectDetails((prev) => ({ ...prev, castToPost: e.target.value }))}
                                                className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 mt-1 resize-none"
                                            />
                                            <p className="text-xs text-white/50 mt-1">The message creators will post about your project</p>
                                        </div>
                                    </>
                                )}

                                <div>
                                    <Label htmlFor="post-duration" className="text-white/80 text-sm">
                                        Required Post Duration
                                    </Label>
                                    <select
                                        id="post-duration"
                                        value={projectDetails.postDuration || "24"}
                                        onChange={(e) => {
                                            setProjectDetails((prev) => ({ ...prev, postDuration: e.target.value }))
                                            if (e.target.value !== "custom") {
                                                setCustomDuration({ value: "", unit: "hours" })
                                            }
                                        }}
                                        className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white h-11 mt-1 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    >
                                        <option value="6" className="bg-gray-900 text-white">
                                            6 hours
                                        </option>
                                        <option value="12" className="bg-gray-900 text-white">
                                            12 hours
                                        </option>
                                        <option value="24" className="bg-gray-900 text-white">
                                            24 hours
                                        </option>
                                        <option value="48" className="bg-gray-900 text-white">
                                            48 hours
                                        </option>
                                        <option value="72" className="bg-gray-900 text-white">
                                            72 hours
                                        </option>
                                        <option value="168" className="bg-gray-900 text-white">
                                            1 week
                                        </option>
                                        <option value="custom" className="bg-gray-900 text-white">
                                            Custom duration
                                        </option>
                                    </select>

                                    {projectDetails.postDuration === "custom" && (
                                        <div className="mt-3 flex gap-2">
                                            <div className="flex-1">
                                                <Input
                                                    placeholder="Enter duration"
                                                    type="number"
                                                    min="1"
                                                    value={customDuration.value}
                                                    onChange={(e) => setCustomDuration((prev) => ({ ...prev, value: e.target.value }))}
                                                    className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 h-10"
                                                />
                                            </div>
                                            <div className="w-24">
                                                <select
                                                    value={customDuration.unit}
                                                    onChange={(e) => setCustomDuration((prev) => ({ ...prev, unit: e.target.value }))}
                                                    className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white h-10 rounded-md px-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                                >
                                                    <option value="hours" className="bg-gray-900 text-white">
                                                        Hours
                                                    </option>
                                                    <option value="days" className="bg-gray-900 text-white">
                                                        Days
                                                    </option>
                                                    <option value="weeks" className="bg-gray-900 text-white">
                                                        Weeks
                                                    </option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-xs text-white/50 mt-1">
                                        {projectDetails.postDuration === "custom" && customDuration.value
                                            ? `Posts must stay live for ${customDuration.value} ${customDuration.unit}. Creators cannot claim payment if deleted early.`
                                            : projectDetails.postDuration === "custom"
                                                ? "Specify custom duration above. Creators cannot claim payment if deleted early."
                                                : `Minimum time posts must stay live: ${projectDetails.postDuration === "6"
                                                    ? "6 hours"
                                                    : projectDetails.postDuration === "12"
                                                        ? "12 hours"
                                                        : projectDetails.postDuration === "24"
                                                            ? "24 hours"
                                                            : projectDetails.postDuration === "48"
                                                                ? "48 hours"
                                                                : projectDetails.postDuration === "72"
                                                                    ? "72 hours"
                                                                    : projectDetails.postDuration === "168"
                                                                        ? "1 week"
                                                                        : "24 hours"
                                                }. Creators cannot claim payment if deleted early.`}
                                    </p>
                                </div>

                                {promotionType === "open" ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="total-budget" className="text-white/80 text-sm">
                                                Total Budget
                                            </Label>
                                            <Input
                                                id="total-budget"
                                                placeholder="$1000"
                                                value={projectDetails.totalBudget}
                                                onChange={(e) => setProjectDetails((prev) => ({ ...prev, totalBudget: e.target.value }))}
                                                className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 h-11 mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="price-per-post" className="text-white/80 text-sm">
                                                Price Per Post
                                            </Label>
                                            <Input
                                                id="price-per-post"
                                                placeholder="$50"
                                                value={projectDetails.pricePerPost}
                                                onChange={(e) => setProjectDetails((prev) => ({ ...prev, pricePerPost: e.target.value }))}
                                                className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 h-11 mt-1"
                                            />
                                            {projectDetails.totalBudget && projectDetails.pricePerPost && (
                                                <p className="text-xs text-white/60 mt-1">
                                                    ~
                                                    {Math.floor(
                                                        (Number.parseFloat(projectDetails.totalBudget) || 0) /
                                                        (Number.parseFloat(projectDetails.pricePerPost) || 1),
                                                    )}{" "}
                                                    posts available
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <Label htmlFor="budget" className="text-white/80 text-sm">
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
                                            className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 h-11 mt-1"
                                            readOnly={selectedCreators.length > 0 && selectedUsers.length === 0}
                                        />
                                        {selectedUsers.length > 0 && projectDetails.budget && (
                                            <div className="mt-2 space-y-1">
                                                <p className="text-xs text-white/60">
                                                    $
                                                    {Math.round(
                                                        Number.parseInt(projectDetails.budget.replace(/[^0-9]/g, "")) / selectedUsers.length,
                                                    )}{" "}
                                                    per unverified creator
                                                </p>
                                                {Number.parseInt(projectDetails.budget.replace(/[^0-9]/g, "")) / selectedUsers.length < 50 && (
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
                                            <div className="mt-2 p-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/10">
                                                <p className="text-xs text-white/80 font-medium mb-1">Budget Breakdown:</p>
                                                <div className="text-xs text-white/60 space-y-1">
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
                                                    <div className="flex justify-between font-medium text-white border-t border-white/20 pt-1">
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
                                )}

                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-12 text-white font-medium active:scale-[0.98] transition-all border-0"
                                    disabled={
                                        !projectDetails.name ||
                                        (promotionType === "open" && (!projectDetails.totalBudget || !projectDetails.pricePerPost)) ||
                                        (promotionType === "targeted" && selectedCreators.length === 0 && selectedUsers.length === 0)
                                    }
                                >
                                    {promotionType === "open"
                                        ? `${isApproved ? "Launch Open Promotion" : "Approve USDC"} - ${projectDetails.totalBudget || "$0"}`
                                        : selectedCreators.length > 0 || selectedUsers.length > 0
                                            ? `Book ${selectedCreators.length + selectedUsers.length} Creator${selectedCreators.length + selectedUsers.length > 1 ? "s" : ""} - $${totalSpend.total}`
                                            : "Select Creators"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Creator Selection - Mobile First */}
                {promotionType === "targeted" && (
                    <div className="w-full">
                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
                                <Input
                                    id="search"
                                    placeholder="Search any user..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="pl-10 bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 h-12 rounded-xl"
                                />
                            </div>

                            {showSearchResults && (
                                <Card className="mt-2 bg-white/10 backdrop-blur-sm border-white/20">
                                    <CardContent className="p-3">
                                        <div className="space-y-2">
                                            {searchResults
                                                .filter(
                                                    (user: any) =>
                                                        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                        user.handle.toLowerCase().includes(searchQuery.toLowerCase()),
                                                )
                                                .map((user: any) => (
                                                    <div
                                                        key={user.id}
                                                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 cursor-pointer transition-colors active:scale-[0.98]"
                                                        onClick={() => selectUser(user)}
                                                    >
                                                        <Avatar className="w-10 h-10">
                                                            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                                                            <AvatarFallback className="bg-white/20 text-white text-sm">
                                                                {user.name
                                                                    .split(" ")
                                                                    .map((n) => n[0])
                                                                    .join("")}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-white truncate">{user.name}</p>
                                                            <p className="text-sm text-white/60 truncate">
                                                                {user.handle} • {user.followers}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                variant="outline"
                                                                className="text-orange-400 border-orange-400/50 text-xs bg-orange-400/10"
                                                            >
                                                                Request
                                                            </Badge>
                                                            <Plus className="w-4 h-4 text-white/40" />
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {(selectedCreators.length > 0 || selectedUsers.length > 0) && (
                            <Card className="mb-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm border-purple-400/30">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-purple-300">
                                            Selected ({selectedCreators.length + selectedUsers.length})
                                        </h3>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-green-400">${totalSpend.total}</div>
                                            <div className="text-xs text-white/60">Total spend</div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {selectedCreators.map((creatorId) => {
                                            const creator: any = creators.find((c: any) => c.id === creatorId)
                                            return creator ? (
                                                <div
                                                    key={creatorId}
                                                    className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-lg p-2"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="w-6 h-6">
                                                            <AvatarImage src={creator.avatar || "/placeholder.svg"} alt={creator.name} />
                                                            <AvatarFallback className="bg-white/20 text-white text-xs">
                                                                {creator.name
                                                                    .split(" ")
                                                                    .map((n) => n[0])
                                                                    .join("")}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm text-white">{creator.name}</span>
                                                        <Badge
                                                            variant="secondary"
                                                            className="bg-green-500/20 text-green-400 border-green-400/30 text-xs"
                                                        >
                                                            ${creator.price}
                                                        </Badge>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeSelectedCreator(creatorId)}
                                                        className="text-white/60 hover:text-red-400 p-1 h-6 w-6"
                                                    >
                                                        ×
                                                    </Button>
                                                </div>
                                            ) : null
                                        })}

                                        {selectedUsers.map((user) => (
                                            <div
                                                key={user.id}
                                                className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-lg p-2"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="w-6 h-6">
                                                        <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                                                        <AvatarFallback className="bg-white/20 text-white text-xs">
                                                            {user.name
                                                                .split(" ")
                                                                .map((n: string) => n[0])
                                                                .join("")}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm text-white">{user.name}</span>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-orange-400 border-orange-400/50 bg-orange-400/10 text-xs"
                                                    >
                                                        {totalSpend.unverifiedTotal > 0
                                                            ? `$${Math.round(totalSpend.unverifiedTotal / selectedUsers.length)}`
                                                            : "TBD"}
                                                    </Badge>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeSelectedUser(user.id)}
                                                    className="text-white/60 hover:text-red-400 p-1 h-6 w-6"
                                                >
                                                    ×
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        {
                            creators.length > 0 && (
                                <div className="mb-4">
                                    <h2 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-purple-400" />
                                        Verified Creators
                                    </h2>
                                    <div className="space-y-3">
                                        {creators.map((creator: any) => (
                                            <Card
                                                key={creator.id}
                                                className={`cursor-pointer transition-all hover:shadow-lg bg-white/10 backdrop-blur-sm border-white/20 active:scale-[0.98] ${selectedCreators.includes(creator.id) ? "ring-2 ring-purple-400/50 bg-white/15" : ""
                                                    }`}
                                                onClick={() => toggleCreator(creator.id)}
                                            >
                                                <CardContent className="p-3">
                                                    <div className="flex items-center gap-3">
                                                        {/* Checkbox */}
                                                        <div
                                                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedCreators.includes(creator.id)
                                                                ? "bg-purple-500 border-purple-500"
                                                                : "border-white/30"
                                                                }`}
                                                        >
                                                            {selectedCreators.includes(creator.id) && <Check className="w-2.5 h-2.5 text-white" />}
                                                        </div>

                                                        {/* Avatar */}
                                                        <Avatar className="w-10 h-10 flex-shrink-0">
                                                            <AvatarImage src={creator.avatar || "/placeholder.svg"} alt={creator.name} />
                                                            <AvatarFallback className="bg-white/20 text-white text-sm">
                                                                {creator.name
                                                                    .split(" ")
                                                                    .map((n) => n[0])
                                                                    .join("")}
                                                            </AvatarFallback>
                                                        </Avatar>

                                                        {/* Creator info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h3 className="font-semibold text-white text-sm truncate">{creator.name}</h3>
                                                                <div className="flex items-center gap-1">
                                                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                                                    <span className="text-xs text-white/60">{creator.rating}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs text-white/60">
                                                                <span>{creator.followers} followers</span>
                                                                <span>{creator.engagement} engagement</span>
                                                            </div>
                                                        </div>

                                                        {/* Price badge */}
                                                        <div className="flex-shrink-0">
                                                            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-full px-3 py-1">
                                                                <span className="text-sm font-semibold text-green-400">${creator.price}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )
                        }
                    </div>
                )}
            </div>
        </div>
    )
}
