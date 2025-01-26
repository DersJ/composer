import { useEffect, useState, useRef, useCallback } from "react";
import NDK, { NDKEvent, NDKSubscription } from "@nostr-dev-kit/ndk";
import { createFilters, getTimeFromRange, type FeedRule } from "@/lib/rules";

export interface Note {
  id: string;
  event: NDKEvent;
  author?: {
    name?: string;
    picture?: string;
    nip05?: string;
  };
  stats: {
    replies: number;
    reactions: number;
    reposts: number;
  };
  likedBy: Array<{
    pubkey: string;
    profile?: {
      name?: string;
      picture?: string;
    };
  }>;
}

export function useFeed(ndk: NDK, rules: FeedRule[]) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [followedPubkeys, setFollowedPubkeys] = useState<string[]>([]);
  const subscriptions = useRef<NDKSubscription[]>([]);
  const profiles = useRef<Map<string, any>>(new Map());
  const likedEventIds = useRef<Set<string>>(new Set());
  const likesByEventId = useRef<Map<string, Set<string>>>(new Map());
  const [hasMore, setHasMore] = useState(true);
  const currentUntil = useRef<number>(Math.floor(Date.now() / 1000));
  const BATCH_SIZE = 20;

  // Fetch followers on mount
  useEffect(() => {
    const fetchFollowing = async () => {
      if (!ndk.activeUser?.pubkey) return;

      const followListEvent = await ndk.fetchEvent({
        kinds: [3],
        authors: [ndk.activeUser.pubkey],
      });

      if (followListEvent) {
        const pubkeys = followListEvent.tags
          .filter((tag) => tag[0] === "p")
          .map((tag) => tag[1]);
        setFollowedPubkeys(pubkeys);
      }
    };

    fetchFollowing();
  }, [ndk]);

  // Fetch a user's profile
  const fetchProfile = useCallback(
    async (pubkey: string) => {
      if (profiles.current.has(pubkey)) return profiles.current.get(pubkey);

      try {
        const event = await ndk.fetchEvent({
          kinds: [0],
          authors: [pubkey],
        });

        if (event) {
          const profile = JSON.parse(event.content);
          profiles.current.set(pubkey, profile);

          // Update notes authored by this user
          setNotes((prevNotes) =>
            prevNotes.map((note) =>
              note.event.pubkey === pubkey ? { ...note, author: profile } : note
            )
          );

          // Update likedBy profiles
          setNotes((prevNotes) =>
            prevNotes.map((note) => ({
              ...note,
              likedBy: note.likedBy.map((liker) =>
                liker.pubkey === pubkey ? { ...liker, profile } : liker
              ),
            }))
          );

          return profile;
        }
      } catch (error) {
        console.error(`Failed to fetch profile for ${pubkey}:`, error);
      }
    },
    [ndk]
  );

  // Handle like events
  const handleLikeEvent = useCallback(
    async (event: NDKEvent) => {
      const eventTag = event.tags.find((t) => t[0] === "e");
      if (!eventTag || event.content !== "+") return;

      const likedEventId = eventTag[1];
      likedEventIds.current.add(likedEventId);

      if (!likesByEventId.current.has(likedEventId)) {
        likesByEventId.current.set(likedEventId, new Set());
      }
      likesByEventId.current.get(likedEventId)?.add(event.pubkey);

      setNotes((prevNotes) => {
        const noteIndex = prevNotes.findIndex((n) => n.id === likedEventId);
        if (noteIndex === -1) return prevNotes;

        const updatedNotes = [...prevNotes];
        const note = { ...updatedNotes[noteIndex] };

        if (!note.likedBy.some((liker) => liker.pubkey === event.pubkey)) {
          note.likedBy.push({
            pubkey: event.pubkey,
            profile: profiles.current.get(event.pubkey),
          });
          note.stats.reactions++;
        }

        updatedNotes[noteIndex] = note;
        return updatedNotes;
      });

      if (!profiles.current.has(event.pubkey)) {
        fetchProfile(event.pubkey);
      }
    },
    [fetchProfile]
  );

  // Process incoming events
  const handleEvent = useCallback(
    async (event: NDKEvent) => {
      switch (event.kind) {
        case 1: {
          if (notes.some((n) => n.id === event.id)) return;

          const note: Note = {
            id: event.id,
            event,
            stats: {
              replies: 0,
              reactions: 0,
              reposts: 0,
            },
            likedBy: [],
          };

          const likers = likesByEventId.current.get(event.id);
          if (likers) {
            note.stats.reactions = likers.size;
            note.likedBy = Array.from(likers).map((pubkey) => ({
              pubkey,
              profile: profiles.current.get(pubkey),
            }));
          }

          setNotes((prev) => {
            // Create entries array with proper typing
            const entries: [string, Note][] = prev.map(n => [n.id, n]);
            entries.push([note.id, note]);
            
            // Create Map from entries and convert back to array
            const uniqueNotes = new Map(entries);
            return Array.from(uniqueNotes.values()).sort(
              (a, b) => (b.event.created_at || 0) - (a.event.created_at || 0)
            );
          });

          fetchProfile(event.pubkey);
          break;
        }

        case 7: {
          handleLikeEvent(event);
          break;
        }

        case 6: {
          const parentId = event.tags.find((t) => t[0] === "e")?.[1];
          if (parentId) {
            setNotes((prevNotes) => {
              const noteIndex = prevNotes.findIndex((n) => n.id === parentId);
              if (noteIndex === -1) return prevNotes;

              const updatedNotes = [...prevNotes];
              updatedNotes[noteIndex] = {
                ...updatedNotes[noteIndex],
                stats: {
                  ...updatedNotes[noteIndex].stats,
                  reposts: updatedNotes[noteIndex].stats.reposts + 1,
                },
              };
              return updatedNotes;
            });
          }
          break;
        }
      }
    },
    [notes, fetchProfile, handleLikeEvent]
  );

  const loadMore = useCallback(() => {
    if (!ndk || !followedPubkeys.length || !hasMore) return;

    console.log("Loading more...");

    // Clear existing subscriptions before creating new ones
    subscriptions.current.forEach((sub) => sub.stop());
    subscriptions.current = [];

    rules.forEach((rule) => {
      if (rule.verb === "liked") {
        const likeSub = ndk.subscribe({
          kinds: [7],
          authors: followedPubkeys,
          since: rule.timeRange ? getTimeFromRange(rule.timeRange) : undefined,
          until: currentUntil.current,
          limit: BATCH_SIZE,
        });

        likeSub.on("event", handleEvent);
        subscriptions.current.push(likeSub);

        likeSub.on("eose", () => {
          if (likedEventIds.current.size === 0) return;

          const noteSub = ndk.subscribe({
            kinds: [1],
            ids: Array.from(likedEventIds.current),
          });

          noteSub.on("event", handleEvent);
          subscriptions.current.push(noteSub);
        });
      } else {
        const filters = createFilters(rule, {
          followedPubkeys,
          limit: BATCH_SIZE,
          until: currentUntil.current,
        });

        filters.forEach((filter) => {
          const sub = ndk.subscribe(filter);
          
          let eventCount = 0;
          sub.on("event", (event) => {
            eventCount++;
            handleEvent(event);
          });

          sub.on("eose", () => {
            if (eventCount < BATCH_SIZE) {
              setHasMore(false);
            }
          });

          subscriptions.current.push(sub);
        });
      }
    });

    // Update the until timestamp for the next batch
    if (notes.length > 0) {
      currentUntil.current = Math.min(
        ...notes.map((note) => note.event.created_at || 0)
      );
    }
  }, [ndk, rules, followedPubkeys, hasMore, notes, handleEvent]);

  // Initial load
  useEffect(() => {
    if (!ndk || !followedPubkeys.length) return;

    subscriptions.current.forEach((sub) => sub.stop());
    subscriptions.current = [];
    setNotes([]);
    likedEventIds.current.clear();
    likesByEventId.current.clear();
    setLoading(true);
    setHasMore(true);
    currentUntil.current = Math.floor(Date.now() / 1000);

    loadMore();
    setLoading(false);

    return () => {
      subscriptions.current.forEach((sub) => sub.stop());
    };
  }, [ndk, rules, followedPubkeys]);

  return { notes, loading, hasMore, loadMore };
} 