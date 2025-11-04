import { VercelRequest, VercelResponse } from "@vercel/node";
import { decodeEventLog, formatUnits } from "viem";
import fs from "fs";
import path from "path";
import setupAdminWallet from "../../src/lib/setupAdminWallet.js";
import { DIAMOND_ADDRESS } from "../../src/lib/utils.js";
import { HypemanAI } from "../../src/clients/HypemanAI.js";
import axios from "axios";
import { streamMiddleware } from "../../middleware/streamMiddleware.js";
import { RedisClient } from "../../src/clients/RedisClient.js";

const redis = new RedisClient(process.env.REDIS_URL as string);

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
          "x-api-key": apiKey,
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
        const urlParts = castUrl.split("/");
        if (urlParts.length >= 4) {
          creator = urlParts[3]; // username
          hash = urlParts[4]; // hash (0x...)
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
      promotion: promotionDetails,
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
async function publishCast(
  id: string,
  text: string,
  hash: string,
  fid: number
): Promise<{ success: boolean; error?: string; castHash?: string }> {
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
            url: `https://hypeman.social/promotion/${id.toString()}`,
          },
          {
            cast_id: {
              fid: fid,
              hash: hash,
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Neynar API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    return {
      success: true,
      castHash: data.cast?.hash,
    };
  } catch (error) {
    console.error("Error publishing cast:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function handler(req: VercelRequest, res: VercelResponse) {
  // Load the PromotionCreate ABI
  const filePath = path.join(
    process.cwd(),
    "/src/abis",
    "PromotionCreate.json"
  );
  const fileContents = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(fileContents);

  const pipeline = redis.pipeline();

  try {
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
            const promotionDetails = await getPromotionDetails(
              decoded.args.id.toString()
            );

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
                  decoded.args.id.toString(),
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

              // update redis
              const {
                data: { cast },
              } = await axios.get(
                `https://api.neynar.com/v2/farcaster/cast/?type=url&identifier=${encodeURIComponent(promotionDetails.promotion.cast_url)}`,
                {
                  headers: {
                    "x-api-key": process.env.NEYNAR_API_KEY as string,
                  },
                }
              );

              pipeline
                .set(
                  `promotion:cast:${promotionDetails.promotion.id.toString()}`,
                  redis.encrypt(JSON.stringify(cast))
                )
                .hset(`promotion:${promotionDetails.promotion.id.toString()}`, {
                  ...promotionDetails.promotion,
                })
                .zadd(
                  `promotion_budget`,
                  parseFloat(
                    formatUnits(promotionDetails.promotion.remaining_budget, 6)
                  ),
                  promotionDetails.promotion.id.toString()
                )
                //TODO: update this to the right thing after contract has beed upgraded
                .zadd(
                  `promotion_base_rate`,
                  promotionDetails.promotion.base_rate > 0n
                    ? parseFloat(
                        formatUnits(
                          promotionDetails.promotion.base_rate.toString(),
                          6
                        )
                      )
                    : 0.25,
                  promotionDetails.promotion.id.toString()
                )
                .sadd(
                  `promotion_state:${promotionDetails.promotion.state.toString()}`,
                  promotionDetails.promotion.id.toString()
                )
                .sadd(
                  `promotion_is_pro:${promotionDetails.promotion.pro_user}`,
                  promotionDetails.promotion.id.toString()
                );

              await pipeline.exec();

              // Fetch the followers of the creator and send them a notification about the new promotion
              const { data } = await axios.get(
                `https://api.neynar.com/v2/farcaster/followers/reciprocal/?sort_type=algorithmic&fid=${decoded.args.creatorFid.toString()}&limit=100`,
                {
                  headers: {
                    "x-api-key": process.env.NEYNAR_API_KEY as string,
                  },
                }
              );
              const {
                data: { users },
              } = await axios.get(
                `https://api.neynar.com/v2/farcaster/user/bulk/?fids=${decoded.args.creatorFid.toString()}`,
                {
                  headers: {
                    "x-api-key": process.env.NEYNAR_API_KEY as string,
                  },
                }
              );

              const creator = users[0].username;

              const to_fids = data.users.map((f: any) => f.user.fid);

              await axios.post(
                `https://api.neynar.com/v2/farcaster/frame/notifications`,
                {
                  notification: {
                    title: `New Promotion!`,
                    body: `New Promotion from @${creator}! earn rewards by promoting it!`,
                    target_url: `https://hypeman.social/promotion/${decoded.args.id.toString()}`,
                  },
                  target_fids: [...to_fids],
                },
                {
                  headers: {
                    "x-api-key": process.env.NEYNAR_API_KEY as string,
                  },
                }
              );


              const new_pipeline = redis.pipeline();

              const _activeIds = await redis.smembers("promotion_state:0");
              for (const id of _activeIds) {
                new_pipeline.hgetall(`promotion:${id}`);
              }
              const _results: any = await new_pipeline.exec();
              const creatorIds = new Set<number>();
              for (const [error, promotion] of _results) {
                console.log(error, promotion);
                if (error) {
                  continue;
                }
                creatorIds.add(parseInt(promotion.creator_fid));
              }

              console.log("Updating deleted cast webhook for creators:", creatorIds);
               

              await axios.put(
                "https://api.neynar.com/v2/farcaster/webhook/",
                {
                  name: process.env.NEYNAR_CHECK_DELETE_CAST_WEBHOOK_NAME,
                  url: process.env.NEYNAR_CHECK_DELETE_CAST_WEBHOOK_URL,
                  webhook_id: process.env.NEYNAR_CHECK_DELETE_CAST_WEBHOOK_ID,
                  subscription: {
                    "cast.deleted": {
                      author_fids: Array.from(creatorIds),
                    },
                  },
                },
                {
                  headers: {
                    "x-api-key": process.env.NEYNAR_API_KEY as string,
                  },
                }
              );
            } catch (aiError) {
              console.log(aiError.response?.data.errors || aiError.message);
              //console.error("Error generating promotional cast:", aiError);
            }
          } catch (error) {
            console.error("Error fetching promotion details:", error);
            console.log("Falling back to event data only");
          }
        }
      }
    }

    // Return success response
    res
      .status(200)
      .json({ message: "PromotionCreated webhook received successfully" });
  } catch (e: any) {
    return res
      .status(500)
      .json({ error: "Internal Server Error", details: e.message });
  }
}

export default streamMiddleware(handler);
