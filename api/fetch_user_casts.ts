import { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { fid } = req.body;
    console.log(fid);
    const { data } = await axios.get(
      `https://api.neynar.com/v2/farcaster/feed/user/casts/?limit=25&include_replies=true&fid=${fid}`,
      {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY as string,
        },
      }
    );
    console.log(data);
    return res.status(200).json({ casts: data.casts });
  } catch (e: any) {
    res.status(500).json({ error: "Error processing cast" });
  }
}
