import { useEffect, useState, useRef, useCallback } from "react";
import NDK, { NDKEvent, NDKSubscription, NDKFilter } from "@nostr-dev-kit/ndk";
import { createFilters, getTimeFromRange, type FeedRule } from "@/lib/rules";
import { useNDK } from "./useNDK";
import { processLikeEvent } from "@/lib/nostr";
import { Note } from "@/app/types";

export function useFeed(rules: FeedRule[], initialNotes: Note[] = []) {
  const { ndk } = useNDK();
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [loading, setLoading] = useState(!initialNotes.length);
  const [followedPubkeys, setFollowedPubkeys] = useState<string[]>([]);
  const subscriptions = useRef<NDKSubscription[]>([]);
  const profiles = useRef<Map<string, any>>(new Map());
  const likedEventIds = useRef<Set<string>>(new Set());
  const likesByEventId = useRef<Map<string, Set<string>>>(new Map());
  const currentUntil = useRef<number>(Math.floor(Date.now() / 1000));
  const BATCH_SIZE = 10;
  const isLoadingMore = useRef(false);

  // Fetch followers on mount
  useEffect(() => {
    const fetchFollowing = async () => {
      if (!ndk || !ndk.activeUser?.pubkey) return;

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
        const event = await ndk?.fetchEvent({
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
              likedBy: note.likedBy?.map((liker) =>
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
      const result = processLikeEvent(
        event,
        profiles.current,
        likedEventIds.current,
        likesByEventId.current
      );
      if (!result) return;

      const { likedEventId } = result;

      setNotes((prevNotes) => {
        const noteIndex = prevNotes.findIndex((n) => n.id === likedEventId);
        if (noteIndex === -1) return prevNotes;

        const updatedNotes = [...prevNotes];
        const note = { ...updatedNotes[noteIndex] };

        if (!note.likedBy?.some((liker) => liker.pubkey === event.pubkey)) {
          note.likedBy?.push({
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
    [ndk]
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
            pubkey: event.pubkey,
            author: profiles.current.get(event.pubkey),
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
            const entries: [string, Note][] = prev.map((n) => [n.id, n]);
            entries.push([note.id, note]);

            const uniqueNotes = new Map(entries);
            const sortedNotes = Array.from(uniqueNotes.values()).sort(
              (a, b) => (b.event.created_at || 0) - (a.event.created_at || 0)
            );

            // Update currentUntil after we've processed a batch of events
            if (isLoadingMore.current) {
              const oldestTimestamp = Math.min(
                ...sortedNotes.map((note) => note.event.created_at || 0)
              );
              currentUntil.current = oldestTimestamp - 1;
            }

            return sortedNotes;
          });

          // Only fetch profile if we don't already have it
          if (!profiles.current.has(event.pubkey)) {
            fetchProfile(event.pubkey);
          }
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
    if (!ndk || !followedPubkeys.length || isLoadingMore.current) return;

    isLoadingMore.current = true;

    // Don't clear existing subscriptions, just create new ones for the next batch
    const newSubs: NDKSubscription[] = [];

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
          sub.on("event", handleEvent);

          // Add EOSE handler to know when batch is complete
          sub.on("eose", () => {
            isLoadingMore.current = false;
          });

          newSubs.push(sub);
        });
      }
    });

    subscriptions.current = [...subscriptions.current, ...newSubs];
  }, [ndk, rules, followedPubkeys, handleEvent]);

  // Initial load
  useEffect(() => {
    if (!ndk || !followedPubkeys.length) return;

    // Only clear everything if we don't have initial notes
    if (initialNotes.length === 0) {
      subscriptions.current.forEach((sub) => sub.stop());
      subscriptions.current = [];
      setNotes([]);
      likedEventIds.current.clear();
      likesByEventId.current.clear();
      setLoading(true);
      currentUntil.current = Math.floor(Date.now() / 1000);
    }

    // Initialize likedEventIds and likesByEventId from initialNotes
    initialNotes.forEach((note) => {
      if (note.likedBy) {
        note.likedBy.forEach((liker) => {
          likedEventIds.current.add(note.id);
          if (!likesByEventId.current.has(note.id)) {
            likesByEventId.current.set(note.id, new Set());
          }
          likesByEventId.current.get(note.id)?.add(liker.pubkey);
        });
      }
    });

    loadMore();
    setLoading(false);

    return () => {
      subscriptions.current.forEach((sub) => sub.stop());
    };
  }, [ndk, rules, followedPubkeys, initialNotes.length]);

  useEffect(() => {
    currentUntil.current = Math.floor(Date.now() / 1000);
  }, [rules]);

  return { notes, loading, loadMore };
}
