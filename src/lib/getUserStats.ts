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
    const castsLength = casts.casts.length || 1;
    const avgLikes =
      casts.casts.reduce((acc: any, curr: any) => {
        return acc + (curr.reactions?.likes_count ?? 0);
      }, 0) / castsLength;
    const avgRecasts =
      casts.casts.reduce((acc: any, curr: any) => {
        return acc + (curr.reactions?.recasts_count ?? 0);
      }, 0) / castsLength;
    const avgReplies =
      casts.casts.reduce((acc: any, curr: any) => {
        return acc + (curr.replies?.count ?? 0);
      }, 0) / castsLength;

    return {
      score: data.user.score,
      follower_count: data.user.follower_count,
      avgLikes,
      avgRecasts,
      avgReplies,
      casts: casts.casts,
    };
  } catch (e: any) {
    throw new Error(e.message);
  }
};
