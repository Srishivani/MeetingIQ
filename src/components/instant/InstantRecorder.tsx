import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import { useConversationBackend } from "@/hooks/useConversationBackend";
import { useRealtimeTranscription, type TranscriptSegment } from "@/hooks/useRealtimeTranscription";
import { type DetectedPhrase } from "@/lib/phraseDetection";
import { LiveMeetingPanel } from "@/components/conversations/LiveMeetingPanel";
import { formatDuration } from "@/lib/conversations";
import { 
  Mic, Pause, Play, Square, Brain, Loader2, 
  Zap, Save, Trash2, Waves
} from "lucide-react";

function fileTitle() {
  const d = new Date();
  return `Quick Meeting ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

async function readAudioDurationMs(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.src = url;
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : 0);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
  });
}

export function InstantRecorder() {
  const navigate = useNavigate();
  const { uploadAndTranscribe } = useConversationBackend();
  const { state, error: recorderError, durationMs, blob, mimeType, start: startRecording, pause, resume, stop: stopRecording, reset: resetRecording } = useMediaRecorder();
  
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveProgress, setSaveProgress] = React.useState(0);
  const [showNameDialog, setShowNameDialog] = React.useState(false);
  const [meetingTitle, setMeetingTitle] = React.useState("");
  const [pendingBlob, setPendingBlob] = React.useState<Blob | null>(null);
  
  // Live items detected during recording
  const [liveItems, setLiveItems] = React.useState<Array<{
    id: string;
    type: "deferred" | "action_item" | "decision" | "question";
    content: string;
    triggerPhrase: string;
    timestampMs: number;
  }>>([]);

  // Handle phrase detection from transcription
  const handlePhraseDetected = React.useCallback((phrase: DetectedPhrase) => {
    setLiveItems((prev) => [...prev, {
      id: crypto.randomUUID(),
      type: phrase.type,
      content: phrase.content,
      triggerPhrase: phrase.triggerPhrase,
      timestampMs: phrase.timestampMs,
    }]);
  }, []);

  const {
    isConnected: isTranscribing,
    isConnecting,
    transcripts,
    partialText,
    fullTranscript,
    error: transcriptionError,
    start: startTranscription,
    stop: stopTranscription,
    reset: resetTranscription,
  } = useRealtimeTranscription({
    onPhraseDetected: handlePhraseDetected,
  });

  const isRecording = state === "recording";
  const isPaused = state === "paused";
  const error = recorderError || transcriptionError;

  const liveMeetingItems = React.useMemo(() => 
    liveItems.map((item) => ({
      id: item.id,
      conversationId: "temp",
      type: item.type,
      content: item.content,
      context: null,
      owner: null,
      timestampMs: item.timestampMs,
      triggerPhrase: item.triggerPhrase,
      isAiEnhanced: false,
      createdAt: new Date().toISOString(),
    })),
    [liveItems]
  );

  const liveGrouped = React.useMemo(() => ({
    deferred: liveMeetingItems.filter((i) => i.type === "deferred"),
    action_item: liveMeetingItems.filter((i) => i.type === "action_item"),
    decision: liveMeetingItems.filter((i) => i.type === "decision"),
    question: liveMeetingItems.filter((i) => i.type === "question"),
  }), [liveMeetingItems]);

  // Start both recording and transcription
  const handleStart = async () => {
    setLiveItems([]);
    await Promise.all([
      startRecording(),
      startTranscription(),
    ]);
  };

  // Stop both recording and transcription
  const handleStop = () => {
    stopRecording();
    stopTranscription();
  };

  // When recording stops, show naming dialog
  React.useEffect(() => {
    if (blob && state === "idle") {
      setPendingBlob(blob);
      setMeetingTitle(fileTitle());
      setShowNameDialog(true);
    }
  }, [blob, state]);

  const handleSave = async () => {
    if (!pendingBlob) return;
    
    setShowNameDialog(false);
    setIsSaving(true);
    setSaveProgress(15);

    const derivedDuration = durationMs || (await readAudioDurationMs(pendingBlob));
    setSaveProgress(45);

    const conversationId = await uploadAndTranscribe(pendingBlob, {
      title: meetingTitle || fileTitle(),
      durationMs: derivedDuration,
      mimeType: pendingBlob.type || mimeType || "audio/webm",
      sizeBytes: pendingBlob.size,
    });

    setSaveProgress(100);
    navigate(`/c/${conversationId}`);
  };

  const handleDiscard = () => {
    setShowNameDialog(false);
    setPendingBlob(null);
    setMeetingTitle("");
    setLiveItems([]);
    resetRecording();
    resetTranscription();
  };

  const handleRemoveLiveItem = (itemId: string) => {
    setLiveItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  return (
    <div className="space-y-6">
      {/* Main Recording Card */}
      <Card className="overflow-hidden border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="pt-8 pb-8">
          {error && <div className="mb-4 text-sm text-destructive text-center">{error}</div>}

          {/* Idle State - Big Start Button */}
          {state === "idle" && !pendingBlob && !isSaving && (
            <div className="flex flex-col items-center text-center">
              <button
                onClick={handleStart}
                disabled={isConnecting}
                className="group relative flex h-32 w-32 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95 disabled:opacity-50"
              >
                {isConnecting ? (
                  <Loader2 className="h-12 w-12 animate-spin" />
                ) : (
                  <>
                    <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20 group-hover:opacity-30" />
                    <Mic className="h-12 w-12" />
                  </>
                )}
              </button>
              <h2 className="mt-6 text-2xl font-bold">Start Instant Meeting</h2>
              <p className="mt-2 max-w-md text-muted-foreground">
                {isConnecting 
                  ? "Setting up real-time transcription..." 
                  : "One-click recording with live transcription. Add title and details after you're done."
                }
              </p>
              <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Zap className="h-4 w-4 text-primary" />
                  Real-time AI detection
                </span>
                <span className="flex items-center gap-1">
                  <Brain className="h-4 w-4 text-primary" />
                  Live transcription
                </span>
              </div>
            </div>
          )}

          {/* Recording State */}
          {(isRecording || isPaused) && (
            <div className="flex flex-col items-center text-center">
              <div className="relative flex h-32 w-32 items-center justify-center">
                {isRecording && (
                  <>
                    <span className="absolute inset-0 animate-ping rounded-full bg-destructive/30" />
                    <span className="absolute inset-4 animate-pulse rounded-full bg-destructive/20" />
                  </>
                )}
                <div className={`relative flex h-20 w-20 items-center justify-center rounded-full ${
                  isRecording ? "bg-destructive" : "bg-muted"
                }`}>
                  {isRecording ? (
                    <div className="h-6 w-6 rounded-sm bg-white" />
                  ) : (
                    <Pause className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
              </div>
              
              <div className="mt-4 text-4xl font-mono font-bold text-foreground">
                {formatDuration(durationMs)}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={isRecording ? "destructive" : "secondary"}>
                  {isRecording ? "Recording" : "Paused"}
                </Badge>
                {isTranscribing && (
                  <Badge variant="outline" className="gap-1">
                    <Waves className="h-3 w-3" />
                    Transcribing
                  </Badge>
                )}
              </div>

              <div className="mt-6 flex items-center gap-3">
                {isRecording ? (
                  <Button variant="outline" size="lg" onClick={pause} className="gap-2">
                    <Pause className="h-4 w-4" />
                    Pause
                  </Button>
                ) : (
                  <Button variant="outline" size="lg" onClick={resume} className="gap-2">
                    <Play className="h-4 w-4" />
                    Resume
                  </Button>
                )}
                <Button size="lg" onClick={handleStop} className="gap-2">
                  <Square className="h-4 w-4" />
                  Stop & Save
                </Button>
              </div>
            </div>
          )}

          {/* Saving State */}
          {isSaving && (
            <div className="flex flex-col items-center text-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <h2 className="mt-6 text-xl font-semibold">Processing your meeting…</h2>
              <Progress value={saveProgress} className="mt-4 w-64 h-2" />
              <p className="mt-2 text-sm text-muted-foreground">
                {saveProgress < 50 ? "Uploading audio..." : 
                 saveProgress < 80 ? "Finalizing transcription..." : 
                 "Generating AI summary..."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Transcript Panel */}
      {(isRecording || isPaused) && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Waves className="h-4 w-4 text-primary" />
              <span className="font-medium">Live Transcript</span>
              {isTranscribing && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
              )}
            </div>
            <ScrollArea className="h-40 rounded-lg border bg-muted/30 p-3">
              {transcripts.length === 0 && !partialText ? (
                <p className="text-sm text-muted-foreground italic">
                  Listening... speak to see real-time transcription
                </p>
              ) : (
                <div className="space-y-1 text-sm">
                  {transcripts.map((t) => (
                    <span key={t.id} className="text-foreground">
                      {t.text}{" "}
                    </span>
                  ))}
                  {partialText && (
                    <span className="text-muted-foreground italic">{partialText}</span>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Live Detection Panel */}
      {(isRecording || isPaused || liveItems.length > 0) && !isSaving && (
        <LiveMeetingPanel
          items={liveMeetingItems}
          grouped={liveGrouped}
          isRecording={isRecording}
          onRemove={handleRemoveLiveItem}
        />
      )}

      {/* Naming Dialog */}
      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Meeting Recording</DialogTitle>
            <DialogDescription>
              Give your meeting a name, or keep the auto-generated one.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Meeting Title</Label>
              <Input
                id="title"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="Enter meeting title..."
              />
            </div>

            {transcripts.length > 0 && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <div className="text-sm font-medium mb-2">Transcript Preview</div>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {fullTranscript.slice(0, 200)}
                  {fullTranscript.length > 200 && "..."}
                </p>
              </div>
            )}

            {liveItems.length > 0 && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <div className="text-sm font-medium mb-2">Detected Items</div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">{liveGrouped.action_item.length} Actions</Badge>
                  <Badge variant="secondary">{liveGrouped.decision.length} Decisions</Badge>
                  <Badge variant="secondary">{liveGrouped.question.length} Questions</Badge>
                  <Badge variant="secondary">{liveGrouped.deferred.length} Deferred</Badge>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleDiscard} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Discard
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Save & Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
