export type ErrorType =
  | "OutOfMemoryError"
  | "NullPointerException"
  | "TimeoutException"
  | "PermissionDenied"
  | "SchemaMismatch"
  | "UnknownError";

export interface ParsedLog {
  detectedErrorType: ErrorType;
  errorSnippet: string;
  logSummary: string;
}

const ERROR_PATTERNS: Array<{ type: ErrorType; patterns: RegExp[] }> = [
  {
    type: "OutOfMemoryError",
    patterns: [
      /OutOfMemoryError/i,
      /out of memory/i,
      /heap space/i,
      /OOMKilled/i,
      /memory limit exceeded/i,
      /GC overhead limit exceeded/i,
    ],
  },
  {
    type: "NullPointerException",
    patterns: [
      /NullPointerException/i,
      /NullReferenceException/i,
      /null pointer/i,
      /cannot read propert/i,
      /is not defined/i,
      /AttributeError.*NoneType/i,
    ],
  },
  {
    type: "TimeoutException",
    patterns: [
      /TimeoutException/i,
      /timed out/i,
      /timeout/i,
      /connection timeout/i,
      /read timeout/i,
      /socket timeout/i,
      /deadline exceeded/i,
    ],
  },
  {
    type: "PermissionDenied",
    patterns: [
      /Permission denied/i,
      /Access denied/i,
      /Unauthorized/i,
      /403 Forbidden/i,
      /insufficient privileges/i,
      /PERMISSION_DENIED/i,
      /not authorized/i,
    ],
  },
  {
    type: "SchemaMismatch",
    patterns: [
      /Schema mismatch/i,
      /schema.*mismatch/i,
      /column.*not found/i,
      /incompatible schema/i,
      /field.*missing/i,
      /unexpected field/i,
      /type mismatch/i,
      /column.*does not exist/i,
    ],
  },
];

function extractErrorSnippet(log: string, patterns: RegExp[]): string {
  const lines = log.split("\n");
  for (const pattern of patterns) {
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        // Return up to 5 lines around the match
        const start = Math.max(0, i - 1);
        const end = Math.min(lines.length, i + 4);
        return lines.slice(start, end).join("\n").trim();
      }
    }
  }
  // Fallback: return last 5 lines
  return lines.slice(-5).join("\n").trim();
}

function summarizeLog(log: string): string {
  const lines = log.split("\n").filter((l) => l.trim().length > 0);
  const totalLines = lines.length;
  // Take first 3 non-empty lines
  const preview = lines.slice(0, 3).join(" | ").trim();
  return `${totalLines} lines. Preview: ${preview.substring(0, 200)}${preview.length > 200 ? "..." : ""}`;
}

export function parseLog(rawLog: string): ParsedLog {
  for (const { type, patterns } of ERROR_PATTERNS) {
    const matched = patterns.some((p) => p.test(rawLog));
    if (matched) {
      return {
        detectedErrorType: type,
        errorSnippet: extractErrorSnippet(rawLog, patterns),
        logSummary: summarizeLog(rawLog),
      };
    }
  }

  return {
    detectedErrorType: "UnknownError",
    errorSnippet: rawLog.split("\n").slice(-5).join("\n").trim(),
    logSummary: summarizeLog(rawLog),
  };
}
