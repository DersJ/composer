import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Feed {
  id: string;
  name: string;
  rules: FeedRule[];
}

interface FeedRule {
  id: string;
  subject: "Posts" | "Pictures";
  verb: "posted" | "trending" | "commented" | "liked" | "interacted";
  predicate: "followers" | "nostr" | "tribe";
  timeRange: "1hr" | "4hr" | "12hr" | "24hr" | "7d";
  weight: number;
}

interface FeedManagerProps {
  feeds: Feed[];
  activeFeedId: string | null;
  onSelectFeed: (feedId: string) => void;
  onCreateFeed: () => void;
}

export default function FeedManager({
  feeds,
  activeFeedId,
  onSelectFeed,
  onCreateFeed,
}: FeedManagerProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Your Feeds</h3>
        <Button onClick={onCreateFeed} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Feed
        </Button>
      </div>

      <div className="space-y-2">
        {feeds.map((feed) => (
          <Card
            key={feed.id}
            className={`cursor-pointer transition-colors hover:bg-gray-50 
              ${activeFeedId === feed.id ? "border-primary" : ""}`}
            onClick={() => onSelectFeed(feed.id)}
          >
            <CardContent className="p-4">
              <div className="font-medium">{feed.name}</div>
              <div className="text-sm text-gray-500">
                {feed.rules.length} rules
              </div>
            </CardContent>
          </Card>
        ))}

        {feeds.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No feeds yet. Create your first feed to get started.
          </div>
        )}
      </div>
    </div>
  );
}
