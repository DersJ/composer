import { useState, useEffect, useRef } from "react";
import { useNDK } from "./useNDK";
import { Note } from "app/types";
import { fetchProfile } from "@/lib/nostr";
import { NDKEvent } from "@nostr-dev-kit/ndk";

interface UseRepliesResult {
  replies: Note[];
  totalReplyCount: number;
  displayedCount: number;
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  error: string | null;
}

export function useReplies(noteId: string | null, initialLimit: number = 8): UseRepliesResult {
  const { ndk } = useNDK();
  const [replies, setReplies] = useState<Note[]>([]);
  const [totalReplyCount, setTotalReplyCount] = useState(0);
  const [displayedCount, setDisplayedCount] = useState(initialLimit);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track processed events to avoid duplicates
  const processedEvents = useRef(new Set<string>());
  const allReplyEvents = useRef<NDKEvent[]>([]);
  const subscriptionRef = useRef<any>(null);

  // Helper function to create a basic reply note
  const createBasicReply = (event: NDKEvent): Note => ({
    id: event.id,
    pubkey: event.pubkey,
    event,
    author: {
      name: event.pubkey.slice(0, 8) + "...",
      picture: "",
      nip05: "",
    },
    stats: {
      replies: 0,
      reactions: 0,
      reposts: 0,
    },
    likedBy: [],
    replies: [],
  });

  // Helper function to enhance a reply with author profile
  const enhanceReplyWithProfile = async (reply: Note): Promise<Note> => {
    try {
      const profile = await fetchProfile(ndk!, reply.pubkey);
      if (profile) {
        return {
          ...reply,
          author: profile,
        };
      }
    } catch (error) {
      // Profile fetch failed, keep basic info
    }
    return reply;
  };

  // Process new reply event
  const processReplyEvent = async (event: NDKEvent) => {
    if (processedEvents.current.has(event.id)) return;
    
    processedEvents.current.add(event.id);
    allReplyEvents.current.push(event);
    setTotalReplyCount(allReplyEvents.current.length);

    // Only add to displayed replies if we're showing more than current count
    if (allReplyEvents.current.length <= displayedCount) {
      const basicReply = createBasicReply(event);
      
      // Add immediately with basic info
      setReplies(prev => [...prev, basicReply]);
      
      // Enhance with profile in background
      enhanceReplyWithProfile(basicReply).then(enhancedReply => {
        setReplies(prev => 
          prev.map(reply => 
            reply.id === event.id ? enhancedReply : reply
          )
        );
      });
    }
  };

  // Start subscription
  useEffect(() => {
    if (!ndk || !noteId) return;

    setLoading(true);
    setError(null);
    setReplies([]);
    setTotalReplyCount(0);
    processedEvents.current.clear();
    allReplyEvents.current = [];

    try {
      const subscription = ndk.subscribe({
        kinds: [1],
        "#e": [noteId],
      });

      subscriptionRef.current = subscription;

      subscription.on("event", (event: NDKEvent) => {
        processReplyEvent(event);
      });

      subscription.on("eose", () => {
        setLoading(false);
      });

      // Cleanup timeout
      const timeout = setTimeout(() => {
        setLoading(false);
      }, 5000);

      return () => {
        clearTimeout(timeout);
        subscription.stop();
      };

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load replies");
      setLoading(false);
    }
  }, [ndk, noteId]);

  // Load more replies
  const loadMore = async () => {
    if (!hasMore) return;

    const newDisplayedCount = Math.min(displayedCount + 8, totalReplyCount);
    const eventsToAdd = allReplyEvents.current.slice(displayedCount, newDisplayedCount);
    
    // Add basic replies immediately
    const basicReplies = eventsToAdd.map(createBasicReply);
    setReplies(prev => [...prev, ...basicReplies]);
    setDisplayedCount(newDisplayedCount);

    // Enhance with profiles in background
    eventsToAdd.forEach(async (event, index) => {
      const basicReply = basicReplies[index];
      const enhancedReply = await enhanceReplyWithProfile(basicReply);
      
      setReplies(prev => 
        prev.map(reply => 
          reply.id === event.id ? enhancedReply : reply
        )
      );
    });
  };

  const hasMore = displayedCount < totalReplyCount;

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.stop();
      }
    };
  }, []);

  return {
    replies,
    totalReplyCount,
    displayedCount,
    loading,
    hasMore,
    loadMore,
    error,
  };
}