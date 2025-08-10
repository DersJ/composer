import { useState } from "react";
import { useNDK } from "./useNDK";
import { createNoteEvent } from "@/lib/nostr";

interface UseComposeResult {
  content: string;
  setContent: (content: string) => void;
  isPublishing: boolean;
  error: string | null;
  success: boolean;
  characterCount: number;
  maxCharacters: number;
  canPublish: boolean;
  publishNote: (replyToNoteId?: string, replyToAuthorPubkey?: string) => Promise<void>;
  reset: () => void;
}

export function useCompose(): UseComposeResult {
  const { ndk } = useNDK();
  const [content, setContent] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const maxCharacters = 280; // Twitter-like limit
  const characterCount = content.length;
  const canPublish = content.trim().length > 0 && characterCount <= maxCharacters && !isPublishing;

  const publishNote = async (replyToNoteId?: string, replyToAuthorPubkey?: string) => {
    if (!canPublish || !ndk) {
      return;
    }

    setIsPublishing(true);
    setError(null);
    setSuccess(false);

    try {
      await createNoteEvent(ndk, content, replyToNoteId, replyToAuthorPubkey);
      setSuccess(true);
      setContent(""); // Clear content on success
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish note");
    } finally {
      setIsPublishing(false);
    }
  };

  const reset = () => {
    setContent("");
    setError(null);
    setSuccess(false);
    setIsPublishing(false);
  };

  return {
    content,
    setContent,
    isPublishing,
    error,
    success,
    characterCount,
    maxCharacters,
    canPublish,
    publishNote,
    reset,
  };
}