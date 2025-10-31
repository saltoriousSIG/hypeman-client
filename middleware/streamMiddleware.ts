import { QuickNodeEventLogRequest } from "../src/types/request.type";
import { VercelResponse } from "@vercel/node";
import { verifySignature } from "../src/lib/verifyWebhookSignature.js";

const access_tokens:Record<string, string> = {
  add_intent: process.env.QUICKNODE_SECURITY_TOKEN_ADD_INTENT as string,
  agent_create: process.env.QUICKNODE_SECURITY_TOKEN_CREATE_PROMOTION as string,
  add_budget: process.env.QUICKNODE_SECURITY_TOKEN_ADD_BUDGET as string,
  create_event: process.env.QUICKNODE_SECURITY_TOKEN_CREATE_EVENT as string,
  promotion_end: process.env.QUICKNODE_SECURITY_TOKEN_PROMOTION_END as string,
}

export function streamMiddleware(handler: any) {
  return async (req: QuickNodeEventLogRequest, res: VercelResponse) => {
    try {
      const target_webhook = req.headers["x-target-webhook"] as string;
      const secret = access_tokens[target_webhook];
      const signature = req.headers["x-qn-signature"] as string;
      const isValid = verifySignature(
        secret,
        JSON.stringify(req.body),
        req.headers["x-qn-nonce"] as string,
        req.headers["x-qn-timestamp"] as string,
        signature
      );
      if (!isValid) {
        return res.status(401).json({ message: "Invalid signature" });
      }
      return handler(req, res);
    } catch (e: any) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
}
