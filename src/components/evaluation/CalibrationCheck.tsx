import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface CalibrationCheckProps {
  avgConfidence: number;
  avgMatchScore: number;
  evalCount: number;
}

export function CalibrationCheck({ avgConfidence, avgMatchScore, evalCount }: CalibrationCheckProps) {
  if (evalCount < 3) return null;

  const gap = avgConfidence - avgMatchScore;
  const isOverconfident = gap > 15;

  if (!isOverconfident) return null;

  return (
    <Card className="border-orange-500/30 bg-orange-500/5">
      <CardContent className="p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
            Model Overconfidence Detected
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Average predicted confidence ({avgConfidence}%) exceeds average evaluation accuracy ({avgMatchScore}%) by {gap} points.
            The model may be overestimating its certainty. Consider reviewing low-scoring evaluations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
