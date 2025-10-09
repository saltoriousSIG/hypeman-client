import { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { fid, cursor } = req.body;
    
    // Build URL with optional cursor
    let url = `https://api.neynar.com/v2/farcaster/feed/user/casts/?limit=25&include_replies=false&fid=${fid}`;
    if (cursor) {
      url += `&cursor=${cursor}`;
    }
    
    const { data } = await axios.get(url, {
      headers: {
        "x-api-key": process.env.NEYNAR_API_KEY as string,
      },
    });
    
    return res.status(200).json({ 
      casts: data.casts,
      next: data.next
    });
  } catch (error: any) {
    console.error("Error fetching user casts:", error);
    res.status(500).json({ error: "Error processing cast" });
  }
}
