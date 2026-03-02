import { useState, useEffect } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { parseLog } from "@/lib/logParser";
import { ScoreBreakdown } from "@/components/evaluation/ScoreBreakdown";
import { CalibrationCheck } from "@/components/evaluation/CalibrationCheck";

interface EvalResult {
  id: string;
  created_at: string;
  expected_root_cause: string;
  predicted_root_cause: string | null;
  match_score: number;
  error_type: string | null;
  file_name: string | null;
  details: any;
}

export default function Evaluation() {
  const [evalLogs, setEvalLogs] = useState<EvalResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [logText, setLogText] = useState("");
  const [expectedCause, setExpectedCause] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [avgConfidence, setAvgConfidence] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => { fetchEvals(); }, []);

  const fetchEvals = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("evaluation_logs")
      .select("id, created_at, expected_root_cause, predicted_root_cause, match_score, error_type, file_name, details")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setEvalLogs(data || []);
    setLoading(false);
  };

  const runEvaluation = async () => {
    if (!logText.trim() || !expectedCause.trim()) {
      toast({ title: "Provide both log and expected root cause", variant: "destructive" });
      return;
    }
    setAnalyzing(true);
    try {
      // Step 1: Get LLM prediction
      const parsed = parseLog(logText);
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke("analyze", {
        body: {
          detectedErrorType: parsed.detectedErrorType,
          errorSnippet: parsed.errorSnippet,
          logSummary: parsed.logSummary,
          serviceName: parsed.serviceName,
          environment: parsed.environment,
        },
      });
      if (analysisError) throw new Error(analysisError.message);
      if (analysisData?.error) throw new Error(analysisData.error);

      const predicted = analysisData.root_cause_summary || "";
      const predictedErrorType = analysisData.error_type || parsed.detectedErrorType;
      const predictedService = analysisData.affected_service || parsed.serviceName;

      // Step 2: Semantic similarity scoring
      const { data: evalData, error: evalError } = await supabase.functions.invoke("evaluate-similarity", {
        body: {
          expected: expectedCause,
          predicted,
          error_type_expected: parsed.detectedErrorType,
          error_type_predicted: predictedErrorType,
          service_expected: parsed.serviceName,
          service_predicted: predictedService,
        },
      });
      if (evalError) throw new Error(evalError.message);
      if (evalData?.error) throw new Error(evalData.error);

      const finalScore = evalData.final_score ?? 0;
      const details = {
        semantic_similarity: evalData.semantic_similarity,
        error_type_match: evalData.error_type_match,
        service_match: evalData.service_match,
        label: evalData.label,
        reasoning: evalData.reasoning,
        root_cause_category_expected: evalData.root_cause_category_expected,
        root_cause_category_predicted: evalData.root_cause_category_predicted,
      };

      // Step 3: Store result
      await supabase.from("evaluation_logs").insert({
        user_id: user!.id,
        raw_log: logText.substring(0, 50000),
        expected_root_cause: expectedCause,
        predicted_root_cause: predicted,
        match_score: finalScore,
        error_type: parsed.detectedErrorType,
        details,
      } as any);

      toast({ title: `Evaluation complete — ${finalScore}% (${evalData.label})` });
      setLogText("");
      setExpectedCause("");
      fetchEvals();
    } catch (err: any) {
      toast({ title: "Evaluation failed", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const avgScore = evalLogs.length > 0 ? Math.round(evalLogs.reduce((s, e) => s + (e.match_score || 0), 0) / evalLogs.length) : 0;
  const highAccuracy = evalLogs.filter((e) => (e.match_score || 0) >= 60).length;
  const precision = evalLogs.length > 0 ? Math.round((highAccuracy / evalLogs.length) * 100) : 0;

  // Calibration: compute average confidence from incidents
  useEffect(() => {
    if (!user) return;
    supabase
      .from("incidents")
      .select("confidence_score")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const avg = Math.round(data.reduce((s, i) => s + (i.confidence_score || 0), 0) / data.length);
          setAvgConfidence(avg);
        }
      });
  }, [user]);

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-primary" /> Evaluation Mode
        </h1>
        <p className="text-muted-foreground">Test model quality with semantic similarity scoring. Compare predicted vs. expected root causes.</p>
      </div>

      {/* Calibration warning */}
      <CalibrationCheck avgConfidence={avgConfidence} avgMatchScore={avgScore} evalCount={evalLogs.length} />

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{evalLogs.length}</p>
            <p className="text-xs text-muted-foreground">Total Evaluations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{avgScore}%</p>
            <p className="text-xs text-muted-foreground">Avg Weighted Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{precision}%</p>
            <p className="text-xs text-muted-foreground">Precision (≥60%)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{avgConfidence}%</p>
            <p className="text-xs text-muted-foreground">Avg Model Confidence</p>
          </CardContent>
        </Card>
      </div>

      {/* Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Submit Labeled Test Log</CardTitle>
          <CardDescription>Paste a log and its known root cause. Scoring uses semantic embeddings + structured component matching.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            className="min-h-[100px] font-mono text-xs"
            placeholder="Paste log content here..."
            value={logText}
            onChange={(e) => setLogText(e.target.value)}
          />
          <Input
            placeholder="Expected root cause description..."
            value={expectedCause}
            onChange={(e) => setExpectedCause(e.target.value)}
          />
          <Button onClick={runEvaluation} disabled={analyzing} className="gap-2">
            {analyzing ? <><Loader2 className="h-4 w-4 animate-spin" />Evaluating...</> : <><FlaskConical className="h-4 w-4" />Run Evaluation</>}
          </Button>
        </CardContent>
      </Card>

      {/* Results table */}
      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : evalLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evaluation History</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Error Type</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Predicted</TableHead>
                <TableHead className="min-w-[180px]">Score Breakdown</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evalLogs.map((ev) => (
                <TableRow key={ev.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(ev.created_at))}
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{ev.error_type || "—"}</Badge></TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{ev.expected_root_cause}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{ev.predicted_root_cause || "—"}</TableCell>
                  <TableCell>
                    <ScoreBreakdown details={ev.details} finalScore={ev.match_score || 0} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
