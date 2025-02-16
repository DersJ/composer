import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const RELAYS: string[] = [
  "wss://relay.primal.net",
  "wss://relay.nostr.band",
  "wss://nos.lol",
  "wss://purplepag.es",
  "wss://relay.damus.io",
] as const;

export const FEED_DEF_KIND = 1808;
