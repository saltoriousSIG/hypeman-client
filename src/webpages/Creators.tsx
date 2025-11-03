import { useEffect, useState, useCallback, useMemo } from "react";
import type { InfiniteData } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Quote, Loader2 } from "lucide-react";
import { toast } from "sonner";
import useContract, { ExecutionType } from "@/hooks/useContract";
import { USDC_ADDRESS, DIAMOND_ADDRESS } from "@/lib/utils";
import { useFrameContext } from "@/providers/FrameProvider";
import { parseUnits } from "viem";
import { pricing_tiers } from "@/lib/calculateUserScore";
import ShareModal from "@/components/ShareModal/ShareModal";
import MainLayout from "@/components/Layout/MainLayout";
import { Cast } from "@neynar/nodejs-sdk/build/api";
import sdk from "@farcaster/frame-sdk";
import CastListItem from "@/components/CastListItem/CastListItem";
import { useCastQuoteCount } from "@/hooks/useCastQuoteCount";
import { useUserCasts } from "@/hooks/useUserCasts";
import { useData } from "@/providers/DataProvider";
import useAxios from "@/hooks/useAxios";
import { DynamicPricing } from "@/components/DynamicPricing/DynamicPricing";
import { useQuery } from "@tanstack/react-query";

export default function BuyersPage() {
  const { address, fUser, isFrameAdded, handleAddFrame } = useFrameContext();

  const [selectedCast, setSelectedCast] = useState<Cast | null>(null);
  const [budget, setBudget] = useState<number>(0);
  const [basePrice, setBasePrice] = useState<number>(0);
  const [neynarScore, setNeynarScore] = useState<number>(0.5);
  const [proUser, setProUser] = useState<boolean>(false);
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerStep, setDrawerStep] = useState<1 | 2>(1);
  const [newPromotionId, setNewPromotionId] = useState<string | null>(null);

  const axios = useAxios();

  const { platformFee, refetchPromotions } = useData();

  const handleShowShareModal = (state: boolean) => setShowShareModal(state);

  // Fetch user casts with React Query infinite query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useUserCasts({
    fid: fUser?.fid ?? 0,
    enabled: !!fUser?.fid,
  });

  // Flatten all pages of casts into a single array
  const userCasts = useMemo(() => {
    const infiniteData = data as
      | InfiniteData<{ casts: Cast[]; next?: { cursor: string } }>
      | undefined;
    if (!infiniteData?.pages) return [];
    return infiniteData.pages.flatMap((page) => page.casts);
  }, [data]);

  const allowance = useContract(
    ExecutionType.READABLE,
    "ERC20",
    "allowance",
    USDC_ADDRESS
  );
  const approve = useContract(
    ExecutionType.WRITABLE,
    "ERC20",
    "approve",
    USDC_ADDRESS
  );
  const create_promotion = useContract(
    ExecutionType.WRITABLE,
    "Create",
    "createPromotion"
  );

  const { data: tierRates } = useQuery({
    queryKey: ["tier_rates", axios],
    queryFn: async () => {
      if (!axios) return {};
      const { data } = await axios.get("/api/fetch_fee_tier_rates");
      return data;
    },
    enabled: !!axios,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Check if budget is approved
  useEffect(() => {
    if (!platformFee) return;
    const load = async () => {
      if (!budget || !selectedCast) return;
      const user_allowance = await allowance([address, DIAMOND_ADDRESS]);
      const fee = budget * platformFee;
      const calculated_allowance = budget + fee;
      setIsApproved(
        parseInt(user_allowance.toString()) >=
          parseUnits(`${calculated_allowance}`, 6)
      );
    };
    load();
  }, [allowance, address, budget, selectedCast]);

  // Handle approve
  const handleApprove = useCallback(async () => {
    if (!platformFee) return;
    if (budget < pricing_tiers.tier1) {
      return toast.error(`Minimum budget is ${pricing_tiers.tier1} USDC`);
    }
    try {
      const fee = budget * platformFee;
      const calculated_allowance = budget + fee;
      await approve([
        DIAMOND_ADDRESS,
        parseUnits(`${calculated_allowance}`, 6),
      ]);
      setIsApproved(true);
      toast.success("Budget approved!");
    } catch (e: any) {
      console.error(e, e.message);
      toast.error("Approval failed");
    }
  }, [approve, budget, platformFee]);

  // Handle create promotion
  const handleCreatePromotion = useCallback(async () => {
    if (!fUser || !selectedCast) return;

    if (budget < pricing_tiers.tier1) {
      return toast.error(`Minimum budget is ${pricing_tiers.tier1} USDC`);
    }

    try {
      // Construct cast URL - use fUser's username if cast author is not available
      const username =
        selectedCast.author?.username || fUser?.username || "user";
      const castUrl = `https://farcaster.xyz/${username}/${selectedCast.hash}`;
      const createParams = {
        cast_url: castUrl,
        profile_mentions: selectedCast.mentioned_profiles.map(
          (pm: any) => pm.fid
        ),
        promoters: [],
        total_budget: parseUnits(budget.toString(), 6),
        token: USDC_ADDRESS,
        creator_fid: fUser.fid,
        creator: address,
        is_open_promotion: true,
        neynar_score: neynarScore,
        pro_user: proUser,
        base_rate: parseUnits(basePrice.toString(), 6),
      };

      const promotion_id = await create_promotion([createParams]);
      setNewPromotionId(promotion_id.toString());
      toast.success("Promotion created successfully!");
      handleShowShareModal(true);
      await refetchPromotions();

      if (!isFrameAdded) {
        try {
          await handleAddFrame();
          await axios?.post("/api/add_frame_notification", {});
        } catch (e) {
          console.error("Error adding frame:", e);
        }
      }

      // Reset state and close drawer
      setIsDrawerOpen(false);
      setSelectedCast(null);
      setBudget(10);
      setNeynarScore(0.5);
      setProUser(false);
      setIsApproved(false);
      setDrawerStep(1);
    } catch (e: any) {
      console.error(e, e.message);
      toast.error("Failed to create promotion");
    }
  }, [
    fUser,
    selectedCast,
    budget,
    neynarScore,
    proUser,
    create_promotion,
    address,
    basePrice,
  ]);

  // Handle selecting a cast to promote
  const handleSelectCast = (cast: Cast) => {
    setSelectedCast(cast);
    setIsApproved(false);
    setBudget(10);
    setNeynarScore(0.5);
    setProUser(false);
    setDrawerStep(1);
    setIsDrawerOpen(true);
  };

  // Handle drawer close
  const handleDrawerClose = (open: boolean) => {
    setIsDrawerOpen(open);
    if (!open) {
      // Reset state when drawer closes
      setTimeout(() => {
        setSelectedCast(null);
        setBudget(10);
        setNeynarScore(0.5);
        setProUser(false);
        setIsApproved(false);
        setDrawerStep(1);
      }, 300); // Wait for drawer animation
    }
  };

  // Handle viewing a cast in Farcaster client
  const handleViewCast = async (cast: Cast) => {
    try {
      await sdk.actions.viewCast({
        hash: cast.hash,
      });
    } catch (e: any) {
      console.error("Error viewing cast:", e);
      toast.error("Failed to open cast");
    }
  };

  // Handle load more with React Query
  const handleLoadMore = useCallback(async () => {
    if (hasNextPage && !isFetchingNextPage) {
      try {
        await fetchNextPage();
      } catch (e: any) {
        console.error("Error loading more casts:", e);
        toast.error("Failed to load more casts");
      }
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Use React Query for selected cast quote count in drawer
  const { data: selectedCastQuoteData } = useCastQuoteCount(
    selectedCast?.hash ?? "",
    !!selectedCast // Only fetch when a cast is selected
  );

  const total = budget * (1 + (platformFee || 0));

  return (
    <MainLayout className="pb-20 space-y-4">
      {isLoading ? (
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-purple-400" />
            <p className="text-white/60">Loading your casts...</p>
          </CardContent>
        </Card>
      ) : isError ? (
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-8 text-center">
            <p className="text-red-400">
              Failed to load casts. Please try again.
            </p>
          </CardContent>
        </Card>
      ) : userCasts.length === 0 ? (
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-8 text-center">
            <p className="text-white/60">
              No casts found. Create some casts first!
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {userCasts.map((cast: Cast) => (
              <CastListItem
                key={cast.hash}
                cast={cast}
                onPromote={handleSelectCast}
                onView={handleViewCast}
              />
            ))}
          </div>
          {/* Load More Button */}
          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                onClick={handleLoadMore}
                disabled={isFetchingNextPage}
                variant="outline"
                className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white transition-all min-w-[140px]"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Promotion Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={handleDrawerClose}>
        <DrawerContent className="bg-gradient-to-b from-gray-900 to-black border-t border-white/20">
          <DrawerHeader>
            <DrawerTitle className="text-white text-xl">
              {drawerStep === 1 ? "Target Audience" : "Set Budget"}
            </DrawerTitle>
            <DrawerDescription className="text-white/60">
              {drawerStep === 1
                ? "Define who can promote your cast"
                : "Set your total promotion budget"}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-0 space-y-4">
            {/* Selected cast preview */}
            {selectedCast && drawerStep === 1 && (
              <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                <p className="text-white/80 text-xs leading-relaxed mb-2 line-clamp-2">
                  {selectedCast.text}
                </p>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Quote className="w-3 h-3" />
                  <span>{selectedCastQuoteData?.quoteCount ?? 0} quotes</span>
                </div>
              </div>
            )}

            {/* Step 1: Audience Section */}
            {drawerStep === 1 && (
              <div className="space-y-6">
                {/* Neynar Score Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="neynar-score"
                      className="text-white/80 text-sm"
                    >
                      Minimum Neynar Score
                    </Label>
                    <div className="text-lg font-bold text-purple-400">
                      {neynarScore.toFixed(2)}
                    </div>

                    {/* Promote button - right */}
                    <Button
                      onClick={() => handleSelectCast(selectedCast as Cast)}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white text-xs font-semibold px-4 h-8 rounded-lg transition-all active:scale-[0.95] cursor-pointer shrink-0"
                    >
                      Promote
                    </Button>
                  </div>

                  <Slider
                    id="neynar-score"
                    min={0}
                    max={1}
                    step={0.01}
                    value={[neynarScore]}
                    onValueChange={(value) => setNeynarScore(value[0])}
                    className="w-full"
                  />

                  <div className="flex justify-between text-xs text-white/40">
                    <span>0.00</span>
                    <span>1.00</span>
                  </div>

                  <p className="text-xs text-white/60">
                    Higher scores target more active and reputable users
                  </p>
                </div>

                {/* Pro User Toggle */}
                <div className="flex items-center justify-between py-2 bg-white/5 rounded-lg px-4 border border-white/10">
                  <div className="space-y-1">
                    <Label
                      htmlFor="pro-user"
                      className="text-white/80 text-sm cursor-pointer"
                    >
                      Pro Users Only
                    </Label>
                    <p className="text-xs text-white/60">
                      Limit promotions to verified pro accounts
                    </p>
                  </div>
                  <Switch
                    id="pro-user"
                    checked={proUser}
                    onCheckedChange={setProUser}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Budget Section */}
            {drawerStep === 2 && (
              <DynamicPricing
                neynarScore={neynarScore}
                proUser={proUser}
                tierRates={tierRates || {}}
                setTotalBudget={(budget: number) => setBudget(budget)}
                setBasePrice={(price: number) => setBasePrice(price)}
              />
            )}
          </div>

          <DrawerFooter className="pt-2">
            {drawerStep === 1 ? (
              <>
                <Button
                  onClick={() => setDrawerStep(2)}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-12 text-white font-medium active:scale-[0.98] transition-all border-0"
                >
                  Next: Set Budget
                </Button>
                <DrawerClose asChild>
                  <Button
                    variant="outline"
                    className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10 h-12"
                  >
                    Cancel
                  </Button>
                </DrawerClose>
              </>
            ) : !isApproved ? (
              <>
                <Button
                  onClick={handleApprove}
                  disabled={budget < pricing_tiers.tier1}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-12 text-white font-medium active:scale-[0.98] transition-all border-0"
                >
                  Approve {(budget * 1.10).toFixed(2)} USDC
                </Button>
                <Button
                  onClick={() => setDrawerStep(1)}
                  variant="outline"
                  className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10 h-12"
                >
                  Back
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleCreatePromotion}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-12 text-white font-medium active:scale-[0.98] transition-all border-0"
                >
                  Create Promotion
                </Button>
                <Button
                  onClick={() => setDrawerStep(1)}
                  variant="outline"
                  className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10 h-12"
                >
                  Back
                </Button>
              </>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <ShareModal
        promotion_title=""
        promotion_id={newPromotionId || ""}
        promotion_description={selectedCast?.text || ""}
        showShareModal={showShareModal}
        handleShowShareModal={handleShowShareModal}
      />
    </MainLayout>
  );
}
