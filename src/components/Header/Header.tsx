import { useState, useMemo } from "react";
import { BarChart3, Plus, DollarSign, Loader2 } from "lucide-react";
import { useFrameContext } from "@/providers/FrameProvider";
import { useData } from "@/providers/DataProvider";
import CastCard from "@/components/CastCard/CastCard";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import useAxios from "@/hooks/useAxios";

/**
 * Header component used across the application
 * Provides consistent branding and navigation with user avatar drawer
 */
export default function Header() {
  const { fUser, isFrameAdded, handleAddFrame } = useFrameContext();
  const { claims, refetchClaims, claimsLoading, promoterEarnings } = useData();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "completed">(
    "pending"
  );
  const axios = useAxios();

  const completedPromotions = useMemo(() => {
    if (activeTab === "completed") {
      return claims?.filter((p) => {
        return p.claimed;
      });
    } else if (activeTab === "pending") {
      return claims?.filter((p) => {
        return !p.claimed;
      });
    }
    return claims;
  }, [claims, fUser, activeTab]);

  const processingPromotions = useMemo(() => {
    return (
      claims?.filter((p) => {
        return p.unprocessed_intents && parseInt(p.unprocessed_intents) > 0;
      }) || []
    );
  }, [claims]);

  const handleAvatarClick = () => {
    setIsDrawerOpen(true);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/hypeman.png"
            alt="Hypeman Logo"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <h1 className="text-lg font-semibold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent title">
            HYPEMAN
          </h1>
        </div>
        <div className="flex items-center justify-center gap-x-2">
          {!isFrameAdded && (
            <button
              onClick={async () => {
                try {
                  await handleAddFrame();
                  await axios?.post("/api/add_frame_notification", {});
                } catch (e: any) {
                  console.error("Error adding frame:", e);
                }
              }}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white/90 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-400/30 hover:border-pink-400/50 transition-all duration-500 group overflow-hidden backdrop-blur-sm hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105"
            >
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              <div className="relative z-10 w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center group-hover:rotate-90 transition-transform duration-500">
                <Plus className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="relative z-10 bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent group-hover:from-purple-200 group-hover:to-pink-200 transition-all duration-300">
                Add Hypeman
              </span>
            </button>
          )}

          <button
            onClick={handleAvatarClick}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-purple-600 p-0.5 hover:scale-105 transition-transform duration-300 cursor-pointer"
          >
            {completedPromotions &&
            completedPromotions?.length > 0 &&
            fUser?.fid ? (
              <div className="w-full h-full rounded-full flex items-center justify-center">
                <DollarSign
                  className={`w-4 h-4 text-white font-bold ${
                    processingPromotions.length > 0 ? "animate-pulse" : ""
                  }`}
                />
              </div>
            ) : (
              <img
                src={fUser?.pfpUrl || "/placeholder.svg"}
                alt={fUser?.username}
                className="w-full h-full rounded-full object-cover"
              />
            )}
          </button>
        </div>
      </header>

      {/* Completed Promotions Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="bg-black border-white/10">
          <DrawerHeader>
            <DrawerTitle className="text-center">
              <div className="text-gray-300 text-xs uppercase tracking-wider mb-2">
                All Time Earnings
              </div>
              <div className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                ${promoterEarnings}
              </div>
            </DrawerTitle>
            <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1 backdrop-blur-sm border border-white/10">
              <button
                onClick={() => setActiveTab("pending")}
                className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 ${
                  activeTab === "pending"
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                    : "text-white/60 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-300 ${
                  activeTab === "completed"
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                    : "text-white/60 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                Completed
              </button>
            </div>
          </DrawerHeader>

          {claimsLoading ? (
            <div className="text-center py-12 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Loader2 className="w-8 h-8 text-white animate-spin absolute" />
              </div>
              <span className="text-xl font-bold text-white">
                Loading Claims
              </span>
            </div>
          ) : (
            <div className="px-4 pb-4 max-h-[60vh] overflow-y-auto space-y-4">
              {completedPromotions && completedPromotions?.length > 0 ? (
                completedPromotions?.map((cast) => (
                  <CastCard
                    key={cast.id}
                    promotion={cast}
                    promotionContent={cast.cast_data?.text || ""}
                    promotionAuthor={cast.cast_data?.author?.username || ""}
                    promotionEmmbedContext={cast.cast_data?.embeds || []}
                    refetchPromotion={refetchClaims}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    No Claims Yet
                  </h3>
                  <p className="text-white/60 max-w-sm mx-auto leading-relaxed">
                    Your completed promotions and earnings will appear here.
                  </p>
                </div>
              )}
            </div>
          )}
          <DrawerFooter className="border-t border-white/10">
            <DrawerClose asChild>
              <Button
                variant="outline"
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                Close
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

//<DrawerDescription className="text-center text-white/60">
//  View your completed promotions and earnings
//</DrawerDescription>
