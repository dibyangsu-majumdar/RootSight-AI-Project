import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getConfidenceColor } from "@/lib/confidenceEngine";

interface Props {
  score: number;
  level: "high" | "medium" | "low";
  reasoning: string;
}

export function ConfidenceBadge({ score, level, reasoning }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn("border text-xs font-semibold cursor-help", getConfidenceColor(level))}>
          {score}% Confidence ({level})
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs">{reasoning}</p>
      </TooltipContent>
    </Tooltip>
  );
}
