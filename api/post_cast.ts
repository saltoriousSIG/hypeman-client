import { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

const signer_uuid = process.env.SIGNER_UUID as string;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { embeds, text } = req.body;
    const { data } = await axios.post(
      "https://api.neynar.com/v2/farcaster/cast",
      {
        signer_uuid,
        text,
        embeds,
      },
      {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY as string,
        },
      }
    );
    return res.status(200).json({
      hash: data.cast.hash,
    });
  } catch (e: any) {
    console.error("Error in post_cast handler:", e);
    res.status(500).json({ error: "Error processing cast" });
  }
}
