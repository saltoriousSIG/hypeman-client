import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DIAMOND_ADDRESS: `0x${string}` =
  "0xcA14B4397d808d4d9b307a98BfE3DBDB917c7955";

export const USDC_ADDRESS: `0x${string}` =
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const sleep = (timeout: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("slept");
    }, timeout);
  });
};
