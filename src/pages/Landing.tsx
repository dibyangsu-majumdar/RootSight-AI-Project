import { Link } from "react-router-dom";
import { ArrowRight, Zap, BarChart3, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  const hero = useInView();
  const features = useInView();
  const cta = useInView();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md transition-all duration-300">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary transition-transform duration-200 hover:scale-110">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">RootSight AI</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="transition-all duration-200 hover:scale-105">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="transition-all duration-200 hover:scale-105">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        ref={hero.ref}
        className={`mx-auto max-w-6xl px-6 py-24 text-center transition-all duration-700 ease-out ${
          hero.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
          Diagnose Pipeline Failures
          <br />
          <span className="text-primary">in Seconds</span>
        </h1>
        <p className={`mx-auto mt-6 max-w-2xl text-lg text-muted-foreground transition-all duration-700 delay-200 ease-out ${
          hero.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}>
          RootSight AI analyzes your data pipeline logs and delivers instant root cause analysis,
          suggested fixes, and business impact assessment — so you can resolve incidents faster.
        </p>
        <div className={`mt-10 flex items-center justify-center gap-4 transition-all duration-700 delay-[400ms] ease-out ${
          hero.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}>
          <Link to="/signup">
            <Button size="lg" className="gap-2 transition-all duration-200 hover:scale-105 hover:shadow-lg">
              Start Analyzing Free <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="transition-all duration-200 hover:scale-105">Sign In</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/40 py-20">
        <div ref={features.ref} className="mx-auto max-w-6xl px-6">
          <h2 className={`mb-12 text-center text-3xl font-bold text-foreground transition-all duration-600 ease-out ${
            features.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}>
            Everything you need to debug faster
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                className={`rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-500 ease-out hover:shadow-md hover:-translate-y-1 hover:border-primary/30 ${
                  features.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: features.visible ? `${150 + i * 100}ms` : "0ms" }}
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors duration-200">
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
        <div
          ref={cta.ref}
          className={`mx-auto max-w-2xl px-6 text-center transition-all duration-700 ease-out ${
            cta.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-3xl font-bold text-foreground">Ready to cut MTTR?</h2>
          <p className="mt-4 text-muted-foreground">
            Join data engineers who resolve pipeline incidents faster with AI-assisted root cause analysis.
          </p>
          <Link to="/signup">
            <Button size="lg" className="mt-8 gap-2 transition-all duration-200 hover:scale-105 hover:shadow-lg">
              Create your free account <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} RootSight AI. Built for data engineers.
      </footer>
    </div>
  );
}
