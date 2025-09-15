import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ExpansionPanelProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export function ExpansionPanel({
  title,
  children,
  defaultExpanded = false,
  className = "",
}: ExpansionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`space-y-2 ${className}`}>
      <Button
        variant="ghost"
        className="w-full justify-between p-2 h-auto"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="font-medium text-sm text-gray-600">{title}</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </Button>

      {isExpanded && (
        <div className="space-y-2 pl-2">
          {children}
        </div>
      )}
    </div>
  );
}