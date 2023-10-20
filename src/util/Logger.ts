/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-10 11:49:15
 */

import { Koatty } from "koatty_core";
import { Helper } from "koatty_lib";
import { DefaultLogger, LogLevelType } from "koatty_logger";

// Logger
export const Logger = DefaultLogger;
export { ILogger, LogLevelType } from "koatty_logger";

/**
 * SetLogger
 *
 * @export
 * @param {{
 *     logLevel?: LogLevelType;
 *     logFilePath?: string;
 *     sensFields?: string[];
 * }} config
 */
export function SetLogger(app: Koatty, config: {
  logLevel?: LogLevelType;
  logFilePath?: string;
  sensFields?: string[];
}) {
  if (config.logLevel) {
    DefaultLogger.setLevel(config.logLevel);
  }
  if (config.logFilePath && !app.silent) {
    Helper.define(app, "logsPath", config.logFilePath);
    process.env.LOGS_PATH = config.logFilePath;
    DefaultLogger.setLogFilePath(config.logFilePath);
  }
  if (config.sensFields) {
    DefaultLogger.setSensFields(config.sensFields);
  }
}
