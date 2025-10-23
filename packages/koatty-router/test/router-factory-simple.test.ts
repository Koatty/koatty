/*
 * @Description: Simple Router Factory Tests
 * @Usage: Test router factory basic functionality
 * @Author: richen
 * @Date: 2025-01-20 10:00:00
 * @LastEditTime: 2025-01-20 10:00:00
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { RouterFactory, RouterFactoryBuilder } from '../src/router/factory';

// Mock koatty_logger
jest.mock('koatty_logger', () => ({
  DefaultLogger: {
    Error: jest.fn(),
    Debug: jest.fn(),
    Warn: jest.fn()
  }
}));

// Mock koatty_core
jest.mock('koatty_core', () => ({
  Helper: {
    isFunction: jest.fn((val) => typeof val === 'function'),
    isObject: jest.fn((val) => val && typeof val === 'object')
  }
}));

describe('Router Factory Simple Tests', () => {
  let factory: RouterFactory;
  let mockApp: any;

  beforeEach(() => {
    factory = RouterFactory.getInstance();
    mockApp = {
      use: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      callback: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('RouterFactory Singleton', () => {
    it('should return singleton instance', () => {
      const instance1 = RouterFactory.getInstance();
      const instance2 = RouterFactory.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should get supported protocols', () => {
      const protocols = factory.getSupportedProtocols();
      expect(Array.isArray(protocols)).toBe(true);
      expect(protocols.length).toBeGreaterThan(0);
    });

    it('should check if protocol is supported', () => {
      expect(factory.isSupported('http')).toBe(true);
      expect(factory.isSupported('https')).toBe(true);
      expect(factory.isSupported('invalid-protocol')).toBe(false);
    });

    it('should get router class for supported protocol', () => {
      const httpRouterClass = factory.getRouterClass('http');
      expect(httpRouterClass).toBeDefined();
    });

    it('should return undefined for unsupported protocol', () => {
      const invalidRouterClass = factory.getRouterClass('invalid');
      expect(invalidRouterClass).toBeUndefined();
    });
  });

  describe('RouterFactory Registration', () => {
    it('should register custom router', () => {
      class CustomRouter {
        constructor(app: any, options?: any) {}
      }

      expect(() => {
        factory.register('custom', CustomRouter as any);
      }).not.toThrow();

      expect(factory.isSupported('custom')).toBe(true);
    });

    it('should unregister router', () => {
      class TempRouter {
        constructor(app: any, options?: any) {}
      }

      factory.register('temp', TempRouter as any);
      expect(factory.isSupported('temp')).toBe(true);

      const result = factory.unregister('temp');
      expect(result).toBe(true);
      expect(factory.isSupported('temp')).toBe(false);
    });

    it('should return false when unregistering non-existent router', () => {
      const result = factory.unregister('non-existent');
      expect(result).toBe(false);
    });

    it('should handle registration errors gracefully', () => {
      expect(() => {
        factory.register('', null as any);
      }).toThrow();

      expect(() => {
        factory.register('test', null as any);
      }).toThrow();
    });
  });

  describe('RouterFactory Builder', () => {
    it('should create builder instance', () => {
      const builder = new RouterFactoryBuilder();
      expect(builder).toBeDefined();
    });

    it('should add custom router through builder', () => {
      class BuilderRouter {
        constructor(app: any, options?: any) {}
      }

      const builder = new RouterFactoryBuilder();
      const result = builder.addRouter('builder-test', BuilderRouter as any);
      expect(result).toBe(builder); // Should return this for chaining
    });

    it('should exclude default router through builder', () => {
      const builder = new RouterFactoryBuilder();
      const result = builder.excludeDefault('http');
      expect(result).toBe(builder); // Should return this for chaining
    });

    it('should build factory with custom configuration', () => {
      class CustomBuilderRouter {
        constructor(app: any, options?: any) {}
      }

      const builder = new RouterFactoryBuilder();
      const customFactory = builder
        .addRouter('custom-build', CustomBuilderRouter as any)
        .excludeDefault('ws')
        .build();

      expect(customFactory).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid protocol in create method', () => {
      expect(() => {
        factory.create('invalid-protocol', mockApp, { prefix: '/api' });
      }).toThrow();
    });

    it('should handle clear operation', () => {
      expect(() => {
        factory.clear();
      }).not.toThrow();

      // After clear, should have no protocols
      const protocols = factory.getSupportedProtocols();
      expect(protocols.length).toBe(0);
    });

    it('should handle reset operation', () => {
      factory.clear();
      expect(factory.getSupportedProtocols().length).toBe(0);

      factory.reset();
      const protocols = factory.getSupportedProtocols();
      expect(protocols.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle protocol case insensitivity', () => {
      expect(factory.isSupported('HTTP')).toBe(true);
      expect(factory.isSupported('Http')).toBe(true);
      expect(factory.isSupported('hTTp')).toBe(true);
    });

    it('should handle empty protocol string', () => {
      expect(factory.isSupported('')).toBe(false);
    });

    it('should handle whitespace in protocol', () => {
      expect(factory.isSupported(' http ')).toBe(false);
    });

    it('should maintain state after multiple operations', () => {
      const initialProtocols = factory.getSupportedProtocols();
      
      class TestRouter1 {
        constructor(app: any, options?: any) {}
      }
      class TestRouter2 {
        constructor(app: any, options?: any) {}
      }

      factory.register('test1', TestRouter1 as any);
      factory.register('test2', TestRouter2 as any);
      
      expect(factory.getSupportedProtocols().length).toBe(initialProtocols.length + 2);
      
      factory.unregister('test1');
      expect(factory.getSupportedProtocols().length).toBe(initialProtocols.length + 1);
      
      factory.unregister('test2');
      expect(factory.getSupportedProtocols().length).toBe(initialProtocols.length);
    });
  });
}); 