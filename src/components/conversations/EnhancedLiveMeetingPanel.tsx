import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Clock,
  CheckSquare,
  Gavel,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Check,
  Sparkles,
  Radio,
  Loader2,
  Pencil,
  User,
  Calendar,
  Flag,
  Handshake,
  AlertCircle,
} from "lucide-react";
import { formatDuration } from "@/lib/conversations";
import { getItemTypeLabel, getPriorityLabel, type MeetingItemType, type Priority } from "@/lib/phraseDetection";
import type { EnhancedItem } from "@/hooks/useRealtimeEnhancement";

interface EnhancedLiveMeetingPanelProps {
  items: EnhancedItem[];
  grouped: Record<MeetingItemType, EnhancedItem[]>;
  isRecording: boolean;
  isEnhancing: boolean;
  onConfirm?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onRemove?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Pick<EnhancedItem, "enhancedContent" | "owner" | "priority" | "dueDate">>) => void;
}

const TYPE_ICONS: Record<MeetingItemType, React.ReactNode> = {
  action_item: <CheckSquare className="h-3.5 w-3.5" />,
  decision: <Gavel className="h-3.5 w-3.5" />,
  question: <HelpCircle className="h-3.5 w-3.5" />,
  deferred: <Clock className="h-3.5 w-3.5" />,
  risk: <AlertTriangle className="h-3.5 w-3.5" />,
  followup: <RefreshCw className="h-3.5 w-3.5" />,
  commitment: <Handshake className="h-3.5 w-3.5" />,
  concern: <AlertCircle className="h-3.5 w-3.5" />,
  ambiguity: <HelpCircle className="h-3.5 w-3.5" />,
};

const TYPE_STYLES: Record<MeetingItemType, string> = {
  action_item: "border-primary/30 bg-primary/5",
  decision: "border-green-500/30 bg-green-500/5",
  question: "border-purple-500/30 bg-purple-500/5",
  deferred: "border-amber-500/30 bg-amber-500/5",
  risk: "border-red-500/30 bg-red-500/5",
  followup: "border-cyan-500/30 bg-cyan-500/5",
  commitment: "border-emerald-500/30 bg-emerald-500/5",
  concern: "border-orange-500/30 bg-orange-500/5",
  ambiguity: "border-gray-500/30 bg-gray-500/5",
};

const BADGE_STYLES: Record<MeetingItemType, string> = {
  action_item: "bg-primary/10 text-primary border-primary/20",
  decision: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  question: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  deferred: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  risk: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  followup: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
  commitment: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  concern: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  ambiguity: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
};

const PRIORITY_STYLES: Record<Priority, string> = {
  high: "bg-red-500/10 text-red-700 dark:text-red-400",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  low: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
};

