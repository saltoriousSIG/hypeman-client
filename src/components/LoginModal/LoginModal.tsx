import React, { useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { LogIn } from "lucide-react";
import sdk from "@farcaster/frame-sdk";

interface LoginModalProps {
    signerApprovalUrl?: string;
    showLoginModal: boolean;
    handleShowLoginModal: (state: boolean) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ signerApprovalUrl, showLoginModal, handleShowLoginModal }) => {

    const handleLogin = useCallback(() => {
        if (!signerApprovalUrl) return;
        sdk.actions.openUrl(signerApprovalUrl);
    }, [signerApprovalUrl]);

    return (
        <Dialog open={showLoginModal} onOpenChange={handleShowLoginModal}>
            <DialogContent className="bg-white/10 backdrop-blur-sm border-white/20 text-white w-[95%] rounded-lg">
                <DialogHeader>
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <LogIn className="w-8 h-8 text-white" />
                    </div>
                    <DialogTitle className="text-2xl font-bold text-white text-center">Connect to Post</DialogTitle>
                </DialogHeader>
                <div className="text-center">
                    <p className="text-white/60 mb-6 leading-relaxed">
                        Connect your Farcaster account with your signer UUID to start posting and earning from promotions.
                    </p>
                    <button
                        onClick={handleLogin}
                        className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-2xl text-white font-semibold transition-all duration-300 shadow-lg shadow-purple-500/25"
                    >
                        Connect Farcaster
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default LoginModal;