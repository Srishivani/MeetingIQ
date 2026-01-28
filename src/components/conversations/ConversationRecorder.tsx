import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import { useConversationBackend } from "@/hooks/useConversationBackend";
import { useMeetingItems } from "@/hooks/useMeetingItems";
import { detectPhrases, type DetectedPhrase } from "@/lib/phraseDetection";
import { LiveMeetingPanel } from "@/components/conversations/LiveMeetingPanel";
import type { ConversationRecord } from "@/lib/conversations";
import { formatDuration } from "@/lib/conversations";
import { useNavigate } from "react-router-dom";

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

// Real-time speech recognition hook (Web Speech API fallback)
function useSpeechRecognition(
  isRecording: boolean,
  onTranscript: (text: string, timestampMs: number) => void
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = React.useRef<any>(null);
  const startTimeRef = React.useRef<number>(0);

  React.useEffect(() => {
    if (!isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      return;
    }

    // Check for Web Speech API support
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.log("[SpeechRecognition] Not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    startTimeRef.current = Date.now();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const results = event.results;
      for (let i = event.resultIndex; i < results.length; i++) {
        const result = results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          const timestampMs = Date.now() - startTimeRef.current;
          if (text) {
            onTranscript(text, timestampMs);
          }
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.log("[SpeechRecognition] Error:", event.error);
      // Restart on recoverable errors
      if (event.error === "no-speech" || event.error === "aborted") {
        try {
          recognition.start();
        } catch (e) {
          // Already started
        }
      }
    };

    recognition.onend = () => {
      // Restart if still recording
      if (isRecording && recognitionRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // Already started
        }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.log("[SpeechRecognition] Start failed:", e);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [isRecording, onTranscript]);
}

export function ConversationRecorder() {
  const navigate = useNavigate();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const { uploadAndTranscribe } = useConversationBackend();
  const { state, error, durationMs, blob, mimeType, start, pause, resume, stop, reset } = useMediaRecorder();
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveProgress, setSaveProgress] = React.useState(0);
  const [uploadedBlob, setUploadedBlob] = React.useState<File | null>(null);
  const [uploadedTitle, setUploadedTitle] = React.useState<string>("");
  
  // Temporary conversation ID for live detection (before actual upload)
  const [tempConversationId] = React.useState(() => crypto.randomUUID());
  const { items, grouped, addItem, removeItem, clearAll } = useMeetingItems(null);
  
  // Local items for live detection (before upload)
  const [liveItems, setLiveItems] = React.useState<Array<{
    id: string;
    type: "deferred" | "action_item" | "decision" | "question";
    content: string;
    triggerPhrase: string;
    timestampMs: number;
  }>>([]);

  const isRecording = state === "recording";

  // Handle real-time transcript and phrase detection
  const handleTranscript = React.useCallback((text: string, timestampMs: number) => {
    const detected = detectPhrases(text, timestampMs);
    
    for (const phrase of detected) {
      const newItem = {
        id: crypto.randomUUID(),
        type: phrase.type,
        content: phrase.content,
        triggerPhrase: phrase.triggerPhrase,
        timestampMs: phrase.timestampMs,
      };
      setLiveItems((prev) => [...prev, newItem]);
    }
  }, []);

  // Use Web Speech API for real-time recognition
  useSpeechRecognition(isRecording, handleTranscript);

  // Convert live items to the format expected by LiveMeetingPanel
  const liveMeetingItems = React.useMemo(() => 
    liveItems.map((item) => ({
      id: item.id,
      conversationId: tempConversationId,
      type: item.type,
      content: item.content,
      context: null,
      owner: null,
      timestampMs: item.timestampMs,
      triggerPhrase: item.triggerPhrase,
      isAiEnhanced: false,
      createdAt: new Date().toISOString(),
    })),
    [liveItems, tempConversationId]
  );

  const liveGrouped = React.useMemo(() => ({
    deferred: liveMeetingItems.filter((i) => i.type === "deferred"),
    action_item: liveMeetingItems.filter((i) => i.type === "action_item"),
    decision: liveMeetingItems.filter((i) => i.type === "decision"),
    question: liveMeetingItems.filter((i) => i.type === "question"),
  }), [liveMeetingItems]);

  const handleRemoveLiveItem = (itemId: string) => {
    setLiveItems((prev) => prev.filter((i) => i.id !== itemId));
  };

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
      reset();
      setUploadedBlob(null);
      setUploadedTitle("");
      setLiveItems([]);
      setIsSaving(false);
      setSaveProgress(0);
    },
    [durationMs, mimeType, reset, uploadAndTranscribe, navigate],
  );

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
    reset();
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
      <Card>
        <CardHeader>
          <CardTitle>New conversation</CardTitle>
          <CardDescription>Record or upload audio. Real-time phrase detection will identify action items, decisions, and more.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <div className="text-sm text-destructive">{error}</div> : null}

          <div className="flex flex-wrap items-center gap-2">
            {state === "idle" ? (
              <Button onClick={start}>Start recording</Button>
            ) : (
              <>
                {state === "recording" ? (
                  <Button variant="secondary" onClick={pause}>
                    Pause
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={resume}>
                    Resume
                  </Button>
                )}
                <Button variant="default" onClick={stop}>
                  Stop
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Discard
                </Button>
              </>
            )}

            <Button
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={isSaving || state !== "idle"}
            >
              Upload audio
            </Button>
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

          <div className="text-sm text-muted-foreground">
            {state === "idle" ? "Ready" : `Recording • ${formatDuration(durationMs)}`}
          </div>

          {candidateBlob && previewUrl ? (
            <div className="space-y-3">
              <audio controls src={previewUrl} className="w-full" />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    const title = uploadedBlob ? uploadedTitle : fileTitle("Recording");
                    void saveBlob(candidateBlob, title);
                  }}
                  disabled={isSaving}
                >
                  Upload + Transcribe + Summarize
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isSaving}
                >
                  Record again
                </Button>
              </div>
            </div>
          ) : null}

          {isSaving ? (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Uploading to backend…
              </div>
              <Progress value={saveProgress} />
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          Upload to the backend to unlock transcription, AI summaries, and Q&A with citations.
        </CardFooter>
      </Card>

      {/* Live Meeting Panel - shown during and after recording */}
      {(isRecording || state === "paused" || liveItems.length > 0) && (
        <LiveMeetingPanel
          items={liveMeetingItems}
          grouped={liveGrouped}
          isRecording={isRecording}
          onRemove={handleRemoveLiveItem}
        />
      )}
    </div>
  );
}
