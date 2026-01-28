import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type ElevenLabsWord = {
  text: string;
  start: number;
  end: number;
  type?: string;
  speaker?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-device-key, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: {
            "x-device-key": req.headers.get("x-device-key") ?? "",
          },
        },
      }
    );

    const formData = await req.formData();
    const conversationId = formData.get("conversationId") as string;
    const audioFile = formData.get("audio") as File;

    if (!conversationId || !audioFile) {
      return new Response(
        JSON.stringify({ error: "conversationId and audio file are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update conversation status
    await supabase
      .from("conversations")
      .update({ status: "transcribing" })
      .eq("id", conversationId);

    console.log("[transcribe] Starting transcription for conversation:", conversationId);

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const transcribeFormData = new FormData();
    transcribeFormData.append("file", audioFile);
    transcribeFormData.append("model_id", "scribe_v2");
    transcribeFormData.append("tag_audio_events", "false");
    transcribeFormData.append("diarize", "true");
    // Ensure word-level timestamps are included
    transcribeFormData.append("timestamps_granularity", "word");

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY || "",
      },
      body: transcribeFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[transcribe] ElevenLabs error:", response.status, errorText);
      throw new Error(`Transcription failed: ${response.status}`);
    }

    const transcription = await response.json();
    console.log(
      "[transcribe] Transcription received",
      JSON.stringify({ hasText: !!transcription?.text, words: transcription?.words?.length ?? 0 })
    );

    // Insert transcript chunks (every ~5 words or 10s, whichever is first)
    const rawWords: ElevenLabsWord[] = Array.isArray(transcription.words) ? (transcription.words as ElevenLabsWord[]) : [];
    // Some responses include spacing tokens; keep actual words only.
    const words = rawWords.filter((w) => (w.type ?? "word") === "word" && typeof w.text === "string");
    const chunks: Array<{ text: string; start_ms: number; end_ms: number; speaker: string | null }> = [];
    let buffer: typeof words = [];
    let bufferStartMs = 0;
    let currentSpeaker: string | null = null;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const wordSpeaker = w.speaker ?? null;
      
      if (buffer.length === 0) {
        bufferStartMs = Math.round(w.start * 1000);
        currentSpeaker = wordSpeaker;
      }
      
      // If speaker changes, commit current buffer and start new one
      const speakerChanged = wordSpeaker !== currentSpeaker && buffer.length > 0;
      
      if (speakerChanged) {
        const lastWord = buffer[buffer.length - 1];
        const chunkText = buffer.map((ww) => ww.text).join(" ");
        const endMs = Math.round(lastWord.end * 1000);
        chunks.push({ text: chunkText, start_ms: bufferStartMs, end_ms: endMs, speaker: currentSpeaker });
        buffer = [];
        bufferStartMs = Math.round(w.start * 1000);
        currentSpeaker = wordSpeaker;
      }
      
      buffer.push(w);

      const span = Math.round(w.end * 1000) - bufferStartMs;
      if (buffer.length >= 5 || span >= 10000 || i === words.length - 1) {
        const chunkText = buffer.map((ww: { text: string; start: number; end: number }) => ww.text).join(" ");
        const endMs = Math.round(w.end * 1000);
        chunks.push({ text: chunkText, start_ms: bufferStartMs, end_ms: endMs, speaker: currentSpeaker });
        buffer = [];
      }
    }

    console.log(`[transcribe] Created ${chunks.length} chunks`);

    // Fallback: if ElevenLabs didn't return word timestamps, store the full text as one chunk.
    if (chunks.length === 0 && typeof transcription?.text === "string" && transcription.text.trim()) {
      chunks.push({ text: transcription.text.trim(), start_ms: 0, end_ms: 0, speaker: null });
      console.log("[transcribe] Fallback to single chunk from transcription.text");
    }

    for (const chunk of chunks) {
      const { error: insertErr } = await supabase.from("transcript_chunks").insert({
        conversation_id: conversationId,
        text: chunk.text,
        start_ms: chunk.start_ms,
        end_ms: chunk.end_ms,
        speaker: chunk.speaker,
      });

      if (insertErr) {
        console.error("[transcribe] Failed to insert chunk:", insertErr);
        throw new Error("Failed to save transcript chunks");
      }
    }

    // Update conversation to ready
    await supabase
      .from("conversations")
      .update({ status: "ready" })
      .eq("id", conversationId);

    console.log("[transcribe] Transcription complete for:", conversationId);

    return new Response(
      JSON.stringify({ success: true, chunksCount: chunks.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[transcribe] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
