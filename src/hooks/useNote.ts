import { fetchProfile, fetchNoteStats, fetchProgressiveNote } from "@/lib/nostr";
import { useState, useEffect } from "react";
import { useNDK } from "./useNDK";
import { Note } from "app/types";

interface ProgressiveNoteState {
  note: Note | null;
  loading: {
    initial: boolean;
    author: boolean;
    stats: boolean;
    replies: boolean;
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
      stats: false,
      replies: false,
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
      onStatsLoaded: (stats, likedBy) => {
        
        updateNote(prev => prev ? { ...prev, stats, likedBy } : null);
        updateLoading('stats', false);
      },
      onRepliesLoaded: (replies) => {
        
        updateNote(prev => prev ? { ...prev, replies } : null);
        updateLoading('replies', false);
      },
      onError: (error) => {
        
        setState(prevState => ({
          ...prevState,
          error: error.message,
          loading: {
            initial: false,
            author: false,
            stats: false,
            replies: false,
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
