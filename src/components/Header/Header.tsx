import { useState, useMemo } from "react"
import { BarChart3 } from "lucide-react"
import { useFrameContext } from "@/providers/FrameProvider"
import { useData } from "@/providers/DataProvider"
import useGetPostPricing from "@/hooks/useGetPostPricing"
import CastCard from "@/components/CastCard/CastCard"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"

/**
 * Header component used across the application
 * Provides consistent branding and navigation with user avatar drawer
 */
export default function Header() {
    const { fUser } = useFrameContext()
    const { promotions } = useData()
    const pricing = useGetPostPricing()
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    console.log(promotions);

    const completedPromotions = useMemo(() => {
        return promotions?.filter((p) => {
            return p.claimable
        }) || []
    }, [promotions])

    const handleAvatarClick = () => {
        setIsDrawerOpen(true)
    }

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <img
                        src="/hypeman-logo.png"
                        alt="Hypeman Logo"
                        width={32}
                        height={32}
                        className="rounded-lg"
                    />
                    <h1 className="text-lg font-semibold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent title">
                        HYPEMAN
                    </h1>
                </div>
                <button
                    onClick={handleAvatarClick}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-purple-600 p-0.5 hover:scale-105 transition-transform duration-300 cursor-pointer"
                >
                    <img
                        src={fUser?.pfpUrl || "/placeholder.svg"}
                        alt={fUser?.username}
                        className="w-full h-full rounded-full object-cover"
                    />
                </button>
            </header>

            {/* Completed Promotions Drawer */}
            <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <DrawerContent className="bg-black border-white/10">
                    <DrawerHeader>
                        <DrawerTitle className="text-center text-white">Your Claims</DrawerTitle>
                        <DrawerDescription className="text-center text-white/60">
                            View your completed promotions and earnings
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="px-4 pb-4 max-h-[60vh] overflow-y-auto space-y-4">
                        {completedPromotions.length > 0 ? (
                            completedPromotions.map((cast) => (
                                <CastCard
                                    key={cast.id}
                                    promotion={cast}
                                    cast_text={"dummy"}
                                    pricing={pricing}
                                    promotionContent={cast.cast_data?.text || ""}
                                    promotionAuthor={cast.cast_data?.author?.username || ""}
                                    promotionEmmbedContext={cast.cast_data?.embeds || []}
                                />
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <BarChart3 className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">No Claims Yet</h3>
                                <p className="text-white/60 max-w-sm mx-auto leading-relaxed">
                                    Your completed promotions and earnings will appear here.
                                </p>
                            </div>
                        )}
                    </div>
                    <DrawerFooter className="border-t border-white/10">
                        <DrawerClose asChild>
                            <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                                Close
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </>
    )
}

