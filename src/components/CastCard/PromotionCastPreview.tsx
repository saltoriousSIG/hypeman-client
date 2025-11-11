import { ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import sdk from "@farcaster/frame-sdk";
import { cn } from "@/lib/utils";

interface PromotionCastPreviewProps {
  username: string;
  text: string;
  pfpUrl: string;
  authorFid: number;
  castUrl: string;
  embeds: any[];
  className?: string;
  promotionId?: string | number;
  hideViewPromotionButton?: boolean;
}

export default function PromotionCastPreview({
  username,
  text,
  pfpUrl,
  authorFid,
  castUrl,
  embeds,
  className,
  promotionId,
  hideViewPromotionButton = false,
}: PromotionCastPreviewProps) {
  const navigate = useNavigate();

  const handleViewProfile = async () => {
    try {
      await sdk.actions.viewProfile({
        fid: authorFid,
      });
    } catch (error) {
      console.error("Error viewing profile:", error);
    }
  };

  const handleViewCast = async () => {
    try {
      const hash = castUrl.split("/").pop();
      await sdk.actions.viewCast({
        hash: hash || "",
      });
    } catch (error) {
      console.error("Error viewing cast:", error);
    }
  };

  const handleViewPromotion = () => {
    if (promotionId) {
      navigate(`/promotion/${promotionId}`);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg overflow-hidden p-4 bg-linear-to-b from-[#49475a]/80 via-[#2a2738]/90 to-[#100d18]/95",
        className
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div onClick={handleViewProfile} className="flex items-center gap-2 cursor-pointer">
            <img
              src={pfpUrl}
              alt={username}
              width={36}
              height={36}
              className="rounded-full w-6 h-6"
            />
            <span className="text-white text-sm font-bold">{username}</span>
          </div>
          {!hideViewPromotionButton && (
            <div className="w-full flex justify-end gap-x-2">
              <button
                onClick={handleViewPromotion}
                disabled={!promotionId}
                className="group cursor-pointer relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 shadow-md shadow-purple-500/30 border border-white/10 transition-all duration-300 hover:scale-[1.03] active:scale-100 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
                title="View Promotion"
              >
                <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-white" />
                <div className="relative z-10 w-4 h-4 rounded-full bg-black/20 border border-white/30 flex items-center justify-center">
                  <ExternalLink className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="relative z-10 tracking-wide uppercase text-[11px]">
                  View
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="flex h-fit flex-col items-start gap-3">
          <div className="flex-1 cursor-pointer" onClick={handleViewCast}>
            <p className="text-xs text-white/90 whitespace-pre-wrap">{text}</p>
          </div>
          {embeds.some((embed) => embed.metadata?.content_type?.startsWith("image/")) && (
            <div className="w-full overflow-x-auto hide-scrollbar">
              <div className="flex gap-4 pb-4">
                {embeds.map((embed, index) => {
                  if (embed.metadata?.content_type?.startsWith("image/")) {
                    return (
                      <img
                        key={index}
                        src={embed.url}
                        className="rounded-lg  h-auto flex-1  flex-shrink-0 max-w-[250px]"
                      />
                    );
                  }
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
