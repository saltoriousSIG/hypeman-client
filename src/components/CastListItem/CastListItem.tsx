import { Quote, Plus } from "lucide-react";
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
    <div className="bg-linear-to-b from-[#49475a]/80 via-[#2a2738]/90 to-[#100d18]/95 border-white/10 rounded-lg p-4 transition-all">
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
            <button
              onClick={() => onPromote(cast)}
              className="cursor-pointer relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white/90 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-400/30 hover:border-pink-400/50 transition-all duration-500 group overflow-hidden backdrop-blur-sm hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105"
            >
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              <div className="relative z-10 w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center group-hover:rotate-90 transition-transform duration-500">
                <Plus className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="relative z-10 bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent group-hover:from-purple-200 group-hover:to-pink-200 transition-all duration-300">
                Promote
              </span>
            </button>
          </div>
        </div>

        {onView && (
          <div onClick={() => onView(cast)} className="text-white cursor-pointer text-sm leading-normal break-words overflow-hidden whitespace-pre-wrap">
            {cast.text}
          </div>
        )}

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

