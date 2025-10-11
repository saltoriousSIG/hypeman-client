import { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";
import { withHost } from "../middleware/withHost.js";

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { castHash } = req.body;

    if (!castHash) {
      return res.status(400).json({ error: "Cast hash is required" });
    }

    let allCasts: any[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    // Fetch all quotes with pagination
    while (hasMore) {
      const url = `https://api.neynar.com/v2/farcaster/cast/quotes/?identifier=${castHash}&type=hash&limit=100${cursor ? `&cursor=${cursor}` : ""}`;

      const { data } = await axios.get(url, {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY as string,
        },
      });

      allCasts = [...allCasts, ...data.casts];

      // Check if there are more results
      if (data.next?.cursor) {
        cursor = data.next.cursor;
      } else {
        hasMore = false;
      }
    }

    return res.status(200).json({ quoteCount: allCasts.length });
  } catch (e: any) {
    console.error("Error fetching cast quotes:", e.message);
    res.status(500).json({ error: "Error fetching cast quotes" });
  }
}

export default withHost(handler);
