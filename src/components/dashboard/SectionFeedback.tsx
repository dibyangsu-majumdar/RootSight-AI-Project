import { useState } from "react";
import { ThumbsUp, ThumbsDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  incidentId: string;
  sectionName: string;
}

export function SectionFeedback({ incidentId, sectionName }: Props) {
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const submitFeedback = async (type: "positive" | "negative", commentText?: string) => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("incident_feedback" as any).insert({
      incident_id: incidentId,
      user_id: user.id,
      section_name: sectionName,
      feedback_type: type,
      comment: commentText || null,
    } as any);

    if (error) {
      toast({ title: "Failed to submit feedback", variant: "destructive" });
    } else {
      setSubmitted(true);
      toast({ title: "Feedback submitted" });
    }
    setSubmitting(false);
  };

  const handleThumbsUp = () => {
    setFeedback("positive");
    submitFeedback("positive");
  };

  const handleThumbsDown = () => {
    setFeedback("negative");
  };

  const handleSubmitComment = () => {
    submitFeedback("negative", comment);
  };

  if (submitted) {
    return (
      <p className="text-xs text-muted-foreground mt-2 italic">
        {feedback === "positive" ? "👍 Thanks for the positive feedback!" : "👎 Thanks — your correction helps improve future analyses."}
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1.5 text-xs", feedback === "positive" && "bg-green-500/15 border-green-500/30 text-green-700 dark:text-green-400")}
          onClick={handleThumbsUp}
          disabled={submitting || feedback === "positive"}
        >
          <ThumbsUp className="h-3 w-3" /> Correct
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1.5 text-xs", feedback === "negative" && "bg-destructive/15 border-destructive/30 text-destructive")}
          onClick={handleThumbsDown}
          disabled={submitting || feedback === "negative"}
        >
          <ThumbsDown className="h-3 w-3" /> Incorrect
        </Button>
      </div>

      {feedback === "negative" && !submitted && (
        <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <Textarea
            className="text-xs min-h-[60px] resize-none"
            placeholder="What should the correct explanation have been?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button size="sm" className="gap-1.5 text-xs" onClick={handleSubmitComment} disabled={submitting}>
            <Send className="h-3 w-3" /> Submit Feedback
          </Button>
        </div>
      )}
    </div>
  );
}
