import { VercelRequest, VercelResponse } from "@vercel/node";
import { createHmac, timingSafeEqual } from "crypto";
import { decodeEventLog } from "viem";
import fs from "fs";
import path from "path";
import { RedisClient } from "../src/clients/RedisClient.js";

const redis = new RedisClient(process.env.REDIS_URL as string);

function verifySignature(
  secretKey: string,
  payload: string,
  nonce: string,
  timestamp: string,
  givenSignature: string
) {
  // First concatenate as strings
  const signatureData = nonce + timestamp + payload;

  // Convert to bytes
  const signatureBytes = Buffer.from(signatureData);

  // Create HMAC with secret key converted to bytes
  const hmac = createHmac("sha256", Buffer.from(secretKey));
  hmac.update(signatureBytes);
  const computedSignature = hmac.digest("hex");

  return timingSafeEqual(
    Buffer.from(computedSignature, "hex"),
    Buffer.from(givenSignature, "hex")
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get the signature from headers
  const signature = req.headers["x-qn-signature"] as string;
  const secret = process.env.QUICKNODE_SECURITY_TOKEN as string;
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

  const filePath = path.join(
    process.cwd(),
    "/src/abis",
    `${req.headers["x-event-to-track"]}.json`
  ); // Adjust path
  const fileContents = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(fileContents);

  console.log(data, "ABI data");

  if (req.body.length > 0) {
    for (const log of req.body) {
      const decoded: any = decodeEventLog({
        abi: [
          data.find(
            (x: any) => x.name === "IntentSubmitted" && x.type === "event"
          )!,
        ],
        data: log.data,
        topics: log.topics,
      });

      console.log(decoded, "decoded log");
      if (decoded && decoded.eventName === "IntentSubmitted") {
        await redis.lpush(
          `intent:${decoded.args.promotionId.toString()}`,
          JSON.stringify({
            promotionId: decoded.args.promotionId.toString(),
            wallet: decoded.args.wallet,
            fid: decoded.args.fid.toString(),
            fee: decoded.args.fee.toString(),
            expiry: decoded.args.expiry.toString(),
            nonce: decoded.args.nonce.toString(),
            timestamp: decoded.args.timestamp.toString(),
            intentHash: decoded.args.intentHash,
          })
        );
      }
    }
  }
  // Verify signature
  res.status(200).json({ message: "Webhook received successfully" });
}
