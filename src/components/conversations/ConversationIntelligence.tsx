import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabaseDevice } from "@/integrations/supabase/clientDevice";
import { useConversationBackend } from "@/hooks/useConversationBackend";
import { useMeetingItems } from "@/hooks/useMeetingItems";
import { formatDuration } from "@/lib/conversations";
import { getItemTypeLabel, type MeetingItemType } from "@/lib/phraseDetection";
import { 
  Brain, MessageSquare, Loader2, Send, CheckSquare, 
  Gavel, HelpCircle, Clock, Sparkles, Quote, Lightbulb,
  AlertTriangle, RefreshCw
} from "lucide-react";

const ITEM_ICONS: Record<MeetingItemType, React.ReactNode> = {
  action_item: <CheckSquare className="h-4 w-4" />,
  decision: <Gavel className="h-4 w-4" />,
  question: <HelpCircle className="h-4 w-4" />,
  deferred: <Clock className="h-4 w-4" />,
  risk: <AlertTriangle className="h-4 w-4" />,
  followup: <RefreshCw className="h-4 w-4" />,
};

const ITEM_STYLES: Record<MeetingItemType, string> = {
  action_item: "border-primary/30 bg-primary/5",
  decision: "border-green-500/30 bg-green-500/5",
  question: "border-purple-500/30 bg-purple-500/5",
  deferred: "border-amber-500/30 bg-amber-500/5",
  risk: "border-red-500/30 bg-red-500/5",
  followup: "border-cyan-500/30 bg-cyan-500/5",
};

const BADGE_STYLES: Record<MeetingItemType, string> = {
  action_item: "bg-primary/10 text-primary border-primary/20",
  decision: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  question: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  deferred: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  risk: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  followup: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
};

