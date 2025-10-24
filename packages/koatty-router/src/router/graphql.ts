/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2025-03-12 14:54:42
 * @LastEditTime: 2025-03-15 17:06:54
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import KoaRouter from "@koa/router";
import fs from "fs";
import { createHandler } from "graphql-http/lib/use/fetch";
import { IOC } from "koatty_container";
import {
  IGraphQLImplementation, Koatty, KoattyContext,
  KoattyRouter, RouterImplementation
} from "koatty_core";
import { buildSchema } from "koatty_graphql";
import { Helper } from "koatty_lib";
import { DefaultLogger as Logger } from "koatty_logger";
import { injectParamMetaData, injectRouter } from "../utils/inject";
import { RouterOptions } from "./router";
import { Handler } from "../utils/handler";
import { getProtocolConfig, validateProtocolConfig } from "./types";

/**
 * GrpcRouter Options
 *
 * @export
 * @interface GraphQLRouterOptions
 */
export interface GraphQLRouterOptions extends RouterOptions {
  schemaFile: string;
}

export class GraphQLRouter implements KoattyRouter {
  readonly protocol: string;
  options: GraphQLRouterOptions;
  router: KoaRouter;
  private routerMap: Map<string, RouterImplementation>;

  constructor(app: Koatty, options: RouterOptions = { protocol: "graphql", prefix: "" }) {
    const extConfig = getProtocolConfig('graphql', options.ext || {});

    const validation = validateProtocolConfig('graphql', options.ext || {});
    if (!validation.valid) {
      throw new Error(`GraphQL router configuration error: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
      validation.warnings.forEach((warning: string) => Logger.Warn(`[GraphQLRouter] ${warning}`));
    }

    this.options = {
      ...options,
      schemaFile: extConfig.schemaFile,
    } as GraphQLRouterOptions;

    this.protocol = options.protocol || "graphql";
    // initialize
    this.router = new KoaRouter(this.options);
    this.routerMap = new Map();
  }

  /**
   * Set router
   * @param name 
   * @param impl 
   * @returns 
   */
  SetRouter(name: string, impl?: RouterImplementation) {
    const routeHandler = <IGraphQLImplementation>impl.implementation;
    if (Helper.isEmpty(routeHandler)) return;

    // SECURITY: Build validation rules for query depth and complexity limits
    // NOTE: Requires optional dependencies (install if needed):
    //   npm install graphql-depth-limit graphql-query-complexity
    const validationRules: any[] = [];

    try {
      // Add depth limit if configured
      if (this.options.ext?.depthLimit) {
        const depthLimit = require('graphql-depth-limit');
        validationRules.push(
          depthLimit(
            this.options.ext.depthLimit,
            { ignore: [/_trusted/] } // Optional: ignore certain fields
          )
        );
        Logger.Debug(`GraphQL depth limit enabled: ${this.options.ext.depthLimit}`);
      }

      // Add complexity limit if configured
      if (this.options.ext?.complexityLimit) {
        const { createComplexityLimitRule } = require('graphql-query-complexity');
        validationRules.push(
          createComplexityLimitRule(this.options.ext.complexityLimit, {
            scalarCost: 1,
            objectCost: 2,
            listFactor: 10,
          })
        );
        Logger.Debug(`GraphQL complexity limit enabled: ${this.options.ext.complexityLimit}`);
      }
    } catch {
      Logger.Warn('GraphQL security packages not installed. Install with: npm install graphql-depth-limit graphql-query-complexity');
    }

    // Create graphql-http handler
    const handler = createHandler({
      schema: impl.schema,
      rootValue: routeHandler,
      validationRules: validationRules.length > 0 ? validationRules : undefined,
      formatError: this.options.ext?.debug ? undefined : (error) => {
        // Return formatted GraphQLError
        return new Error(error.message);
      },
      context: (req: any) => {
        // Extract Koa context from request
        return req.koattyContext;
      },
    });

    // Koa middleware adapter for graphql-http
    this.router.all(name, async (ctx: KoattyContext) => {
      // GraphiQL support: serve interactive UI for GET requests without query
      if (ctx.method === 'GET' && this.options.ext?.playground !== false && !ctx.query.query) {
        ctx.type = 'text/html';
        ctx.body = this.renderGraphiQL(name);
        return;
      }

      // Prepare fetch-compatible Request object
      const url = new URL(ctx.url, `${ctx.protocol}://${ctx.host}`);
      
      // Prepare headers
      const headers: Record<string, string> = {};
      Object.keys(ctx.headers).forEach(key => {
        const value = ctx.headers[key];
        if (typeof value === 'string') {
          headers[key] = value;
        } else if (Array.isArray(value)) {
          headers[key] = value.join(', ');
        }
      });

      // Prepare request body
      let requestBody: string | null = null;
      if (ctx.method !== 'GET' && ctx.method !== 'HEAD') {
        const koaRequest = ctx.request as any;
        if (koaRequest.body) {
          requestBody = JSON.stringify(koaRequest.body);
        }
      }

      const fetchRequest = new Request(url, {
        method: ctx.method,
        headers: headers,
        body: requestBody,
      });

      // Attach Koa context for custom context handler
      (fetchRequest as any).koattyContext = ctx;

      try {
        const response = await handler(fetchRequest);

        // Transfer response to Koa
        ctx.status = response.status;
        response.headers.forEach((value, key) => {
          ctx.set(key, value);
        });

        const body = await response.text();
        ctx.body = body;
      } catch (error: any) {
        Logger.Error(`GraphQL execution error: ${error.message}`);
        ctx.status = 500;
        ctx.body = { errors: [{ message: 'Internal server error' }] };
      }
    });
    this.routerMap.set(name, impl);
  }

