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

    const { conversationId } = await req.json();
    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: "conversationId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[summarize] Generating summary for:", conversationId);

    const { data: chunks, error: chunksError } = await supabase
      .from("transcript_chunks")
      .select("text, start_ms, end_ms")
      .eq("conversation_id", conversationId)
      .order("start_ms", { ascending: true });

    if (chunksError || !chunks || chunks.length === 0) {
      throw new Error("No transcript found");
    }

    const fullTranscript = chunks.map((c) => c.text).join(" ");

    const systemPrompt = `You are a professional conversation analyst. Generate a structured summary from the transcript.
Return ONLY valid JSON with these keys:
- "key_points": array of 3-5 main discussion points
- "decisions": array of explicit decisions made
- "action_items": array of next steps or tasks
- "open_questions": array of unresolved questions
- "notable_quotes": array of objects with {"text": "quote", "timestamp_ms": number} — use actual chunk start_ms for timestamps

Be concise. Use bullet points. Return valid JSON only.`;

    const userPrompt = `Transcript:\n${fullTranscript}\n\nChunk timestamps (for quotes):\n${chunks.map((c, i) => `[${i}] ${c.start_ms}ms-${c.end_ms}ms: ${c.text.slice(0, 40)}...`).join("\n")}`;

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
        max_tokens: 2048,
        messages: [
          { role: "user", content: `${systemPrompt}\n\n${userPrompt}` },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error("[summarize] Claude error:", claudeResponse.status, errorText);
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = await claudeResponse.json();
    const rawText = claudeData.content[0].text;
    console.log("[summarize] Claude raw response:", rawText);

    // Extract JSON from markdown code blocks if present
    let summaryJson = rawText;
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      summaryJson = jsonMatch[1];
    }

    const summary = JSON.parse(summaryJson);

    await supabase.from("summaries").upsert({
      conversation_id: conversationId,
      key_points: summary.key_points || [],
      decisions: summary.decisions || [],
      action_items: summary.action_items || [],
      open_questions: summary.open_questions || [],
      notable_quotes: summary.notable_quotes || [],
    });

    console.log("[summarize] Summary saved for:", conversationId);

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[summarize] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
