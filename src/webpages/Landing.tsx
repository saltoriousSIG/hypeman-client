import { useState, useEffect } from "react"
import { Settings, BarChart3 } from "lucide-react"
import { NavLink } from "react-router-dom";
import { useFrameContext } from "@/providers/FrameProvider";
import CastCard from "@/components/CastCard/CastCard";
import axios from "axios";
import CompletedCard from "@/components/CompletedCard/CompletedCard";
import LoginModal from "@/components/LoginModal/LoginModal";
import Footer from "@/components/Footer/Footer";
import useGetPostPricing from "@/hooks/useGetPostPricing";


export default function HomePage() {
    const { fUser } = useFrameContext();

    const [activeTab, setActiveTab] = useState<"active" | "completed">("active")
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [showLoginModal, setShowLoginModal] = useState(false)
    const [signerApprovalUrl, setSignerApprovalUrl] = useState<string>();

    const pricing = useGetPostPricing();

    const handleShowLoginModal = (state: boolean) => {
        setShowLoginModal(state);
    }

    const readyToPostCasts = [
        {
            id: 1,
            aiGeneratedText:
                "Just discovered this insane new DeFi protocol that's about to change everything! 🚀 The yield farming opportunities are absolutely wild - we're talking potential 200%+ APY. Early access starts tomorrow and I'm already locked and loaded. Who else is ready to ride this wave? #DeFi #CryptoGains #YieldFarming",
            budget: 250,
            category: "Crypto",
            engagement: "High",
            views: "12.5K",
        },
        {
            id: 2,
            aiGeneratedText:
                "Okay this NFT drop is actually fire 🔥 The art style is giving me major BAYC vibes but with a fresh twist. Mint starts in 6 hours and I'm setting my alarms. The roadmap looks solid and the team has serious credentials. Don't sleep on this one! #NFT #Mint #DigitalArt",
            budget: 150,
            category: "NFT",
            engagement: "Medium",
            views: "8.2K",
        },
        {
            id: 3,
            aiGeneratedText:
                "MASSIVE gaming tournament alert! 🎮 $50k prize pool, top streamers competing, and the gameplay is absolutely insane. I'll be streaming my reactions live - this is going to be legendary. Mark your calendars because this is THE event of the year! #Gaming #Esports #Tournament",
            budget: 300,
            category: "Gaming",
            engagement: "High",
            views: "15.7K",
        },
    ]

    const completedPromotions = [
        {
            id: 101,
            text: "This new AI trading bot is absolutely crushing it! 🤖 Made 15% gains in just 2 days. The algorithm is next level and the team behind it has serious credentials. Early access ends soon! #AI #Trading #Crypto",
            category: "Crypto",
            earned: 180,
            postedAt: "2 days ago",
            status: "claimable", // claimable, claimed, pending
            engagement: "2.1K likes, 340 recasts",
            minTimeRemaining: null,
        },
        {
            id: 102,
            text: "Just minted from this incredible NFT collection and WOW! 🎨 The artwork is stunning and the utility roadmap is insane. Floor price already pumping. This is going to be huge! #NFT #Art #Web3",
            category: "NFT",
            earned: 120,
            postedAt: "5 days ago",
            status: "claimed",
            engagement: "1.8K likes, 290 recasts",
            minTimeRemaining: null,
        },
        {
            id: 103,
            text: "This gaming platform is revolutionizing how we play! 🎮 Earn real rewards while gaming, incredible graphics, and the community is amazing. Beta access is live now! #Gaming #P2E #Web3",
            category: "Gaming",
            earned: 95,
            postedAt: "1 week ago",
            status: "pending",
            engagement: "1.2K likes, 180 recasts",
            minTimeRemaining: "6h remaining",
        },
    ]

    useEffect(() => {
        if (!fUser) return;
        const load = async () => {
            try {
                const { data } = await axios.post(`/api/get_signer`, {
                    u_fid: fUser.fid
                });
                if (data.status !== "approved") {
                    setIsAuthenticated(false);
                } else {
                    setIsAuthenticated(true);
                }
                setSignerApprovalUrl(data.signer_approval_url);
            } catch (e: any) {
                throw new Error(e.message);
            }

        }
        load();
    }, [fUser]);

    return (
        <div className="min-h-screen bg-black text-white pb-20 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-20 left-8 w-20 h-20 bg-purple-500/30 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute top-40 right-12 w-16 h-16 bg-green-400/40 rounded-full blur-lg animate-bounce"></div>
                <div className="absolute top-60 left-16 w-12 h-12 bg-yellow-400/50 rounded-full blur-md animate-pulse"></div>
                <div className="absolute bottom-40 right-8 w-24 h-24 bg-blue-500/25 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute bottom-60 left-12 w-8 h-8 bg-pink-400/60 rounded-full blur-sm animate-bounce"></div>
                <div className="absolute top-80 right-20 w-14 h-14 bg-cyan-400/35 rounded-full blur-lg animate-pulse"></div>
                <div className="absolute top-32 right-32 w-6 h-6 bg-white/40 rounded-full blur-sm"></div>
                <div className="absolute bottom-32 left-32 w-10 h-10 bg-purple-400/30 rounded-full blur-md animate-bounce"></div>
                <div className="absolute top-96 left-6 w-4 h-4 bg-green-300/50 rounded-full blur-sm"></div>
            </div>

            <header className="relative z-10 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <img src="/hypeman-logo.png" alt="Hypeman Logo" width={32} height={32} className="rounded-lg" />
                    <h1 className="text-lg font-semibold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent title">
                        HYPEMAN
                    </h1>
                </div>
                <NavLink to="/creators/settings">
                    <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-300">
                        <Settings className="w-4 h-4 text-white/60" />
                    </button>
                </NavLink>
            </header>

            <div className="px-4 space-y-4 relative z-10">
                {activeTab === "active" && (
                    <div className="text-center mb-8">
                        <div className="relative inline-block mb-4">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-purple-600 p-1 mx-auto">
                                <img
                                    src={fUser?.pfpUrl || "/placeholder.svg"}
                                    alt={fUser?.username}
                                    width={88}
                                    height={88}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">@{fUser?.username}</h2>
                        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500/20 to-green-400/20 text-green-400 px-6 py-2 rounded-full text-sm font-semibold border border-green-400/20">
                            ${1000} earned
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2 mb-6 bg-white/5 rounded-2xl p-1 backdrop-blur-sm border border-white/10">
                    <button
                        onClick={() => setActiveTab("active")}
                        className={`flex-1 py-4 px-6 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === "active"
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                            : "text-white/60 hover:text-white/80 hover:bg-white/5"
                            }`}
                    >
                        Available
                    </button>
                    <button
                        onClick={() => setActiveTab("completed")}
                        className={`flex-1 py-4 px-6 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === "completed"
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                            : "text-white/60 hover:text-white/80 hover:bg-white/5"
                            }`}
                    >
                        History
                    </button>
                </div>

                {activeTab === "active" ? (
                    readyToPostCasts.map((cast) => {
                        return (
                            <CastCard key={cast.id} cast={cast} handleShowLoginModal={handleShowLoginModal} isAuthenticated={isAuthenticated} pricing={pricing} />
                        )
                    })
                ) : (
                    <div className="space-y-4">
                        {completedPromotions.map((promotion) => (
                            <CompletedCard promotion={promotion} />
                        ))}

                        {completedPromotions.length === 0 && (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <BarChart3 className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">No History Yet</h3>
                                <p className="text-white/60 max-w-sm mx-auto leading-relaxed">
                                    Your completed promotions and earnings will appear here.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <LoginModal signerApprovalUrl={signerApprovalUrl} showLoginModal={showLoginModal} handleShowLoginModal={handleShowLoginModal} />

            <Footer />
        </div>
    )
}
