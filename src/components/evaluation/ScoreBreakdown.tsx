import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ScoreBreakdownProps {
  details: {
    semantic_similarity?: number;
    error_type_match?: boolean;
    service_match?: boolean;
    label?: string;
    reasoning?: string;
  } | null;
  finalScore: number;
}

function getInterpretationColor(label: string) {
  switch (label) {
    case "Excellent": return "bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400";
    case "Strong": return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400";
    case "Partial Match": return "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400";
    case "Weak": return "bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-400";
    default: return "bg-destructive/15 text-destructive border-destructive/30";
  }
}

export function ScoreBreakdown({ details, finalScore }: ScoreBreakdownProps) {
  if (!details || details.semantic_similarity === undefined) {
    // Legacy fallback: just show score
    return (
      <Badge variant="outline" className={cn("text-xs font-semibold",
        finalScore >= 60 ? "bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400" :
        finalScore >= 30 ? "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400" :
        "bg-destructive/15 text-destructive border-destructive/30"
      )}>
        {finalScore}%
      </Badge>
    );
  }

  const label = details.label || "—";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn("text-xs font-semibold", getInterpretationColor(label))}>
          {finalScore}% — {label}
        </Badge>
      </div>
      <div className="text-[11px] text-muted-foreground space-y-0.5">
        <div>Semantic: <span className="font-medium text-foreground">{details.semantic_similarity}%</span></div>
        <div>Error type: <span className={cn("font-medium", details.error_type_match ? "text-green-600 dark:text-green-400" : "text-destructive")}>{details.error_type_match ? "✓ Match" : "✗ No match"}</span></div>
        <div>Service: <span className={cn("font-medium", details.service_match ? "text-green-600 dark:text-green-400" : "text-destructive")}>{details.service_match ? "✓ Match" : "✗ No match"}</span></div>
      </div>
      {details.reasoning && (
        <p className="text-[10px] text-muted-foreground/70 italic leading-tight">{details.reasoning}</p>
      )}
    </div>
  );
}
