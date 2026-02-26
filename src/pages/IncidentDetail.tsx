import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Clock, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getConfidenceColor } from "@/lib/confidenceEngine";
import { ConfidenceBadge } from "@/components/dashboard/ConfidenceBadge";

interface IncidentFull {
  id: string;
  created_at: string;
  environment: string | null;
  error_type: string | null;
  service_name: string | null;
  affected_service: string | null;
  stack_trace_hash: string | null;
  root_cause_summary: string | null;
  confidence_score: number;
  confidence_reasoning: string | null;
  recommended_fix_steps: string | null;
  long_term_prevention: string | null;
  impact_scope: string | null;
  resolution_notes: string | null;
  status: string;
  file_name: string | null;
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(dateStr));
}

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [incident, setIncident] = useState<IncidentFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [status, setStatus] = useState("Open");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) fetchIncident();
  }, [id]);

  const fetchIncident = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", id!)
      .eq("user_id", user!.id)
      .single();

    if (data) {
      setIncident(data as any);
      setResolutionNotes(data.resolution_notes || "");
      setStatus(data.status);
    }
    setLoading(false);
  };

  const saveChanges = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("incidents")
      .update({ resolution_notes: resolutionNotes, status } as any)
      .eq("id", id!);

    if (error) {
      toast({ title: "Failed to save", variant: "destructive" });
    } else {
      toast({ title: "Incident updated" });
      setIncident((prev) => prev ? { ...prev, resolution_notes: resolutionNotes, status } : prev);
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="mx-auto max-w-4xl p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (!incident) return (
    <div className="mx-auto max-w-4xl p-6">
      <p className="text-muted-foreground">Incident not found.</p>
      <Button variant="outline" onClick={() => navigate("/incidents")} className="mt-4">← Back</Button>
    </div>
  );

  const level = incident.confidence_score >= 75 ? "high" : incident.confidence_score >= 45 ? "medium" : "low";
  let fixSteps: string[] = [];
  try { fixSteps = JSON.parse(incident.recommended_fix_steps || "[]"); } catch { fixSteps = [incident.recommended_fix_steps || ""]; }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/incidents")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">Incident Detail</h1>
        <Badge variant="outline" className="text-xs">{incident.error_type || "Unknown"}</Badge>
        <ConfidenceBadge score={incident.confidence_score} level={level} reasoning={incident.confidence_reasoning || ""} />
        <Badge variant="outline" className={cn("text-xs",
          incident.status === "Resolved" ? "bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400" :
          "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400"
        )}>
          {incident.status}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(incident.created_at)}</span>
        {incident.environment && <span>Env: {incident.environment}</span>}
        {(incident.service_name || incident.affected_service) && <span>Service: {incident.service_name || incident.affected_service}</span>}
        {incident.file_name && <span>File: {incident.file_name}</span>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DetailCard icon="🔍" title="Root Cause" content={incident.root_cause_summary || "—"} accent="border-l-4 border-l-destructive" />
        <DetailCard icon="🔧" title="Recommended Fix Steps" content={fixSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")} accent="border-l-4 border-l-primary" />
        <DetailCard icon="🛡️" title="Long-Term Prevention" content={incident.long_term_prevention || "—"} accent="border-l-4 border-l-green-500" />
        <DetailCard icon="📊" title="Impact Scope" content={incident.impact_scope || "—"} accent="border-l-4 border-l-orange-500" />
        <DetailCard icon="🧠" title="Confidence Reasoning" content={incident.confidence_reasoning || "—"} accent="border-l-4 border-l-yellow-500" />
      </div>

      {/* Resolution section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Resolution & Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Add resolution notes..."
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            className="min-h-[80px] text-sm"
          />
          <Button onClick={saveChanges} disabled={saving} size="sm" className="gap-2">
            <Save className="h-4 w-4" />{saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailCard({ icon, title, content, accent }: { icon: string; title: string; content: string; accent?: string }) {
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
