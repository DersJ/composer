import { useNavigate } from "react-router-dom";
import { useFeeds } from "@/contexts/FeedsContext";
import FeedDisplay from "../FeedDisplay";
import FeedManager from "app/FeedManager";
import RelayStatus from "@/components/RelayStatus";

export default function Home() {
  const { feeds, activeFeed, setActiveFeed } = useFeeds();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Feedstr</h1>
        {/* <Button onClick={() => navigate("/build")}>
          <Link to="/build">Create New Feed</Link>
        </Button> */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="space-y-4">
          <FeedManager
            feeds={feeds}
            activeFeed={activeFeed}
            onSelectFeed={setActiveFeed}
            onCreateFeed={() => navigate("/build")}
            onDeleteFeed={() => {}}
          />
          <RelayStatus />
        </div>

        <div className="md:col-span-2">
          {activeFeed && <FeedDisplay feed={activeFeed} />}
        </div>
      </div>
    </div>
  );
}
