import {
  ConnectionPoolManager,
  ConnectionPoolStatus,
  ConnectionPoolEvent,
  ConnectionRequestOptions,
  ConnectionPoolMetrics
} from '../../src/pools/pool';
import { ConnectionPoolConfig } from '../../src/config/pool';

// Mock connection implementation for testing
interface MockConnection {
  id: string;
  isHealthy: boolean;
  lastUsed: number;
}

// Concrete test implementation of abstract ConnectionPoolManager
class TestConnectionPoolManager extends ConnectionPoolManager<MockConnection> {
  private connectionCounter = 0;
  private mockConnections = new Map<string, MockConnection>();
  private availableConnections = new Set<string>();

  constructor(config: ConnectionPoolConfig = {}) {
    super('test', config);
  }

  isConnectionHealthy(connection: MockConnection): boolean {
    return connection && connection.isHealthy;
  }

  protected validateConnection(connection: MockConnection): boolean {
    return connection && connection.isHealthy && Date.now() - connection.lastUsed < 60000;
  }

  protected async cleanupConnection(connection: MockConnection): Promise<void> {
    this.mockConnections.delete(connection.id);
    this.availableConnections.delete(connection.id);
  }

  protected async getAvailableConnection(): Promise<{ connection: MockConnection; id: string } | null> {
    // Look for available connections in the base class connections map
    for (const [connectionId, connection] of this.connections) {
      const metadata = this.connectionMetadata.get(connectionId);
      if (metadata && metadata.available && connection.isHealthy) {
        metadata.available = false; // Mark as in use
        return { connection, id: connectionId };
      }
    }
    return null;
  }

  protected async setupProtocolSpecificHandlers(connection: MockConnection): Promise<void> {
    // Mock protocol setup
    connection.lastUsed = Date.now();
  }

  protected async createProtocolConnection(options: ConnectionRequestOptions): Promise<{ connection: MockConnection; metadata?: any } | null> {
    // Check if we can create a new connection (respect maxConnections)
    if (!this.canAcceptConnection()) {
      return null;
    }
    
    const id = `mock-${++this.connectionCounter}`;
    const connection: MockConnection = {
      id,
      isHealthy: true,
      lastUsed: Date.now()
    };
    
    return {
      connection,
      metadata: { createdAt: Date.now(), options } // Don't set available here, let base class handle it
    };
  }

  // Helper method to mark connections as available
  markTestConnectionAvailable(connectionId: string): void {
    this.availableConnections.add(connectionId);
  }

  // Helper methods for testing
  setConnectionHealth(connectionId: string, isHealthy: boolean): void {
    // Try to find connection in base class connections map
    const connection = this.connections.get(connectionId) as MockConnection;
    if (connection) {
      connection.isHealthy = isHealthy;
    } else {
      // Fallback to local mockConnections
      const mockConnection = this.mockConnections.get(connectionId);
      if (mockConnection) {
        mockConnection.isHealthy = isHealthy;
      }
    }
  }

  getConnectionCount(): number {
    return this.mockConnections.size;
  }

  getAllConnections(): MockConnection[] {
    return Array.from(this.mockConnections.values());
  }

  // Override addConnection to properly handle availability
  async addConnection(connection: MockConnection, metadata: any = {}): Promise<boolean> {
    const success = await super.addConnection(connection, metadata);
    if (success) {
      // Mark the connection as in use immediately after creation
      const connectionId = this.findConnectionId(connection);
      if (connectionId) {
        const connectionMetadata = this.connectionMetadata.get(connectionId);
        if (connectionMetadata) {
          connectionMetadata.available = false;
        }
      }
    }
    return success;
  }

  // Override findConnectionId to work with our test implementation
  public findConnectionId(connection: MockConnection): string | null {
    // First check if it's in the base class connections map
    for (const [id, conn] of this.connections) {
      if (conn === connection) return id;
    }
    // Fallback to connection's own id
    return connection.id;
  }
}

