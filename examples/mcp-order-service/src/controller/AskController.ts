import type { ContentGuard } from 'koatty_guard';
import type { createSupportAgent } from '../agent/SupportAgent';

export interface AskControllerOptions {
  agent: ReturnType<typeof createSupportAgent>;
  /** koatty_guard content inspection for EXTERNAL content entering the model. */
  content?: ContentGuard;
}

/**
 * `/ask` — SSE endpoint that streams the model answer.
 *
 * Two things matter for the Phase F acceptance gate:
 * 1. the streaming call receives `ctx.signal`, so a client disconnect cancels
 *    the provider request (verified < 1s in `test/regression`);
 * 2. the question is inspected as external content before it reaches the model.
 *
 * Rule-based inspection only catches known patterns; the primary controls stay
 * the tool scopes + human approval of `koatty_mcp`.
 */
export function createAskController(options: AskControllerOptions) {
  return {
    async ask(ctx: any): Promise<void> {
      const question = String(ctx?.request?.body?.question ?? ctx?.body?.question ?? '').trim();
      if (!question) {
        ctx.status = 400;
        ctx.body = { error: 'question is required' };
        return;
      }

      const verdict = options.content?.inspect(question);
      if (verdict && (verdict.decision === 'reject' || verdict.decision === 'flag')) {
        ctx.status = 400;
        ctx.body = { error: 'content_rejected', risk: verdict.risk, decision: verdict.decision };
        return;
      }

      ctx.set?.('Content-Type', 'text/event-stream');
      ctx.set?.('Cache-Control', 'no-cache');
      ctx.set?.('Connection', 'keep-alive');

      if (verdict && verdict.decision === 'downgrade') {
        // The content was flagged but not rejected: continue with the downgraded
        // path (here: tell the client the turn is untrusted).
        ctx.res?.write?.(`event: downgraded\ndata: ${JSON.stringify({ risk: verdict.risk })}\n\n`);
      }

      try {
        for await (const chunk of options.agent.stream(question, { signal: ctx.signal })) {
          if (chunk.type === 'text' && chunk.delta) {
            ctx.res?.write?.(`data: ${JSON.stringify({ delta: chunk.delta })}\n\n`);
          }
        }
        ctx.res?.write?.('event: done\ndata: {}\n\n');
      } catch (error: any) {
        const aborted =
          error?.name === 'AbortError' ||
          error?.name === 'LlmAbortError' ||
          error?.code === 'aborted' ||
          ctx.signal?.aborted === true;
        if (aborted) {
          // The client is gone: nothing useful can be written, but the provider
          // request has already been cancelled by the shared signal.
          return;
        }
        throw error;
      }
    },
  };
}
