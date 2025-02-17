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

interface FeedsContextType {
  feeds: Feed[];
  activeFeed: Feed | undefined;
  loading: boolean;
  error: string | undefined;
  setActiveFeed: (feed: Feed) => void;
  loadFeeds: () => Promise<void>;
}

const FeedsContext = createContext<FeedsContextType | undefined>(undefined);

export function FeedsProvider({ children }: { children: ReactNode }) {
  const { ndk } = useNDK();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [activeFeed, setActiveFeed] = useState<Feed | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const loadFeeds = async () => {
    if (!ndk?.activeUser?.pubkey) return;

    try {
      const filter = {
        kinds: [FEED_DEF_KIND],
        authors: [ndk.activeUser.pubkey],
      };

      const events = await ndk.fetchEvents(filter);
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
      if (loadedFeeds.length > 0) {
        setActiveFeed(loadedFeeds[0]);
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
    setActiveFeed,
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
