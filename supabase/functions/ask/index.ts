import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    const { conversationId, question } = await req.json();
    if (!conversationId || !question) {
      return new Response(
        JSON.stringify({ error: "conversationId and question are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[ask] Question for conversation:", conversationId, question);

    // Retrieve all transcript chunks for the conversation (simple retrieval; no embeddings for MVP)
    const { data: chunks, error: chunksError } = await supabase
      .from("transcript_chunks")
      .select("text, start_ms, end_ms")
      .eq("conversation_id", conversationId)
      .order("start_ms", { ascending: true });

    if (chunksError || !chunks || chunks.length === 0) {
      return new Response(
        JSON.stringify({ answer: "No transcript available for this conversation.", citations: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simple keyword matching for retrieval (MVP: no embeddings)
    const questionLower = question.toLowerCase();
    const relevantChunks = chunks.filter((c) =>
      c.text.toLowerCase().split(" ").some((word: string) => questionLower.includes(word))
    );

    const contextChunks = relevantChunks.length > 0 ? relevantChunks.slice(0, 10) : chunks.slice(0, 10);
    const context = contextChunks.map((c, i) => `[${i}] ${c.text} (${c.start_ms}ms)`).join("\n");

    const systemPrompt = `You are an AI assistant that answers questions strictly based on the provided conversation transcript.
CRITICAL RULES:
- Only use information from the transcript below
- If the answer is not in the transcript, respond with: "This was not discussed in the conversation."
- Cite which chunk(s) you used (e.g., "According to [0]...")
- Be concise and direct

Transcript chunks:
${context}`;

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 512,
        messages: [
          { role: "user", content: `${systemPrompt}\n\nQuestion: ${question}` },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error("[ask] Claude error:", claudeResponse.status, errorText);
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = await claudeResponse.json();
    const answer = claudeData.content[0].text;

    // Extract citations (basic regex for [0], [1], etc.)
    const citationMatches = answer.matchAll(/\[(\d+)\]/g);
    const citedIndices = new Set(Array.from(citationMatches).map((m) => parseInt((m as RegExpMatchArray)[1])));
    const citations = contextChunks
      .filter((_, i) => citedIndices.has(i))
      .map((c) => ({ text: c.text, timestamp_ms: c.start_ms }));

    console.log("[ask] Answer generated with", citations.length, "citations");

    return new Response(
      JSON.stringify({ answer, citations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[ask] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
