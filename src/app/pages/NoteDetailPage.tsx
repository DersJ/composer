import { useParams, useNavigate } from "react-router-dom";

import { Loader2, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Note from "@/components/Note";
import { nip19 } from "nostr-tools";
import { cn } from "@/lib/utils";
import { useThread } from "@/hooks/useThread";
import { useNote } from "hooks/useNote";
import { Note as NoteType } from "app/types";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function NoteDetailPage() {
  const { identifier } = useParams();
  const navigate = useNavigate();
  const [parentReplies, setParentReplies] = useState<NoteType[]>([]);

  if (!identifier) {
    return <div>Invalid note identifier</div>;
  }

  const { data: id } = nip19.decode(identifier);
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
  }, [parentNotes, note]);

  if (noteLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (noteError || threadError) {
    return (
      <Alert className="max-w-2xl mx-auto mt-4">
        <AlertDescription>{noteError || threadError}</AlertDescription>
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
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {threadLoading && (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}
      {!!rootNote && (
        <div className="">
          <Note note={rootNote} />
        </div>
      )}
      {/* Show thread of parent notes */}
      {parentReplies.map(
        (parent, index) =>
          parent && (
            <div
              key={parent.id}
              className={cn("ml-4 border-l-4 border-gray-200 pl-4")}
            >
              <Note note={parent} />
            </div>
          )
      )}

      {/* Show current note */}
      <div
        className={cn(
          parentNotes.size > 0 && "ml-4 border-l-4 border-gray-200 pl-4"
        )}
      >
        <Note note={note} />
      </div>

      {/* Show replies */}
      {!!note?.replies && (
        <div
          className={cn(
            "space-y-4",
            parentNotes.size > 0 && "ml-4 border-l-4 border-gray-200 pl-4"
          )}
        >
          {note.replies.map((reply) => (
            <Note key={reply.id} note={reply} />
          ))}
        </div>
      )}
    </div>
  );
}
