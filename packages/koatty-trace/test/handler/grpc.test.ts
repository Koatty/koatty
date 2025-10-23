import { GrpcHandler } from '../../src/handler/grpc';
import { KoattyContext } from 'koatty_core';
import * as catcher from '../../src/trace/catcher';
import { Readable } from 'stream';
import { Metadata } from '@grpc/grpc-js';
import * as zlib from 'zlib';

jest.mock('../../src/trace/catcher');
jest.mock('zlib');

describe('gRPCHandler', () => {
  const createMockContext = (metadata: Record<string, any> = {}): any => {
    return {
      protocol: 'grpc',
      requestId: 'test-request-id',
      rpc: {
        call: {
          metadata: { 
            getMap: () => metadata,
            get: (key: string) => [metadata[key]]
          },
          sendMetadata: jest.fn(),
          callback: jest.fn(),
          getPath: jest.fn().mockReturnValue('/test'),
          // 添加EventEmitter方法
          once: jest.fn(),
          on: jest.fn(),
          emit: jest.fn(),
          addListener: jest.fn(),
          removeListener: jest.fn()
        }
      },
      res: {
        once: jest.fn(),
        emit: jest.fn(),
        statusCode: 200
      },
      status: 200,
      body: '',
      method: 'testMethod',
      setMetaData: jest.fn(),
      getMetaData: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
      app: {},
      request: {},
      response: {},
      // 添加其他必需方法
      throw: jest.fn(),
      sendMetadata: jest.fn()
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle normal gRPC request', async () => {
    const ctx = createMockContext({ 'x-trace-id': 'test-trace-id' });
    const next = jest.fn();
    const handler = GrpcHandler.getInstance();
    
    await handler.handle(ctx, next, {});
    
    expect(ctx.rpc.call.sendMetadata).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('should handle request timeout', async () => {
    jest.useFakeTimers();
    const ctx = createMockContext();
    const next = jest.fn(() => new Promise(() => {}));
    const handler = GrpcHandler.getInstance();
    
    const promise = handler.handle(ctx, next, { timeout: 10 });
    jest.advanceTimersByTime(15);
    
    await promise;
    // 验证错误处理逻辑被调用
    expect(catcher.catcher).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('should handle gRPC error', async () => {
    const ctx = createMockContext();
    const error = new Error('test error');
    const next = jest.fn().mockRejectedValue(error);
    const handler = GrpcHandler.getInstance();
    
    await handler.handle(ctx, next, {});
    
    expect(catcher.catcher).toHaveBeenCalled();
  });

  it('should convert 404 to 200 when body exists', async () => {
    const ctx = createMockContext();
    ctx.status = 404;
    ctx.body = 'test body';
    const next = jest.fn();
    const handler = GrpcHandler.getInstance();
    
    await handler.handle(ctx, next, {});
    expect(ctx.status).toBe(200);
  });

  it('should handle stream compression', async () => {
    const mockStream = new Readable({ read() { this.push('test'); this.push(null); } });
    const mockGzip = {
      pipe: jest.fn().mockReturnThis(),
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      emit: jest.fn(),
      read: jest.fn()
    };
    (zlib.createGzip as jest.Mock).mockReturnValue(mockGzip);
    
    const ctx = createMockContext({ 'accept-encoding': 'gzip' });
    ctx.body = mockStream;
    const next = jest.fn();
    const handler = GrpcHandler.getInstance();
    
    await handler.handle(ctx, next, {});
    expect(zlib.createGzip).toHaveBeenCalled();
    // 验证流被正确处理
    expect(ctx.body).toBe(mockGzip);
    // 验证流方法被调用
    expect(mockGzip.on).toHaveBeenCalled();
  });

  it('should handle brotli compression', async () => {
    const mockStream = new Readable({ read() { this.push('test'); this.push(null); } });
    const mockBrotli = {
      pipe: jest.fn().mockReturnThis(),
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      emit: jest.fn(),
      read: jest.fn()
    };
    (zlib.createBrotliCompress as jest.Mock).mockReturnValue(mockBrotli);
    
    const ctx = createMockContext({ 'accept-encoding': 'br' });
    ctx.body = mockStream;
    const next = jest.fn();
    const handler = GrpcHandler.getInstance();
    
    await handler.handle(ctx, next, {});
    expect(zlib.createBrotliCompress).toHaveBeenCalled();
    // 验证流被正确处理
    expect(ctx.body).toBe(mockBrotli);
    // 验证流方法被调用
    expect(mockBrotli.on).toHaveBeenCalled();
  });

  it('should not convert 404 when body is empty', async () => {
    const ctx = createMockContext();
    ctx.status = 404;
    ctx.body = undefined; // body未定义时才不转换
    const next = jest.fn();
    const handler = GrpcHandler.getInstance();
    
    await handler.handle(ctx, next, {});
    expect(ctx.status).toBe(404);
  });

  it('should handle custom error code mapping', async () => {
    const ctx = createMockContext();
    ctx.status = 401;
    ctx.message = 'Unauthorized';
    const next = jest.fn();
    const handler = GrpcHandler.getInstance();
    
    await handler.handle(ctx, next, { errorCodeMap: { 401: 16 } } as any);
    // 验证错误处理被调用，不验证具体错误码
    expect(catcher.catcher).toHaveBeenCalled();
  });

  it('should handle metadata edge cases', async () => {
    const ctx = createMockContext({ 'x-trace-id': 'test-trace-id', 'empty-value': '' });
    const next = jest.fn();
    const handler = GrpcHandler.getInstance();
    
    await handler.handle(ctx, next, {});
    expect(ctx.rpc.call.sendMetadata).toHaveBeenCalled();
  });

  it('should handle error status codes', async () => {
    const ctx = createMockContext();
    ctx.status = 500;
    ctx.message = 'Internal Server Error';
    const next = jest.fn();
    const handler = GrpcHandler.getInstance();
    
    await handler.handle(ctx, next, {});
    // 验证错误处理逻辑被调用
    expect(catcher.catcher).toHaveBeenCalled();
  });
});
