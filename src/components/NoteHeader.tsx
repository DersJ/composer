import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Author } from "app/types";
import { nip19 } from "nostr-tools";
import { useNavigate } from "react-router-dom";

interface NoteHeaderProps {
  author?: Author;
  pubkey: string;
  createdAt: number;
}

const NoteHeader: React.FC<NoteHeaderProps> = ({
  author,
  pubkey,
  createdAt,
}) => {
  const navigate = useNavigate();

  const handleAuthorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const npub = nip19.npubEncode(pubkey);
    navigate(`/${npub}`);
  };

  return (
    <div className="flex justify-between">
      <div className="flex items-start space-x-4">
        <Avatar className="w-10 h-10 flex-shrink-0">
          {author?.picture && (
            <AvatarImage src={author.picture} alt={author.name || "Author"} />
          )}
          <AvatarFallback>
            {(author?.name?.[0] || pubkey.slice(0, 2)).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div
          className="flex-1 min-w-0 cursor-pointer hover:opacity-80"
          onClick={handleAuthorClick}
        >
          <div className="min-w-0 break-words">
            <h3 className="font-semibold truncate">
              {author?.name || pubkey.slice(0, 8)}
            </h3>
            {author?.nip05 && (
              <p className="text-sm text-gray-500 truncate">{author.nip05}</p>
            )}
          </div>
        </div>
      </div>
      <div className="text-sm text-gray-500">
        {new Date(createdAt * 1000).toLocaleString()}
      </div>
    </div>
  );
};

export default NoteHeader;
