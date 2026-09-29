import type { LlmClient, LlmMessage } from 'koatty_llm';
import type { GenAiRecorder } from 'koatty_trace';

export interface SupportAgentOptions {
  llm: LlmClient;
  genai?: GenAiRecorder;
  /** Logical route name from the LLM config; also recorded on the span. */
  model?: string;
  /** Provider name of that route, recorded on the span. */
  provider?: string;
  /** Read-only tools the model is allowed to call, by MCP tool name. */
  tools?: string[];
  /** Process-internal tool loop (`registry` + `invoke` from koatty_mcp). */
  toolRuntime?: { registry: any; invoke: any };
}

export interface AgentCallOptions {
  /** Cancellation, normally `ctx.signal` (client disconnect). */
  signal?: AbortSignal;
  /** Parent trace context, so the GenAI span joins the request trace. */
  context?: any;
}

/**
 * The reference "answer" helper: streams an answer for the SSE endpoint and
 * records OpenTelemetry GenAI spans/metrics through `koatty_trace`.
 *
 * Prompt/completion text is only captured when the recorder was created with
 * `captureContent: true`, and it is masked first (see `koatty_guard`).
 */
export function createSupportAgent(options: SupportAgentOptions) {
  const model = options.model ?? 'default';
  const provider = options.provider ?? 'default';
  const genai = options.genai;

  return {
    model,

    /** Streaming path used by the `/ask` SSE endpoint. */
    async *stream(question: string, call: AgentCallOptions = {}) {
      const started = Date.now();
      const messages: LlmMessage[] = [{ role: 'user', content: question }];

      for await (const chunk of options.llm.stream({
        model,
        messages,
        tools: options.tools,
        signal: call.signal,
      })) {
        if (chunk.type === 'done') {
          genai?.recordChat({
            provider,
            model,
            responseModel: (chunk as any).model ?? model,
            usage: (chunk as any).usage,
            finishReason: chunk.finishReason,
            durationMs: Date.now() - started,
            request: { messages },
            context: call.context,
          });
        }
        yield chunk;
      }
    },

    /** Non-streaming path, optionally running the in-process tool loop. */
    async answer(question: string, call: AgentCallOptions = {}) {
      const started = Date.now();
      const messages: LlmMessage[] = [{ role: 'user', content: question }];
      const result = options.toolRuntime
        ? await options.llm.withTools({
            ...options.toolRuntime,
            model,
            messages,
            tools: options.tools,
            signal: call.signal,
          })
        : await options.llm.complete({ model, messages, tools: options.tools, signal: call.signal });

      genai?.recordChat({
        provider: result.provider,
        model,
        responseModel: result.model,
        usage: result.usage,
        finishReason: result.finishReason,
        durationMs: Date.now() - started,
        request: { messages },
        response: { text: result.text },
        context: call.context,
      });
      for (const toolCall of result.toolCalls ?? []) {
        genai?.recordToolCall({
          name: (toolCall as any).name,
          status: 'success',
          toolCallId: (toolCall as any).id,
          context: call.context,
        });
      }
      return result;
    },
  };
}
