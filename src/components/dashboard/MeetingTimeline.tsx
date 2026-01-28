import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDuration } from "@/lib/conversations";
import { Clock, Flag, Milestone } from "lucide-react";
import type { MeetingItem } from "@/hooks/useMeetingItems";

interface TimelineEvent {
  id: string;
  type: "item" | "marker";
  timestampMs: number;
  itemType?: MeetingItem["type"];
  content: string;
}

interface MeetingTimelineProps {
  items: MeetingItem[];
  durationMs: number;
  onSeek?: (timeMs: number) => void;
}

const ITEM_COLORS: Record<string, string> = {
  action_item: "bg-primary",
  decision: "bg-green-500",
  question: "bg-purple-500",
  deferred: "bg-amber-500",
};

const ITEM_LABELS: Record<string, string> = {
  action_item: "Action",
  decision: "Decision",
  question: "Question",
  deferred: "Deferred",
};

export function MeetingTimeline({ items, durationMs, onSeek }: MeetingTimelineProps) {
  // Sort items by timestamp
  const sortedItems = React.useMemo(() => 
    [...items].sort((a, b) => a.timestampMs - b.timestampMs),
    [items]
  );

  // Generate timeline markers at 5-minute intervals
  const markers = React.useMemo(() => {
    const result: Array<{ timeMs: number; label: string }> = [];
    const intervalMs = 5 * 60 * 1000; // 5 minutes
    
    for (let t = 0; t <= durationMs; t += intervalMs) {
      result.push({ timeMs: t, label: formatDuration(t) });
    }
    
    return result;
  }, [durationMs]);

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Milestone className="h-5 w-5" />
            Meeting Timeline
          </CardTitle>
          <CardDescription>
            Visual timeline of detected items during the meeting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">No timeline events</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Milestone className="h-5 w-5" />
          Meeting Timeline
        </CardTitle>
        <CardDescription>
          {items.length} key moments detected across {formatDuration(durationMs)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Visual timeline bar */}
        <div className="relative mb-6">
          <div className="h-2 rounded-full bg-muted" />
          
          {/* Time markers */}
          {markers.map((marker) => {
            const position = durationMs > 0 ? (marker.timeMs / durationMs) * 100 : 0;
            return (
              <div
                key={marker.timeMs}
                className="absolute top-3 text-xs text-muted-foreground"
                style={{ left: `${position}%`, transform: "translateX(-50%)" }}
              >
                {marker.label}
              </div>
            );
          })}

          {/* Item dots */}
          {sortedItems.map((item) => {
            const position = durationMs > 0 ? (item.timestampMs / durationMs) * 100 : 0;
            return (
              <button
                key={item.id}
                onClick={() => onSeek?.(item.timestampMs)}
                className={`absolute top-0 h-2 w-2 -translate-x-1/2 -translate-y-0 rounded-full transition-transform hover:scale-150 ${ITEM_COLORS[item.type]}`}
                style={{ left: `${position}%` }}
                title={`${ITEM_LABELS[item.type]}: ${item.content}`}
              />
            );
          })}
        </div>

        {/* Event list */}
        <ScrollArea className="h-64">
          <div className="relative pl-6">
            {/* Timeline line */}
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-muted" />

            {sortedItems.map((item, idx) => (
              <div key={item.id} className="relative pb-4 last:pb-0">
                {/* Dot on timeline */}
                <div 
                  className={`absolute left-0 top-1.5 h-3 w-3 -translate-x-1/2 rounded-full ring-2 ring-background ${ITEM_COLORS[item.type]}`}
                  style={{ left: "0.5rem" }}
                />

                {/* Content */}
                <div className="ml-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      variant="outline" 
                      className="text-xs"
                    >
                      {ITEM_LABELS[item.type]}
                    </Badge>
                    <button
                      onClick={() => onSeek?.(item.timestampMs)}
                      className="text-xs text-muted-foreground hover:text-foreground font-mono"
                    >
                      {formatDuration(item.timestampMs)}
                    </button>
                  </div>
                  <p className="text-sm">{item.content}</p>
                  {item.owner && (
                    <p className="text-xs text-muted-foreground mt-1">
                      → Assigned to: {item.owner}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
