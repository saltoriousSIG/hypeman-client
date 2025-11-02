import { VercelRequest, VercelResponse } from "@vercel/node";
import { neynarMiddleware } from "../../middleware/neynarMiddleware.js";

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log(req.headers, "headers");
    console.log(req.body, "body");
    res.status(200).json({ message: "Deleted cast updated successfully" });
  } catch (e: any) {
    console.error("Error updating deleted cast", e, e.message);
    return res
      .status(500)
      .json({ error: "Internal Server Error", message: e.message });
  }
}

export default neynarMiddleware(handler);
