import { Zap, Layers, Brain, Database, Shield, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Layers,
    title: "Structured Log Preprocessing",
    description: "Before any AI reasoning, logs are parsed through a structured pipeline that extracts error types, stack traces, service names, timestamps, and request IDs. INFO noise is removed, stack traces are deduplicated, and PII is masked — reducing token usage and improving accuracy.",
  },
  {
    icon: Database,
    title: "Incident Memory System",
    description: "Every analysis creates a persistent incident record with stack trace hashing. When new logs arrive, the system automatically checks for similar past incidents and surfaces past resolutions, occurrence frequencies, and similarity scores.",
  },
  {
    icon: Brain,
    title: "Structured AI Reasoning",
    description: "The LLM is prompted to return strict JSON with root cause, confidence scores, fix steps, and impact analysis. Output is validated and auto-retried if malformed. No free-text guessing — only structured, actionable intelligence.",
  },
  {
    icon: Shield,
    title: "Hallucination Reduction",
    description: "The system explicitly instructs the AI to state when data is insufficient rather than guess. Confidence scores reflect parsing completeness, similarity match strength, and LLM certainty signals — enabling trust calibration.",
  },
  {
    icon: TrendingUp,
    title: "Pattern Learning Over Time",
    description: "As more incidents are analyzed, the similarity engine improves. Resolution notes feed back into future analyses, building an organizational knowledge base of failure patterns and proven fixes.",
  },
  {
    icon: Zap,
    title: "Production-Grade Pipeline Focus",
    description: "Built specifically for data pipeline failures — Spark OOM errors, schema mismatches, permission issues, timeouts, and network errors. Designed for SREs, data engineers, and platform teams running production workloads.",
  },
];

export default function About() {
  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Zap className="h-7 w-7 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground">About RootSight AI</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          RootSight AI is a structured, memory-enabled root cause analysis platform designed for production data pipelines.
          It goes beyond simple LLM wrappers by preprocessing logs, maintaining historical incident memory,
          and enforcing structured reasoning to deliver reliable, actionable insights.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/30 border-primary/20">
        <CardContent className="p-6 text-center">
          <p className="text-sm font-semibold text-foreground mb-2">Architecture</p>
          <p className="text-xs text-muted-foreground font-mono">
            LogParser → IncidentStore → SimilarityEngine → LLMReasoner → ConfidenceEngine → UI
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Each module is independent and testable. No monolithic functions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
