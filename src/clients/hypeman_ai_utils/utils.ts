import { Cast, Embed } from "@neynar/nodejs-sdk/build/api";
import axios from "axios";
import sharp from "sharp";

interface EmbedContext {
  // For image embeds
  metadata?: {
    content_type?: string;
    content_length?: number | null;
    image?: {
      width_px: number;
      height_px: number;
    };
    // For miniapp/frame embeds
    frame?: any;
    html?: any;
    _status?: string;
    [key: string]: any;
  };
  url?: string;
  // For cast embeds
  cast?: {
    text: string;
    author: {
      username: string;
      display_name?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  cast_id?: {
    fid: number;
    hash: string;
  };
  [key: string]: any; // Allow for other properties
}

export const sanitizeCasts = (
  casts: Cast[]
): {
  text: string;
  embeds: Embed[];
  author: string;
}[] => {
  return casts.map((cast) => ({
    text: cast.text.trim(),
    embeds: cast.embeds,
    author: cast.author.username,
  }));
};

export const extractImageFromEmbeds = (embedContext: EmbedContext[]): string[] => {
  if (!embedContext || embedContext.length === 0) return [];

  // Look for all embeds with image content_type in metadata
  const imageUrls: string[] = [];

  for (const embed of embedContext) {
    if (embed.metadata?.content_type?.startsWith("image/") && embed.url) {
      imageUrls.push(embed.url);
    }
  }

  return imageUrls;
};

export const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000,
    });

    const base64 = Buffer.from(response.data, "binary").toString("base64");

    return base64;
  } catch (error) {
    console.error("Failed to fetch image:", error);
    return null;
  }
};

export const compressImageIfNeeded = async (
  base64Image: string,
  maxSizeBytes: number = 5242880 // Exact 5MB limit
): Promise<string> => {
  try {
    const buffer = Buffer.from(base64Image, "base64");

    // Check if already under limit
    if (buffer.length <= maxSizeBytes) {
      return base64Image;
    }

    console.log(
      `Compressing image from ${(buffer.length / 1024 / 1024).toFixed(2)}MB`
    );

    // Explicitly type as Buffer to fix TS error
    let quality = 85;
    let compressed: Buffer = buffer;

    while (compressed.length > maxSizeBytes && quality > 20) {
      compressed = await sharp(buffer)
        .resize(2000, 2000, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality })
        .toBuffer();

      quality -= 10;
    }

    console.log(
      `Compressed to ${(compressed.length / 1024 / 1024).toFixed(2)}MB`
    );
    return compressed.toString("base64");
  } catch (error) {
    console.error("Compression failed:", error);
    return base64Image;
  }
};
