/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-07-06 11:21:37
 */
import { AsyncLocalStorage } from "async_hooks";
import { IncomingMessage, ServerResponse } from "http";
import Koa from "koa";
import koaCompose from "koa-compose";
import { Helper } from "koatty_lib";
import { DefaultLogger as Logger } from "koatty_logger";
import onFinished from "on-finished";
import { createKoattyContext } from "./Context";
import {
  AppEvent,
  InitOptions,
  KoattyApplication,
  KoattyRouter, KoattyServer,
} from "./IApplication";
import { KoattyContext, RequestType, ResponseType } from "./IContext";
import { KoattyMetadata } from "./Metadata";
import { asyncEvent, bindProcessEvent, isPrevent, parseExp } from "./Utils";

/**
 * Koatty Application 
 * @export
 * @class Koatty
 * @extends {Koa}
 * @implements {BaseApp}
 */
export class Koatty extends Koa implements KoattyApplication {
  // runtime env mode
  env: string = "production";
  // app name
  name: string;
  // app version
  version: string;
  // app options
  options: InitOptions;
  /**
   * Server instance
   * - Single protocol: KoattyServer instance
   * - Multi-protocol: KoattyServer[]
   */
  server: KoattyServer | KoattyServer[];

  /**
   * Router instance
   * - Single protocol: KoattyRouter instance
   * - Multi-protocol: Record<string, KoattyRouter> (router dictionary with protocol as key)
   */
  router: KoattyRouter | Record<string, KoattyRouter>;
  // env var
  appPath: string;
  rootPath: string;
  // koatty framework path
  koattyPath: string;
  logsPath: string;
  appDebug: boolean;

  context: KoattyContext;
  private handledResponse: boolean = false;
  private metadata: KoattyMetadata;
  private contextPrototypes: Map<string, any> = new Map();
  ctxStorage: AsyncLocalStorage<unknown>;

  /**
   * Protocol-specific middleware stacks
   * Key: protocol name ('http', 'grpc', 'ws', etc.)
   * Value: middleware function array for that protocol
   */
  private middlewareStacks: Map<string, Function[]> = new Map();
  
  /**
   * Flag to track if a protocol stack has been initialized
   */
  private initializedProtocols: Set<string> = new Set();

  /**
   * Protected constructor for the Application class.
   * Initializes a new instance with configuration options and sets up the application environment.
   * 
   * @remarks
   * - Sets up environment based on debug mode and environment variables
   * - Initializes metadata and context storage
   * - Calls init() and error capture methods
   */
  protected constructor(options: InitOptions = {
    appDebug: false,
    appPath: '',
    rootPath: '',
    koattyPath: '',
    name: 'KoattyApplication project',
    version: "0.0.1",
  }) {
    super();
    this.options = options ?? {};
    this.name = options.name;
    this.version = options.version;
    const { appDebug, appPath, rootPath, koattyPath } = this.options;
    const envArg = (process.execArgv ?? []).join(",");
    this.appDebug = appDebug || (envArg.includes('ts-node') || envArg.includes('--debug'));
    if (this.appDebug) {
      this.env = "development";
    } else {
      const env = process.env.KOATTY_ENV || process.env.NODE_ENV || "";
      if (env.includes("dev")) this.env = 'development';
      if (env.includes("pro")) this.env = 'production';
    }

    this.appPath = appPath;
    this.rootPath = rootPath;
    this.koattyPath = koattyPath;

    this.metadata = new KoattyMetadata();
    this.ctxStorage = new AsyncLocalStorage();

    // constructor
    this.init();
    // catch error
    this.captureError();
  }

  /**
   * Initialize application.
   * This method can be overridden in subclasses to perform initialization tasks.
   */
  init(): void { }

  /**
   * Set metadata value by key.
   * @param key The key of metadata. If key starts with "_", it will be defined as private property.
   * @param value The value to be set.
   */
  setMetaData(key: string, value: any) {
    // private
    if (key.startsWith("_")) {
      Helper.define(this, key, value);
      return;
    }
    this.metadata.set(key, value);
  }

