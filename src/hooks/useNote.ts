import { fetchProfile, fetchNoteStats, fetchFullNote } from "@/lib/nostr";
import { useState, useEffect } from "react";
import { useNDK } from "./useNDK";
import NDK from "@nostr-dev-kit/ndk";
import { Note } from "app/types";

export function useNote(id: string) {
  const { ndk } = useNDK();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNote() {
      if (!ndk || !id) return;

      try {
        const note = await fetchFullNote(ndk, id);
        setNote(note);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load note");
      } finally {
        setLoading(false);
      }
    }

    fetchNote();
  }, [ndk, id]);

  return { note, loading, error };
}
