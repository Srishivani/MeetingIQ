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

    console.log("[summarize] Generating executive summary for:", conversationId);

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
      return new Response(
        JSON.stringify({ success: false, error: "No transcript found yet" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fullTranscript = chunks.map((c: { text: string }) => c.text).join(" ");

    const systemPrompt = `You are an executive meeting analyst producing top-tier meeting intelligence.

Generate a comprehensive, executive-grade meeting summary that busy leaders can act on immediately.

Return ONLY valid JSON with these keys:

## EXECUTIVE SUMMARY
- "executive_summary": string - 2-3 sentence overview of what was discussed and decided (the TL;DR for executives)

## KEY POINTS
- "key_points": array of 3-5 main discussion points (what was talked about)

## DECISION LOG
- "decisions": array of objects with:
  - "content": string - what was decided
  - "rationale": string - why this decision was made (if stated)
  - "alternatives_rejected": array of strings - what options were NOT chosen
  - "owner": string or null - who made/owns the decision
  - "timestamp_ms": number

## ACTION ITEMS (must track: task, owner, deadline, confidence)
- "action_items": array of objects with:
  - "content": string - the specific task
  - "owner": string or null - who is responsible
  - "deadline": string or null - when it's due (even fuzzy like "next week")
  - "priority": "high" | "medium" | "low"
  - "confidence": number 0-1 - how confident we are this is a real action item
  - "timestamp_ms": number

## DEFERRED ITEMS (Parking Lot)
- "deferred_items": array of objects with:
  - "content": string - topic postponed
  - "revisit_when": string or null - when to revisit
  - "reason": string or null - why it was deferred
  - "timestamp_ms": number

## RISK REGISTER
- "risks": array of objects with:
  - "content": string - the risk or concern
  - "severity": "high" | "medium" | "low"
  - "owner": string or null - who should own this risk
  - "mitigation": string or null - any mentioned mitigation
  - "timestamp_ms": number

## OPEN QUESTIONS
- "open_questions": array of strings - unresolved questions that need answers

## AMBIGUITY FLAGS (things that sound done but aren't)
- "ambiguities": array of objects with:
  - "content": string - the ambiguous statement
  - "why_unclear": string - what makes this unclear
  - "clarification_needed": string - what needs to be clarified
  - "timestamp_ms": number

## FOLLOW-UP AUTOMATION
- "follow_up_email": string - A professional recap email draft (ready to send, 3-4 paragraphs)
- "next_meeting_agenda": array of strings - Suggested agenda items for next meeting (from deferred items + open questions)
- "task_nudges": array of objects with:
  - "recipient": string - who to nudge
  - "task": string - what task
  - "suggested_date": string - when to send nudge

## NOTABLE QUOTES
- "notable_quotes": array of objects with {"text": "quote", "timestamp_ms": number}

Be thorough. If humans still have to manually track actions after reading this, the summary failed.
Detect implicit action items (e.g., "we should look into...", "someone needs to...").
Flag hedging language (probably, maybe, should be fine) as ambiguities.
Use actual chunk start_ms for timestamps.`;

    const userPrompt = `Transcript:\n${fullTranscript}\n\nChunk timestamps:\n${chunks
      .map(
        (c: { start_ms: number; end_ms: number; text: string }, i: number) =>
          `[${i}] ${c.start_ms}ms-${c.end_ms}ms: ${c.text.slice(0, 80)}...`
      )
      .join("\n")}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    console.log("[summarize] Calling Lovable AI Gateway...");
    
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[summarize] AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawText = aiData.choices?.[0]?.message?.content || "";
    console.log("[summarize] AI raw response length:", rawText.length);

    // Extract JSON from markdown code blocks if present
    let summaryJson = rawText;
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      summaryJson = jsonMatch[1];
    }

    const summary = JSON.parse(summaryJson);

    // Flatten action items for legacy storage
    const actionItemsFlat = (summary.action_items || []).map((ai: { content: string }) => ai.content);

    // Store enhanced summary
    await supabase.from("summaries").upsert({
      conversation_id: conversationId,
      key_points: summary.key_points || [],
      decisions: (summary.decisions || []).map((d: { content: string }) => d.content),
      action_items: actionItemsFlat,
      open_questions: summary.open_questions || [],
      notable_quotes: summary.notable_quotes || [],
    });

    // Insert AI-enhanced meeting items with full intelligence
    const deviceKey = req.headers.get("x-device-key") ?? "";
    
    // Insert action items with full metadata
    for (const ai of summary.action_items || []) {
      await supabase.from("meeting_items").insert({
        conversation_id: conversationId,
        device_key: deviceKey,
        item_type: "action_item",
        content: ai.content,
        owner: ai.owner || null,
        priority: ai.priority || "medium",
        due_date: parseFuzzyDate(ai.deadline),
        timestamp_ms: ai.timestamp_ms || 0,
        is_ai_enhanced: true,
        context: `Confidence: ${ai.confidence || 0.8}`,
      });
    }

    // Insert decisions with rationale
    for (const d of summary.decisions || []) {
      const context = [
        d.rationale ? `Rationale: ${d.rationale}` : null,
        d.alternatives_rejected?.length ? `Rejected: ${d.alternatives_rejected.join(", ")}` : null,
      ].filter(Boolean).join(" | ");

      await supabase.from("meeting_items").insert({
        conversation_id: conversationId,
        device_key: deviceKey,
        item_type: "decision",
        content: d.content,
        owner: d.owner || null,
        timestamp_ms: d.timestamp_ms || 0,
        is_ai_enhanced: true,
        context: context || null,
      });
    }

    // Insert deferred items
    for (const di of summary.deferred_items || []) {
      const context = [
        di.revisit_when ? `Revisit: ${di.revisit_when}` : null,
        di.reason ? `Reason: ${di.reason}` : null,
      ].filter(Boolean).join(" | ");

      await supabase.from("meeting_items").insert({
        conversation_id: conversationId,
        device_key: deviceKey,
        item_type: "deferred",
        content: di.content,
        timestamp_ms: di.timestamp_ms || 0,
        is_ai_enhanced: true,
        context: context || null,
      });
    }

    // Insert risks
    for (const r of summary.risks || []) {
      const context = [
        `Severity: ${r.severity || "medium"}`,
        r.mitigation ? `Mitigation: ${r.mitigation}` : null,
      ].filter(Boolean).join(" | ");

      await supabase.from("meeting_items").insert({
        conversation_id: conversationId,
        device_key: deviceKey,
        item_type: "risk",
        content: r.content,
        owner: r.owner || null,
        priority: r.severity || "medium",
        timestamp_ms: r.timestamp_ms || 0,
        is_ai_enhanced: true,
        context: context || null,
      });
    }

    // Insert open questions
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

    // Insert ambiguities as concerns
    for (const amb of summary.ambiguities || []) {
      await supabase.from("meeting_items").insert({
        conversation_id: conversationId,
        device_key: deviceKey,
        item_type: "ambiguity",
        content: amb.content,
        timestamp_ms: amb.timestamp_ms || 0,
        is_ai_enhanced: true,
        context: `Unclear: ${amb.why_unclear} | Needs: ${amb.clarification_needed}`,
      });
    }

    console.log("[summarize] Executive summary saved for:", conversationId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary: {
          executive_summary: summary.executive_summary,
          key_points: summary.key_points,
          decisions: summary.decisions,
          action_items: summary.action_items,
          deferred_items: summary.deferred_items,
          risks: summary.risks,
          open_questions: summary.open_questions,
          ambiguities: summary.ambiguities,
          follow_up_email: summary.follow_up_email,
          next_meeting_agenda: summary.next_meeting_agenda,
          task_nudges: summary.task_nudges,
          notable_quotes: summary.notable_quotes,
        }
      }),
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

// Parse fuzzy dates into ISO format (or null)
function parseFuzzyDate(deadline: string | null | undefined): string | null {
  if (!deadline) return null;
  
  const lower = deadline.toLowerCase();
  const now = new Date();
  
  // Handle relative dates
  if (lower.includes("today") || lower.includes("eod")) {
    return now.toISOString();
  }
  if (lower.includes("tomorrow")) {
    now.setDate(now.getDate() + 1);
    return now.toISOString();
  }
  if (lower.includes("this week") || lower.includes("eow")) {
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
    now.setDate(now.getDate() + daysUntilFriday);
    return now.toISOString();
  }
  if (lower.includes("next week")) {
    now.setDate(now.getDate() + 7);
    return now.toISOString();
  }
  if (lower.includes("end of month") || lower.includes("eom")) {
    now.setMonth(now.getMonth() + 1, 0);
    return now.toISOString();
  }
  
  // Handle day names
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  for (let i = 0; i < days.length; i++) {
    if (lower.includes(days[i])) {
      const daysUntil = (i - now.getDay() + 7) % 7 || 7;
      now.setDate(now.getDate() + daysUntil);
      return now.toISOString();
    }
  }
  
  return null;
}