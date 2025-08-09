import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function About() {
  const navigate = useNavigate();
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/")}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <h1 className="text-2xl font-bold">About Composer</h1>

      <p>Composer is a nostr client focusing on content discovery.</p>

      <h2 className="text-xl font-bold">Features</h2>

      <ul>
        <li>
          <span className="font-bold">Custom feeds:</span> Build your own
          algorithm.
        </li>
      </ul>

      <h2 className="text-xl font-bold">Tutorial</h2>
      <p>Create a custom feed to discover content based on your criteria.</p>
      <p>Use the </p>

      <h2 className="text-xl font-bold">Roadmap</h2>
      <ul>
        <li>
          <span className="font-bold">Custom feeds:</span> Add new filter
          options (pictures, tribe, custom lists, etc)
        </li>
        <li>
          <span className="font-bold">Write enable:</span> Add UI elements for
          writing and posting.
        </li>
        <li>
          <span className="font-bold">Zaps:</span> view and send zaps on notes.
        </li>
      </ul>
    </div>
  );
}
