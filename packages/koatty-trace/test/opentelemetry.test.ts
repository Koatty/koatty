/**
 * @Description: Test cases for opentelemetry module
 * @Author: richen
 * @Date: 2025-04-01 11:00:00
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { diag, trace } from '@opentelemetry/api';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { initSDK, startTracer } from '../src/opentelemetry/sdk';
import { Koatty } from 'koatty_core';

jest.mock('@opentelemetry/sdk-node');
jest.mock('@opentelemetry/exporter-trace-otlp-http');
jest.mock('@opentelemetry/api');
jest.mock('@opentelemetry/sdk-trace-base');
jest.mock('koatty_logger', () => ({
  DefaultLogger: {
    getLevel: jest.fn().mockReturnValue('info'),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  },
  Logger: jest.fn().mockImplementation(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }))
}));

describe('opentelemetry.ts', () => {
  const mockApp = {
    name: 'testApp',
    version: '1.0.0',
    env: 'test',
    on: jest.fn(),
    off: jest.fn(),
    getMetaData: jest.fn()
  } as unknown as Koatty;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize OpenTelemetry SDK with default options', () => {
    const options = {
      opentelemetryConf: {
        endpoint: 'http://localhost:4318/v1/traces'
      },
      enableTrace: true
    };

    const sdk = initSDK(mockApp, options);
    
    expect(NodeSDK).toHaveBeenCalled();
    expect(OTLPTraceExporter).toHaveBeenCalledWith({
      url: 'http://localhost:4318/v1/traces',
      headers: {},
      timeoutMillis: 10000,
      maxRetries: 3,
      retryDelay: 1000
    });
    expect(sdk).toBeInstanceOf(NodeSDK);
  });

  it('should initialize OpenTelemetry SDK with custom options', () => {
    const options = {
      opentelemetryConf: {
        endpoint: 'http://custom-endpoint:4318/v1/traces',
        headers: { 'x-api-key': 'test-key' },
        timeout: 5000,
        resourceAttributes: { 'custom.attribute': 'value' },
        maxActiveSpans: 500
      },
      enableTrace: true
    };

    const sdk = initSDK(mockApp, options);
    
    expect(NodeSDK).toHaveBeenCalled();
    expect(OTLPTraceExporter).toHaveBeenCalledWith({
      url: 'http://custom-endpoint:4318/v1/traces',
      headers: { 'x-api-key': 'test-key' },
      timeoutMillis: 5000,
      maxRetries: 3,
      retryDelay: 1000
    });
    expect(sdk).toBeInstanceOf(NodeSDK);
  });

  it('should throw error when OTLP endpoint is missing', () => {
    const options = {
      enableTrace: true,
      opentelemetryConf: {}
    };

    expect(() => initSDK(mockApp, options)).toThrow('OTLP endpoint is required');
  });

  it('should start tracer successfully', async () => {
    const mockSdk = {
      start: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined)
    };
    const options = {
      enableTrace: true
    };

    await startTracer(mockSdk as unknown as NodeSDK, mockApp, options);
    
    expect(mockSdk.start).toHaveBeenCalled();
    expect(mockApp.on).toHaveBeenCalledWith('appStop', expect.any(Function));
  });

  it('should handle tracer start failure and fallback to no-op', async () => {
    const mockSdk = {
      start: jest.fn().mockRejectedValue(new Error('Start failed')),
      shutdown: jest.fn().mockResolvedValue(undefined)
    };
    const options = {
      enableTrace: true
    };

    await startTracer(mockSdk as unknown as NodeSDK, mockApp, options);
    
    expect(mockSdk.start).toHaveBeenCalled();
    expect(trace.setGlobalTracerProvider).toHaveBeenCalledWith(expect.any(BasicTracerProvider));
  });

  it('should shutdown tracer on app stop', async () => {
    const mockSdk = {
      start: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined)
    };
    const options = {
      enableTrace: true
    };

    await startTracer(mockSdk as unknown as NodeSDK, mockApp, options);
    
    // Get the shutdown handler
    const shutdownHandler = (<any>mockApp.on).mock.calls[0][1];
    await shutdownHandler();
    
    expect(mockSdk.shutdown).toHaveBeenCalled();
    expect(mockApp.off).toHaveBeenCalledWith('appStop', shutdownHandler);
  });
});
