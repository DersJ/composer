import NDK, { NDKEvent } from "@nostr-dev-kit/ndk";
import { Note } from "app/types";

export async function fetchFullNote(ndk: NDK, id: string): Promise<Note> {
  const event = await ndk.fetchEvent(id);

  if (!event) {
    throw new Error("Note not found");
  }

  let author = await fetchProfile(ndk, event.pubkey);
  let stats = await fetchNoteStats(ndk, id);

  if (!author) {
    author = {
      name: event.pubkey,
      picture: "",
      nip05: "",
    };
  }

  let statsOutput = {
    replies: stats.replies.size || 0,
    reactions: stats.reactions.size || 0,
    reposts: stats.reposts.size || 0,
  };

  // Process replies
  const replyNotes: Note[] = [];
  for (const replyEvent of stats.replies) {
    const replyAuthor = await fetchProfile(ndk, replyEvent.pubkey);

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
  }

  // Get likers with their profiles
  const likedBy = await Promise.all(
    Array.from(stats.reactions).map(async (reaction) => {
      const profile = await fetchProfile(ndk, reaction.pubkey);
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

  return {
    id,
    event,
    pubkey: event.pubkey,
    author,
    stats: statsOutput,
    likedBy,
    replies: replyNotes,
  } as Note;
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
    console.error(`Failed to fetch profile for ${pubkey}:`, error);
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
