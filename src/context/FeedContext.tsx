import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Note, Feed } from "@/app/types";
import { NDKFilter, NDKEvent } from "@nostr-dev-kit/ndk";
import { FeedRule } from "@/lib/rules";
import { useNDK } from "@/hooks/useNDK";
import { useActiveUser } from "@/hooks/useActiveUser";
import { FeedStateManager } from "@/lib/FeedStateManager";
import { FeedSubscriptionManager } from "@/lib/FeedSubscriptionManager";

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
  notes: Note[];
  loading: boolean;
  loadMore: () => void;
  scrollPosition: number;
  setScrollPosition: (position: number) => void;
}

const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 10;

const FeedContext = createContext<FeedContextType | undefined>(undefined);

export function FeedProvider({ children }: { children: ReactNode }) {
  const { ndk } = useNDK();
  const { followedPubkeys } = useActiveUser();
  const [currentFeed, setCurrentFeed] = useState<Feed | null>(null);
  const [feedCache, setFeedCache] = useState<FeedCache>({});
  const [scrollPosition, setScrollPosition] = useState(0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const stateManager = useRef(new FeedStateManager());
  const subscriptionManager = useRef<FeedSubscriptionManager>();
  const currentUntil = useRef<number>(Math.floor(Date.now() / 1000));
  const isLoadingMore = useRef(false);
  const previousRules = useRef<FeedRule[]>([]);

  useEffect(() => {
    if (ndk) {
      subscriptionManager.current = new FeedSubscriptionManager(ndk);
    }
  }, [ndk]);

  const fetchProfile = useCallback(
    async (pubkey: string) => {
      if (!ndk || stateManager.current.hasProfile(pubkey)) return;

      try {
        const event = await ndk.fetchEvent({
          kinds: [0],
          authors: [pubkey],
        });

        if (event) {
          const profile = JSON.parse(event.content);
          stateManager.current.addProfile(pubkey, profile);
          setNotes(stateManager.current.getSortedNotes());
        }
      } catch (error) {
        console.error(
          `Failed to fetch profile for ${pubkey.slice(0, 8)}:`,
          error
        );
      }
    },
    [ndk]
  );

  const handleEvent = useCallback(
    (event: NDKEvent) => {
      try {
        switch (event.kind) {
          case 1:
            const note = stateManager.current.addNote(event);
            setNotes(stateManager.current.getSortedNotes());
            if (!stateManager.current.hasProfile(event.pubkey)) {
              fetchProfile(event.pubkey);
            }
            break;

          case 7:
            const likedEventId = event.tags.find((t) => t[0] === "e")?.[1];
            if (likedEventId) {
              stateManager.current.addLike(event, likedEventId);
              setNotes(stateManager.current.getSortedNotes());
              if (!stateManager.current.hasProfile(event.pubkey)) {
                fetchProfile(event.pubkey);
              }
            }
            break;

          case 6:
            const repostedId = event.tags.find((t) => t[0] === "e")?.[1];
            if (repostedId) {
              stateManager.current.addRepost(repostedId);
              setNotes(stateManager.current.getSortedNotes());
            }
            break;
        }
      } catch (error) {
        console.error("Error handling event:", error, event);
      }
    },
    [fetchProfile]
  );

  const loadMore = useCallback(() => {
    if (
      !ndk ||
      !followedPubkeys.length ||
      isLoadingMore.current ||
      !currentFeed
    ) {
      return;
    }

    isLoadingMore.current = true;
    subscriptionManager.current?.subscribe(currentFeed.rules, {
      followedPubkeys,
      currentUntil: currentUntil.current,
      batchSize: BATCH_SIZE,
      onEvent: handleEvent,
      onComplete: () => {
        setLoading(false);
        isLoadingMore.current = false;
      },
    });
  }, [ndk, currentFeed, followedPubkeys, handleEvent]);

  // Handle feed changes
  useEffect(() => {
    if (!currentFeed) return;

    const rulesChanged =
      JSON.stringify(previousRules.current) !==
      JSON.stringify(currentFeed.rules);

    if (rulesChanged && ndk) {
      subscriptionManager.current?.unsubscribeAll();
      stateManager.current = new FeedStateManager();
      setNotes([]);
      setLoading(true);
      currentUntil.current = Math.floor(Date.now() / 1000);
      isLoadingMore.current = false;

      if (followedPubkeys.length) {
        loadMore();
      }

      previousRules.current = currentFeed.rules;
    }
  }, [currentFeed, ndk, followedPubkeys, loadMore]);

  const updateFeedCache = (feedId: string, state: FeedState) => {
    console.debug("[FeedProvider] Updating feed cache");
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
        notes,
        loading,
        loadMore,
        scrollPosition,
        setScrollPosition,
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
