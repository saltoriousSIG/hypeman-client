import { useQuery } from '@tanstack/react-query';

interface QuoteCountResponse {
  quoteCount: number;
}

/**
 * Custom hook to fetch quote count for a specific cast
 * Uses React Query for caching, retry logic, and loading states
 * 
 * @param castHash - The hash of the cast to fetch quotes for
 * @param enabled - Whether to enable the query (default: true)
 * @returns Query result with quoteCount, loading, and error states
 */
export function useCastQuoteCount(castHash: string, enabled = true) {
  return useQuery<QuoteCountResponse, Error>({
    queryKey: ['castQuoteCount', castHash],
    queryFn: async () => {
      const response = await fetch('/api/fetch_cast_quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ castHash }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch quote count: ${response.statusText}`);
      }

      return response.json();
    },
    enabled,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

