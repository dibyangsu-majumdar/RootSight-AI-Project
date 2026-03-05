import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Incident {
  id: string;
  created_at: string;
  error_type: string | null;
  status: string;
  root_cause_summary: string | null;
  ai_summary: string | null;
  service_name: string | null;
  affected_service: string | null;
  environment: string | null;
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(dateStr));
}

export default function Incidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [errorTypeFilter, setErrorTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { fetchIncidents(); }, []);

  const fetchIncidents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("incidents")
      .select("id, created_at, error_type, status, root_cause_summary, ai_summary, service_name, affected_service, environment")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (data) {
      setIncidents(data as any);
      // Fetch feedback status for these incidents
      const ids = data.map((d: any) => d.id);
      if (ids.length > 0) {
        const { data: fbData } = await supabase
          .from("incident_feedback" as any)
          .select("incident_id, feedback_type")
          .in("incident_id", ids);
        if (fbData) {
          const map: Record<string, string> = {};
          (fbData as any[]).forEach((fb: any) => {
            if (!map[fb.incident_id]) {
              map[fb.incident_id] = fb.feedback_type === "positive" ? "Positive feedback received" : "Negative feedback received";
            }
          });
          setFeedbackMap(map);
        }
      }
    }
    setLoading(false);
  };

  const filtered = incidents.filter((inc) => {
    if (statusFilter !== "all" && inc.status !== statusFilter) return false;
    if (errorTypeFilter !== "all" && inc.error_type !== errorTypeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const searchable = `${inc.service_name || ""} ${inc.root_cause_summary || ""} ${inc.error_type || ""} ${inc.ai_summary || ""}`.toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  const errorTypes = [...new Set(incidents.map((i) => i.error_type).filter(Boolean))] as string[];

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Incident Dashboard
        </h1>
        <p className="text-muted-foreground">All tracked incidents with AI summaries, feedback, and resolution status.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search incidents..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={errorTypeFilter} onValueChange={setErrorTypeFilter}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Error Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Error Types</SelectItem>
                {errorTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchIncidents}>Refresh</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="py-16">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <Shield className="h-12 w-12 text-muted-foreground" />
            <p className="font-semibold text-foreground">No incidents found</p>
            <p className="text-sm text-muted-foreground">Analyze logs from the Dashboard to create incidents.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Error Type</TableHead>
                <TableHead>AI Summary</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inc) => (
                <TableRow key={inc.id} className="cursor-pointer" onClick={() => navigate(`/incidents/${inc.id}`)}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(inc.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{inc.error_type || "Unknown"}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                    {inc.ai_summary || inc.root_cause_summary?.substring(0, 80) || "—"}
                  </TableCell>
                  <TableCell>
                    {feedbackMap[inc.id] ? (
                      <span className={cn("text-xs font-medium",
                        feedbackMap[inc.id].includes("Positive") ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"
                      )}>
                        {feedbackMap[inc.id]}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs",
                      inc.status === "Resolved" ? "bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400" :
                      "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400"
                    )}>
                      {inc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-xs">View →</Button>
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
