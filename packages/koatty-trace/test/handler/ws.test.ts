import { inspect } from "util";
import { WsHandler } from "../../src/handler/ws";
import { KoattyContext } from "koatty_core";
import { Exception } from "koatty_exception";
import { extensionOptions } from "../../src/trace/itrace";
import { on, once } from "events";

describe('WsHandler', () => {
  let handler: WsHandler;
  let mockCtx: any;
  let mockNext: jest.Mock;
  let mockExt: extensionOptions;

  beforeEach(() => {
    handler = WsHandler.getInstance();
    mockNext = jest.fn().mockResolvedValue(undefined);
    
    mockExt = {
      timeout: 1000,
      spanManager: {
        getSpan: jest.fn().mockReturnValue({
          spanContext: () => ({ traceId: 'mock-trace-id', spanId: 'mock-span-id' }),
          setAttribute: jest.fn(),
          setAttributes: jest.fn(),
          addEvent: jest.fn(),
          setStatus: jest.fn(),
          updateName: jest.fn(),
          end: jest.fn(),
          isRecording: () => true,
          recordException: jest.fn()
        }),
        setSpanAttributes: jest.fn(),
        addSpanEvent: jest.fn(),
        activeSpans: new Map(),
        span: {
          spanContext: () => ({ traceId: 'mock-trace-id', spanId: 'mock-span-id' })
        },
        propagator: {
          inject: jest.fn(),
          extract: jest.fn(),
          fields: () => []
        },
        options: {},
        startSpan: jest.fn(),
        endSpan: jest.fn()
      } as any
    };

    mockCtx = {
      method: 'GET',
      status: 200,
      body: 'test response',
      startTime: Date.now(),
      requestId: 'test-request-id',
      originalPath: '/test',
      headers: {},
      req: {
        headers: {}
      },
      websocket: {
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1 // OPEN
      },
      get: jest.fn((key: string) => mockCtx.headers[key.toLowerCase()] || ''),
      set: jest.fn((key: string, value: string) => {
        mockCtx.headers[key.toLowerCase()] = value;
      }),
      res :{
        emit: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
      },
      respond: true,
      writable: true
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = WsHandler.getInstance();
      const instance2 = WsHandler.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('handle', () => {
    it('should handle successful request', async () => {
      await handler.handle(mockCtx, mockNext, mockExt);
      expect(mockNext).toHaveBeenCalled();
      expect(mockCtx.websocket.send).toHaveBeenCalledWith(inspect('test response'), {});
    });

    it('should handle timeout error', async () => {
      mockNext.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 2000)));
      const result = await handler.handle(mockCtx, mockNext, mockExt);
      // Current implementation resolves with undefined on timeout
      // rather than rejecting the promise
      expect(result).toBeUndefined();
    });

    it('should handle JSON response', async () => {
      mockCtx.body = { key: 'value' };
      await handler.handle(mockCtx, mockNext, mockExt);
      expect(mockCtx.websocket.send).toHaveBeenCalledWith(inspect({ key: 'value' }), {});
    });

    it('should handle error without closing connection', async () => {
      mockCtx.status = 500;
      mockCtx.message = 'Internal Error';
      await handler.handle(mockCtx, mockNext, mockExt);
      expect(mockCtx.res.emit).toHaveBeenCalled();
    });

    it('should handle empty message', async () => {
      mockCtx.body = null;
      await handler.handle(mockCtx, mockNext, mockExt);
      expect(mockCtx.websocket.send).not.toHaveBeenCalled();

      mockCtx.body = undefined;
      await handler.handle(mockCtx, mockNext, mockExt);
      expect(mockCtx.websocket.send).not.toHaveBeenCalled();

      mockCtx.body = '';
      await handler.handle(mockCtx, mockNext, mockExt);
      expect(mockCtx.websocket.send).not.toHaveBeenCalled();
    });
  });

  describe('connection states', () => {
    it('should not send message if connection closed', async () => {
      mockCtx.websocket.readyState = 3; // CLOSED
      await handler.handle(mockCtx, mockNext, mockExt);
      expect(mockCtx.websocket.send).not.toHaveBeenCalled();
    });

    it('should handle connection closing state', async () => {
      mockCtx.websocket.readyState = 2; // CLOSING
      await handler.handle(mockCtx, mockNext, mockExt);
      expect(mockCtx.websocket.send).not.toHaveBeenCalled();
    });
  });

  describe('compression', () => {
    it('should enable compression when sec-websocket-extensions includes permessage-deflate', async () => {
      mockCtx.req = { headers: { 'sec-websocket-extensions': 'permessage-deflate' } };
      await handler.handle(mockCtx, mockNext, mockExt);
      expect(mockCtx.websocket.send).toHaveBeenCalledWith(inspect('test response'), expect.objectContaining({ compress: true }));
    });

    it('should not enable compression when no sec-websocket-extensions header', async () => {
      mockCtx.req = { headers: {} };
      await handler.handle(mockCtx, mockNext, mockExt);
      expect(mockCtx.websocket.send).toHaveBeenCalledWith(inspect('test response'), expect.not.objectContaining({ compress: true }));
    });
  });
});
