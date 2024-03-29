/*
 * @Description: framework error handling
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-14 22:29:34
 * @LastEditTime: 2024-01-16 22:41:52
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import { Koatty } from "koatty_core";
import { Trace, TraceOptions } from "koatty_trace";

export function TraceHandler(app: Koatty) {
  const timeout = (app.config('http_timeout') || 10) * 1000;
  const encoding = app.config('encoding') || 'utf-8';
  const openTrace = app.config("open_trace") || false;
  const asyncHooks = app.config("async_hooks") || false;

  const options: TraceOptions = {
    RequestIdHeaderName: app.config('trace_header') || 'X-Request-Id',
    RequestIdName: app.config('trace_id') || "requestId",
    IdFactory: undefined,
    Timeout: timeout,
    Encoding: encoding,
    OpenTrace: openTrace,
    AsyncHooks: asyncHooks,
  }
  app.use(Trace(options, app));
}