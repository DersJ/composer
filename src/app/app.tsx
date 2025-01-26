import { useEffect, useState } from "react";
import NDK, { NDKEvent, NDKNip07Signer } from "@nostr-dev-kit/ndk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import FeedDisplay from "./FeedDisplay";
import { FEED_DEF_KIND, RELAYS } from "@/lib/utils";
import AlgorithmBuilder from "./FeedBuilder";
import FeedManager from "./FeedManager";
import { NDKProvider } from "../contexts/NDKContext";

// Type for our feed rules (matching AlgorithmBuilder)
interface FeedRule {
  id: string;
  subject: "Posts" | "Pictures";
  verb: "posted" | "trending" | "commented" | "liked" | "interacted";
  predicate: "followers" | "nostr" | "tribe";
  timeRange: "1hr" | "4hr" | "12hr" | "24hr" | "7d";
  weight: number;
}

// Update the interface for Feed
interface Feed {
  id: string;
  name: string;
  rules: FeedRule[];
}

function App() {
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [currentAlgorithm, setCurrentAlgorithm] = useState<FeedRule[] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [activeFeedId, setActiveFeedId] = useState<string | null>(null);

  // Initialize NDK with NIP-07 signer
  useEffect(() => {
    const initNdk = async () => {
      try {
        const signer = new NDKNip07Signer();
        const ndkInstance = new NDK({
          explicitRelayUrls: RELAYS,
          signer,
        });

        await ndkInstance.connect();
        setNdk(ndkInstance);

        // Get user's public key
        const user = await signer.user();
        if (user.npub) {
          setPublicKey(user.npub);
          // Load existing algorithm
          loadAlgorithm(ndkInstance, user.npub);
        }
      } catch (e) {
        setError(
          "Failed to initialize NDK. Please ensure you have a Nostr extension installed."
        );
      } finally {
        setLoading(false);
      }
    };

    initNdk();
  }, []);

  // Modify loadAlgorithm to load all feeds
  const loadAlgorithm = async (ndkInstance: NDK, userPubkey: string) => {
    try {
      const filter = {
        kinds: [FEED_DEF_KIND],
        authors: [userPubkey],
      };

      const events = await ndkInstance.fetchEvents(filter);
      const loadedFeeds: Feed[] = [];

      for (const event of events) {
        try {
          const content = JSON.parse(event.content);
          loadedFeeds.push({
            id: event.id,
            name: content.name,
            rules: content.rules,
          });
        } catch (e) {
          console.error("Error parsing feed:", e);
        }
      }

      setFeeds(loadedFeeds);
      if (loadedFeeds.length > 0) {
        setActiveFeedId(loadedFeeds[0].id);
        setCurrentAlgorithm(loadedFeeds[0].rules);
      }
    } catch (e) {
      console.error("Error loading feeds:", e);
      setError("Failed to load existing feeds");
    }
  };

  // Modify saveAlgorithm to save with a name
  const saveAlgorithm = async (
    rules: FeedRule[],
    name: string = "New Feed"
  ) => {
    if (!ndk || !publicKey) {
      setError("Not connected to Nostr");
      return;
    }

    try {
      setLoading(true);

      // const feedId = crypto.randomUUID();
      const event = new NDKEvent(ndk);
      event.kind = FEED_DEF_KIND;
      event.content = JSON.stringify({
        version: 1,
        name,
        rules,
      });

      // Add d-tag for identification
      event.tags = [["d", "feedstr"]];

      await event.publish();

      const newFeed: Feed = {
        id: event.id,
        name,
        rules,
      };

      setFeeds((prev) => [...prev, newFeed]);
      setActiveFeedId(event.id);
      setCurrentAlgorithm(rules);
      setError(null);
    } catch (e) {
      console.error("Error saving feed:", e);
      setError("Failed to save feed");
    } finally {
      setLoading(false);
    }
  };

  // Handler for creating a new feed
  const handleCreateFeed = () => {
    setCurrentAlgorithm([]);
    setActiveFeedId(null);
  };

  // Handler for selecting a feed
  const handleSelectFeed = (feedId: string) => {
    const feed = feeds.find((f) => f.id === feedId);
    if (feed) {
      setActiveFeedId(feedId);
      setCurrentAlgorithm(feed.rules);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!ndk || !publicKey) {
    return (
      <Card className="max-w-lg mx-auto mt-8">
        <CardHeader>
          <CardTitle>Connection Required</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Please install a Nostr extension (like nos2x or Alby) and grant
              permission to continue.
            </AlertDescription>
          </Alert>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry Connection
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <NDKProvider>
      <main className="container mx-auto py-8 px-4">
        {error && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <FeedManager
              feeds={feeds}
              activeFeedId={activeFeedId}
              onSelectFeed={handleSelectFeed}
              onCreateFeed={handleCreateFeed}
            />
          </div>

          <div className="lg:col-span-2">
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-4">Configure Your Feed</h2>
                <AlgorithmBuilder
                  onSave={saveAlgorithm}
                  initialRules={currentAlgorithm || []}
                />
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-4">Preview</h2>
                {currentAlgorithm && currentAlgorithm.length > 0 ? (
                  <FeedDisplay ndk={ndk} rules={currentAlgorithm} />
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                      Create your first feed algorithm to see content here
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </NDKProvider>
  );
}

export default App;
