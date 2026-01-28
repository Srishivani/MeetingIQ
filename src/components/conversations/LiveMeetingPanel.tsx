import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, CheckSquare, Gavel, HelpCircle, X, Sparkles, Radio } from "lucide-react";
import { formatDuration } from "@/lib/conversations";
import { getItemTypeLabel, type MeetingItemType } from "@/lib/phraseDetection";
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

const TYPE_STYLES: Record<MeetingItemType, string> = {
  action_item: "border-primary/30 bg-primary/5",
  decision: "border-green-500/30 bg-green-500/5",
  question: "border-purple-500/30 bg-purple-500/5",
  deferred: "border-amber-500/30 bg-amber-500/5",
};

const BADGE_STYLES: Record<MeetingItemType, string> = {
  action_item: "bg-primary/10 text-primary border-primary/20",
  decision: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  question: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  deferred: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
};

function ItemCard({ item, onRemove }: { item: MeetingItem; onRemove?: (id: string) => void }) {
  return (
    <div className={`group relative rounded-lg border p-3 transition-all hover:shadow-sm ${TYPE_STYLES[item.type]}`}>
      <div className="flex items-start justify-between gap-2">
        <Badge variant="outline" className={`shrink-0 ${BADGE_STYLES[item.type]}`}>
          {ICONS[item.type]}
          <span className="ml-1">{getItemTypeLabel(item.type)}</span>
        </Badge>
        <div className="flex items-center gap-1">
          {item.isAiEnhanced && (
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          )}
          {onRemove && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={() => onRemove(item.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{item.content}</p>
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="font-mono">{formatDuration(item.timestampMs)}</span>
        {item.triggerPhrase && (
          <span className="rounded bg-muted px-1.5 py-0.5 italic">"{item.triggerPhrase}"</span>
        )}
        {item.owner && (
          <span className="font-medium">→ {item.owner}</span>
        )}
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
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {isRecording ? (
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
              </span>
            ) : (
              <Radio className="h-4 w-4 text-primary" />
            )}
            Live Detection
          </CardTitle>
          <Badge variant="secondary" className="font-mono">
            {totalCount} items
          </Badge>
        </div>
        <CardDescription>
          Real-time phrase detection for action items, decisions, questions, and deferred topics.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Summary counts */}
        <div className="mb-4 grid grid-cols-4 gap-2">
          <div className="rounded-lg border bg-primary/5 p-2 text-center">
            <div className="text-lg font-bold text-primary">{counts.action_item}</div>
            <div className="text-xs text-muted-foreground">Actions</div>
          </div>
          <div className="rounded-lg border bg-green-500/5 p-2 text-center">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">{counts.decision}</div>
            <div className="text-xs text-muted-foreground">Decisions</div>
          </div>
          <div className="rounded-lg border bg-purple-500/5 p-2 text-center">
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{counts.question}</div>
            <div className="text-xs text-muted-foreground">Questions</div>
          </div>
          <div className="rounded-lg border bg-amber-500/5 p-2 text-center">
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{counts.deferred}</div>
            <div className="text-xs text-muted-foreground">Deferred</div>
          </div>
        </div>

        {/* Items list */}
        <ScrollArea className="h-72">
          {totalCount === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-8 text-center">
              {isRecording ? (
                <>
                  <div className="relative mb-4">
                    <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <Radio className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <p className="font-medium text-foreground">Listening...</p>
                  <p className="text-sm text-muted-foreground">Say phrases like "let's table that" or "I'll follow up"</p>
                </>
              ) : (
                <>
                  <Radio className="mb-3 h-12 w-12 text-muted-foreground/50" />
                  <p className="font-medium text-muted-foreground">No items detected</p>
                  <p className="text-sm text-muted-foreground">Start recording to detect key phrases</p>
                </>
              )}
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
