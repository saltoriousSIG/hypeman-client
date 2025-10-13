import { VercelResponse } from "@vercel/node";
import { ExtendedVercelRequest } from "../src/types/request.type.js";
import axios from "axios";
import { withHost } from "../middleware/withHost.js";
import { validateSignature } from "../middleware/validateSignature.js";

async function handler(req: ExtendedVercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { cursor } = req.body;
    const { data } = await axios.get(
      `https://api.neynar.com/v2/farcaster/followers/?limit=20&fid=${req.fid}${cursor ? `&cursor=${cursor}` : ``}`,
      {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY as string,
        },
      }
    );
    return res.status(200).json({
      users: data.users.map(
        (u: {
          user: {
            fid: number;
            display_name: string;
            username: string;
            pfp_url: string;
            follower_count: number;
          };
        }) => ({
          id: u.user.fid,
          name: u.user.display_name,
          handle: u.user.username,
          avatar: u.user.pfp_url,
          followers: u.user.follower_count,
        })
      ),
      cursor: data.next.cursor,
    });
  } catch (e: any) {
    res.status(500).json({ error: "Error processing cast" });
  }
}

export default withHost(validateSignature(handler));
