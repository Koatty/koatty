import 'reflect-metadata';
import { createServer } from 'http';
import { Koatty } from 'koatty_core';
import { Container } from 'koatty_container';
import { context, trace } from '@opentelemetry/api';
import { createApiKeyAuth } from 'koatty_mcp';
import { createGuard } from 'koatty_guard';
import { createGenAiRecorder } from 'koatty_trace';
import { createLlmClient, createOpenAiCompatibleProvider, type LlmProvider } from 'koatty_llm';
import { createOrderServiceApp } from './app';
import { OrderService } from './service/OrderService';
import { OrderTools } from './tools/OrderTools';

class Application extends Koatty { constructor() { super(); } }
/** A real Koatty listener. No credentials or configuration values are logged. */
export function createReferenceServer(options: { keys: Record<string, string[]>; provider: LlmProvider; model: string }) {
  if (!Object.keys(options.keys).length) throw new Error('MCP_API_KEYS must declare at least one credential');
  const app = new Application();
  const container = new Container(); app.container = container; container.setApp(app as any);
  container.reg('OrderService', OrderService, { type: 'SERVICE' } as any);
  container.reg('OrderTools', OrderTools, { type: 'SERVICE' } as any);
  const guard = createGuard({ app, rateLimit: 60, approvalTimeoutMs: 30_000 });
  const genai = createGenAiRecorder();
  const service = createOrderServiceApp({ app, guard, genai,
    security: { strict: true, auth: createApiKeyAuth({ keys: options.keys }) },
    llm: createLlmClient({ providers: [options.provider], routes: { default: { model: 'default', provider: options.provider.name, providerModel: options.model } } }),
  });
  app.use(async (ctx: any, next: any) => {
    const span = genai.startSpan(ctx.path === '/mcp' ? 'mcp.request' : 'http.request');
    ctx.genaiContext = trace.setSpan(context.active(), span);
    let ended = false;
    const end = () => { if (!ended) { ended = true; span.end(); } };
    ctx.res.once('finish', end); ctx.res.once('close', end);
    try { await app.ctxStorage.run(ctx, next); } catch { ctx.status = 500; ctx.body = { error: 'request_failed' }; }
    if (ctx.respond !== false && !ctx.res.writableEnded && !ctx.res.destroyed) {
      ctx.res.statusCode = ctx.status;
      ctx.res.setHeader('Content-Type', 'application/json');
      ctx.res.end(JSON.stringify(ctx.body ?? { error: 'not_found' }));
    }
  });
  app.use(async (ctx: any, next: any) => {
    if (ctx.path === '/healthz' || ctx.path === '/readyz') { ctx.body = { ready: true }; return; }
    if (ctx.path !== '/mcp' && ctx.path !== '/ask' && !ctx.path.startsWith('/approvals')) return next();
    try { ctx.principal = await service.host.resolveIdentity({ headers: ctx.headers, transport: 'http' }); }
    catch { ctx.status = 401; ctx.body = { error: 'unauthorized' }; return; }
    if (ctx.method === 'POST') {
      let size = 0; const parts: Buffer[] = [];
      for await (const part of ctx.req) {
        size += part.length;
        if (size > 64 * 1024) { ctx.status = 413; ctx.body = { error: 'payload_too_large' }; return; }
        parts.push(part);
      }
      try { ctx.request.body = JSON.parse(Buffer.concat(parts).toString() || '{}'); }
      catch { ctx.status = 400; ctx.body = { error: 'invalid_json' }; return; }
    }
    await next();
  });
  app.use(service.mcp.middleware);
  app.use(async (ctx: any) => {
    if (ctx.path === '/ask' && ctx.method === 'POST') {
      if (typeof ctx.request.body?.question !== 'string' || ctx.request.body.question.length > 2000) {
        ctx.status = 400; ctx.body = { error: 'invalid_question' }; return;
      }
      return service.ask.ask(ctx);
    }
    if (ctx.path === '/approvals' || ctx.path.startsWith('/approvals/')) {
      if (!ctx.principal?.scopes?.includes('approval:manage')) { ctx.status = 403; return; }
      if (ctx.method === 'GET' && ctx.path === '/approvals') { ctx.body = guard.approval.list(); return; }
      if (ctx.method === 'POST') {
        const id = decodeURIComponent(ctx.path.slice('/approvals/'.length));
        const approved = ctx.request.body?.approved;
        if (typeof approved !== 'boolean') { ctx.status = 400; return; }
        const ok = approved ? await guard.approval.approve(id, ctx.principal.id) : await guard.approval.reject(id, 'operator-rejected');
        ctx.status = ok ? 200 : 409; ctx.body = { accepted: ok };
      }
    }
  });
  const server = createServer(app.callback());
  return { app, server, service, async close() {
    await service.mcp.close(); server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await app.stop();
  } };
}

if (require.main === module) {
  const mock: LlmProvider = { name: 'mock', async *stream(request) {
    if (!request.messages.some(m => m.role === 'tool')) {
      yield { type: 'tool_call', toolCall: { id: 'orders', name: 'order_list', args: {} } };
    } else yield { type: 'text', delta: 'Local mock: order lookup completed.' };
    yield { type: 'done', finishReason: 'stop' };
  } };
  const provider = process.env.LLM_MODE === 'mock' ? mock : createOpenAiCompatibleProvider({ name: 'remote',
    baseUrl: process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1', apiKey: process.env.LLM_PROVIDER_TOKEN,
  });
  let keys: Record<string, string[]>;
  try { keys = JSON.parse(process.env.MCP_API_KEYS ?? '{}'); } catch { throw new Error('MCP_API_KEYS must be a JSON object'); }
  const instance = createReferenceServer({ keys, provider, model: process.env.LLM_MODEL ?? 'default' });
  instance.server.listen(Number(process.env.PORT ?? 3000), process.env.HOST ?? '127.0.0.1');
  for (const event of ['SIGINT', 'SIGTERM'] as const) process.once(event, () => { void instance.close(); });
}
