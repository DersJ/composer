import { NDKEvent } from "@nostr-dev-kit/ndk";
import { Note, Profile } from "@/app/types";

export class FeedStateManager {
  private notes: Map<string, Note> = new Map();
  private profiles: Map<string, Profile> = new Map();
  private likedEventIds: Set<string> = new Set();
  private likesByEventId: Map<string, Set<string>> = new Map();

  addNote(event: NDKEvent): Note {
    // console.debug(`[FeedStateManager] Adding note ${event.id.slice(0, 8)}...`);
    const likers = this.getLikers(event.id);
    
    const note: Note = {
      id: event.id,
      event,
      pubkey: event.pubkey,
      author: this.profiles.get(event.pubkey),
      stats: {
        replies: 0,
        reactions: this.getLikeCount(event.id),
        reposts: 0,
      },
      likedBy: likers,
    };

    this.notes.set(event.id, note);
    // console.debug(`[FeedStateManager] Total notes: ${this.notes.size}`);
    return note;
  }

  addLike(event: NDKEvent, likedEventId: string) {
    this.likedEventIds.add(likedEventId);
    if (!this.likesByEventId.has(likedEventId)) {
      this.likesByEventId.set(likedEventId, new Set());
    }
    this.likesByEventId.get(likedEventId)?.add(event.pubkey);

    const note = this.notes.get(likedEventId);
    if (note) {
      note.stats.reactions = this.getLikeCount(likedEventId);
      note.likedBy = this.getLikers(likedEventId);
      // console.debug(
      //   `[FeedStateManager] Updated existing note reactions: ${note.stats.reactions}, likedBy: ${note.likedBy?.length}`
      // );
    } else {
      // console.debug(
      //   `[FeedStateManager] Note ${likedEventId.slice(0, 8)} not found for like - will be applied when note is added`
      // );
    }
  }

  addProfile(pubkey: string, profile: Profile) {
    // console.debug(
    //   `[FeedStateManager] Adding profile for ${pubkey.slice(0, 8)}`
    // );
    this.profiles.set(pubkey, profile);
    this.updateProfileReferences(pubkey, profile);
    // console.debug(`[FeedStateManager] Total profiles: ${this.profiles.size}`);
  }

  private getLikeCount(eventId: string): number {
    return this.likesByEventId.get(eventId)?.size || 0;
  }

  private getLikers(eventId: string) {
    const likers = this.likesByEventId.get(eventId);
    if (!likers) return [];

    return Array.from(likers).map((pubkey) => ({
      pubkey,
      profile: this.profiles.get(pubkey),
    }));
  }

  private updateProfileReferences(pubkey: string, profile: Profile) {
    // Update notes authored by this user
    for (const note of this.notes.values()) {
      if (note.event.pubkey === pubkey) {
        note.author = profile;
      }
      // Update likedBy profiles
      note.likedBy = note.likedBy?.map((liker) =>
        liker.pubkey === pubkey ? { ...liker, profile } : liker
      );
    }
  }

  getSortedNotes(): Note[] {
    return Array.from(this.notes.values()).sort(
      (a, b) => (b.event.created_at || 0) - (a.event.created_at || 0)
    );
  }

  clear() {
    this.notes.clear();
    this.likedEventIds.clear();
    this.likesByEventId.clear();
  }

  hasProfile(pubkey: string): boolean {
    return this.profiles.has(pubkey);
  }

  getProfile(pubkey: string): Profile | undefined {
    return this.profiles.get(pubkey);
  }

  hasNote(id: string): boolean {
    return this.notes.has(id);
  }

  getNote(id: string): Note | undefined {
    return this.notes.get(id);
  }

  addRepost(eventId: string) {
    const note = this.notes.get(eventId);
    if (note) {
      note.stats.reposts++;
    }
  }

  initializeFromNotes(notes: Note[]) {
    console.debug(`[FeedStateManager] Initializing from ${notes.length} notes`);
    notes.forEach((note) => {
      this.notes.set(note.id, note);
      if (note.author) {
        this.profiles.set(note.pubkey, note.author);
      }
      if (note.likedBy) {
        note.likedBy.forEach((liker) => {
          this.likedEventIds.add(note.id);
          if (!this.likesByEventId.has(note.id)) {
            this.likesByEventId.set(note.id, new Set());
          }
          this.likesByEventId.get(note.id)?.add(liker.pubkey);
          if (liker.profile) {
            this.profiles.set(liker.pubkey, liker.profile);
          }
        });
      }
    });
    console.debug(`[FeedStateManager] Initialization complete. States:`, {
      notes: this.notes.size,
      profiles: this.profiles.size,
      likedEvents: this.likedEventIds.size,
    });
  }
}
