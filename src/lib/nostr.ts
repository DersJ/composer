import NDK, { NDKEvent, NostrEvent } from "@nostr-dev-kit/ndk";
import { Note } from "app/types";
import { FEED_DEF_KIND } from "./utils";

interface ProgressiveNoteCallbacks {
  onInitialNote: (note: Note) => void;
  onAuthorLoaded: (author: Note['author']) => void;
  onStatsLoaded: (stats: Note['stats'], likedBy: Note['likedBy']) => void;
  onRepliesLoaded: (replies: Note['replies']) => void;
  onError: (error: Error) => void;
}

// Helper function to add timeout to promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

export async function fetchProgressiveNote(ndk: NDK, id: string, callbacks: ProgressiveNoteCallbacks): Promise<void> {
  
  
  try {
    // Step 1: Fetch the main event immediately
    const event = await withTimeout(
      ndk.fetchEvent(id), 
      10000, 
      "Timeout fetching main event"
    );

    if (!event) {
      throw new Error("Note not found");
    }
    
    

    // Return basic note immediately with minimal author info
    const initialNote: Note = {
      id,
      event,
      pubkey: event.pubkey,
      author: {
        name: event.pubkey.slice(0, 8) + "...", // Show truncated pubkey initially
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
    };

    callbacks.onInitialNote(initialNote);

    // Step 2: Fetch author profile
    try {
      const author = await withTimeout(
        fetchProfile(ndk, event.pubkey), 
        5000, 
        "Timeout fetching author profile"
      );

      const finalAuthor = author || {
        name: event.pubkey,
        picture: "",
        nip05: "",
      };

      callbacks.onAuthorLoaded(finalAuthor);
    } catch (error) {
      
      // Keep the initial author info, don't callback with error here
    }

    // Step 3: Fetch stats and likedBy
    try {
      const stats = await withTimeout(
        fetchNoteStats(ndk, id), 
        8000, 
        "Timeout fetching note stats"
      );

      const statsOutput = {
        replies: stats.replies.size || 0,
        reactions: stats.reactions.size || 0,
        reposts: stats.reposts.size || 0,
      };

      // Process likedBy (limit to 20 reactions)
      const reactionsLimit = Math.min(Array.from(stats.reactions).length, 20);
      const reactionsArray = Array.from(stats.reactions).slice(0, reactionsLimit);
      
      const likedByResults = await Promise.allSettled(
        reactionsArray.map(async (reaction) => {
          const profile = await withTimeout(
            fetchProfile(ndk, reaction.pubkey), 
            2000, 
            "Timeout fetching reaction profile"
          );
          return {
            pubkey: reaction.pubkey,
            profile: profile
              ? {
                  name: profile.name,
                  picture: profile.picture,
                }
              : undefined,
          };
        })
      );

      const likedBy = likedByResults
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);

      callbacks.onStatsLoaded(statsOutput, likedBy);

      // Step 4: Fetch replies (in background)
      try {
        const replyNotes: Note[] = [];
        const replyLimit = Math.min(Array.from(stats.replies).length, 10);
        const repliesArray = Array.from(stats.replies).slice(0, replyLimit);
        
        for (const replyEvent of repliesArray) {
          try {
            const replyAuthor = await withTimeout(
              fetchProfile(ndk, replyEvent.pubkey), 
              3000, 
              "Timeout fetching reply author"
            );

            replyNotes.push({
              id: replyEvent.id,
              pubkey: replyEvent.pubkey,
              event: replyEvent,
              author: replyAuthor || {
                name: replyEvent.pubkey,
                picture: "",
                nip05: "",
              },
              stats: {
                replies: 0,
                reactions: 0,
                reposts: 0,
              },
              likedBy: [],
            });
          } catch (error) {
            
            // Still add the reply with basic info
            replyNotes.push({
              id: replyEvent.id,
              pubkey: replyEvent.pubkey,
              event: replyEvent,
              author: {
                name: replyEvent.pubkey,
                picture: "",
                nip05: "",
              },
              stats: {
                replies: 0,
                reactions: 0,
                reposts: 0,
              },
              likedBy: [],
            });
          }
        }

        callbacks.onRepliesLoaded(replyNotes);
      } catch (error) {
        
        // Don't call error callback, just log the warning
      }

    } catch (error) {
      
      // Don't call error callback, just log the warning
    }

    
    
  } catch (error) {
    
    callbacks.onError(error as Error);
  }
}

