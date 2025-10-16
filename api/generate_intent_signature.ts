import { VercelResponse } from "@vercel/node";
import { ExtendedVercelRequest } from "../src/types/request.type.js";
import {
  encodeAbiParameters,
  keccak256,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getUserStats } from "../src/lib/getUserStats.js";
import { calculateUserScore } from "../src/lib/calculateUserScore.js";
import { parseUnits } from "viem";
import { RedisClient } from "../src/clients/RedisClient.js";
import { withHost } from "../middleware/withHost.js";
import { v4 as uuidv4 } from "uuid";
import { randomBytes } from "crypto";
import { validateSignature } from "../middleware/validateSignature.js";
import { Intent } from "../src/types/intents.type.js";
import setupAdminWallet from "../src/lib/setupAdminWallet.js";

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

    const { score, follower_count, avgLikes, avgRecasts, avgReplies } =
      await getUserStats(req.fid as number);
    const fee = calculateUserScore(
      score,
      follower_count,
      avgLikes,
      avgRecasts,
      avgReplies
    );

    const { account } = setupAdminWallet();

    // Generate expiry (default: 1 hour from now) if not provided
    const expiry = body.expiry
      ? BigInt(body.expiry)
      : BigInt(Math.floor(Date.now() / 1000 + 3600));

    console.log(expiry, "expiry");

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
