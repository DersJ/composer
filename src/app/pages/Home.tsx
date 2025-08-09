import { useNavigate } from "react-router-dom";
import { useFeeds } from "@/contexts/FeedsContext";
import FeedDisplay from "../FeedDisplay";
import FeedManager from "app/FeedManager";
import RelayStatus from "@/components/RelayStatus";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

export default function Home() {
  const { feeds, activeFeed, setActiveFeed, loadFeeds } = useFeeds();
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-6 min-h-0 sticky">
        <div className="space-y-4 p-4 col-span-2">
          <div className="flex justify-between bg-background">
            <h1 className="text-2xl font-bold">Composer</h1>
            <Button variant="ghost" onClick={() => navigate("/about")}>
              <Info className="w-4 h-4" />
            </Button>
          </div>
          <FeedManager
            feeds={feeds}
            activeFeed={activeFeed}
            onSelectFeed={setActiveFeed}
            onCreateFeed={() => navigate("/build")}
            onDeleteFeed={loadFeeds}
          />
          <RelayStatus />
        </div>

        <div className="col-span-4 px-4 md:overflow-auto">
          {activeFeed && <FeedDisplay feed={activeFeed} />}
        </div>
      </div>
    </div>
  );
}
