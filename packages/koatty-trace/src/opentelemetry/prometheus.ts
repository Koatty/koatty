/**
 * Prometheus metrics exporter
 * @Description: Handle business metrics reporting for multiple protocols with enhanced concurrency safety and performance
 * @Author: richen
 * @Date: 2025-04-13
 * @License: BSD (3-Clause)
 */
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { Counter, Histogram } from '@opentelemetry/api';
import { TraceOptions } from '../trace/itrace';
import { Koatty, KoattyContext } from 'koatty_core';
import { DefaultLogger as logger } from "koatty_logger";

/**
 * Protocol types supported by the metrics collector
 */
export enum ProtocolType {
  HTTP = 'http',
  WEBSOCKET = 'websocket',
  GRPC = 'grpc'
}

/**
 * Path normalization cache for performance optimization
 */
/**
 * 缓存条目接口
 */
interface CacheEntry {
  value: string;
  lastAccess: number;
}

/**
 * 高性能 LRU 缓存 - 使用延迟重组策略
 * - 使用访问时间戳代替物理移动
 * - 定期批量重组，避免频繁的 delete + set 操作
 * - 适合高频读取场景
 */
class PathNormalizationCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private totalHits = 0;
  private totalAccesses = 0;
  private accessCount = 0;
  private readonly REORG_THRESHOLD = 1000; // 每 1000 次访问重组一次

  constructor(maxSize = 10000) {
    this.maxSize = maxSize;
  }

  /**
   * 获取缓存值
   * - 使用时间戳更新访问记录
   * - 达到阈值时批量重组
   */
  get(path: string): string | undefined {
    this.totalAccesses++;
    this.accessCount++;
    
    const entry = this.cache.get(path);
    if (entry) {
      this.totalHits++;
      
      // ✅ 只更新时间戳，不移动位置
      entry.lastAccess = this.accessCount;
      
      // ✅ 定期重组而不是每次都重组
      if (this.accessCount >= this.REORG_THRESHOLD) {
        this.reorganize();
      }
      
      return entry.value;
    }
    return undefined;
  }

  /**
   * 设置缓存值
   */
  set(path: string, normalized: string): void {
    const existing = this.cache.get(path);
    
    if (existing) {
      // ✅ 直接更新，不删除
      existing.value = normalized;
      existing.lastAccess = this.accessCount;
      return;
    }

    // 检查容量
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    // 添加新条目
    this.cache.set(path, { 
      value: normalized, 
      lastAccess: this.accessCount 
    });
  }

  /**
   * 驱逐最少使用的条目
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;
    
    // ✅ 找到最少访问的条目
    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 定期重组：重置访问计数，避免溢出
   */
  private reorganize(): void {
    this.accessCount = 0;
    
    // ✅ 将所有访问时间重置为相对值
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess);
    
    this.cache.clear();
    
    entries.forEach(([key, entry], index) => {
      entry.lastAccess = index;
      this.cache.set(key, entry);
    });
  }

  clear(): void {
    this.cache.clear();
    this.totalHits = 0;
    this.totalAccesses = 0;
    this.accessCount = 0;
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.totalAccesses > 0 ? this.totalHits / this.totalAccesses : 0,
      totalHits: this.totalHits,
      totalAccesses: this.totalAccesses,
      utilizationRate: this.cache.size / this.maxSize
    };
  }
}

/**
 * Thread-safe metrics batch processor for improved performance
 */
