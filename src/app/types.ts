export interface FeedRule {
  id: string;
  subject: "Posts" | "Pictures";
  verb: "posted" | "trending" | "commented" | "liked" | "interacted";
  predicate: "followers" | "nostr" | "tribe";
  timeRange: "1hr" | "4hr" | "12hr" | "24hr" | "7d";
  weight: number;
}

export interface Feed {
  id: string;
  name: string;
  rules: FeedRule[];
} 