  /**
   * Get metadata by key from application instance
   * @param key The metadata key to retrieve
   * @returns An array containing the metadata value(s). Returns empty array if not found
   */
  getMetaData(key: string): any[] {
    // private
    if (key.startsWith("_")) {
      const data = Reflect.get(this, key);
      if (Helper.isTrueEmpty(data)) {
        return [];
      }
      return [data];
    }
    return this.metadata.get(key);
  }

  /**
   * Add middleware to the application.
   * @param {Function} fn The middleware function to be added
   * @returns {any} Returns the result of adding the middleware
   * @throws {Error} When the parameter is not a function
   */
  use(fn: Function): any {
    if (!Helper.isFunction(fn)) {
      Logger.Error('The parameter is not a function.');
      return;
    }
    return super.use(<any>fn);
  }

  /**
   * Use express-style middleware function.
   * Convert express-style middleware to koa-style middleware.
   * 
   * @param {Function} fn Express-style middleware function
   * @returns {any} Returns the result of middleware execution
   * @throws {Error} When parameter is not a function
   */
  useExp(fn: Function): any {
    if (!Helper.isFunction(fn)) {
      Logger.Error('The parameter is not a function.');
      return;
    }
    return this.use(parseExp(fn));
  }

  /**
   * Get or set configuration value by name and type.
   * @param {string} name Configuration key name, support dot notation (e.g. 'app.port')
   * @param {string} [type='config'] Configuration type, defaults to 'config'
   * @param {any} [value] Configuration value to set. If provided, sets the config value
   * @returns {any} Configuration value or null if error occurs
   * 
   * @example
   * // Get single level config
   * app.config('port');
   * 
   * // Get nested config
   * app.config('database.host');
   * 
   * // Get all configs of specific type
   * app.config(undefined, 'middleware');
   * 
   * // Set single level config
   * app.config('port', 'config', 3000);
   * 
   * // Set nested config
   * app.config('database.host', 'config', 'localhost');
   * 
   * // Set entire config type
   * app.config(undefined, 'middleware', { list: ['trace'] });
   */
  config(name?: string, type = 'config', value?: any) {
    try {
      const caches = this.getMetaData('_configs')[0] || {};
      caches[type] = caches[type] || {};
      
      // If value is provided, set configuration
      if (value !== undefined) {
        if (name === undefined) {
          // Set entire config type
          caches[type] = value;
        } else if (Helper.isString(name)) {
          const keys = name.split('.');
          if (keys.length === 1) {
            // Set single level
            caches[type][name] = value;
          } else {
            // Set nested config
            caches[type][keys[0]] = caches[type][keys[0]] || {};
            caches[type][keys[0]][keys[1]] = value;
          }
        } else {
          caches[type][name] = value;
        }
        return value;
      }
      
      // Get configuration
      if (name === undefined) return caches[type];

      if (Helper.isString(name)) {
        const keys = name.split('.');
        return keys.length === 1 ? caches[type][name] : caches[type][keys[0]]?.[keys[1]];
      }
      return caches[type][name];
    } catch (err) {
      Logger.Error(err);
      return null;
    }
  }

