import 'reflect-metadata';
import { AsyncLocalStorage } from 'async_hooks';
import { context, trace } from '@opentelemetry/api';
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Container } from 'koatty_container';
import { Tool, createInMemoryPair } from 'koatty_mcp';
import { createGuard } from 'koatty_guard';
import { createGenAiRecorder } from 'koatty_trace';
import { createLlmClient } from 'koatty_llm';
import { createOrderServiceApp } from '../../src/app';

test('a protocol tool actually invokes the LLM inside its live child span', async () => {
  const exporter = new InMemorySpanExporter();
  const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
  const tracer = provider.getTracer('actual-chain');
  const root = tracer.startSpan('mcp.request'); const parent = trace.setSpan(context.active(), root);
  const storage = new AsyncLocalStorage<any>(); const container = new Container();
  const app = { container, ctxStorage: storage, getCurrentContext: () => storage.getStore() };
  let service: ReturnType<typeof createOrderServiceApp>;
  class Answer {
    @Tool({ name: 'answer', annotations: { readOnlyHint: true } })
    async answer() { return service.agent.answer('order question'); }
  }
  container.reg('Answer', Answer, { type: 'SERVICE' } as any);
  service = createOrderServiceApp({ app, guard: createGuard({ app }), genai: createGenAiRecorder({ tracer }), currentContext: () => parent, toolNames: [],
    llm: createLlmClient({ providers: [{ name: 'fixture', async *stream() {
      expect(exporter.getFinishedSpans()).toHaveLength(0);
      yield { type: 'text', delta: 'answer' }; yield { type: 'done' };
    } }], routes: { default: { model: 'default', provider: 'fixture' } } }),
  });
  const [a, b] = await createInMemoryPair(); const client = new Client({ name: 'chain', version: '1' });
  try {
    await service.host.server.connect(b); await client.connect(a);
    expect((await client.callTool({ name: 'answer', arguments: {} })).isError).toBeFalsy();
    root.end();
    const spans = exporter.getFinishedSpans();
    const tool = spans.find(s => s.name === 'gen_ai.tool')!; const chat = spans.find(s => s.name === 'gen_ai.chat')!;
    expect(tool.parentSpanContext?.spanId).toBe(root.spanContext().spanId);
    expect(chat.parentSpanContext?.spanId).toBe(tool.spanContext().spanId);
    expect(new Set(spans.map(s => s.spanContext().traceId)).size).toBe(1);
  } finally { await client.close(); await service.mcp.close(); await provider.shutdown(); }
});
