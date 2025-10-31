import { ExtendedVercelRequest } from "../src/types/request.type";
import { VercelResponse } from "@vercel/node";
import setupAdminWallet from "../src/lib/setupAdminWallet.js";
import { withHost } from "../middleware/withHost.js";
import { validateSignature } from "../middleware/validateSignature.js";
import { RedisClient } from "../src/clients/RedisClient.js";

const redis = new RedisClient(process.env.REDIS_URL as string);

async function handler(req: ExtendedVercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const { publicClient } = setupAdminWallet();
    const pipeline = redis.pipeline(); 





  } catch(e: any) {
    console.error("Error in fetch_feed handler:", e);
    res.status(500).json({ error: "Internal server error", message: e.message });
  }
}

export default withHost(validateSignature(handler));