class MetricsBatchProcessor {
  private batchQueue: Array<{
    type: 'request' | 'error' | 'response_time' | 'connection';
    labels: Record<string, string>;
    value: number;
    timestamp: number;
  }> = [];
  private readonly batchSize: number;
  private readonly flushInterval: number;
  private flushTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private collector: MetricsCollector,
    batchSize = 100,
    flushInterval = 1000
  ) {
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
    this.startFlushTimer();
  }

  addMetric(type: 'request' | 'error' | 'response_time' | 'connection', labels: Record<string, string>, value: number) {
    this.batchQueue.push({
      type,
      labels: { ...labels }, // Clone to avoid reference issues
      value,
      timestamp: Date.now()
    });

    if (this.batchQueue.length >= this.batchSize) {
      this.flush();
    }
  }

  private startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushTimer = setInterval(() => {
      if (this.batchQueue.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  private async flush() {
    if (this.isProcessing || this.batchQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const batch = this.batchQueue.splice(0, this.batchSize);

    try {
      for (const metric of batch) {
        switch (metric.type) {
          case 'request':
            this.collector.requestCounter.add(metric.value, metric.labels);
            break;
          case 'error':
            this.collector.errorCounter.add(metric.value, metric.labels);
            break;
          case 'response_time':
            (this.collector.responseTimeHistogram as any).record(metric.value, metric.labels);
            break;
          case 'connection':
            this.collector.connectionCounter.add(metric.value, metric.labels);
            break;
        }
      }
    } catch (error) {
      logger.error('Failed to flush metrics batch:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush(); // Final flush
  }
}

/**
 * Enhanced MetricsCollector class with improved concurrency safety and performance
 */
export class MetricsCollector {
  public requestCounter: Counter;
  public errorCounter: Counter;
  public responseTimeHistogram: Histogram;
  public connectionCounter: Counter;
  
  private readonly serviceName: string;
  private readonly pathCache: PathNormalizationCache;
  private readonly batchProcessor: MetricsBatchProcessor;
  private readonly startTime: number;
  private memoryMonitorTimer: NodeJS.Timeout | null = null;
  
  // ✅ 合并为单个正则表达式，一次扫描完成所有替换
  private static readonly ID_PATTERN = /\/(?:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})|([a-f0-9]{24})|(\d+))/gi;

  constructor(meterProvider: MeterProvider, serviceName: string) {
    this.serviceName = serviceName;
    this.startTime = Date.now();
    this.pathCache = new PathNormalizationCache();
    
    const meter = meterProvider.getMeter(serviceName);
    this.initializeMetrics(meter);
    
    this.batchProcessor = new MetricsBatchProcessor(this);
    
    // Setup periodic memory monitoring
    this.setupMemoryMonitoring();
  }

  private initializeMetrics(meter: any) {
    // Universal request metrics (supports all protocols)
    this.requestCounter = meter.createCounter('requests_total', {
      description: 'Total requests across all protocols',
      unit: '1'
    });

    // Universal error metrics
    this.errorCounter = meter.createCounter('errors_total', {
      description: 'Total errors across all protocols',
      unit: '1'
    });

    // Universal response time histogram
    this.responseTimeHistogram = meter.createHistogram('response_time_seconds', {
      description: 'Response time in seconds across all protocols',
      unit: 's',
      advice: { explicitBucketBoundaries: [0.1, 0.5, 1, 2.5, 5, 10] }
    });

    // WebSocket specific metrics
    this.connectionCounter = meter.createCounter('websocket_connections_total', {
      description: 'Total WebSocket connections',
      unit: '1'
    });

    logger.info(`Enhanced multi-protocol metrics initialized for service: ${this.serviceName}`);
  }

  /**
   * Collect request metrics with enhanced performance and safety
   */
  collectRequestMetrics(ctx: KoattyContext, duration: number) {
    try {
      const protocol = this.detectProtocol(ctx);
      const labels = this.createLabelsOptimized(ctx, protocol);
      
      // Use batch processor for better performance
      this.batchProcessor.addMetric('request', labels, 1);
      this.batchProcessor.addMetric('response_time', labels, duration / 1000);
      
      // Record error count based on protocol-specific error conditions
      if (this.isErrorStatus(ctx.status, protocol)) {
        const errorLabels = {
          ...labels,
          error_type: this.getErrorType(ctx.status, protocol)
        };
        this.batchProcessor.addMetric('error', errorLabels, 1);
      }

      // Protocol-specific metrics
      this.collectProtocolSpecificMetricsOptimized(ctx, protocol);

      if (typeof logger.debug === 'function') {
        logger.debug(`Metrics collected for ${protocol.toUpperCase()} ${ctx.method} ${ctx.path}: ${duration}ms, status: ${ctx.status}`);
      }
    } catch (error) {
      // Ensure metrics collection errors don't affect main request flow
      logger.error('Failed to collect metrics (non-blocking):', error);
    }
  }

  /**
   * Optimized protocol detection with caching
   */
  private detectProtocol(ctx: KoattyContext): ProtocolType {
    // Use cached protocol if available
    if (ctx._cachedProtocol) {
      return ctx._cachedProtocol;
    }

    let protocol: ProtocolType;
    
    // Check for WebSocket
    if (ctx.websocket || ctx.req?.headers?.upgrade === 'websocket') {
      protocol = ProtocolType.WEBSOCKET;
    }
    // Check for gRPC
    else if (ctx.rpc || ctx.req?.headers?.['content-type']?.includes('application/grpc')) {
      protocol = ProtocolType.GRPC;
    }
    // Default to HTTP
    else {
      protocol = ProtocolType.HTTP;
    }

    // Cache for subsequent calls
    Object.defineProperty(ctx, '_cachedProtocol', {
      value: protocol,
      writable: false,
      enumerable: false
    });

    return protocol;
  }

  /**
   * Optimized label creation with object pooling
   */
  private createLabelsOptimized(ctx: KoattyContext, protocol: ProtocolType): Record<string, string> {
    const baseLabels: Record<string, string> = {
      method: ctx.method || 'UNKNOWN',
      status: (ctx.status || 200).toString(),
      path: this.normalizePathOptimized(ctx.path || ctx.originalPath || '/'),
      protocol: protocol
    };

    // Add protocol-specific labels efficiently
    switch (protocol) {
      case ProtocolType.WEBSOCKET:
        baseLabels['compression'] = this.getWebSocketCompression(ctx);
        break;
      
      case ProtocolType.GRPC:
        baseLabels['grpc_service'] = this.getGrpcService(ctx);
        baseLabels['compression'] = this.getGrpcCompression(ctx);
        break;
    }

    return baseLabels;
  }

  /**
   * High-performance path normalization with caching
   */
  private normalizePathOptimized(path: string): string {
    if (!path) return '/';
    
    // Check cache first
    const cached = this.pathCache.get(path);
    if (cached !== undefined) {
      return cached;
    }
    
    // ✅ 使用 indexOf 替代 split，避免创建数组
    const queryIndex = path.indexOf('?');
    const cleanPath = queryIndex === -1 ? path : path.substring(0, queryIndex);
    
    // ✅ 单次正则扫描替换所有ID模式
    const normalized = cleanPath.replace(
      MetricsCollector.ID_PATTERN,
      (match, uuid, objectid, numeric) => {
        if (uuid) return '/:uuid';
        if (objectid) return '/:objectid';
        if (numeric) return '/:id';
        return match;
      }
    );
    
    // Cache the result
    this.pathCache.set(path, normalized);
    
    return normalized;
  }

  /**
   * Optimized protocol-specific metrics collection
   */
  private collectProtocolSpecificMetricsOptimized(ctx: KoattyContext, protocol: ProtocolType) {
    switch (protocol) {
      case ProtocolType.WEBSOCKET:
        // Track WebSocket connections efficiently
        if (ctx.websocket?.readyState === 1) {
          this.batchProcessor.addMetric('connection', {
            protocol: protocol,
            service: this.serviceName
          }, 1);
        }
        break;
    }
  }

  /**
   * Setup memory monitoring for proactive management
   */
  private setupMemoryMonitoring() {
    const monitorInterval = 60000; // 1 minute
    
    this.memoryMonitorTimer = setInterval(() => {
      try {
        const memUsage = process.memoryUsage();
        const cacheStats = this.pathCache.getStats();
        
        // Log memory stats if debug enabled
        if (typeof logger.debug === 'function') {
          logger.debug('Metrics collector memory stats:', {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
            cacheSize: cacheStats.size,
            cacheHitRate: Math.round(cacheStats.hitRate * 100) + '%'
          });
        }
        
        // Clear cache if memory pressure is high
        if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB threshold
          this.pathCache.clear();
          logger.warn('High memory usage detected, cleared path normalization cache');
        }
      } catch (error) {
        logger.error('Memory monitoring error:', error);
      }
    }, monitorInterval);
  }

  /**
   * Check if status code represents an error for the given protocol
   */
  private isErrorStatus(status: number, protocol: ProtocolType): boolean {
    if (protocol === ProtocolType.GRPC) {
      return status !== 0;
    }
    return status >= 400;
  }

  /**
   * Get WebSocket compression info
   */
  private getWebSocketCompression(ctx: KoattyContext): string {
    const extensions = ctx.req?.headers?.['sec-websocket-extensions'] || '';
    return extensions.includes('permessage-deflate') ? 'deflate' : 'none';
  }

  /**
   * Get gRPC service name
   */
  private getGrpcService(ctx: KoattyContext): string {
    const path = ctx.path || ctx.originalPath || '';
    const match = path.match(/^\/([^\/]+)\/[^\/]+$/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Get gRPC compression info
   */
  private getGrpcCompression(ctx: KoattyContext): string {
    const acceptEncoding = ctx.rpc?.call?.metadata?.get('accept-encoding')?.[0] || '';
    if (acceptEncoding.includes('br')) return 'brotli';
    if (acceptEncoding.includes('gzip')) return 'gzip';
    return 'none';
  }

  /**
   * Get error type based on status code
   */
  private getErrorType(status: number, protocol: ProtocolType): string {
    if (protocol === ProtocolType.GRPC) {
      if (status === 0) return 'ok';
      if (status >= 1 && status <= 16) return 'grpc_error';
      return 'unknown_error';
    }
    
    if (status >= 400 && status < 500) return 'client_error';
    if (status >= 500) return 'server_error';
    return 'unknown_error';
  }

  /**
   * Record custom business metrics with safety checks
   */
  recordCustomMetric(name: string, value: number, labels: Record<string, string> = {}) {
    try {
      console.log(`Custom metric recorded: ${name} = ${value}`, labels);
      logger.debug(`Custom metric recorded: ${name} = ${value}`, labels);
    } catch (error) {
      logger.error(`Failed to record custom metric ${name}:`, error);
    }
  }

  /**
   * Get collector statistics for monitoring
   */
  getStats() {
    return {
      serviceName: this.serviceName,
      uptime: Date.now() - this.startTime,
      pathCacheStats: this.pathCache.getStats(),
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Graceful shutdown
   */
  destroy() {
    try {
      this.batchProcessor.destroy();
      this.pathCache.clear();
      
      // Clear memory monitoring timer
      if (this.memoryMonitorTimer) {
        clearInterval(this.memoryMonitorTimer);
        this.memoryMonitorTimer = null;
      }
      
      logger.info(`Metrics collector for ${this.serviceName} destroyed`);
    } catch (error) {
      logger.error('Error during metrics collector destruction:', error);
    }
  }
}

/**
 * Thread-safe singleton metrics collector manager
 */
class MetricsCollectorManager {
  private static instance: MetricsCollectorManager | null = null;
  private collector: MetricsCollector | null = null;
  private readonly lock = { locked: false };

  private constructor() {}

  static getInstance(): MetricsCollectorManager {
    if (!MetricsCollectorManager.instance) {
      MetricsCollectorManager.instance = new MetricsCollectorManager();
    }
    return MetricsCollectorManager.instance;
  }

  async setCollector(collector: MetricsCollector): Promise<void> {
    await this.acquireLock();
    try {
      if (this.collector) {
        this.collector.destroy();
      }
      this.collector = collector;
    } finally {
      this.releaseLock();
    }
  }

  getCollector(): MetricsCollector | null {
    return this.collector;
  }

  private async acquireLock(): Promise<void> {
    while (this.lock.locked) {
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    this.lock.locked = true;
  }

  private releaseLock(): void {
    this.lock.locked = false;
  }
}

/**
 * Initialize and configure Prometheus metrics exporter with enhanced safety
 */
export function initPrometheusExporter(app: Koatty, options: TraceOptions): MeterProvider | null {
  const isProduction = options.metricsConf?.metricsEndpoint
    || process.env.NODE_ENV === 'production';

  if (!isProduction || !options.metricsConf?.metricsEndpoint) {
    logger.info('Prometheus metrics disabled: not in production or no metricsEndpoint configured');
    return null;
  }

  try {
    const exporter = new PrometheusExporter({
      endpoint: options.metricsConf.metricsEndpoint,
      port: options.metricsConf.metricsPort || 9464
    });

    const meterProvider = new MeterProvider({
      readers: [exporter]
    });

    // Initialize collector through singleton manager
    const manager = MetricsCollectorManager.getInstance();
    const collector = new MetricsCollector(meterProvider, app.name || 'koatty-app');
    manager.setCollector(collector);
    
    // Setup graceful shutdown
    const cleanup = () => {
      const currentCollector = manager.getCollector();
      if (currentCollector) {
        currentCollector.destroy();
      }
    };
    
    process.once('SIGTERM', cleanup);
    process.once('SIGINT', cleanup);
    
    logger.info(`Enhanced Prometheus metrics initialized on port ${options.metricsConf.metricsPort || 9464}, endpoint: ${options.metricsConf.metricsEndpoint}`);
    
    return meterProvider;
  } catch (error) {
    logger.error('Failed to initialize Prometheus exporter:', error);
    return null;
  }
}

/**
 * Get the global metrics collector instance safely
 */
export function getMetricsCollector(): MetricsCollector | null {
  return MetricsCollectorManager.getInstance().getCollector();
}

/**
 * Collect metrics for any protocol request (enhanced convenience function)
 */
export function collectRequestMetrics(ctx: KoattyContext, duration: number) {
  const collector = getMetricsCollector();
  if (collector) {
    collector.collectRequestMetrics(ctx, duration);
  }
}


