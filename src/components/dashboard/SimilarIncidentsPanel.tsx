import { AlertCircle, Clock, ArrowRight } from "lucide-react";
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
  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-warning" />
          Similar Incidents Detected ({incidents.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {incidents.map((inc) => (
          <div key={inc.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">
                {inc.root_cause_summary?.substring(0, 100) || "No summary"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{formatDate(inc.created_at)}</span>
                {inc.service_name && (
                  <span className="text-xs text-muted-foreground">• {inc.service_name}</span>
                )}
              </div>
              {inc.resolution_notes && (
                <p className="text-xs text-muted-foreground mt-1 italic">Resolution: {inc.resolution_notes}</p>
              )}
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
        ))}
      </CardContent>
    </Card>
  );
}
