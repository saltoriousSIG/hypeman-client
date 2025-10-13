import axios from "axios";

export const getUserStats = async (fid: number) => {
  try {
    const { data } = await axios.get(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY as string,
        },
      }
    );
    let url = `https://api.neynar.com/v2/farcaster/feed/user/casts/?limit=25&include_replies=false&fid=${fid}`;
    const {
      data: { casts },
    } = await axios.get(url, {
      headers: {
        "x-api-key": process.env.NEYNAR_API_KEY as string,
      },
    });
    const castsLength = casts.length || 1;
    const avgLikes =
      casts.reduce((acc: any, curr: any) => {
        return acc + (curr.reactions?.likes_count ?? 0);
      }, 0) / castsLength;
    const avgRecasts =
      casts.reduce((acc: any, curr: any) => {
        return acc + (curr.reactions?.recasts_count ?? 0);
      }, 0) / castsLength;
    const avgReplies =
      casts.reduce((acc: any, curr: any) => {
        return acc + (curr.replies?.count ?? 0);
      }, 0) / castsLength;

    return {
      score: data.users[0].score,
      follower_count: data.users[0].follower_count,
      avgLikes,
      avgRecasts,
      avgReplies,
      casts: casts.casts,
    };
  } catch (e: any) {
    console.log(e);
    throw new Error(e.message);
  }
};
