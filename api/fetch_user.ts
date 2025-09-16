import { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { fid } = req.body;
    const { data } = await axios.get(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY as string,
        },
      }
    );
    return res.status(200).json({ user: data.users[0] });
  } catch (e: any) {
    res.status(500).json({ error: "Error processing cast" });
  }
}
