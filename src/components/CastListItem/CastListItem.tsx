import { Button } from "@/components/ui/button";
import { Quote } from "lucide-react";
import { Cast } from "@neynar/nodejs-sdk/build/api";
import { useCastQuoteCount } from "@/hooks/useCastQuoteCount";

interface CastListItemProps {
  cast: Cast;
  onPromote: (cast: Cast) => void;
  onView?: (cast: Cast) => void;
}

/**
 * Type definitions for cast embeds
 */
interface CastEmbed {
  url: string;
  metadata?: {
    content_type?: string;
    content_length?: number;
    image?: {
      height_px?: number;
      width_px?: number;
    };
    _status?: string;
  };
}

/**
 * Individual cast list item with quote count fetching
 * Uses React Query for optimal data fetching and caching
 * Displays images from cast embeds if available
 */
export default function CastListItem({ cast, onPromote, onView }: CastListItemProps) {
  const { data, isLoading, isError } = useCastQuoteCount(cast.hash);

  // Determine what to display for quote count
  const quoteCountDisplay = isLoading
    ? '...'
    : isError
      ? '0'
      : (data?.quoteCount ?? 0);



  // Extract images from embeds with proper type safety
  const embeds = (cast.embeds as unknown as CastEmbed[]) ?? [];
  const images = embeds.filter(
    (embed) => embed.metadata?.content_type?.startsWith('image/')
  );
  const hasImages = images.length > 0;

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all">
      <div className="flex flex-col gap-3">
        {/* Top row: Quote count on left, buttons on right */}
        <div className="flex items-center justify-between gap-3">
          {/* Quote count - left */}
          <div className="flex items-center gap-1.5 text-purple-400 text-sm font-semibold">
            <Quote className="w-4 h-4" />
            <span>{quoteCountDisplay}</span>
          </div>

          {/* Action buttons - right */}
          <div className="flex items-center gap-2">
            {onView && (
              <Button
                onClick={() => onView(cast)}
                variant="outline"
                className="bg-white/5 border-white/20 text-white hover:bg-white/10 text-xs font-semibold px-3 h-8 rounded-lg transition-all active:scale-[0.95] cursor-pointer shrink-0"
              >
                View
              </Button>
            )}
            <Button
              onClick={() => onPromote(cast)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white text-xs font-semibold px-4 h-8 rounded-lg transition-all active:scale-[0.95] cursor-pointer shrink-0"
            >
              Promote
            </Button>
          </div>
        </div>

        {/* Cast text - full width */}
        <p className="text-white text-sm leading-normal break-words overflow-hidden whitespace-pre-wrap">
          {cast.text}
        </p>

        {/* Cast images - displayed below text if present */}
        {hasImages && (
          <div className="flex flex-col gap-2">
            {images.map((embed, index) => {
              const width = embed.metadata?.image?.width_px;
              const height = embed.metadata?.image?.height_px;
              return (
                <div
                  key={`${cast.hash}-image-${index}`}
                  className="relative w-full overflow-hidden rounded-lg border border-white/10 bg-white/5"
                >
                  <img
                    src={embed.url}
                    alt="Cast image embed"
                    loading="lazy"
                    className="w-full h-auto object-cover"
                    style={{
                      maxHeight: "500px",
                      aspectRatio: width && height
                        ? `${width} / ${height}`
                        : "auto",
                    }}
                    onError={(e) => {
                      // Fallback: hide image if it fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

