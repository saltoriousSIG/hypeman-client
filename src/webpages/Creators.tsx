import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ArrowLeft, History, Quote } from "lucide-react"
import { toast } from "sonner"
import { NavLink } from "react-router-dom"
import useContract, { ExecutionType } from "@/hooks/useContract"
import { USDC_ADDRESS, DIAMOND_ADDRESS } from "@/lib/utils"
import { useFrameContext } from "@/providers/FrameProvider"
import { parseUnits } from "viem"
import { pricing_tiers } from "@/lib/calculateUserScore";
import ShareModal from "@/components/ShareModal/ShareModal"
import Footer from "@/components/Footer/Footer"


// Mock creator data
const creators: any = []

// Mock search results for any user search
const searchResults: any = [];
type NeynarCast = {
    hash: string;
    text: string;
    author?: {
        username: string;
        display_name: string;
        pfp_url: string;
    };
    reactions: {
        likes_count: number;
        recasts_count: number;
    };
    replies: {
        count: number;
    };
    [key: string]: unknown;
}

export default function BuyersPage() {
    const { address, fUser, connectedUserData } = useFrameContext();

    const [selectedCast, setSelectedCast] = useState<NeynarCast | null>(null);
    const [budget, setBudget] = useState<number>(10);
    const [isApproved, setIsApproved] = useState<boolean>(false);
    const [showShareModal, setShowShareModal] = useState<boolean>(false);

    const handleShowShareModal = (state: boolean) => setShowShareModal(state);

    const allowance = useContract(ExecutionType.READABLE, "ERC20", "allowance", USDC_ADDRESS);
    const approve = useContract(ExecutionType.WRITABLE, "ERC20", "approve", USDC_ADDRESS);
    const create_promotion = useContract(ExecutionType.WRITABLE, "Create", "createPromotion");

    // Check if budget is approved
    useEffect(() => {
        const load = async () => {
            if (!budget || !selectedCast) return;
            const user_allowance = await allowance([address, DIAMOND_ADDRESS]);
            setIsApproved(parseInt(user_allowance.toString()) >= parseUnits(budget.toString(), 6));
        }
        load();
    }, [allowance, address, budget, selectedCast]);

    // Handle approve
    const handleApprove = useCallback(async () => {
        if (budget < pricing_tiers.tier1) {
            return toast.error(`Minimum budget is ${pricing_tiers.tier1} USDC`);
        }
        try {
            await approve([DIAMOND_ADDRESS, parseUnits(budget.toString(), 6)]);
            setIsApproved(true);
            toast.success("Budget approved!");
        } catch (e: any) {
            console.error(e, e.message);
            toast.error("Approval failed");
        }
    }, [approve, budget]);

    // Handle create promotion
    const handleCreatePromotion = useCallback(async () => {
        if (!fUser || !selectedCast) return;

        if (budget < pricing_tiers.tier1) {
            return toast.error(`Minimum budget is ${pricing_tiers.tier1} USDC`);
        }

        try {
            // Construct cast URL - use fUser's username if cast author is not available
            const username = selectedCast.author?.username || fUser?.username || 'user';
            const castUrl = `https://warpcast.com/${username}/${selectedCast.hash}`;

            const createParams = {
                name: "",
                description: selectedCast.text,
                project_url: "",
                cast_url: castUrl,
                profile_mentions: [],
                promoters: [],
                total_budget: parseUnits(budget.toString(), 6),
                token: USDC_ADDRESS,
                creator_fid: fUser.fid,
                creator: address,
                is_open_promotion: true,
            };

            await create_promotion([createParams]);
            toast.success("Promotion created successfully!");
            handleShowShareModal(true);

            // Reset state
            setSelectedCast(null);
            setBudget(10);
            setIsApproved(false);
        } catch (e: any) {
            console.error(e, e.message);
            toast.error("Failed to create promotion");
        }
    }, [fUser, selectedCast, budget, create_promotion, address]);

    // Handle selecting a cast to promote
    const handleSelectCast = (cast: NeynarCast) => {
        setSelectedCast(cast);
        setIsApproved(false);
        setBudget(10);
    };

    // Cancel promotion creation
    const handleCancel = () => {
        setSelectedCast(null);
        setBudget(10);
        setIsApproved(false);
    };

    const userCasts = connectedUserData?.casts || [];

    console.log(userCasts);

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
                        <h1 className="text-lg font-semibold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent title">
                            Promote Your Casts
                        </h1>
                        <p className="text-xs text-white/60 leading-tight">Select a cast to promote</p>
                    </div>
                </div>
                <NavLink to="/manage">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                        <History className="w-4 h-4 text-white/60" />
                    </div>
                </NavLink>
            </header>

            <div className="relative z-10 px-4 pb-20 space-y-4">
                {/* If no cast is selected, show the list of casts */}
                {!selectedCast && (
                    <>
                        {userCasts.length === 0 ? (
                            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                                <CardContent className="p-8 text-center">
                                    <p className="text-white/60">No casts found. Create some casts first!</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-2">
                                {userCasts.map((cast: NeynarCast) => (
                                    <div
                                        key={cast.hash}
                                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                {/* Username and date */}
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-white/80 text-sm font-medium">
                                                        @{cast.author?.username || fUser?.username || 'user'}
                                                    </span>
                                                    <span className="text-white/40 text-xs">
                                                        • {new Date((cast as any).timestamp || Date.now()).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                {/* Cast text */}
                                                <p className="text-white text-base leading-relaxed mb-3">
                                                    {cast.text}
                                                </p>

                                                {/* Engagement metrics */}
                                                <div className="flex items-center gap-4 text-sm">
                                                    <div className="flex items-center gap-1.5 text-cyan-400">
                                                        <Quote className="w-4 h-4" />
                                                        <span>{(cast as any).reactions?.quotes_count || 0}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Promote button */}
                                            <Button
                                                onClick={() => handleSelectCast(cast)}
                                                className="bg-white/10 hover:bg-purple-600 border border-white/20 hover:border-purple-600 text-white font-semibold px-8 h-10 rounded-full transition-all active:scale-[0.95] whitespace-nowrap cursor-pointer"
                                            >
                                                Promote
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* If a cast is selected, show the promotion form */}
                {selectedCast && (
                    <div className="space-y-4">
                        {/* Selected cast preview */}
                        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm border-purple-400/30">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-white text-base">
                                    Selected Cast
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <p className="text-white/80 text-sm leading-relaxed mb-3">
                                    {selectedCast.text}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-white/60">
                                    <div className="flex items-center gap-1">
                                        <Quote className="w-3.5 h-3.5" />
                                        <span>{(selectedCast as any).reactions?.quotes_count || 0}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Promotion details */}
                        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-white text-lg">Set Your Budget</CardTitle>
                                <CardDescription className="text-white/60 text-sm">
                                    Slide to set your promotion budget
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-4">
                                {/* Budget Slider */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="budget" className="text-white/80 text-sm">
                                            Total Budget (USDC)
                                        </Label>
                                        <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                            {budget} USDC
                                        </div>
                                    </div>

                                    <Slider
                                        id="budget"
                                        min={3}
                                        max={30}
                                        step={1}
                                        value={[budget]}
                                        onValueChange={(value) => setBudget(value[0])}
                                        className="w-full"
                                    />

                                    <div className="flex justify-between text-xs text-white/40">
                                        <span>3 USDC</span>
                                        <span>30 USDC</span>
                                    </div>

                                    {budget < pricing_tiers.tier1 && (
                                        <p className="text-amber-400 text-xs mt-2 flex items-center gap-1">
                                            ⚠️ Minimum recommended: {pricing_tiers.tier1} USDC
                                        </p>
                                    )}
                                    {budget >= pricing_tiers.tier1 && (
                                        <p className="text-xs text-green-400 mt-2">
                                            ✓ ~{Math.floor(budget / 1.5)} posts available
                                        </p>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-3 pt-2">
                                    <Button
                                        onClick={handleCancel}
                                        variant="outline"
                                        className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 h-11"
                                    >
                                        Cancel
                                    </Button>

                                    {!isApproved ? (
                                        <Button
                                            onClick={handleApprove}
                                            disabled={budget < pricing_tiers.tier1}
                                            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-11 text-white font-medium active:scale-[0.98] transition-all border-0"
                                        >
                                            Approve {budget} USDC
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={handleCreatePromotion}
                                            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-11 text-white font-medium active:scale-[0.98] transition-all border-0"
                                        >
                                            Create Promotion
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            <ShareModal
                promotion_title=""
                promotion_descripton={selectedCast?.text || ""}
                showShareModal={showShareModal}
                handleShowShareModal={handleShowShareModal}
            />
            <Footer />
        </div>
    );
}
