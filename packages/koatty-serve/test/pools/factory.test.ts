import {
  ConnectionPoolFactory,
  ConnectionPoolManager,
  createConnectionPool,
  getRegisteredProtocols,
  getAllPoolMetrics,
  destroyProtocolPools,
  destroyAllPools,
  ConnectionPoolStatus,
  ConnectionPoolMetrics,
  ConnectionRequestOptions
} from '../../src/pools/factory';
import { ConnectionPoolConfig } from '../../src/config/pool';

// Mock connection pool implementation for testing
class MockConnectionPoolManager extends ConnectionPoolManager<any> {
  private isDestroyed = false;
  
  constructor(config: ConnectionPoolConfig) {
    super('test', config);
  }

  async initialize(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('Pool is destroyed');
    }
  }

  // Required abstract method implementations
  isConnectionHealthy(connection: any): boolean {
    return !this.isDestroyed && connection && connection.id;
  }

  protected validateConnection(connection: any): boolean {
    return !this.isDestroyed && connection && connection.id;
  }

  protected async cleanupConnection(connection: any): Promise<void> {
    // Mock cleanup
  }

  protected async getAvailableConnection(): Promise<{ connection: any; id: string } | null> {
    if (this.isDestroyed) {
      return null;
    }
    return {
      connection: { id: 'mock-connection' },
      id: 'mock-connection-id'
    };
  }

  protected async setupProtocolSpecificHandlers(connection: any): Promise<void> {
    // Mock setup
  }

  protected async createProtocolConnection(options: ConnectionRequestOptions): Promise<{ connection: any; metadata?: any } | null> {
    if (this.isDestroyed) {
      return null;
    }
    return {
      connection: { id: 'mock-connection' },
      metadata: { created: Date.now() }
    };
  }

  async createConnection(): Promise<any> {
    if (this.isDestroyed) {
      throw new Error('Pool is destroyed');
    }
    return { id: 'mock-connection' };
  }

  async releaseConnection(connection: any, options: { destroy?: boolean; error?: Error } = {}): Promise<boolean> {
    return !this.isDestroyed;
  }

  async destroy(): Promise<void> {
    this.isDestroyed = true;
    await super.destroy();
  }

  getMetrics(): ConnectionPoolMetrics {
    return {
      protocol: 'test',
      activeConnections: 3,
      totalConnections: 5,
      connectionsPerSecond: 10,
      averageLatency: 150,
      errorRate: 0.05,
      poolConfig: this.config,
      health: {
        status: ConnectionPoolStatus.HEALTHY,
        utilizationRatio: 0.6,
        activeConnections: 3,
        maxConnections: 5,
        rejectedConnections: 0,
        averageResponseTime: 150,
        errorRate: 0.05,
        message: 'Pool is healthy',
        lastUpdated: Date.now()
      },
      performance: {
        throughput: 100,
        latency: {
          p50: 120,
          p95: 200,
          p99: 250
        },
        memoryUsage: 1024 * 1024,
        cpuUsage: 15
      },
      uptime: Date.now() - this.startTime
    };
  }
}

