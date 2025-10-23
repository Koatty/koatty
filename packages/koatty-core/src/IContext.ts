/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-07-06 11:21:37
 */
import {
  ServerReadableStream, ServerUnaryCall, ServerWritableStream
} from "@grpc/grpc-js";
import {
  sendUnaryData, ServerReadableStreamImpl,
  ServerUnaryCallImpl
} from "@grpc/grpc-js/build/src/server-call";
import { IncomingMessage, OutgoingMessage, ServerResponse } from "http";
import { Http2ServerRequest, Http2ServerResponse } from "http2";
import Koa from "koa";
import { WebSocket } from "ws";
import { KoattyMetadata } from "./Metadata";

// KoaContext
export type KoaContext = Koa.ParameterizedContext;
/**
 * KoattyNext
 */
export type KoattyNext = Koa.Next;

// RequestType
export type RequestType = IncomingMessage | Http2ServerRequest | IRpcServerCall<any, any> | {
  data: Buffer | ArrayBuffer | Buffer[];
};

// redefine ServerCallback
export type IRpcServerCallback<Response> = sendUnaryData<Response>;

// redefine WebSocket
export type IWebSocket = WebSocket;

// ResponseType
export type ResponseType = ServerResponse | Http2ServerResponse | OutgoingMessage | IRpcServerCallback<any> | IWebSocket;

// redefine ServerCall
export type IRpcServerCall<RequestType, ResponseType> = ServerUnaryCall<RequestType, ResponseType>
  | ServerReadableStream<RequestType, ResponseType>
  | ServerWritableStream<RequestType, ResponseType>
  ;

// redefine ServerCallImpl
export type IRpcServerCallImpl<RequestType, ResponseType> = ServerUnaryCallImpl<RequestType, ResponseType>
  | ServerReadableStreamImpl<RequestType, ResponseType>;

/**
 * Koatty Context.
 *
 * @export
 * @interface KoattyContext
 * @extends {Koa.Context}
 */
export interface KoattyContext extends KoaContext {

  /**
   * status
   *
   * @type {number}
   * @memberof KoattyContext
   */
  status: number;

  /**
   * protocol
   *
   * @type {string}
   * @memberof KoattyContext
   */
  protocol: string;

  /**
   * gRPC ServerImpl
   *
   * @type {{
   *         call: IRpcServerCall<any, any>;
   *         callback?: IRpcServerCallback<any>;
   *     }}
   * @memberof KoattyContext
   */
  rpc?: {
    call: IRpcServerCall<any, any>;
    callback?: IRpcServerCallback<any>;
  }

  /**
   * WebSocket ServerImpl
   *
   * @type {*}
   * @memberof KoattyContext
   */
  websocket?: IWebSocket; // ws.WebSocket

  /**
  * context metadata operation
  * 
  * @memberof Context
  */
  readonly getMetaData: (key: string) => any[];
  readonly setMetaData: (key: string, value: unknown) => void;

  /**
   * send metadata to http request header. 
   * then gRPC request to send metadata
   *
   * @memberof KoattyContext
   */
  readonly sendMetadata: (data?: KoattyMetadata) => void;

  /**
   * Replace ctx.throw
   *
   * @type {(status: number, message?: string)}
   * @type {(message: string, code?: number, status?: HttpStatusCode)}
   * @memberof Context
   */
  throw(status: number): never;
  throw(status: number, message?: string): never;
  throw(message: string, code?: number | undefined, status?: number | undefined): never;

  /**
   * Get parsed query-string and path variable(koa ctx.query and ctx.params),
   * and set as an object.
   * @returns unknown
   */
  readonly requestParam?: () => unknown;

  /**
   * Get parsed body(form variable and file object).
   * @returns Promise<unknown> ex: {post: {...}, file: {...}}
   */
  readonly requestBody?: () => Promise<unknown>;
}

/**
 * HTTP/HTTPS Context
 */