export async function fetchFullNote(ndk: NDK, id: string): Promise<Note> {
  
  
  try {
    const event = await withTimeout(
      ndk.fetchEvent(id), 
      10000, 
      "Timeout fetching main event"
    );

    if (!event) {
      throw new Error("Note not found");
    }
    

    // Fetch author and stats in parallel with timeouts
    const [author, stats] = await Promise.allSettled([
      withTimeout(fetchProfile(ndk, event.pubkey), 5000, "Timeout fetching author profile"),
      withTimeout(fetchNoteStats(ndk, id), 8000, "Timeout fetching note stats")
    ]);

    

    const finalAuthor = author.status === 'fulfilled' && author.value ? author.value : {
      name: event.pubkey,
      picture: "",
      nip05: "",
    };

    const finalStats = stats.status === 'fulfilled' ? stats.value : {
      replies: new Set(),
      reactions: new Set(), 
      reposts: new Set()
    };

    let statsOutput = {
      replies: finalStats.replies.size || 0,
      reactions: finalStats.reactions.size || 0,
      reposts: finalStats.reposts.size || 0,
    };

    

    // Process replies with timeout and limit
    const replyNotes: Note[] = [];
    const replyLimit = Math.min(Array.from(finalStats.replies).length, 10); // Limit to 10 replies
    const repliesArray = Array.from(finalStats.replies).slice(0, replyLimit) as NDKEvent[];
    
    for (const replyEvent of repliesArray) {
      try {
        const replyAuthor = await withTimeout(
          fetchProfile(ndk, replyEvent.pubkey), 
          3000, 
          "Timeout fetching reply author"
        );

        replyNotes.push({
          id: replyEvent.id,
          pubkey: replyEvent.pubkey,
          event: replyEvent,
          author: replyAuthor || {
            name: replyEvent.pubkey,
            picture: "",
            nip05: "",
          },
          stats: {
            replies: 0,
            reactions: 0,
            reposts: 0,
          },
          likedBy: [],
        });
      } catch (error) {
        
        // Still add the reply with basic info
        replyNotes.push({
          id: replyEvent.id,
          pubkey: replyEvent.pubkey,
          event: replyEvent,
          author: {
            name: replyEvent.pubkey,
            picture: "",
            nip05: "",
          },
          stats: {
            replies: 0,
            reactions: 0,
            reposts: 0,
          },
          likedBy: [],
        });
      }
    }

    // Get likers with their profiles (with timeout and limit)
    const reactionsLimit = Math.min(Array.from(finalStats.reactions).length, 20); // Limit to 20 reactions
    const reactionsArray = Array.from(finalStats.reactions).slice(0, reactionsLimit);
    
    const likedByResults = await Promise.allSettled(
      reactionsArray.map(async (reaction: any) => {
        const profile = await withTimeout(
          fetchProfile(ndk, reaction.pubkey), 
          2000, 
          "Timeout fetching reaction profile"
        );
        return {
          pubkey: reaction.pubkey,
          profile: profile
            ? {
                name: profile.name,
                picture: profile.picture,
              }
            : undefined,
        };
      })
    );

    const likedBy = likedByResults
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);

    

    return {
      id,
      event,
      pubkey: event.pubkey,
      author: finalAuthor,
      stats: statsOutput,
      likedBy,
      replies: replyNotes,
    } as Note;
  } catch (error) {
    
    throw error;
  }
}

export async function fetchBareNote(ndk: NDK, id: string): Promise<Note> {
  const event = await ndk.fetchEvent(id);

  if (!event) {
    throw new Error("Note not found");
  }
  let author = await fetchProfile(ndk, event.pubkey);

  if (!author) {
    author = {
      name: event.pubkey,
      picture: "",
      nip05: "",
    };
  }

  let statsOutput = {
    replies: 0,
    reactions: 0,
    reposts: 0,
  };
  return {
    id,
    event,
    pubkey: event.pubkey,
    author,
    stats: statsOutput,
    likedBy: [],
    replies: [],
  } as Note;
}

export async function fetchProfile(ndk: NDK, pubkey: string) {
  try {
    const event = await ndk.fetchEvent({
      kinds: [0],
      authors: [pubkey],
    });

    if (event) {
      const profile = JSON.parse(event.content);
      return {
        name: profile.name,
        picture: profile.picture,
        nip05: profile.nip05,
      };
    }
  } catch (error) {
    
  }
  return undefined;
}

export async function fetchNoteStats(ndk: NDK, noteId: string) {
  const [replies, reactions, reposts] = await Promise.all([
    ndk.fetchEvents({ kinds: [1], "#e": [noteId] }),
    ndk.fetchEvents({ kinds: [7], "#e": [noteId] }),
    ndk.fetchEvents({ kinds: [6], "#e": [noteId] }),
  ]);

  return { replies, reactions, reposts };
}

export function processLikeEvent(
  event: NDKEvent,
  profiles: Map<string, any>,
  likedEventIds: Set<string>,
  likesByEventId: Map<string, Set<string>>
) {
  const eventTag = event.tags.find((t) => t[0] === "e");
  if (!eventTag || event.content !== "+") return null;

  const likedEventId = eventTag[1];
  likedEventIds.add(likedEventId);

  if (!likesByEventId.has(likedEventId)) {
    likesByEventId.set(likedEventId, new Set());
  }
  likesByEventId.get(likedEventId)?.add(event.pubkey);

  return { likedEventId };
}

export const createLikeEvent = async (
  ndk: NDK,
  noteId: string,
  authorPubkey: string
) => {
  if (!ndk.activeUser?.pubkey) {
    throw new Error("No active user");
  }

  const reaction: NostrEvent = {
    kind: 7,
    tags: [
      ["e", noteId],
      ["p", authorPubkey],
    ],
    content: "+",
    created_at: Math.floor(Date.now() / 1000),
    pubkey: ndk.activeUser.pubkey,
  };

  const reactionEvent = new NDKEvent(ndk, reaction);
  return await reactionEvent.publish();
};

export const createRepostEvent = async (
  ndk: NDK,
  noteId: string,
  authorPubkey: string
) => {
  if (!ndk.activeUser?.pubkey) {
    throw new Error("No active user");
  }

  const repost: NostrEvent = {
    kind: 6,
    tags: [
      ["e", noteId],
      ["p", authorPubkey],
    ],
    content: "",
    created_at: Math.floor(Date.now() / 1000),
    pubkey: ndk.activeUser.pubkey,
  };

  const repostEvent = new NDKEvent(ndk, repost);
  return await repostEvent.publish();
};

export const requestDeleteEvent = async (ndk: NDK, eventId: string) => {
  if (!ndk.activeUser?.pubkey) {
    throw new Error("No active user");
  }

  const deleteEvent = new NDKEvent(ndk, {
    kind: 5,
    tags: [
      ["e", eventId],
      ["k", `${FEED_DEF_KIND}`],
    ],
    content: "DELETE",
    pubkey: ndk.activeUser.pubkey,
    created_at: Math.floor(Date.now() / 1000),
  });

  

  return await deleteEvent.publish();
};
