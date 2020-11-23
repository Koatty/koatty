/*
 * @Author: richen
 * @Date: 2020-07-06 15:53:37
 * @LastEditTime: 2020-11-23 14:36:10
 * @Description:
 * @Copyright (c) - <richenlin(at)gmail.com>
 */
import fs from "fs";
import { createSecureServer } from 'http2';
import { Koatty } from "../Koatty";
import { Logger } from "../util/Logger";
import { Helper } from "../util/Helper";
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
 * Start HTTP server.
 *
 * @param {Koatty} app
 */
export function startHTTP(app: Koatty) {
    const port = process.env.PORT || process.env.main_port || app.config('app_port') || 3000;
    const hostname = process.env.IP || process.env.HOSTNAME?.replace(/-/g, '.') || app.config('app_hostname') || 'localhost';

    Logger.Custom("think", "", `Protocol: HTTP/1.1`);
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
    const server = createSecureServer(options, app.callback());
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