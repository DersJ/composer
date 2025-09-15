import { NDKEvent } from "@nostr-dev-kit/ndk";

export interface FeedRule {
  id: string;
  subject: "Posts" | "Pictures" | "Replies";
  verb: "posted" | "trending" | "commented" | "liked" | "interacted";
  predicate: "follows" | "nostr" | "tribe";
  timeRange: "1hr" | "4hr" | "12hr" | "24hr" | "7d";
  weight: number;
}

export interface Feed {
  id: string;
  name: string;
  rules: FeedRule[];
}

export interface NoteStats {
  replies: number;
  reactions: number;
  reposts: number;
}

export interface Profile {
  name?: string;
  picture?: string;
  image?: string; // Some sources use 'image' instead of 'picture'
  nip05?: string;
  about?: string;
  display_name?: string;
  website?: string;
  lud16?: string; // Lightning address
  banner?: string;
}

export interface Author {
  name?: string;
  picture?: string;
  nip05?: string;
}

export interface Note {
  id: string;
  event: NDKEvent;
  pubkey: string;
  author?: Profile;
  stats: NoteStats;
  likedBy?: Array<{
    pubkey: string;
    profile?: Profile;
  }>;
  replies?: Note[];
}
