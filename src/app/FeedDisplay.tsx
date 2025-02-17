import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import Note from "@/components/Note";
import { useFeed } from "@/hooks/useFeed";
import { Feed } from "@/app/types";
import { useNavigate } from "react-router-dom";
import { nip19 } from "nostr-tools";

interface FeedDisplayProps {
  feed: Feed;
}

const FeedDisplay = ({ feed }: FeedDisplayProps) => {
  const { notes, loading, loadMore } = useFeed(feed.rules);
  const loaderRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
          onClick={() => navigate("/" + nip19.noteEncode(note.id))}
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
