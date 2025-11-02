import { VercelRequest, VercelResponse } from "@vercel/node";
import { createHmac } from "crypto";

const access_tokens: Record<string, string> = {
  "cast.created": process.env.NEYNAR_AGENT_WEBHOOK_SECRET as string,
  "cast.deleted": process.env.NEYNAR_DELETED_CAST_WEBHOOK_SECRET as string,
};

export function neynarMiddleware(handler: any) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      const key = req.headers["x-convoy-idempotency-key"] as string;
      if (!key) {
        return res.status(401).json({ message: "Missing idempotency key" });
      }
      const sig = req.headers["x-neynar-signature"] as string;
      const request_type = key.split("-")[0];sig
      const secret = access_tokens[request_type];
      const hmac = createHmac("sha512", secret);
      hmac.update(JSON.stringify(req.body));
      const generatedSignature = hmac.digest("hex");

      if (generatedSignature !== sig) {
        return res.status(401).json({ message: "Invalid signature" });
      }
      return handler(req, res);
    } catch (e: any) {
      console.log(e);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
}
