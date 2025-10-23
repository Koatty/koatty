import { Trace } from '../src/trace/trace';
import { Koatty, KoattyContext } from "koatty_core";
import { SpanManager } from '../src/opentelemetry/spanManager';
import { Span } from '@opentelemetry/api';

// Minimal mock for Koatty app with only used properties
const mockTracer = {
  startSpan: jest.fn().mockImplementation((name: string) => ({
    end: jest.fn(),
    setAttribute: jest.fn(),
    setAttributes: jest.fn(),
    addEvent: jest.fn(),
    setStatus: jest.fn(),
    updateName: jest.fn(),
    isRecording: jest.fn().mockReturnValue(true),
    recordException: jest.fn(),
    spanContext: jest.fn().mockReturnValue({
      traceId: 'mock-trace-id',
      spanId: 'mock-span-id',
      traceFlags: 1
    })
  }))
};

const mockApp = {
  name: 'test-app',
  appDebug: true,
  getMetaData: jest.fn().mockImplementation((key: string) => {
    if (key === 'tracer') return [mockTracer];
    if (key === 'spanManager') return [mockSpanManager];
    return [];
  }),
  once: jest.fn(),
  server: { 
    status: 200
  }
} as unknown as Koatty;

// Enhanced mock for IncomingMessage with all methods mocked
const mockIncomingMessage = {
  on: jest.fn().mockImplementation((event, listener) => {
    if (event === 'data') listener(Buffer.from('test'));
    if (event === 'end') listener();
    return this;
  }),
  once: jest.fn(),
  emit: jest.fn(),
  headers: {},
  method: 'GET',
  url: '/test',
  socket: {},
  httpVersion: '1.1',
  httpVersionMajor: 1,
  httpVersionMinor: 1,
  getMetaData: jest.fn().mockReturnValue([{_body: {}}]),
  destroy: jest.fn(),
  setTimeout: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  setEncoding: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  pipe: jest.fn()
} as unknown as any;

// Enhanced mock for ServerResponse
const mockServerResponse = {
  on: jest.fn(),
  once: jest.fn().mockImplementation((event: string, callback: () => void) => {
    if (event === 'finish') {
      callback();
    }
  }),
  emit: jest.fn(),
  setHeader: jest.fn(),
  statusCode: 200,
  statusMessage: 'OK',
  end: jest.fn(),
  writeHead: jest.fn(),
  write: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn()
} as unknown as any;

// Enhanced mock for Koatty context
const createMockContext = (protocol = 'http'): KoattyContext => ({
  protocol,
  status: 200,
  path: '/test',
  headers: {},
  query: {},
  set: jest.fn(),
  setMetaData: jest.fn(),
  getMetaData: jest.fn().mockReturnValue([{
    _body: {
      requestId: 'test-request-id'
    }
  }]),
  rpc: { 
    call: { 
      metadata: { 
        set: jest.fn(),
        get: jest.fn().mockReturnValue(['test-value'])
      },
      sendMetadata: jest.fn(),
      once: jest.fn()
    },
    callback: jest.fn()
  },
  req: {
    ...mockIncomingMessage,
    on: jest.fn()
  },
  res: {
    ...mockServerResponse,
    once: jest.fn().mockImplementation((event, callback) => {
      if (event === 'finish') callback();
    })
  },
  body: '',
  requestId: '',
  get: jest.fn(),
  originalPath: '/test',
  startTime: Date.now()
} as unknown as KoattyContext);

// Mock Span
const mockSpan: Span = {
  end: jest.fn(),
  setAttributes: jest.fn(),
  setAttribute: jest.fn(),
  addEvent: jest.fn(),
  setStatus: jest.fn(),
  updateName: jest.fn(),
  isRecording: jest.fn().mockReturnValue(true),
  recordException: jest.fn(),
  spanContext: jest.fn().mockReturnValue({
    traceId: 'mock-trace-id',
    spanId: 'mock-span-id',
    traceFlags: 1
  })
} as unknown as Span;

// Complete mock for SpanManager with tracer
const mockSpanManager: any = {
  createSpan: jest.fn((tracer: any, ctx: any, serviceName: string) => {
    const span = {
      ...mockSpan,
      setAttribute: jest.fn(),
      setAttributes: jest.fn(),
      addEvent: jest.fn(),
      setStatus: jest.fn(),
      updateName: jest.fn(),
      spanContext: jest.fn().mockReturnValue({
        traceId: `mock-trace-id-${Math.random().toString(36).substring(7)}`,
        spanId: 'mock-span-id',
        traceFlags: 1
      })
    };
    // Store the created span for later verification
    mockSpanManager.getSpan = jest.fn().mockReturnValue(span);
    return span;
  }),
  endSpan: jest.fn().mockImplementation(() => {
    const span = mockSpanManager.getSpan();
    if (span) {
      span.end();
    }
  }),
  getSpan: jest.fn().mockReturnValue(mockSpan),
  setupSpanTimeout: jest.fn().mockImplementation((span: any) => {
    return setTimeout(() => {
      span.end();
    }, 100);
  }),
  injectContext: jest.fn(),
  setBasicAttributes: jest.fn(),
  setSpanAttributes: jest.fn(),
  tracer: {
    startSpan: jest.fn().mockImplementation((name: string) => {
      return {
        ...mockSpan,
        name,
        setAttribute: jest.fn(),
        setAttributes: jest.fn(),
        addEvent: jest.fn(),
        setStatus: jest.fn(),
        updateName: jest.fn(),
        end: jest.fn(),
        isRecording: jest.fn().mockReturnValue(true),
        recordException: jest.fn(),
        spanContext: jest.fn().mockReturnValue({
          traceId: `mock-trace-id-${Math.random().toString(36).substring(7)}`,
          spanId: 'mock-span-id',
          traceFlags: 1
        })
      };
    }),
    getCurrentSpan: jest.fn().mockReturnValue(mockSpan),
    withSpan: jest.fn(),
    bind: jest.fn(),
    getActiveSpan: jest.fn(),
    startActiveSpan: jest.fn()
  },
  getTracer: jest.fn().mockReturnValue({
    startSpan: jest.fn().mockReturnValue(mockSpan)
  }),
  addSpanEvent: jest.fn().mockImplementation((name: string, attributes?: Record<string, any>) => {
    const span = mockSpanManager.getSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  })
} as unknown as SpanManager;

