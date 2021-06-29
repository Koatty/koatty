/*
 * @Author: richen
 * @Date: 2020-07-06 15:53:37
 * @LastEditTime: 2021-06-28 18:06:48
 * @Description:
 * @Copyright (c) - <richenlin(at)gmail.com>
 */
import fs from "fs";
import { Logger, Koatty } from "..";
import { ListeningOptions, Serve, SERVE_MODE } from "koatty_serve";
const pkg = require("../../package.json");


/**
 * Listening callback function
 *
 * @param {Koatty} app
 * @param {ListeningOptions} options
 * @returns {*} 
 */
const callback = (app: Koatty, options: ListeningOptions) => {
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
 * 
 *
 * @export
 * @param {Koatty} app
 */
export function startSever(app: Koatty) {
    const serveMode = app.config("serve_mod") ?? "http";
    const port = process.env.PORT ?? process.env.main_port ?? app.config('app_port') ?? 80;
    const hostname = process.env.IP ?? process.env.HOSTNAME?.replace(/-/g, '.') ?? app.config('app_host') ?? 'localhost';
    const options = {
        hostname: hostname,
        port: port,
        listenUrl: `${serveMode}://${hostname || '127.0.0.1'}:${port}/`,
        key: "",
        cert: "",
    }
    if (serveMode == SERVE_MODE.HTTP2) {
        const keyFile = app.config("key_file") ?? "";
        const crtFile = app.config("crt_file") ?? "";
        options.key = fs.readFileSync(keyFile).toString();
        options.cert = fs.readFileSync(crtFile).toString();
        options.port = options.port == 80 ? 443 : options.port;
    }
    Serve(serveMode, <any>app, options, callback(app, options))

}
