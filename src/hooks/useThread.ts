import { useMemo, useState, useEffect } from "react";
import { useNDK } from "./useNDK";
import { Note } from "app/types";
import { fetchBareNote } from "@/lib/nostr";
interface ThreadResult {
  parentNotes: Map<string, Note>;
  loading: boolean;
  error: string | null;
}

export function useThread(note: Note | null): ThreadResult {
  const { ndk } = useNDK();
  const [parentNotes, setParentNotes] = useState<ThreadResult["parentNotes"]>(
    new Map()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract all parent IDs from the reply chain
  const parentNoteIds = useMemo(() => {
    if (!note?.event.tags) return [];

    const ids: string[] = [];
    const eTags = note.event.tags.filter((t) => t[0] === "e");

    // Add root tag if present
    const rootTag = eTags.find((t) => t[3] === "root");
    if (rootTag && !ids.includes(rootTag[1])) {
      ids.push(rootTag[1]);
    }

    // Add reply tag if present
    const replyTag = eTags.find((t) => t[3] === "reply");
    if (replyTag && !ids.includes(replyTag[1])) {
      ids.push(replyTag[1]);
    }
    // If no specific tags, use first e tag
    else if (eTags.length > 0 && !ids.includes(eTags[0][1])) {
      ids.push(eTags[0][1]);
    }

    return ids;
  }, [note]);

  useEffect(() => {
    async function fetchParentNotes() {
      
      
      if (!ndk || parentNoteIds.length === 0) {
        
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const notes: ThreadResult["parentNotes"] = new Map();
        const visited = new Set<string>();

        // Fetch each parent note and its parents recursively
        const fetchNote = async (id: string, depth = 0) => {
          
          
          if (visited.has(id)) {
            
            return;
          }
          
          if (depth > 10) {
            
            return;
          }
          
          visited.add(id);
          

          try {
            
            const parentNote = await fetchBareNote(ndk, id);
            notes.set(id, parentNote);
            

            // Look for parents of this note, but only if it's not a root note
            const eTags = parentNote.event.tags.filter((t) => t[0] === "e");
            const hasRootTag = eTags.some((t) => t[3] === "root");
            
            

            // Only continue fetching parents if this isn't a root note
            if (!hasRootTag) {
              
              for (const tag of eTags) {
                if (!visited.has(tag[1])) {
                  
                  await fetchNote(tag[1], depth + 1);
                }
              }
            } else {
              
            }
          } catch (err) {
            
          }
        };

        // Start fetching from our initial parent IDs
        
        for (const id of parentNoteIds) {
          await fetchNote(id, 0);
        }

        
        setParentNotes(notes);
        setLoading(false);
      } catch (err) {
        
        setError(
          err instanceof Error ? err.message : "Failed to fetch parent notes"
        );
        setLoading(false);
      }
    }

    fetchParentNotes();
  }, [ndk, parentNoteIds]);

  return {
    parentNotes,
    loading,
    error,
  };
}
