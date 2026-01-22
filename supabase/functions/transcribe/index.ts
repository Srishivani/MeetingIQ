import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
    transcribeFormData.append("diarize", "false");

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
    console.log("[transcribe] Transcription received, processing words");

    // Insert transcript chunks (every ~5 words or 10s, whichever is first)
    const words = transcription.words || [];
    const chunks: Array<{ text: string; start_ms: number; end_ms: number }> = [];
    let buffer: typeof words = [];
    let bufferStartMs = 0;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (buffer.length === 0) {
        bufferStartMs = Math.round(w.start * 1000);
      }
      buffer.push(w);

      const span = Math.round(w.end * 1000) - bufferStartMs;
      if (buffer.length >= 5 || span >= 10000 || i === words.length - 1) {
        const chunkText = buffer.map((ww: { text: string; start: number; end: number }) => ww.text).join(" ");
        const endMs = Math.round(w.end * 1000);
        chunks.push({ text: chunkText, start_ms: bufferStartMs, end_ms: endMs });
        buffer = [];
      }
    }

    console.log(`[transcribe] Created ${chunks.length} chunks`);

    for (const chunk of chunks) {
      await supabase.from("transcript_chunks").insert({
        conversation_id: conversationId,
        text: chunk.text,
        start_ms: chunk.start_ms,
        end_ms: chunk.end_ms,
      });
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
