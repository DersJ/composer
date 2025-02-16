import React from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Heart, Repeat2 } from "lucide-react";
import { NoteContent } from "./NoteContent";

interface NoteProps {
  note: {
    id: string;
    event: NDKEvent;
    author?: {
      name?: string;
      picture?: string;
      nip05?: string;
    };
    stats: {
      replies: number;
      reactions: number;
      reposts: number;
    };
    likedBy: Array<{
      pubkey: string;
      profile?: {
        name?: string;
        picture?: string;
      };
    }>;
  };
}

const Note: React.FC<NoteProps> = ({ note }) => {
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        {note.likedBy.length > 0 && (
          <div className="mt-1 mb-3 flex flex-wrap gap-2">
            <span className="text-sm text-gray-500">Liked by:</span>
            {note.likedBy.map((liker, i) => (
              <span key={liker.pubkey} className="text-sm text-gray-600">
                {liker.profile?.name || liker.pubkey.slice(0, 8)}
                {i < note.likedBy.length - 1 && ", "}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-start space-x-4">
          <Avatar className="w-10 h-10 flex-shrink-0">
            {note.author?.picture && (
              <AvatarImage
                src={note.author.picture}
                alt={note.author.name || "Author"}
              />
            )}
            <AvatarFallback>
              {(
                note.author?.name?.[0] || note.event.pubkey.slice(0, 2)
              ).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div className="min-w-0 break-words">
                <h3 className="font-semibold truncate">
                  {note.author?.name || note.event.pubkey.slice(0, 8)}
                </h3>
                {note.author?.nip05 && (
                  <p className="text-sm text-gray-500 truncate">
                    {note.author.nip05}
                  </p>
                )}
              </div>
              <span className="text-sm text-gray-500 flex-shrink-0">
                {new Date(note.event.created_at! * 1000).toLocaleString()}
              </span>
            </div>

            <NoteContent content={note.event.content} />

            <div className="flex items-center space-x-6 mt-4 text-gray-500">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>{note.stats.replies}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Heart className="w-4 h-4" />
                <span>{note.stats.reactions}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Repeat2 className="w-4 h-4" />
                <span>{note.stats.reposts}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Note;
