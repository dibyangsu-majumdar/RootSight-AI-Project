export type ErrorType =
  | "OutOfMemoryError"
  | "NullPointerException"
  | "TimeoutException"
  | "PermissionDenied"
  | "SchemaMismatch"
  | "NetworkError"
  | "UnknownError";

export interface ParsedLog {
  detectedErrorType: ErrorType;
  errorSnippet: string;
  logSummary: string;
}

const ERROR_TAXONOMY: Array<{ type: ErrorType; patterns: RegExp[] }> = [
  {
    type: "OutOfMemoryError",
    patterns: [
      /OutOfMemoryError/i,
      /out of memory/i,
      /java heap space/i,
      /OOMKilled/i,
      /memory limit exceeded/i,
      /GC overhead limit exceeded/i,
    ],
  },
  {
    type: "SchemaMismatch",
    patterns: [
      /AnalysisException/i,
      /cannot resolve column/i,
      /cannot resolve/i,
      /column not found/i,
      /unresolved attribute/i,
      /Schema mismatch/i,
      /schema.*mismatch/i,
      /incompatible schema/i,
      /field.*missing/i,
      /unexpected field/i,
      /type mismatch/i,
      /column.*does not exist/i,
    ],
  },
  {
    type: "PermissionDenied",
    patterns: [
      /Permission denied/i,
      /AccessControlException/i,
      /not authorized/i,
      /Access denied/i,
      /Unauthorized/i,
      /403 Forbidden/i,
      /insufficient privileges/i,
      /PERMISSION_DENIED/i,
    ],
  },
  {
    type: "TimeoutException",
    patterns: [
      /TimeoutException/i,
      /timed out/i,
      /timeout/i,
      /job aborted due to timeout/i,
      /connection timeout/i,
      /read timeout/i,
      /socket timeout/i,
      /deadline exceeded/i,
    ],
  },
  {
    type: "NetworkError",
    patterns: [
      /Connection refused/i,
      /Connection reset/i,
      /JDBCConnectionException/i,
      /network.*unreachable/i,
      /host.*not found/i,
      /DNS resolution failed/i,
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
];

function extractErrorSnippet(log: string, patterns: RegExp[]): string {
  const lines = log.split("\n");
  for (const pattern of patterns) {
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        const start = Math.max(0, i - 1);
        const end = Math.min(lines.length, i + 4);
        return lines.slice(start, end).join("\n").trim();
      }
    }
  }
  return lines.slice(-5).join("\n").trim();
}

function summarizeLog(log: string): string {
  const lines = log.split("\n").filter((l) => l.trim().length > 0);
  const totalLines = lines.length;
  const preview = lines.slice(0, 3).join(" | ").trim();
  return `${totalLines} lines. Preview: ${preview.substring(0, 200)}${preview.length > 200 ? "..." : ""}`;
}

export function parseLog(rawLog: string): ParsedLog {
  for (const { type, patterns } of ERROR_TAXONOMY) {
    if (patterns.some((p) => p.test(rawLog))) {
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

/** Strip leading/trailing square brackets from LLM output */
export function cleanLLMOutput(text: string): string {
  if (!text) return text;
  return text.replace(/^\[|\]$/g, "").trim();
}
