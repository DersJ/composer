import React from "react";
import { NDKEvent, NostrEvent } from "@nostr-dev-kit/ndk";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Heart, Repeat2 } from "lucide-react";
import { NoteContent } from "./NoteContent";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNDK } from "hooks/useNDK";
import { Note as NoteType } from "app/types";
import NoteHeader from "./NoteHeader";

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
  const [likeCount, setLikeCount] = React.useState(note.stats.reactions);

  const handleLike = async () => {
    if (!ndk || !ndk.activeUser?.pubkey || isLiked) return;

    try {
      const reaction: NostrEvent = {
        kind: 7,
        tags: [
          ["e", note.id],
          ["p", note.event.pubkey],
        ],
        content: "+",
        created_at: Math.floor(Date.now() / 1000),
        pubkey: ndk.activeUser?.pubkey,
      };
      const reactionEvent = new NDKEvent(ndk, reaction);

      const event = await reactionEvent.publish();
      if (event) {
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Failed to like note:", error);
    }
  };

  return (
    <Card onClick={onClick} className={cn("w-full", className)}>
      <CardContent className="p-4">
        {showLikedBy && !!note.likedBy?.length && (
          <div className="mt-1 mb-3 flex flex-wrap gap-2">
            <span className="text-sm text-gray-500">Liked by:</span>
            {note.likedBy?.map((liker, i) => (
              <span key={liker.pubkey} className="text-sm text-gray-600">
                {liker.profile?.name || liker.pubkey.slice(0, 8)}
                {i < (note.likedBy?.length || 0) - 1 && ", "}
              </span>
            ))}
          </div>
        )}
        <NoteHeader
          author={note.author}
          pubkey={note.event.pubkey}
          createdAt={note.event.created_at!}
        />

        <NoteContent content={note.event.content} />

        <div className="flex items-center space-x-6 mt-4 text-gray-500">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4" />
            <span>{note.stats.replies == 10 ? "10+" : note.stats.replies}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center space-x-2 p-0 h-auto"
            onClick={handleLike}
          >
            <Heart
              className={cn("w-4 h-4", isLiked && "fill-current text-red-500")}
            />
            <span>{likeCount == 10 ? "10+" : likeCount}</span>
          </Button>
          <div className="flex items-center space-x-2">
            <Repeat2 className="w-4 h-4" />
            <span>{note.stats.reposts == 10 ? "10+" : note.stats.reposts}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center space-x-2 p-0 h-auto"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            🐛
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Note;
