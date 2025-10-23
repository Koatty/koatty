/**
 * 
 * @Description: 
 * @Author: richen
 * @Date: 2025-03-31 11:21:01
 * @LastEditTime: 2025-03-31 17:39:07
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
/**
 * 
 * @Description: 
 * @Author: richen
 * @Date: 2025-03-21 22:23:25
 * @LastEditTime: 2025-03-21 22:23:48
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import Koa from 'koa';
import { catcher } from '../src/trace/catcher';
import { createServer, Server } from 'http';
import { SpanManager } from '../src/opentelemetry/spanManager';
import { Koatty } from 'koatty_core';

const mockSpanManager: SpanManager = {
  getSpan: jest.fn(),
  endSpan: jest.fn(),
  addSpanEvent: jest.fn()
} as unknown as SpanManager;

describe('catcher.ts', () => {
  let app: Koa;
  let server: Server;
  const port = 3001;

  beforeEach((done) => {
    app = new Koa() as unknown as Koatty;
    (app as any).getMetaData = jest.fn().mockImplementation((key: string) => {
      if (key === 'spanManager') return [mockSpanManager];
      return [];
    });
    // 创建符合Koa中间件规范的错误处理
    app.use(async (ctx, next) => {
      try {
        await next();
        if (ctx.status === 404) {
          ctx.throw(404, 'Not Found');
        }
      } catch (err) {
        catcher(ctx as any, err, {
          spanManager: mockSpanManager
        });
      }
    });
    server = createServer(app.callback()).listen(port, done);
  });

  afterEach((done) => {
    server.close(done);
  });

  it('should catch sync errors', async () => {
    app.use(() => { throw new Error('sync error') });
    
    const response = await fetch(`http://localhost:${port}`);
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      code: 1,
      message: 'sync error'
    });
  });

  it('should catch async errors', async () => {
    app.use(async () => { 
      await Promise.reject(new Error('async error')) 
    });
    
    const response = await fetch(`http://localhost:${port}`);
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      code: 1,
      message: 'async error'
    });
  });

  it('should handle 404 not found', async () => {
    const response = await fetch(`http://localhost:${port}/not-exist`);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      code: 1,
      message: 'Not Found'
    });
  });
});
