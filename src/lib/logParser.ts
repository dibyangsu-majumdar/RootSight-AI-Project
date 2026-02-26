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
  serviceName: string | null;
  environment: string | null;
  requestId: string | null;
  timestamp: string | null;
  stackTrace: string;
  cleanedLog: string;
}

const ERROR_TAXONOMY: Array<{ type: ErrorType; patterns: RegExp[] }> = [
  {
    type: "OutOfMemoryError",
    patterns: [
      /OutOfMemoryError/i, /out of memory/i, /java heap space/i,
      /OOMKilled/i, /memory limit exceeded/i, /GC overhead limit exceeded/i,
    ],
  },
  {
    type: "SchemaMismatch",
    patterns: [
      /AnalysisException/i, /cannot resolve column/i, /cannot resolve/i,
      /column not found/i, /unresolved attribute/i, /Schema mismatch/i,
      /schema.*mismatch/i, /incompatible schema/i, /field.*missing/i,
      /unexpected field/i, /type mismatch/i, /column.*does not exist/i,
    ],
  },
  {
    type: "PermissionDenied",
    patterns: [
      /Permission denied/i, /AccessControlException/i, /not authorized/i,
      /Access denied/i, /Unauthorized/i, /403 Forbidden/i,
      /insufficient privileges/i, /PERMISSION_DENIED/i,
    ],
  },
  {
    type: "TimeoutException",
    patterns: [
      /TimeoutException/i, /timed out/i, /timeout/i,
      /job aborted due to timeout/i, /connection timeout/i,
      /read timeout/i, /socket timeout/i, /deadline exceeded/i,
    ],
  },
  {
    type: "NetworkError",
    patterns: [
      /Connection refused/i, /Connection reset/i, /JDBCConnectionException/i,
      /network.*unreachable/i, /host.*not found/i, /DNS resolution failed/i,
    ],
  },
  {
    type: "NullPointerException",
    patterns: [
      /NullPointerException/i, /NullReferenceException/i, /null pointer/i,
      /cannot read propert/i, /is not defined/i, /AttributeError.*NoneType/i,
    ],
  },
];

// PII patterns to mask
const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: "[EMAIL_REDACTED]" },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: "[CARD_REDACTED]" },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: "[SSN_REDACTED]" },
  { pattern: /\b\d{9,12}\b/g, replacement: "[ACCT_REDACTED]" },
  { pattern: /(?:password|passwd|secret|token|api_key|apikey)\s*[:=]\s*\S+/gi, replacement: "[CREDENTIAL_REDACTED]" },
];

