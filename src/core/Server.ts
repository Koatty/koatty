/*
 * @Author: richen
 * @Date: 2020-07-06 15:53:37
 * @LastEditTime: 2020-07-06 19:21:48
 * @Description:
 * @Copyright (c) - <richenlin(at)gmail.com>
 */
import { Koatty } from "../Koatty";
import logger from "think_logger";
const pkg = require("../../package.json");

/**
 * Start HTTP server.
 *
 * @param {Koatty} app
 */
export function startHTTP(app: Koatty) {
    logger.custom("think", "", "====================================");
    //Start app
    logger.custom("think", "", "Listening ...");
    const port = app.config("app_port") || 3000;
    const hostname = app.config("app_hostname") || "localhost";

    app.listen({ port, hostname }, function () {
        logger.custom("think", "", `Nodejs Version: ${process.version}`);
        logger.custom("think", "", `${pkg.name} Version: v${pkg.version}`);
        logger.custom("think", "", `App Enviroment: ${app.env}`);
        logger.custom("think", "", `Server running at http://${hostname}:${port}/`);
        logger.custom("think", "", "====================================");
        // tslint:disable-next-line: no-unused-expression
        app.appDebug && logger.warn(`Running in debug mode, please modify the 'appDebug' value to false when production env.`);
    });
}

/**
 * Start HTTPS server.
 *
 * @param {Koatty} app
 */
export function startHTTPS(app: Koatty) {
    //...
}

/**
 * Start Socket server.
 *
 * @param {Koatty} app
 */
export function startSocket(app: Koatty) {
    //...
}