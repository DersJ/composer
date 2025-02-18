import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import Note from "@/components/Note";
import { useFeed } from "@/hooks/useFeed";
import { Feed } from "@/app/types";
import { useNavigate } from "react-router-dom";
import { nip19 } from "nostr-tools";
import { useFeedContext } from "@/context/FeedContext";
import { useDebounce } from "@/hooks/useDebounce";

interface FeedDisplayProps {
  feed: Feed;
}

const FeedDisplay = ({ feed }: FeedDisplayProps) => {
  const navigate = useNavigate();
  const {
    setCurrentFeed,
    feedCache,
    updateFeedCache,
    scrollPosition,
    setScrollPosition,
  } = useFeedContext();

  // Get cached state or fetch new
  const cachedState = feedCache[feed.id];
  const { notes, loading, loadMore } = useFeed(
    feed.rules,
    cachedState?.notes || []
  );

  const loaderRef = useRef<HTMLDivElement>(null);

  const debouncedSetScrollPosition = useDebounce(setScrollPosition, 100);

  // Track scroll position with debounce
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        debouncedSetScrollPosition(window.scrollY);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [debouncedSetScrollPosition]);

  // Update cache when feed state changes
  useEffect(() => {
    if (!loading) {
      updateFeedCache(feed.id, {
        notes,
        loading,
        loadMore,
        lastUpdated: Date.now(),
      });
    }
  }, [feed.id, notes, loading, loadMore]);

  useEffect(() => {
    setCurrentFeed(feed);
  }, [feed, setCurrentFeed]);

  // Restore scroll position when component mounts
  useEffect(() => {
    window.scrollTo(0, scrollPosition);
  }, [scrollPosition]);

  const handleNoteClick = (noteId: string) => {
    navigate("/" + nip19.noteEncode(noteId));
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !loading) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: "100px",
        threshold: 0.1,
      }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [loading]);

  return (
    <div className="space-y-4">
      <h4>{notes.length} notes</h4>
      {notes.map((note) => (
        <Note
          key={note.id}
          note={note}
          onClick={() => handleNoteClick(note.id)}
          className="w-full hover:border-blue-400 transition-colors duration-200"
          showLikedBy={true}
        />
      ))}
      <div ref={loaderRef} className="h-4">
        {loading && (
          <div className="flex justify-center p-4">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedDisplay;