const SERVICE_PATTERNS = [
  /service[:\s=]+["']?(\S+?)["']?(?:\s|$|,)/i,
  /\[([a-zA-Z][\w.-]+)\]/,
  /(\w+[-.]service)/i,
  /component[:\s=]+["']?(\S+?)["']?(?:\s|$|,)/i,
];

const ENV_PATTERNS = [
  /env(?:ironment)?[:\s=]+["']?(production|staging|development|dev|prod|stg|qa|test)["']?/i,
  /\b(production|staging|development|prod|stg|dev|qa)\b/i,
];

const REQUEST_ID_PATTERNS = [
  /request[_-]?id[:\s=]+["']?([a-f0-9-]{8,})["']?/i,
  /trace[_-]?id[:\s=]+["']?([a-f0-9-]{8,})["']?/i,
  /correlation[_-]?id[:\s=]+["']?([a-f0-9-]{8,})["']?/i,
  /x-request-id[:\s=]+["']?([a-f0-9-]{8,})["']?/i,
];

const TIMESTAMP_PATTERN = /(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/;

function extractMatch(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

function extractStackTrace(log: string): string {
  const lines = log.split("\n");
  const traceLines: string[] = [];
  let inTrace = false;
  for (const line of lines) {
    if (/^\s+at\s|Caused by:|Traceback|File\s+"/.test(line)) {
      inTrace = true;
      traceLines.push(line);
    } else if (inTrace && /^\s/.test(line)) {
      traceLines.push(line);
    } else {
      inTrace = false;
    }
  }
  return traceLines.join("\n");
}

function deduplicateStackTraces(log: string): string {
  const lines = log.split("\n");
  const seen = new Set<string>();
  const result: string[] = [];
  let dupeCount = 0;

  for (const line of lines) {
    const normalized = line.trim();
    if (/^\s+at\s/.test(line)) {
      if (seen.has(normalized)) {
        dupeCount++;
        continue;
      }
      seen.add(normalized);
    }
    if (dupeCount > 0) {
      result.push(`  ... (${dupeCount} duplicate frame(s) removed)`);
      dupeCount = 0;
    }
    result.push(line);
  }
  if (dupeCount > 0) result.push(`  ... (${dupeCount} duplicate frame(s) removed)`);
  return result.join("\n");
}

function removeInfoLines(log: string): string {
  return log
    .split("\n")
    .filter((l) => {
      const trimmed = l.trim();
      if (!trimmed) return false;
      if (/^\s*\d{4}-\d{2}-\d{2}.*\bINFO\b/.test(l) && !/error|exception|fail|warn/i.test(l)) return false;
      if (/^\s*\[INFO\]/.test(l) && !/error|exception|fail|warn/i.test(l)) return false;
      return true;
    })
    .join("\n");
}

function maskPII(log: string): string {
  let masked = log;
  for (const { pattern, replacement } of PII_PATTERNS) {
    masked = masked.replace(pattern, replacement);
  }
  return masked;
}

function truncateLog(log: string, maxChars = 12000): string {
  if (log.length <= maxChars) return log;
  const lines = log.split("\n");
  // Keep first 30% and last 70% to prioritize error area
  const headCount = Math.floor(lines.length * 0.3);
  const tailCount = Math.floor(lines.length * 0.7);
  const head = lines.slice(0, headCount);
  const tail = lines.slice(-tailCount);
  const combined = [...head, `\n... [${lines.length - headCount - tailCount} lines truncated] ...\n`, ...tail].join("\n");
  return combined.substring(0, maxChars);
}

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
  // Step 1: Extract metadata before cleaning
  const serviceName = extractMatch(rawLog, SERVICE_PATTERNS);
  const environment = extractMatch(rawLog, ENV_PATTERNS);
  const requestId = extractMatch(rawLog, REQUEST_ID_PATTERNS);
  const timestampMatch = rawLog.match(TIMESTAMP_PATTERN);
  const timestamp = timestampMatch?.[1] || null;
  const stackTrace = extractStackTrace(rawLog);

  // Step 2: Preprocessing pipeline
  let cleaned = removeInfoLines(rawLog);
  cleaned = deduplicateStackTraces(cleaned);
  cleaned = maskPII(cleaned);
  cleaned = truncateLog(cleaned);

  // Step 3: Detect error type
  for (const { type, patterns } of ERROR_TAXONOMY) {
    if (patterns.some((p) => p.test(rawLog))) {
      return {
        detectedErrorType: type,
        errorSnippet: extractErrorSnippet(rawLog, patterns),
        logSummary: summarizeLog(cleaned),
        serviceName,
        environment,
        requestId,
        timestamp,
        stackTrace,
        cleanedLog: cleaned,
      };
    }
  }

  return {
    detectedErrorType: "UnknownError",
    errorSnippet: rawLog.split("\n").slice(-5).join("\n").trim(),
    logSummary: summarizeLog(cleaned),
    serviceName,
    environment,
    requestId,
    timestamp,
    stackTrace,
    cleanedLog: cleaned,
  };
}

/** Strip leading/trailing square brackets from LLM output */
export function cleanLLMOutput(text: string): string {
  if (!text) return text;
  return text.replace(/^\[|\]$/g, "").trim();
}

/** Generate a simple hash from a stack trace for similarity matching */
export function hashStackTrace(stackTrace: string): string {
  if (!stackTrace) return "";
  // Normalize: remove line numbers, memory addresses, timestamps
  const normalized = stackTrace
    .replace(/:\d+/g, ":N")
    .replace(/0x[0-9a-f]+/gi, "0xADDR")
    .replace(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}\S*/g, "TIMESTAMP")
    .trim();
  // Simple hash
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const chr = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
