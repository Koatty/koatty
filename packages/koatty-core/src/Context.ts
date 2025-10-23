/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-07-06 11:21:37
 */
import { ServerUnaryCall } from "@grpc/grpc-js";
import { IncomingMessage } from "http";
import { Exception, HttpStatusCode, HttpStatusCodeMap } from "koatty_exception";
import { Helper } from "koatty_lib";
import {
  IRpcServerCall, IRpcServerCallback, IWebSocket,
  KoaContext, KoattyContext, RequestType,
  ResponseType
} from './IContext';
import { KoattyMetadata } from "./Metadata";

/**
 * Protocol types supported by Koatty
 */
type ProtocolType = 'http' | 'https' | 'ws' | 'wss' | 'grpc' | 'graphql';

/**
 * Protocol types supported by Koatty
 */
const ProtocolTypeArray: ProtocolType[] = ['http', 'https', 'ws', 'wss', 'grpc', 'graphql'];

/**
 * Context factory interface for different protocols
 */
interface IContextFactory {
  create(context: KoattyContext, req?: any, _res?: any): KoattyContext;
}

/**
 * Pre-compiled method cache for better performance
 */
const MethodCache = {
  getMetaData: function(this: KoattyContext, key: string): any[] {
    if (!key || typeof key !== 'string') {
      throw new Error('Metadata key must be a non-empty string');
    }
    return this.metadata?.get(key) || [];
  },

  setMetaData: function(this: KoattyContext, key: string, value: any): void {
    if (!key || typeof key !== 'string') {
      throw new Error('Metadata key must be a non-empty string');
    }
    if (!this.metadata) {
      this.metadata = new KoattyMetadata();
    }
    this.metadata.set(key, value);
  },

  throw: function(this: KoattyContext, statusOrMessage: HttpStatusCode | string,
    codeOrMessage: string | number = 1, status?: HttpStatusCode): never {
    if (typeof statusOrMessage !== "string") {
      const httpStatus = HttpStatusCodeMap.get(statusOrMessage);
      if (httpStatus) {
        status = statusOrMessage;
        statusOrMessage = httpStatus;
      }
    }
    if (typeof codeOrMessage === "string") {
      statusOrMessage = codeOrMessage;
      codeOrMessage = 1;
    }
    throw new Exception(<string>statusOrMessage, codeOrMessage, status);
  },

  httpSendMetadata: function(this: KoattyContext, data?: KoattyMetadata) {
    const metadataToSend = data || this.metadata;
    if (metadataToSend && typeof metadataToSend.getMap === 'function') {
      this.set(metadataToSend.getMap());
    }
  },

  grpcSendMetadata: function(this: KoattyContext, data?: KoattyMetadata) {
    const metadataToSend = data || this.metadata;
    if (metadataToSend && this.rpc?.call) {
      const m = metadataToSend.getMap();
      const metadata = this.rpc.call.metadata.clone();
      Object.keys(m).forEach(k => metadata.add(k, m[k]));
      this.rpc.call.sendMetadata(metadata);
    }
  },

  graphqlSendMetadata: function(this: KoattyContext, data?: KoattyMetadata) {
    const metadataToSend = data || this.metadata;
    if (metadataToSend && typeof metadataToSend.getMap === 'function') {
      const metadataMap = metadataToSend.getMap();
      Object.keys(metadataMap).forEach(key => {
        if (!key.startsWith('_') && !key.startsWith('graphql')) {
          this.set(key, metadataMap[key]);
        }
      });
    }
  }
};

/**
 * Context pool for reusing context objects
 */
class ContextPool {
  private static pools = new Map<ProtocolType, KoattyContext[]>();
  private static readonly MAX_POOL_SIZE = 100;
  private static readonly MIN_POOL_SIZE = 10;
  private static initialized = false;

  /**
   * Initialize pools with pre-allocated contexts
   */
  static initialize(): void {
    if (this.initialized) return;
    
    // Pre-allocate contexts for better performance
    const protocols: ProtocolType[] = ['http', 'https'];
    protocols.forEach(protocol => {
      const pool: KoattyContext[] = [];
      this.pools.set(protocol, pool);
    });
    
    this.initialized = true;
  }

  static get(protocol: ProtocolType): KoattyContext | null {
    if (!this.initialized) this.initialize();
    
    const pool = this.pools.get(protocol);
    if (pool && pool.length > 0) {
      return pool.pop()!;
    }
    return null;
  }

  static release(protocol: ProtocolType, context: KoattyContext): void {
    if (!this.initialized) this.initialize();
    
    // Only pool HTTP/HTTPS contexts for now (others have property constraints)
    if (!['http', 'https'].includes(protocol)) {
      return;
    }
    
    const pool = this.pools.get(protocol) || [];
    if (pool.length < this.MAX_POOL_SIZE) {
      // Reset context state efficiently
      this.resetContext(context);
      pool.push(context);
      this.pools.set(protocol, pool);
    }
  }