describe('ConnectionPoolFactory', () => {
  beforeEach(async () => {
    // Clear factory state before each test
    await ConnectionPoolFactory.destroyAll();
    ConnectionPoolFactory.clearInstanceCache();
  });

  afterEach(async () => {
    // Clean up after each test
    await ConnectionPoolFactory.destroyAll();
    ConnectionPoolFactory.clearInstanceCache();
  });

  describe('register', () => {
    it('should register a connection pool implementation', () => {
      ConnectionPoolFactory.register('test', MockConnectionPoolManager);
      expect(ConnectionPoolFactory.isProtocolRegistered('test')).toBe(true);
    });

    it('should handle case-insensitive protocol registration', () => {
      ConnectionPoolFactory.register('TEST', MockConnectionPoolManager);
      expect(ConnectionPoolFactory.isProtocolRegistered('test')).toBe(true);
      expect(ConnectionPoolFactory.isProtocolRegistered('TEST')).toBe(true);
    });
  });

  describe('create', () => {
    beforeEach(() => {
      ConnectionPoolFactory.register('test', MockConnectionPoolManager);
    });

    it('should create a new connection pool instance', () => {
      const config = { maxConnections: 10 };
      const pool = ConnectionPoolFactory.create('test', config);
      
      expect(pool).toBeInstanceOf(MockConnectionPoolManager);
    });

    it('should return the same instance for identical configuration', () => {
      const config = { maxConnections: 10 };
      const pool1 = ConnectionPoolFactory.create('test', config);
      const pool2 = ConnectionPoolFactory.create('test', config);
      
      expect(pool1).toBe(pool2);
    });

    it('should create different instances for different configurations', () => {
      const config1 = { maxConnections: 10 };
      const config2 = { maxConnections: 20 };
      const pool1 = ConnectionPoolFactory.create('test', config1);
      const pool2 = ConnectionPoolFactory.create('test', config2);
      
      expect(pool1).not.toBe(pool2);
    });

    it('should throw error for unregistered protocol', () => {
      expect(() => {
        ConnectionPoolFactory.create('unregistered');
      }).toThrow('No connection pool implementation registered for protocol: unregistered');
    });

    it('should handle empty config', () => {
      const pool = ConnectionPoolFactory.create('test');
      expect(pool).toBeInstanceOf(MockConnectionPoolManager);
    });
  });

  describe('getOrCreate', () => {
    beforeEach(() => {
      ConnectionPoolFactory.register('test', MockConnectionPoolManager);
    });

    it('should get or create connection pool instance', () => {
      const pool1 = ConnectionPoolFactory.getOrCreate('test');
      const pool2 = ConnectionPoolFactory.getOrCreate('test');
      
      expect(pool1).toBe(pool2);
    });
  });

  describe('destroy', () => {
    beforeEach(async () => {
      // Ensure clean state
      await ConnectionPoolFactory.destroyAll();
      ConnectionPoolFactory.clearInstanceCache();
      ConnectionPoolFactory.register('test', MockConnectionPoolManager);
      ConnectionPoolFactory.register('test2', MockConnectionPoolManager);
    });

    it('should destroy instances of specified protocol', async () => {
      ConnectionPoolFactory.create('test', { maxConnections: 10 });
      ConnectionPoolFactory.create('test', { maxConnections: 20 });
      ConnectionPoolFactory.create('test2', { maxConnections: 30 });
      
      expect(ConnectionPoolFactory.getInstanceCount('test')).toBe(2);
      expect(ConnectionPoolFactory.getInstanceCount('test2')).toBe(1);
      
      await ConnectionPoolFactory.destroy('test');
      
      expect(ConnectionPoolFactory.getInstanceCount('test')).toBe(0);
      expect(ConnectionPoolFactory.getInstanceCount('test2')).toBe(1);
    });
  });

  describe('destroyAll', () => {
    beforeEach(() => {
      ConnectionPoolFactory.register('test1', MockConnectionPoolManager);
      ConnectionPoolFactory.register('test2', MockConnectionPoolManager);
    });

    it('should destroy all connection pool instances', async () => {
      ConnectionPoolFactory.create('test1');
      ConnectionPoolFactory.create('test2');
      
      expect(ConnectionPoolFactory.getInstanceCount()).toBe(2);
      
      await ConnectionPoolFactory.destroyAll();
      
      expect(ConnectionPoolFactory.getInstanceCount()).toBe(0);
    });
  });

  describe('getAllMetrics', () => {
    beforeEach(async () => {
      // Ensure clean state
      await ConnectionPoolFactory.destroyAll();
      ConnectionPoolFactory.clearInstanceCache();
      ConnectionPoolFactory.register('test', MockConnectionPoolManager);
    });

    it('should return metrics for all instances', () => {
      ConnectionPoolFactory.create('test', { maxConnections: 10 });
      ConnectionPoolFactory.create('test', { maxConnections: 20 });
      
      const metrics = ConnectionPoolFactory.getAllMetrics();
      
      expect(Object.keys(metrics)).toHaveLength(2);
      Object.values(metrics).forEach(metric => {
        expect(metric).toHaveProperty('totalConnections');
        expect(metric).toHaveProperty('activeConnections');
        expect(metric).toHaveProperty('health');
        expect(metric.health).toHaveProperty('status');
      });
    });

    it('should return empty object when no instances exist', () => {
      const metrics = ConnectionPoolFactory.getAllMetrics();
      expect(metrics).toEqual({});
    });
  });

  describe('getRegisteredProtocols', () => {
    it('should return list of registered protocols', () => {
      ConnectionPoolFactory.register('test1', MockConnectionPoolManager);
      ConnectionPoolFactory.register('test2', MockConnectionPoolManager);
      
      const protocols = ConnectionPoolFactory.getRegisteredProtocols();
      expect(protocols).toContain('test1');
      expect(protocols).toContain('test2');
    });

    it('should include pre-registered protocols', () => {
      const protocols = ConnectionPoolFactory.getRegisteredProtocols();
      expect(protocols).toContain('http');
      expect(protocols).toContain('grpc');
      expect(protocols).toContain('ws');
    });
  });

  describe('isProtocolRegistered', () => {
    it('should return true for registered protocols', () => {
      ConnectionPoolFactory.register('test', MockConnectionPoolManager);
      expect(ConnectionPoolFactory.isProtocolRegistered('test')).toBe(true);
    });

    it('should return false for unregistered protocols', () => {
      expect(ConnectionPoolFactory.isProtocolRegistered('unregistered')).toBe(false);
    });

    it('should handle case-insensitive checks', () => {
      ConnectionPoolFactory.register('Test', MockConnectionPoolManager);
      expect(ConnectionPoolFactory.isProtocolRegistered('test')).toBe(true);
      expect(ConnectionPoolFactory.isProtocolRegistered('TEST')).toBe(true);
    });
  });

  describe('getInstanceCount', () => {
    beforeEach(() => {
      ConnectionPoolFactory.register('test1', MockConnectionPoolManager);
      ConnectionPoolFactory.register('test2', MockConnectionPoolManager);
    });

    it('should return total instance count when no protocol specified', () => {
      ConnectionPoolFactory.create('test1');
      ConnectionPoolFactory.create('test2');
      
      expect(ConnectionPoolFactory.getInstanceCount()).toBe(2);
    });

    it('should return instance count for specific protocol', () => {
      ConnectionPoolFactory.create('test1', { maxConnections: 10 });
      ConnectionPoolFactory.create('test1', { maxConnections: 20 });
      ConnectionPoolFactory.create('test2');
      
      expect(ConnectionPoolFactory.getInstanceCount('test1')).toBe(2);
      expect(ConnectionPoolFactory.getInstanceCount('test2')).toBe(1);
    });

    it('should return 0 for non-existent protocol', () => {
      expect(ConnectionPoolFactory.getInstanceCount('nonexistent')).toBe(0);
    });
  });

  describe('clearInstanceCache', () => {
    beforeEach(() => {
      ConnectionPoolFactory.register('test', MockConnectionPoolManager);
    });

    it('should clear instance cache without destroying instances', () => {
      ConnectionPoolFactory.create('test');
      expect(ConnectionPoolFactory.getInstanceCount()).toBe(1);
      
      ConnectionPoolFactory.clearInstanceCache();
      expect(ConnectionPoolFactory.getInstanceCount()).toBe(0);
    });
  });
});

