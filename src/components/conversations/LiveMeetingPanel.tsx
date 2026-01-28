import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, CheckSquare, Gavel, HelpCircle, X, Sparkles } from "lucide-react";
import { formatDuration } from "@/lib/conversations";
import { getItemTypeLabel, getItemTypeColor, type MeetingItemType } from "@/lib/phraseDetection";
import type { MeetingItem } from "@/hooks/useMeetingItems";

interface LiveMeetingPanelProps {
  items: MeetingItem[];
  grouped: Record<MeetingItemType, MeetingItem[]>;
  isRecording: boolean;
  onRemove?: (itemId: string) => void;
}

const ICONS: Record<MeetingItemType, React.ReactNode> = {
  deferred: <Clock className="h-3.5 w-3.5" />,
  action_item: <CheckSquare className="h-3.5 w-3.5" />,
  decision: <Gavel className="h-3.5 w-3.5" />,
  question: <HelpCircle className="h-3.5 w-3.5" />,
};

function ItemCard({ item, onRemove }: { item: MeetingItem; onRemove?: (id: string) => void }) {
  return (
    <div className="group relative rounded-md border bg-card p-2.5 text-sm">
      <div className="flex items-start gap-2">
        <Badge variant="outline" className={`shrink-0 ${getItemTypeColor(item.type)}`}>
          {ICONS[item.type]}
          <span className="ml-1">{getItemTypeLabel(item.type)}</span>
        </Badge>
        {item.isAiEnhanced && (
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
        )}
        {onRemove && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100"
            onClick={() => onRemove(item.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      <p className="mt-1.5 text-foreground">{item.content}</p>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <span>[{formatDuration(item.timestampMs)}]</span>
        {item.triggerPhrase && (
          <span className="italic">Trigger: "{item.triggerPhrase}"</span>
        )}
        {item.owner && <span>Owner: {item.owner}</span>}
      </div>
    </div>
  );
}

export function LiveMeetingPanel({ items, grouped, isRecording, onRemove }: LiveMeetingPanelProps) {
  const totalCount = items.length;
  
  const counts = {
    deferred: grouped.deferred.length,
    action_item: grouped.action_item.length,
    decision: grouped.decision.length,
    question: grouped.question.length,
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {isRecording && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
            )}
            Live Meeting Items
          </CardTitle>
          <Badge variant="secondary">{totalCount} detected</Badge>
        </div>
        <CardDescription>
          Real-time phrase detection for action items, decisions, questions, and deferred topics.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary badges */}
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge variant="outline" className={getItemTypeColor("action_item")}>
            {ICONS.action_item} <span className="ml-1">{counts.action_item} Actions</span>
          </Badge>
          <Badge variant="outline" className={getItemTypeColor("decision")}>
            {ICONS.decision} <span className="ml-1">{counts.decision} Decisions</span>
          </Badge>
          <Badge variant="outline" className={getItemTypeColor("question")}>
            {ICONS.question} <span className="ml-1">{counts.question} Questions</span>
          </Badge>
          <Badge variant="outline" className={getItemTypeColor("deferred")}>
            {ICONS.deferred} <span className="ml-1">{counts.deferred} Deferred</span>
          </Badge>
        </div>

        {/* Items list */}
        <ScrollArea className="h-64">
          {totalCount === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {isRecording
                ? "Listening for key phrases..."
                : "No items detected yet. Start recording to detect phrases."}
            </div>
          ) : (
            <div className="space-y-2 pr-3">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} onRemove={onRemove} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
