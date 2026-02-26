import { useState, useEffect, useRef } from "react";
import { FlaskConical, Upload, Loader2, Trash2 } from "lucide-react";
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
import { parseLog, cleanLLMOutput } from "@/lib/logParser";
import { cn } from "@/lib/utils";

interface EvalResult {
  id: string;
  created_at: string;
  expected_root_cause: string;
  predicted_root_cause: string | null;
  match_score: number;
  error_type: string | null;
  file_name: string | null;
}

function computeTextSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...wordsA].filter((w) => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  return Math.round((intersection.length / union.size) * 100);
}

export default function Evaluation() {
  const [evalLogs, setEvalLogs] = useState<EvalResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [logText, setLogText] = useState("");
  const [expectedCause, setExpectedCause] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => { fetchEvals(); }, []);

  const fetchEvals = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("evaluation_logs")
      .select("id, created_at, expected_root_cause, predicted_root_cause, match_score, error_type, file_name")
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
      const parsed = parseLog(logText);
      const { data, error } = await supabase.functions.invoke("analyze", {
        body: {
          detectedErrorType: parsed.detectedErrorType,
          errorSnippet: parsed.errorSnippet,
          logSummary: parsed.logSummary,
          serviceName: parsed.serviceName,
          environment: parsed.environment,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const predicted = data.root_cause_summary || "";
      const matchScore = computeTextSimilarity(expectedCause, predicted);

      await supabase.from("evaluation_logs").insert({
        user_id: user!.id,
        raw_log: logText.substring(0, 50000),
        expected_root_cause: expectedCause,
        predicted_root_cause: predicted,
        match_score: matchScore,
        error_type: parsed.detectedErrorType,
      } as any);

      toast({ title: `Evaluation complete — ${matchScore}% match` });
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

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-primary" /> Evaluation Mode
        </h1>
        <p className="text-muted-foreground">Test model quality with labeled logs. Compare predicted vs. expected root causes.</p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{evalLogs.length}</p>
            <p className="text-xs text-muted-foreground">Total Evaluations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{avgScore}%</p>
            <p className="text-xs text-muted-foreground">Avg Similarity Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{precision}%</p>
            <p className="text-xs text-muted-foreground">Precision (≥60% match)</p>
          </CardContent>
        </Card>
      </div>

      {/* Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Submit Labeled Test Log</CardTitle>
          <CardDescription>Paste a log and its known root cause to evaluate model accuracy.</CardDescription>
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
                <TableHead>Match</TableHead>
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
                    <Badge variant="outline" className={cn("text-xs font-semibold",
                      (ev.match_score || 0) >= 60 ? "bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400" :
                      (ev.match_score || 0) >= 30 ? "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400" :
                      "bg-destructive/15 text-destructive border-destructive/30"
                    )}>
                      {ev.match_score}%
                    </Badge>
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
