import React, { useEffect, useState } from "react";
import { NDKUser } from "@nostr-dev-kit/ndk";
import { useNDK } from "../hooks/useNDK";

interface NoteContentProps {
  content: string;
}

const isImageUrl = (url: string): boolean => {
  const pathname = new URL(url).pathname;
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(pathname);
};

const getYoutubeVideoId = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes("youtube.com")) {
      return urlObj.searchParams.get("v");
    } else if (urlObj.hostname === "youtu.be") {
      return urlObj.pathname.slice(1);
    }
    return null;
  } catch {
    return null;
  }
};

const isNostrReference = (word: string): boolean => {
  return word.startsWith("nostr:npub");
};

const getNpubFromReference = (reference: string): string => {
  return reference.replace("nostr:", "");
};

export const NoteContent: React.FC<NoteContentProps> = ({ content }) => {
  const { ndk } = useNDK();
  const [userProfiles, setUserProfiles] = useState<Map<string, NDKUser>>(
    new Map()
  );

  useEffect(() => {
    const fetchProfiles = async () => {
      const words = content.split(/\s+/);
      const npubs = words.filter(isNostrReference).map(getNpubFromReference);

      if (npubs.length === 0) return;

      const profiles = new Map<string, NDKUser>();
      for (const npub of npubs) {
        try {
          const user = await ndk?.getUser({ npub });
          if (user) {
            await user.fetchProfile();
            profiles.set(npub, user);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      }
      setUserProfiles(profiles);
    };

    fetchProfiles();
  }, [content, ndk]);

  const renderContent = (content: string) => {
    const words = content.split(/\s+/);
    return words.map((word, index) => {
      if (isNostrReference(word)) {
        const npub = getNpubFromReference(word);
        const user = userProfiles.get(npub);
        return (
          <a
            key={index}
            href={`/p/${npub}`}
            className="text-purple-700 hover:text-blue-700"
          >
            @{user?.profile?.name || npub.slice(0, 8) + "..."}{" "}
          </a>
        );
      }

      try {
        const url = new URL(word);
        const youtubeId = getYoutubeVideoId(url.toString());

        if (youtubeId) {
          return (
            <div key={index} className="mt-2 mb-2 max-w-full aspect-video">
              <iframe
                className="w-full h-full rounded-lg"
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          );
        }

        if (isImageUrl(url.toString())) {
          return (
            <div key={index} className="mt-2 mb-2 max-w-full">
              <img
                src={url.toString()}
                alt="Posted content"
                className="rounded-lg max-h-[512px] object-cover w-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          );
        }
        return <span key={index}>{word} </span>;
      } catch {
        return <span key={index}>{word} </span>;
      }
    });
  };

  return (
    <div className="mt-2 whitespace-pre-wrap break-words">
      {renderContent(content)}
    </div>
  );
};
