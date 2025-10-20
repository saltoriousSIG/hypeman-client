import React, { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Share, Bell, Check } from "lucide-react";
import { Badge } from "../ui/badge";
import { useFrameContext } from "@/providers/FrameProvider";
import useAxios from "@/hooks/useAxios";
import sdk from "@farcaster/frame-sdk";

interface ShareModalProps {
    showShareModal: boolean;
    handleShowShareModal: (state: boolean) => void;
    promotion_title: string;
    promotion_descripton: string;
}

type Follower = {
    id: number;
    name: string;
    handle: string
    avatar: string
    followers: string
    isActive: boolean,
}

const ShareModal: React.FC<ShareModalProps> = ({ showShareModal, handleShowShareModal }) => {
    const [userFollowers, setUserFollowers] = useState<Array<Follower>>([]);
    const [selectedFollowers, setSelectedFollowers] = useState<Array<{
        id: number,
        username: `@${string}`
    }>>([]);
    const [cursor, setCursor] = useState<string>();
    const { fUser } = useFrameContext();
    const axios = useAxios();
    useEffect(() => {
        return () => {
            setSelectedFollowers([])
            setCursor("");
        }
    }, [])

    // useEffect(() => {
    //     if (!fUser) return;
    //     const load = async () => {
    //         try {
    //             const { data } = await axios.post(`/api/fetch_user_followers`, {
    //                 cursor: null
    //             });
    //             setUserFollowers(data.users);
    //             setCursor(data.cursor);
    //         } catch (e: any) {
    //             throw new Error(e.message);
    //         }
    //     }
    //     load();
    // }, [fUser]);

    // const toggleFollower = (follower_id: number, username: `@${string}`) => {
    //     setSelectedFollowers((prev) =>
    //         prev.some((u) => u.id === follower_id) ? prev.filter((user) => user.id !== follower_id) : [...prev, {
    //             id: follower_id,
    //             username
    //         }],
    //     )

    // }

    const handleShareToTimeline = async () => {
        await sdk.actions.composeCast({
            text: `I just created a promotion on Hypeman! Check it out!`,
            embeds: ["https://hypeman-client.vercel.app/"]
        });
    }

    const handleSkipForNow = () => {
        handleShowShareModal(false);
        setSelectedFollowers([])
        setCursor('')
    }

    // const handleLoadMore = useCallback(
    //     async () => {
    //         if (!fUser) return
    //         try {
    //             const { data } = await axios.post(`/api/fetch_user_followers`, {
    //                 fid: fUser?.fid,
    //                 cursor
    //             })
    //             setUserFollowers([...userFollowers, ...data.users]);
    //             setCursor(data.cursor);
    //         } catch (e: any) {
    //             console.log(e)
    //             throw new Error(e.message);
    //         }
    //     }, [fUser, cursor]
    // )

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
                        Let your followers know about this promotion opportunity! Select who to share with:
                    </p>
                    {/* 
                    <div className="max-h-64 overflow-y-auto space-y-2 p-1">
                        {userFollowers.map((follower) => (
                            <div
                                key={follower.id}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-white/10 ${selectedFollowers.some((u) => u.id === follower.id)
                                    ? "bg-purple-500/20 ring-1 ring-purple-400/50"
                                    : "bg-white/5"
                                    }`}
                                onClick={() => toggleFollower(follower.id, `@${follower.handle}`)}
                            >
                                <div
                                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedFollowers.some((u) => u.id === follower.id) ? "bg-purple-500 border-purple-500" : "border-white/30"
                                        }`}
                                >
                                    {selectedFollowers.some((u) => u.id === follower.id) && <Check className="w-2.5 h-2.5 text-white" />}
                                </div>

                                <Avatar className="w-8 h-8">
                                    <AvatarImage src={follower.avatar || "/placeholder.svg"} alt={follower.name} />
                                    <AvatarFallback className="bg-white/20 text-white text-xs">
                                        {follower.name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-white text-sm truncate">{follower.name}</p>
                                    <p className="text-xs text-white/60 truncate">
                                        {follower.handle} • {follower.followers}
                                        &nbsp;
                                        <span className="text-xs">followers</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                        <Button
                            onClick={handleLoadMore}
                            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 h-11 text-white font-medium"
                        >
                            Load More
                        </Button>
                    </div> */}

                    <div className="flex flex-col gap-2 pt-4 border-t border-white/20">
                        <Button
                            onClick={handleShareToTimeline}
                            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 h-11 text-white font-medium"
                        >
                            <Share className="w-4 h-4 mr-2" />
                            Share to Timeline
                        </Button>

                        {/* <Button
                            onClick={handleNotifyFollowers}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-11 text-white font-medium"
                            disabled={selectedFollowers.length === 0}
                        >
                            <Bell className="w-4 h-4 mr-2" />
                            Notify Selected Followers
                            {selectedFollowers.length > 0 && (
                                <Badge className="ml-2 bg-white/20 text-white border-0">{selectedFollowers.length}</Badge>
                            )}
                        </Button> */}

                        <Button
                            onClick={handleSkipForNow}
                            variant="ghost"
                            className="w-full text-white/70 hover:text-white hover:bg-white/10"
                        >
                            Skip for now
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

    )
}

export default ShareModal;