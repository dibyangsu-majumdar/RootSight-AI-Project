import { useNavigate } from "react-router-dom";
import { AlertCircle, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SimilarIncident } from "@/lib/similarityEngine";

interface Props {
  incidents: SimilarIncident[];
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }).format(new Date(dateStr));
}

export function SimilarIncidentsPanel({ incidents }: Props) {
  const navigate = useNavigate();

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-warning" />
          Similar Past Incidents ({incidents.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {incidents.map((inc) => (
          <div
            key={inc.id}
            onClick={() => navigate(`/incidents/${inc.id}`)}
            className="rounded-lg border border-border bg-card p-3 cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{formatDate(inc.created_at)}</span>
                <Badge variant="outline" className="text-xs">{inc.error_type || "Unknown"}</Badge>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={cn("text-xs",
                  inc.similarityScore >= 70 ? "bg-destructive/15 text-destructive border-destructive/30" :
                  "bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-400"
                )}>
                  {inc.similarityScore}% match
                </Badge>
                <Badge variant="outline" className={cn("text-xs",
                  inc.status === "Resolved" ? "bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400" :
                  "bg-muted text-muted-foreground border-border"
                )}>
                  {inc.status}
                </Badge>
              </div>
            </div>

            <p className="text-xs font-medium text-foreground">
              <span className="text-muted-foreground">Summary: </span>
              {inc.ai_summary || inc.root_cause_summary?.substring(0, 120) || "No summary"}
            </p>

            {inc.resolution_notes && (
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-medium">Resolution: </span>{inc.resolution_notes}
              </p>
            )}

            <div className="flex items-center gap-1 mt-2 text-xs text-primary">
              <ExternalLink className="h-3 w-3" /> View full details
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
