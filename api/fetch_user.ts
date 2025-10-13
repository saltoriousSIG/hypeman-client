import { VercelResponse } from "@vercel/node";
import { ExtendedVercelRequest } from "../src/types/request.type";
import axios from "axios";
import { withHost } from "../middleware/withHost.js";
import { validateSignature } from "../middleware/validateSignature.js";

async function handler(req: ExtendedVercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { data } = await axios.get(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${req.fid}`,
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

export default withHost(validateSignature(handler));
