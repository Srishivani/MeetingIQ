import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConversations } from "@/hooks/useConversations";
import { formatDuration } from "@/lib/conversations";

const Conversation = () => {
  const { id } = useParams();
  const { get } = useConversations();
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState<string>("");
  const [createdAt, setCreatedAt] = React.useState<number>(0);
  const [durationMs, setDurationMs] = React.useState<number>(0);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let revoked: string | null = null;
    const run = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      const rec = await get(id);
      if (!rec) {
        setError("Conversation not found in this browser.");
        setIsLoading(false);
        return;
      }

      setTitle(rec.title);
      setCreatedAt(rec.createdAt);
      setDurationMs(rec.durationMs);
      const url = URL.createObjectURL(rec.audioBlob);
      revoked = url;
      setAudioUrl(url);
      setIsLoading(false);
    };
    void run();
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [get, id]);

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">ConvoIQ • Local prototype</div>
            <h1 className="truncate text-lg font-semibold">{isLoading ? "Loading…" : title || "Conversation"}</h1>
            {!isLoading && !error ? (
              <div className="text-xs text-muted-foreground">
                {new Date(createdAt).toLocaleString()} • {formatDuration(durationMs)}
              </div>
            ) : null}
          </div>
          <Button asChild variant="outline">
            <Link to="/">Back</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        {error ? <div className="text-sm text-destructive">{error}</div> : null}

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Audio</CardTitle>
                <CardDescription>Playback is local; nothing is uploaded.</CardDescription>
              </CardHeader>
              <CardContent>
                {audioUrl ? <audio controls className="w-full" src={audioUrl} /> : null}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Intelligence</CardTitle>
                <CardDescription>
                  Transcription, summaries, and Q&A will appear here once a secure backend is enabled.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="transcript">
                  <TabsList>
                    <TabsTrigger value="transcript">Transcript</TabsTrigger>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="ask">Ask</TabsTrigger>
                  </TabsList>
                  <TabsContent value="transcript" className="pt-4">
                    <div className="rounded-md border bg-muted p-4 text-sm text-muted-foreground">
                      Not available in frontend-only mode.
                    </div>
                  </TabsContent>
                  <TabsContent value="summary" className="pt-4">
                    <div className="rounded-md border bg-muted p-4 text-sm text-muted-foreground">
                      Not available in frontend-only mode.
                    </div>
                  </TabsContent>
                  <TabsContent value="ask" className="pt-4">
                    <div className="rounded-md border bg-muted p-4 text-sm text-muted-foreground">
                      Not available in frontend-only mode.
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Conversation;
