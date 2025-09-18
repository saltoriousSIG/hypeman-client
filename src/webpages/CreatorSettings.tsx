import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Save, DollarSign, User, CheckCircle, Star } from "lucide-react"
import { NavLink } from "react-router-dom"

export default function CreatorSettingsPage() {
    const [isVerifiedPromoter, setIsVerifiedPromoter] = useState(false)

    const [settings, setSettings] = useState({
        pricePerPost: 299,
        autoApprove: false,
        voiceStyle: "casual",
        contentGuidelines:
            "I prefer authentic, conversational posts that highlight genuine value. No overly promotional language.",
    })

    const handleSave = () => {
        console.log("Saving settings:", settings)
        // Handle save logic
    }

    const handleVerificationSignup = () => {
        console.log("Starting verification process")
        // Handle verification signup logic
    }

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-20 left-8 w-16 h-16 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute top-40 right-12 w-12 h-12 bg-green-400/30 rounded-full blur-lg animate-bounce"></div>
                <div className="absolute bottom-40 right-8 w-20 h-20 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute top-80 right-20 w-10 h-10 bg-cyan-400/30 rounded-full blur-lg"></div>
            </div>

            <header className="relative z-10 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <NavLink to="/">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                            <ArrowLeft className="w-4 h-4 text-white/60" />
                        </div>
                    </NavLink>
                    <div className="flex items-center gap-2">
                        <img src="/hypeman-logo.png" alt="Hypeman Logo" width={32} height={32} className="rounded-lg" />
                        <h1 className="text-lg font-semibold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent">
                            Settings
                        </h1>
                    </div>
                </div>
                <Button
                    onClick={handleSave}
                    size="sm"
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-xs px-4 border-0"
                >
                    <Save className="w-3 h-3 mr-1" />
                    Save
                </Button>
            </header>

            <div className="px-4 space-y-4 relative z-10">
                {isVerifiedPromoter ? (
                    /* Profile Section - Only for verified promoters */
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 p-1">
                                <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                                    <User className="w-6 h-6 text-white/80" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">@alex_crypto</h2>
                                <p className="text-sm text-white/60">Creator Profile</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="price-per-post" className="text-sm font-medium text-white/80 mb-2 block">
                                    Price per Post
                                </Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
                                    <Input
                                        id="price-per-post"
                                        type="number"
                                        value={settings.pricePerPost}
                                        onChange={(e) =>
                                            setSettings((prev) => ({ ...prev, pricePerPost: Number.parseInt(e.target.value) }))
                                        }
                                        className="bg-white/10 backdrop-blur-sm border-white/20 text-white h-11 pl-10 focus:ring-purple-500/50 focus:border-purple-500/50"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="voice-style" className="text-sm font-medium text-white/80 mb-2 block">
                                    Voice Style
                                </Label>
                                <Input
                                    id="voice-style"
                                    value={settings.voiceStyle}
                                    onChange={(e) => setSettings((prev) => ({ ...prev, voiceStyle: e.target.value }))}
                                    placeholder="e.g., casual, professional, enthusiastic"
                                    className="bg-white/10 backdrop-blur-sm border-white/20 text-white h-11 placeholder:text-white/50 focus:ring-purple-500/50 focus:border-purple-500/50"
                                />
                            </div>

                            <div>
                                <Label htmlFor="content-guidelines" className="text-sm font-medium text-white/80 mb-2 block">
                                    Content Guidelines
                                </Label>
                                <Textarea
                                    id="content-guidelines"
                                    rows={3}
                                    value={settings.contentGuidelines}
                                    onChange={(e) => setSettings((prev) => ({ ...prev, contentGuidelines: e.target.value }))}
                                    placeholder="Describe your preferred tone and style..."
                                    className="bg-white/10 backdrop-blur-sm border-white/20 text-white resize-none placeholder:text-white/50 focus:ring-purple-500/50 focus:border-purple-500/50"
                                />
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <div>
                                    <Label htmlFor="auto-approve" className="text-sm font-medium text-white/80">
                                        Auto-approve posts
                                    </Label>
                                    <p className="text-xs text-white/60 mt-1">Automatically approve content that meets your guidelines</p>
                                </div>
                                <Switch
                                    id="auto-approve"
                                    checked={settings.autoApprove}
                                    onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, autoApprove: checked }))}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Verification CTA - For non-verified users */
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/10 text-center">
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 p-1">
                                <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                                    <Star className="w-8 h-8 text-white/80" />
                                </div>
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-3">Become a Verified Promoter</h2>
                        <p className="text-white/70 mb-6 max-w-md mx-auto">
                            Get verified to set your rates, customize your profile, and unlock premium features on Hypeman.
                        </p>

                        <div className="space-y-3 mb-8">
                            <div className="flex items-center gap-3 text-left">
                                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                                <span className="text-white/80">Set your own price per post</span>
                            </div>
                            <div className="flex items-center gap-3 text-left">
                                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                                <span className="text-white/80">Customize your voice and style</span>
                            </div>
                            <div className="flex items-center gap-3 text-left">
                                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                                <span className="text-white/80">Auto-approve trusted content</span>
                            </div>
                            <div className="flex items-center gap-3 text-left">
                                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                                <span className="text-white/80">Priority access to campaigns</span>
                            </div>
                        </div>

                        <Button
                            onClick={handleVerificationSignup}
                            size="lg"
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 text-base font-semibold border-0"
                        >
                            Apply for Verification
                        </Button>

                        <p className="text-xs text-white/50 mt-4">Verification typically takes 1-2 business days</p>
                    </div>
                )}
            </div>
        </div>
    )
}
