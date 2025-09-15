import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Heart, Repeat2 } from "lucide-react";
import { NoteContent } from "./NoteContent";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNDK } from "hooks/useNDK";
import { Note as NoteType } from "app/types";
import NoteHeader from "./NoteHeader";
import { createLikeEvent, createRepostEvent } from "@/lib/nostr";
import { NpubMention } from "./NpubMention";
import { nip19 } from "nostr-tools";
import ComposeNote from "./ComposeNote";

interface NoteProps {
  note: NoteType;
  onClick?: () => void;
  className?: string;
  showLikedBy?: boolean;
}

const Note: React.FC<NoteProps> = ({
  note,
  onClick,
  className,
  showLikedBy,
}) => {
  const { ndk } = useNDK();
  const [isLiked, setIsLiked] = React.useState(false);
  const [showReplyCompose, setShowReplyCompose] = React.useState(false);

  const [replyingTo, setReplyingTo] = React.useState<string>("");
  const [isQuoteNote, setIsQuoteNote] = React.useState<boolean>(false);

  React.useEffect(() => {
    const fetchReplyingTo = async () => {
      // Check if this is a quote note (has q tags)
      const qTags = note.event.tags.filter((tag) => tag[0] === "q");
      const isQuote = qTags.length > 0;
      setIsQuoteNote(isQuote);

      // Only show "replying to" for actual replies (e tags), not quotes
      if (!isQuote) {
        const eTags = note.event.tags.filter((tag) => tag[0] === "e");
        if (eTags.length > 0) {
          // For replies, get the author of the note being replied to
          const pTags = note.event.tags.filter((tag) => tag[0] === "p");
          const tag = pTags[pTags.length - 1];
          setReplyingTo(tag?.[1] || "");
        }
      }
    };

    fetchReplyingTo();
  }, [note.event.tags]);

  const handleReply = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(); // Navigate to note detail page
    } else {
      setShowReplyCompose(true); // Show reply compose inline
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ndk || !ndk.activeUser?.pubkey || isLiked) return;

    try {
      const event = await createLikeEvent(ndk, note.id, note.event.pubkey);
      if (event) {
        setIsLiked(true);
      }
    } catch (error) {
      console.error("Failed to like note:", error);
    }
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ndk || !ndk.activeUser?.pubkey) return;

    try {
      await createRepostEvent(ndk, note.id, note.event.pubkey);
    } catch (error) {
      console.error("Failed to repost note:", error);
    }
  };

  return (
    <Card onClick={onClick} className={cn("w-full", className)}>
      <CardContent className="p-4">
        <div className="flex gap-4">
        {showLikedBy && !!note.likedBy?.length && (
          <div className="mt-1 mb-3 flex flex-wrap gap-2">
            <span className="text-sm text-gray-500">Liked by:</span>
            {note.likedBy?.map((liker, i) => (
              <span key={liker.pubkey} className="text-sm text-gray-600 dark:text-gray-400">
                {liker.profile?.name || liker.pubkey.slice(0, 8)}
                {i < (note.likedBy?.length || 0) - 1 && ", "}
              </span>
            ))}
          </div>
        )}
        {!!replyingTo && !isQuoteNote && (
          <div className="mt-1 mb-3 flex flex-wrap gap-2">
            <span className="text-sm text-gray-500">Replying to:</span>
            <NpubMention
              key={replyingTo + note.event.id}
              npub={nip19.npubEncode(replyingTo)}
            />
          </div>
        )}
        </div>

        <NoteHeader
          author={note.author}
          pubkey={note.event.pubkey}
          createdAt={note.event.created_at!}
        />

        <NoteContent content={note.event.content} />

        <div className="flex items-center space-x-6 mt-2 text-gray-500">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center space-x-2 p-2 h-auto"
            onClick={handleReply}
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center space-x-2 p-2 h-auto"
            onClick={handleLike}
          >
            <Heart
              className={cn("w-4 h-4", isLiked && "fill-current text-red-500")}
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center space-x-2 p-2 h-auto"
            onClick={handleRepost}
          >
            <Repeat2 className="w-4 h-4" />
          </Button>
          {process.env.NODE_ENV === "development" && (
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2 p-2 h-auto"
              onClick={(e) => {
                console.log(note);
                e.stopPropagation();
              }}
            >
              🐛
            </Button>
          )}
        </div>

        {/* Reply compose section */}
        {showReplyCompose && (
          <div className="mt-4 border-t pt-4">
            <ComposeNote
              onClose={() => setShowReplyCompose(false)}
              replyToNoteId={note.id}
              replyToAuthorPubkey={note.event.pubkey}
              replyToContent={note.event.content}
              placeholder="Write your reply..."
              autoFocus
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Note;
