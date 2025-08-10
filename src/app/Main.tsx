import { Routes, Route } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, EyeIcon } from "lucide-react";
import Home from "./pages/Home";
import FeedBuilderPage from "./pages/FeedBuilderPage";
import { useNDK } from "hooks/useNDK";
import { useFeeds } from "@/contexts/FeedsContext";
import NostrRoute from "./pages/NostrRoute";
import About from "./pages/About";
import LoginScreen from "@/components/LoginScreen";

export default function Main() {
  const { ndk, loginWithKey } = useNDK();
  const { loading, error } = useFeeds();

  const isReadOnly = ndk?.activeUser && !ndk.signer;

  if (!ndk || !ndk.activeUser?.pubkey) {
    return <LoginScreen onLogin={loginWithKey} />;
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