  /**
   * Create a Koatty context object.
   * 
   * Creates a context for the incoming request using a protocol-specific factory.
   * This ensures that middleware can define protocol-specific properties (like requestParam)
   * without conflicts between different protocols.
   * 
   * Implementation strategy:
   * 1. Calls Koa's super.createContext() to create base context from app.context prototype
   * 2. Passes the context to createKoattyContext() with protocol information
   * 3. Uses ContextFactory pattern to add protocol-specific properties to the instance
   * 
   * Protocol isolation approach:
   * - All contexts share the same app.context prototype (Koa standard behavior)
   * - Protocol-specific properties (rpc, websocket, graphql, etc.) are defined on the 
   *   context INSTANCE using Helper.define(), not on the prototype
   * - Each request creates a fresh context instance via Object.create(koaContext)
   * - This provides instance-level isolation without prototype manipulation
   * 
   * Thread safety:
   * - Context creation is synchronous and occurs within the Node.js event loop
   * - Each request gets its own context instance
   * - AsyncLocalStorage is used to maintain context across async operations
   * 
   * @param {RequestType} req Request object (HTTP IncomingMessage, gRPC call, WS request, etc.)
   * @param {ResponseType} res Response object (HTTP ServerResponse, gRPC callback, WS socket, etc.)
   * @param {string} [protocol='http'] Protocol type: 'http' | 'https' | 'ws' | 'wss' | 'grpc' | 'graphql'
   * @returns {any} Koatty context object with protocol-specific properties
   * @public
   */
  createContext(req: RequestType, res: ResponseType, protocol = "http"): any {
    const resp = ['ws', 'wss', 'grpc'].includes(protocol) ?
      new ServerResponse(<IncomingMessage>req) : res;
    // create context
    const context = super.createContext(req as IncomingMessage, resp as ServerResponse);
    Helper.define(context, "app", this);
    return createKoattyContext(context, protocol, req, res);
  }

  /**
   * Listening and start server
   * 
   * Since Koa.listen returns an http.Server type, the return value must be defined
   *  as 'any' type here. When calling, note that Koatty.listen returns a NativeServer,
   *  such as http/https Server or grpcServer or Websocket
   * @param {Function} [listenCallback] Optional callback function to be executed after server starts
   * @returns {NativeServer} The native server instance
   */
  listen(listenCallback?: any) {//:NativeServer {
    const callbackFuncAndEmit = () => {
      Logger.Log('Koatty', '', 'Emit App Start ...');
      asyncEvent(this, AppEvent.appStart);
      listenCallback?.(this);
    };

    // binding event "appStop"
    Logger.Log('Koatty', '', 'Bind App Stop event ...');
    bindProcessEvent(this, 'appStop');
    
    // Start server(s)
    if (Array.isArray(this.server)) {
      // Multi-protocol: start all servers
      const serverArray = this.server;
      const servers = serverArray.map((srv, index) => {
        const isLast = index === serverArray.length - 1;
        return srv.Start(isLast ? callbackFuncAndEmit : undefined);
      });
      return servers as any;
    } else {
      // Single protocol: start single server
      const server = this.server.Start(callbackFuncAndEmit);
      return server as any;
    }
  }

  /**
   * Get middleware stack for specific protocol
   * @param protocol Protocol name
   * @returns Middleware array or undefined
   */
  getProtocolMiddleware(protocol: string): Function[] | undefined {
    return this.middlewareStacks.get(protocol);
  }

  /**
   * Get middleware stack statistics
   * @returns Statistics object
   */
  getMiddlewareStats(): { 
    global: number; 
    protocols: Record<string, number> 
  } {
    const stats: any = {
      global: this.middleware.length,
      protocols: {}
    };
    
    for (const [protocol, stack] of this.middlewareStacks) {
      stats.protocols[protocol] = stack.length;
    }
    
    return stats;
  }

  /**
   * Stop all servers gracefully.
   * - For single protocol: stops the single server
   * - For multi-protocol: stops all servers sequentially
   * 
   * @param {Function} [callback] Optional callback function to be executed after all servers stop
   * @returns {void}
   */
  stop(callback?: () => void): void {
    if (Array.isArray(this.server)) {
      // Multi-protocol: stop all servers
      let stoppedCount = 0;
      const totalServers = this.server.length;
      
      this.server.forEach((srv, index) => {
        srv.Stop(() => {
          stoppedCount++;
          Logger.Log('Koatty', '', `Server ${index + 1}/${totalServers} stopped`);
          
          // Call callback only after all servers are stopped
          if (stoppedCount === totalServers) {
            Logger.Log('Koatty', '', 'All servers stopped');
            callback?.();
          }
        });
      });
    } else {
      // Single protocol: stop single server
      this.server.Stop(() => {
        Logger.Log('Koatty', '', 'Server stopped');
        callback?.();
      });
    }
  }

