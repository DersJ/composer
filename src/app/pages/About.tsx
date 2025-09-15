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

      <div className="space-y-4">
        <p className="text-gray-700">
          Create a custom feed to discover content based on your criteria. Follow these steps to build your first personalized feed:
        </p>

        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold">Step 1: Create a New Feed</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
              Click the "Create Feed" button on the home page to open the Feed Algorithm Builder.
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold">Step 2: Name Your Feed</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Give your feed a descriptive name like "Friends' Liked Posts" or "Latest Updates".
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold">Step 3: Add Rules</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click "Add Rule" to create filtering criteria. Each rule follows the pattern:
            </p>
            <div className="mt-2 p-2 bg-gray-50 rounded text-sm font-mono">
              [Subject] [Verb] by [Predicate]
            </div>
            <ul className="mt-2 text-xs text-gray-500 space-y-1">
              <li><strong>Subject:</strong> What type of content (Posts)</li>
              <li><strong>Verb:</strong> What action to look for (posted, liked)</li>
              <li><strong>Predicate:</strong> Who performed the action (follows)</li>
            </ul>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold">Step 4: Customize Rules</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Adjust each dropdown to match your interests. Multiple rules are automatically weighted equally.
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold">Step 5: Save & Enjoy</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click "Save Algorithm" to create your feed. It will appear in your feed list and start showing personalized content.
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h4 className="font-semibold text-blue-800 mb-2">Example Feed Rules</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <span className="font-mono">Posts liked by follows</span> - Content your network appreciates</li>
            <li>• <span className="font-mono">Posts posted by follows</span> - Latest updates from people you follow</li>
          </ul>
        </div>
      </div>

      <h2 className="text-xl font-bold">Roadmap</h2>
      <ul>
        <li>
          <span className="font-bold">More feed options:</span> Add new filter
          options (pictures, tribe, custom lists, etc)
        </li>
        <li>
          <span className="font-bold">Zaps:</span> view and send zaps on notes.
        </li>
      </ul>
    </div>
  );
}
