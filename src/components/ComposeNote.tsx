import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, X } from "lucide-react";
import { useCompose } from "@/hooks/useCompose";
import { cn } from "@/lib/utils";

interface ComposeNoteProps {
  onClose?: () => void;
  replyToNoteId?: string;
  replyToAuthorPubkey?: string;
  replyToContent?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function ComposeNote({
  onClose,
  replyToNoteId,
  replyToAuthorPubkey,
  replyToContent,
  placeholder = "What's happening?",
  autoFocus = false,
}: ComposeNoteProps) {
  const {
    content,
    setContent,
    isPublishing,
    error,
    success,
    characterCount,
    maxCharacters,
    canPublish,
    publishNote,
    reset,
  } = useCompose();

  const [showReplyContext, setShowReplyContext] = useState(!!replyToContent);

  const handlePublish = async () => {
    await publishNote(replyToNoteId, replyToAuthorPubkey);
    if (success) {
      onClose?.();
    }
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const isReply = !!replyToNoteId;
  const isOverLimit = characterCount > maxCharacters;

  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">
          {isReply ? "Reply" : "Compose Note"}
        </h3>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Reply context */}
      {isReply && replyToContent && showReplyContext && (
        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded border-l-4 border-blue-200">
          <div className="flex justify-between items-start">
            <p className="text-sm text-gray-600 line-clamp-3">
              {replyToContent.length > 150 
                ? replyToContent.slice(0, 150) + "..." 
                : replyToContent}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplyContext(false)}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Main compose area */}
      <div className="space-y-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          rows={4}
          autoFocus={autoFocus}
          disabled={isPublishing}
          className={cn(
            "resize-none",
            isOverLimit && "border-red-300 focus:border-red-500"
          )}
        />

        {/* Character count and publish controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span
              className={cn(
                "text-sm",
                isOverLimit ? "text-red-500" : "text-gray-500"
              )}
            >
              {characterCount}/{maxCharacters}
            </span>
            {isOverLimit && (
              <span className="text-xs text-red-500 font-medium">
                Character limit exceeded
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {onClose && (
              <Button variant="outline" onClick={handleClose} disabled={isPublishing}>
                Cancel
              </Button>
            )}
            <Button
              onClick={handlePublish}
              disabled={!canPublish}
              className="min-w-[80px]"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                isReply ? "Reply" : "Publish"
              )}
            </Button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Success display */}
        {success && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">
              {isReply ? "Reply published successfully!" : "Note published successfully!"}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}