export interface HttpContext extends KoattyContext {
  protocol: 'http' | 'https';
  requestParam?: () => unknown;
  requestBody?: () => Promise<unknown>;
}

/**
 * gRPC Context
 */
export interface GrpcContext extends KoattyContext {
  protocol: 'grpc';
  rpc: NonNullable<KoattyContext['rpc']>;
}

/**
 * WebSocket Context
 */
export interface WebSocketContext extends KoattyContext {
  protocol: 'ws' | 'wss';
  websocket: NonNullable<KoattyContext['websocket']>;
}

/**
 * GraphQL Context
 */
export interface GraphQLContext extends KoattyContext {
  protocol: 'graphql';
  graphql: {
    query: string;
    variables: Record<string, any>;
    operationName: string | null;
    schema: any;
    rootValue: any;
    contextValue: KoattyContext;
  };
  requestParam?: () => unknown;
  requestBody?: () => Promise<unknown>;
}

/**
 * Advanced type guard for HTTP context
 */
export function assertHttpContext(ctx: KoattyContext): asserts ctx is HttpContext {
  if (ctx.protocol !== 'http' && ctx.protocol !== 'https') {
    throw new Error(`Expected HTTP/HTTPS context, got ${ctx.protocol}`);
  }
}

/**
 * Advanced type guard for gRPC context
 */
export function assertGrpcContext(ctx: KoattyContext): asserts ctx is GrpcContext {
  if (ctx.protocol !== 'grpc' || !ctx.rpc) {
    throw new Error(`Expected gRPC context with rpc property, got ${ctx.protocol}`);
  }
}

/**
 * Advanced type guard for WebSocket context
 */
export function assertWebSocketContext(ctx: KoattyContext): asserts ctx is WebSocketContext {
  if ((ctx.protocol !== 'ws' && ctx.protocol !== 'wss') || !ctx.websocket) {
    throw new Error(`Expected WebSocket context with websocket property, got ${ctx.protocol}`);
  }
}

/**
 * Advanced type guard for GraphQL context
 */
export function assertGraphQLContext(ctx: KoattyContext): asserts ctx is GraphQLContext {
  if (ctx.protocol !== 'graphql' || !(ctx as any).graphql) {
    throw new Error(`Expected GraphQL context with graphql property, got ${ctx.protocol}`);
  }
}

/**
 * Create type-safe HTTP middleware
 */
export function httpMiddleware(
  handler: (ctx: HttpContext, next: KoattyNext) => Promise<any>
): (ctx: KoattyContext, next: KoattyNext) => Promise<any> {
  return async (ctx: KoattyContext, next: KoattyNext) => {
    assertHttpContext(ctx);
    return handler(ctx, next);
  };
}

/**
 * Create type-safe gRPC middleware
 */
export function grpcMiddleware(
  handler: (ctx: GrpcContext, next: KoattyNext) => Promise<any>
): (ctx: KoattyContext, next: KoattyNext) => Promise<any> {
  return async (ctx: KoattyContext, next: KoattyNext) => {
    assertGrpcContext(ctx);
    return handler(ctx, next);
  };
}

/**
 * Create type-safe WebSocket middleware
 */
export function wsMiddleware(
  handler: (ctx: WebSocketContext, next: KoattyNext) => Promise<any>
): (ctx: KoattyContext, next: KoattyNext) => Promise<any> {
  return async (ctx: KoattyContext, next: KoattyNext) => {
    assertWebSocketContext(ctx);
    return handler(ctx, next);
  };
}

/**
 * Create type-safe GraphQL middleware
 */
export function graphqlMiddleware(
  handler: (ctx: GraphQLContext, next: KoattyNext) => Promise<any>
): (ctx: KoattyContext, next: KoattyNext) => Promise<any> {
  return async (ctx: KoattyContext, next: KoattyNext) => {
    assertGraphQLContext(ctx);
    return handler(ctx, next);
  };
}
