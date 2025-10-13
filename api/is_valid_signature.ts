import { ExtendedVercelRequest } from "../src/types/request.type";
import { VercelResponse } from "@vercel/node";
import { validateSignature } from "../middleware/validateSignature.js";

async function handler(req: ExtendedVercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  try {
    console.log(req.fid, "fid in is_valid_signature");
    res.status(200).json({ fid: req.fid, userData: req.userData });
  } catch (e: any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export default validateSignature(handler);
