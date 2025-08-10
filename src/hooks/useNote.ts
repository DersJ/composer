import { fetchProgressiveNote } from "@/lib/nostr";
import { useState, useEffect } from "react";
import { useNDK } from "./useNDK";
import { Note } from "app/types";

interface ProgressiveNoteState {
  note: Note | null;
  loading: {
    initial: boolean;
    author: boolean;
    reactions: boolean;
    replies: boolean;
    reposts: boolean;
  };
  error: string | null;
}

export function useNote(id: string) {
  const { ndk } = useNDK();
  const [state, setState] = useState<ProgressiveNoteState>({
    note: null,
    loading: {
      initial: true,
      author: false,
      reactions: false,
      replies: false,
      reposts: false,
    },
    error: null,
  });

  useEffect(() => {
    if (!ndk || !id) {
      return;
    }



    const updateNote = (updater: (prev: Note | null) => Note | null) => {
      setState(prevState => ({
        ...prevState,
        note: updater(prevState.note),
      }));
    };

    const updateLoading = (field: keyof ProgressiveNoteState['loading'], value: boolean) => {
      setState(prevState => ({
        ...prevState,
        loading: {
          ...prevState.loading,
          [field]: value,
        },
      }));
    };

    fetchProgressiveNote(ndk, id, {
      onInitialNote: (baseNote) => {

        updateNote(() => baseNote);
        updateLoading('initial', false);
      },
      onAuthorLoaded: (author) => {

        updateNote(prev => prev ? { ...prev, author } : null);
        updateLoading('author', false);
      },
      onReactionsLoaded: (reactionCount, likedBy) => {
        updateNote(prev => prev ? {
          ...prev,
          stats: { ...prev.stats, reactions: reactionCount },
          likedBy
        } : null);
        updateLoading('reactions', false);
      },
      onRepliesLoaded: (replies, replyCount) => {
        updateNote(prev => prev ? {
          ...prev,
          replies,
          stats: { ...prev.stats, replies: replyCount }
        } : null);
        updateLoading('replies', false);
      },
      onRepliesUpdated: (replies) => {
        // Progressive update of replies as author profiles load
        updateNote(prev => prev ? { 
          ...prev, 
          replies
        } : null);
      },
      onRepostsLoaded: (repostCount) => {
        updateNote(prev => prev ? {
          ...prev,
          stats: { ...prev.stats, reposts: repostCount }
        } : null);
        updateLoading('reposts', false);
      },
      onError: (error) => {

        setState(prevState => ({
          ...prevState,
          error: error.message,
          loading: {
            initial: false,
            author: false,
            reactions: false,
            replies: false,
            reposts: false,
          },
        }));
      },
    });
  }, [ndk, id]);

  return {
    note: state.note,
    loading: state.loading.initial,
    loadingDetails: state.loading,
    error: state.error,
  };
}
