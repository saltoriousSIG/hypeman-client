import { VercelRequest, VercelResponse } from "@vercel/node";
import { HypemanAI } from "../src/clients/HypemanAI.js";
import { RedisClient } from "../src/clients/RedisClient.js";
import axios from "axios";
import { withHost } from "../middleware/withHost.js";

const redisClient = new RedisClient(process.env.REDIS_URL as string);

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { fid, username, promotions } = req.body;
    const hypeman_ai = await HypemanAI.getInstance(fid, username);
    const user_casts: any = [];

    for (const promotion of promotions) {
      const user_cast_data = await redisClient.get(
        `user_cast:${fid}:${promotion.id}`
      );
      if (!user_cast_data) {
        const { data } = await axios.get(
          `https://api.neynar.com/v2/farcaster/cast/?type=url&identifier=${encodeURIComponent(promotion.cast_url)}`,
          {
            headers: {
              "x-api-key": process.env.NEYNAR_API_KEY as string,
            },
          }
        );
        const author = data.cast.author.username;
        const text = data.cast.text;
        const embed_context = data.cast.embeds
          .map((embed: any) => {
            if (embed.cast) {
              return {
                type: "cast",
                value: embed.cast.text,
              };
            } else if (embed.url) {
              return {
                type: "url",
                value: embed.url,
              };
            }
          })
          .filter((e: any) => e);
        const initialCast = await hypeman_ai.generateInitialCast(
          text,
          author,
          embed_context
        );
        const cast_obj = {
          id: promotion.id,
          generated_cast: initialCast.text,
          cast_author: author,
          cast_text: text,
          cast_embed_context: embed_context,
        };
        await redisClient.set(
          `user_cast:${fid}:${promotion.id}`,
          JSON.stringify(cast_obj)
        );
        user_casts.push(cast_obj);
      } else {
        const data =
          typeof user_cast_data === "string"
            ? JSON.parse(user_cast_data)
            : user_cast_data;
        user_casts.push(data);
      }
    }

    return res.status(200).json({ user_casts });
  } catch (e: any) {
    console.error(e.message, e);
    res.status(500).json({ error: "Error processing cast" });
  }
}

export default withHost(handler);
