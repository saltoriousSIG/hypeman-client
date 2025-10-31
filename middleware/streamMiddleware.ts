import { VercelRequest, VercelResponse } from "@vercel/node";
import { verifySignature } from "../src/lib/verifySignature.js";

const access_tokens: Record<string, string> = {
  add_intent: process.env.ADD_INTENT_WEBHOOK_TOKEN as string,
  promotion_create: process.env.PROMOTION_CREATE_WEBHOOK_TOKEN as string,
  promotion_ended: process.env.PROMOTION_ENDED_WEBHOOK_TOKEN as string,
  promotion_add_budget: process.env.PROMOTION_ADD_BUDGET_WEBHOOK_TOKEN as string,
  promotion_intent_processed: process.env.PROMOTION_INTENT_PROCESSED_WEBHOOK_TOKEN as string,
};

export function streamMiddleware(handler: any) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      const target_webhook = req.headers["x-target-webhook"] as string;
      const signature = req.headers["x-qn-signature"] as string;
      const secret = access_tokens[target_webhook];
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
      console.log(e)
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
}
