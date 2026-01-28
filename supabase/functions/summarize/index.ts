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

    if (chunksError) {
      console.error("[summarize] Failed to load transcript:", chunksError);
      return new Response(
        JSON.stringify({ success: false, error: chunksError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!chunks || chunks.length === 0) {
      // Not an error: transcription may still be running.
      return new Response(
        JSON.stringify({ success: false, error: "No transcript found yet" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fullTranscript = chunks.map((c: { text: string }) => c.text).join(" ");

    const systemPrompt = `You are a professional meeting analyst. Generate a structured summary from the transcript.
Return ONLY valid JSON with these keys:
- "key_points": array of 3-5 main discussion points
- "decisions": array of explicit decisions made (look for phrases like "let's go with", "agreed", "we've decided")
- "action_items": array of objects with {"content": "task description", "owner": "person name or null", "timestamp_ms": number} — detect owners from context like "John will...", "I'll handle..."
- "open_questions": array of unresolved questions raised
- "deferred_items": array of objects with {"content": "topic", "timestamp_ms": number} — items explicitly postponed or tabled
- "notable_quotes": array of objects with {"text": "quote", "timestamp_ms": number} — use actual chunk start_ms for timestamps

For action_items and deferred_items, try to extract the owner/assignee from the surrounding context.
Be thorough in detecting implicit action items (e.g., "we should look into...", "someone needs to...").
Be concise. Return valid JSON only.`;

    const userPrompt = `Transcript:\n${fullTranscript}\n\nChunk timestamps (for reference):\n${chunks
      .map(
        (
          c: { start_ms: number; end_ms: number; text: string },
          i: number,
        ) => `[${i}] ${c.start_ms}ms-${c.end_ms}ms: ${c.text.slice(0, 60)}...`,
      )
      .join("\n")}`;

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

    // Extract simple action items for storage (flatten if objects)
    const actionItemsFlat = (summary.action_items || []).map((ai: string | { content: string }) => 
      typeof ai === "string" ? ai : ai.content
    );

    await supabase.from("summaries").upsert({
      conversation_id: conversationId,
      key_points: summary.key_points || [],
      decisions: summary.decisions || [],
      action_items: actionItemsFlat,
      open_questions: summary.open_questions || [],
      notable_quotes: summary.notable_quotes || [],
    });

    // Insert AI-enhanced meeting items
    const deviceKey = req.headers.get("x-device-key") ?? "";
    
    // Insert action items with owners
    for (const ai of summary.action_items || []) {
      const content = typeof ai === "string" ? ai : ai.content;
      const owner = typeof ai === "object" ? ai.owner : null;
      const timestampMs = typeof ai === "object" ? (ai.timestamp_ms || 0) : 0;
      
      await supabase.from("meeting_items").insert({
        conversation_id: conversationId,
        device_key: deviceKey,
        item_type: "action_item",
        content,
        owner,
        timestamp_ms: timestampMs,
        is_ai_enhanced: true,
      });
    }

    // Insert deferred items
    for (const di of summary.deferred_items || []) {
      const content = typeof di === "string" ? di : di.content;
      const timestampMs = typeof di === "object" ? (di.timestamp_ms || 0) : 0;
      
      await supabase.from("meeting_items").insert({
        conversation_id: conversationId,
        device_key: deviceKey,
        item_type: "deferred",
        content,
        timestamp_ms: timestampMs,
        is_ai_enhanced: true,
      });
    }

    // Insert decisions as meeting items
    for (const decision of summary.decisions || []) {
      await supabase.from("meeting_items").insert({
        conversation_id: conversationId,
        device_key: deviceKey,
        item_type: "decision",
        content: decision,
        timestamp_ms: 0,
        is_ai_enhanced: true,
      });
    }

    // Insert open questions as meeting items
    for (const question of summary.open_questions || []) {
      await supabase.from("meeting_items").insert({
        conversation_id: conversationId,
        device_key: deviceKey,
        item_type: "question",
        content: question,
        timestamp_ms: 0,
        is_ai_enhanced: true,
      });
    }

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
