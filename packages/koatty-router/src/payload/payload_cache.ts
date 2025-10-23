/*
 * @Description: Payload parsing utilities with performance optimizations
 * @Usage: Parse request body based on content-type with caching
 * @Author: richen
 * @Date: 2023-12-09 12:02:29
 * @LastEditTime: 2025-01-20 10:00:00
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import { KoattyContext } from "koatty_core";
import { LRUCache } from "lru-cache";
import { PayloadOptions } from "./interface";
import { parseText } from "./parser/text";
import { parseJson } from "./parser/json";
import { parseForm } from "./parser/form";
import { parseMultipart } from "./parser/multipart";
import { parseXml } from "./parser/xml";
import { parseGrpc } from "./parser/grpc";
import { parseGraphQL } from "./parser/graphql";
import { parseWebSocket } from "./parser/websocket";




// 预定义常量避免重复创建
export const DEFAULT_ENCODING = 'utf-8' as BufferEncoding;
export const DEFAULT_LIMIT = '20mb';
export const contentTypeRegex = /^(application\/json|application\/x-www-form-urlencoded|text\/plain|multipart\/form-data|text\/xml|application\/grpc|application\/graphql\+json|application\/websocket)/i;
export const IDENTITY_ENCODING = 'identity';

// 使用 Map 替代对象提升查找性能
export type ParserFunction = (ctx: KoattyContext, opts: PayloadOptions) => Promise<any>;
export type ParserMap = Map<string, ParserFunction>;

// 默认解析器映射
export const defaultParsers = new Map<string, ParserFunction>([
  ['json', parseJson],
  ['form', parseForm],
  ['text', parseText],
  ['multipart', parseMultipart],
  ['xml', parseXml],
  ['grpc', parseGrpc],
  ['graphql', parseGraphQL],
  ['websocket', parseWebSocket]
]);

// 常见 MIME 类型映射，提高查找速度
export const commonMimeTypes = new Map<string, ParserFunction>([
  ['application/json', parseJson],
  ['application/x-www-form-urlencoded', parseForm],
  ['text/plain', parseText],
  ['multipart/form-data', parseMultipart],
  ['text/xml', parseXml],
  ['application/grpc', parseGrpc],
  ['application/graphql+json', parseGraphQL],
  ['application/websocket', parseWebSocket]
]);

const defaultOptions: PayloadOptions = {
  extTypes: {
    json: ['application/json'],
    form: ['application/x-www-form-urlencoded'],
    text: ['text/plain'],
    multipart: ['multipart/form-data'],
    xml: ['text/xml'],
    grpc: ['application/grpc'],
    graphql: ['application/graphql+json'],
    websocket: ['application/websocket']
  } as Record<string, string[]>,
  limit: DEFAULT_LIMIT,
  encoding: DEFAULT_ENCODING,
  multiples: true,
  keepExtensions: true,
};

/**
 * 模块级别的单例缓存管理器
 * 确保并发安全和全局唯一性
 */
export class PayloadCacheManager {
  private static instance: PayloadCacheManager | null = null;
  private static readonly lock = Symbol('PayloadCacheManager.lock');

  private readonly typeMapCache: LRUCache<string, ParserMap>;
  private readonly contentTypeCache: LRUCache<string, string>;
  private readonly optionsCache: LRUCache<string, PayloadOptions>;

  // 私有构造函数确保单例
  private constructor() {
    this.typeMapCache = new LRUCache<string, ParserMap>({ max: 100 });
    this.contentTypeCache = new LRUCache<string, string>({ max: 200 });
    this.optionsCache = new LRUCache<string, PayloadOptions>({ max: 50 });
  }

  /**
   * 获取单例实例（线程安全）
   */
  public static getInstance(): PayloadCacheManager {
    if (!PayloadCacheManager.instance) {
      // 使用 Symbol 作为锁，确保并发安全
      if (!PayloadCacheManager.instance) {
        PayloadCacheManager.instance = new PayloadCacheManager();
      }
    }
    return PayloadCacheManager.instance;
  }

  /**
   * 重置单例实例（主要用于测试）
   */
  public static resetInstance(): void {
    if (PayloadCacheManager.instance) {
      PayloadCacheManager.instance.clearAll();
      PayloadCacheManager.instance = null;
    }
  }

  /**
   * 获取或创建 typeMap
   */
  public getTypeMap(extTypes: Record<string, string[]>): ParserMap {
    const cacheKey = JSON.stringify(extTypes);

    const cached = this.typeMapCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 创建新的 typeMap
    const typeMap = new Map<string, ParserFunction>();

    // 首先添加常用类型以提高查找速度
    for (const [mime, parser] of commonMimeTypes) {
      typeMap.set(mime, parser);
    }

    // 使用 extTypes 配置覆盖或添加自定义类型
    for (const [type, mimes] of Object.entries(extTypes)) {
      const parser = defaultParsers.get(type) || parseText;
      for (const mime of mimes) {
        typeMap.set(mime, parser);
      }
    }

    this.typeMapCache.set(cacheKey, typeMap);
    return typeMap;
  }

  /**
   * 获取内容类型解析结果
   */
  public getContentType(contentType: string): string | null {
    let normalizedType = this.contentTypeCache.get(contentType);

    if (!normalizedType) {
      const match = contentType.match(contentTypeRegex);
      if (!match) {
        return null;
      }

      // 返回标准化的小写形式
      normalizedType = match[1].toLowerCase();
      this.contentTypeCache.set(contentType, normalizedType);
    }

    return normalizedType;
  }

  /**
   * 获取合并后的选项
   */
  public getMergedOptions(options?: PayloadOptions): PayloadOptions {
    if (!options) {
      return defaultOptions;
    }

    const cacheKey = JSON.stringify(options);

    const cached = this.optionsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const mergedOptions = Object.assign({}, defaultOptions, options);
    this.optionsCache.set(cacheKey, mergedOptions);
    return mergedOptions;
  }

  /**
   * 清理所有缓存
   */
  public clearAll(): void {
    this.typeMapCache.clear();
    this.contentTypeCache.clear();
    this.optionsCache.clear();
  }


}


// 模块级别的单例实例
export const cacheManager = PayloadCacheManager.getInstance();
/**
 * 清理所有缓存
 */
export function clearTypeMapCache(): void {
  cacheManager.clearAll();
}


