import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useNDK } from "@/hooks/useNDK";
import { NDKUser } from "@nostr-dev-kit/ndk";
import { useEffect, useState } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import Note from "@/components/Note";

export default function ProfilePage() {
  const { identifier: npub } = useParams();
  const { ndk } = useNDK();
  const [user, setUser] = useState<NDKUser | null>(null);
  const [notes, setNotes] = useState<NDKEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!ndk || !npub) return;

      // Validate that this is an npub route
      if (!npub.startsWith("npub")) {
        setError("Invalid profile ID");
        setLoading(false);
        return;
      }

      try {
        const profileUser = ndk.getUser({ npub });
        await profileUser.fetchProfile();
        setUser(profileUser);

        // Fetch user's notes
        const events = await ndk.fetchEvents({
          kinds: [1],
          authors: [profileUser.pubkey],
          limit: 50,
        });

        const notesList = Array.from(events);
        setNotes(
          notesList.sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
        );
      } catch (e) {
        setError("Failed to load profile");
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [ndk, npub]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="mb-6 bg-red-50 border-red-200">
        <AlertDescription className="text-red-800">{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-4">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-4">
            {user?.profile?.image && (
              <img
                src={user.profile.image}
                alt={user.profile?.name || "Profile"}
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {user?.profile?.name || "Anonymous"}
              </h1>
              {user?.profile?.about && (
                <p className="text-gray-600">{user.profile.about}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent></CardContent>
      </Card>

      <h2 className="text-xl font-semibold mb-4">Recent Notes</h2>
      <div className="space-y-4">
        {notes.map((note) => (
          <Note
            key={note.id}
            note={{
              id: note.id,
              event: note,
              likedBy: [],
              stats: { replies: 0, reactions: 0, reposts: 0 },
            }}
          />
        ))}
      </div>
    </div>
  );
}
