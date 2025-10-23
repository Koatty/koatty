/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2024-01-10 11:20:03
 */
import { ServerResponse } from "http";
import { WebSocket } from "ws";

/**
 * Minimal context interface for exception handling
 * This interface breaks the circular dependency with koatty_core
 * by defining only the properties needed for exception handling
 * 
 * @export
 * @interface IExceptionContext
 */
export interface IExceptionContext {
  status: number;
  protocol: string;
  requestId?: string;
  originalPath?: string;
  url: string;
  method: string;
  get(field: string): string;
  startTime?: number;
  res: ServerResponse;
  rpc?: {
    call?: any;
    callback?: (error: { code: number; details: string } | null, response: any) => void;
  };
  websocket?: WebSocket;
  encoding?: string | false;
  length?: number;
  body?: any;
  set(field: string, value: string): void;
  type?: string;
}

