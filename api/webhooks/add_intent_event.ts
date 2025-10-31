import { VercelRequest, VercelResponse } from "@vercel/node";
import { decodeEventLog } from "viem";
import fs from "fs";
import path from "path";
import { RedisClient } from "../../src/clients/RedisClient.js";
import setupAdminWallet from "../../src/lib/setupAdminWallet.js";
import { DIAMOND_ADDRESS } from "../../src/lib/utils.js";
import { zeroHash } from "viem";
import { streamMiddleware } from "../../middleware/streamMiddleware.js";
import { withHost } from "../../middleware/withHost.js";

const redis = new RedisClient(process.env.REDIS_URL as string);

async function handler(req: VercelRequest, res: VercelResponse) {
  const { publicClient } = setupAdminWallet();
  const filePath = path.join(
    process.cwd(),
    "/src/abis",
    `PromotionIntents.json`
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

  const pipeline = redis.pipeline();

  if (req.body.length > 0) {
    console.log(
      "INTENT EVENT FIRED vvv =============================================================================================== vvv"
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
        const promotion: any = await publicClient.readContract({
          address: DIAMOND_ADDRESS as `0x${string}`,
          abi: data,
          functionName: "getPromotion",
          args: [decoded.args.promotionId.toString()],
        });

        pipeline.hset(`promotion:${promotion.id.toString()}`, {
          ...promotion,
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
            pipeline.lpush(
              `intent:${decoded.args.promotionId.toString()}`,
              redis.encrypt(JSON.stringify(intent_to_add))
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
            pipeline.lset(
              `intent:${decoded.args.promotionId.toString()}`,
              index,
              redis.encrypt(JSON.stringify(intent_to_add))
            );
          }
        }
      }
    }
    await pipeline.exec();
  }
  // Verify signature
  res.status(200).json({ message: "Webhook received successfully" });
}

export default withHost(streamMiddleware(handler));
