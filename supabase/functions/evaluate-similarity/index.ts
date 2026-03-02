import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { expected, predicted, error_type_expected, error_type_predicted, service_expected, service_predicted } =
      await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a precise evaluation engine for root cause analysis quality assessment.

Given two root cause descriptions (expected and predicted), you must evaluate their semantic similarity.

Rules:
- Focus on whether they describe the SAME underlying issue, not exact wording.
- Two descriptions mentioning different column names but the same type of error (e.g. null values in non-nullable columns) should score HIGH.
- Consider: error mechanism, affected component type, failure mode, and root cause category.
- Be calibrated: genuinely different root causes should score low.`;

    const userPrompt = `Evaluate semantic similarity between these two root cause descriptions:

EXPECTED: "${expected}"
PREDICTED: "${predicted}"

Analyze whether they describe the same underlying technical issue.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "report_similarity",
                description:
                  "Report the semantic similarity assessment between two root cause descriptions.",
                parameters: {
                  type: "object",
                  properties: {
                    semantic_similarity: {
                      type: "number",
                      description:
                        "Semantic similarity score from 0 to 100. 100 means identical root cause, 0 means completely unrelated.",
                    },
                    reasoning: {
                      type: "string",
                      description:
                        "Brief explanation of why the similarity score was assigned (1-2 sentences).",
                    },
                    root_cause_category_expected: {
                      type: "string",
                      description:
                        "Category of the expected root cause (e.g. SchemaMismatch, OOM, Timeout, Deadlock, NullReference, NetworkFailure, PermissionDenied, ConfigError, Other).",
                    },
                    root_cause_category_predicted: {
                      type: "string",
                      description:
                        "Category of the predicted root cause.",
                    },
                  },
                  required: [
                    "semantic_similarity",
                    "reasoning",
                    "root_cause_category_expected",
                    "root_cause_category_predicted",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "report_similarity" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call response from model");
    }

    const result = JSON.parse(toolCall.function.arguments);
    const semanticSimilarity = Math.round(
      Math.max(0, Math.min(100, result.semantic_similarity))
    );

    // Structured component matching
    const errorTypeMatch =
      error_type_expected &&
      error_type_predicted &&
      error_type_expected.toLowerCase() === error_type_predicted.toLowerCase()
        ? 1
        : 0;

    const serviceMatch =
      service_expected &&
      service_predicted &&
      service_expected.toLowerCase() === service_predicted.toLowerCase()
        ? 1
        : 0;

    // Weighted hybrid score
    const finalScore = Math.round(
      semanticSimilarity * 0.6 +
        errorTypeMatch * 0.2 * 100 +
        serviceMatch * 0.2 * 100
    );

    // Interpretation label
    let label: string;
    if (finalScore >= 90) label = "Excellent";
    else if (finalScore >= 75) label = "Strong";
    else if (finalScore >= 60) label = "Partial Match";
    else if (finalScore >= 40) label = "Weak";
    else label = "Incorrect";

    return new Response(
      JSON.stringify({
        semantic_similarity: semanticSimilarity,
        error_type_match: errorTypeMatch === 1,
        service_match: serviceMatch === 1,
        final_score: finalScore,
        label,
        reasoning: result.reasoning,
        root_cause_category_expected: result.root_cause_category_expected,
        root_cause_category_predicted: result.root_cause_category_predicted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("evaluate-similarity error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
