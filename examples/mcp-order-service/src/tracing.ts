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

/**
 * Bridges `koatty_mcp`'s audit sink to `koatty_trace`'s GenAI recorder.
 *
 * `koatty_mcp` emits one audit record per tool call on every transport (HTTP,
 * stdio and the adapter-internal path), so this single seam is enough to get a
 * `gen_ai.tool` span for each call and, together with the request span of the
 * middleware and the `gen_ai.chat` span of the agent, one complete trace:
 * MCP request -> tool call -> LLM call.
 *
 * `koatty_mcp` currently has no dedicated observability hook, so this bridge is
 * the reference integration until one exists.
 */
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

      // ... and to the GenAI spans/metrics.
      options.genai?.recordToolCall({
        name: record.tool,
        status: record.status === 'success' ? 'success' : 'error',
        durationMs: record.durationMs,
        toolCallId: record.requestId,
        arguments: record.argumentSummary,
        context: options.context?.(),
      });
    },
  };
}