  private static resetContext(context: KoattyContext): void {
    // Fast reset without creating new objects
    if (context.metadata) {
      context.metadata.clear();
    }
    
    // Reset status
    context.status = 200;
    
    // Reset common properties
    if (context.body !== undefined) {
      context.body = undefined;
    }
    
    // Note: Properties defined by Helper.define cannot be deleted due to configurable: false
    // All protocol-specific properties (rpc, websocket, graphql) are read-only and non-configurable
    // They will be naturally overwritten when the context is reused for a new request
  }

  /**
   * Get pool statistics for monitoring
   */
  static getStats(): { [protocol: string]: { size: number; maxSize: number } } {
    const stats: { [protocol: string]: { size: number; maxSize: number } } = {};
    this.pools.forEach((pool, protocol) => {
      stats[protocol] = {
        size: pool.length,
        maxSize: this.MAX_POOL_SIZE
      };
    });
    return stats;
  }

  /**
   * Warm up pools by pre-allocating contexts
   */
  static warmUp(protocol: ProtocolType, count: number = this.MIN_POOL_SIZE): void {
    if (!this.initialized) this.initialize();
    
    // Only warm up poolable protocols
    if (!['http', 'https'].includes(protocol)) {
      return;
    }
    
    const pool = this.pools.get(protocol) || [];
    const needed = Math.min(count, this.MAX_POOL_SIZE) - pool.length;
    
    if (needed > 0) {
      // This would require access to a base context, so we'll skip pre-allocation
      // and let the pool grow naturally during runtime
    }
  }
}

/**
 * HTTP Context Factory
 */
class HttpContextFactory implements IContextFactory {
  private static instance: HttpContextFactory;
  
  static getInstance(): HttpContextFactory {
    if (!this.instance) {
      this.instance = new HttpContextFactory();
    }
    return this.instance;
  }

  create(context: KoattyContext): KoattyContext {
    // Initialize metadata
    Helper.define(context, "metadata", new KoattyMetadata());
    
    // Define methods using cached references
    Helper.define(context, "getMetaData", MethodCache.getMetaData);
    Helper.define(context, "setMetaData", MethodCache.setMetaData);
    Helper.define(context, "sendMetadata", MethodCache.httpSendMetadata);

    return context;
  }
}

/**
 * gRPC Context Factory
 */
class GrpcContextFactory implements IContextFactory {
  private static instance: GrpcContextFactory;
  
  static getInstance(): GrpcContextFactory {
    if (!this.instance) {
      this.instance = new GrpcContextFactory();
    }
    return this.instance;
  }

  create(context: KoattyContext, call: IRpcServerCall<RequestType, ResponseType>,
    callback: IRpcServerCallback<any>): KoattyContext {
    
    context.status = 200;

    if (call) {
      Helper.define(context, "rpc", { call, callback });
      Helper.define(context, "metadata", KoattyMetadata.from(call.metadata.toJSON()));
      
      // Define methods using cached references
      Helper.define(context, "getMetaData", MethodCache.getMetaData);
      Helper.define(context, "setMetaData", MethodCache.setMetaData);

      // Safely get handler information
      let handler: any = {};
      try {
        handler = Reflect.get(call, 'handler') || {};
      } catch {
        // 如果反射失败，使用空的handler
        handler = {};
      }
      
      // Set initial metadata
      context.setMetaData("originalPath", handler.path || '');
      context.setMetaData("_body", (<ServerUnaryCall<any, any>>call).request || {});
      
      // Define sendMetadata for gRPC using cached reference
      Helper.define(context, "sendMetadata", MethodCache.grpcSendMetadata);
    }

    return context;
  }
}

/**
 * GraphQL Context Factory
 */
class GraphQLContextFactory implements IContextFactory {
  private static instance: GraphQLContextFactory;
  
  static getInstance(): GraphQLContextFactory {
    if (!this.instance) {
      this.instance = new GraphQLContextFactory();
    }
    return this.instance;
  }

