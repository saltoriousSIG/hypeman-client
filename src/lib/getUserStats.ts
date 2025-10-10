import axios from "axios";

export const getUserStats = async (fid: number, host?: string) => {
  try {
    const { data } = await axios.post(
      host ? `${host}/api/fetch_user` : "/api/fetch_user",
      {
        fid,
      }
    );
    const { data: casts } = await axios.post(
      host ? `${host}/api/fetch_user_casts` : "/api/fetch_user_casts",
      {
        fid,
      }
    );
    const avgLikes =
      casts.casts.reduce((acc: any, curr: any) => {
        return acc + curr.reactions.likes_count;
      }, 0) / casts.casts.length;
    const avgRecasts =
      casts.casts.reduce((acc: any, curr: any) => {
        return acc + curr.reactions.recasts_count;
      }, 0) / casts.casts.length;
    const avgReplies =
      casts.casts.reduce((acc: any, curr: any) => {
        return acc + curr.replies.count;
      }, 0) / casts.casts.length;

    return {
      score: data.user.score,
      follower_count: data.user.follower_count,
      avgLikes,
      avgRecasts,
      avgReplies,
      casts,
    };
  } catch (e: any) {
    throw new Error(e.message);
  }
};
