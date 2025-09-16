import { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

const signer_uuid = process.env.SIGNER_UUID as string;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { target_hash } = req.body;
    const { data } = await axios.delete(
      "https://api.neynar.com/v2/farcaster/cast",
      {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY as string,
        },
        data: {
          signer_uuid,
          target_hash,
        },
      }
    );
    return res.status(200).json({
      ...data,
    });
  } catch (e: any) {
    console.error("Error in post_cast handler:", e);
    res.status(500).json({ error: "Error processing cast" });
  }
}
