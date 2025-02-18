import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { Note, Feed } from "@/app/types";
import { NDKFilter } from "@nostr-dev-kit/ndk";

interface FeedState {
  notes: Note[];
  loading: boolean;
  loadMore: () => void;
  lastUpdated: number;
}

interface FeedCache {
  [feedId: string]: FeedState;
}

interface FeedContextType {
  currentFeed: Feed | null;
  setCurrentFeed: (feed: Feed) => void;
  feedCache: FeedCache;
  updateFeedCache: (feedId: string, state: FeedState) => void;
  clearFeedCache: (feedId?: string) => void;
  scrollPosition: number;
  setScrollPosition: (position: number) => void;
}

const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

const FeedContext = createContext<FeedContextType | undefined>(undefined);

export function FeedProvider({ children }: { children: ReactNode }) {
  const [currentFeed, setCurrentFeed] = useState<Feed | null>(null);
  const [feedCache, setFeedCache] = useState<FeedCache>({});
  const [scrollPosition, setScrollPosition] = useState(0);

  const updateFeedCache = (feedId: string, state: FeedState) => {
    setFeedCache((prev) => ({
      ...prev,
      [feedId]: {
        ...state,
        lastUpdated: Date.now(),
      },
    }));
  };

  const clearFeedCache = (feedId?: string) => {
    if (feedId) {
      setFeedCache((prev) => {
        const newCache = { ...prev };
        delete newCache[feedId];
        return newCache;
      });
    } else {
      setFeedCache({});
    }
  };

  // Clear expired cache entries
  const cleanupCache = () => {
    const now = Date.now();
    setFeedCache((prev) => {
      const newCache = { ...prev };
      Object.entries(newCache).forEach(([feedId, state]) => {
        if (now - state.lastUpdated > CACHE_EXPIRY) {
          delete newCache[feedId];
        }
      });
      return newCache;
    });
  };

  // Clean up expired cache every minute
  useEffect(() => {
    const interval = setInterval(cleanupCache, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <FeedContext.Provider
      value={{
        currentFeed,
        setCurrentFeed,
        feedCache,
        updateFeedCache,
        clearFeedCache,
        scrollPosition,
        setScrollPosition: (p: number) => {
          console.log("setting scroll position", p);
          setScrollPosition(p);
        },
      }}
    >
      {children}
    </FeedContext.Provider>
  );
}

export function useFeedContext() {
  const context = useContext(FeedContext);
  if (context === undefined) {
    throw new Error("useFeedContext must be used within a FeedProvider");
  }
  return context;
}
