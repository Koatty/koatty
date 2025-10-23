/**
 * 
 * @Description: 
 * @Author: richen
 * @Date: 2025-03-20 12:08:57
 * @LastEditTime: 2025-04-02 15:03:04
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { DefaultLogger } from "koatty_logger";

/**
 * A logger class that provides different levels of logging functionality.
 * Wraps the DefaultLogger to provide error, warning, info, debug and verbose level logging.
 * 
 * @export
 * @class Logger
 */
export class Logger {
/** Log an error scenario that was not expected and caused the requested operation to fail. */
  error(...args: any[]) {
    DefaultLogger.error(args);
  }
  /**
   * Log a warning scenario to inform the developer of an issues that should be investigated.
   * The requested operation may or may not have succeeded or completed.
   */
  warn(...args: any[]) {
    DefaultLogger.warn(args);
  }
  /**
   * Log a general informational message, this should not affect functionality.
   * This is also the default logging level so this should NOT be used for logging
   * debugging level information.
   */
  info(...args: any[]) {
    DefaultLogger.info(args);
  }
  /**
   * Log a general debug message that can be useful for identifying a failure.
   * Information logged at this level may include diagnostic details that would
   * help identify a failure scenario.
   * For example: Logging the order of execution of async operations.
   */
  debug(...args: any[]) {
    DefaultLogger.debug(args);
  }
  /**
   * Log a detailed (verbose) trace level logging that can be used to identify failures
   * where debug level logging would be insufficient, this level of tracing can include
   * input and output parameters and as such may include PII information passing through
   * the API. As such it is recommended that this level of tracing should not be enabled
   * in a production environment.
   */
  verbose(...args: any[]) {
    DefaultLogger.debug(args);
  }
}