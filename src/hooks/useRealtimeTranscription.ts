import * as React from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { supabaseDevice } from "@/integrations/supabase/clientDevice";
import { detectPhrases, type DetectedPhrase } from "@/lib/phraseDetection";

export interface TranscriptSegment {
  id: string;
  text: string;
  timestampMs: number;
  isFinal: boolean;
}

export interface UseRealtimeTranscriptionOptions {
  onTranscript?: (segment: TranscriptSegment) => void;
  onPhraseDetected?: (phrase: DetectedPhrase) => void;
  onError?: (error: string) => void;
}

export function useRealtimeTranscription(options: UseRealtimeTranscriptionOptions = {}) {
  const { onTranscript, onPhraseDetected, onError } = options;
  
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [transcripts, setTranscripts] = React.useState<TranscriptSegment[]>([]);
  const [partialText, setPartialText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  
  const startTimeRef = React.useRef<number>(0);
  const processedTextsRef = React.useRef<Set<string>>(new Set());

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      setPartialText(data.text || "");
    },
    onCommittedTranscript: (data) => {
      const text = data.text?.trim();
      if (!text) return;
      
      // Avoid duplicates
      if (processedTextsRef.current.has(text)) return;
      processedTextsRef.current.add(text);
      
      const timestampMs = Date.now() - startTimeRef.current;
      
      const segment: TranscriptSegment = {
        id: crypto.randomUUID(),
        text,
        timestampMs,
        isFinal: true,
      };
      
      setTranscripts((prev) => [...prev, segment]);
      setPartialText("");
      onTranscript?.(segment);
      
      // Detect phrases in committed text
      const detected = detectPhrases(text, timestampMs);
      for (const phrase of detected) {
        onPhraseDetected?.(phrase);
      }
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Transcription error";
      setError(message);
      onError?.(message);
    },
  });

  const start = React.useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    processedTextsRef.current.clear();
    
    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get scribe token from edge function
      const { data, error: tokenError } = await supabaseDevice.functions.invoke("scribe-token");
      
      if (tokenError || !data?.token) {
        throw new Error(tokenError?.message || "Failed to get transcription token");
      }
      
      startTimeRef.current = Date.now();
      
      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start transcription";
      setError(message);
      onError?.(message);
    } finally {
      setIsConnecting(false);
    }
  }, [scribe, onError]);

  const stop = React.useCallback(() => {
    scribe.disconnect();
    setPartialText("");
  }, [scribe]);

  const reset = React.useCallback(() => {
    scribe.disconnect();
    setTranscripts([]);
    setPartialText("");
    setError(null);
    processedTextsRef.current.clear();
  }, [scribe]);

  // Get full transcript text
  const fullTranscript = React.useMemo(() => {
    const committed = transcripts.map((t) => t.text).join(" ");
    return partialText ? `${committed} ${partialText}`.trim() : committed;
  }, [transcripts, partialText]);

  return {
    isConnected: scribe.isConnected,
    isConnecting,
    transcripts,
    partialText,
    fullTranscript,
    error,
    start,
    stop,
    reset,
  };
}
