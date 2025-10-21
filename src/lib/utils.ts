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

