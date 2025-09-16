import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DIAMOND_ADDRESS: `0x${string}` = "0x";

export const USDC_ADDRESS: `0x${string}` = "0x";

export const sleep = (timeout: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("slept");
    }, timeout);
  });
};
