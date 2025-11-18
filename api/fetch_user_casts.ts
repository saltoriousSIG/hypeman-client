import { VercelResponse } from "@vercel/node";
import axios from "axios";
import { withHost } from "../middleware/withHost.js";
import { validateSignature } from "../middleware/validateSignature.js";
import { ExtendedVercelRequest } from "../src/types/request.type.js";

async function handler(req: ExtendedVercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { cursor, limit = 10, filter = "casts" } = req.body;

    // Determine if we need to filter results
    const needsFiltering = filter === "replies" || filter === "casts";
    
    // If filtering is needed, we need to fetch until we have enough filtered results
    // to avoid cursor mismatch issues. The cursor from the API points to unfiltered results,
    // so we need to accumulate filtered results across multiple batches.
    // We encode the last returned item's hash in the cursor to avoid skipping items.
    if (needsFiltering) {
      // Decode cursor: format is "apiCursor|lastHash" or just "apiCursor"
      let apiCursor: string | undefined = undefined;
      let lastReturnedHash: string | undefined = undefined;
      if (cursor) {
        const parts = cursor.split("|");
        apiCursor = parts[0] || undefined;
        lastReturnedHash = parts[1] || undefined;
      }

      let currentCursor: string | undefined = apiCursor;
      let allFilteredCasts: any[] = [];
      let lastNextCursor: string | undefined;
      const maxIterations = 10; // Safety limit to prevent infinite loops
      let iterations = 0;
      // Fetch larger batches to increase chance of getting enough filtered results
      const fetchLimit = Math.max(limit * 3, 30);
      let foundLastHash = false;

      // Keep fetching until we have enough filtered results or no more results
      while (allFilteredCasts.length < limit && iterations < maxIterations) {
        const url = `https://api.neynar.com/v2/farcaster/feed/user/casts/?limit=${fetchLimit}&include_replies=${filter === "replies" || filter === "all" ? "true" : "false"}&fid=${req.fid}${currentCursor ? `&cursor=${currentCursor}` : ""}`;

        const { data } = await axios.get(url, {
          headers: {
            "x-api-key": process.env.NEYNAR_API_KEY as string,
          },
        });

        // Filter the casts based on the filter type
        let filteredCasts: any[] = [];
        if (filter === "replies") {
          filteredCasts = data.casts.filter((cast: any) => cast.parent_hash || cast.parent_url);
        } else if (filter === "casts") {
          filteredCasts = data.casts.filter((cast: any) => !cast.parent_hash && !cast.parent_url);
        }

        // If we have a lastReturnedHash, skip items until we find one after it
        // Since the API returns items in chronological order and the cursor advances,
        // if we don't find the lastHash in this batch, the items are likely after it
        if (lastReturnedHash && !foundLastHash) {
          const lastHashIndex = filteredCasts.findIndex((cast: any) => cast.hash === lastReturnedHash);
          if (lastHashIndex >= 0) {
            // Found the last returned item, skip it and all items before it
            filteredCasts = filteredCasts.slice(lastHashIndex + 1);
            foundLastHash = true;
          }
          // If lastHash not found, items are likely after it (newer), so keep them
          // This handles the case where the cursor has advanced past the lastHash
        }

        // Add filtered casts to our collection
        allFilteredCasts = [...allFilteredCasts, ...filteredCasts];

        // Store the next cursor
        lastNextCursor = data.next?.cursor;

        // If we have enough filtered results or no more results, break
        if (allFilteredCasts.length >= limit || !lastNextCursor) {
          break;
        }

        // Update cursor for next iteration
        currentCursor = lastNextCursor;
        iterations++;
      }

      // Return only the requested limit of filtered casts
      const resultCasts = allFilteredCasts.slice(0, limit);
      
      // Determine the cursor to return
      // Encode both the API cursor and the last returned item's hash
      let cursorToReturn: string | undefined = undefined;
      
      if (resultCasts.length === limit && lastNextCursor) {
        const lastReturnedItem = resultCasts[resultCasts.length - 1];
        const lastHash = lastReturnedItem?.hash;
        // Encode cursor as "apiCursor|lastHash" to track position
        cursorToReturn = lastNextCursor + (lastHash ? `|${lastHash}` : "");
      }

      return res.status(200).json({
        casts: resultCasts,
        next: cursorToReturn ? { cursor: cursorToReturn } : undefined,
      });
    } else {
      // No filtering needed (filter === "all"), use simple pagination
      const url = `https://api.neynar.com/v2/farcaster/feed/user/casts/?limit=${limit}&include_replies=true&fid=${req.fid}${cursor ? `&cursor=${cursor}` : ""}`;

      const { data } = await axios.get(url, {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY as string,
        },
      });

      return res.status(200).json({
        casts: data.casts,
        next: data.next,
      });
    }
  } catch (error: any) {
    console.error("Error fetching user casts:", error);
    res.status(500).json({ error: "Error processing cast" });
  }
}

export default withHost(validateSignature(handler));
