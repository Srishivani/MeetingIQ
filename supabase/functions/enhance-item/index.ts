import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, x-device-key, apikey, content-type",
};

interface EnhanceRequest {
  phrase: string;
  context: string;
  type: string;
  extractedOwner?: string | null;
  extractedDeadline?: string | null;
  priority?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phrase, context, type, extractedOwner, extractedDeadline, priority } = await req.json() as EnhanceRequest;

    if (!phrase || !context) {
      return new Response(
        JSON.stringify({ error: "phrase and context are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[enhance-item] Processing ${type}: "${phrase.slice(0, 50)}..."`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert meeting analyst. Given a detected phrase from a meeting transcript, enhance it into a clear, actionable item.

Your task:
1. Rewrite the raw phrase into a clear, professional task/item description
2. Extract or confirm the owner (person responsible) if mentioned
3. Determine the priority level (high/medium/low) based on urgency keywords
4. Extract any deadline or due date mentioned
5. Provide a confidence score (0.0-1.0) for the accuracy of your enhancement

Return ONLY valid JSON with these keys:
- "enhancedContent": string - Clear, actionable description (start with a verb for action items)
- "owner": string or null - Person responsible (first name only)
- "priority": "high" | "medium" | "low"
- "suggestedDueDate": string or null - Normalized deadline (e.g., "Friday", "Next week", "EOD")
- "confidence": number - 0.0 to 1.0

Be concise. The enhanced content should be 5-15 words.`;

    const userPrompt = `Item type: ${type}
Raw phrase: "${phrase}"
Full context: "${context}"
${extractedOwner ? `Pre-detected owner: ${extractedOwner}` : ""}
${extractedDeadline ? `Pre-detected deadline: ${extractedDeadline}` : ""}
${priority ? `Pre-detected priority: ${priority}` : ""}

Enhance this into a clear, professional item.`;

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
        max_tokens: 256,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("[enhance-item] AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawText = aiData.choices?.[0]?.message?.content || "";
    
    console.log("[enhance-item] AI response:", rawText);

    // Extract JSON from markdown code blocks if present
    let jsonText = rawText;
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const enhanced = JSON.parse(jsonText);

    return new Response(
      JSON.stringify({
        enhancedContent: enhanced.enhancedContent || phrase,
        owner: enhanced.owner || extractedOwner || null,
        priority: enhanced.priority || priority || "medium",
        suggestedDueDate: enhanced.suggestedDueDate || extractedDeadline || null,
        confidence: enhanced.confidence || 0.8,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[enhance-item] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
