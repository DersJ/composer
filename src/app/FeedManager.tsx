import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { requestDeleteEvent } from "@/lib/nostr";
import { useNDK } from "hooks/useNDK";

interface Feed {
  id: string;
  name: string;
  rules: FeedRule[];
}

interface FeedRule {
  id: string;
  subject: "Posts" | "Pictures";
  verb: "posted" | "trending" | "commented" | "liked" | "interacted";
  predicate: "follows" | "nostr" | "tribe";
  timeRange: "1hr" | "4hr" | "12hr" | "24hr" | "7d";
  weight: number;
}

interface FeedManagerProps {
  feeds: Feed[];
  activeFeed: Feed | undefined;
  onSelectFeed: (feed: Feed) => void;
  onCreateFeed: () => void;
  onDeleteFeed: (feedId: string) => void;
}

function getRuleSummary(rule: FeedRule): string {
  return `${rule.subject} ${rule.verb} by ${rule.predicate} in last ${rule.timeRange}`;
}

const DEFAULT_FEED: Feed = {
  id: "default",
  name: "Default Feed",
  rules: [
    {
      id: "default-rule",
      subject: "Posts",
      verb: "posted",
      predicate: "follows",
      timeRange: "24hr",
      weight: 1,
    },
  ],
};

export default function FeedManager({
  feeds,
  activeFeed,
  onSelectFeed,
  onDeleteFeed,
}: FeedManagerProps) {
  const navigate = useNavigate();
  const { ndk } = useNDK();

  const deleteFeed = async (feedId: string) => {
    if (!ndk) return;
    await requestDeleteEvent(ndk, feedId);
    onDeleteFeed(feedId);
  };

  // Combine default feed with user feeds
  const allFeeds = [...feeds, DEFAULT_FEED];
  console.log(allFeeds);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Your Feeds</h3>
        <Button onClick={() => navigate("/build")} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Feed
        </Button>
      </div>

      <div className="space-y-2">
        {allFeeds
          .filter((feed) => feed?.rules?.length)
          .map((feed) => (
            <Card
              key={feed.id}
              className={`cursor-pointer transition-colors hover:bg-gray-50 
              ${activeFeed?.id === feed.id ? "border-primary" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1" onClick={() => onSelectFeed(feed)}>
                    <div className="font-medium">{feed.name}</div>
                    <div className="text-sm text-gray-500 mb-2">
                      {feed.rules.length} rule
                      {feed.rules.length === 1 ? "" : "s"}
                    </div>
                    <div className="space-y-1">
                      {feed.rules.map((rule, index) => (
                        <div key={rule.id} className="text-xs text-gray-600">
                          • {getRuleSummary(rule)}
                        </div>
                      ))}
                    </div>
                  </div>
                  {feed.id !== "default" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            "Are you sure you want to delete this feed?"
                          )
                        ) {
                          deleteFeed(feed.id);
                        }
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

        {feeds.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            Create a custom feed to see more tailored content.
          </div>
        )}
      </div>
    </div>
  );
}
