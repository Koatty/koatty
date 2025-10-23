/*
 * @Description: 连接池工厂
 * @Usage: 根据协议自动创建对应的连接池实现
 * @Author: richen
 * @Date: 2024-11-27 22:30:00
 * @LastEditTime: 2024-11-27 22:30:00
 */

import { ConnectionPoolManager, ConnectionPoolMetrics } from './pool';

/**
 * 连接池工厂 - 根据协议自动创建对应的连接池实现
 */
export class ConnectionPoolFactory {
  private static instances = new Map<string, ConnectionPoolManager>();
  private static registered = new Map<string, new (config: ConnectionPoolConfig) => ConnectionPoolManager>();

  /**
   * 注册协议的连接池实现
   */
  static register<T extends ConnectionPoolManager>(
    protocol: string, 
    implementation: new (config: ConnectionPoolConfig) => T
  ): void {
    this.registered.set(protocol.toLowerCase(), implementation);
  }

  /**
   * 根据协议创建连接池实例
   */
  static create(protocol: string, config: ConnectionPoolConfig = {}): ConnectionPoolManager {
    const key = `${protocol.toLowerCase()}_${JSON.stringify(config)}`;
    
    // 如果已存在实例，直接返回
    if (this.instances.has(key)) {
      return this.instances.get(key)!;
    }

    // 获取对应的实现类
    const Implementation = this.registered.get(protocol.toLowerCase());
    if (!Implementation) {
      throw new Error(`No connection pool implementation registered for protocol: ${protocol}`);
    }

    // 创建新实例
    const instance = new Implementation(config);
    this.instances.set(key, instance);
    
    return instance;
  }

  /**
   * 获取或创建连接池实例
   */
  static getOrCreate(protocol: string, config: ConnectionPoolConfig = {}): ConnectionPoolManager {
    return this.create(protocol, config);
  }

  /**
   * 销毁指定协议的连接池
   */
  static async destroy(protocol: string): Promise<void> {
    const protocolPrefix = `${protocol.toLowerCase()}_`;
    const toDestroy = Array.from(this.instances.entries())
      .filter(([key]) => key.startsWith(protocolPrefix))
      .map(([key, instance]) => ({ key, instance }));

    await Promise.all(
      toDestroy.map(async ({ key, instance }) => {
        await instance.destroy();
        this.instances.delete(key);
      })
    );
  }

  /**
   * 销毁所有连接池实例
   */
  static async destroyAll(): Promise<void> {
    const instances = Array.from(this.instances.values());
    this.instances.clear();
    
    await Promise.all(instances.map(instance => instance.destroy()));
  }

  /**
   * 获取所有连接池的统计信息
   */
  static getAllMetrics(): Record<string, ConnectionPoolMetrics> {
    const metrics: Record<string, ConnectionPoolMetrics> = {};
    
    this.instances.forEach((instance, key) => {
      metrics[key] = instance.getMetrics();
    });
    
    return metrics;
  }

  /**
   * 获取已注册的协议列表
   */
  static getRegisteredProtocols(): string[] {
    return Array.from(this.registered.keys());
  }

  /**
   * 检查协议是否已注册
   */
  static isProtocolRegistered(protocol: string): boolean {
    return this.registered.has(protocol.toLowerCase());
  }

  /**
   * 获取指定协议的实例数量
   */
  static getInstanceCount(protocol?: string): number {
    if (!protocol) {
      return this.instances.size;
    }
    
    const protocolPrefix = `${protocol.toLowerCase()}_`;
    return Array.from(this.instances.keys())
      .filter(key => key.startsWith(protocolPrefix))
      .length;
  }

  /**
   * 清除所有实例缓存（不销毁，只是清除引用）
   */
  static clearInstanceCache(): void {
    this.instances.clear();
  }
} 

// 导出基础类型和接口
export {
  ConnectionPoolManager,
  ConnectionPoolEvent,
  ConnectionPoolStatus,
  ConnectionPoolHealth,
  ConnectionPoolMetrics,
  ConnectionRequestOptions,
  ConnectionRequestResult,
  ConnectionStats
} from './pool';

// 导出具体实现
export { HttpConnectionPoolManager } from './http';
export { Http2ConnectionPoolManager } from './http2';
export { WebSocketConnectionPoolManager } from './ws';
export { GrpcConnectionPoolManager } from './grpc';

// 自动注册所有连接池实现
import { HttpConnectionPoolManager } from './http';
import { Http2ConnectionPoolManager } from './http2';
import { WebSocketConnectionPoolManager } from './ws';
import { GrpcConnectionPoolManager } from './grpc';
import { ConnectionPoolConfig } from '../config/pool';

// 注册各协议的连接池实现
ConnectionPoolFactory.register('http', HttpConnectionPoolManager);
ConnectionPoolFactory.register('https', HttpConnectionPoolManager); // HTTPS使用HTTP连接池
ConnectionPoolFactory.register('http2', Http2ConnectionPoolManager);
ConnectionPoolFactory.register('websocket', WebSocketConnectionPoolManager);
ConnectionPoolFactory.register('ws', WebSocketConnectionPoolManager);
ConnectionPoolFactory.register('wss', WebSocketConnectionPoolManager);
ConnectionPoolFactory.register('grpc', GrpcConnectionPoolManager);

/**
 * 便捷的连接池创建方法
 */
export function createConnectionPool(protocol: string, config?: any) {
  return ConnectionPoolFactory.getOrCreate(protocol, config);
}

/**
 * 获取所有已注册的协议
 */
export function getRegisteredProtocols(): string[] {
  return ConnectionPoolFactory.getRegisteredProtocols();
}

/**
 * 获取所有连接池的统计信息
 */
export function getAllPoolMetrics(): Record<string, any> {
  return ConnectionPoolFactory.getAllMetrics();
}

/**
 * 销毁指定协议的所有连接池
 */
export async function destroyProtocolPools(protocol: string): Promise<void> {
  await ConnectionPoolFactory.destroy(protocol);
}

/**
 * 销毁所有连接池
 */
export async function destroyAllPools(): Promise<void> {
  await ConnectionPoolFactory.destroyAll();
} 