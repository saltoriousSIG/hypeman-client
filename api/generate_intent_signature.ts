import { VercelRequest, VercelResponse } from "@vercel/node";
import { encodeAbiParameters, keccak256, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getUserStats } from "../src/lib/getUserStats.js";
import { calculateUserScore } from "../src/lib/calculateUserScore.js";
import { parseUnits } from "viem";
import { RedisClient } from "../src/clients/RedisClient.js";

const redis = new RedisClient(process.env.REDIS_URL as string);

// Types matching your Solidity struct
interface Intent {
  promotion_id: bigint;
  wallet: Address;
  fid: bigint;
  fee: bigint;
  expiry: bigint;
  nonce: bigint;
}

interface SignIntentRequest {
  promotion_id: string;
  wallet: string;
  fid: string;
  fee: string;
  expiry?: number; // Optional, can be auto-generated
  nonce?: string; // Optional, can be auto-generated
}

interface SignIntentResponse {
  intent: {
    promotion_id: string;
    wallet: string;
    fid: string;
    fee: string;
    expiry: string;
    nonce: string;
  };
  signature: Hex;
  message_hash: Hex;
}

//TODO:
// Vercel API Route Handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body: SignIntentRequest = req.body;

    // Validate required fields
    if (!body.promotion_id || !body.wallet || !body.fid) {
      return res.status(400).json({
        error: "Missing required fields: promotion_id, wallet, fid, fee",
      });
    }

    const { score, follower_count, avgLikes, avgRecasts, avgReplies } =
      await getUserStats(parseInt(body.fid), process.env.SITE_HOST);
    const fee = calculateUserScore(
      score,
      follower_count,
      avgLikes,
      avgRecasts,
      avgReplies
    );

    // Get the owner's private key from environment variables
    const ownerPrivateKey = process.env.OWNER_PRIVATE_KEY as Hex;
    if (!ownerPrivateKey) {
      throw new Error("OWNER_PRIVATE_KEY not configured");
    }

    // Create account from private key
    const account = privateKeyToAccount(ownerPrivateKey);

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

    // Construct the intent object matching Solidity struct
    const intent: Intent = {
      promotion_id: BigInt(body.promotion_id),
      wallet: body.wallet as Address,
      fid: BigInt(body.fid),
      fee: parseUnits(`${fee}`, 6),
      expiry: expiry,
      nonce: BigInt(signature_nonce ? parseInt(signature_nonce) : 0),
    };

    // Encode the intent exactly as Solidity does: keccak256(abi.encode(intent))
    // Must match the order and types in your Solidity struct
    const encodedIntent = encodeAbiParameters(
      [
        { type: "uint256", name: "promotion_id" },
        { type: "address", name: "wallet" },
        { type: "uint256", name: "fid" },
        { type: "uint256", name: "fee" },
        { type: "uint256", name: "expiry" },
        { type: "uint256", name: "nonce" },
      ],
      [
        intent.promotion_id,
        intent.wallet,
        intent.fid,
        intent.fee,
        intent.expiry,
        intent.nonce,
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
        promotion_id: intent.promotion_id.toString(),
        wallet: intent.wallet,
        fid: intent.fid.toString(),
        fee: intent.fee.toString(),
        expiry: intent.expiry.toString(),
        nonce: intent.nonce.toString(),
      },
      signature,
      message_hash: messageHash,
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
