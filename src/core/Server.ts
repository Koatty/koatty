/*
 * @Author: richen
 * @Date: 2020-07-06 15:53:37
 * @LastEditTime: 2020-07-07 20:43:51
 * @Description:
 * @Copyright (c) - <richenlin(at)gmail.com>
 */
import { Koatty } from "../Koatty";
import http2 from "http2";
import fs from "fs";
import logger from "think_logger";
import * as helper from "think_lib";
const pkg = require("../../package.json");

interface ListeningOptions {
    hostname: string;
    port: number;
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
        logger.custom("think", "", `Nodejs Version: ${process.version}`);
        logger.custom("think", "", `${pkg.name} Version: v${pkg.version}`);
        logger.custom("think", "", `App Enviroment: ${app.env}`);
        logger.custom("think", "", `Server running at http://${options.hostname}:${options.port}/`);
        logger.custom("think", "", "====================================");
        // tslint:disable-next-line: no-unused-expression
        app.appDebug && logger.warn(`Running in debug mode, please modify the 'appDebug' value to false when production env.`);
    };
}

/**
 * Start HTTP server.
 *
 * @param {Koatty} app
 */
export function startHTTP(app: Koatty) {
    const port = app.config("app_port") || 3000;
    const hostname = app.config("app_hostname") || "localhost";

    app.listen({ port, hostname }, listening(app, { hostname, port }));
}

/**
 * Start HTTP2 server.
 *
 * @param {Koatty} app
 */
export function startHTTP2(app: Koatty) {
    const port = app.config("app_port") || 3000;
    const hostname = app.config("app_hostname") || "localhost";
    const keyFile = app.config("key_file") || "";
    const crtFile = app.config("crt_file") || "";
    if (!helper.isFile(keyFile) || !helper.isFile(crtFile)) {
        logger.error("key_file, crt_file is undefined.");
        process.exit();
    }
    const options = {
        key: fs.readFileSync(keyFile),
        cert: fs.readFileSync(crtFile)
    };

    const server = http2.createSecureServer(options, app.callback());
    server.listen(port, hostname, 0, listening(app, { hostname, port }));
}

/**
 * Start Socket server.
 *
 * @param {Koatty} app
 */
export function startSocket(app: Koatty) {
    //...
}