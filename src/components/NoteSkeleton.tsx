import { cn } from "@/lib/utils";

interface NoteSkeletonProps {
  className?: string;
}

export default function NoteSkeleton({ className }: NoteSkeletonProps) {
  return (
    <div className={cn("animate-pulse bg-white rounded-lg border border-gray-200 p-4", className)}>
      {/* Header */}
      <div className="flex items-start space-x-3 mb-3">
        {/* Avatar */}
        <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
        
        {/* User info */}
        <div className="flex-1 space-y-1">
          <div className="h-3 bg-gray-200 rounded w-24" />
          <div className="h-2 bg-gray-200 rounded w-16" />
        </div>
        
        {/* Timestamp */}
        <div className="h-2 bg-gray-200 rounded w-12" />
      </div>
      
      {/* Content */}
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
      
      {/* Actions */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 bg-gray-200 rounded" />
          <div className="h-2 bg-gray-200 rounded w-4" />
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 bg-gray-200 rounded" />
          <div className="h-2 bg-gray-200 rounded w-4" />
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 bg-gray-200 rounded" />
          <div className="h-2 bg-gray-200 rounded w-4" />
        </div>
      </div>
    </div>
  );
}