describe('Trace Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create middleware function', () => {
    const middleware = Trace({}, mockApp);
    expect(typeof middleware).toBe('function');
  });

  test('should handle server shutdown', async () => {
    const ctx = createMockContext();
    const app = { ...mockApp, server: { status: 503 } };
    const middleware = Trace({}, app as any);
    await middleware(ctx, jest.fn());
    expect(ctx.status).toBe(503);
    expect(ctx.body).toBe('Server is in the process of shutting down');
  });

  test('should generate request ID', async () => {
    const ctx = createMockContext();
    const middleware = Trace({}, mockApp);
    await middleware(ctx, jest.fn());
    expect(ctx.requestId).toBeDefined();
  });

  test('should handle HTTP protocol', async () => {
    const ctx = createMockContext('http');
    const middleware = Trace({}, mockApp);
    await middleware(ctx, jest.fn());
    expect(ctx.set).toHaveBeenCalled();
  });

  test('should handle gRPC protocol', async () => {
    const ctx = createMockContext('grpc');
    const middleware = Trace({}, mockApp);
    await middleware(ctx, jest.fn());
    expect(ctx.respond).toBe(false);
  });

  test('should handle WebSocket protocol', async () => {
    const ctx = createMockContext('ws');
    const middleware = Trace({}, mockApp);
    await middleware(ctx, jest.fn());
    expect(ctx.respond).toBe(false);
  });

  test('should initialize OpenTelemetry when enabled', () => {
    Trace({ enableTrace: true }, mockApp);
    expect(mockApp.once).toHaveBeenCalled();
  });

  test('should create span when tracing is enabled', async () => {
    const ctx = createMockContext();
    const middleware = Trace({ 
      enableTrace: true,
      samplingRate: 1.0,
      spanTimeout: 5000
    }, mockApp);
    
    // Create a mock next function that will end the span
    const next = jest.fn().mockImplementation(() => {
      mockSpanManager.endSpan();
    });
    
    await middleware(ctx, next);
    
    expect(mockSpanManager.createSpan).toHaveBeenCalledWith(
      mockTracer,
      expect.anything(),
      expect.any(String)
    );
    expect(next).toHaveBeenCalled();
    expect(mockSpan.end).toHaveBeenCalled();
  });

  test('should handle span timeout', (done) => {
    const ctx = createMockContext();
    const middleware = Trace({
      enableTrace: true,
      spanTimeout: 100
    }, mockApp);
    
    middleware(ctx, jest.fn());
    
    setTimeout(() => {
      expect(mockSpan.end).toHaveBeenCalled();
      done();
    }, 200);
  });

  test('should manage multiple active spans', async () => {
    jest.clearAllMocks();
    
    const ctx1 = createMockContext();
    const ctx2 = createMockContext();
    const middleware = Trace({
      enableTrace: true,
      samplingRate: 1.0
    }, mockApp);
    
    // Create separate spans for each context with independent mocks
    const span1 = { 
      ...mockSpan,
      end: jest.fn()
    };
    const span2 = { 
      ...mockSpan,
      end: jest.fn() 
    };
    
    // Mock span creation and store spans for verification
    const spans: Span[] = [];
    mockSpanManager.createSpan
      .mockImplementation((tracer, ctx, serviceName) => {
        const span = ctx === ctx1 ? span1 : span2;
        spans.push(span);
        return span;
      });
    
    // Mock span ending
    mockSpanManager.endSpan.mockImplementation(() => {
      const span = spans.pop();
      if (span) {
        span.end();
      }
    });
    
    await Promise.all([
      middleware(ctx1, () => mockSpanManager.endSpan()),
      middleware(ctx2, () => mockSpanManager.endSpan())
    ]);
    
    // Verify both spans were properly ended
    expect(span1.end).toHaveBeenCalledTimes(1);
    expect(span2.end).toHaveBeenCalledTimes(1);
  });

  test('should enable async hooks when configured', async () => {
    const ctx = createMockContext();
    const wrapEmitterSpy = jest.spyOn(require('../src/trace/wrap'), 'wrapEmitter');
    
    const middleware = Trace({ asyncHooks: true }, mockApp);
    await middleware(ctx, jest.fn());
    
    expect(wrapEmitterSpy).toHaveBeenCalledWith(ctx.req, expect.any(Object));
    expect(wrapEmitterSpy).toHaveBeenCalledWith(ctx.res, expect.any(Object));
  });
});
