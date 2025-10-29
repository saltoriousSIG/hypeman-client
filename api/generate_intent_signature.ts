import { VercelResponse } from "@vercel/node";
import { ExtendedVercelRequest } from "../src/types/request.type.js";
import {
  encodeAbiParameters,
  keccak256,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { getUserStats } from "../src/lib/getUserStats.js";
import {
  calculateUserTier,
  Tiers,
  pricing_tiers,
} from "../src/lib/calculateUserScore.js";
import { parseUnits, formatUnits } from "viem";
import { RedisClient } from "../src/clients/RedisClient.js";
import { withHost } from "../middleware/withHost.js";
import { randomBytes } from "crypto";
import { validateSignature } from "../middleware/validateSignature.js";
import { Intent } from "../src/types/intents.type.js";
import setupAdminWallet from "../src/lib/setupAdminWallet.js";
import fs from "fs";
import path, { parse } from "path";
import { DIAMOND_ADDRESS, default_base_rate } from "../src/lib/utils.js";

const redis = new RedisClient(process.env.REDIS_URL as string);

// Types matching your Solidity struct

interface SignIntentRequest {
  promotion_id: string;
  wallet: string;
  expiry?: number; // Optional, can be auto-generated
  nonce?: string; // Optional, can be auto-generated
}

interface SignIntentResponse {
  intent: Intent;
  signature: Hex;
  messageHash: Hex;
  intent_hash: Hex;
}

//TODO:
// Vercel API Route Handler
async function handler(req: ExtendedVercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body: SignIntentRequest = req.body;
    // Validate required fields
    if (!body.promotion_id || !body.wallet) {
      return res.status(400).json({
        error: "Missing required fields: promotion_id, wallet",
      });
    }

    const dataAbiFilePath = path.join(
      process.cwd(),
      "/src/abis",
      `PromotionData.json`
    ); // Adjust path

    const dataAbiFileContents = fs.readFileSync(dataAbiFilePath, "utf8");
    const data_abi = JSON.parse(dataAbiFileContents);

    const { account, publicClient } = setupAdminWallet();

    const promotion: any = await publicClient.readContract({
      address: DIAMOND_ADDRESS as `0x${string}`,
      abi: data_abi,
      functionName: "getPromotion",
      args: [BigInt(body.promotion_id)],
    });

    const { score, follower_count, avgLikes, avgRecasts, avgReplies } =
      await getUserStats(req.fid as number);
    const tier = calculateUserTier(
      score,
      follower_count,
      avgLikes,
      avgRecasts,
      avgReplies
    );

    let fee: number;
    switch (tier) {
      case Tiers.TIER_1:
        if (promotion.base_rate) {
          fee =
            parseFloat(formatUnits(promotion.base_rate, 6)) *
            pricing_tiers.tier1;
        } else {
          fee = parseFloat(default_base_rate) * pricing_tiers.tier1;
        }
        break;
      case Tiers.TIER_2:
        if (promotion.base_rate) {
          fee =
            parseFloat(formatUnits(promotion.base_rate, 6)) *
            pricing_tiers.tier2;
        } else {
          fee = parseFloat(default_base_rate) * pricing_tiers.tier2;
        }
        break;
      case Tiers.TIER_3:
        if (promotion.base_rate) {
          fee =
            parseFloat(formatUnits(promotion.base_rate, 6)) *
            pricing_tiers.tier3;
        } else {
          fee = parseFloat(default_base_rate) * pricing_tiers.tier3;
        }
        break;
      default:
        if (promotion.base_rate) {
          fee =
            parseFloat(formatUnits(promotion.base_rate, 6)) *
            pricing_tiers.tier1;
        } else {
          fee = parseFloat(default_base_rate) * pricing_tiers.tier1;
        }
        break;
    }

    // Generate expiry (default: 1 hour from now) if not provided
    const expiry = body.expiry
      ? BigInt(body.expiry)
      : BigInt(Math.floor(Date.now() / 1000 + 3600));

    const signature_nonce = await redis.get(`signature_nonce`);

    if (!signature_nonce) {
      await redis.set(`signature_nonce`, 1);
    } else {
      await redis.set(`signature_nonce`, parseInt(signature_nonce) + 1);
    }

    const hash = toHex(randomBytes(32));
    console.log(hash);

    // Construct the intent object matching Solidity struct
    const intent: Intent = {
      intentHash: hash,
      promotion_id: BigInt(body.promotion_id),
      wallet: body.wallet as Address,
      fid: BigInt(req.fid as number),
      fee: parseUnits(`${fee}`, 6),
      expiry: expiry,
      nonce: BigInt(signature_nonce ? parseInt(signature_nonce) : 0),
    };

    // Encode the intent exactly as Solidity does: keccak256(abi.encode(intent))
    // Must match the order and types in your Solidity struct
    const encodedIntent = encodeAbiParameters(
      [
        { type: "bytes32", name: "intentHash" },
        { type: "uint256", name: "promotion_id" },
        { type: "address", name: "wallet" },
        { type: "uint256", name: "fid" },
        { type: "uint256", name: "fee" },
        { type: "uint256", name: "expiry" },
        { type: "uint256", name: "nonce" },
      ],
      [
        intent.intentHash,
        intent.promotion_id as bigint,
        intent.wallet,
        intent.fid as bigint,
        intent.fee as bigint,
        intent.expiry as bigint,
        intent.nonce as bigint,
      ]
    );

    // Hash the encoded data
    const messageHash = keccak256(encodedIntent);

    // Sign the hash with Ethereum signed message prefix
    // This matches your contract's verifyOwnerSignature function
    const signature = await account.signMessage({
      message: { raw: messageHash },
    });

    const response: SignIntentResponse = {
      intent: {
        intentHash: hash,
        promotion_id: intent.promotion_id.toString(),
        wallet: intent.wallet,
        fid: intent.fid.toString(),
        fee: intent.fee.toString(),
        expiry: intent.expiry.toString(),
        nonce: intent.nonce.toString(),
        timestamp: Math.floor(Date.now() / 1000).toString(),
      },
      signature,
      messageHash,
      intent_hash: hash,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error signing intent:", error);
    return res.status(500).json({
      error: "Failed to sign intent",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withHost(validateSignature(handler));
