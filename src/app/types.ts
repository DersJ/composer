import { NDKEvent } from "@nostr-dev-kit/ndk";

export interface FeedRule {
  id: string;
  subject: "Posts" | "Pictures";
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

export interface Author {
  name?: string;
  picture?: string;
  nip05?: string;
}

export interface Note {
  id: string;
  event: NDKEvent;
  pubkey: string;
  author: {
    name?: string;
    picture?: string;
    nip05?: string;
  };
  stats: NoteStats;
  likedBy?: Array<{
    pubkey: string;
    profile?: {
      name?: string;
      picture?: string;
    };
  }>;
  replies?: Note[];
}
