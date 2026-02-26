import { supabase } from "@/integrations/supabase/client";

export interface SimilarIncident {
  id: string;
  created_at: string;
  error_type: string | null;
  service_name: string | null;
  root_cause_summary: string | null;
  resolution_notes: string | null;
  confidence_score: number;
  status: string;
  similarityScore: number;
}

interface MatchParams {
  userId: string;
  stackTraceHash: string;
  errorType: string;
  serviceName: string | null;
}

export async function findSimilarIncidents(params: MatchParams): Promise<SimilarIncident[]> {
  const { userId, stackTraceHash, errorType, serviceName } = params;

  // Query incidents with matching hash or error_type
  const { data, error } = await supabase
    .from("incidents")
    .select("id, created_at, error_type, service_name, root_cause_summary, resolution_notes, confidence_score, status, stack_trace_hash")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];

  const results: SimilarIncident[] = [];

  for (const incident of data) {
    let score = 0;

    // Exact hash match = high similarity
    if (stackTraceHash && incident.stack_trace_hash === stackTraceHash) {
      score += 70;
    }

    // Error type match
    if (errorType && incident.error_type === errorType) {
      score += 20;
    }

    // Service name match
    if (serviceName && incident.service_name === serviceName) {
      score += 10;
    }

    if (score >= 20) {
      results.push({
        id: incident.id,
        created_at: incident.created_at,
        error_type: incident.error_type,
        service_name: incident.service_name,
        root_cause_summary: incident.root_cause_summary,
        resolution_notes: incident.resolution_notes,
        confidence_score: incident.confidence_score ?? 0,
        status: incident.status,
        similarityScore: Math.min(score, 100),
      });
    }
  }

  return results.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, 5);
}

export function getOccurrenceCount(incidents: SimilarIncident[]): number {
  return incidents.length;
}
