import { 
  ConnectionPoolConfig,
  PoolConfigHelper
} from '../../src/config/pool';

describe('Pool Configuration', () => {
  describe('PoolConfigHelper.createHttpConfig', () => {
    it('should create HTTP pool configuration with defaults', () => {
      const config = PoolConfigHelper.createHttpConfig();
      
      expect(config.maxConnections).toBe(1000);
      expect(config.connectionTimeout).toBe(30000);
      expect(config.keepAliveTimeout).toBe(5000);
      expect(config.requestTimeout).toBe(30000);
      expect(config.headersTimeout).toBe(10000);
    });

    it('should create HTTP pool configuration with custom options', () => {
      const options = {
        maxConnections: 2000,
        connectionTimeout: 45000,
        keepAliveTimeout: 8000,
        requestTimeout: 40000,
        headersTimeout: 12000
      };

      const config = PoolConfigHelper.createHttpConfig(options);
      
      expect(config.maxConnections).toBe(2000);
      expect(config.connectionTimeout).toBe(45000);
      expect(config.keepAliveTimeout).toBe(8000);
      expect(config.requestTimeout).toBe(40000);
      expect(config.headersTimeout).toBe(12000);
    });
  });

  describe('PoolConfigHelper.createWebSocketConfig', () => {
    it('should create WebSocket pool configuration with defaults', () => {
      const config = PoolConfigHelper.createWebSocketConfig();
      
      expect(config.maxConnections).toBe(1000);
      expect(config.connectionTimeout).toBe(30000);
      expect(config.protocolSpecific?.pingInterval).toBe(30000);
      expect(config.protocolSpecific?.pongTimeout).toBe(5000);
      expect(config.protocolSpecific?.heartbeatInterval).toBe(60000);
    });

    it('should create WebSocket pool configuration with custom options', () => {
      const options = {
        maxConnections: 2000,
        pingInterval: 45000,
        pongTimeout: 8000,
        heartbeatInterval: 90000,
        connectionTimeout: 40000
      };

      const config = PoolConfigHelper.createWebSocketConfig(options);
      
      expect(config.maxConnections).toBe(2000);
      expect(config.connectionTimeout).toBe(40000);
      expect(config.protocolSpecific?.pingInterval).toBe(45000);
      expect(config.protocolSpecific?.pongTimeout).toBe(8000);
      expect(config.protocolSpecific?.heartbeatInterval).toBe(90000);
    });
  });

  describe('PoolConfigHelper.createGrpcConfig', () => {
    it('should create gRPC pool configuration with defaults', () => {
      const config = PoolConfigHelper.createGrpcConfig();
      
      expect(config.maxConnections).toBe(1000);
      expect(config.connectionTimeout).toBe(30000);
      expect(config.requestTimeout).toBe(30000);
      expect(config.protocolSpecific?.maxReceiveMessageLength).toBe(4 * 1024 * 1024);
      expect(config.protocolSpecific?.maxSendMessageLength).toBe(4 * 1024 * 1024);
      expect(config.protocolSpecific?.keepAliveTime).toBe(30000);
    });

    it('should create gRPC pool configuration with custom options', () => {
      const options = {
        maxConnections: 200,
        maxReceiveMessageLength: 8 * 1024 * 1024,
        maxSendMessageLength: 8 * 1024 * 1024,
        keepAliveTime: 60000,
        connectionTimeout: 20000,
        callTimeout: 45000
      };

      const config = PoolConfigHelper.createGrpcConfig(options);
      
      expect(config.maxConnections).toBe(200);
      expect(config.connectionTimeout).toBe(20000);
      expect(config.requestTimeout).toBe(45000);
      expect(config.protocolSpecific?.maxReceiveMessageLength).toBe(8 * 1024 * 1024);
      expect(config.protocolSpecific?.maxSendMessageLength).toBe(8 * 1024 * 1024);
      expect(config.protocolSpecific?.keepAliveTime).toBe(60000);
    });
  });

  describe('PoolConfigHelper.validateConfig', () => {
    it('should validate valid configuration', () => {
      const config: ConnectionPoolConfig = {
        maxConnections: 1000,
        connectionTimeout: 30000,
        requestTimeout: 30000,
        keepAliveTimeout: 5000,
        headersTimeout: 10000
      };

      const result = PoolConfigHelper.validateConfig(config);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid maxConnections', () => {
      const config: ConnectionPoolConfig = {
        maxConnections: 0
      };

      const result = PoolConfigHelper.validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('maxConnections must be positive');
    });

    it('should detect invalid timeout values', () => {
      const config: ConnectionPoolConfig = {
        connectionTimeout: -1,
        requestTimeout: 0,
        keepAliveTimeout: -500,
        headersTimeout: -100
      };

      const result = PoolConfigHelper.validateConfig(config);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('connectionTimeout must be positive');
      expect(result.errors).toContain('requestTimeout must be positive');
      expect(result.errors).toContain('keepAliveTimeout must be positive');
      expect(result.errors).toContain('headersTimeout must be positive');
    });
  });

  describe('PoolConfigHelper.mergeConfigs', () => {
    it('should merge configurations correctly', () => {
      const base: ConnectionPoolConfig = {
        maxConnections: 1000,
        connectionTimeout: 30000,
        keepAliveTimeout: 5000
      };

      const override: Partial<ConnectionPoolConfig> = {
        maxConnections: 2000,
        requestTimeout: 45000
      };

      const merged = PoolConfigHelper.mergeConfigs(base, override);
      
      expect(merged.maxConnections).toBe(2000);
      expect(merged.connectionTimeout).toBe(30000);
      expect(merged.keepAliveTimeout).toBe(5000);
      expect(merged.requestTimeout).toBe(45000);
    });

    it('should handle empty override configuration', () => {
      const base: ConnectionPoolConfig = {
        maxConnections: 1000,
        connectionTimeout: 30000
      };

      const merged = PoolConfigHelper.mergeConfigs(base, {});
      
      // mergeConfigs always creates protocolSpecific object even if empty
      expect(merged).toEqual({
        ...base,
        protocolSpecific: {}
      });
    });
  });

  describe('PoolConfigHelper.createDefaultConfig', () => {
    it('should create default configuration for HTTP', () => {
      const config = PoolConfigHelper.createDefaultConfig('http');
      
      expect(config.maxConnections).toBe(1000);
      expect(config.connectionTimeout).toBe(30000);
      expect(config.keepAliveTimeout).toBe(5000);
      expect(config.requestTimeout).toBe(30000);
      expect(config.headersTimeout).toBe(10000);
    });

    it('should create default configuration for WebSocket', () => {
      const config = PoolConfigHelper.createDefaultConfig('ws');
      
      expect(config.maxConnections).toBe(1000);
      expect(config.connectionTimeout).toBe(30000);
      expect(config.protocolSpecific?.pingInterval).toBe(30000);
      expect(config.protocolSpecific?.pongTimeout).toBe(5000);
      expect(config.protocolSpecific?.heartbeatInterval).toBe(60000);
    });

    it('should create default configuration for gRPC', () => {
      const config = PoolConfigHelper.createDefaultConfig('grpc');
      
      expect(config.maxConnections).toBe(1000);
      expect(config.connectionTimeout).toBe(30000);
      expect(config.requestTimeout).toBe(30000);
      expect(config.protocolSpecific?.maxReceiveMessageLength).toBe(4 * 1024 * 1024);
      expect(config.protocolSpecific?.maxSendMessageLength).toBe(4 * 1024 * 1024);
      expect(config.protocolSpecific?.keepAliveTime).toBe(30000);
    });
  });

  describe('Configuration Type Safety', () => {
    it('should ensure proper TypeScript type checking', () => {
      const config: ConnectionPoolConfig = {
        maxConnections: 1000,
        connectionTimeout: 30000,
        protocolSpecific: {
          pingInterval: 30000,
          maxSessionMemory: 10 * 1024 * 1024
        }
      };

      expect(typeof config.maxConnections).toBe('number');
      expect(typeof config.connectionTimeout).toBe('number');
      expect(typeof config.protocolSpecific?.pingInterval).toBe('number');
      expect(typeof config.protocolSpecific?.maxSessionMemory).toBe('number');
    });

    it('should handle optional properties correctly', () => {
      const minimalConfig: ConnectionPoolConfig = {};
      
      expect(minimalConfig.maxConnections).toBeUndefined();
      expect(minimalConfig.connectionTimeout).toBeUndefined();
      expect(minimalConfig.protocolSpecific).toBeUndefined();
    });
  });
}); 