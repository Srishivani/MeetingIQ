import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConversations } from "@/hooks/useConversations";
import { formatDuration } from "@/lib/conversations";
import { ConversationIntelligence } from "@/components/conversations/ConversationIntelligence";
import { FollowUpAutomation } from "@/components/conversations/FollowUpAutomation";
import { LiveTranscript } from "@/components/dashboard/LiveTranscript";
import { MeetingTimeline } from "@/components/dashboard/MeetingTimeline";
import { ExportPanel } from "@/components/dashboard/ExportPanel";
import { supabaseDevice } from "@/integrations/supabase/clientDevice";
import { getDeviceKey } from "@/lib/deviceKey";
import { useMeetingItems } from "@/hooks/useMeetingItems";
import { useMeetings } from "@/hooks/useMeetings";
import { ParticipantsPanel } from "@/components/dashboard/ParticipantsPanel";
import { 
  ArrowLeft, Brain, Calendar, Clock, Volume2, 
  CheckSquare, Gavel, HelpCircle, Loader2, FileText,
  MessageSquare, Milestone, Users, Send
} from "lucide-react";

const Conversation = () => {
  const { id } = useParams();
  const { get } = useConversations();
  const { meetings } = useMeetings();
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState<string>("");
  const [createdAt, setCreatedAt] = React.useState<number>(0);
  const [durationMs, setDurationMs] = React.useState<number>(0);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [summary, setSummary] = React.useState<{
    key_points?: string[];
    decisions?: string[];
    action_items?: string[];
    open_questions?: string[];
  } | null>(null);

  const { items, grouped } = useMeetingItems(id ?? null);

  // Find linked meeting for participants
  const linkedMeeting = React.useMemo(() => 
    meetings.find(m => m.conversationId === id),
    [meetings, id]
  );

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

      // 2) Fallback to backend
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
        setError("Meeting not found.");
        setIsLoading(false);
        return;
      }

      setTitle(conv.title ?? "Meeting");
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

  // Update current time for timeline sync
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTimeMs(audioRef.current.currentTime * 1000);
    }
  };

  const handleSeek = (timeMs: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timeMs / 1000;
      audioRef.current.play();
    }
  };

  // Count items by type
  const itemCounts = {
    action_items: grouped.action_item.length,
    decisions: grouped.decision.length,
    questions: grouped.question.length,
    deferred: grouped.deferred.length,
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto w-full max-w-7xl px-4 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground">
                <Link to="/">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  {isLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading meeting…
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl font-bold tracking-tight">{title || "Meeting"}</h1>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(createdAt).toLocaleDateString(undefined, {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDuration(durationMs)}
                        </span>
                        {linkedMeeting?.participants && linkedMeeting.participants.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {linkedMeeting.participants.length} participants
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Item counts */}
              {!isLoading && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {itemCounts.action_items > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckSquare className="h-3 w-3" />
                      {itemCounts.action_items} Action Items
                    </Badge>
                  )}
                  {itemCounts.decisions > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <Gavel className="h-3 w-3" />
                      {itemCounts.decisions} Decisions
                    </Badge>
                  )}
                  {itemCounts.questions > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <HelpCircle className="h-3 w-3" />
                      {itemCounts.questions} Questions
                    </Badge>
                  )}
                  {itemCounts.deferred > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {itemCounts.deferred} Deferred
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        {error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Sidebar */}
          <div className="space-y-4">
            {/* Audio Player */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-primary" />
                  <CardTitle>Recording</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {audioUrl ? (
                  <audio 
                    ref={audioRef}
                    controls 
                    className="w-full" 
                    src={audioUrl}
                    onTimeUpdate={handleTimeUpdate}
                  />
                ) : (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading audio…
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Export Panel */}
            {id && !isLoading && (
              <ExportPanel
                title={title}
                date={new Date(createdAt)}
                durationMs={durationMs}
                items={items}
                grouped={grouped}
                summary={summary}
                participants={linkedMeeting?.participants?.map(p => ({ name: p.name, email: p.email }))}
              />
            )}

            {/* Participants */}
            {linkedMeeting?.participants && linkedMeeting.participants.length > 0 && (
              <ParticipantsPanel participants={linkedMeeting.participants} />
            )}
          </div>

          {/* Main Panel - Tabbed Interface */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="intelligence" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="intelligence" className="gap-1.5">
                  <Brain className="h-4 w-4" />
                  Intelligence
                </TabsTrigger>
                <TabsTrigger value="followup" className="gap-1.5">
                  <Send className="h-4 w-4" />
                  Follow-Up
                </TabsTrigger>
                <TabsTrigger value="transcript" className="gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  Transcript
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-1.5">
                  <Milestone className="h-4 w-4" />
                  Timeline
                </TabsTrigger>
              </TabsList>

              <TabsContent value="intelligence">
                {id ? <ConversationIntelligence conversationId={id} /> : null}
              </TabsContent>

              <TabsContent value="followup">
                {id ? (
                  <FollowUpAutomation 
                    conversationId={id} 
                    meetingTitle={title}
                    participants={linkedMeeting?.participants?.map(p => ({ name: p.name, email: p.email }))}
                  />
                ) : null}
              </TabsContent>

              <TabsContent value="transcript">
                {id && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Full Transcript
                      </CardTitle>
                      <CardDescription>
                        Complete transcription with speaker segments. Click timestamps to jump in audio.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <LiveTranscript 
                        conversationId={id} 
                        currentTimeMs={currentTimeMs}
                        onSeek={handleSeek}
                      />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="timeline">
                <MeetingTimeline 
                  items={items} 
                  durationMs={durationMs}
                  onSeek={handleSeek}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Conversation;
