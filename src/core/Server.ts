/*
 * @Author: richen
 * @Date: 2020-07-06 15:53:37
 * @LastEditTime: 2021-06-21 15:29:13
 * @Description:
 * @Copyright (c) - <richenlin(at)gmail.com>
 */
import fs from "fs";
import { createSecureServer } from 'http2';
import { Koatty } from "../Koatty";
import { Logger } from "../util/Logger";
import { Helper } from "../util/Helper";
import { TraceBinding, TraceServerSetup } from './Trace';
import { createServer } from 'http';
import { createTerminus } from "@godaddy/terminus";
import { EventEmitter } from "events";
const pkg = require("../../package.json");

/**
 *
 *
 * @export
 * @enum {number}
 */
export enum SERVE_MODE {
    "HTTP" = "http",
    "HTTP2" = "http2",
    "WEBSOCKET" = "websocket",
    "RPC" = "rpc"
}

/**
 * listening options
 *
 * @interface ListeningOptions
 */
interface ListeningOptions {
    hostname: string;
    port: number;
    listenUrl: string;
}

/**
 * Listening callback function
 *
 * @param {Koatty} app
 * @param {ListeningOptions} options
 * @returns {*} 
 */
const listening = (app: Koatty, options: ListeningOptions) => {
    return function () {
        Logger.Custom("think", "", `Nodejs Version: ${process.version}`);
        Logger.Custom("think", "", `${pkg.name} Version: v${pkg.version}`);
        Logger.Custom("think", "", `App Environment: ${app.env}`);
        Logger.Custom("think", "", `Server running at ${options.listenUrl}`);
        Logger.Custom("think", "", "====================================");
        // tslint:disable-next-line: no-unused-expression
        app.appDebug && Logger.Warn(`Running in debug mode.`);
    };
};

/**
 * Execute event as async
 *
 * @param {Koatty} event
 * @param {string} eventName
 */
export const asyncEvent = async function (event: EventEmitter, eventName: string) {
    const ls: any[] = event.listeners(eventName);
    // eslint-disable-next-line no-restricted-syntax
    for await (const func of ls) {
        if (Helper.isFunction(func)) {
            func();
        }
    }
    return event.removeAllListeners(eventName);
};

/**
 * Bind event to the process
 *
 * @param {EventEmitter} event
 * @param {string} eventName
 */
export const bindProcessEvent = function (event: EventEmitter, eventName: string) {
    const ls: any[] = event.listeners(eventName);
    for (const func of ls) {
        if (Helper.isFunction(func)) {
            process.addListener("beforeExit", func);
        }
    }
    return event.removeAllListeners(eventName);
};

/**
 * cleanup function, returning a promise (used to be onSigterm)
 *
 * @returns {*}  
 */
function onSignal() {
    Logger.Info('Server is starting cleanup');
    return asyncEvent(process, 'beforeExit');
}

/**
 * called right before exiting
 *
 * @returns {*}  
 */
function onShutdown() {
    Logger.Info('Cleanup finished, server is shutting down');
    // todo Log report
    return Promise.resolve();
}

/** @type {*} */
const terminusOptions = {
    // cleanup options
    timeout: 2000,                   // [optional = 1000] number of milliseconds before forceful exiting
    onSignal,                        // [optional] cleanup function, returning a promise (used to be onSigterm)
    onShutdown,                      // [optional] called right before exiting
    // both
    logger: Logger.Error                           // [optional] logger function to be called with errors. Example logger call: ('error happened during shutdown', error). See terminus.js for more details.
};

/**
 *
 *
 * @export
 * @param {Koatty} app
 */
export function StartSever(app: Koatty) {
    const serveMode = app.config("serve_mod") ?? "http";
    const openTrace = app.config("open_trace") ?? false;
    if (openTrace) {
        TraceServerSetup(app);
    }
    switch (serveMode) {
        case "http2":
            startHTTP2(app, openTrace);
            break;
        // case "websocket":
        //     startWebSocket(app, openTrace);
        //     break;
        // case "rpc":
        //     startRPC(app, openTrace);
        //     break;
        default:
            startHTTP(app, openTrace);
            break;
    }
}

/**
 * Start HTTP server.
 *
 * @export
 * @param {Koatty} app
 * @param {boolean} openTrace
 */
export function startHTTP(app: Koatty, openTrace: boolean) {
    const port = process.env.PORT ?? process.env.main_port ?? app.config('app_port') ?? 3000;
    const hostname = process.env.IP ?? process.env.HOSTNAME?.replace(/-/g, '.') ?? app.config('app_hostname') ?? 'localhost';

    Logger.Custom("think", "", `Protocol: HTTP/1.1`);
    const server = createServer((req, res) => {
        TraceBinding(app, req, res, openTrace);
    });
    // terminus
    createTerminus(server, terminusOptions);
    server.listen({ port, host: hostname }, listening(app, { hostname, port, listenUrl: `http://${hostname}:${port}/` })).on('clientError', (err: any, sock: any) => {
        // Logger.error("Bad request, HTTP parse error");
        sock.end('400 Bad Request\r\n\r\n');
    });
}

/**
 * Start HTTP2 server.
 *
 * @export
 * @param {Koatty} app
 * @param {boolean} openTrace
 */
export function startHTTP2(app: Koatty, openTrace: boolean) {
    const port = process.env.PORT ?? process.env.main_port ?? app.config('app_port') ?? 443;
    const hostname = process.env.IP ?? process.env.HOSTNAME?.replace(/-/g, '.') ?? app.config('app_hostname') ?? 'localhost';
    const keyFile = app.config("key_file") ?? "";
    const crtFile = app.config("crt_file") ?? "";
    if (!Helper.isFile(keyFile) || !Helper.isFile(crtFile)) {
        Logger.Error("key_file, crt_file are not defined in the configuration");
        process.exit();
    }
    const options = {
        allowHTTP1: true,
        key: fs.readFileSync(keyFile),
        cert: fs.readFileSync(crtFile)
    };

    Logger.Custom("think", "", `Protocol: HTTP/2`);
    const server = createSecureServer(options, (req, res) => {
        TraceBinding(app, req, res, openTrace);
    });
    // terminus
    createTerminus(server, terminusOptions);
    server.listen(port, hostname, 0, listening(app, { hostname, port, listenUrl: `https://${hostname}:${port}/` })).on('clientError', (err: any, sock: any) => {
        // Logger.error("Bad request, HTTP parse error");
        sock.end('400 Bad Request\r\n\r\n');
    });
}

/**
 * Start WebSocket server.
 *
 * @export
 * @param {Koatty} app
 * @param {boolean} openTrace
 */
export function startWebSocket(app: Koatty, openTrace: boolean) {
    //todo
    Logger.Debug(app.env, openTrace)
}

/**
 * Start RPC server.
 *
 * @export
 * @param {Koatty} app
 * @param {boolean} openTrace
 */
export function startRPC(app: Koatty, openTrace: boolean) {
    //todo
    Logger.Debug(app.env, openTrace)
}
