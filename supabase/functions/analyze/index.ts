import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a senior data platform reliability engineer with deep expertise in distributed systems, data pipelines, and incident response.

You will receive structured, preprocessed log data including:
- A detected error type
- An extracted error snippet
- A log summary
- Service name, environment, and other metadata when available

Your task is to analyze the failure and return ONLY a valid JSON object with exactly these fields:

{
  "error_type": "The specific error classification",
  "affected_service": "The service or component that failed",
  "root_cause_summary": "A concise, technical explanation of why this failure occurred (2-4 sentences)",
  "confidence_reasoning": "Explain what evidence supports your analysis and what is uncertain",
  "confidence_score": 0-100,
  "recommended_fix_steps": ["Step 1", "Step 2", "Step 3"],
  "long_term_prevention": "Specific preventive measures to avoid recurrence",
  "impact_scope": "The potential business and operational consequences if unresolved (1-3 sentences)"
}

CRITICAL RULES:
- Output ONLY the JSON object. No markdown, no backticks, no explanation outside the JSON.
- Do NOT guess or hallucinate when data is insufficient. Instead, set confidence_score below 40 and explain in confidence_reasoning.
- If the log is ambiguous, say so explicitly in confidence_reasoning.
- Do NOT wrap string values in square brackets.
- recommended_fix_steps MUST be a JSON array of strings.
- confidence_score must be an integer 0-100 reflecting how certain you are.
- Prioritize structured reasoning over speculation.
- If you cannot determine root cause, say "Insufficient data to determine root cause" and set confidence_score to 10-20.`;

async function callLLM(userPrompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) throw { status: 429, message: "Rate limit exceeded. Please try again shortly." };
    if (status === 402) throw { status: 402, message: "Usage limit reached. Please add credits." };
    const errText = await response.text();
    console.error("AI gateway error:", status, errText);
    throw new Error(`AI gateway returned ${status}`);
  }

  const aiData = await response.json();
  return aiData.choices?.[0]?.message?.content ?? "";
}

function parseJSON(content: string): Record<string, unknown> | null {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    // Validate required fields
    if (typeof parsed.root_cause_summary !== "string") return null;
    if (!Array.isArray(parsed.recommended_fix_steps)) {
      // Try to convert string to array
      if (typeof parsed.recommended_fix_steps === "string") {
        parsed.recommended_fix_steps = parsed.recommended_fix_steps.split(/\n|;/).filter(Boolean).map((s: string) => s.trim());
      } else {
        parsed.recommended_fix_steps = [];
      }
    }
    if (typeof parsed.confidence_score !== "number") {
      parsed.confidence_score = 50;
    }
    return parsed;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { detectedErrorType, errorSnippet, logSummary, serviceName, environment, requestId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const metadataLines = [
      `Detected Error Type: ${detectedErrorType}`,
      serviceName ? `Service Name: ${serviceName}` : null,
      environment ? `Environment: ${environment}` : null,
      requestId ? `Request ID: ${requestId}` : null,
    ].filter(Boolean).join("\n");

    const userPrompt = `${metadataLines}

Error Snippet:
\`\`\`
${errorSnippet}
\`\`\`

Log Summary: ${logSummary}

Analyze this failure and respond with the structured JSON object as specified.`;

    // First attempt
    let content = await callLLM(userPrompt, LOVABLE_API_KEY);
    let parsed = parseJSON(content);

    // Auto-retry once if invalid JSON
    if (!parsed) {
      console.log("First LLM response was invalid JSON, retrying...");
      content = await callLLM(userPrompt + "\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY a valid JSON object.", LOVABLE_API_KEY);
      parsed = parseJSON(content);
    }

    if (!parsed) {
      throw new Error("AI did not return valid JSON after retry");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    if (err?.status === 429 || err?.status === 402) {
      return new Response(
        JSON.stringify({ error: err.message, status: err.status }),
        { status: err.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.error("analyze error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
