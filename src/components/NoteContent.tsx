import React, { useEffect, useState } from "react";
import { NDKUser, NDKEvent } from "@nostr-dev-kit/ndk";
import { useNDK } from "../hooks/useNDK";
import { useNavigate } from "react-router-dom";
import NoteHeader from "./NoteHeader";
import { Author } from "app/types";
interface NoteContentProps {
  content: string;
  isQuotedNote?: boolean;
}

const isImageUrl = (url: string): boolean => {
  const pathname = new URL(url).pathname;
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(pathname);
};

const isVideoUrl = (url: string): boolean => {
  const pathname = new URL(url).pathname;
  return /\.(mp4|webm|ogg|mov|avi|wmv|flv|mpeg|m4v)$/i.test(pathname);
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

const isNoteReference = (word: string): boolean => {
  return word.startsWith("nostr:note") || word.startsWith("nostr:nevent");
};

const getNpubFromReference = (reference: string): string => {
  return reference.replace("nostr:", "").replace(".", "");
};

const getNoteIdFromReference = (reference: string): string => {
  return reference.replace("nostr:", "");
};

const isUrl = (word: string): boolean => {
  return /^(https?:\/\/|www\.)/i.test(word);
};

const normalizeUrl = (url: string): string => {
  return url.startsWith("www.") ? `https://${url}` : url;
};

export const NoteContent: React.FC<NoteContentProps> = ({
  content,
  isQuotedNote = false,
}) => {
  const { ndk } = useNDK();
  const navigate = useNavigate();
  const [userProfiles, setUserProfiles] = useState<Map<string, NDKUser>>(
    new Map()
  );
  const [quotedNotes, setQuotedNotes] = useState<Map<string, NDKEvent>>(
    new Map()
  );
  const [quotedNoteAuthors, setQuotedNoteAuthors] = useState<
    Map<string, Author>
  >(new Map());

  useEffect(() => {
    if (!isQuotedNote) {
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

      const fetchQuotedNotes = async () => {
        const words = content.split(/\s+/);
        const noteIds = words
          .filter(isNoteReference)
          .map(getNoteIdFromReference);

        if (noteIds.length === 0) return;

        const notes = new Map<string, NDKEvent>();
        const authors = new Map<string, Author>();

        for (const noteId of noteIds) {
          try {
            const event = await ndk?.fetchEvent(noteId);
            if (event) {
              notes.set(noteId, event);
              // Fetch the author's profile
              const author = await ndk?.getUser({ pubkey: event.pubkey });
              if (author) {
                await author.fetchProfile();
                authors.set(noteId, {
                  name: author.profile?.name,
                  picture: author.profile?.image,
                  nip05: author.profile?.nip05,
                });
              }
            }
          } catch (error) {
            console.error("Error fetching quoted note:", error);
          }
        }
        setQuotedNotes(notes);
        setQuotedNoteAuthors(authors);
      };

      fetchProfiles();
      fetchQuotedNotes();
    }
  }, [content, ndk, isQuotedNote]);

  const renderContent = (content: string) => {
    // Split content into lines first
    const lines = content.split("\n");

    return lines.map((line, lineIndex) => {
      const words = line.split(/\s+/);
      return (
        <React.Fragment key={`line-${lineIndex}`}>
          {words.map((word, wordIndex) => {
            if (isNostrReference(word)) {
              if (isQuotedNote) {
                return (
                  <span key={wordIndex} className="text-purple-700">
                    {word}{" "}
                  </span>
                );
              }
              const npub = getNpubFromReference(word);
              const user = userProfiles.get(npub);
              return (
                <a
                  key={wordIndex}
                  className="text-purple-700 hover:text-blue-700"
                  onClick={() => {
                    navigate(`/${npub}`);
                  }}
                >
                  @{user?.profile?.name || npub.slice(0, 8) + "..."}{" "}
                </a>
              );
            }

            if (isNoteReference(word)) {
              if (isQuotedNote) {
                return (
                  <span key={wordIndex} className="text-purple-700">
                    {word}{" "}
                  </span>
                );
              }
              const noteId = getNoteIdFromReference(word);
              const quotedNote = quotedNotes.get(noteId);
              const author = quotedNoteAuthors.get(noteId);

              if (quotedNote) {
                return (
                  <div
                    key={wordIndex}
                    className="mt-2 mb-2 p-4 border rounded-lg bg-gray-50"
                  >
                    <NoteHeader
                      author={author}
                      pubkey={quotedNote.pubkey}
                      createdAt={quotedNote.created_at!}
                    />
                    <NoteContent
                      content={quotedNote.content}
                      isQuotedNote={true}
                    />
                  </div>
                );
              }
              return <span key={wordIndex}>{word} </span>;
            }

            if (isUrl(word)) {
              const normalizedUrl = normalizeUrl(word);
              try {
                const url = new URL(normalizedUrl);
                const youtubeId = getYoutubeVideoId(url.toString());

                if (youtubeId) {
                  return (
                    <div
                      key={wordIndex}
                      className="mt-2 mb-2 max-w-full aspect-video"
                    >
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

                if (isVideoUrl(url.toString())) {
                  return (
                    <div
                      key={wordIndex}
                      className="mt-2 mb-2 max-w-full flex justify-center"
                    >
                      <video
                        src={url.toString()}
                        controls
                        className="max-h-[600px] w-auto"
                      />
                    </div>
                  );
                }

                if (isImageUrl(url.toString())) {
                  return (
                    <div
                      key={wordIndex}
                      className="mt-2 mb-2 max-w-full flex justify-center"
                    >
                      <img
                        src={url.toString()}
                        alt="Posted content"
                        className="rounded-lg max-h-[600px] w-auto object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  );
                }

                return (
                  <a
                    key={wordIndex}
                    href={url.toString()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {word}{" "}
                  </a>
                );
              } catch {
                return <span key={wordIndex}>{word} </span>;
              }
            }

            return <span key={wordIndex}>{word} </span>;
          })}
          {/* Add line break after each line except the last one */}
          {lineIndex < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="mt-2 whitespace-pre-wrap break-words">
      {renderContent(content)}
    </div>
  );
};
