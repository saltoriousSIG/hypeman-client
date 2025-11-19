import { useContext, createContext, useEffect } from "react";
import useAxios from "@/hooks/useAxios";
import { useQuery } from "@tanstack/react-query";
import { Promotion } from "@/types/promotion.type";
import useContract, { ExecutionType } from "@/hooks/useContract";
import { useFrameContext } from "./FrameProvider";
import { formatUnits } from "viem";

interface DataContextValue {
  promotions?: Array<
    Promotion & {
      claimable: boolean;
      display_to_promoters: boolean;
      cast_data?: {
        text: string;
        embeds: any[];
        author: {
          username: string;
        };
      };
    }
  >;
  claims?: Array<
    Promotion & {
      current_user_intent: any;
      claimed: boolean;
    }
  >;
  claimsLoading: boolean;
  promoterEarnings?: string;
  promoterPromotions?: Array<
    Promotion & {
      claimable: boolean;
      display_to_promoters: boolean;
      cast_data?: {
        text: string;
        embeds: any[];
        author: {
          username: string;
        };
      };
    }
  >;
  promoterPromotionsLoading?: boolean;
  platformFee?: number;
  refetchPromotions: () => Promise<any>;
  refetchClaims: () => Promise<any>;
  loading?: boolean;
  error: any;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useEvents must be used within an EventsProvider");
  }
  return context;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const axios = useAxios();
  const { address } = useFrameContext();

  const getPlatformFee = useContract(
    ExecutionType.READABLE,
    "Data",
    "getPlatformFee"
  );

  const getAlltimeEarnings = useContract(
    ExecutionType.READABLE,
    "Data",
    "getAmountEarnedByPromoter"
  );

  const {
    data: promotions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["promotions", axios],
    queryFn: async () => {
      if (!axios) return [];
      const {
        data: { promotions },
      } = await axios.get<{
        promotions: Array<
          Promotion & {
            claimable: boolean;
            display_to_promoters: boolean;
            cast_data?: {
              text: string;
              embeds: any[];
              author: {
                username: string;
              };
            };
          }
        >;
      }>("/api/fetch_feed");
      return promotions.filter((p) => {
        return p.display_to_promoters && !p.claimable;
      });
    },
    enabled: !!axios,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  const { data: promoterEarnings, isLoading: isPromoterEarningsLoading } = useQuery({
    queryKey: ["promoterEarnings", address],
    queryFn: async () => {
      if (!address) return "0";
      const earnings = await getAlltimeEarnings([address]);
      return parseFloat(formatUnits(earnings, 6)).toFixed(2);
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  const { data: platformFee, isLoading: isPlatformFeeLoading } = useQuery({
    queryKey: ["platformFee"],
    queryFn: async () => {
      const fee = await getPlatformFee([]);
      return parseInt(fee.toString()) / 10000;
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  const { data: claims, isPending: isClaimsLoading, refetch: refetchClaims } = useQuery({
    queryKey: ["claims", axios],
    queryFn: async () => {
      if (!axios) return [];
      const { data } = await axios.get(`/api/fetch_claims`);
      console.log(data);
      return data.promotions
    },
    enabled: !!axios,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  useEffect(() => {
    if (!refetch) return;
    const signinEventHandler = () => {
      if (!promotions) {
        refetch();
        refetchClaims()
      }
    };
    window.addEventListener("fc-signin-success", signinEventHandler);
    return () => {
      window.removeEventListener("fc-signin-success", signinEventHandler);
    };
  }, [refetch, promotions]);

  const loading = isLoading || isPlatformFeeLoading;

  return (
    <DataContext.Provider
      value={{
        claims,
        refetchClaims,
        claimsLoading: isClaimsLoading,
        promotions,
        loading,
        platformFee,
        promoterEarnings,
        refetchPromotions: refetch,
        error,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
