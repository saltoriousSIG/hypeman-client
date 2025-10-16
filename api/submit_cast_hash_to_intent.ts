import { ExtendedVercelRequest } from "../src/types/request.type";
import { VercelResponse } from "@vercel/node";
import { withHost } from "../middleware/withHost.js";
import { validateSignature } from "../middleware/validateSignature.js";
import { RedisClient } from "../src/clients/RedisClient.js";
import setupAdminWallet from "../src/lib/setupAdminWallet.js";
import { DIAMOND_ADDRESS } from "../src/lib/utils.js";
import fs from "fs";
import path from "path";

const redis = new RedisClient(process.env.REDIS_URL as string);

async function handler(req: ExtendedVercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  //check that promoter details have a valid fid
  // check that the intent isnt expired
  try {
    const { publicClient } = setupAdminWallet();

    const intentsAbiFilePath = path.join(
      process.cwd(),
      "/src/abis",
      `PromotionData.json`
    );
    const intentsAbiFileContents = fs.readFileSync(intentsAbiFilePath, "utf8");
    const data_abi = JSON.parse(intentsAbiFileContents);

    const { cast_hash, intent_hash, promotion_id } = req.body;
    const list = await redis.lrange(`intent:${promotion_id}`, 0, -1);
    const index = list.findIndex(
      (i: any) =>
        i.intentHash === intent_hash &&
        promotion_id.toString() == i.promotionId &&
        i.fid == req.fid?.toString()
    );
    const intent = list.find(
      (i: any) =>
        i.intentHash === intent_hash &&
        promotion_id == i.promotionId &&
        i.fid == req.fid
    );

    const promoter_details: any = await publicClient.readContract({
      address: DIAMOND_ADDRESS as `0x${string}`,
      abi: data_abi,
      functionName: "getPromoterDetails",
      args: [BigInt(promotion_id), req.address as `0x${string}`],
    });

    if (promoter_details.fid === 0n) {
      return res.status(400).json({ error: "Promoter not registered" });
    }

    if (intent && parseInt(intent.expiry) < Math.floor(Date.now() / 1000)) {
      return res.status(400).json({ error: "Intent expired" });
    }

    if (index !== -1) {
      await redis.lset(`intent:${promotion_id}`, index, {
        ...intent,
        cast_hash,
      });
    }
    return res.status(200).json({ message: "Cast hash submitted to intent" });
  } catch (e: any) {
    res.status(500).json({ error: "Error submitting cast hash" });
  }
}

export default withHost(validateSignature(handler));
