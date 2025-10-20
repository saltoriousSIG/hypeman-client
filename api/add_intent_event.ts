import { VercelRequest, VercelResponse } from "@vercel/node";
import { createHmac, timingSafeEqual } from "crypto";
import { decodeEventLog } from "viem";
import fs from "fs";
import path from "path";
import { RedisClient } from "../src/clients/RedisClient.js";
import setupAdminWallet from "../src/lib/setupAdminWallet.js";
import { DIAMOND_ADDRESS } from "../src/lib/utils.js";
import { zeroHash } from "viem";

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

  const { publicClient } = setupAdminWallet();

  const filePath = path.join(
    process.cwd(),
    "/src/abis",
    `${req.headers["x-event-to-track"]}.json`
  ); // Adjust path
  const fileContents = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(fileContents);

  const dataAbiFilePath = path.join(
    process.cwd(),
    "/src/abis",
    "PromotionData.json"
  );

  const dataAbiFileContents = fs.readFileSync(dataAbiFilePath, "utf8");
  const data_abi = JSON.parse(dataAbiFileContents);

  if (req.body.length > 0) {
    console.log(
      "EVENT FIRED vvv =============================================================================================== vvv"
    );
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

      if (decoded && decoded.eventName === "IntentSubmitted") {
        const intent_from_hash = await publicClient.readContract({
          address: DIAMOND_ADDRESS as `0x${string}`,
          abi: data_abi,
          functionName: "getPromoterDetails",
          args: [decoded.args.promotionId.toString(), decoded.args.wallet],
        });

        const promoter_details: any = await publicClient.readContract({
          address: DIAMOND_ADDRESS as `0x${string}`,
          abi: data_abi,
          functionName: "getPromoterDetails",
          args: [decoded.args.promotionId.toString(), decoded.args.wallet],
        });

        const list = await redis.lrange(
          `intent:${decoded.args.promotionId.toString()}`,
          0,
          -1
        );

        const index = list.findIndex(
          (i: any) =>
            i.intentHash === decoded.args.intentHash &&
            decoded.args.promotionId.toString() === i.promotion_id &&
            i.fid === decoded.args.fid.toString()
        );
        console.log(index, "INTENT INDEX IN REDIS");
        console.log(decoded.args, "DECODED ARGS");
        // Only add to redis if fid is not 0 (meaning the promoter is registered)
        if (promoter_details.fid !== 0n) {
          if (index === -1) {
            const intent_to_add: Record<string, any> = {
              intentHash: decoded.args.intentHash,
              promotion_id: decoded.args.promotionId.toString(),
              wallet: decoded.args.wallet,
              fid: decoded.args.fid.toString(),
              fee: decoded.args.fee.toString(),
              expiry: decoded.args.expiry.toString(),
              nonce: decoded.args.nonce.toString(),
              timestamp: decoded.args.timestamp.toString(),
            };
            if (promoter_details.cast_hash !== zeroHash) {
              intent_to_add.cast_hash = promoter_details.cast_hash;
              intent_to_add.processed = true;
            }
            await redis.lpush(
              `intent:${decoded.args.promotionId.toString()}`,
              JSON.stringify(intent_to_add)
            );
          } else {
            const intent_to_add: Record<string, any> = {
              intentHash: decoded.args.intentHash,
              promotion_id: decoded.args.promotionId.toString(),
              wallet: decoded.args.wallet,
              fid: decoded.args.fid.toString(),
              fee: decoded.args.fee.toString(),
              expiry: decoded.args.expiry.toString(),
              nonce: decoded.args.nonce.toString(),
              timestamp: decoded.args.timestamp.toString(),
            };
            if (promoter_details.cast_hash !== zeroHash) {
              intent_to_add.cast_hash = promoter_details.cast_hash;
              intent_to_add.processed = true;
            }
            await redis.lset(
              `intent:${decoded.args.promotionId.toString()}`,
              index,
              JSON.stringify(intent_to_add)
            );
          }
        }
      }
    }
  }
  // Verify signature
  res.status(200).json({ message: "Webhook received successfully" });
}