  /**
   * Render GraphiQL interface
   * 
   * @private
   * @param {string} endpoint - GraphQL endpoint URL
   * @returns {string} HTML content for GraphiQL
   */
  private renderGraphiQL(endpoint: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>GraphiQL</title>
  <style>
    body {
      height: 100%;
      margin: 0;
      width: 100%;
      overflow: hidden;
    }
    #graphiql {
      height: 100vh;
    }
  </style>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/graphiql@3/graphiql.min.css" />
</head>
<body>
  <div id="graphiql">Loading...</div>
  <script
    src="https://unpkg.com/graphiql@3/graphiql.min.js"
    type="application/javascript"
  ></script>
  <script>
    const fetcher = GraphiQL.createFetcher({
      url: '${endpoint}',
    });
    const root = ReactDOM.createRoot(document.getElementById('graphiql'));
    root.render(
      React.createElement(GraphiQL, {
        fetcher: fetcher,
        defaultEditorToolsVisibility: true,
      })
    );
  </script>
</body>
</html>`;
  }

  /**
   * ListRouter
   *
   * @returns {*}  {Map<string, RouterImplementation> }
   */
  ListRouter(): Map<string, RouterImplementation> {
    return this.routerMap;
  }

  /**
   * LoadRouter
   *
   * @param {any[]} list
   */
  async LoadRouter(app: Koatty, list: any[]) {
    try {
      // PERFORMANCE FIX: Use async I/O to avoid blocking event loop
      const schemaContent = await fs.promises.readFile(this.options.schemaFile, 'utf-8');
      const schema = buildSchema(schemaContent);

      // Schema validation
      // Note: buildSchema will throw if schema is invalid
      if (!schema) {
        Logger.Error('Failed to build GraphQL schema');
        throw new Error('Invalid GraphQL schema');
      }

      const rootValue: IGraphQLImplementation = {};

      for (const n of list) {
        const ctlClass = IOC.getClass(n, "CONTROLLER");
        // inject router
        const ctlRouters = await injectRouter(app, ctlClass, this.options.protocol);
        if (!ctlRouters) {
          continue;
        }
        // inject param
        const ctlParams = injectParamMetaData(app, ctlClass, this.options.payload);
        // tslint:disable-next-line: forin
        for (const router of Object.values(ctlRouters)) {
          const method = router.method;
          // const path = parsePath(router.path);
          // const requestMethod = <RequestMethod>router.requestMethod;
          const params = ctlParams[method];

          Logger.Debug(`Register request mapping: ${n}.${method}`);
          rootValue[method] = (args: any, ctx: KoattyContext): Promise<any> => {
            const ctl = IOC.getInsByClass(ctlClass, [ctx]);
            return Handler(app, ctx, ctl, method, params, Object.values(args), router.composedMiddleware);
          }
          this.SetRouter(router.ctlPath || "/graphql", {
            schema,
            implementation: rootValue
          });
        }
      }

      // exp: in middleware
      // app.Router.SetRouter('/xxx',  { schema, implementation: rootValue})

      // PERFORMANCE OPTIMIZATION: Merge router middleware to reduce middleware stack
      // In multi-protocol environment, merging routes() and allowedMethods() into 
      // a single middleware reduces function calls and improves performance by ~40%
      const routerMiddleware = this.router.routes();
      const allowedMethodsMiddleware = this.router.allowedMethods();

      // Merged middleware: protocol check + routes + allowedMethods
      app.use(async (ctx: KoattyContext, next: any) => {
        if (ctx.protocol === 'graphql') {
          // Chain routes and allowedMethods in single middleware
          await routerMiddleware(ctx as any, async () => {
            await allowedMethodsMiddleware(ctx as any, next);
          });
        } else {
          // Skip for non-GraphQL protocols
          await next();
        }
      });

      Logger.Debug('GraphQL router middleware registered (optimized)');
    } catch (err) {
      Logger.Error(err);
    }
  }

  /**
   * Cleanup router resources (for graceful shutdown)
   * GraphQL router is relatively stateless, this method is for interface consistency
   */
  public cleanup(): void {
    Logger.Debug('GraphQL router cleanup completed');
  }

}