export function ConversationIntelligence({ conversationId }: { conversationId: string }) {
  const { items, grouped, isLoading: itemsLoading } = useMeetingItems(conversationId);
  
  const [summary, setSummary] = React.useState<{
    key_points?: string[];
    notable_quotes?: Array<{ text: string; timestamp_ms: number }>;
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [question, setQuestion] = React.useState("");
  const [answers, setAnswers] = React.useState<Array<{ 
    question: string; 
    answer: string; 
    citations: Array<{ text: string; timestamp_ms: number }> 
  }>>([]);
  const [isAsking, setIsAsking] = React.useState(false);

  const { askQuestion } = useConversationBackend();

  React.useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: summaryData } = await supabaseDevice
          .from("summaries")
          .select("key_points, notable_quotes")
          .eq("conversation_id", conversationId)
          .maybeSingle();

        if (summaryData) {
          setSummary({
            key_points: summaryData.key_points ?? [],
            notable_quotes: Array.isArray(summaryData.notable_quotes) 
              ? summaryData.notable_quotes as Array<{ text: string; timestamp_ms: number }>
              : []
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [conversationId]);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setIsAsking(true);
    try {
      const result = await askQuestion(conversationId, question);
      setAnswers((prev) => [...prev, { question, answer: result.answer, citations: result.citations }]);
      setQuestion("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsAsking(false);
    }
  };

  const loading = isLoading || itemsLoading;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>Meeting Intelligence</CardTitle>
          </div>
          <CardDescription className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading intelligence data…
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>Meeting Intelligence</CardTitle>
          </div>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const totalItems = items.length;
  const hasContent = totalItems > 0 || (summary?.key_points?.length ?? 0) > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>Meeting Intelligence</CardTitle>
          </div>
          {totalItems > 0 && (
            <Badge variant="secondary" className="font-mono">
              {totalItems} items detected
            </Badge>
          )}
        </div>
        <CardDescription>
          AI-detected action items, decisions, questions, and key insights.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="items">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="items" className="gap-1.5">
              <CheckSquare className="h-4 w-4" />
              Items ({totalItems})
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-1.5">
              <Lightbulb className="h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="ask" className="gap-1.5">
              <MessageSquare className="h-4 w-4" />
              Ask AI
            </TabsTrigger>
          </TabsList>

          {/* Items Tab - Action Items, Decisions, Questions, Deferred */}
          <TabsContent value="items" className="pt-4">
            {totalItems === 0 ? (
              <div className="rounded-lg border bg-muted/30 p-8 text-center">
                <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-3 font-medium text-muted-foreground">No items detected</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Action items, decisions, and questions will appear here when detected.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {/* Action Items */}
                  {grouped.action_item.length > 0 && (
                    <ItemSection 
                      type="action_item" 
                      items={grouped.action_item} 
                    />
                  )}

                  {/* Decisions */}
                  {grouped.decision.length > 0 && (
                    <ItemSection 
                      type="decision" 
                      items={grouped.decision} 
                    />
                  )}

                  {/* Questions */}
                  {grouped.question.length > 0 && (
                    <ItemSection 
                      type="question" 
                      items={grouped.question} 
                    />
                  )}

                  {/* Deferred */}
                  {grouped.deferred.length > 0 && (
                    <ItemSection 
                      type="deferred" 
                      items={grouped.deferred} 
                    />
                  )}

                  {/* Risks */}
                  {grouped.risk.length > 0 && (
                    <ItemSection 
                      type="risk" 
                      items={grouped.risk} 
                    />
                  )}

                  {/* Follow-ups */}
                  {grouped.followup.length > 0 && (
                    <ItemSection 
                      type="followup" 
                      items={grouped.followup} 
                    />
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="pt-4 space-y-4">
            {!summary || (!summary.key_points?.length && !summary.notable_quotes?.length) ? (
              <div className="rounded-lg border bg-muted/30 p-8 text-center">
                <Lightbulb className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-3 font-medium text-muted-foreground">No summary available</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  AI summary will appear here once processing is complete.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {summary.key_points && summary.key_points.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      <span className="font-semibold">Key Points</span>
                    </div>
                    <ul className="space-y-2">
                      {summary.key_points.map((kp, i) => (
                        <li key={i} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {i + 1}
                          </span>
                          <span className="text-sm text-foreground">{kp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.notable_quotes && summary.notable_quotes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Quote className="h-4 w-4 text-primary" />
                      <span className="font-semibold">Notable Quotes</span>
                    </div>
                    <div className="space-y-2">
                      {summary.notable_quotes.map((nq, i) => (
                        <div key={i} className="rounded-lg border-l-4 border-primary/30 bg-primary/5 p-3">
                          <p className="text-sm italic text-foreground">&ldquo;{nq.text}&rdquo;</p>
                          <p className="mt-1 text-xs text-muted-foreground font-mono">
                            @ {formatDuration(nq.timestamp_ms)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Ask AI Tab */}
          <TabsContent value="ask" className="pt-4 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ask a question about this meeting..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleAsk();
                  }
                }}
              />
              <Button onClick={() => void handleAsk()} disabled={isAsking || !question.trim()}>
                {isAsking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {answers.length === 0 ? (
              <div className="rounded-lg border bg-muted/30 p-6 text-center">
                <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm font-medium text-muted-foreground">Ask anything about this meeting</p>
                <p className="text-xs text-muted-foreground">Answers will cite specific parts of the transcript</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-4 pr-4">
                  {answers.map((ans, i) => (
                    <div key={i} className="rounded-lg border bg-card p-4">
                      <div className="font-medium text-foreground">{ans.question}</div>
                      <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{ans.answer}</div>
                      {ans.citations.length > 0 && (
                        <div className="mt-3 space-y-1 border-t pt-3">
                          <div className="text-xs font-semibold text-muted-foreground">Citations:</div>
                          {ans.citations.map((c, ci) => (
                            <div key={ci} className="rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                              <span className="font-mono">[{formatDuration(c.timestamp_ms)}]</span> {c.text.slice(0, 80)}…
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Item Section Component
function ItemSection({ 
  type, 
  items 
}: { 
  type: MeetingItemType; 
  items: Array<{
    id: string;
    content: string;
    owner: string | null;
    timestampMs: number;
    triggerPhrase: string | null;
    isAiEnhanced: boolean;
  }>
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {ITEM_ICONS[type]}
        <span className="font-semibold">{getItemTypeLabel(type)}s</span>
        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div 
            key={item.id} 
            className={`rounded-lg border p-3 ${ITEM_STYLES[type]}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{item.content}</p>
              {item.isAiEnhanced && (
                <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
              )}
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono">{formatDuration(item.timestampMs)}</span>
              {item.owner && (
                <Badge variant="outline" className={BADGE_STYLES[type]}>
                  → {item.owner}
                </Badge>
              )}
              {item.triggerPhrase && (
                <span className="rounded bg-background/50 px-1.5 py-0.5 italic">
                  "{item.triggerPhrase}"
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