  create(context: KoattyContext, req?: any, _res?: any): KoattyContext {
    // Initialize metadata first
    Helper.define(context, "metadata", new KoattyMetadata());
    
    // Define base methods using cached references
    Helper.define(context, "getMetaData", MethodCache.getMetaData);
    Helper.define(context, "setMetaData", MethodCache.setMetaData);
    
    context.status = 200;
    
    // Add GraphQL specific properties
    const graphqlInfo = {
      query: req?.body?.query || req?.query?.query || '',
      variables: req?.body?.variables || req?.query?.variables || {},
      operationName: req?.body?.operationName || req?.query?.operationName || null,
      schema: null as any, // Will be set by GraphQL middleware
      rootValue: null as any, // Will be set by GraphQL middleware
      contextValue: context, // Reference to the context itself
    };
    
    Helper.define(context, "graphql", graphqlInfo);
    
    // Set GraphQL specific metadata efficiently
    const metadata = context.metadata;
    metadata.set("_body", req?.body || {});
    metadata.set("originalPath", req?.url || req?.path || '/graphql');
    metadata.set("graphqlQuery", graphqlInfo.query);
    metadata.set("graphqlVariables", graphqlInfo.variables);
    metadata.set("graphqlOperationName", graphqlInfo.operationName);
    
    // Define sendMetadata for GraphQL using cached reference
    Helper.define(context, "sendMetadata", MethodCache.graphqlSendMetadata);

    return context;
  }
}

/**
 * WebSocket Context Factory
 */
class WebSocketContextFactory implements IContextFactory {
  private static instance: WebSocketContextFactory;
  private httpFactory: HttpContextFactory;

  constructor() {
    this.httpFactory = HttpContextFactory.getInstance();
  }
  
  static getInstance(): WebSocketContextFactory {
    if (!this.instance) {
      this.instance = new WebSocketContextFactory();
    }
    return this.instance;
  }

  create(context: KoattyContext, req: IncomingMessage & {
    data: Buffer | ArrayBuffer | Buffer[];
  }, socket: IWebSocket): KoattyContext {
    
    // First create HTTP context
    context = this.httpFactory.create(context);
    context.status = 200;
    
    // Add WebSocket specific properties
    Helper.define(context, "websocket", socket);
    context.setMetaData("_body", (req.data ?? "").toString());
    
    return context;
  }
}

/**
 * Context factory registry
 */
class ContextFactoryRegistry {
  private static factories = new Map<ProtocolType, IContextFactory>([
    ['http', HttpContextFactory.getInstance()],
    ['https', HttpContextFactory.getInstance()],
    ['ws', WebSocketContextFactory.getInstance()],
    ['wss', WebSocketContextFactory.getInstance()],
    ['grpc', GrpcContextFactory.getInstance()],
    ['graphql', GraphQLContextFactory.getInstance()]
  ]);

  static getFactory(protocol: ProtocolType): IContextFactory {
    const factory = this.factories.get(protocol);
    if (!factory) {
      throw new Error(`Unsupported protocol: ${protocol}`);
    }
    return factory;
  }

  static registerFactory(protocol: ProtocolType, factory: IContextFactory): void {
    this.factories.set(protocol, factory);
  }
}

/**
 * Create Koatty context instance based on protocol type.
 * 
 * @param {KoaContext} ctx - Koa context object
 * @param {string} protocol - Protocol type ('http'|'https'|'ws'|'wss'|'grpc'|'graphql')
 * @param {any} req - Request object
 * @param {any} res - Response object
 * @returns {KoattyContext} Returns appropriate context instance based on protocol
 */
export function createKoattyContext(ctx: KoaContext, protocol: string,
  req: any, res: any): KoattyContext {
  
  try {
    // Validate protocol
    const protocolType = protocol as ProtocolType;
    if (!ProtocolTypeArray.includes(protocolType)) {
      throw new Error(`Invalid protocol: ${protocol}`);
    }

    // Initialize base context
    const context = initBaseContext(ctx, protocolType);
    
    // Get factory and create context
    const factory = ContextFactoryRegistry.getFactory(protocolType);
    return factory.create(context, req, res);
    
  } catch (error) {
    throw new Error(`Failed to create context for protocol ${protocol}: ${error.message}`);
  }
}

/**
 * Initialize base context by extending KoaContext with additional properties and methods.
 * 
 * @param {KoaContext} ctx - The original Koa context object to extend from.
 * @param {ProtocolType} protocol - The protocol to be defined in the context.
 * @returns {KoattyContext} The extended context object with additional properties and methods.
 */
function initBaseContext(ctx: KoaContext, protocol: ProtocolType): KoattyContext {
  // Create a new object with ctx as prototype
  // This provides instance-level isolation while sharing the Koa context prototype
  // Note: All protocol contexts share the same prototype chain (app.context)
  // Protocol-specific properties are defined on THIS instance, not the prototype
  const context: KoattyContext = Object.create(ctx);
  
  // Define protocol
  Helper.define(context, "protocol", protocol);
  
  // Define throw method
  Helper.define(context, "throw", MethodCache.throw);

  return context;
}

// Export for external use
export { ContextPool, ContextFactoryRegistry, type IContextFactory, type ProtocolType };