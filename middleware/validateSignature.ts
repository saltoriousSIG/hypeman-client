import { ExtendedVercelRequest } from "../src/types/request.type";
import { VercelResponse } from "@vercel/node";
import { createAppClient, viemConnector } from "@farcaster/auth-client";

const appClient = createAppClient({
  ethereum: viemConnector(),
});

export function validateSignature(handler: any) {
  return async (req: ExtendedVercelRequest, res: VercelResponse) => {
    try {
      const message = atob(req.headers["x-fc-message"] as string);
      const signature = req.headers["x-fc-signature"] as `0x${string}`;
      const nonce = req.headers["x-fc-nonce"] as string;

      if (!message || !signature || !nonce) {
        return res
          .status(401)
          .json({ error: "Unauthorized - Missing headers" });
      }

      const { success, data, fid } = await appClient.verifySignInMessage({
        message: message,
        signature: signature,
        nonce: nonce,
        domain: process.env.DOMAIN || "http://localhost:5173",
        acceptAuthAddress: true,
      });

      if (!success) {
        return res
          .status(401)
          .json({ error: "Unauthorized - Invalid signature" });
      }

      req.fid = fid;
      req.userData = data;
      req.address = nonce;
      return handler(req, res);
    } catch (e: any) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
}
