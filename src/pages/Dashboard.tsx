import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X, Loader2, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { parseLog, cleanLLMOutput, hashStackTrace, ErrorType } from "@/lib/logParser";
import { findSimilarIncidents, SimilarIncident } from "@/lib/similarityEngine";
import { computeConfidence, getConfidenceColor } from "@/lib/confidenceEngine";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { SimilarIncidentsPanel } from "@/components/dashboard/SimilarIncidentsPanel";
import { ConfidenceBadge } from "@/components/dashboard/ConfidenceBadge";

interface AnalysisResult {
  detectedErrorType: ErrorType;
  affectedService: string;
  rootCauseSummary: string;
  confidenceReasoning: string;
  confidenceScore: number;
  confidenceLevel: "high" | "medium" | "low";
  recommendedFixSteps: string[];
  longTermPrevention: string;
  impactScope: string;
  similarIncidents: SimilarIncident[];
}

const ERROR_TYPE_COLORS: Record<ErrorType, string> = {
  OutOfMemoryError: "bg-destructive/15 text-destructive border-destructive/30",
  NullPointerException: "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400",
  TimeoutException: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400",
  PermissionDenied: "bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-400",
  SchemaMismatch: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400",
  NetworkError: "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-400",
  UnknownError: "bg-muted text-muted-foreground border-border",
};

