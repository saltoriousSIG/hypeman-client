import React, { useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Share } from "lucide-react";
import sdk from "@farcaster/frame-sdk";
interface ShareModalProps {
  showShareModal: boolean;
  handleShowShareModal: (state: boolean, id?: string) => void;
  promotion_id: string;
  promotion_title: string;
  promotion_description: string;
}

const ShareModal: React.FC<ShareModalProps> = ({
  promotion_id,
  showShareModal,
  handleShowShareModal,
}) => {
  const handleShareToTimeline = useCallback(async () => {
    if (!promotion_id) return;
    await sdk.actions.composeCast({
      text: `I just created a promotion on Hypeman! Check it out!`,
      embeds: [`https://hypeman.social/promotion/${promotion_id}`],
    });
  }, [promotion_id]);

  useEffect(() => {}, [promotion_id]);

  const handleSkipForNow = () => {
    handleShowShareModal(false);
  };

  return (
    <Dialog open={showShareModal} onOpenChange={handleShowShareModal}>
      <DialogContent className="bg-black/95 backdrop-blur-sm border-white/20 text-white w-[95%] rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent">
            Share Your Promotion
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-white/70 text-sm">
            Let your followers know about this promotion opportunity! Select who
            to share with:
          </p>
          <div className="flex flex-col gap-4 pt-4 border-t border-white/20">
            <div className="flex gap-2">
              <Button
                onClick={handleSkipForNow}
                className="flex-1 bg-[#313131] hover:bg-[#2a2a2a] text-[#ededed] h-10 rounded-full px-4 py-2 text-sm font-medium transition-colors"
              >
                Cancel
              </Button>
              <Button
                onClick={handleShareToTimeline}
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 h-10 rounded-full text-white font-medium transition-all"
              >
                <Share className="w-4 h-4 mr-2" />
                Share to Timeline
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;
