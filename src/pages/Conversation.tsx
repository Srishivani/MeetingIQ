import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConversations } from "@/hooks/useConversations";
import { formatDuration } from "@/lib/conversations";
import { ConversationIntelligence } from "@/components/conversations/ConversationIntelligence";
import { MeetingMinutes } from "@/components/conversations/MeetingMinutes";
import { supabaseDevice } from "@/integrations/supabase/clientDevice";
import { getDeviceKey } from "@/lib/deviceKey";
import { useMeetingItems } from "@/hooks/useMeetingItems";

const Conversation = () => {
  const { id } = useParams();
  const { get } = useConversations();
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState<string>("");
  const [createdAt, setCreatedAt] = React.useState<number>(0);
  const [durationMs, setDurationMs] = React.useState<number>(0);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<{
    key_points?: string[];
    decisions?: string[];
    action_items?: string[];
    open_questions?: string[];
  } | null>(null);

  const { items, grouped, removeItem } = useMeetingItems(id ?? null);

  React.useEffect(() => {
    let revoked: string | null = null;
    const run = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);

      // 1) Try local (IndexedDB) first
      const rec = await get(id);
      if (rec) {
        setTitle(rec.title);
        setCreatedAt(rec.createdAt);
        setDurationMs(rec.durationMs);
        const url = URL.createObjectURL(rec.audioBlob);
        revoked = url;
        setAudioUrl(url);
        setIsLoading(false);
        return;
      }

      // 2) Fallback to backend (private storage + DB metadata)
      const { data: conv, error: convErr } = await supabaseDevice
        .from("conversations")
        .select("title, created_at, duration_ms, mime_type")
        .eq("id", id)
        .maybeSingle();

      if (convErr) {
        setError(convErr.message);
        setIsLoading(false);
        return;
      }

      if (!conv) {
        setError("Conversation not found.");
        setIsLoading(false);
        return;
      }

      setTitle(conv.title ?? "Conversation");
      setCreatedAt(new Date(conv.created_at).getTime());
      setDurationMs(conv.duration_ms ?? 0);

      // Fetch summary
      const { data: summaryData } = await supabaseDevice
        .from("summaries")
        .select("key_points, decisions, action_items, open_questions")
        .eq("conversation_id", id)
        .maybeSingle();

      if (summaryData) {
        setSummary(summaryData);
      }

      const deviceKey = getDeviceKey();
      const rawExt = (conv.mime_type ?? "audio/webm").split("/")[1] || "webm";
      const ext = rawExt === "mpeg" ? "mp3" : rawExt;
      const path = `${deviceKey}/${id}.${ext}`;

      const { data: signed, error: signErr } = await supabaseDevice.storage
        .from("conversation-audio")
        .createSignedUrl(path, 60 * 10);

      if (signErr || !signed?.signedUrl) {
        setError(signErr?.message || "Failed to load audio");
        setIsLoading(false);
        return;
      }

      setAudioUrl(signed.signedUrl);
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
                <CardDescription>Playback is from your device (local) or your private backend storage.</CardDescription>
              </CardHeader>
              <CardContent>
                {audioUrl ? <audio controls className="w-full" src={audioUrl} /> : null}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {id ? <ConversationIntelligence conversationId={id} /> : null}
            
            {/* Meeting Minutes export */}
            {id && !isLoading && (
              <MeetingMinutes
                title={title}
                date={new Date(createdAt)}
                durationMs={durationMs}
                items={items}
                grouped={grouped}
                summary={summary}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default Conversation;
