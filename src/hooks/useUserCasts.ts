import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";
import { Cast } from "@neynar/nodejs-sdk/build/api";

interface FetchUserCastsResponse {
  casts: Cast[];
  next?: {
    cursor: string;
  };
}

interface UseUserCastsParams {
  fid: number;
  enabled?: boolean;
}

/**
 * Hook to fetch user casts with infinite scroll/pagination support
 * @param fid - Farcaster ID of the user
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useUserCasts({ fid, enabled = true }: UseUserCastsParams) {
  return useInfiniteQuery<
    FetchUserCastsResponse,
    Error,
    FetchUserCastsResponse,
    string[],
    string | undefined
  >({
    queryKey: ["user-casts", fid.toString()],
    queryFn: async ({ pageParam }) => {
      const { data } = await axios.post<FetchUserCastsResponse>(
        "/api/fetch_user_casts",
        {
          fid,
          cursor: pageParam,
        }
      );
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.next?.cursor,
    enabled: enabled && !!fid,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep unused data in cache for 30 minutes
  });
}

