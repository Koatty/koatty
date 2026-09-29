import type { GenAiRecorder } from 'koatty_trace';

/** Shape of the records emitted by `koatty_mcp` (see its `AuditRecord`). */
export interface McpAuditRecord {
  tool: string;
  caller?: string;
  sessionId?: string;
  requestId?: string;
  status: 'success' | 'invalid' | 'denied' | 'pending-approval' | 'error' | 'cancelled' | string;
  durationMs?: number;
  argumentSummary?: Record<string, unknown>;
  error?: string;
}

export interface AuditSinkOptions {
  /** Guard audit service (already masks the argument summary). */
  audit?: { record(record: any): void | Promise<void> };
  genai?: GenAiRecorder;
  /** Resolves the trace context of the current request. */
  context?: () => any;
}

/** Audit-only adapter. Live tool spans are owned by the host aroundTool hook. */
export function createAuditSink(options: AuditSinkOptions): { record(record: McpAuditRecord): void } {
  return {
    record(record: McpAuditRecord) {
      // Fan out to the guard audit (redacted, structured) ...
      void options.audit?.record({
        caller: record.caller ?? 'unknown',
        target: record.tool,
        argumentSummary: record.argumentSummary ?? {},
        status: record.status,
        durationMs: record.durationMs ?? 0,
        error: record.error,
      } as any);

    },
  };
}
