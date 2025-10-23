import { VercelRequest, VercelResponse } from "@vercel/node";
import { createHmac, timingSafeEqual } from "crypto";
import { decodeEventLog } from "viem";
import fs from "fs";
import path from "path";
import setupAdminWallet from "../src/lib/setupAdminWallet.js";
import { DIAMOND_ADDRESS } from "../src/lib/utils.js";
import { HypemanAI } from "../src/clients/HypemanAI.js";
import { withHost } from "../middleware/withHost.js";

/**
 * Fetches cast text from Neynar API using hash
 * @param hash - The cast hash to fetch text for
 * @returns Promise with cast text
 */
async function getCastText(hash: string): Promise<string> {
  const apiKey = process.env.NEYNAR_API_KEY;
  
  if (!apiKey) {
    console.warn("NEYNAR_API_KEY not set, skipping cast text fetch");
    return "API key not configured";
  }

  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/cast/?identifier=${hash}&type=hash`,
      {
        headers: {
          'x-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.status}`);
    }

    const data = await response.json();
    return data.cast?.text || "No text found";
  } catch (error) {
    console.error("Error fetching cast text from Neynar:", error);
    return "Error fetching cast text";
  }
}

/**
 * Fetches creator, hash, and cast text from the contract using promotion ID
 * @param promotionId - The promotion ID to fetch data for
 * @returns Promise with creator, hash, cast text, and totalBudget
 */
async function getPromotionDetails(promotionId: string) {
  const { publicClient } = setupAdminWallet();
  
  // Load the PromotionCreate ABI
  const filePath = path.join(
    process.cwd(),
    "/src/abis",
    "PromotionCreate.json"
  );
  const fileContents = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(fileContents);

  try {
    const promotionDetails: any = await publicClient.readContract({
      address: DIAMOND_ADDRESS as `0x${string}`,
      abi: data,
      functionName: "getPromotion",
      args: [BigInt(promotionId)],
    });

    // Extract creator and hash from cast URL
    const castUrl = promotionDetails.cast_url;
    let creator = "";
    let hash = "";

    if (castUrl) {
      try {
        // Parse Warpcast URL format: https://warpcast.com/username/0xhash
        const urlParts = castUrl.split('/');
        if (urlParts.length >= 4) {
          creator = urlParts[3]; // username
          hash = urlParts[4];   // hash (0x...)
        }
      } catch (error) {
        console.error("Error parsing cast URL:", error);
        creator = "Unknown";
        hash = "Unknown";
      }
    } else {
      creator = "No URL";
      hash = "No URL";
    }

    // Fetch cast text using Neynar API
    const castText = await getCastText(hash);

    return {
      creator,
      hash,
      castText,
      totalBudget: promotionDetails.total_budget.toString(),
    };
  } catch (error) {
    console.error("Error fetching promotion details:", error);
    throw error;
  }
}

/**
 * Publishes a cast using Neynar API
 * @param text - The cast text to publish
 * @param hash - The hash to embed
 * @param fid - The Farcaster ID of the original creator
 * @returns Promise with publish result
 */
async function publishCast(text: string, hash: string, fid: number): Promise<{ success: boolean; error?: string; castHash?: string }> {
  const apiKey = process.env.NEYNAR_API_KEY;
  const signerUuid = process.env.HYPEMAN_SIGNER_UUID;
  
  if (!apiKey) {
    return { success: false, error: "NEYNAR_API_KEY not set" };
  }
  
  if (!signerUuid) {
    return { success: false, error: "HYPEMAN_SIGNER_UUID not set" };
  }

  try {
    const response = await fetch("https://api.neynar.com/v2/farcaster/cast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        signer_uuid: signerUuid,
        text: text,
        embeds: [
          {
            url: "https://hypeman.social"
          },
          {
            cast_id: {
              fid: fid,
              hash: hash
            }
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Neynar API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    return { 
      success: true, 
      castHash: data.cast?.hash 
    };
  } catch (error) {
    console.error("Error publishing cast:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

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

async function handler(req: VercelRequest, res: VercelResponse) {
  // Get the signature from headers
  const signature = req.headers["x-qn-signature"] as string;
  const secret = process.env.QUICKNODE_SECURITY_TOKEN_CREATE_PROMOTION as string;
  const nonce = req.headers["x-qn-nonce"] as string;
  const timestamp = req.headers["x-qn-timestamp"] as string;
  const payload = JSON.stringify(req.body);

  // Temporary bypass for testing - remove this in production!
  if (!secret) {
    console.log("WARNING: QUICKNODE_SECURITY_TOKEN not set, bypassing signature verification for testing");
    // Uncomment the next line to bypass signature verification during testing
    return res.status(200).json({ message: "Signature verification bypassed for testing" });
  }

  const isValid = verifySignature(
    secret,
    payload,
    nonce,
    timestamp,
    signature
  );

  console.log("Signature valid:", isValid);

  if (!isValid) {
    return res.status(401).json({ message: "Invalid signature" });
  }

  // Load the PromotionCreate ABI
  const filePath = path.join(
    process.cwd(),
    "/src/abis",
    "PromotionCreate.json"
  );
  const fileContents = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(fileContents);

  if (req.body.length > 0) {
    console.log(
      "PROMOTION CREATED EVENT FIRED vvv =============================================================================================== vvv"
    );
    for (const log of req.body) {
      const decoded: any = decodeEventLog({
        abi: [
          data.find(
            (x: any) => x.name === "PromotionCreated" && x.type === "event"
          )!,
        ],
        data: log.data,
        topics: log.topics,
      });

      if (decoded && decoded.eventName === "PromotionCreated") {
        console.log("=== PROMOTION CREATED EVENT DECODED ===");
        console.log("Promotion ID:", decoded.args.id.toString());

        // Fetch creator, hash, cast text, and totalBudget using the promotion ID
        try {
          const promotionDetails = await getPromotionDetails(decoded.args.id.toString());

          // Generate promotional cast using HypemanAI
          try {
            const hypemanAI = await HypemanAI.getInstance(
              parseInt(decoded.args.creatorFid.toString()),
              promotionDetails.creator
            );
            
            const promotionalResult = await hypemanAI.generatePromotionalCast(
              promotionDetails.castText,
              promotionDetails.totalBudget,
              promotionDetails.creator
            );

            console.log("=== DEBUG INFO ===");
            console.log("Creator username:", promotionDetails.creator);
            console.log("Budget:", promotionDetails.totalBudget);
            console.log("Cast text:", promotionDetails.castText);
            console.log("==================");

            if (promotionalResult.success) {
              console.log("=== PROMOTIONAL CAST GENERATED ===");
              console.log("Promotional Text:", promotionalResult.text);
              console.log("==================================");

              // Publish the promotional cast using Neynar API
              const publishResult = await publishCast(
                promotionalResult.text || "",
                promotionDetails.hash || "",
                parseInt(decoded.args.creatorFid.toString())
              );

              if (publishResult.success) {
                console.log("=== CAST PUBLISHED SUCCESSFULLY ===");
                console.log("Published Cast Hash:", publishResult.castHash);
                console.log("==================================");
              } else {
                console.log("Failed to publish cast:", publishResult.error);
              }

            }
          } catch (aiError) {
            console.error("Error generating promotional cast:", aiError);
          }

        } catch (error) {
          console.error("Error fetching promotion details:", error);
          console.log("Falling back to event data only");
        }
      }
    }
  }

  // Return success response
  res.status(200).json({ message: "PromotionCreated webhook received successfully" });
}

export default withHost(handler);