function ItemCard({
  item,
  onConfirm,
  onDismiss,
  onRemove,
  onUpdate,
}: {
  item: EnhancedItem;
  onConfirm?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onRemove?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Pick<EnhancedItem, "enhancedContent" | "owner" | "priority" | "dueDate">>) => void;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(item.enhancedContent || item.originalPhrase.content);
  const [editOwner, setEditOwner] = React.useState(item.owner || "");

  const handleSaveEdit = () => {
    onUpdate?.(item.id, {
      enhancedContent: editContent,
      owner: editOwner || null,
    });
    setIsEditing(false);
  };

  const displayContent = item.enhancedContent || item.originalPhrase.content;
  const type = item.originalPhrase.type;

  return (
    <div
      className={`group relative rounded-lg border p-3 transition-all hover:shadow-sm ${TYPE_STYLES[type]} ${
        item.status === "confirmed" ? "ring-2 ring-green-500/50" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`shrink-0 ${BADGE_STYLES[type]}`}>
            {TYPE_ICONS[type]}
            <span className="ml-1">{getItemTypeLabel(type)}</span>
          </Badge>
          <Badge variant="outline" className={`shrink-0 ${PRIORITY_STYLES[item.priority]}`}>
            <Flag className="h-3 w-3 mr-1" />
            {getPriorityLabel(item.priority)}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {item.isEnhancing && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          )}
          {item.isEnhanced && !item.isEnhancing && (
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          )}
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="mt-2 space-y-2">
          <Input
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Item content..."
            className="text-sm"
          />
          <div className="flex gap-2">
            <Input
              value={editOwner}
              onChange={(e) => setEditOwner(e.target.value)}
              placeholder="Owner..."
              className="text-sm flex-1"
            />
            <Button size="sm" onClick={handleSaveEdit}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm font-medium text-foreground">{displayContent}</p>

          {/* Metadata */}
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="font-mono">{formatDuration(item.originalPhrase.timestampMs)}</span>
            
            {item.owner && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {item.owner}
              </span>
            )}
            
            {item.dueDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {item.dueDate}
              </span>
            )}
            
            {item.originalPhrase.triggerPhrase && (
              <span className="rounded bg-muted px-1.5 py-0.5 italic">
                "{item.originalPhrase.triggerPhrase}"
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {item.status === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => onConfirm?.(item.id)}
                >
                  <Check className="h-3 w-3" />
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1"
                  onClick={() => onDismiss?.(item.id)}
                >
                  <X className="h-3 w-3" />
                  Dismiss
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
            {onRemove && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                onClick={() => onRemove(item.id)}
              >
                <X className="h-3 w-3" />
                Remove
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function EnhancedLiveMeetingPanel({
  items,
  grouped,
  isRecording,
  isEnhancing,
  onConfirm,
  onDismiss,
  onRemove,
  onUpdate,
}: EnhancedLiveMeetingPanelProps) {
  const visibleItems = items.filter((i) => i.status !== "dismissed");
  const totalCount = visibleItems.length;

  const counts = {
    action_item: grouped.action_item.length,
    decision: grouped.decision.length,
    question: grouped.question.length,
    deferred: grouped.deferred.length,
    risk: grouped.risk.length,
    followup: grouped.followup.length,
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
            Live Intelligence
            {isEnhancing && (
              <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Enhancing...
              </span>
            )}
          </CardTitle>
          <Badge variant="secondary" className="font-mono">
            {totalCount} items
          </Badge>
        </div>
        <CardDescription>
          Real-time AI detection of action items, decisions, questions, risks, and follow-ups.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Summary counts */}
        <div className="mb-4 grid grid-cols-3 md:grid-cols-6 gap-2">
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
          <div className="rounded-lg border bg-red-500/5 p-2 text-center">
            <div className="text-lg font-bold text-red-600 dark:text-red-400">{counts.risk}</div>
            <div className="text-xs text-muted-foreground">Risks</div>
          </div>
          <div className="rounded-lg border bg-cyan-500/5 p-2 text-center">
            <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">{counts.followup}</div>
            <div className="text-xs text-muted-foreground">Follow-ups</div>
          </div>
        </div>

        {/* Tabbed View */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-7">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="action_item">Actions</TabsTrigger>
            <TabsTrigger value="decision">Decisions</TabsTrigger>
            <TabsTrigger value="question" className="hidden md:flex">Questions</TabsTrigger>
            <TabsTrigger value="risk" className="hidden md:flex">Risks</TabsTrigger>
            <TabsTrigger value="followup" className="hidden md:flex">Follow-ups</TabsTrigger>
            <TabsTrigger value="deferred">Deferred</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <ItemsList
              items={visibleItems}
              isRecording={isRecording}
              onConfirm={onConfirm}
              onDismiss={onDismiss}
              onRemove={onRemove}
              onUpdate={onUpdate}
            />
          </TabsContent>

          {(["action_item", "decision", "question", "risk", "followup", "deferred"] as MeetingItemType[]).map((type) => (
            <TabsContent key={type} value={type} className="mt-4">
              <ItemsList
                items={grouped[type]}
                isRecording={isRecording}
                onConfirm={onConfirm}
                onDismiss={onDismiss}
                onRemove={onRemove}
                onUpdate={onUpdate}
                emptyMessage={`No ${getItemTypeLabel(type).toLowerCase()} items detected yet.`}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ItemsList({
  items,
  isRecording,
  onConfirm,
  onDismiss,
  onRemove,
  onUpdate,
  emptyMessage = "No items detected yet.",
}: {
  items: EnhancedItem[];
  isRecording: boolean;
  onConfirm?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onRemove?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Pick<EnhancedItem, "enhancedContent" | "owner" | "priority" | "dueDate">>) => void;
  emptyMessage?: string;
}) {
  return (
    <ScrollArea className="h-72">
      {items.length === 0 ? (
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
              <p className="text-sm text-muted-foreground max-w-xs">
                Say phrases like "let's table that", "I'll follow up", or "action item"
              </p>
            </>
          ) : (
            <>
              <Radio className="mb-3 h-12 w-12 text-muted-foreground/50" />
              <p className="font-medium text-muted-foreground">{emptyMessage}</p>
              <p className="text-sm text-muted-foreground">Start recording to detect key phrases</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2 pr-3">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onConfirm={onConfirm}
              onDismiss={onDismiss}
              onRemove={onRemove}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </ScrollArea>
  );
}
