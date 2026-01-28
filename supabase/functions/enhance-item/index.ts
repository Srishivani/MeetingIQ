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
  isHedging?: boolean;
  externalDependency?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      phrase, 
      context, 
      type, 
      extractedOwner, 
      extractedDeadline, 
      priority,
      isHedging,
      externalDependency
    } = await req.json() as EnhanceRequest;

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

    // Different prompts based on item type for better intelligence
    const typeSpecificInstructions = getTypeSpecificInstructions(type);

    const systemPrompt = `You are an expert meeting analyst specializing in extracting actionable intelligence from business conversations.

Your task is to analyze a detected phrase and enhance it with professional clarity and complete context.

${typeSpecificInstructions}

Return ONLY valid JSON with these keys:
- "enhancedContent": string - Clear, professional description (5-20 words, start with verb for actions)
- "owner": string or null - Person responsible (first name only if detected)
- "priority": "high" | "medium" | "low" - Based on urgency, impact, and language
- "suggestedDueDate": string or null - Normalized deadline (e.g., "Friday", "Next week", "EOD today")
- "confidence": number - 0.0 to 1.0 for extraction accuracy
- "rationale": string - Brief explanation of why this was categorized as ${type} (10-20 words)
- "alternativesRejected": array of strings - For decisions: what options were not chosen (max 3)
- "externalDependency": string or null - Any external blocker or dependency detected
- "isAmbiguous": boolean - True if the statement contains hedging or uncertainty
- "suggestedFollowUp": string or null - Recommended follow-up action if applicable

Be concise but thorough. Extract maximum intelligence from the context.`;

    const userPrompt = `Item type: ${type}
Raw phrase: "${phrase}"
Full context: "${context}"
${extractedOwner ? `Pre-detected owner: ${extractedOwner}` : "No owner detected"}
${extractedDeadline ? `Pre-detected deadline: ${extractedDeadline}` : "No deadline detected"}
${priority ? `Pre-detected priority: ${priority}` : "Priority unknown"}
${isHedging ? `⚠️ Hedging/uncertain language detected in this phrase` : ""}
${externalDependency ? `External dependency detected: ${externalDependency}` : ""}

Enhance this into a clear, professional item with full intelligence extraction.`;

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
        max_tokens: 512,
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
    
    console.log("[enhance-item] AI response:", rawText.slice(0, 300));

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
        rationale: enhanced.rationale || null,
        alternativesRejected: enhanced.alternativesRejected || [],
        externalDependency: enhanced.externalDependency || externalDependency || null,
        isAmbiguous: enhanced.isAmbiguous || isHedging || false,
        suggestedFollowUp: enhanced.suggestedFollowUp || null,
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

function getTypeSpecificInstructions(type: string): string {
  switch (type) {
    case "action_item":
      return `For ACTION ITEMS:
- Extract the specific task that needs to be done
- Identify who is responsible (owner) from context like "John will...", "I'll handle..."
- Detect any deadline mentioned (explicit or implicit like "before the launch")
- Assess priority based on urgency language and business impact
- Start enhancedContent with an action verb (Review, Send, Schedule, etc.)`;

    case "decision":
      return `For DECISIONS:
- Clearly state what was decided, not the process
- Extract alternatives that were rejected or considered ("instead of X", "rather than Y")
- Note the rationale for the decision if mentioned
- Identify who made or approved the decision
- Look for conditional decisions ("if X, then we'll do Y")`;

    case "commitment":
      return `For COMMITMENTS:
- Identify the specific promise being made
- Note who is committing (the owner)
- Extract what they're committing to deliver
- Detect any conditions or caveats
- Assess the strength of the commitment (firm vs tentative)`;

    case "deferred":
      return `For DEFERRED ITEMS:
- Identify the topic being postponed
- Note when it should be revisited if mentioned
- Extract reason for deferral if given
- Suggest when to follow up
- Flag if this has been deferred before (if context suggests)`;

    case "question":
      return `For OPEN QUESTIONS:
- Restate the question clearly and completely
- Identify who needs to answer if implied
- Note if this is blocking other work
- Suggest who might have the answer
- Detect if this is rhetorical vs requires action`;

    case "risk":
      return `For RISKS/CONCERNS:
- Clearly state the risk or concern
- Identify potential impact if this occurs
- Note any mitigations mentioned
- Extract the probability/likelihood if implied
- Identify who should own this risk`;

    case "concern":
      return `For CONCERNS:
- Articulate the worry or reservation
- Note who raised the concern
- Identify what might address the concern
- Assess severity (mild worry vs serious objection)
- Suggest follow-up action to resolve`;

    case "followup":
      return `For FOLLOW-UPS:
- State what needs to be followed up on
- Extract when the follow-up should happen
- Identify who should initiate the follow-up
- Note what success looks like
- Suggest how to track progress`;

    case "ambiguity":
      return `For AMBIGUOUS STATEMENTS:
- Identify what is unclear or uncertain
- Note the hedging language used
- Suggest what clarification is needed
- Identify who should provide clarity
- Flag the business risk of leaving this unresolved`;

    default:
      return `Analyze the phrase and enhance it with clarity, extracting all relevant intelligence.`;
  }
}