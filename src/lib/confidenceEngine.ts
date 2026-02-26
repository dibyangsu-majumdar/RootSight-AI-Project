import type { SimilarIncident } from "./similarityEngine";
import type { ParsedLog } from "./logParser";

interface ConfidenceInput {
  llmConfidenceScore: number;
  similarIncidents: SimilarIncident[];
  parsedLog: ParsedLog;
}

interface ConfidenceResult {
  score: number;
  reasoning: string;
  level: "high" | "medium" | "low";
}

export function computeConfidence(input: ConfidenceInput): ConfidenceResult {
  const { llmConfidenceScore, similarIncidents, parsedLog } = input;
  
  let score = 0;
  const reasons: string[] = [];

  // 1. LLM-reported confidence (40% weight)
  const llmWeight = Math.min(llmConfidenceScore, 100) * 0.4;
  score += llmWeight;
  if (llmConfidenceScore >= 80) {
    reasons.push("LLM reports high certainty in its analysis");
  } else if (llmConfidenceScore >= 50) {
    reasons.push("LLM reports moderate certainty");
  } else {
    reasons.push("LLM reports low certainty — analysis may be speculative");
  }

  // 2. Similarity match strength (30% weight)
  const bestMatch = similarIncidents[0];
  if (bestMatch && bestMatch.similarityScore >= 70) {
    score += 30;
    reasons.push(`Strong match with ${similarIncidents.length} previous incident(s) (${bestMatch.similarityScore}% similarity)`);
  } else if (bestMatch && bestMatch.similarityScore >= 40) {
    score += 15;
    reasons.push(`Partial match with previous incidents (${bestMatch.similarityScore}% similarity)`);
  } else if (similarIncidents.length === 0) {
    reasons.push("No similar past incidents found — this may be a novel issue");
  }

  // 3. Parsing completeness (30% weight)
  let completeness = 0;
  if (parsedLog.detectedErrorType !== "UnknownError") completeness += 8;
  if (parsedLog.serviceName) completeness += 6;
  if (parsedLog.environment) completeness += 4;
  if (parsedLog.requestId) completeness += 4;
  if (parsedLog.timestamp) completeness += 4;
  if (parsedLog.stackTrace.length > 20) completeness += 4;
  score += completeness;

  if (completeness >= 20) {
    reasons.push("Log provided rich structured context (service, env, trace)");
  } else if (completeness >= 10) {
    reasons.push("Some structured context available from log");
  } else {
    reasons.push("Limited structured context extracted — confidence reduced");
  }

  const finalScore = Math.round(Math.min(score, 100));

  return {
    score: finalScore,
    reasoning: reasons.join(". ") + ".",
    level: finalScore >= 75 ? "high" : finalScore >= 45 ? "medium" : "low",
  };
}

export function getConfidenceColor(level: "high" | "medium" | "low"): string {
  switch (level) {
    case "high": return "bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400";
    case "medium": return "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400";
    case "low": return "bg-destructive/15 text-destructive border-destructive/30";
  }
}
