import { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { fid, cursor } = req.body;
    const { data } = await axios.get(
      `https://api.neynar.com/v2/farcaster/followers/?limit=20&fid=${fid}${cursor ? `&cursor=${cursor}` : ``}`,
      {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY as string,
        },
      }
    );
    return res.status(200).json({
      users: data.users.map((u) => ({
        id: u.user.fid,
        name: u.user.display_name,
        handle: u.user.username,
        avatar: u.user.pfp_url,
        followers: u.user.follower_count,
      })),
      cursor: data.next.cursor,
    });
  } catch (e: any) {
    res.status(500).json({ error: "Error processing cast" });
  }
}
