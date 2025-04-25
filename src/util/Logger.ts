/*
 * @Description: framework logger 
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 21:56:32
 * @LastEditTime: 2024-10-31 17:52:43
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */


import { KoattyApplication } from "koatty_core";
import { Helper } from "koatty_lib";
import { DefaultLogger, LogLevelType } from "koatty_logger";

// Logger
export const Logger = DefaultLogger;
export { LogLevelType } from "koatty_logger";

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
export function SetLogger(app: KoattyApplication, config: {
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
