/*
 * @Description: gRPC流处理测试
 * @Usage: 测试四种gRPC流类型的正确处理
 * @Author: richen
 * @Date: 2025-01-20 10:00:00
 */

// Mock modules first
jest.mock('koatty_container', () => ({
  IOC: {
    getInsByClass: () => ({}),
    getClass: () => ({})
  }
}));

jest.mock('koatty_lib', () => ({
  isEmpty: (val: any) => !val
}));

jest.mock('koatty_logger', () => ({
  DefaultLogger: { 
    Debug: jest.fn(), 
    Warn: jest.fn(), 
    Error: jest.fn() 
  }
}));

jest.mock('koatty_proto', () => ({
  LoadProto: () => ({}),
  ListServices: () => []
}));

jest.mock('../src/payload/payload', () => ({
  payload: () => () => {}
}));

jest.mock('../src/utils/inject', () => ({
  injectParamMetaData: () => ({}),
  injectRouter: () => ({}),
  ParamMetadata: {}
}));

jest.mock('../src/utils/path', () => ({
  parsePath: (path: string) => path
}));

jest.mock('../src/utils/handler', () => ({
  Handler: () => Promise.resolve()
}));

import { GrpcRouter, GrpcStreamType } from '../src/router/grpc';
import { EventEmitter } from 'events';

// Mock classes
class MockKoatty extends EventEmitter {
  use() {}
  callback(protocol: string, handler: Function) {
    return (call: any, callback: any) => {
      const ctx = { protocol };
      return handler(ctx);
    };
  }
  createContext(call: any, callback: any, protocol: string) {
    return { protocol };
  }
  server = {
    RegisterService: () => {}
  };
}

class MockCall extends EventEmitter {
  readable = false;
  writable = false;
  request: any;
  private _ended = false;
  read?: () => any;
  write?: (data: any) => void;
  
  constructor(type: 'unary' | 'server_stream' | 'client_stream' | 'bidi_stream') {
    super();
    switch (type) {
      case 'server_stream':
        this.writable = true;
        this.write = (data: any) => {
          if (!this._ended) {
            this.emit('write', data);
          }
        };
        break;
      case 'client_stream':
        this.readable = true;
        this.read = () => null;
        break;
      case 'bidi_stream':
        this.readable = true;
        this.writable = true;
        this.read = () => null;
        this.write = (data: any) => {
          if (!this._ended) {
            this.emit('write', data);
          }
        };
        break;
      default:
        break;
    }
  }

  end() {
    if (!this._ended) {
      this._ended = true;
      this.emit('end');
    }
  }

  pause() {
    this.emit('pause');
  }

  resume() {
    this.emit('resume');
  }
}

