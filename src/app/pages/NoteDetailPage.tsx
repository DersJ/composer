import { useParams, useNavigate } from "react-router-dom";

import { Loader2, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Note from "@/components/Note";
import NoteSkeleton from "@/components/NoteSkeleton";
import { nip19 } from "nostr-tools";
import { cn } from "@/lib/utils";
import { useThread } from "@/hooks/useThread";
import { useNote } from "hooks/useNote";
import { useReplies } from "@/hooks/useReplies";
import { Note as NoteType } from "app/types";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export default function NoteDetailPage() {
  const { identifier } = useParams();
  const navigate = useNavigate();
  const [parentReplies, setParentReplies] = useState<NoteType[]>([]);

 

  const id = useMemo(() => {
    return nip19.decode(identifier || "").data as string;
  }, [identifier])
  const {
    note,
    loading: noteLoading,
    error: noteError,
  } = useNote(id as string);
  const {
    parentNotes,
    loading: threadLoading,
    error: threadError,
  } = useThread(note);
  const {
    replies,
    totalReplyCount,
    loading: repliesLoading,
    hasMore,
    loadMore,
    error: repliesError,
  } = useReplies(id as string | null, 8);

  const isThreadContext = parentNotes.size > 0 || parentReplies.length > 0 || replies.length > 0;

  const rootNoteId = note?.event.tags.find((tag) => tag[3] === "root")?.[1];
  const rootNote = rootNoteId ? parentNotes.get(rootNoteId) : null;

  useEffect(() => {
    if (parentNotes.size === 0 || !note) {
      return;
    }

    const parentReplies: NoteType[] = [];

    function findParentReplies(note: NoteType) {
      const parentId = note.event.tags.find(
        (tag) => tag[0] === "e" && tag[3] === "reply"
      )?.[1];
      if (!parentId || parentId === rootNoteId) {
        return;
      }

      const parentNote = parentNotes.get(parentId);
      if (!parentNote) {
        return;
      }

      parentReplies.push(parentNote);

      findParentReplies(parentNote);
    }

    findParentReplies(note);

    setParentReplies(parentReplies.reverse());
  }, [parentNotes, note, rootNoteId]);

   // Determine if we should show threaded styling

  if (!identifier) {
    return <div>Invalid note identifier</div>;
  }

  // Show loading spinner only if main note is still loading
  if (noteLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }
  

  if (noteError) {
    return (
      <Alert className="max-w-2xl mx-auto mt-4">
        <AlertDescription>{noteError}</AlertDescription>
      </Alert>
    );
  }

  if (!note) return null;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* Show thread error if exists */}
      {threadError && (
        <Alert className="mb-4">
          <AlertDescription>
            Error loading thread: {threadError}
          </AlertDescription>
        </Alert>
      )}

      {/* Show root note or skeleton */}
      {rootNote ? (
        <div className="">
          <Note note={rootNote} showLikedBy={true} />
        </div>
      ) : threadLoading && parentNotes.size === 0 ? (
        <NoteSkeleton />
      ) : null}

      {/* Show parent thread or skeletons */}
      {threadLoading && parentReplies.length === 0 && parentNotes.size === 0 ? (
        // Show skeleton placeholders while loading
        <>
          <NoteSkeleton className="ml-4 border-l-4 border-gray-200 pl-4" />
          <NoteSkeleton className="ml-4 border-l-4 border-gray-200 pl-4" />
        </>
      ) : (
        /* Show actual parent notes */
        parentReplies.map(
          (parent, index) =>
            parent && (
              <div
                key={parent.id}
                className={cn("ml-4 border-l-4 border-gray-200 pl-4")}
              >
                <Note note={parent} showLikedBy={true} />
              </div>
            )
        )
      )}

      {/* Show current note - this should always be available once noteLoading is false */}
      <div
        className={cn(
          (parentNotes.size > 0 || parentReplies.length > 0) && "ml-4 border-l-4 border-gray-200 pl-4"
        )}
      >
        <Note note={note} showLikedBy={true} />
      </div>

      {/* Show replies section */}
      {repliesError && (
        <Alert className="mb-4">
          <AlertDescription>
            Error loading replies: {repliesError}
          </AlertDescription>
        </Alert>
      )}

      {/* Show replies */}
      {replies.length > 0 && (
        <div
          className={cn(
            "space-y-4",
            "ml-4 border-l-4 border-gray-200 pl-4" // Always show threaded styling for replies
          )}
        >
          {replies.map((reply) => (
            <Note key={reply.id} note={reply} showLikedBy={true} />
          ))}
          
          {/* Load more button */}
          {hasMore && (
            <div className="text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={repliesLoading}
              >
                {repliesLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  `Load more replies (${totalReplyCount - replies.length} remaining)`
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Show loading skeletons for initial load */}
      {repliesLoading && replies.length === 0 && (
        <div
          className={cn(
            "space-y-4",
            isThreadContext && "ml-4 border-l-4 border-gray-200 pl-4"
          )}
        >
          <NoteSkeleton />
          <NoteSkeleton />
        </div>
      )}
    </div>
  );
}
