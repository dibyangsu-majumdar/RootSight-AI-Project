import { useState, useEffect } from "react";
import { History, ChevronDown, ChevronUp, FileText, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LogAnalysis {
  id: string;
  file_name: string | null;
  detected_error_type: string | null;
  root_cause_summary: string | null;
  suggested_fix: string | null;
  business_impact: string | null;
  created_at: string;
}

const ERROR_COLORS: Record<string, string> = {
  OutOfMemoryError: "bg-destructive/15 text-destructive border-destructive/30",
  NullPointerException: "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400",
  TimeoutException: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400",
  PermissionDenied: "bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-400",
  SchemaMismatch: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400",
  UnknownError: "bg-muted text-muted-foreground border-border",
};

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export default function AnalysisHistory() {
  const [analyses, setAnalyses] = useState<LogAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("log_analyses")
      .select("id, file_name, detected_error_type, root_cause_summary, suggested_fix, business_impact, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Failed to load history", description: error.message, variant: "destructive" });
    } else {
      setAnalyses(data || []);
    }
    setLoading(false);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Analysis History
          </h1>
          <p className="text-muted-foreground">All your past pipeline log analyses, sorted latest first.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalyses}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : analyses.length === 0 ? (
        <Card className="py-16">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">No analyses yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Head to Dashboard and analyze your first log file to see results here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {analyses.map((analysis) => (
            <Card key={analysis.id} className="overflow-hidden shadow-sm">
              {/* Row summary */}
              <div className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {analysis.file_name || "Pasted log"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{formatDate(analysis.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {analysis.detected_error_type && (
                    <Badge
                      className={cn("border text-xs font-semibold hidden sm:inline-flex",
                        ERROR_COLORS[analysis.detected_error_type] || "bg-muted text-muted-foreground"
                      )}
                      variant="outline"
                    >
                      {analysis.detected_error_type}
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleExpand(analysis.id)}
                    className="gap-1"
                  >
                    {expanded === analysis.id ? (
                      <><ChevronUp className="h-3 w-3" /> Hide</>
                    ) : (
                      <><ChevronDown className="h-3 w-3" /> View</>
                    )}
                  </Button>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === analysis.id && (
                <div className="border-t border-border bg-muted/20 p-4 space-y-4 animate-in fade-in-0 duration-200">
                  {analysis.detected_error_type && (
                    <Badge
                      className={cn("border text-xs font-semibold sm:hidden",
                        ERROR_COLORS[analysis.detected_error_type] || "bg-muted text-muted-foreground"
                      )}
                      variant="outline"
                    >
                      {analysis.detected_error_type}
                    </Badge>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoBlock label="🔍 Root Cause Explanation" content={analysis.root_cause_summary} />
                    <InfoBlock label="🔧 Suggested Fix" content={analysis.suggested_fix} />
                    <InfoBlock label="🛡️ Preventive Recommendation" content={extractPreventiveRec(analysis.suggested_fix)} />
                    <InfoBlock label="📊 Business Impact" content={analysis.business_impact} />
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function extractPreventiveRec(suggestedFix: string | null): string {
  if (!suggestedFix) return "Implement monitoring and alerting for this error pattern to catch similar issues earlier.";
  const sentences = suggestedFix.split(/\.\s+|\n\n/);
  if (sentences.length > 1) {
    return sentences[sentences.length - 1].trim() || sentences[sentences.length - 2].trim();
  }
  return "Implement monitoring and alerting for this error pattern to catch similar issues earlier.";
}

function InfoBlock({ label, content }: { label: string; content: string | null }) {
  if (!content) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  );
}
