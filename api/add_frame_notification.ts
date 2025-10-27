import { VercelResponse } from "@vercel/node";
import { ExtendedVercelRequest } from "../src/types/request.type.js";
import axios from "axios";
import { withHost } from "../middleware/withHost.js";
import { validateSignature } from "../middleware/validateSignature.js";

async function handler(req: ExtendedVercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const { data } = await axios.post(
      `https://api.neynar.com/v2/farcaster/frame/notifications`,
      {
        notification: {
          title: "Thank you for adding Hypeman!",
          body: "Hypeman is here to hype you up on Farcaster! Stay tuned for more exciting features.",
          target_url: "https://hypeman.social",
        },
        target_fids: [req.fid],
      },
      {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY as string,
        },
      }
    );
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    console.error("Error adding frame notification:", e, e.message);
    console.log(e.response.data);
    console.log(e.response.data.errors);
    res.status(500).json({ error: "Error adding frame notification" });
  }
}

export default withHost(validateSignature(handler));
