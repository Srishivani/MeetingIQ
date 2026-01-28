import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useRealtimeTranscription } from "@/hooks/useRealtimeTranscription";
import { type DetectedPhrase, type MeetingItemType } from "@/lib/phraseDetection";
import { LiveMeetingPanel } from "@/components/conversations/LiveMeetingPanel";
import type { ConversationRecord } from "@/lib/conversations";
import { formatDuration } from "@/lib/conversations";
import { 
  Mic, Upload, Pause, Play, Square, X, FileAudio, Brain, 
  Loader2, CheckSquare, Gavel, HelpCircle, Clock, AlertTriangle, RefreshCw,
  Save, Trash2, Waves
} from "lucide-react";

function fileTitle(prefix: string) {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${prefix} ${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function readAudioDurationMs(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.src = url;
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const ms = Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : 0;
      resolve(ms);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
  });
}

export function ConversationRecorder() {
  const navigate = useNavigate();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const { uploadAndTranscribe } = useConversationBackend();
  const { state, error: recorderError, durationMs, blob, mimeType, start: startRecording, pause, resume, stop: stopRecording, reset: resetRecording } = useMediaRecorder();
  
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveProgress, setSaveProgress] = React.useState(0);
  const [uploadedBlob, setUploadedBlob] = React.useState<File | null>(null);
  const [uploadedTitle, setUploadedTitle] = React.useState<string>("");
  
  // Naming dialog state
  const [showNameDialog, setShowNameDialog] = React.useState(false);
  const [meetingTitle, setMeetingTitle] = React.useState("");
  const [pendingBlob, setPendingBlob] = React.useState<Blob | null>(null);
  
  // Live items for live detection (before upload)
  const [liveItems, setLiveItems] = React.useState<Array<{
    id: string;
    type: MeetingItemType;
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

  // ElevenLabs real-time transcription
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

  // Convert live items to the format expected by LiveMeetingPanel
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
    risk: liveMeetingItems.filter((i) => i.type === "risk"),
    followup: liveMeetingItems.filter((i) => i.type === "followup"),
    commitment: liveMeetingItems.filter((i) => i.type === "commitment"),
    concern: liveMeetingItems.filter((i) => i.type === "concern"),
    ambiguity: liveMeetingItems.filter((i) => i.type === "ambiguity"),
  }), [liveMeetingItems]);

  const handleRemoveLiveItem = (itemId: string) => {
    setLiveItems((prev) => prev.filter((i) => i.id !== itemId));
  };

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
    if (blob && state === "idle" && !uploadedBlob) {
      setPendingBlob(blob);
      setMeetingTitle(fileTitle("Meeting"));
      setShowNameDialog(true);
    }
  }, [blob, state, uploadedBlob]);

  const saveBlob = React.useCallback(
    async (audioBlob: Blob, title: string) => {
      setIsSaving(true);
      setSaveProgress(15);

      const derivedDuration = durationMs || (await readAudioDurationMs(audioBlob));
      setSaveProgress(45);

      const record: ConversationRecord = {
        id: crypto.randomUUID(),
        title,
        createdAt: Date.now(),
        durationMs: derivedDuration,
        mimeType: audioBlob.type || mimeType || "audio/webm",
        sizeBytes: audioBlob.size,
        audioBlob,
        status: "uploading",
      };
      setSaveProgress(70);
      
      const conversationId = await uploadAndTranscribe(audioBlob, {
        title,
        durationMs: derivedDuration,
        mimeType: record.mimeType,
        sizeBytes: record.sizeBytes,
      });
      navigate(`/c/${conversationId}`);
      
      setSaveProgress(100);
      handleReset();
      setIsSaving(false);
      setSaveProgress(0);
    },
    [durationMs, mimeType, uploadAndTranscribe, navigate],
  );

  const handleSave = async () => {
    if (!pendingBlob && !uploadedBlob) return;
    
    const audioBlob = pendingBlob || uploadedBlob!;
    const title = meetingTitle || fileTitle("Meeting");
    
    setShowNameDialog(false);
    await saveBlob(audioBlob, title);
  };

  const handleDiscard = () => {
    setShowNameDialog(false);
    setPendingBlob(null);
    setMeetingTitle("");
    setLiveItems([]);
    setUploadedBlob(null);
    setUploadedTitle("");
    resetRecording();
    resetTranscription();
  };

  const onPickUpload = async (file: File) => {
    const okTypes = ["audio/webm", "audio/wav", "audio/mpeg", "audio/mp3", "audio/ogg", "audio/x-wav"];
    if (file.type && !okTypes.includes(file.type)) {
      // still allow — browsers sometimes omit accurate mime
    }
    setUploadedBlob(file);
    setUploadedTitle(fileTitle("Upload"));
  };

  const handleReset = () => {
    setUploadedBlob(null);
    setUploadedTitle("");
    setLiveItems([]);
    setPendingBlob(null);
    setMeetingTitle("");
    resetRecording();
    resetTranscription();
  };

  const candidateBlob = blob ?? uploadedBlob;

  const previewUrl = React.useMemo(() => {
    if (!candidateBlob) return null;
    return URL.createObjectURL(candidateBlob);
  }, [candidateBlob]);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>New Meeting</CardTitle>
              <CardDescription>Record or upload audio with real-time transcription and AI detection.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {error ? <div className="text-sm text-destructive">{error}</div> : null}

          {/* Recording Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {state === "idle" && !pendingBlob ? (
              <>
                <Button onClick={handleStart} size="lg" className="gap-2" disabled={isConnecting}>
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                  {isConnecting ? "Connecting..." : "Start Recording"}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2"
                  onClick={() => inputRef.current?.click()}
                  disabled={isSaving || isConnecting}
                >
                  <Upload className="h-4 w-4" />
                  Upload Audio
                </Button>
              </>
            ) : state !== "idle" ? (
              <>
                {isRecording ? (
                  <Button variant="secondary" size="lg" onClick={pause} className="gap-2">
                    <Pause className="h-4 w-4" />
                    Pause
                  </Button>
                ) : (
                  <Button variant="secondary" size="lg" onClick={resume} className="gap-2">
                    <Play className="h-4 w-4" />
                    Resume
                  </Button>
                )}
                <Button size="lg" onClick={handleStop} className="gap-2">
                  <Square className="h-4 w-4" />
                  Stop & Save
                </Button>
                <Button variant="ghost" onClick={handleDiscard} className="text-muted-foreground">
                  <X className="h-4 w-4 mr-1" />
                  Discard
                </Button>
              </>
            ) : null}
            <input
              ref={inputRef}
              type="file"
              accept="audio/*,.webm,.wav,.mp3"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.currentTarget.value = "";
                if (f) await onPickUpload(f);
              }}
            />
          </div>

          {/* Recording Status with Transcription Badge */}
          {(isRecording || isPaused) && (
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
              <div className="relative flex h-12 w-12 items-center justify-center">
                {isRecording && (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/40" />
                    <span className="relative flex h-4 w-4 rounded-full bg-destructive" />
                  </>
                )}
                {isPaused && (
                  <Pause className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {isRecording ? "Recording in progress" : "Recording paused"}
                  </span>
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
                <div className="text-2xl font-mono font-bold text-primary">
                  {formatDuration(durationMs)}
                </div>
              </div>
            </div>
          )}

          {/* Live Transcript Panel */}
          {(isRecording || isPaused) && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Waves className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Live Transcript</span>
                {isTranscribing && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                )}
              </div>
              <ScrollArea className="h-32 rounded-lg border bg-background p-3">
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
            </div>
          )}

          {/* Audio Preview for uploaded files */}
          {uploadedBlob && previewUrl && !showNameDialog ? (
            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileAudio className="h-4 w-4 text-primary" />
                Audio File Ready
              </div>
              <audio controls src={previewUrl} className="w-full" />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="lg"
                  className="gap-2"
                  onClick={() => {
                    setPendingBlob(uploadedBlob);
                    setMeetingTitle(uploadedTitle || fileTitle("Upload"));
                    setShowNameDialog(true);
                  }}
                  disabled={isSaving}
                >
                  <Brain className="h-4 w-4" />
                  Process Meeting
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isSaving}
                >
                  Choose Different File
                </Button>
              </div>
            </div>
          ) : null}

          {/* Upload Progress */}
          {isSaving ? (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Processing your meeting…
              </div>
              <Progress value={saveProgress} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {saveProgress < 50 ? "Uploading audio..." : 
                 saveProgress < 80 ? "Transcribing..." : 
                 "Generating summary..."}
              </div>
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="border-t bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1">
              <CheckSquare className="h-3 w-3" /> Actions
            </span>
            <span className="flex items-center gap-1">
              <Gavel className="h-3 w-3" /> Decisions
            </span>
            <span className="flex items-center gap-1">
              <HelpCircle className="h-3 w-3" /> Questions
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Risks
            </span>
            <span className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Follow-ups
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> Deferred
            </span>
          </div>
        </CardFooter>
      </Card>

      {/* Live Meeting Panel - shown during and after recording */}
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
