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
        DefaultLogger.setLevel(config.logLevel);
    }
    if (config.logConsole !== undefined) {
        DefaultLogger.setLogConsole(config.logConsole);
    }
    if (config.logFile !== undefined) {
        DefaultLogger.setLogFile(config.logFile);
        DefaultLogger.setLogFilePath(config.logFilePath);
    }
    if (config.logFileLevel !== undefined) {
        DefaultLogger.setLogFileLevel(config.logFileLevel);
    }
}
