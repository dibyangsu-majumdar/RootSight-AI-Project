import { Link } from "react-router-dom";
import { ArrowRight, Zap, BarChart3, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";

const FEATURES = [
  {
    icon: Zap,
    title: "AI-Powered Root Cause Analysis",
    desc: "Instantly identify why your pipeline failed with AI analysis powered by state-of-the-art LLMs.",
  },
  {
    icon: BarChart3,
    title: "Pattern Detection",
    desc: "Automatically detects OOM errors, timeouts, null pointers, schema mismatches, and permission issues.",
  },
  {
    icon: Shield,
    title: "Suggested Fixes",
    desc: "Get actionable remediation steps and preventive recommendations tailored to your error type.",
  },
  {
    icon: Clock,
    title: "Analysis History",
    desc: "Keep a searchable log of all past analyses to track recurring issues and improve reliability.",
  },
];

export default function Landing() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">PipelineRCA AI</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link to="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6">
          <Zap className="h-3 w-3" />
          Powered by Lovable AI Gateway
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
          Diagnose Pipeline Failures
          <br />
          <span className="text-primary">in Seconds</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          PipelineRCA AI analyzes your data pipeline logs and delivers instant root cause analysis,
          suggested fixes, and business impact assessment — so you can resolve incidents faster.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link to="/signup">
            <Button size="lg" className="gap-2">
              Start Analyzing Free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">Sign In</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
            Everything you need to debug faster
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card p-6 shadow-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold text-foreground">Ready to cut MTTR?</h2>
          <p className="mt-4 text-muted-foreground">
            Join data engineers who resolve pipeline incidents faster with AI-assisted root cause analysis.
          </p>
          <Link to="/signup">
            <Button size="lg" className="mt-8 gap-2">
              Create your free account <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} PipelineRCA AI. Built for data engineers.
      </footer>
    </div>
  );
}
