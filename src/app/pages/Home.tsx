import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFeeds } from "@/contexts/FeedsContext";
import FeedDisplay from "../FeedDisplay";
import FeedManager from "app/FeedManager";
import RelayStatus from "@/components/RelayStatus";
import { Button } from "@/components/ui/button";
import { Info, Menu, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  const { feeds, activeFeed, setActiveFeed, loadFeeds } = useFeeds();
  const navigate = useNavigate();
  const [isFeedManagerOpen, setIsFeedManagerOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col">
      {/* Mobile Header */}
      <div className="md:hidden bg-background border-b p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFeedManagerOpen(!isFeedManagerOpen)}
            >
              {isFeedManagerOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Composer</h1>
              <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2 py-1 rounded-full">
                Alpha
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" onClick={() => navigate("/about")}>
              <Info className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:grid md:grid-cols-6 gap-6 min-h-0">
        {/* Feed Manager - Collapsible on mobile */}
        <div className={`md:col-span-2 bg-background border-b md:border-b-0 md:border-r transition-all duration-200 ease-in-out ${isFeedManagerOpen ? 'block' : 'hidden md:block'
          }`}>
          <div className="space-y-4 p-4 max-h-[40vh] md:max-h-screen overflow-auto">
            {/* Desktop Header */}
            <div className="hidden md:flex justify-between bg-background">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Composer</h1>
                <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2 py-1 rounded-full">
                  Alpha
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button variant="ghost" onClick={() => navigate("/about")}>
                  <Info className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <FeedManager
              feeds={feeds}
              activeFeed={activeFeed}
              onSelectFeed={(feed) => {
                setActiveFeed(feed);
                setIsFeedManagerOpen(false); // Auto-close on mobile after selection
              }}
              onCreateFeed={() => navigate("/build")}
              onDeleteFeed={() => {
                loadFeeds();
                setActiveFeed(feeds[0]);
              }}
            />
            <RelayStatus />
          </div>
        </div>

        {/* Feed Display */}
        <div className="flex-1 md:col-span-4 px-4 overflow-auto">
          {activeFeed && <FeedDisplay feed={activeFeed} />}
        </div>
      </div>
    </div>
  );
}