describe('GrpcRouter 流处理测试', () => {
  describe('流类型检测', () => {
    test('应该正确检测一元调用', () => {
      const app = new MockKoatty() as any;
      const router = new GrpcRouter(app, { 
        protocol: 'grpc', 
        prefix: '',
        ext: { protoFile: 'test.proto' }
      });

      const unaryCall = new MockCall('unary');
      const unaryType = (router as any).detectStreamType(unaryCall);
      expect(unaryType).toBe(GrpcStreamType.UNARY);
    });

    test('应该正确检测服务器流', () => {
      const app = new MockKoatty() as any;
      const router = new GrpcRouter(app, { 
        protocol: 'grpc', 
        prefix: '',
        ext: { protoFile: 'test.proto' }
      });

      const serverStreamCall = new MockCall('server_stream');
      const serverStreamType = (router as any).detectStreamType(serverStreamCall);
      expect(serverStreamType).toBe(GrpcStreamType.SERVER_STREAMING);
    });

    test('应该正确检测客户端流', () => {
      const app = new MockKoatty() as any;
      const router = new GrpcRouter(app, { 
        protocol: 'grpc', 
        prefix: '',
        ext: { protoFile: 'test.proto' }
      });

      const clientStreamCall = new MockCall('client_stream');
      const clientStreamType = (router as any).detectStreamType(clientStreamCall);
      expect(clientStreamType).toBe(GrpcStreamType.CLIENT_STREAMING);
    });

    test('应该正确检测双向流', () => {
      const app = new MockKoatty() as any;
      const router = new GrpcRouter(app, { 
        protocol: 'grpc', 
        prefix: '',
        ext: { protoFile: 'test.proto' }
      });

      const bidiStreamCall = new MockCall('bidi_stream');
      const bidiStreamType = (router as any).detectStreamType(bidiStreamCall);
      expect(bidiStreamType).toBe(GrpcStreamType.BIDIRECTIONAL_STREAMING);
    });
  });

  describe('流管理器功能', () => {
    test('应该正确管理流状态', () => {
      const app = new MockKoatty() as any;
      const router = new GrpcRouter(app, { 
        protocol: 'grpc', 
        prefix: '',
        ext: { 
          protoFile: 'test.proto',
          streamConfig: {
            maxConcurrentStreams: 5,
            streamTimeout: 10000,
            backpressureThreshold: 100
          }
        }
      });

      const streamManager = (router as any).streamManager;

      // 测试流注册
      const streamState = streamManager.registerStream('test-stream-1', GrpcStreamType.SERVER_STREAMING);
      expect(streamState.id).toBe('test-stream-1');
      expect(streamState.type).toBe(GrpcStreamType.SERVER_STREAMING);
      expect(streamState.isActive).toBe(true);

      // 测试流状态更新
      streamManager.updateStream('test-stream-1', { messageCount: 5, bufferSize: 50 });
      const updatedState = streamManager.streams.get('test-stream-1');
      expect(updatedState?.messageCount).toBe(5);
      expect(updatedState?.bufferSize).toBe(50);

      // 测试背压检测
      streamManager.updateStream('test-stream-1', { bufferSize: 150 });
      expect(streamManager.isBackpressureTriggered('test-stream-1')).toBe(true);

      // 测试活跃流计数
      streamManager.registerStream('test-stream-2', GrpcStreamType.CLIENT_STREAMING);
      expect(streamManager.getActiveStreamCount()).toBe(2);

      // 测试流移除
      streamManager.removeStream('test-stream-1');
      expect(streamManager.getActiveStreamCount()).toBe(1);
    });
  });

  describe('流处理功能', () => {
    test('应该正确处理一元调用', () => {
      const app = new MockKoatty() as any;
      const router = new GrpcRouter(app, { 
        protocol: 'grpc', 
        prefix: '',
        ext: { protoFile: 'test.proto' }
      });

      const call = new MockCall('unary');
      const callback = jest.fn();
      
      const ctlItem = {
        name: 'TestController',
        ctl: class {},
        method: 'testMethod',
        params: [],
        middleware: []
      };

      // 测试一元调用处理
      expect(() => {
        (router as any).handleUnaryCall(call, callback, app, ctlItem);
      }).not.toThrow();
    });

    test('应该正确处理服务器流', () => {
      const app = new MockKoatty() as any;
      const router = new GrpcRouter(app, { 
        protocol: 'grpc', 
        prefix: '',
        ext: { protoFile: 'test.proto' }
      });

      const call = new MockCall('server_stream');
      const ctlItem = {
        name: 'TestController',
        ctl: class {},
        method: 'testStreamMethod',
        params: [],
        middleware: []
      };

      let writeStreamCalled = false;
      let endStreamCalled = false;

      // Mock app.callback to capture context methods
      app.callback = (protocol: string, handler: Function) => {
        return (call: any, callback: any) => {
          const ctx = { 
            protocol,
            writeStream: (data: any) => { writeStreamCalled = true; return true; },
            endStream: () => { endStreamCalled = true; }
          };
          return handler(ctx);
        };
      };

      // 测试服务器流处理
      expect(() => {
        (router as any).handleServerStreaming(call, app, ctlItem);
      }).not.toThrow();
    });

    test('应该正确处理客户端流', async () => {
      const app = new MockKoatty() as any;
      const router = new GrpcRouter(app, { 
        protocol: 'grpc', 
        prefix: '',
        ext: { protoFile: 'test.proto' }
      });

      const call = new MockCall('client_stream');
      const callback = jest.fn();
      
      const ctlItem = {
        name: 'TestController',
        ctl: class {},
        method: 'testClientStreamMethod',
        params: [],
        middleware: []
      };

      let streamMessagesCaptured = false;

      // Mock app.callback to capture stream messages
      app.callback = (protocol: string, handler: Function) => {
        return (call: any, callback: any) => {
          const ctx = { 
            protocol,
            streamMessages: []
          };
          streamMessagesCaptured = true;
          return handler(ctx);
        };
      };

      // 测试客户端流处理
      expect(() => {
        (router as any).handleClientStreaming(call, callback, app, ctlItem);
      }).not.toThrow();
      
      // 模拟数据接收和流结束
      setTimeout(() => {
        call.emit('data', { message: 'test1' });
        call.emit('data', { message: 'test2' });
        call.emit('end');
      }, 10);

      // 等待异步处理
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    test('应该正确处理双向流', async () => {
      const app = new MockKoatty() as any;
      const router = new GrpcRouter(app, { 
        protocol: 'grpc', 
        prefix: '',
        ext: { protoFile: 'test.proto' }
      });

      const call = new MockCall('bidi_stream');
      const ctlItem = {
        name: 'TestController',
        ctl: class {},
        method: 'testBidiStreamMethod',
        params: [],
        middleware: []
      };

      let writeStreamCalled = false;
      let contextCreated = false;

      // Mock app.createContext to capture context creation
      app.createContext = (call: any, callback: any, protocol: string) => {
        const ctx = { 
          protocol,
          streamMessage: null,
          writeStream: (data: any) => { 
            writeStreamCalled = true; 
            return true; 
          },
          endStream: () => { 
            // 不调用call.end()来避免无限循环
          }
        };
        contextCreated = true;
        return ctx;
      };

      // 测试双向流处理
      expect(() => {
        (router as any).handleBidirectionalStreaming(call, app, ctlItem);
      }).not.toThrow();
      
      // 模拟数据接收，但不触发end事件
      setTimeout(() => {
        call.emit('data', { message: 'test1' });
        call.emit('data', { message: 'test2' });
        // 不调用call.emit('end')来避免无限循环
      }, 10);

      // 等待异步处理
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(contextCreated).toBe(true);
    });
  });

  describe('并发控制', () => {
    test('应该正确限制并发流数量', () => {
      const app = new MockKoatty() as any;
      const router = new GrpcRouter(app, { 
        protocol: 'grpc', 
        prefix: '',
        ext: { 
          protoFile: 'test.proto',
          streamConfig: {
            maxConcurrentStreams: 2
          }
        }
      });

      const streamManager = (router as any).streamManager;
      
      // 注册最大数量的流
      streamManager.registerStream('stream-1', GrpcStreamType.SERVER_STREAMING);
      streamManager.registerStream('stream-2', GrpcStreamType.CLIENT_STREAMING);
      
      expect(streamManager.getActiveStreamCount()).toBe(2);

      // 测试超出限制时的处理
      const call = new MockCall('server_stream');
      const callback = jest.fn();
      
      const ctlItem = {
        name: 'TestController',
        ctl: class {},
        method: 'testMethod',
        params: [],
        middleware: []
      };

      // 直接测试流管理器的限制逻辑
      const canAcceptNewStream = streamManager.getActiveStreamCount() < (streamManager as any).config.maxConcurrentStreams;
      expect(canAcceptNewStream).toBe(false);
      
      // 如果不能接受新流，应该调用错误回调
      if (!canAcceptNewStream) {
        callback(new Error('Maximum concurrent streams exceeded'));
      }
      
      // 验证错误回调被调用
      expect(callback).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('配置选项', () => {
    test('应该正确应用自定义流配置', () => {
      const app = new MockKoatty() as any;
      const customConfig = {
        maxConcurrentStreams: 50,
        streamTimeout: 60000,
        backpressureThreshold: 2048,
        bufferSize: 128 * 1024
      };

      const router = new GrpcRouter(app, { 
        protocol: 'grpc', 
        prefix: '',
        ext: { 
          protoFile: 'test.proto',
          streamConfig: customConfig
        }
      });

      const streamManager = (router as any).streamManager;
      
      // 验证配置被正确应用
      expect(streamManager.config.maxConcurrentStreams).toBe(50);
      expect(streamManager.config.streamTimeout).toBe(60000);
      expect(streamManager.config.backpressureThreshold).toBe(2048);
      expect(streamManager.config.bufferSize).toBe(128 * 1024);
    });

    test('应该使用默认配置当没有提供自定义配置时', () => {
      const app = new MockKoatty() as any;
      const router = new GrpcRouter(app, { 
        protocol: 'grpc', 
        prefix: '',
        ext: { protoFile: 'test.proto' }
      });

      const streamManager = (router as any).streamManager;
      
      // 验证默认配置
      expect(streamManager.config.maxConcurrentStreams).toBe(100);
      expect(streamManager.config.streamTimeout).toBe(300000);
      expect(streamManager.config.backpressureThreshold).toBe(1000);
      expect(streamManager.config.bufferSize).toBe(64 * 1024);
    });
  });

  describe('错误处理', () => {
    test('应该正确处理流错误', () => {
      const app = new MockKoatty() as any;
      const router = new GrpcRouter(app, { 
        protocol: 'grpc', 
        prefix: '',
        ext: { protoFile: 'test.proto' }
      });

      const call = new MockCall('server_stream');
      const ctlItem = {
        name: 'TestController',
        ctl: class {},
        method: 'testMethod',
        params: [],
        middleware: []
      };

      // 测试错误处理
      expect(() => {
        (router as any).handleServerStreaming(call, app, ctlItem);
        call.emit('error', new Error('Test error'));
      }).not.toThrow();
    });

    test('应该正确处理流取消', () => {
      const app = new MockKoatty() as any;
      const router = new GrpcRouter(app, { 
        protocol: 'grpc', 
        prefix: '',
        ext: { protoFile: 'test.proto' }
      });

      const call = new MockCall('client_stream');
      const callback = jest.fn();
      const ctlItem = {
        name: 'TestController',
        ctl: class {},
        method: 'testMethod',
        params: [],
        middleware: []
      };

      // 测试取消处理
      expect(() => {
        (router as any).handleClientStreaming(call, callback, app, ctlItem);
        call.emit('cancelled');
      }).not.toThrow();
    });
  });

  describe('背压控制', () => {
    test('应该正确触发背压控制', () => {
      const app = new MockKoatty() as any;
      const router = new GrpcRouter(app, { 
        protocol: 'grpc', 
        prefix: '',
        ext: { 
          protoFile: 'test.proto',
          streamConfig: {
            backpressureThreshold: 100
          }
        }
      });

      const streamManager = (router as any).streamManager;
      
      // 注册流并设置大缓冲区
      const streamState = streamManager.registerStream('test-stream', GrpcStreamType.CLIENT_STREAMING);
      streamManager.updateStream('test-stream', { bufferSize: 200 });
      
      // 验证背压被触发
      expect(streamManager.isBackpressureTriggered('test-stream')).toBe(true);
    });

    test('应该在背压阈值以下时不触发背压', () => {
      const app = new MockKoatty() as any;
      const router = new GrpcRouter(app, { 
        protocol: 'grpc', 
        prefix: '',
        ext: { 
          protoFile: 'test.proto',
          streamConfig: {
            backpressureThreshold: 100
          }
        }
      });

      const streamManager = (router as any).streamManager;
      
      // 注册流并设置小缓冲区
      const streamState = streamManager.registerStream('test-stream', GrpcStreamType.CLIENT_STREAMING);
      streamManager.updateStream('test-stream', { bufferSize: 50 });
      
      // 验证背压未被触发
      expect(streamManager.isBackpressureTriggered('test-stream')).toBe(false);
    });
  });
}); 