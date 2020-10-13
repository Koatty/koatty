/*
 * @Author: richen
 * @Date: 2020-10-12 16:56:12
 * @LastEditTime: 2020-10-13 15:11:50
 * @Description: 
 * @Copyright (c) - <richenlin(at)gmail.com>
 */
// export { DefaultLogger } from "think_logger";

import logger from "think_logger";
export const DefaultLogger = {
    Info: logger.info,
    Warn: logger.warn,
    Custom: logger.custom,
    Debug: logger.debug,
    Error: logger.error,
    Success: logger.success,
    Write: logger.write
};