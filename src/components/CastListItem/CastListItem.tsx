import { Button } from "@/components/ui/button";
import { Quote, ExternalLink } from "lucide-react";
import { Cast } from "@neynar/nodejs-sdk/build/api";
import { useCastQuoteCount } from "@/hooks/useCastQuoteCount";

interface CastListItemProps {
  cast: Cast;
  onPromote: (cast: Cast) => void;
  onView: (cast: Cast) => void;
}

/**
 * Individual cast list item with quote count fetching
 * Uses React Query for optimal data fetching and caching
 */
export default function CastListItem({ cast, onPromote, onView }: CastListItemProps) {
  const { data, isLoading, isError } = useCastQuoteCount(cast.hash);

  // Determine what to display for quote count
  const quoteCountDisplay = isLoading 
    ? '...' 
    : isError 
    ? '0' 
    : (data?.quoteCount ?? 0);

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all">
      <div className="flex flex-col gap-3">
        {/* Top row: Quote count on left, buttons on right */}
        <div className="flex items-center justify-between gap-3">
          {/* Quote count - left */}
          <div className="flex items-center gap-1.5 text-cyan-400 text-sm font-semibold">
            <Quote className="w-4 h-4" />
            <span>{quoteCountDisplay}</span>
          </div>
          
          {/* Action buttons - right */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onView(cast)}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-medium px-3 h-8 rounded-lg transition-all active:scale-[0.95] cursor-pointer shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              View
            </Button>
            <Button
              onClick={() => onPromote(cast)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white text-xs font-semibold px-4 h-8 rounded-lg transition-all active:scale-[0.95] cursor-pointer shrink-0"
            >
              Promote
            </Button>
          </div>
        </div>

        {/* Cast text - full width */}
        <p className="text-white text-sm leading-normal break-words overflow-hidden">
          {cast.text}
        </p>
      </div>
    </div>
  );
}

