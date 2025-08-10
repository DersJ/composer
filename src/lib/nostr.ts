import NDK, { NDKEvent, NostrEvent } from "@nostr-dev-kit/ndk";
import { Note } from "app/types";
import { FEED_DEF_KIND } from "./utils";

interface ProgressiveNoteCallbacks {
  onInitialNote: (note: Note) => void;
  onAuthorLoaded: (author: Note['author']) => void;
  onReactionsLoaded: (reactions: Note['stats']['reactions'], likedBy: Note['likedBy']) => void;
  onRepostsLoaded: (reposts: number) => void;
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

    // Step 3: Fetch reactions/likes independently
    fetchNoteReactions(ndk, id).then(async (reactions) => {
      try {
        // Process likedBy (limit to 20 reactions)
        const reactionsLimit = Math.min(reactions.size, 20);
        const reactionsArray = Array.from(reactions).slice(0, reactionsLimit);

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

        callbacks.onReactionsLoaded(reactions.size, likedBy);
      } catch (error) {
        // Still call with basic reaction count if profile fetching fails
        callbacks.onReactionsLoaded(reactions.size, []);
      }
    }).catch(() => {
      // Error loading reactions, call with empty data
      callbacks.onReactionsLoaded(0, []);
    });

    // Step 4: Fetch reposts independently
    fetchNoteReposts(ndk, id).then((reposts) => {
      callbacks.onRepostsLoaded(reposts.size);
    }).catch(() => {
      callbacks.onRepostsLoaded(0);
    });

    // Note: Reply loading is now handled by the useReplies hook



  } catch (error) {

    callbacks.onError(error as Error);
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

// Fetch reactions/likes independently
export async function fetchNoteReactions(ndk: NDK, noteId: string, onReaction?: (reaction: NDKEvent) => void): Promise<Set<NDKEvent>> {
  return new Promise((resolve) => {
    const reactions = new Set<NDKEvent>();

    const reactionSub = ndk.subscribe({
      kinds: [7],
      "#e": [noteId],
    });

    const timeout = setTimeout(() => {
      reactionSub.stop();
      resolve(reactions);
    }, 5000);

    reactionSub.on("event", (event: NDKEvent) => {
      reactions.add(event);
      onReaction?.(event); // Optional callback for progressive loading
    });

    reactionSub.on("eose", () => {
      clearTimeout(timeout);
      reactionSub.stop();
      resolve(reactions);
    });
  });
}

// Fetch replies independently  
export async function fetchNoteReplies(ndk: NDK, noteId: string, onReply?: (reply: NDKEvent) => void): Promise<Set<NDKEvent>> {
  return new Promise((resolve) => {
    const replies = new Set<NDKEvent>();

    const replySub = ndk.subscribe({
      kinds: [1],
      "#e": [noteId],
    });

    const timeout = setTimeout(() => {
      replySub.stop();
      resolve(replies);
    }, 5000);

    replySub.on("event", (event: NDKEvent) => {
      replies.add(event);
      onReply?.(event); // Optional callback for progressive loading
    });

    replySub.on("eose", () => {
      clearTimeout(timeout);
      replySub.stop();
      resolve(replies);
    });
  });
}

// Fetch reposts independently
export async function fetchNoteReposts(ndk: NDK, noteId: string, onRepost?: (repost: NDKEvent) => void): Promise<Set<NDKEvent>> {
  return new Promise((resolve) => {
    const reposts = new Set<NDKEvent>();

    const repostSub = ndk.subscribe({
      kinds: [6],
      "#e": [noteId],
    });

    const timeout = setTimeout(() => {
      repostSub.stop();
      resolve(reposts);
    }, 5000);

    repostSub.on("event", (event: NDKEvent) => {
      reposts.add(event);
      onRepost?.(event); // Optional callback for progressive loading
    });

    repostSub.on("eose", () => {
      clearTimeout(timeout);
      repostSub.stop();
      resolve(reposts);
    });
  });
}

export const createNoteEvent = async (
  ndk: NDK,
  content: string,
  replyToNoteId?: string,
  replyToAuthorPubkey?: string
) => {
  if (!ndk.activeUser?.pubkey) {
    throw new Error("No active user");
  }

  const tags: string[][] = [];
  
  // Add reply tags if this is a reply
  if (replyToNoteId && replyToAuthorPubkey) {
    tags.push(["e", replyToNoteId, "", "reply"]);
    tags.push(["p", replyToAuthorPubkey]);
  }

  const noteEvent: NostrEvent = {
    kind: 1,
    tags,
    content: content.trim(),
    created_at: Math.floor(Date.now() / 1000),
    pubkey: ndk.activeUser.pubkey,
  };

  const event = new NDKEvent(ndk, noteEvent);
  return await event.publish();
};

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
