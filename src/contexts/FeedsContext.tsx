import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Feed, FeedRule } from "../app/types";
import { FEED_DEF_KIND } from "@/lib/utils";
import { useNDK } from "hooks/useNDK";
import {
  NDKSubscriptionCacheUsage,
  NDKSubscriptionOptions,
} from "@nostr-dev-kit/ndk";

interface FeedsContextType {
  feeds: Feed[];
  activeFeed: Feed | undefined;
  loading: boolean;
  error: string | undefined;
  setActiveFeed: (feed: Feed) => void;
  loadFeeds: () => Promise<void>;
}

const FeedsContext = createContext<FeedsContextType | undefined>(undefined);

const ACTIVE_FEED_KEY = "feedstr-activeFeedId";

export function FeedsProvider({ children }: { children: ReactNode }) {
  const { ndk } = useNDK();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [activeFeed, setActiveFeed] = useState<Feed | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const handleSetActiveFeed = (feed: Feed) => {
    setActiveFeed(feed);
    localStorage.setItem(ACTIVE_FEED_KEY, feed.id);
  };

  const loadFeeds = async () => {
    if (!ndk?.activeUser?.pubkey) return;

    try {
      const filter = {
        kinds: [FEED_DEF_KIND],
        authors: [ndk.activeUser.pubkey],
      };

      const opts: NDKSubscriptionOptions = {
        cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
      };

      const events = await ndk.fetchEvents(filter, opts);
      const loadedFeeds: Feed[] = [];

      for (const event of events) {
        try {
          const content = JSON.parse(event.content);
          loadedFeeds.push({
            id: event.id,
            name: content.name,
            rules: content.rules,
          });
        } catch (e) {
          console.error("Error parsing feed:", event.id);
        }
      }

      setFeeds(loadedFeeds);

      const storedFeedId = localStorage.getItem(ACTIVE_FEED_KEY);
      if (loadedFeeds.length > 0) {
        const storedFeed = loadedFeeds.find((feed) => feed.id === storedFeedId);
        setActiveFeed(storedFeed || loadedFeeds[0]);
      }
      setLoading(false);
    } catch (e) {
      console.error("Error loading feeds:", e);
      setError("Failed to load existing feeds");
    }
  };

  useEffect(() => {
    if (ndk?.activeUser?.pubkey) {
      loadFeeds();
    }
  }, [ndk?.activeUser?.pubkey]);

  const value = {
    feeds,
    activeFeed,
    loading,
    error,
    setActiveFeed: handleSetActiveFeed,
    loadFeeds,
  };

  return (
    <FeedsContext.Provider value={value}>{children}</FeedsContext.Provider>
  );
}

export function useFeeds() {
  const context = useContext(FeedsContext);
  if (context === undefined) {
    throw new Error("useFeeds must be used within a FeedsProvider");
  }
  return context;
}
