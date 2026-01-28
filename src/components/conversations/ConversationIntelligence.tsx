import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabaseDevice } from "@/integrations/supabase/clientDevice";
import { useConversationBackend } from "@/hooks/useConversationBackend";
import { formatDuration } from "@/lib/conversations";
import { FileText, Brain, MessageSquare, Loader2, Send } from "lucide-react";

export function ConversationIntelligence({ conversationId }: { conversationId: string }) {
  const [transcript, setTranscript] = React.useState<Array<{ text: string; start_ms: number; end_ms: number }>>([]);
  const [summary, setSummary] = React.useState<{
    key_points?: string[];
    decisions?: string[];
    action_items?: string[];
    open_questions?: string[];
    notable_quotes?: Array<{ text: string; timestamp_ms: number }>;
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [question, setQuestion] = React.useState("");
  const [answers, setAnswers] = React.useState<Array<{ question: string; answer: string; citations: Array<{ text: string; timestamp_ms: number }> }>>([]);
  const [isAsking, setIsAsking] = React.useState(false);

  const { askQuestion } = useConversationBackend();

  React.useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [transcriptRes, summaryRes] = await Promise.all([
          supabaseDevice
            .from("transcript_chunks")
            .select("text, start_ms, end_ms")
            .eq("conversation_id", conversationId)
            .order("start_ms", { ascending: true }),
          supabaseDevice
            .from("summaries")
            .select("key_points, decisions, action_items, open_questions, notable_quotes")
            .eq("conversation_id", conversationId)
            .maybeSingle(),
        ]);

        if (transcriptRes.data) setTranscript(transcriptRes.data);
        if (summaryRes.data) {
          setSummary({
            ...summaryRes.data,
            notable_quotes: Array.isArray(summaryRes.data.notable_quotes) 
              ? summaryRes.data.notable_quotes as Array<{ text: string; timestamp_ms: number }>
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>Meeting Intelligence</CardTitle>
          </div>
          <CardDescription className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading transcript and summary…
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <CardTitle>Meeting Intelligence</CardTitle>
        </div>
        <CardDescription>Full transcript, AI-generated summary, and Q&A with citations.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="transcript">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transcript" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Transcript
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-1.5">
              <Brain className="h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="ask" className="gap-1.5">
              <MessageSquare className="h-4 w-4" />
              Ask
            </TabsTrigger>
          </TabsList>
          <TabsContent value="transcript" className="pt-4 space-y-2">
            {transcript.length === 0 ? (
              <div className="text-sm text-muted-foreground">No transcript available.</div>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto rounded-md border bg-muted p-3 text-sm">
                {transcript.map((chunk, i) => (
                  <div key={i}>
                    <span className="text-xs text-muted-foreground">[{formatDuration(chunk.start_ms)}] </span>
                    {chunk.text}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="summary" className="pt-4 space-y-4">
            {!summary ? (
              <div className="text-sm text-muted-foreground">No summary available.</div>
            ) : (
              <>
                {summary.key_points && summary.key_points.length > 0 ? (
                  <div>
                    <div className="text-sm font-semibold">Key Points</div>
                    <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                      {summary.key_points.map((kp, i) => (
                        <li key={i}>{kp}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {summary.decisions && summary.decisions.length > 0 ? (
                  <div>
                    <div className="text-sm font-semibold">Decisions</div>
                    <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                      {summary.decisions.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {summary.action_items && summary.action_items.length > 0 ? (
                  <div>
                    <div className="text-sm font-semibold">Action Items</div>
                    <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                      {summary.action_items.map((ai, i) => (
                        <li key={i}>{ai}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {summary.open_questions && summary.open_questions.length > 0 ? (
                  <div>
                    <div className="text-sm font-semibold">Open Questions</div>
                    <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                      {summary.open_questions.map((oq, i) => (
                        <li key={i}>{oq}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {summary.notable_quotes && summary.notable_quotes.length > 0 ? (
                  <div>
                    <div className="text-sm font-semibold">Notable Quotes</div>
                    <ul className="mt-1 space-y-2 text-sm text-muted-foreground">
                      {summary.notable_quotes.map((nq, i) => (
                        <li key={i} className="border-l-2 border-muted pl-3">
                          &ldquo;{nq.text}&rdquo; <span className="text-xs">— {formatDuration(nq.timestamp_ms)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </TabsContent>
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
              <div className="space-y-4">
                {answers.map((ans, i) => (
                  <div key={i} className="rounded-lg border bg-card p-4">
                    <div className="font-medium text-foreground">{ans.question}</div>
                    <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{ans.answer}</div>
                    {ans.citations.length > 0 ? (
                      <div className="mt-3 space-y-1 border-t pt-3">
                        <div className="text-xs font-semibold text-muted-foreground">Citations:</div>
                        {ans.citations.map((c, ci) => (
                          <div key={ci} className="rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                            <span className="font-mono">[{formatDuration(c.timestamp_ms)}]</span> {c.text.slice(0, 80)}…
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