  /**
   * Create a callback function for handling requests.
   * 
   * @param protocol - The protocol type, defaults to "http"
   * @param reqHandler - Optional request handler function for processing requests
   * @returns A function that handles incoming requests with the configured middleware stack
   * ```
   */
  callback(protocol = "http", reqHandler?: (ctx: KoattyContext) => Promise<any>) {
    // Get or create protocol-specific middleware stack
    let protocolMiddleware = this.middlewareStacks.get(protocol);
    
    if (!protocolMiddleware) {
      // First time for this protocol: copy global middleware
      protocolMiddleware = [...this.middleware];
      this.middlewareStacks.set(protocol, protocolMiddleware);
      this.initializedProtocols.add(protocol);
    }
    
    // Add protocol-specific handler to its own stack
    if (reqHandler) {
      protocolMiddleware.push(reqHandler);
    }
    
    // Compose middleware for this protocol only
    const fn = koaCompose(protocolMiddleware as any);
    if (!this.listenerCount('error')) this.on('error', this.onerror);

    return (req: RequestType, res: ResponseType) => {
      const ctx: any = this.createContext(req, res, protocol);
      if (!this.ctxStorage) {
        return this.handleRequest(ctx, fn as any);
      }
      return this.ctxStorage.run(ctx, async () => {
        return this.handleRequest(ctx, fn as any);
      });
    }
  }

  /**
   * Handle request with middleware.
   * 
   * @param ctx KoattyContext instance
   * @param fnMiddleware Composed middleware function
   * @returns Promise<any>
   * @private
   */
  private async handleRequest(
    ctx: KoattyContext,
    fnMiddleware: (ctx: KoattyContext) => Promise<any>,
  ): Promise<any> {
    const res = ctx.res;
    res.statusCode = 404;
    const onerror = (err: Error) => ctx.onerror(err);
    onFinished(res, onerror);
    return fnMiddleware(ctx).catch(onerror);
  }


  /**
   * Capture and handle various error events.
   * - Handles Koa application errors
   * - Handles process warnings
   * - Handles unhandled promise rejections
   * - Handles uncaught exceptions
   * 
   * If the error is not prevented (via isPrevent), it will be logged.
   * For EADDRINUSE errors, the process will exit with code -1.
   * 
   * @private
   */
  private captureError(): void {
    // koa error
    this.removeAllListeners('error');
    this.on('error', (err: Error) => {
      if (!isPrevent(err)) Logger.Error(err);
    });
    // warning
    process.removeAllListeners('warning');
    process.on('warning', Logger.Warn);
    // promise reject error
    process.removeAllListeners('unhandledRejection');
    process.on('unhandledRejection', (reason: Error) => {
      if (!isPrevent(reason)) Logger.Error(reason);
    });
    // uncaught exception
    process.removeAllListeners('uncaughtException');
    process.on('uncaughtException', (err) => {
      if (err.message.includes('EADDRINUSE')) {
        Logger.Fatal(Helper.toString(err));
        process.exit(-1);
      }
      if (!isPrevent(err)) Logger.Error(err);
    });
  }
}

// const properties = ["constructor", "init"];
// export const Koatty = new Proxy(Application, {
//     set(target, key, value, receiver) {
//         if (Reflect.get(target, key, receiver) === undefined) {
//             return Reflect.set(target, key, value, receiver);
//         } else if (key === "init") {
//             return Reflect.set(target, key, value, receiver);
//         } else {
//             throw Error("Cannot redefine getter-only property");
//         }
//     },
//     deleteProperty(target, key) {
//         throw Error("Cannot delete getter-only property");
//     },
//     construct(target, args, newTarget) {
//         Reflect.ownKeys(target.prototype).map((n) => {
//             if (newTarget.prototype.hasOwnProperty(n) && !properties.includes(Helper.toString(n))) {
//                 throw Error(`Cannot override the final method '${Helper.toString(n)}'`);
//             }
//         });
//         return Reflect.construct(target, args, newTarget);
//     }
// });
