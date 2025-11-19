import { useInfiniteQuery } from "@tanstack/react-query";
import { Cast } from "@neynar/nodejs-sdk/build/api";
import useAxios from "./useAxios";
import { useFrameContext } from "@/providers/FrameProvider";

interface FetchUserCastsResponse {
  casts: Cast[];
  next?: {
    cursor: string;
  };
}

interface UseUserCastsParams {
  fid: number;
  enabled?: boolean;
  filter?: "casts" | "replies" | "all";
}

/**
 * Hook to fetch user casts with infinite scroll/pagination support
 * @param fid - Farcaster ID of the user
 * @param enabled - Whether the query should be enabled (default: true)
 * @param filter - Filter type: "casts" (only top-level casts), "replies" (only replies), or "all" (default: "casts")
 */
export function useUserCasts({ fid, enabled = true, filter = "casts" }: UseUserCastsParams) {
  const axios = useAxios();
  const { isAuthenticated } = useFrameContext();
  return useInfiniteQuery<
    FetchUserCastsResponse,
    Error,
    FetchUserCastsResponse,
    (string | boolean)[],
    string | undefined
  >({
    queryKey: ["user-casts", fid.toString(), filter, isAuthenticated],
    queryFn: async ({ pageParam }) => {
      if (!axios) return { casts : [] } 
      const { data } = await axios.post<FetchUserCastsResponse>(
        "/api/fetch_user_casts",
        {
          cursor: pageParam,
          limit: 10, // Fetch only 10 casts at a time
          filter,
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
