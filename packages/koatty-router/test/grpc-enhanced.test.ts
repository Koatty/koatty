/*
 * @Description: gRPC路由器增强测试
 * @Usage: 测试gRPC路由器的连接池、批处理、流管理等功能
 * @Author: richen
 * @Date: 2025-01-20 10:00:00
 */

// Mock modules first
jest.mock('koatty_container', () => ({
  IOC: {
    getInsByClass: jest.fn(),
    getClass: jest.fn()
  }
}));

jest.mock('koatty_lib', () => ({
  isEmpty: jest.fn()
}));

jest.mock('koatty_logger', () => ({
  DefaultLogger: { 
    Debug: jest.fn(), 
    Warn: jest.fn(), 
    Error: jest.fn() 
  }
}));

jest.mock('koatty_proto', () => ({
  LoadProto: jest.fn(),
  ListServices: jest.fn()
}));

jest.mock('../src/payload/payload', () => ({
  payload: jest.fn(() => () => {})
}));

jest.mock('../src/utils/inject', () => ({
  injectParamMetaData: jest.fn(),
  injectRouter: jest.fn(),
  ParamMetadata: {}
}));

jest.mock('../src/utils/path', () => ({
  parsePath: jest.fn((path: string) => path)
}));

jest.mock('../src/utils/handler', () => ({
  Handler: jest.fn()
}));

jest.mock('../src/router/types', () => ({
  getProtocolConfig: jest.fn(),
  validateProtocolConfig: jest.fn(() => ({
    valid: true,
    errors: [],
    warnings: []
  }))
}));

import { GrpcRouter, GrpcStreamType } from '../src/router/grpc';
import { IOC } from 'koatty_container';
import { DefaultLogger as Logger } from 'koatty_logger';
import { LoadProto, ListServices } from 'koatty_proto';
import { payload } from '../src/payload/payload';
import { injectParamMetaData, injectRouter } from '../src/utils/inject';
import { Handler } from '../src/utils/handler';
import { getProtocolConfig } from '../src/router/types';
import { EventEmitter } from 'events';

