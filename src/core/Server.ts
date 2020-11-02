/*
 * @Author: richen
 * @Date: 2020-07-06 15:53:37
 * @LastEditTime: 2020-11-02 21:07:01
 * @Description:
 * @Copyright (c) - <richenlin(at)gmail.com>
 */
import { Koatty } from "../Koatty";
import http2 from "http2";
import fs from "fs";
import { DefaultLogger as logger } from "../util/Logger";
import * as helper from "think_lib";
const pkg = require("../../package.json");

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
function listening(app: Koatty, options: ListeningOptions) {
    return function () {
        logger.Custom("think", "", `Nodejs Version: ${process.version}`);
        logger.Custom("think", "", `${pkg.name} Version: v${pkg.version}`);
        logger.Custom("think", "", `App Environment: ${app.env}`);
        logger.Custom("think", "", `Server running at ${options.listenUrl}`);
        logger.Custom("think", "", "====================================");
        // tslint:disable-next-line: no-unused-expression
        app.appDebug && logger.Warn(`Running in debug mode.`);
    };
}

/**
 * Start HTTP server.
 *
 * @param {Koatty} app
 */
export function startHTTP(app: Koatty) {
    const port = process.env.PORT || process.env.main_port || app.config('app_port') || 3000;
    const hostname = process.env.IP || process.env.HOSTNAME?.replace(/-/g, '.') || app.config('app_hostname') || 'localhost';

    logger.Custom("think", "", `Protocol: HTTP/1.1`);
    app.listen({ port, hostname }, listening(app, { hostname, port, listenUrl: `http://${hostname}:${port}/` }));
}

/**
 * Start HTTP2 server.
 *
 * @param {Koatty} app
 */
export function startHTTP2(app: Koatty) {
    const port = process.env.PORT || process.env.main_port || app.config('app_port') || 443;
    const hostname = process.env.IP || process.env.HOSTNAME?.replace(/-/g, '.') || app.config('app_hostname') || 'localhost';
    const keyFile = app.config("key_file") || "";
    const crtFile = app.config("crt_file") || "";
    if (!helper.isFile(keyFile) || !helper.isFile(crtFile)) {
        logger.Error("key_file, crt_file are not defined in the configuration");
        process.exit();
    }
    const options = {
        allowHTTP1: true,
        key: fs.readFileSync(keyFile),
        cert: fs.readFileSync(crtFile)
    };

    logger.Custom("think", "", `Protocol: HTTP/2`);
    const server = http2.createSecureServer(options, app.callback());
    server.listen(port, hostname, 0, listening(app, { hostname, port, listenUrl: `https://${hostname}:${port}/` }));
}

/**
 * Start Socket server.
 *
 * @param {Koatty} app
 */
export function startSocket(app: Koatty) {
    //...
}