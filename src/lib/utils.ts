import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DIAMOND_ADDRESS: `0x${string}` =
  "0x23776630f8491829b3bd832689C37B07A614e71D";

export const USDC_ADDRESS: `0x${string}` =
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const sleep = (timeout: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("slept");
    }, timeout);
  });
};

export const extractUrls = (text: string): { text: string; urls: string[] } => {
  // Regex to match URLs (http/https)
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // Extract all URLs
  const urls = text.match(urlRegex) || [];

  // Remove URLs from text and clean up extra whitespace
  const cleanText = text.replace(urlRegex, "").replace(/\s+/g, " ").trim();

  return { text: cleanText, urls };
};

export const extractHashFromFCUrl = (uri: string) => {
  const urlObj = new URL(uri);
  const hash = urlObj.pathname.split("/").pop();
  return hash;
};

export const convertWarpcastUrlToCastHash = async (warpcastUrl: string): Promise<string> => {
  try {
    // Use Neynar API to get the cast data and extract the proper hash
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/cast?identifier=${encodeURIComponent(warpcastUrl)}&type=url`,
      {
        headers: {
          "x-api-key": process.env.NEYNAR_API_KEY as string,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch cast data: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.cast.hash;
  } catch (error) {
    console.error("Error converting Warpcast URL to cast hash:", error);
    throw error;
  }
};

// Example usage:
// const warpcastUrl = 'https://warpcast.com/hurls/0x53584562ccc4c84beca48bae375a8587645d3953';
// const castHash = await convertWarpcastUrlToCastHash(warpcastUrl);
// console.log(castHash); // Output: 0x80f4789802945d0f609d810336f719266b3b4368
