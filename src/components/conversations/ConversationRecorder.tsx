import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import { useConversationBackend } from "@/hooks/useConversationBackend";
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

export function ConversationRecorder({
  onCreate,
}: {
  onCreate: (record: ConversationRecord) => Promise<void> | void;
}) {
  const navigate = useNavigate();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const { uploadAndTranscribe } = useConversationBackend();
  const { state, error, durationMs, blob, mimeType, start, pause, resume, stop, reset } = useMediaRecorder();
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveProgress, setSaveProgress] = React.useState(0);
  const [savingMode, setSavingMode] = React.useState<"local" | "backend">("local");

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
        status: savingMode === "local" ? "local" : "uploading",
      };
      setSaveProgress(70);
      
      if (savingMode === "local") {
        await onCreate(record);
      } else {
        const conversationId = await uploadAndTranscribe(audioBlob, {
          title,
          durationMs: derivedDuration,
          mimeType: record.mimeType,
          sizeBytes: record.sizeBytes,
        });
        navigate(`/c/${conversationId}`);
      }
      
      setSaveProgress(100);
      reset();
      setIsSaving(false);
      setSaveProgress(0);
      setSavingMode("local");
    },
    [durationMs, mimeType, onCreate, reset, savingMode, uploadAndTranscribe, navigate],
  );

  const onPickUpload = async (file: File) => {
    const okTypes = ["audio/webm", "audio/wav", "audio/mpeg", "audio/mp3", "audio/ogg", "audio/x-wav"];
    if (file.type && !okTypes.includes(file.type)) {
      // still allow — browsers sometimes omit accurate mime
    }
    await saveBlob(file, fileTitle("Upload"));
  };

  const previewUrl = React.useMemo(() => {
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }, [blob]);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>New conversation</CardTitle>
        <CardDescription>Record in-browser or upload an audio file. Stored locally (IndexedDB).</CardDescription>
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
              <Button variant="outline" onClick={reset}>
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

        {blob && previewUrl ? (
          <div className="space-y-3">
            <audio controls src={previewUrl} className="w-full" />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => { setSavingMode("local"); void saveBlob(blob, fileTitle("Recording")); }} disabled={isSaving}>
                Save locally (IndexedDB)
              </Button>
              <Button onClick={() => { setSavingMode("backend"); void saveBlob(blob, fileTitle("Recording")); }} disabled={isSaving}>
                Upload + Transcribe + Summarize
              </Button>
              <Button variant="outline" onClick={reset} disabled={isSaving}>
                Record again
              </Button>
            </div>
          </div>
        ) : null}

        {isSaving ? (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Saving to IndexedDB…</div>
            <Progress value={saveProgress} />
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Upload to the backend to unlock transcription, summaries, and Q&A with citations.
      </CardFooter>
    </Card>
  );
}
