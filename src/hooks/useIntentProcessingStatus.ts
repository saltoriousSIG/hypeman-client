import { useQuery } from "@tanstack/react-query";
import useContract, { ExecutionType } from "./useContract";

interface UseIntentProcessingStatusParams {
  promotionId: number;
  intentHash: string;
  enabled?: boolean;
}

/**
 * Custom hook to check if an intent has been processed
 * Uses React Query for caching, automatic refetching, and loading states
 * 
 * @param promotionId - The promotion ID
 * @param intentHash - The intent hash to check
 * @param enabled - Whether the query should be enabled (default: true)
 * @returns Query result with processing status, loading, and error states
 */
export function useIntentProcessingStatus({ 
  promotionId, 
  intentHash, 
  enabled = true 
}: UseIntentProcessingStatusParams) {
  const getIsIntentProcessed = useContract(
    ExecutionType.READABLE, 
    "Data", 
    "getIsIntentProcessed"
  );
  return useQuery({
    queryKey: ["intentProcessingStatus", promotionId, intentHash],
    queryFn: async () => {
      const processed = await getIsIntentProcessed([promotionId, intentHash]);
      return processed;
    },
    enabled: enabled && !!promotionId && !!intentHash,
    staleTime: 0, // Always consider data stale to get real-time updates
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchInterval: (data) => {
      // Stop refetching if intent is processed
      if (data === true) {
        return false;
      }
      // Refetch every 3 seconds while processing
      return 3000;
    },
    refetchIntervalInBackground: false, // Only refetch when tab is active
  });
}
