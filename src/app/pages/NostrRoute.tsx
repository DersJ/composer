import { useParams, Navigate } from "react-router-dom";
import ProfilePage from "./ProfilePage";

export default function NostrRoute() {
  const { identifier } = useParams();

  if (!identifier) {
    return <Navigate to="/" />;
  }

  // Handle different nostr identifier types
  if (identifier.startsWith("npub")) {
    return <ProfilePage />;
  }

  // Add support for note1 when needed
  // if (identifier.startsWith('note1')) {
  //   return <NotePage />;
  // }

  // Handle invalid routes
  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800">Invalid Nostr identifier</p>
      </div>
    </div>
  );
}
