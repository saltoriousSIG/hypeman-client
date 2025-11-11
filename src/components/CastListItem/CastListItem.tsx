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
              className="cursor-pointer relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 shadow-md shadow-purple-500/30 border border-white/10 transition-transform duration-300 hover:scale-[1.03] active:scale-100"
            >
              <div className="relative z-10 w-4 h-4 rounded-full bg-black/20 border border-white/30 flex items-center justify-center">
                <Plus className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="relative z-10 tracking-wide uppercase text-[11px]">
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
