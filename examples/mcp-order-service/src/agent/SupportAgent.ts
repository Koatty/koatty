import type { LlmClient, LlmMessage } from 'koatty_llm';
import type { GenAiRecorder } from 'koatty_trace';

export interface SupportAgentOptions {
  llm: LlmClient;
  genai?: GenAiRecorder;
  model?: string;
  provider?: string;
  tools?: string[];
  toolRuntime?: { registry: any; invoke: any };
}
export interface AgentCallOptions {
  signal?: AbortSignal;
  context?: any;
  budgetScope?: string;
}
/** The provider attempt observer owns telemetry; this layer owns the tool loop. */
export function createSupportAgent(options: SupportAgentOptions) {
  const model = options.model ?? 'default';
  const request = (question: string, call: AgentCallOptions) => ({
    model, messages: [{ role: 'user', content: question }] as LlmMessage[],
    tools: options.tools, signal: call.signal, budgetScope: call.budgetScope,
  });
  return {
    model,
    async *stream(question: string, call: AgentCallOptions = {}) {
      const input = request(question, call);
      yield* options.toolRuntime
        ? options.llm.streamWithTools({ ...input, ...options.toolRuntime })
        : options.llm.stream(input);
    },
    async answer(question: string, call: AgentCallOptions = {}) {
      const input = request(question, call);
      return options.toolRuntime
        ? options.llm.withTools({ ...input, ...options.toolRuntime })
        : options.llm.complete(input);
    },
  };
}
