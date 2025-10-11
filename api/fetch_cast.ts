import { VercelRequest, VercelResponse } from "@vercel/node";
import { withHost } from "../middleware/withHost.js";
import axios from "axios";

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { cast_hash } = req.body;

    const { data } = await axios.get(
      `https://api.neynar.com/v2/farcaster/cast?identifier=${cast_hash}&type=hash`,
      {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY as string,
        },
      }
    );
    return res.status(200).json({ ...data.cast });
  } catch (e: any) {
    res.status(500).json({ error: "Error processing cast" });
  }
}

export default withHost(handler);