describe('Helper functions', () => {
  beforeEach(() => {
    ConnectionPoolFactory.register('test', MockConnectionPoolManager);
  });

  afterEach(async () => {
    await destroyAllPools();
  });

  describe('createConnectionPool', () => {
    it('should create connection pool using helper function', () => {
      const pool = createConnectionPool('test', { maxConnections: 10 });
      expect(pool).toBeInstanceOf(MockConnectionPoolManager);
    });
  });

  describe('getRegisteredProtocols', () => {
    it('should return registered protocols using helper function', () => {
      const protocols = getRegisteredProtocols();
      expect(protocols).toContain('test');
    });
  });

  describe('getAllPoolMetrics', () => {
    it('should return all pool metrics using helper function', () => {
      createConnectionPool('test');
      const metrics = getAllPoolMetrics();
      expect(Object.keys(metrics)).toHaveLength(1);
    });
  });

  describe('destroyProtocolPools', () => {
    it('should destroy protocol pools using helper function', async () => {
      createConnectionPool('test');
      expect(ConnectionPoolFactory.getInstanceCount('test')).toBe(1);
      
      await destroyProtocolPools('test');
      expect(ConnectionPoolFactory.getInstanceCount('test')).toBe(0);
    });
  });

  describe('destroyAllPools', () => {
    it('should destroy all pools using helper function', async () => {
      createConnectionPool('test');
      expect(ConnectionPoolFactory.getInstanceCount()).toBe(1);
      
      await destroyAllPools();
      expect(ConnectionPoolFactory.getInstanceCount()).toBe(0);
    });
  });
}); 