// Mock classes
class MockKoatty extends EventEmitter {
  use = jest.fn();
  callback = jest.fn();
  server = {
    RegisterService: jest.fn()
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

describe('GrpcRouter 增强测试', () => {
  let mockApp: any;

  beforeEach(() => {
    mockApp = {
      use: jest.fn(),
      server: {
        RegisterService: jest.fn()
      }
    };
    jest.clearAllMocks();
  });

  test('应该使用默认配置创建gRPC路由器', () => {
    const { getProtocolConfig } = require('../src/router/types');
    const { payload } = require('../src/payload/payload');
    
    getProtocolConfig.mockReturnValue({ 
      protoFile: 'test.proto',
      poolSize: 10,
      batchSize: 10,
      streamConfig: {}
    });

    const router = new GrpcRouter(mockApp, {
      protocol: 'grpc',
      prefix: '',
      ext: { protoFile: 'test.proto' }
    });

    expect(router.protocol).toBe('grpc');
    expect(router.options.protocol).toBe('grpc');
    expect(router.options.prefix).toBe('');
    expect(router.options.protoFile).toBe('test.proto');
    // 构造函数不会调用 app.use，LoadRouter 才会调用
  });

  test('应该正确设置和获取路由', () => {
    const { getProtocolConfig } = require('../src/router/types');
    const { payload } = require('../src/payload/payload');
    
    getProtocolConfig.mockReturnValue({ protoFile: 'test.proto' });
    payload.mockReturnValue(() => {});

    const router = new GrpcRouter(mockApp, {
      protocol: 'grpc',
      prefix: '',
      ext: { protoFile: 'test.proto' }
    });
    const mockImplementation = {
      implementation: { ping: jest.fn() }
    };

    router.SetRouter('TestService.Ping', mockImplementation);

    expect(router.ListRouter().get('TestService.Ping')).toEqual(mockImplementation);
    expect(router.ListRouter().size).toBe(1);
  });

  test('应该正确检测流类型', () => {
    const { getProtocolConfig } = require('../src/router/types');
    const { payload } = require('../src/payload/payload');
    
    getProtocolConfig.mockReturnValue({ protoFile: 'test.proto' });
    payload.mockReturnValue(() => {});

    const router = new GrpcRouter(mockApp, {
      protocol: 'grpc',
      prefix: '',
      ext: { protoFile: 'test.proto' }
    });

    // 测试一元调用
    const unaryCall = { readable: false, writable: false };
    expect((router as any).detectStreamType(unaryCall)).toBe(GrpcStreamType.UNARY);

    // 测试服务器流
    const serverStreamCall = { readable: false, writable: true };
    expect((router as any).detectStreamType(serverStreamCall)).toBe(GrpcStreamType.SERVER_STREAMING);

    // 测试客户端流
    const clientStreamCall = { readable: true, writable: false };
    expect((router as any).detectStreamType(clientStreamCall)).toBe(GrpcStreamType.CLIENT_STREAMING);

    // 测试双向流
    const bidiStreamCall = { readable: true, writable: true };
    expect((router as any).detectStreamType(bidiStreamCall)).toBe(GrpcStreamType.BIDIRECTIONAL_STREAMING);
  });

  test('应该正确管理连接池', () => {
    const { getProtocolConfig } = require('../src/router/types');
    const { payload } = require('../src/payload/payload');
    
    getProtocolConfig.mockReturnValue({ 
      protoFile: 'test.proto',
      poolSize: 5
    });
    payload.mockReturnValue(() => {});

    const router = new GrpcRouter(mockApp, {
      protocol: 'grpc',
      prefix: '',
      ext: { protoFile: 'test.proto' }
    });
    const connectionPool = (router as any).connectionPool;
    
    // 测试获取连接（池为空时会自动创建）
    const autoCreatedConn = connectionPool.get('TestService');
    expect(autoCreatedConn).toBeDefined();
    expect(autoCreatedConn).toHaveProperty('serviceName', 'TestService');

    // 测试释放连接
    const mockConnection = { id: 'conn1' };
    connectionPool.release('TestService2', mockConnection);

    // 测试从池中获取连接
    expect(connectionPool.get('TestService2')).toBe(mockConnection);

    // 再次获取会创建新连接（因为池已空）
    const newConn = connectionPool.get('TestService2');
    expect(newConn).toBeDefined();
  });

  test('应该正确管理流状态', () => {
    const { getProtocolConfig } = require('../src/router/types');
    const { payload } = require('../src/payload/payload');
    
    getProtocolConfig.mockReturnValue({ 
      protoFile: 'test.proto',
      streamConfig: {
        maxConcurrentStreams: 5,
        streamTimeout: 10000,
        backpressureThreshold: 100
      }
    });
    payload.mockReturnValue(() => {});

    const router = new GrpcRouter(mockApp, {
      protocol: 'grpc',
      prefix: '',
      ext: { protoFile: 'test.proto' }
    });
    const streamManager = (router as any).streamManager;

    // 注册流
    const streamState = streamManager.registerStream('test-stream-1', GrpcStreamType.SERVER_STREAMING);
    
    expect(streamState.id).toBe('test-stream-1');
    expect(streamState.type).toBe(GrpcStreamType.SERVER_STREAMING);
    expect(streamState.isActive).toBe(true);

    // 更新流状态
    streamManager.updateStream('test-stream-1', { messageCount: 5 });
    
    const updatedState = streamManager.streams.get('test-stream-1');
    expect(updatedState?.messageCount).toBe(5);

    // 移除流
    streamManager.removeStream('test-stream-1');
    expect(streamManager.streams.has('test-stream-1')).toBe(false);
  });

  test('应该处理LoadRouter错误', async () => {
    const { getProtocolConfig } = require('../src/router/types');
    const { payload } = require('../src/payload/payload');
    const { LoadProto } = require('koatty_proto');
    const { DefaultLogger } = require('koatty_logger');
    
    getProtocolConfig.mockReturnValue({ protoFile: 'test.proto' });
    payload.mockReturnValue(() => {});

    const router = new GrpcRouter(mockApp, {
      protocol: 'grpc',
      prefix: '',
      ext: { protoFile: 'test.proto' }
    });
    const error = new Error('Proto load failed');
    LoadProto.mockImplementation(() => {
      throw error;
    });

    await router.LoadRouter(mockApp, ['TestController']);

    expect(DefaultLogger.Error).toHaveBeenCalledWith(error);
  });
}); 