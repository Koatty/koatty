import type { GuardBundle } from 'koatty_guard';
import type { LlmClient } from 'koatty_llm';
import { createMcpHost, createMcpHttpAdapter } from 'koatty_mcp';
import type { McpSecurityOptions } from 'koatty_mcp';
import type { GenAiRecorder } from 'koatty_trace';
import { createSupportAgent } from './agent/SupportAgent';
import { createAskController } from './controller/AskController';
import { createAuditSink } from './tracing';

export interface OrderServiceAppOptions {
  /** A real `Koatty` instance (or a container-backed harness in tests). */
  app: any;
  llm: LlmClient;
  /** Guard bundle from `koatty_guard` (F-3): approval backend, audit, masking. */
  guard: GuardBundle;
  /**
   * Override the approval backend (defaults to `guard.approval`) — e.g. an
   * external ticketing webhook, or a test double.
   */
  approval?: any;
  /** GenAI recorder from `koatty_trace` (F-4). */
  genai: GenAiRecorder;
  security?: McpSecurityOptions;
  model?: string;
  provider?: string;
  /** Read-only tools handed to the model; the write tool is never exposed. */
  toolNames?: string[];
  /** Trace context of the current request (defaults to the active context). */
  currentContext?: () => any;
}

/**
 * Wire the reference app: one MCP host (F-1) + guard (F-3) + GenAI tracing
 * (F-4) + the streaming agent (F-2).
 *
 * Security posture of the example: scoped API keys, an owner approval backend,
 * redacted auditing, strict profile, and only read-only tools handed to the
 * model — the destructive tool stays behind scope + approval.
 */
export function createOrderServiceApp(options: OrderServiceAppOptions) {
  const audit = createAuditSink({
    audit: options.guard.audit,
    genai: options.genai,
    context: options.currentContext,
  });

  const host = createMcpHost({
    app: options.app,
    security: options.security,
    approval: (options.approval ?? options.guard.approval) as any,
    audit,
    redact: (value: any) => options.guard.masking.mask(value),
    serverName: 'koatty-mcp-order-service',
    serverVersion: '1.0.0',
    instructions: '订单查询（只读）与退款（写操作，需要 scope 与人工审批）。',
  });

  const agent = createSupportAgent({
    llm: options.llm,
    genai: options.genai,
    model: options.model,
    provider: options.provider,
    tools: options.toolNames ?? ['order_query', 'order_list'],
  });

  const ask = createAskController({ agent, content: options.guard.content });

  // `createMcpHttpAdapter({ host })` defaults to `/mcp`; mount `mcp.middleware`
  // on the existing HTTP service (`app.use(...)`) instead of adding a Serve
  // protocol. `/mcp` is only reachable where you mount it.
  const mcp = createMcpHttpAdapter({ host });

  return { host, mcp, agent, ask, audit, guard: options.guard, genai: options.genai };
}
