import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface StatsData {
  totalAnalyses: number;
  errorBreakdown: Record<string, number>;
  recentTrend: { period: string; count: number }[];
  risingErrors: string[];
  firstOccurrences: Record<string, string>;
}

const ERROR_COLORS: Record<string, string> = {
  OutOfMemoryError: "bg-destructive/15 text-destructive",
  NullPointerException: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  TimeoutException: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  PermissionDenied: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  SchemaMismatch: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  NetworkError: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  UnknownError: "bg-muted text-muted-foreground",
};

function formatShortDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function DashboardStats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("log_analyses")
      .select("detected_error_type, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true });

    if (error || !data) {
      setLoading(false);
      return;
    }

    // Total
    const totalAnalyses = data.length;

    // Error breakdown
    const errorBreakdown: Record<string, number> = {};
    const firstOccurrences: Record<string, string> = {};
    data.forEach((row) => {
      const type = row.detected_error_type || "UnknownError";
      errorBreakdown[type] = (errorBreakdown[type] || 0) + 1;
      if (!firstOccurrences[type]) {
        firstOccurrences[type] = row.created_at;
      }
    });

    // Weekly trend (last 4 weeks)
    const now = new Date();
    const recentTrend: { period: string; count: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i + 1) * 7);
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - i * 7);
      const count = data.filter((r) => {
        const d = new Date(r.created_at);
        return d >= weekStart && d < weekEnd;
      }).length;
      const label = `Week ${4 - i}`;
      recentTrend.push({ period: label, count });
    }

    // Detect rising errors (more in recent half than older half)
    const mid = Math.floor(data.length / 2);
    const olderHalf = data.slice(0, mid);
    const recentHalf = data.slice(mid);
    const risingErrors: string[] = [];

    const countByType = (arr: typeof data, type: string) =>
      arr.filter((r) => r.detected_error_type === type).length;

    Object.keys(errorBreakdown).forEach((type) => {
      const oldCount = countByType(olderHalf, type);
      const newCount = countByType(recentHalf, type);
      if (newCount > oldCount && newCount >= 2) {
        risingErrors.push(type);
      }
    });

    setStats({ totalAnalyses, errorBreakdown, recentTrend, risingErrors, firstOccurrences });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats || stats.totalAnalyses === 0) return null;

  const topError = Object.entries(stats.errorBreakdown).sort((a, b) => b[1] - a[1])[0];
  const maxTrend = Math.max(...stats.recentTrend.map((t) => t.count), 1);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalAnalyses}</p>
              <p className="text-xs text-muted-foreground">Total Analyses</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{topError?.[0] || "—"}</p>
              <p className="text-xs text-muted-foreground">Most Common ({topError?.[1] || 0}×)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
              <TrendingUp className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {stats.risingErrors.length > 0 ? stats.risingErrors.length : "None"}
              </p>
              <p className="text-xs text-muted-foreground">Rising Error Types</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{Object.keys(stats.errorBreakdown).length}</p>
              <p className="text-xs text-muted-foreground">Error Types Seen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error breakdown + trend */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Error type breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Error Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.errorBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} className="flex items-center gap-3">
                  <Badge className={cn("text-xs border-0 shrink-0", ERROR_COLORS[type] || ERROR_COLORS.UnknownError)}>
                    {type}
                  </Badge>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/60 transition-all duration-500"
                      style={{ width: `${(count / stats.totalAnalyses) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium w-8 text-right">{count}</span>
                  {stats.firstOccurrences[type] && (
                    <span className="text-[10px] text-muted-foreground hidden lg:inline">
                      First: {formatShortDate(stats.firstOccurrences[type])}
                    </span>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Weekly trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Weekly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-24">
              {stats.recentTrend.map((week) => (
                <div key={week.period} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-foreground">{week.count}</span>
                  <div
                    className="w-full rounded-t bg-primary/70 transition-all duration-500"
                    style={{ height: `${Math.max((week.count / maxTrend) * 100, 4)}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{week.period}</span>
                </div>
              ))}
            </div>

            {/* Rising errors alert */}
            {stats.risingErrors.length > 0 && (
              <div className="mt-4 rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
                <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Rising error rates detected
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {stats.risingErrors.map((type) => (
                    <Badge key={type} variant="outline" className="text-[10px] border-orange-500/30 text-orange-600 dark:text-orange-400">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
