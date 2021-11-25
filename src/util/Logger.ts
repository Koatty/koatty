/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-10 11:49:15
 */

import { DefaultLogger, LogLevelType } from "koatty_logger";

// Logger
export const Logger = DefaultLogger;
/**
 * SetLogger
 *
 * @export
 * @param {{
 *     logLevel?: LogLevelType;
 *     logConsole?: boolean;
 *     logFile?: boolean;
 *     logFileLevel?: LogLevelType;
 *     logFilePath?: string;
 * }} config
 */
export function SetLogger(config: {
    logLevel?: LogLevelType;
    logConsole?: boolean;
    logFile?: boolean;
    logFileLevel?: LogLevelType;
    logFilePath?: string;
}) {
    if (config.logLevel !== undefined) {
        Logger.setLevel(config.logLevel);
    }
    if (config.logConsole !== undefined) {
        Logger.setLogConsole(config.logConsole);
    }
    if (config.logFile !== undefined) {
        DefaultLogger.setLogFile(config.logFile);
        Logger.setLogFilePath(config.logFilePath);
    }
    if (config.logFileLevel !== undefined) {
        Logger.setLogFileLevel(config.logFileLevel);
    }
}