export default function Dashboard() {
  const [logText, setLogText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".txt") && !file.name.endsWith(".log")) {
      toast({ title: "Only .txt or .log files are supported", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setLogText(e.target?.result as string);
    reader.readAsText(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const clearLog = () => {
    setLogText("");
    setFileName(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const analyzeLog = async () => {
    if (!logText.trim()) {
      toast({ title: "Please provide a log to analyze", variant: "destructive" });
      return;
    }
    setAnalyzing(true);
    setResult(null);

    try {
      // Step 1: Structured parsing & preprocessing
      setStatusMsg("Preprocessing & extracting structure...");
      const parsed = parseLog(logText);
      const stackHash = hashStackTrace(parsed.stackTrace);

      // Step 2: Similarity matching
      setStatusMsg("Checking incident memory...");
      const similarIncidents = await findSimilarIncidents({
        userId: user!.id,
        stackTraceHash: stackHash,
        errorType: parsed.detectedErrorType,
        serviceName: parsed.serviceName,
      });

      // Step 3: LLM analysis with cleaned data
      setStatusMsg("AI reasoning engine analyzing...");
      const { data, error } = await supabase.functions.invoke("analyze", {
        body: {
          detectedErrorType: parsed.detectedErrorType,
          errorSnippet: parsed.errorSnippet,
          logSummary: parsed.logSummary,
          serviceName: parsed.serviceName,
          environment: parsed.environment,
          requestId: parsed.requestId,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) {
        if (data.status === 429 || data.status === 402) {
          toast({ title: data.status === 429 ? "Rate limit reached" : "Usage limit reached", description: data.error, variant: "destructive" });
          return;
        }
        throw new Error(data.error);
      }

      // Step 4: Confidence scoring
      setStatusMsg("Computing confidence score...");
      const confidence = computeConfidence({
        llmConfidenceScore: data.confidence_score ?? 50,
        similarIncidents,
        parsedLog: parsed,
      });

      const analysis: AnalysisResult = {
        detectedErrorType: parsed.detectedErrorType,
        affectedService: data.affected_service || parsed.serviceName || "Unknown",
        rootCauseSummary: cleanLLMOutput(data.root_cause_summary),
        confidenceReasoning: data.confidence_reasoning || confidence.reasoning,
        confidenceScore: confidence.score,
        confidenceLevel: confidence.level,
        recommendedFixSteps: Array.isArray(data.recommended_fix_steps)
          ? data.recommended_fix_steps.map((s: string) => cleanLLMOutput(s))
          : [],
        longTermPrevention: cleanLLMOutput(data.long_term_prevention || ""),
        impactScope: cleanLLMOutput(data.impact_scope || ""),
        similarIncidents,
      };

      // Step 5: Save to log_analyses
      setStatusMsg("Saving analysis...");
      const { data: savedAnalysis, error: dbError } = await supabase.from("log_analyses").insert({
        user_id: user!.id,
        file_name: fileName,
        raw_log: logText.substring(0, 50000),
        detected_error_type: parsed.detectedErrorType,
        root_cause_summary: data.root_cause_summary,
        suggested_fix: JSON.stringify(data.recommended_fix_steps),
        business_impact: data.impact_scope,
      }).select("id").single();

      if (dbError) console.error("Failed to save analysis:", dbError);

      // Step 6: Save as incident
      const { error: incidentError } = await supabase.from("incidents").insert({
        user_id: user!.id,
        environment: parsed.environment,
        error_type: parsed.detectedErrorType,
        service_name: parsed.serviceName,
        stack_trace_hash: stackHash,
        root_cause_summary: data.root_cause_summary,
        confidence_score: confidence.score,
        confidence_reasoning: confidence.reasoning,
        recommended_fix_steps: JSON.stringify(data.recommended_fix_steps),
        long_term_prevention: data.long_term_prevention,
        impact_scope: data.impact_scope,
        affected_service: data.affected_service,
        status: "Open",
        raw_log: logText.substring(0, 50000),
        file_name: fileName,
        log_analysis_id: savedAnalysis?.id || null,
      } as any);

      if (incidentError) console.error("Failed to save incident:", incidentError);

      setResult(analysis);
      toast({ title: "Analysis complete!", description: `Confidence: ${confidence.score}% (${confidence.level})` });
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setAnalyzing(false);
      setStatusMsg("");
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Upload or paste pipeline logs for structured AI root cause analysis.</p>
      </div>

      <DashboardStats />

      {/* Input section */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" /> Upload Log File
            </CardTitle>
            <CardDescription>Drag & drop or click to upload a .txt or .log file</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              {fileName ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">{fileName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{logText.length.toLocaleString()} characters</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Drop your log file here</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept=".txt,.log" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Paste Log Content
            </CardTitle>
            <CardDescription>Paste your log output directly</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              className="min-h-[150px] font-mono text-xs resize-none"
              placeholder={`[2024-01-15 10:23:45] ERROR: java.lang.OutOfMemoryError: Java heap space\n  at com.company.pipeline.Executor.run(Executor.java:142)\n  ...`}
              value={logText}
              onChange={(e) => { setLogText(e.target.value); setFileName(null); }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={analyzeLog} disabled={analyzing || !logText.trim()} size="lg" className="gap-2">
          {analyzing ? (
            <><Loader2 className="h-4 w-4 animate-spin" />{statusMsg || "Analyzing..."}</>
          ) : (
            <><CheckCircle2 className="h-4 w-4" />Analyze Log</>
          )}
        </Button>
        {logText && (
          <Button variant="outline" size="lg" onClick={clearLog} className="gap-2">
            <X className="h-4 w-4" /> Clear
          </Button>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-foreground">Analysis Results</h2>
            <Badge className={cn("border text-xs font-semibold", ERROR_TYPE_COLORS[result.detectedErrorType])} variant="outline">
              {result.detectedErrorType}
            </Badge>
            <ConfidenceBadge score={result.confidenceScore} level={result.confidenceLevel} reasoning={result.confidenceReasoning} />
            <ExportButton result={{
              detectedErrorType: result.detectedErrorType,
              rootCauseSummary: result.rootCauseSummary,
              suggestedFix: result.recommendedFixSteps.join("\n"),
              businessImpact: result.impactScope,
              fileName,
            }} />
          </div>

          {/* Similar incidents */}
          {result.similarIncidents.length > 0 && (
            <SimilarIncidentsPanel incidents={result.similarIncidents} />
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <ResultCard icon="🔍" title="Root Cause Explanation" content={result.rootCauseSummary} accent="border-l-4 border-l-destructive" />
            <ResultCard icon="🏢" title="Affected Service" content={`${result.affectedService}${result.detectedErrorType !== "UnknownError" ? ` — ${result.detectedErrorType}` : ""}`} accent="border-l-4 border-l-primary" />
            <ResultCard icon="🔧" title="Recommended Fix Steps" content={result.recommendedFixSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")} accent="border-l-4 border-l-primary" />
            <ResultCard icon="🛡️" title="Long-Term Prevention" content={result.longTermPrevention} accent="border-l-4 border-l-green-500" />
            <ResultCard icon="📊" title="Impact Scope" content={result.impactScope} accent="border-l-4 border-l-orange-500" />
            <ResultCard icon="🧠" title="Confidence Reasoning" content={result.confidenceReasoning} accent="border-l-4 border-l-yellow-500" />
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({ icon, title, content, accent }: {
  icon: string; title: string; content: string; accent?: string;
}) {
  if (!content) return null;
  return (
    <Card className={cn("shadow-sm", accent)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="text-base">{icon}</span>{title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
      </CardContent>
    </Card>
  );
}
