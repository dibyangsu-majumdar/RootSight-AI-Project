import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  count: number;
  errorType: string;
}

export function RecurringBanner({ count, errorType }: Props) {
  if (count <= 1) return null;

  return (
    <Card className="border-orange-500/30 bg-orange-500/10">
      <CardContent className="p-4 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">
            ⚠ Recurring Incident Detected
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
            This <span className="font-medium">{errorType}</span> error has occurred {count} time{count !== 1 ? "s" : ""} in the past 7 days.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
