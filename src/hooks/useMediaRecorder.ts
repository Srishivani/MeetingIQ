import * as React from "react";

type RecorderState = "idle" | "recording" | "paused";

function pickMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  for (const t of candidates) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (window as any).MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export function useMediaRecorder() {
  const [state, setState] = React.useState<RecorderState>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [durationMs, setDurationMs] = React.useState(0);
  const [blob, setBlob] = React.useState<Blob | null>(null);
  const [mimeType, setMimeType] = React.useState<string>("");

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<BlobPart[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);
  const startAtRef = React.useRef<number | null>(null);
  const timerRef = React.useRef<number | null>(null);

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    timerRef.current = window.setInterval(() => {
      if (startAtRef.current == null) return;
      setDurationMs(Date.now() - startAtRef.current);
    }, 200);
  };

  const reset = React.useCallback(() => {
    stopTimer();
    setState("idle");
    setError(null);
    setDurationMs(0);
    setBlob(null);
    chunksRef.current = [];
    startAtRef.current = null;
    mediaRecorderRef.current = null;
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
    }
    streamRef.current = null;
  }, []);

  const start = React.useCallback(async () => {
    try {
      setError(null);
      setBlob(null);
      setDurationMs(0);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const chosen = pickMimeType();
      setMimeType(chosen || "audio/webm");

      const recorder = new MediaRecorder(stream, chosen ? { mimeType: chosen } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) chunksRef.current.push(evt.data);
      };

      recorder.onstop = () => {
        stopTimer();
        const finalBlob = new Blob(chunksRef.current, { type: recorder.mimeType || chosen || "audio/webm" });
        setBlob(finalBlob);
        setState("idle");
      };

      recorder.onerror = (evt) => {
        stopTimer();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = (evt as any).error as Error | undefined;
        setError(err?.message ?? "Recorder error");
        setState("idle");
      };

      startAtRef.current = Date.now();
      setState("recording");
      startTimer();
      recorder.start(250);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Microphone permission failed");
    }
  }, []);

  const pause = React.useCallback(() => {
    const r = mediaRecorderRef.current;
    if (!r || r.state !== "recording") return;
    r.pause();
    stopTimer();
    setState("paused");
  }, []);

  const resume = React.useCallback(() => {
    const r = mediaRecorderRef.current;
    if (!r || r.state !== "paused") return;
    r.resume();
    if (startAtRef.current != null) {
      // adjust start time so duration keeps increasing correctly
      const now = Date.now();
      const current = durationMs;
      startAtRef.current = now - current;
    }
    startTimer();
    setState("recording");
  }, [durationMs]);

  const stop = React.useCallback(() => {
    const r = mediaRecorderRef.current;
    if (!r) return;
    if (r.state === "inactive") return;
    r.stop();
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
    }
    streamRef.current = null;
  }, []);

  React.useEffect(() => {
    return () => reset();
  }, [reset]);

  return { state, error, durationMs, blob, mimeType, start, pause, resume, stop, reset };
}
