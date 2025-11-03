import { VercelRequest, VercelResponse } from "@vercel/node";
import { neynarMiddleware } from "../../middleware/neynarMiddleware.js";
import { RedisClient } from "../../src/clients/RedisClient.js";
import setupAdminWallet from "../../src/lib/setupAdminWallet.js";
import { DIAMOND_ADDRESS } from "../../src/lib/utils.js";
import fs from "fs";
import path from "path";

const redis = new RedisClient(process.env.REDIS_URL as string);

async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const cast = req.body.data;
    if (cast) {
      const dataAbiFilePath = path.join(
        process.cwd(),
        "/src/abis",
        `PromotionManage.json`
      ); // Adjust path
      const dataAbiFileContents = fs.readFileSync(dataAbiFilePath, "utf8");
      const manage_abi = JSON.parse(dataAbiFileContents);
      const { publicClient, account, walletClient } = setupAdminWallet();
      const pipeline = redis.pipeline();
      const activeIds = await redis.smembers(`promotion_state:0`);
      for (const id of activeIds) {
        pipeline.hgetall(`promotion:${id}`);
      }
      const results: any = await pipeline.exec();
      for (const [error, promotion] of results) {
        if (error) {
          console.error("Error fetching promotion:", error);
          continue;
        }
        const promotion_url = new URL(promotion.cast_url);
        const hash = promotion_url.pathname.split("/").pop();
        if (hash === cast.hash) {
          const { request } = await publicClient.simulateContract({
            account,
            address: DIAMOND_ADDRESS as `0x${string}`,
            abi: manage_abi,
            functionName: "endPromotion",
            args: [promotion.id],
          });
          const hash = await walletClient.writeContract(request);
          const receipt = await publicClient.waitForTransactionReceipt({
            hash,
          });
          console.log(receipt);
        }
      }
    }
    res.status(200).json({ message: "Deleted cast updated successfully" });
  } catch (e: any) {
    console.error("Error updating deleted cast", e, e.message);
    return res
      .status(500)
      .json({ error: "Internal Server Error", message: e.message });
  }
}

export default neynarMiddleware(handler);
