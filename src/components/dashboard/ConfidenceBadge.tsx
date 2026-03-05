import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getConfidenceColor } from "@/lib/confidenceEngine";

interface Props {
  score: number;
  level: "high" | "medium" | "low";
  reasoning: string;
}

const LEVEL_EMOJI: Record<string, string> = {
  high: "🟢",
  medium: "🟡",
  low: "🔴",
};

const LEVEL_LABEL: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function ConfidenceBadge({ score, level, reasoning }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn("border text-xs font-semibold cursor-help", getConfidenceColor(level))}>
          {LEVEL_EMOJI[level]} {score}% Confidence ({LEVEL_LABEL[level]})
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs space-y-1">
        <p className="text-xs font-medium">Model: Gemini Flash</p>
        <p className="text-xs">{reasoning}</p>
      </TooltipContent>
    </Tooltip>
  );
}