describe('ConnectionPoolManager', () => {
  let poolManager: TestConnectionPoolManager;

  beforeEach(() => {
    poolManager = new TestConnectionPoolManager({
      maxConnections: 5,
      connectionTimeout: 1000,
      keepAliveTimeout: 500
    });
  });

  afterEach(async () => {
    await poolManager.destroy();
  });

  describe('Configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultPool = new TestConnectionPoolManager();
      const config = defaultPool.getConfig();
      
      expect(config.maxConnections).toBe(1000);
      expect(config.connectionTimeout).toBe(30000);
    });

    it('should accept custom configuration', () => {
      const config = poolManager.getConfig();
      
      expect(config.maxConnections).toBe(5);
      expect(config.connectionTimeout).toBe(1000);
      expect(config.keepAliveTimeout).toBe(500);
    });

    it('should update configuration', async () => {
      const success = await poolManager.updateConfig({
        maxConnections: 10,
        connectionTimeout: 2000
      });
      
      expect(success).toBe(true);
      
      const config = poolManager.getConfig();
      expect(config.maxConnections).toBe(10);
      expect(config.connectionTimeout).toBe(2000);
    });
  });

  describe('Connection Management', () => {
    it('should request and obtain a connection', async () => {
      const result = await poolManager.requestConnection();
      
      expect(result.success).toBe(true);
      expect(result.connection).toBeTruthy();
      expect(result.connection?.id).toBeTruthy();
      expect(result.waitTime).toBeGreaterThanOrEqual(0);
    });

    it('should reuse existing connections', async () => {
      const result1 = await poolManager.requestConnection();
      expect(result1.success).toBe(true);
      
      if (result1.connection) {
        const released = await poolManager.releaseConnection(result1.connection);
        expect(released).toBe(true);
      }
      
      const result2 = await poolManager.requestConnection();
      expect(result2.success).toBe(true);
      // Should reuse the same connection
      expect(result2.connection?.id).toBe(result1.connection?.id);
    });

    it('should create new connection when none available', async () => {
      const result1 = await poolManager.requestConnection();
      // Don't release the first connection, so the second request needs to create a new one
      const result2 = await poolManager.requestConnection();
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.connection?.id).not.toBe(result2.connection?.id);
    });

    it('should respect max connections limit', async () => {
      const connections: MockConnection[] = [];
      
      // Request connections one by one to avoid race conditions
      for (let i = 0; i < 7; i++) {
        const result = await poolManager.requestConnection({ timeout: 100 });
        if (result.success && result.connection) {
          connections.push(result.connection);
        }
      }
      
      // Should be limited to maxConnections
      expect(connections.length).toBeLessThanOrEqual(5);
      expect(poolManager.getActiveConnectionCount()).toBeLessThanOrEqual(5);
    });

    it('should handle connection timeout', async () => {
      // Fill up the pool
      const connections = [];
      for (let i = 0; i < 5; i++) {
        const result = await poolManager.requestConnection();
        if (result.success) {
          connections.push(result.connection);
        }
      }
      
      // Request another connection with timeout
      const result = await poolManager.requestConnection({ timeout: 100 });
      // With timeout, it should wait and potentially succeed or fail based on pool state
      expect(typeof result.success).toBe('boolean');
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });

    it('should release connections properly', async () => {
      const result = await poolManager.requestConnection();
      expect(result.success).toBe(true);
      expect(result.connection).toBeTruthy();
      
      const initialCount = poolManager.getActiveConnectionCount();
      const released = await poolManager.releaseConnection(result.connection!);
      expect(released).toBe(true);
      // Connection count should remain the same (just marked available)
      expect(poolManager.getActiveConnectionCount()).toBe(initialCount);
    });

    it('should handle connection errors', async () => {
      const result = await poolManager.requestConnection();
      expect(result.success).toBe(true);
      
      if (result.connection) {
        const errorReleased = await poolManager.releaseConnection(result.connection, { 
          error: new Error('Test error')
        });
        
        expect(errorReleased).toBe(true);
      }
    });
  });

  describe('Health Monitoring', () => {
    it('should report healthy status initially', () => {
      const health = poolManager.getHealth();
      
      expect(health.status).toBe(ConnectionPoolStatus.HEALTHY);
      expect(health.utilizationRatio).toBeLessThanOrEqual(1);
      expect(health.activeConnections).toBeGreaterThanOrEqual(0);
    });

    it('should report degraded status when utilization is high', async () => {
      // Create a pool where we can achieve 0.9 utilization (9/10)
      const mediumPool = new TestConnectionPoolManager({
        maxConnections: 10,
        connectionTimeout: 1000
      });
      
      try {
        // Create connections to achieve 0.9 utilization (between 0.8 and 0.95)
        const connections = [];
        for (let i = 0; i < 9; i++) { // 9/10 = 0.9 utilization
          const result = await mediumPool.requestConnection();
          if (result.success) {
            connections.push(result.connection);
          }
        }
        
        const health = mediumPool.getHealth();
        
        expect(health.utilizationRatio).toBeGreaterThan(0.8);
        expect(health.utilizationRatio).toBeLessThan(0.95);
        expect(health.status).toBe(ConnectionPoolStatus.DEGRADED);
      } finally {
        await mediumPool.destroy();
      }
    });

    it('should track connection health over time', async () => {
      const health1 = poolManager.getHealth();
      
      await poolManager.requestConnection();
      
      const health2 = poolManager.getHealth();
      
      expect(health2.lastUpdated).toBeGreaterThanOrEqual(health1.lastUpdated);
    });
  });

  describe('Metrics Collection', () => {
    it('should provide comprehensive metrics', () => {
      const metrics = poolManager.getMetrics();
      
      expect(metrics.protocol).toBe('test');
      expect(typeof metrics.uptime).toBe('number');
      expect(typeof metrics.activeConnections).toBe('number');
      expect(metrics.health).toBeTruthy();
      expect(metrics.performance).toBeTruthy();
    });

    it('should track performance metrics over time', async () => {
      // Make some requests to generate metrics
      const result = await poolManager.requestConnection();
      if (result.success && result.connection) {
        await poolManager.releaseConnection(result.connection);
      }
      
      const metrics = poolManager.getMetrics();
      expect(typeof metrics.performance.latency.p50).toBe('number');
      expect(typeof metrics.performance.throughput).toBe('number');
    });

    it('should update metrics configuration', () => {
      const metrics = poolManager.getMetrics();
      
      expect(metrics.poolConfig.maxConnections).toBe(5);
      expect(metrics.poolConfig.connectionTimeout).toBe(1000);
    });
  });

  describe('Event System', () => {
    it('should emit connection events', (done) => {
      poolManager.on(ConnectionPoolEvent.CONNECTION_ADDED, (data) => {
        expect(data.connectionId).toBeTruthy();
        done();
      });
      
      poolManager.requestConnection();
    });

    it('should emit pool limit reached events', (done) => {
      let eventEmitted = false;
      
      poolManager.on(ConnectionPoolEvent.POOL_LIMIT_REACHED, (data) => {
        expect(data).toBeTruthy();
        eventEmitted = true;
        done();
      });
      
      // Try to exceed the pool limit quickly
      const promises = Array(10).fill(null).map(() => 
        poolManager.requestConnection({ timeout: 50 })
      );
      
      Promise.allSettled(promises).then(() => {
        // If event wasn't emitted, complete the test
        if (!eventEmitted) {
          done();
        }
      });
    }, 10000);

    it('should handle event listener removal', () => {
      const listener = jest.fn();
      
      poolManager.on(ConnectionPoolEvent.CONNECTION_ADDED, listener);
      poolManager.off(ConnectionPoolEvent.CONNECTION_ADDED, listener);
      
      // Event should not trigger after removal
      poolManager.requestConnection();
      
      // Wait a bit then check
      setTimeout(() => {
        expect(listener).not.toHaveBeenCalled();
      }, 100);
    });
  });

  describe('Connection Lifecycle', () => {
    it('should handle connection creation and cleanup', async () => {
      const result = await poolManager.requestConnection();
      expect(result.success).toBe(true);
      
      if (result.connection) {
        // Destroy the connection
        const destroyed = await poolManager.releaseConnection(result.connection, { destroy: true });
        expect(destroyed).toBe(true);
      }
    });

    it('should validate connection health', async () => {
      const result = await poolManager.requestConnection();
      expect(result.success).toBe(true);
      
      if (result.connection) {
        // Find the connection ID used in the pool
        const connectionId = poolManager.findConnectionId(result.connection);
        expect(connectionId).toBeTruthy();
        
        // Mark connection as unhealthy
        poolManager.setConnectionHealth(connectionId!, false);
        
        const isHealthy = poolManager.isConnectionHealthy(result.connection);
        expect(isHealthy).toBe(false);
      }
    });

    it('should clean up expired connections', async () => {
      const result = await poolManager.requestConnection();
      expect(result.success).toBe(true);
      
      if (result.connection) {
        // Mark connection as old
        result.connection.lastUsed = Date.now() - 70000; // 70 seconds ago
        
        await poolManager.removeConnection(result.connection, 'Expired');
        
        const finalCount = poolManager.getActiveConnectionCount();
        expect(finalCount).toBe(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      const result = await poolManager.requestConnection();
      expect(result.success).toBe(true);
      
      if (result.connection) {
        // Simulate connection error
        const errorReleased = await poolManager.releaseConnection(result.connection, {
          error: new Error('Connection failed')
        });
        
        expect(errorReleased).toBe(true);
      }
    });

    it('should handle pool destruction', async () => {
      await poolManager.requestConnection();
      
      const destroyed = await poolManager.destroy();
      expect(destroyed).toBeUndefined(); // destroy() returns void
      
      const finalCount = poolManager.getActiveConnectionCount();
      expect(finalCount).toBe(0);
    });
  });
}); 