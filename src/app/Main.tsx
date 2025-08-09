import { Routes, Route } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, EyeIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { nip19 } from "nostr-tools";
import Home from "./pages/Home";
import FeedBuilderPage from "./pages/FeedBuilderPage";
import { useNDK } from "hooks/useNDK";
import { useFeeds } from "@/contexts/FeedsContext";
import NostrRoute from "./pages/NostrRoute";
import About from "./pages/About";

export default function Main() {
  const { ndk, loginWithKey } = useNDK();
  const { loading, error } = useFeeds();
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState("");

  const isReadOnly = ndk?.activeUser && !ndk.signer;

  const handleKeySubmit = () => {
    setKeyError("");
    try {
      // Try to decode as nsec first
      if (keyInput.startsWith("nsec")) {
        const { data: privateKey } = nip19.decode(keyInput);
        loginWithKey(privateKey as string);
      }
      // Then try as npub
      else if (keyInput.startsWith("npub")) {
        const { data: publicKey } = nip19.decode(keyInput);
        loginWithKey(null, publicKey as string);
      } else {
        setKeyError("Please enter a valid nsec or npub key");
      }
    } catch (e) {
      setKeyError("Invalid key format");
    }
  };

  if (!ndk || !ndk.activeUser?.pubkey) {
    return (
      <Card className="max-w-lg mx-auto mt-8">
        <CardHeader>
          <CardTitle>Connect to Nostr</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Connect using a Nostr extension or enter your key manually
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              Connect with Extension
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter your nsec or npub (stored in memory, cleared on page reload)"
                value={keyInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setKeyInput(e.target.value)
                }
              />
              {keyError && <p className="text-sm text-red-500">{keyError}</p>}
              <Button
                onClick={handleKeySubmit}
                className="w-full"
                disabled={!keyInput}
              >
                Connect with Key
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {isReadOnly && (
        <div className="bg-yellow-50 border-b border-yellow-100 px-4 py-2 flex items-center justify-center gap-2">
          <EyeIcon className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-800">
            You are in read-only mode. Sign in with your private key to enable
            posting.
          </span>
          <Button
            variant="link"
            className="text-yellow-800 text-sm underline ml-2"
            onClick={() => window.location.reload()}
          >
            Switch Account
          </Button>
        </div>
      )}
      {error && (
        <Alert className="mb-6 bg-red-50 border-red-200">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}
      <div className="max-w-5xl mx-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/build" element={<FeedBuilderPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/:identifier" element={<NostrRoute />} />
        </Routes>
      </div>
    </div>
  );
}
