import { User, ExternalLink } from "lucide-react";
import sdk from "@farcaster/frame-sdk";
import { Button } from "@/components/ui/button";

interface PromotionCastPreviewProps {
  username: string;
  text: string;
  pfpUrl: string;
  authorFid: number;
  castUrl: string;
  embeds: any[];
}

export default function PromotionCastPreview({
  username,
  text,
  pfpUrl,
  authorFid,
  castUrl,
  embeds,
}: PromotionCastPreviewProps) {
  const handleViewProfile = async () => {
    try {
      await sdk.actions.viewProfile({
        fid: authorFid,
      });
    } catch (error) {
      console.error("Error viewing profile:", error);
    }
  };

  console.log("Embeds:", embeds);

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

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden p-4">
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <img
              src={pfpUrl}
              alt={username}
              width={36}
              height={36}
              className="rounded-full w-6 h-6"
            />
            <span className="text-white text-sm font-bold">{username}</span>
            <button
              onClick={handleViewProfile}
              className="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-white/80 border border-white/10 transition-all duration-200 hover:scale-105"
              title="View Profile"
            >
              <User className="w-3 h-3" />
              <span>Profile</span>
            </button>
          </div>
          <div className="w-full flex justify-end gap-x-2">
            <button
              onClick={handleViewCast}
              className="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full text-xs text-white/80 border border-white/10 transition-all duration-200 hover:scale-105"
              title="View Cast"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Cast</span>
            </button>
          </div>
        </div>

        <div className="flex h-fit flex-col items-start gap-3">
          <div className="flex-1">
            <p className="text-xs text-white/90 whitespace-pre-wrap">{text}</p>
          </div>
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
              if (embed.metadata?.content_type?.startsWith("text/html")) {
                return (
                  <div
                    className="w-full h-auto flex flex-col items-center justify-center space-y-2  flex-shrink-0 max-w-[250px]"
                    key={index}
                  >
                    <Button
                      variant="outline"
                      className="w-full h-[30px] bg-transparent"
                      onClick={() => {
                        sdk.actions.openUrl(embed.url);
                      }}
                    >
                      View Frame
                    </Button>
                    <img
                      key={index}
                      src={embed.metadata.frame.image}
                      className="rounded-lg "
                    />
                  </div>
                );
              }
            })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
